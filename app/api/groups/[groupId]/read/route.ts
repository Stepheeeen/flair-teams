import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Group, GroupReadState, TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    // Verify user has access to group
    const group = await Group.findById(groupId);
    if (!group) throw new ApiError(404, 'Group not found');
    
    const member = await TeamMember.findOne({ team_id: group.team_id, user_id: user.id });
    if (!member) throw new ApiError(403, 'Not a member of this team');
    
    if (group.is_private && !group.members.includes(user.id)) {
      throw new ApiError(403, 'No access to this private group');
    }

    // Upsert read state
    const readState = await GroupReadState.findOneAndUpdate(
      { user_id: user.id, group_id: groupId },
      { last_read_at: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, readState });
  } catch (error) {
    return handleApiError(error);
  }
}
