'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase-browser';
import Image from 'next/image';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function handleCallback() {
      try {
        // PKCE flow: Supabase appends ?code=xxx to the redirectTo URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const errorParam = params.get('error_description');

        if (errorParam) {
          setErrorMsg(errorParam);
          setStatus('error');
          return;
        }

        if (code) {
          // Exchange the one-time code for a real session
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.session) {
            setErrorMsg(error?.message || 'Confirmation failed. Please try again.');
            setStatus('error');
            return;
          }

          // Sync the confirmed user's profile to MongoDB
          try {
            await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${data.session.access_token}` },
            });
          } catch { /* non-blocking */ }

          setStatus('success');
          setTimeout(() => router.replace('/dashboard'), 1500);
          return;
        }

        // Implicit / hash-based flow fallback
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus('success');
          setTimeout(() => router.replace('/dashboard'), 1500);
        } else {
          setErrorMsg('No confirmation token found. The link may have expired.');
          setStatus('error');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'An unexpected error occurred.');
        setStatus('error');
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        {/* Logo */}
        <div className="relative w-14 h-14 mx-auto mb-6">
          <div
            className="absolute -inset-2 rounded-2xl animate-pulse opacity-30"
            style={{ backgroundColor: '#FFC078' }}
          />
          <div
            className="relative w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0A0042 0%, #002E4D 100%)' }}
          >
            <Image src="/logo.png" alt="Flair" width={36} height={36} className="object-contain" />
          </div>
        </div>

        {status === 'loading' && (
          <>
            <div className="flex justify-center gap-1.5 mb-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: '#FFC078', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-lg font-black text-foreground">Confirming your email…</p>
            <p className="text-sm text-muted-foreground mt-2">Just a moment while we verify your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}
            >
              ✓
            </div>
            <p className="text-lg font-black text-foreground">Email confirmed!</p>
            <p className="text-sm text-muted-foreground mt-2">Redirecting you to your dashboard…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-destructive/10 text-destructive text-2xl">
              ✕
            </div>
            <p className="text-lg font-black text-foreground">Confirmation failed</p>
            <p className="text-sm text-muted-foreground mt-2 mb-6">{errorMsg}</p>
            <div className="flex flex-col gap-2">
              <a
                href="/signup"
                className="w-full py-2.5 rounded-lg text-sm font-bold text-center"
                style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
              >
                Try signing up again
              </a>
              <a href="/signin" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Already confirmed? Sign in
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
