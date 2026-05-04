import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from './auth';
import { connectToDatabase } from './db';
import { User, TeamMember } from './models';

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requireAuth(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const { user, error } = await verifyAuth(authHeader);

  if (error || !user) {
    throw new ApiError(401, 'Unauthorized');
  }

  return user;
}

export async function getUserFromDb(userId: string) {
  await connectToDatabase();
  const user = await User.findOne({ id: userId });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return user;
}

export async function checkTeamAccess(userId: string, teamId: string, requiredRole?: string) {
  await connectToDatabase();

  const member = await TeamMember.findOne({
    team_id: teamId,
    user_id: userId,
  });

  if (!member) {
    throw new ApiError(403, 'You do not have access to this team');
  }

  if (requiredRole && member.role !== requiredRole && member.role !== 'admin') {
    throw new ApiError(403, `This action requires ${requiredRole} role`);
  }

  return member;
}

export async function checkProjectAccess(userId: string, projectId: string) {
  await connectToDatabase();

  const project = await (await import('./models')).Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, 'Project not found');
  }

  const member = await TeamMember.findOne({
    team_id: project.team_id,
    user_id: userId,
  });

  if (!member) {
    throw new ApiError(403, 'You do not have access to this project');
  }

  return { project, member };
}

export function handleApiError(error: any) {
  console.error('[v0] API Error:', error);

  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }

  if (error.name === 'ZodError') {
    return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
  }

  if (error.name === 'MongooseServerSelectionError') {
    return NextResponse.json(
      { error: 'Database connection failed. Ensure your IP is whitelisted in MongoDB Atlas.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
