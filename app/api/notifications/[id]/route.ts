import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const user = await requireAuth(req);
    await connectToDatabase();

    await Notification.findOneAndUpdate(
      { _id: id, recipient_id: user.id },
      { read: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
