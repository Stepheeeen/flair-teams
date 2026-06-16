import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Message, TeamMember, Group, SubGroup } from '@/lib/models';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const body = await req.json();
    const content = body.content?.trim();

    if (!content) {
      throw new ApiError(400, 'Content is required');
    }

    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    if (message.sender_id !== user.id) {
      throw new ApiError(403, 'You can only edit your own messages');
    }

    message.content = content;
    message.edited = true;
    await message.save();

    // Broadcast edit
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const channelName = `chat:${message.channel_type}:${message.channel_id}`;
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'message_updated',
        payload: message.toObject(),
      });
      await supabase.removeChannel(channel);
    } catch {}

    return NextResponse.json({ message });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const message = await Message.findById(messageId);
    if (!message) throw new ApiError(404, 'Message not found');

    // To delete, must be sender or admin/manager of the team
    let canDelete = message.sender_id === user.id;

    if (!canDelete) {
      let teamId = null;
      if (message.channel_type === 'group') {
        const group = await Group.findById(message.channel_id);
        if (group) teamId = group.team_id;
      } else if (message.channel_type === 'subgroup') {
        const subGroup = await SubGroup.findById(message.channel_id);
        if (subGroup) teamId = subGroup.team_id;
      }

      if (teamId) {
        const member = await TeamMember.findOne({ team_id: teamId, user_id: user.id });
        if (member && ['admin', 'manager'].includes(member.role)) {
          canDelete = true;
        }
      }
    }

    if (!canDelete) {
      throw new ApiError(403, 'You do not have permission to delete this message');
    }

    // Delete attachment from Supabase Storage if it exists
    if (message.attachment && message.attachment.bucket_path) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );
        await supabase.storage
          .from('channel-files')
          .remove([message.attachment.bucket_path]);
      } catch (storageErr) {
        console.error('[DELETE MESSAGE ATTACHMENT ERROR]:', storageErr);
      }
    }

    message.deleted = true;
    message.content = 'This message was deleted';
    message.attachment = undefined;
    await message.save();

    // Broadcast delete
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const channelName = `chat:${message.channel_type}:${message.channel_id}`;
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'message_deleted',
        payload: { _id: messageId, deleted: true, content: 'This message was deleted', channel_id: message.channel_id },
      });
      await supabase.removeChannel(channel);
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
