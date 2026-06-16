import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Message, User } from '@/lib/models';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/messages/[messageId]/reactions — toggle reaction
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    const body = await req.json();
    const { emoji } = body;

    if (!emoji) {
      throw new ApiError(400, 'Emoji is required');
    }

    const userDoc = await User.findOne({ id: user.id }).select('name').lean() as any;
    const userName = userDoc?.name || user.email;

    // 1. Try to pull the reaction first
    let resultMessage = await Message.findOneAndUpdate(
      {
        _id: messageId,
        reactions: {
          $elemMatch: { emoji, user_id: user.id }
        }
      },
      {
        $pull: { reactions: { emoji, user_id: user.id } }
      },
      { new: true }
    );

    // 2. If no matching reaction was pulled, push it
    if (!resultMessage) {
      resultMessage = await Message.findOneAndUpdate(
        { _id: messageId },
        {
          $push: {
            reactions: {
              emoji,
              user_id: user.id,
              user_name: userName
            }
          }
        },
        { new: true }
      );
    }

    if (!resultMessage) {
      throw new ApiError(404, 'Message not found');
    }

    const reactions = resultMessage.reactions || [];

    // Broadcast update via Supabase Realtime
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const channelName = `chat:${resultMessage.channel_type}:${resultMessage.channel_id}`;
      const channel = supabase.channel(channelName);
      await channel.send({
        type: 'broadcast',
        event: 'message_reactions_updated',
        payload: { _id: messageId, reactions, channel_id: resultMessage.channel_id },
      });
      await supabase.removeChannel(channel);
    } catch (e) {
      console.error('[REACTION BROADCAST ERROR]:', e);
    }

    return NextResponse.json({ reactions });
  } catch (error) {
    return handleApiError(error);
  }
}
