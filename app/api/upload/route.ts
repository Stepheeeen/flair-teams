import { requireAuth, handleApiError } from '@/lib/api-utils';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const uploadSchema = z.object({
  filename: z.string().min(1),
  content_type: z.string().min(1),
  channel_type: z.enum(['group', 'subgroup']),
  channel_id: z.string().min(1),
});

const BUCKET = 'channel-files';
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

// POST /api/upload — returns a signed upload URL for Supabase Storage
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { filename, content_type, channel_type, channel_id } = uploadSchema.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Build storage path: channel-files/<channelType>/<channelId>/<userId>/<timestamp>-<filename>
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${channel_type}/${channel_id}/${user.id}/${Date.now()}-${safeFilename}`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error) {
      // Bucket might not exist — try creating it first
      if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
        await supabase.storage.createBucket(BUCKET, {
          public: false,
          fileSizeLimit: MAX_SIZE,
          allowedMimeTypes: [
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            'image/png', 'image/jpeg', 'image/webp', 'image/gif',
            'application/zip', 'application/x-zip-compressed',
          ],
        });
        const retry = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (retry.error) throw new Error(retry.error.message);
        return NextResponse.json({ signed_url: retry.data.signedUrl, path, token: retry.data.token });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ signed_url: data.signedUrl, path, token: data.token });
  } catch (error) {
    return handleApiError(error);
  }
}

// GET /api/upload?path=xxx — get a signed download URL
export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600); // 1 hour

    if (error) throw new Error(error.message);
    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
