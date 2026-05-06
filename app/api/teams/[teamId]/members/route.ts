import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { TeamMember, TeamInvite, User } from '@/lib/models';
import { isManagerOrAbove } from '@/lib/roles';
import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { sendInviteEmail } from '@/lib/email';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['manager', 'member']).default('member'),
  job_title: z.string().max(100).default(''),
});

/** Check if the requesting user has permission to invite new members.
 *  Permission: TeamMember.role is 'admin' or 'manager', OR job title indicates management */
async function assertCanInvite(userId: string, teamId: string) {
  const member = await TeamMember.findOne({ team_id: teamId, user_id: userId });
  if (!member) throw new ApiError(403, 'Not a member of this team');

  const userDoc = await User.findOne({ id: userId }).select('job_title').lean() as any;
  const jobTitle: string = member.job_title || userDoc?.job_title || '';

  if (!isManagerOrAbove(member.role, jobTitle)) {
    throw new ApiError(
      403,
      'Only admins, managers, CEOs, CTOs, and HR Managers can invite new members'
    );
  }

  return member;
}

// GET /api/teams/[teamId]/members
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const member = await TeamMember.findOne({ team_id: teamId, user_id: user.id });
    if (!member) throw new ApiError(403, 'Not a member of this team');

    const members = await TeamMember.find({ team_id: teamId }).lean() as any[];
    const userIds = members.map((m) => m.user_id);
    const users = await User.find({ id: { $in: userIds } })
      .select('id email name avatar_url job_title role')
      .lean() as any[];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const enriched = members.map((m) => ({
      ...m,
      user: userMap[m.user_id] || null,
    }));

    return NextResponse.json({ members: enriched });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/teams/[teamId]/members — invite a new member
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    await assertCanInvite(user.id, teamId);

    const body = await req.json();
    const { email, role, job_title } = inviteSchema.parse(body);

    // Check if already a member
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const existing = await TeamMember.findOne({ team_id: teamId, user_id: existingUser.id });
      if (existing) throw new ApiError(409, 'This person is already a member of the team');
    }

    // Cancel any pending invites for the same email
    await TeamInvite.deleteMany({ team_id: teamId, email, accepted: false });

    const token = randomBytes(32).toString('hex');
    const invite = await TeamInvite.create({
      team_id: teamId,
      email,
      role,
      job_title,
      token,
      created_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Fetch inviter info for the email
    const inviterDoc = await User.findOne({ id: user.id }).select('name').lean() as any;
    const inviterName = inviterDoc?.name || 'Your workspace admin';

    // Get team name
    const teamDoc = await (await import('@/lib/models')).Team.findById(teamId).lean() as any;
    const teamName = teamDoc?.name || 'Flair Technologies Teams';

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Send the invite email
    await sendInviteEmail({
      to: email,
      invitedBy: inviterName,
      teamName,
      role,
      jobTitle: job_title,
      inviteUrl,
    }).catch(() => {}); // Non-blocking

    // Log activity
    await (await import('@/lib/models')).Activity.create({
      team_id: teamId,
      user_id: user.id,
      action: 'invited_member',
      resource_type: 'member',
      resource_id: invite._id,
      details: { email, role, job_title },
    });

    return NextResponse.json({ invite, invite_url: inviteUrl }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
