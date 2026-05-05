import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { TeamMember, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/members/[userId]
 * Fetch a single member's information across shared teams.
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await props.params;
    const me = await requireAuth(req);
    await connectToDatabase();

    // Verify they share at least one team
    const myTeams = (await TeamMember.find({ user_id: me.id }).select('team_id').lean() as any[])
      .map(m => String(m.team_id));
    const theirTeams = (await TeamMember.find({ user_id: userId }).select('team_id').lean() as any[])
      .map(m => String(m.team_id));
    
    const shared = myTeams.some(tid => theirTeams.includes(tid));
    if (!shared) throw new ApiError(403, 'You are not in the same workspace as this user');

    const user = await User.findOne({ id: userId })
      .select('id name email avatar_url job_title role')
      .lean();
    
    if (!user) throw new ApiError(404, 'User not found');

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
