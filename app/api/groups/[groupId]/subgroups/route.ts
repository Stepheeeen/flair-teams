import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Group, SubGroup, TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createSubGroupSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  members: z.array(z.string()).optional(),
});

async function resolveGroupAccess(groupId: string, userId: string) {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, 'Group not found');

  const member = await TeamMember.findOne({ team_id: group.team_id, user_id: userId });
  if (!member) throw new ApiError(403, 'Not a member of this team');

  if (group.is_private && !group.members.includes(userId)) {
    throw new ApiError(403, 'You do not have access to this private group');
  }

  return { group, member };
}

// GET /api/groups/[groupId]/subgroups
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();
    const { group } = await resolveGroupAccess(groupId, user.id);

    const subgroups = await SubGroup.find({ group_id: groupId }).sort({ name: 1 });
    // Return the parent group alongside sub-groups so consumers don't need a second call
    return NextResponse.json({ subgroups, group });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/groups/[groupId]/subgroups
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const { group, member } = await resolveGroupAccess(groupId, user.id);
    if (!['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins and managers can create sub-groups');
    }

    const body = await req.json();
    const { name, description, members } = createSubGroupSchema.parse(body);

    const existing = await SubGroup.findOne({
      group_id: groupId,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (existing) throw new ApiError(409, `A sub-group named "${name}" already exists`);

    const subgroup = await SubGroup.create({
      group_id: groupId,
      team_id: group.team_id,
      name,
      description,
      created_by: user.id,
      members: members || [user.id],
    });

    return NextResponse.json({ subgroup }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
