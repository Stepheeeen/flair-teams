import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Task, Project, TeamMember, Activity } from '@/lib/models';
import { updateTaskSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

async function verifyTaskAccess(userId: string, taskId: string) {
  const task = await Task.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  const project = await Project.findById(task.project_id);
  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const member = await TeamMember.findOne({
    team_id: project.team_id,
    user_id: userId,
  });

  if (!member) {
    throw new ApiError(403, 'Unauthorized');
  }

  return { task, project, member };
}

// GET task details
export async function GET(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    const { task } = await verifyTaskAccess(user.id, taskId);

    return NextResponse.json({ task });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update task
export async function PUT(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    const { task, project } = await verifyTaskAccess(user.id, taskId);

    const body = await req.json();
    const updates = updateTaskSchema.parse(body);

    const oldStatus = task.status;
    const updatedTask = await Task.findByIdAndUpdate(taskId, updates, { new: true });

    // Log activity if status changed
    if (updates.status && updates.status !== oldStatus) {
      await Activity.create({
        team_id: project.team_id,
        user_id: user.id,
        action: 'updated_task',
        resource_type: 'task',
        resource_id: taskId,
        details: { status: updates.status },
      });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE task
export async function DELETE(req: NextRequest, props: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    const { member } = await verifyTaskAccess(user.id, taskId);

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Unauthorized');
    }

    await Task.findByIdAndDelete(taskId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
