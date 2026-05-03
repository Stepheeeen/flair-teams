import { requireAuth, checkTeamAccess, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// PUT update member role
export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ teamId: string; userId: string }> }
) {
  try {
    const { teamId, userId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    await checkTeamAccess(user.id, teamId, 'admin');

    const body = await req.json();
    const { role } = body;

    if (!['admin', 'manager', 'member'].includes(role)) {
      throw new ApiError(400, 'Invalid role');
    }

    const member = await TeamMember.findOneAndUpdate(
      { team_id: teamId, user_id: userId },
      { role },
      { new: true }
    );

    if (!member) {
      throw new ApiError(404, 'Team member not found');
    }

    return NextResponse.json({ member });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE remove member
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ teamId: string; userId: string }> }
) {
  try {
    const { teamId, userId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    await checkTeamAccess(user.id, teamId, 'admin');

    // Can't remove yourself
    if (user.id === userId) {
      throw new ApiError(400, 'Cannot remove yourself from team');
    }

    const result = await TeamMember.findOneAndDelete({
      team_id: teamId,
      user_id: userId,
    });

    if (!result) {
      throw new ApiError(404, 'Team member not found');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
