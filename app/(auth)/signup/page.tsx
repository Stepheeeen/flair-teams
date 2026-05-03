'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

function validate(name: string, email: string, password: string) {
  const e: Record<string, string> = {};
  if (!name.trim()) e.name = 'Name is required';
  else if (name.trim().length < 2) e.name = 'At least 2 characters';
  if (!email.trim()) e.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address';
  if (!password) e.password = 'Password is required';
  else if (password.length < 8) e.password = 'At least 8 characters required';
  else if (!/\d/.test(password)) e.password = 'Must contain at least one number';
  return e;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{msg}</p>;
}

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const clearErr = (field: string) => setErrs((p) => { const n = { ...p }; delete n[field]; return n; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    const v = validate(name, email, password);
    setErrs(v);
    if (Object.keys(v).length) return;

    setIsLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      router.push('/dashboard');
    } catch (err: any) {
      const msg: string = err.message || '';
      if (msg.includes('already registered') || msg.includes('already exists')) {
        setApiError('An account with this email already exists. Try signing in instead.');
      } else {
        setApiError(msg || 'Sign up failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : !/\d/.test(password) ? 2 : password.length < 12 ? 3 : 4;
  const strengthColors = ['', '#ef4444', '#f97316', '#FFC078', '#10b981'];
  const strengthLabels = ['', 'Too short', 'Add a number', 'Good', 'Strong'];

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #0A0042 0%, #002E4D 60%, #0E1628 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10"><Image src="/logo.png" alt="Flair" fill className="object-contain" /></div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Flair Technologies</p>
            <p className="text-base font-black text-white">Teams</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-black text-white leading-tight mb-4">Join your team's workspace.</h1>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            Real-time channels, departmental sub-groups, file sharing, and @mentions — built for Flair Technologies.
          </p>
        </div>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Flair Technologies</p>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="relative w-8 h-8"><Image src="/logo.png" alt="Flair" fill className="object-contain" /></div>
            <span className="font-black text-lg">Flair Teams</span>
          </div>

          <h2 className="text-3xl font-black mb-1">Create account</h2>
          <p className="text-muted-foreground text-sm mb-8">Set up your Flair Teams access</p>

          {apiError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span>{apiError}</span>
                {apiError.includes('already exists') && (
                  <Link href="/signin" className="block mt-1 font-bold underline">Go to sign in →</Link>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="signup-name" className="text-sm font-semibold">Full name</label>
              <Input
                id="signup-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => { setName(e.target.value); clearErr('name'); }}
                className={`h-11 mt-1.5 ${errs.name ? 'border-destructive' : ''}`}
                disabled={isLoading}
              />
              <FieldError msg={errs.name} />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="signup-email" className="text-sm font-semibold">Email address</label>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                placeholder="you@flairtechlabs.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearErr('email'); }}
                className={`h-11 mt-1.5 ${errs.email ? 'border-destructive' : ''}`}
                disabled={isLoading}
              />
              <FieldError msg={errs.email} />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="signup-password" className="text-sm font-semibold">Password</label>
              <div className="relative mt-1.5">
                <Input
                  id="signup-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearErr('password'); }}
                  className={`h-11 pr-11 ${errs.password ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} className="flex-1 h-1 rounded-full transition-colors"
                        style={{ backgroundColor: strength >= s ? strengthColors[strength] : '#e2e8f0' }} />
                    ))}
                  </div>
                  <p className="text-[11px]" style={{ color: strengthColors[strength] }}>{strengthLabels[strength]}</p>
                </div>
              )}
              <FieldError msg={errs.password} />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-bold text-sm"
              disabled={isLoading}
              style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account →'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link href="/signin" className="font-semibold text-foreground hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
