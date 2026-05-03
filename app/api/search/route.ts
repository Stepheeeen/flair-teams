import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Group, SubGroup, Project, Team, Message, TeamMember } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/search?q=<query>&teamId=<teamId>
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    const teamId = searchParams.get('teamId');

    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    await connectToDatabase();

    const regex = new RegExp(q, 'i');

    // Get all teams user is a member of
    const memberships = await TeamMember.find({ user_id: user.id }).select('team_id').lean() as any[];
    const teamIds = memberships.map((m) => m.team_id);
    const scopedTeamIds = teamId ? [teamId] : teamIds;

    const [teams, projects, groups, subgroups, messages] = await Promise.all([
      // Teams
      Team.find({ _id: { $in: teamIds }, name: regex }).limit(5).lean(),
      // Projects (within accessible teams)
      Project.find({ team_id: { $in: scopedTeamIds }, name: regex, status: 'active' }).limit(8).lean(),
      // Groups
      Group.find({ team_id: { $in: scopedTeamIds }, name: regex }).limit(8).lean(),
      // Sub-groups
      SubGroup.find({ team_id: { $in: scopedTeamIds }, name: regex }).limit(8).lean(),
      // Messages — only search non-deleted
      Message.find({
        channel_id: { $in: [] }, // placeholder — would need channel IDs
        content: regex,
        deleted: { $ne: true },
      }).limit(5).lean(),
    ]);

    // Get accessible group IDs for message search
    const accessibleGroupIds = groups.map((g: any) => g._id);
    const accessibleSubGroupIds = subgroups.map((sg: any) => sg._id);
    const allChannelIds = [...accessibleGroupIds, ...accessibleSubGroupIds];

    // Re-run message search with proper channel scope
    const messageResults = allChannelIds.length > 0
      ? await Message.find({
          channel_id: { $in: allChannelIds },
          content: regex,
          deleted: { $ne: true },
        }).limit(5).lean()
      : [];

    const results = [
      ...teams.map((t: any) => ({ type: 'team', id: t._id, title: t.name, url: `/teams/${t._id}` })),
      ...projects.map((p: any) => ({ type: 'project', id: p._id, title: p.name, url: `/projects/${p._id}`, subtitle: 'Project' })),
      ...groups.map((g: any) => ({ type: 'group', id: g._id, title: `#${g.name}`, url: `/groups/${g._id}`, subtitle: g.description })),
      ...subgroups.map((sg: any) => ({ type: 'subgroup', id: sg._id, title: `› ${sg.name}`, url: `/groups/${sg.group_id}/sub/${sg._id}`, subtitle: sg.description })),
      ...messageResults.map((m: any) => ({
        type: 'message',
        id: m._id,
        title: m.content.slice(0, 80),
        url: m.channel_type === 'group' ? `/groups/${m.channel_id}` : `/groups/${m.group_id}/sub/${m.channel_id}`,
        subtitle: `By ${m.sender_name}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    return handleApiError(error);
  }
}
