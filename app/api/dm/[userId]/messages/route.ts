import { requireAuth, handleApiError, ApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { DirectMessage, TeamMember, User } from '@/lib/models';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PAGE_SIZE = 50;

function makeConversationId(a: string, b: string) {
  return [a, b].sort().join(':');
}

async function assertCanMessage(userId: string, otherId: string) {
  // Both users must share at least one team
  const myTeams = (await TeamMember.find({ user_id: userId }).select('team_id').lean() as any[])
    .map((m) => String(m.team_id));
  const theirTeams = (await TeamMember.find({ user_id: otherId }).select('team_id').lean() as any[])
    .map((m) => String(m.team_id));
  const shared = myTeams.some((tid) => theirTeams.includes(tid));
  if (!shared) throw new ApiError(403, 'You are not in the same workspace as this user');
}

// GET /api/dm/[userId]/messages — fetch DM history
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    await assertCanMessage(user.id, otherId);

    const { searchParams } = new URL(req.url);
    const before = searchParams.get('before');
    const limit = Math.min(Number(searchParams.get('limit') || PAGE_SIZE), 100);
    const convId = makeConversationId(user.id, otherId);

    const query: any = { conversation_id: convId, deleted: { $ne: true } };
    if (before) query.createdAt = { $lt: new Date(before) };

    const messages = await DirectMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark received messages as read
    await DirectMessage.updateMany(
      { conversation_id: convId, sender_id: otherId, read: false },
      { read: true }
    );

    return NextResponse.json({
      messages: messages.reverse(),
      has_more: messages.length === limit,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/dm/[userId]/messages — send a DM
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherId } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    await assertCanMessage(user.id, otherId);

    const body = await req.json();
    const content = body.content?.trim();
    if (!content) throw new ApiError(400, 'Message content is required');

    const senderDoc = await User.findOne({ id: user.id }).select('name avatar_url').lean() as any;
    const convId = makeConversationId(user.id, otherId);

    const message = await DirectMessage.create({
      conversation_id: convId,
      sender_id: user.id,
      sender_name: senderDoc?.name || user.email,
      sender_avatar: senderDoc?.avatar_url,
      content,
      type: 'text',
    });

    // Realtime broadcast to both participants
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
      const ch = supabase.channel(`dm:${convId}`);
      await ch.send({ type: 'broadcast', event: 'new_message', payload: message.toObject() });
      await supabase.removeChannel(ch);
    } catch { /* non-blocking */ }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
