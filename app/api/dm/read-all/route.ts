import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { DirectMessage } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/dm/read-all
 * Mark all incoming direct messages for the current user as read.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    // Mark all messages where user is NOT the sender as read
    await DirectMessage.updateMany(
      { 
        conversation_id: { $regex: user.id }, 
        sender_id: { $ne: user.id }, 
        read: false 
      },
      { read: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
