import { createSupabaseClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const supabase = createSupabaseClient();

  await supabase.auth.signOut();

  const response = NextResponse.json({ success: true });
  response.cookies.delete('sb-access-token');

  return response;
}
