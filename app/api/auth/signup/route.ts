import { createSupabaseClient } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { signUpSchema } from '@/lib/schemas';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/lib/models';
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
    const { email, password, name } = signUpSchema.parse(body);

    const supabase = createSupabaseClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://teams.flairtechlabs.com';

    // Sign up — Supabase will send a confirmation email via your configured Resend SMTP.
    // The link in the email redirects to /auth/callback which finalises the session.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
        data: { name },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Supabase returns a user even before confirmation, but session is null until confirmed.
    const supabaseUser = authData.user;
    if (!supabaseUser) {
      return NextResponse.json({ error: 'Sign up failed' }, { status: 400 });
    }

    // Pre-sync the user record in MongoDB so it's ready once they confirm
    await connectToDatabase();
    await User.findOneAndUpdate(
      { $or: [{ id: supabaseUser.id }, { email }] },
      { id: supabaseUser.id, email, name, role: 'member' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // If session is null, email confirmation is required
    const needsConfirmation = !authData.session;

    return NextResponse.json(
      {
        needs_confirmation: needsConfirmation,
        user: { id: supabaseUser.id, email, name },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
