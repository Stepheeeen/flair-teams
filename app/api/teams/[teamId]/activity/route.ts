import { requireAuth, checkTeamAccess, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Activity } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// GET team activity log
export async function GET(req: NextRequest, props: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    await checkTeamAccess(user.id, teamId);

    const activities = await Activity.find({ team_id: teamId })
      .sort('-createdAt')
      .limit(50);

    return NextResponse.json({ activities });
  } catch (error) {
    return handleApiError(error);
  }
}
