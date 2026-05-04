import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Group, SubGroup, TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/groups/[groupId] — get group with its sub-groups
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const member = await TeamMember.findOne({ team_id: group.team_id, user_id: user.id });
    if (!member) throw new ApiError(403, 'Not a member of this team');

    if (group.is_private && !group.members.includes(user.id)) {
      throw new ApiError(403, 'No access to this private group');
    }

    return NextResponse.json({ group });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/groups/[groupId]
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const member = await TeamMember.findOne({ team_id: group.team_id, user_id: user.id });
    if (!member || !['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins and managers can delete groups');
    }

    await Group.findByIdAndDelete(groupId);
    await SubGroup.deleteMany({ group_id: groupId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/groups/[groupId]
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    const body = await req.json();
    await connectToDatabase();

    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');

    const member = await TeamMember.findOne({ team_id: group.team_id, user_id: user.id });
    if (!member || !['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins and managers can update groups');
    }

    if (body.name !== undefined) {
      group.name = body.name;
    }
    
    if (body.members !== undefined) {
      // Expecting an array of user_ids to be the new members list
      group.members = body.members;
    }

    await group.save();
    return NextResponse.json({ group });
  } catch (error) {
    return handleApiError(error);
  }
}
