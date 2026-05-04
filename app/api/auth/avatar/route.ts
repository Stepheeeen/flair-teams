import { requireAuth, handleApiError } from '@/lib/api-utils';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/lib/models';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await connectToDatabase();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 });

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Only JPEG, PNG, WEBP and GIF are allowed' }, { status: 400 });

    // Upload to Supabase Storage
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `avatars/${user.id}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: upErr } = await supabase.storage
      .from('attachments')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (upErr) throw new Error(upErr.message);

    // Get public URL
    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
    const avatar_url = urlData.publicUrl;

    // Update user record
    await User.findOneAndUpdate({ id: user.id }, { avatar_url });

    return NextResponse.json({ avatar_url });
  } catch (error) {
    return handleApiError(error);
  }
}
