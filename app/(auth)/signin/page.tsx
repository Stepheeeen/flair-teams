'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const { signIn, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (inviteToken) {
        localStorage.setItem('pending_invite', inviteToken);
      }
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0A0042 0%, #002E4D 60%, #0E1628 100%)' }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border border-white/20" />
          <div className="absolute top-32 left-32 w-48 h-48 rounded-full border border-white/20" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full border border-white/10" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="relative w-10 h-10">
              <Image src="/logo.png" alt="Flair Technologies" fill className="object-contain" />
            </div>
            <div className="text-white">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Flair Technologies</p>
              <p className="text-lg font-bold leading-tight">Teams</p>
            </div>
          </div>

          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Your team,<br />
            <span style={{ color: '#FFC078' }}>in sync.</span>
          </h2>
          <p className="text-white/60 text-base max-w-xs leading-relaxed">
            Manage projects, track tasks, and communicate clearly — all in one place built for Flair.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {[
            { label: 'Project Management', desc: 'Organize work into focused projects' },
            { label: 'Task Tracking', desc: 'Kanban boards keep everyone aligned' },
            { label: 'Team Collaboration', desc: 'Role-based access for secure teams' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #FFC078 0%, #DA9646 100%)' }} />
              <div>
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-white/50 text-xs">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="relative w-8 h-8">
              <Image src="/logo.png" alt="Flair Technologies" fill className="object-contain" />
            </div>
            <span className="font-bold text-foreground">Flair Technologies <span className="text-primary">Teams</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-black text-foreground mb-1">Welcome back</h1>
            <p className="text-muted-foreground text-sm">Sign in to your workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-semibold text-foreground">
                Work email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@flairtechlabs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-bold gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #FFC078 0%, #DA9646 100%)', color: '#1B1C1B' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline underline-offset-2">
              Create one
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-muted-foreground/60">
            © {new Date().getFullYear()} Flair Technologies. Internal use only.
          </p>
        </div>
      </div>
    </div>
  );
}
