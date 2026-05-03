import { requireAuth, checkProjectAccess, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Project } from '@/lib/models';
import { updateProjectSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

// GET project details
export async function GET(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    await checkProjectAccess(user.id, projectId);

    const project = await Project.findById(projectId);

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update project
export async function PUT(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    const { member } = await checkProjectAccess(user.id, projectId);

    // Check if user is admin or manager
    if (!['admin', 'manager'].includes(member.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const updates = updateProjectSchema.parse(body);

    const project = await Project.findByIdAndUpdate(projectId, updates, { new: true });

    return NextResponse.json({ project });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE project
export async function DELETE(req: NextRequest, props: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await props.params;
    const user = await requireAuth(req);

    await connectToDatabase();
    const { member } = await checkProjectAccess(user.id, projectId);

    // Check if user is admin
    if (member.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await Project.findByIdAndDelete(projectId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
