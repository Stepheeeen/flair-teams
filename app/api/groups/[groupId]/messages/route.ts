import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Group, Message, TeamMember, User, Notification } from '@/lib/models';
import { createClient } from '@supabase/supabase-js';
import { sendMentionEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  reply_to: z.string().optional(),
  type: z.enum(['text', 'file']).default('text'),
  attachment: z.object({
    url: z.string(),
    name: z.string(),
    size: z.number(),
    mime_type: z.string(),
    bucket_path: z.string(),
  }).optional(),
});

const PAGE_SIZE = 50;

async function resolveGroupAccess(groupId: string, userId: string) {
  const group = await Group.findById(groupId);
  if (!group) throw new ApiError(404, 'Group not found');
  const member = await TeamMember.findOne({ team_id: group.team_id, user_id: userId });
  if (!member) throw new ApiError(403, 'Not a member of this team');
  if (group.is_private && !group.members.includes(userId)) {
    throw new ApiError(403, 'No access to this private group');
  }
  return { group, member };
}

/** Extract @mentions like @John or @John-Doe from message content */
function extractMentionNames(content: string): string[] {
  const matches = content.match(/@([\w-]+)/g) || [];
  return matches.map((m) => m.slice(1).replace(/-/g, ' ').toLowerCase());
}

// GET /api/groups/[groupId]/messages
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();
    await resolveGroupAccess(groupId, user.id);

    const { searchParams } = new URL(req.url);
    const before = searchParams.get('before');
    const limit = Math.min(Number(searchParams.get('limit') || PAGE_SIZE), 100);

    const query: any = { channel_type: 'group', channel_id: groupId, deleted: { $ne: true } };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return NextResponse.json({ messages: messages.reverse(), has_more: messages.length === limit });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/groups/[groupId]/messages
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const { group, member } = await resolveGroupAccess(groupId, user.id);

    if (group.type === 'announcement' && !['admin', 'manager'].includes(member.role)) {
      throw new ApiError(403, 'Only admins/managers can post in announcement channels');
    }

    const body = await req.json();
    const { content, reply_to, type, attachment } = sendMessageSchema.parse(body);

    const senderDoc = await User.findOne({ id: user.id }).select('name avatar_url email').lean() as any;
    const senderName = senderDoc?.name || user.email;

    // Parse @mentions
    const mentionNames = extractMentionNames(content);
    let mentionedUserIds: string[] = [];

    if (mentionNames.length > 0) {
      const mentionedUsers = await User.find({
        name: { $in: mentionNames.map((n) => new RegExp(`^${n}$`, 'i')) },
      }).select('id email name').lean() as any[];
      mentionedUserIds = mentionedUsers.map((u: any) => u.id);

      // Get all team members to check who is actually in the team
      const teamMemberIds = (await TeamMember.find({ team_id: group.team_id })
        .select('user_id').lean() as any[]).map((m: any) => m.user_id);

      const validMentions = mentionedUsers.filter((u: any) => teamMemberIds.includes(u.id));

      const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teams.flairtechlabs.com';
      const channelUrl = `${APP_URL}/groups/${groupId}`;

      // Create notifications + send emails for valid mentions
      await Promise.allSettled(
        validMentions
          .filter((u: any) => u.id !== user.id) // Don't notify yourself
          .map(async (u: any) => {
            await Notification.create({
              recipient_id: u.id,
              type: 'mention',
              title: `${senderName} mentioned you`,
              body: `In #${group.name}: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
              link: channelUrl,
              actor_id: user.id,
              actor_name: senderName,
              channel_id: group._id,
            });

            // Fire-and-forget email
            sendMentionEmail({
              to: u.email,
              mentionedBy: senderName,
              channelName: group.name,
              messagePreview: content.slice(0, 200),
              channelUrl,
            }).catch(() => {}); // Non-blocking
          })
      );
    }

    const message = await Message.create({
      channel_type: 'group',
      channel_id: groupId,
      sender_id: user.id,
      sender_name: senderName,
      sender_avatar: senderDoc?.avatar_url,
      content: content.trim(),
      type,
      attachment: attachment || undefined,
      reply_to: reply_to || null,
      mentions: mentionedUserIds,
    });

    // ── Supabase Realtime broadcast ──────────────────────────────────────────
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const channel = supabase.channel(`chat:group:${groupId}`);
      await channel.send({
        type: 'broadcast',
        event: 'new_message',
        payload: message.toObject(),
      });
      await supabase.removeChannel(channel);
    } catch {
      // Realtime broadcast failure must never block the response
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
