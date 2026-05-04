'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';

const TOKEN_KEY = 'flair_access_token';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ needs_confirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Returns headers including Authorization + Content-Type */
  authHeaders: () => Record<string, string>;
  /**
   * Smart fetch wrapper:
   * - Injects auth headers automatically
   * - On 401 → clears session + redirects to /signin with a toast
   * - On 403 → toasts "No permission" but does NOT redirect
   * - On 5xx → toasts a generic server error
   * Throws on network failure or 401.
   */
  fetcher: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Token helpers ──────────────────────────────────────────────────────── */
  const storeToken = useCallback((t: string | null) => {
    setToken(t);
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const authHeaders = useCallback((): Record<string, string> => {
    const live = token ?? (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (live) headers['Authorization'] = `Bearer ${live}`;
    return headers;
  }, [token]);

  /* ── Global fetch wrapper ───────────────────────────────────────────────── */
  const fetcher = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    const mergedHeaders = {
      ...authHeaders(),
      ...(options.headers as Record<string, string> ?? {}),
    };

    let res: Response;
    try {
      res = await fetch(url, { ...options, headers: mergedHeaders });
    } catch {
      toast.error('Network error — check your connection and try again.');
      throw new Error('Network error');
    }

    if (res.status === 401) {
      // Clear stale session
      storeToken(null);
      setUser(null);
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      toast.error('Your session expired. Please sign in again.', { duration: 5000 });
      // Small delay so the toast is visible before redirect
      setTimeout(() => { window.location.href = '/signin'; }, 800);
      throw Object.assign(new Error('Unauthorized'), { status: 401 });
    }

    if (res.status === 403) {
      let msg = "You don't have permission to do that.";
      try { const d = await res.clone().json(); if (d.error) msg = d.error; } catch {}
      toast.error(msg);
    }

    if (res.status >= 500) {
      let msg = 'Something went wrong on our end. Please try again in a moment.';
      try {
        const d = await res.clone().json();
        if (d.error) msg = d.error;
      } catch {}
      toast.error(msg);
    }

    return res;
  }, [authHeaders, storeToken]);

  /* ── Fetch MongoDB user profile ─────────────────────────────────────────── */
  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
    } catch {/* transient */ }
    return false;
  }, []);

  /* ── Bootstrap: Supabase session → auto-refresh ─────────────────────────── */
  useEffect(() => {
    const supabase = getSupabaseClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token) {
          storeToken(session.access_token);
          if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await fetchProfile(session.access_token);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          storeToken(null);
        }
        setIsLoading(false);
      }
    );

    // Restore session on cold load
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          storeToken(session.access_token);
          await fetchProfile(session.access_token);
        } else {
          const stored = localStorage.getItem(TOKEN_KEY);
          if (stored) await fetchProfile(stored);
        }
      } finally {
        setIsLoading(false);
      }
    })();

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Sign Up ─────────────────────────────────────────────────────────────── */
  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ needs_confirmation: boolean }> => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Sign up failed'); }

    const data = await res.json();

    // If email confirmation is not required (e.g. already confirmed), auto sign-in
    if (!data.needs_confirmation) {
      const siRes = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (siRes.ok) {
        const siData = await siRes.json();
        setUser(siData.user);
        if (siData.session?.access_token) {
          storeToken(siData.session.access_token);
          if (siData.session.refresh_token) {
            await getSupabaseClient().auth.setSession({
              access_token: siData.session.access_token,
              refresh_token: siData.session.refresh_token,
            });
          }
        }
      }
    }

    return { needs_confirmation: !!data.needs_confirmation };
  }, [storeToken]);

  /* ── Sign In ─────────────────────────────────────────────────────────────── */
  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Sign in failed'); }

    const data = await res.json();
    setUser(data.user);
    if (data.session?.access_token) {
      storeToken(data.session.access_token);
      if (data.session.refresh_token) {
        await getSupabaseClient().auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
    }
  }, [storeToken]);

  /* ── Sign Out ─────────────────────────────────────────────────────────────── */
  const signOut = useCallback(async () => {
    await getSupabaseClient().auth.signOut();
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    storeToken(null);
  }, [storeToken]);

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, isAuthenticated: !!user,
      signUp, signIn, signOut, authHeaders, fetcher,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
