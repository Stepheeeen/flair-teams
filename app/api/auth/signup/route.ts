import { createSupabaseClient } from '@/lib/auth';
import { signUpSchema } from '@/lib/schemas';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/lib/models';
import { sendWelcomeEmail } from '@/lib/email';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = signUpSchema.parse(body);

    const supabase = createSupabaseClient();

    // Sign up user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Sign up failed' }, { status: 400 });
    }

    // Connect to MongoDB and create/update user record
    await connectToDatabase();

    const user = await User.findOneAndUpdate(
      { $or: [{ id: authData.user.id }, { email }] },
      { 
        id: authData.user.id,
        email, 
        name, 
        role: 'member' 
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ to: email, name }).catch(err => {
      console.error('Failed to send welcome email:', err);
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
