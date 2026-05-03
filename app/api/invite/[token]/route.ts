import { connectToDatabase } from '@/lib/db';
import { TeamInvite, TeamMember, User } from '@/lib/models';
import { createSupabaseClient } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/invite/[token] — validate an invite token (used to show invite info page)
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;

    await connectToDatabase();

    const invite = await TeamInvite.findOne({
      token,
      accepted: false,
      expires_at: { $gt: new Date() },
    }).populate('team_id', 'name description');

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found, already used, or expired' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      invite: {
        email: invite.email,
        role: invite.role,
        team: invite.team_id,
        expires_at: invite.expires_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/invite/[token] — accept an invite (user must be signed in as the invited email)
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;

    // Verify auth
    const authHeader = req.headers.get('authorization');
    const supabase = createSupabaseClient();

    let supabaseUser: any = null;
    if (authHeader?.startsWith('Bearer ')) {
      const { data } = await supabase.auth.getUser(authHeader.substring(7));
      supabaseUser = data.user;
    } else {
      const { cookies } = await import('next/headers');
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get('sb-access-token')?.value;
      if (cookieToken) {
        const { data } = await supabase.auth.getUser(cookieToken);
        supabaseUser = data.user;
      }
    }

    if (!supabaseUser) {
      return NextResponse.json({ error: 'You must be signed in to accept an invite' }, { status: 401 });
    }

    await connectToDatabase();

    const invite = await TeamInvite.findOne({
      token,
      accepted: false,
      expires_at: { $gt: new Date() },
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invite not found, already used, or expired' },
        { status: 404 }
      );
    }

    // Ensure the signed-in user's email matches the invite email
    if (supabaseUser.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.email}. Please sign in with that email.` },
        { status: 403 }
      );
    }

    // Ensure user exists in MongoDB (created during signup)
    let user = await User.findOne({ id: supabaseUser.id });
    if (!user) {
      user = await User.create({
        id: supabaseUser.id,
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0],
        role: 'member',
      });
    }

    // Check if already a member
    const existing = await TeamMember.findOne({
      team_id: invite.team_id,
      user_id: supabaseUser.id,
    });

    if (existing) {
      // Mark invite as accepted anyway and return success
      await TeamInvite.findByIdAndUpdate(invite._id, { accepted: true });
      return NextResponse.json({ success: true, team_id: invite.team_id, already_member: true });
    }

    // Add as team member
    await TeamMember.create({
      team_id: invite.team_id,
      user_id: supabaseUser.id,
      role: invite.role,
      invited_by: invite.created_by,
    });

    // Mark invite as accepted
    await TeamInvite.findByIdAndUpdate(invite._id, { accepted: true });

    return NextResponse.json({ success: true, team_id: invite.team_id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
