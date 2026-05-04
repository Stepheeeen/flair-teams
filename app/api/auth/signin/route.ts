import { createSupabaseClient } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { signInSchema } from '@/lib/schemas';
import { NextRequest, NextResponse } from 'next/server';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = signInSchema.parse(body);

    const supabase = createSupabaseClient();

    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // Auto-confirm recovery: if the user exists but is unconfirmed, confirm them and retry
    if (error?.message?.toLowerCase().includes('email not confirmed')) {
      const admin = createAdminClient();
      const { data: list } = await admin.auth.admin.listUsers();
      const unconfirmed = list?.users?.find(u => u.email === email);
      if (unconfirmed) {
        await admin.auth.admin.updateUserById(unconfirmed.id, { email_confirm: true });
        // Retry sign-in now that they're confirmed
        const retry = await supabase.auth.signInWithPassword({ email, password });
        data = retry.data;
        error = retry.error;
      }
    }

    if (error || !data.session) {
      return NextResponse.json({ error: error?.message || 'Sign in failed' }, { status: 401 });
    }

    const response = NextResponse.json(
      { user: { id: data.user.id, email: data.user.email }, session: data.session },
      { status: 200 }
    );

    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

