import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { TeamMember, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/members
 * Returns all workspace members across all teams the calling user belongs to.
 * Enriches with user profile (name, email, job_title, avatar_url).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    // All teams this user belongs to
    const myMemberships = await TeamMember.find({ user_id: user.id })
      .select('team_id')
      .lean() as any[];
    const teamIds = myMemberships.map((m) => m.team_id);

    // All members across those teams (deduplicated by user_id)
    const allMembers = await TeamMember.find({ team_id: { $in: teamIds } })
      .lean() as any[];

    // Deduplicate by user_id (user may appear in multiple teams)
    const seenUserIds = new Set<string>();
    const uniqueMembers = allMembers.filter((m) => {
      if (seenUserIds.has(m.user_id)) return false;
      seenUserIds.add(m.user_id);
      return true;
    });

    const userIds = uniqueMembers.map((m) => m.user_id);
    const users = await User.find({ id: { $in: userIds } })
      .select('id email name avatar_url job_title role')
      .lean() as any[];

    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const members = uniqueMembers.map((m) => ({
      user_id: m.user_id,
      role: m.role,
      job_title: m.job_title || userMap[m.user_id]?.job_title || '',
      joined_at: m.createdAt,
      user: userMap[m.user_id] || null,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    return handleApiError(error);
  }
}
