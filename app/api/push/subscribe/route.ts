import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const subscription = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if subscription already exists for this user
    const dbUser = await User.findOne({ id: user.id });
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const exists = dbUser.push_subscriptions?.some((sub: any) => sub.endpoint === subscription.endpoint);

    if (!exists) {
      await User.updateOne(
        { id: user.id },
        { $push: { push_subscriptions: subscription } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
    }

    await connectToDatabase();
    await User.updateOne(
      { id: user.id },
      { $pull: { push_subscriptions: { endpoint } } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
