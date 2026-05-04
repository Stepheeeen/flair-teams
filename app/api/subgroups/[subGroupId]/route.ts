import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { SubGroup, Group, TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ subGroupId: string }> }
) {
  try {
    const { subGroupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const subgroup = await SubGroup.findById(subGroupId);
    if (!subgroup) throw new ApiError(404, 'Sub-group not found');

    const group = await Group.findById(subgroup.group_id);
    if (!group) throw new ApiError(404, 'Parent group not found');

    const member = await TeamMember.findOne({ team_id: group.team_id, user_id: user.id });
    if (!member || !['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins and managers can delete sub-groups');
    }

    await SubGroup.findByIdAndDelete(subGroupId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ subGroupId: string }> }
) {
  try {
    const { subGroupId } = await props.params;
    const user = await requireAuth(req);
    const body = await req.json();
    await connectToDatabase();

    const subgroup = await SubGroup.findById(subGroupId);
    if (!subgroup) throw new ApiError(404, 'Sub-group not found');

    const group = await Group.findById(subgroup.group_id);
    if (!group) throw new ApiError(404, 'Parent group not found');

    const member = await TeamMember.findOne({ team_id: group.team_id, user_id: user.id });
    if (!member || !['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins and managers can update sub-groups');
    }

    if (body.name !== undefined) {
      subgroup.name = body.name;
    }
    
    // For future if sub-groups need member restrictions
    if (body.members !== undefined) {
      subgroup.members = body.members;
    }

    await subgroup.save();
    return NextResponse.json({ subgroup });
  } catch (error) {
    return handleApiError(error);
  }
}
