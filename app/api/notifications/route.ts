import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/notifications — get current user's notifications
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const unread_only = searchParams.get('unread') === 'true';
    const limit = Math.min(Number(searchParams.get('limit') || 30), 50);

    await connectToDatabase();

    const query: any = { recipient_id: user.id };
    if (unread_only) query.read = false;

    const [notifications, unread_count] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ recipient_id: user.id, read: false }),
    ]);

    return NextResponse.json({ notifications, unread_count });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/notifications — mark all as read
export async function PUT(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();
    await Notification.updateMany({ recipient_id: user.id, read: false }, { read: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
