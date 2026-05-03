import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Project, TeamMember, Activity } from '@/lib/models';
import { createProjectSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

// GET all projects for user
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    await connectToDatabase();

    let query: any = {};

    if (teamId) {
      const member = await TeamMember.findOne({ team_id: teamId, user_id: user.id });
      if (!member) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      query.team_id = teamId;
    } else {
      const teams = await TeamMember.find({ user_id: user.id }).select('team_id');
      query.team_id = { $in: teams.map((t) => t.team_id) };
    }

    const projects = await Project.find(query).sort('-createdAt');

    return NextResponse.json({ projects });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create project
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { name, description, color } = createProjectSchema.parse(body);

    const teamId = body.team_id;
    if (!teamId) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    await connectToDatabase();

    const member = await TeamMember.findOne({ team_id: teamId, user_id: user.id });
    if (!member) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const project = await Project.create({
      name,
      description,
      team_id: teamId,
      created_by: user.id,
      color,
    });

    // Log activity
    await Activity.create({
      team_id: teamId,
      user_id: user.id,
      action: 'created_project',
      resource_type: 'project',
      resource_id: project._id,
      details: { name },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
