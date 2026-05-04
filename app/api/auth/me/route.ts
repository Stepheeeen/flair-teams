import { verifyAuth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/lib/models';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = await verifyAuth(authHeader);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const userRecord = await User.findOne({ id: user.id });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        avatar_url: userRecord.avatar_url,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = await verifyAuth(authHeader);
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const updateData: any = {};
    if (body.name?.trim()) updateData.name = body.name.trim();
    if (body.job_title?.trim()) updateData.job_title = body.job_title.trim();
    if (body.avatar_url) updateData.avatar_url = body.avatar_url;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await connectToDatabase();
    const updated = await User.findOneAndUpdate(
      { id: user.id },
      { $set: updateData },
      { new: true }
    ).select('id email name role avatar_url job_title');

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
