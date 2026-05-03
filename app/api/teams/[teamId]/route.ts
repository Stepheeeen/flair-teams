import { requireAuth, checkTeamAccess, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Team, TeamMember } from '@/lib/models';
import { updateTeamSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

// GET team details
export async function GET(req: NextRequest, props: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    await checkTeamAccess(user.id, teamId);

    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    const members = await TeamMember.find({ team_id: teamId });

    return NextResponse.json({ team, members });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update team
export async function PUT(req: NextRequest, props: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    await checkTeamAccess(user.id, teamId, 'admin');

    const body = await req.json();
    const updates = updateTeamSchema.parse(body);

    const team = await Team.findByIdAndUpdate(teamId, updates, { new: true });

    return NextResponse.json({ team });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE team
export async function DELETE(req: NextRequest, props: { params: Promise<{ teamId: string }> }) {
  try {
    const { teamId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();

    const team = await Team.findById(teamId);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    if (team.owner_id !== user.id) {
      throw new ApiError(403, 'Only team owner can delete the team');
    }

    await Team.findByIdAndDelete(teamId);
    await TeamMember.deleteMany({ team_id: teamId });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
