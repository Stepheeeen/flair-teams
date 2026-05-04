import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client for use in the browser and API routes (with RLS)
export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server client for use in Server Components and Route Handlers (with service key)
export async function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  });
}

// Get current user session from cookies
export async function getSession() {
  const cookieStore = await cookies();
  const supabase = createSupabaseClient();

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    return null;
  }
}

// Get current user
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

// Verify token in API route — checks Bearer header first, then falls back to cookie
export async function verifyAuth(authHeader?: string | null) {
  const supabase = createSupabaseClient();

  // 1. Try Bearer token from Authorization header (sent by client components)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    return { user, error };
  }

  // 2. Fall back to the HTTP-only cookie set during sign-in
  try {
    const cookieStore = await cookies();
    const cookieToken = cookieStore.get('sb-access-token')?.value || cookieStore.get('flair-fallback-token')?.value;
    if (cookieToken) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(cookieToken);
      return { user, error };
    }
  } catch {
    // cookies() may throw outside of a request context — safe to ignore
  }

  return { user: null, error: new Error('No auth token found') };
}
