import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Team, TeamMember } from '@/lib/models';
import { createTeamSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

// GET all teams for current user
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    const teams = await Team.find({
      $or: [
        { owner_id: user.id },
        { _id: { $in: (await TeamMember.find({ user_id: user.id }).select('team_id')).map((m) => m.team_id) } },
      ],
    });

    return NextResponse.json({ teams });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create new team
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { name, description } = createTeamSchema.parse(body);

    await connectToDatabase();

    // Create team
    const team = await Team.create({
      name,
      description,
      owner_id: user.id,
    });

    // Add creator as team admin
    await TeamMember.create({
      team_id: team._id,
      user_id: user.id,
      role: 'admin',
      invited_by: user.id,
    });

    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
