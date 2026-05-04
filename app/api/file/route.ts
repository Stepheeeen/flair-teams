import { requireAuth, handleApiError } from '@/lib/api-utils';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // We allow fetching files. We should verify auth.
    await requireAuth(req);
    
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    
    if (!path) return new NextResponse('Path required', { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase.storage
      .from('channel-files')
      .createSignedUrl(path, 3600); // 1 hour

    if (error || !data?.signedUrl) {
      return new NextResponse('File not found', { status: 404 });
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (error) {
    // If not authenticated, return 401
    return new NextResponse('Unauthorized', { status: 401 });
  }
}
