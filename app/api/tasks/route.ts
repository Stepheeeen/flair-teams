import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Task, Project, TeamMember, Activity } from '@/lib/models';
import { createTaskSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

// GET tasks
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    await connectToDatabase();

    if (!projectId) {
      throw new ApiError(400, 'projectId is required');
    }

    // Verify access to project
    const project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const member = await TeamMember.findOne({
      team_id: project.team_id,
      user_id: user.id,
    });

    if (!member) {
      throw new ApiError(403, 'Unauthorized');
    }

    const tasks = await Task.find({ project_id: projectId }).sort('order');

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create task
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { title, description, project_id, assigned_to, priority, due_date } =
      createTaskSchema.parse(body);

    await connectToDatabase();

    // Verify access to project
    const project = await Project.findById(project_id);
    if (!project) {
      throw new ApiError(404, 'Project not found');
    }

    const member = await TeamMember.findOne({
      team_id: project.team_id,
      user_id: user.id,
    });

    if (!member) {
      throw new ApiError(403, 'Unauthorized');
    }

    // Get max order for new task
    const lastTask = await Task.findOne({ project_id }).sort('-order');
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      title,
      description,
      project_id,
      assigned_to,
      created_by: user.id,
      priority,
      due_date,
      order,
    });

    // Log activity
    await Activity.create({
      team_id: project.team_id,
      user_id: user.id,
      action: 'created_task',
      resource_type: 'task',
      resource_id: task._id,
      details: { title },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
