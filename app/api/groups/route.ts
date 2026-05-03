import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Group, TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createGroupSchema = z.object({
  team_id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  type: z.enum(['general', 'department', 'announcement']).default('general'),
  is_private: z.boolean().default(false),
  color: z.string().optional(),
});

// GET /api/groups?teamId=xxx — list groups (teamId optional — returns all if omitted)
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get('teamId');

    await connectToDatabase();

    let groups;
    if (teamId) {
      // Scoped to a specific team
      const member = await TeamMember.findOne({ team_id: teamId, user_id: user.id });
      if (!member) throw new ApiError(403, 'Not a member of this team');
      groups = await Group.find({ team_id: teamId }).sort({ type: 1, name: 1 });
    } else {
      // All groups across all teams user belongs to
      const memberships = await TeamMember.find({ user_id: user.id }).select('team_id').lean() as any[];
      const teamIds = memberships.map((m) => m.team_id);
      groups = await Group.find({ team_id: { $in: teamIds } }).sort({ type: 1, name: 1 });
    }

    return NextResponse.json({ groups });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/groups — create a group
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { team_id, name, description, type, is_private, color } =
      createGroupSchema.parse(body);

    await connectToDatabase();

    // Only admin/manager can create groups
    const member = await TeamMember.findOne({ team_id, user_id: user.id });
    if (!member) throw new ApiError(403, 'Not a member of this team');
    if (type === 'announcement' && !['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins and managers can create announcement channels');
    }

    // Prevent duplicate names within team
    const existing = await Group.findOne({ team_id, name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) throw new ApiError(409, `A group named "${name}" already exists in this team`);

    const group = await Group.create({
      team_id,
      name,
      description,
      type,
      is_private,
      color: color || '#FFC078',
      created_by: user.id,
      members: is_private ? [user.id] : [],
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
