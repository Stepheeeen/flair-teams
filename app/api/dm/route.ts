import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { DirectMessage, TeamMember, User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

function makeConversationId(a: string, b: string) {
  return [a, b].sort().join(':');
}

/**
 * GET /api/dm
 * List recent DM conversations for the current user.
 * Returns the last message + other user's info per conversation.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    // Find all conversations involving this user
    // conversation_id pattern: "uid1:uid2" where uid1 < uid2 alphabetically
    const messages = await DirectMessage.aggregate([
      {
        $match: {
          conversation_id: { $regex: user.id },
          deleted: { $ne: true },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$conversation_id',
          last_message: { $first: '$$ROOT' },
          unread_count: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$read', false] }, { $ne: ['$sender_id', user.id] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'last_message.createdAt': -1 } },
    ]);

    // Resolve the other user in each conversation
    const enriched = await Promise.all(
      messages.map(async (conv) => {
        const [uid1, uid2] = conv._id.split(':');
        const otherId = uid1 === user.id ? uid2 : uid1;
        const otherUser = await User.findOne({ id: otherId })
          .select('id name email avatar_url job_title')
          .lean();
        if (!otherUser) return null;
        return { ...conv, other_user: otherUser };
      })
    );

    const filtered = enriched.filter(Boolean);

    return NextResponse.json({ conversations: filtered });
  } catch (error) {
    return handleApiError(error);
  }
}
