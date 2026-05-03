'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Loader2, Mail, Briefcase, Shield } from 'lucide-react';

interface InviteMemberDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited?: () => void;
}

const ROLES = [
  { value: 'member', label: 'Member', desc: 'Can view and participate in channels' },
  { value: 'manager', label: 'Manager', desc: 'Can create channels and manage sub-groups' },
];

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />{msg}
    </p>
  );
}

export function InviteMemberDialog({ teamId, open, onOpenChange, onInvited }: InviteMemberDialogProps) {
  const { fetcher } = useAuth();
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [role, setRole] = useState<'member' | 'manager'>('member');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const reset = () => {
    setEmail(''); setJobTitle(''); setRole('member');
    setFieldErrors({}); setApiError(''); setSuccess('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Enter a valid email';
    if (!jobTitle.trim()) errs.jobTitle = 'Role / position is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(''); setSuccess('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setIsLoading(true);
    try {
      const res = await fetcher(`/api/teams/${teamId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role, job_title: jobTitle.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error || 'Failed to send invite');
        return;
      }
      setSuccess(`Invitation sent to ${email.trim()} ✓`);
      onInvited?.();
      setTimeout(() => { reset(); onOpenChange(false); }, 2000);
    } catch (err: any) {
      if (err.message !== 'Unauthorized') setApiError(err.message || 'Failed to send invite');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" style={{ color: '#FFC078' }} />
            Invite Member
          </DialogTitle>
          <DialogDescription>
            Send an email invitation. They'll receive a link to join the workspace.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}
          {/* Success */}
          {success && (
            <div className="p-3 rounded-lg text-sm font-medium text-center"
              style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
              {success}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="invite-email" className="text-sm font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Email address
            </label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@flairtechlabs.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: '' })); }}
              className={`mt-1.5 h-10 ${fieldErrors.email ? 'border-destructive' : ''}`}
              disabled={isLoading || !!success}
            />
            <FieldError msg={fieldErrors.email} />
          </div>

          {/* Job title / role in company */}
          <div>
            <label htmlFor="invite-job" className="text-sm font-semibold flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> Role / Position in company
            </label>
            <Input
              id="invite-job"
              placeholder="e.g. Frontend Developer, HR Manager, CEO"
              value={jobTitle}
              onChange={(e) => { setJobTitle(e.target.value); setFieldErrors((p) => ({ ...p, jobTitle: '' })); }}
              className={`mt-1.5 h-10 ${fieldErrors.jobTitle ? 'border-destructive' : ''}`}
              disabled={isLoading || !!success}
            />
            <FieldError msg={fieldErrors.jobTitle} />
          </div>

          {/* System role */}
          <div>
            <label className="text-sm font-semibold flex items-center gap-1.5 mb-2">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" /> Access level
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value as 'member' | 'manager')}
                  disabled={isLoading || !!success}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    role === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/30'
                  }`}
                >
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => { onOpenChange(false); reset(); }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 font-semibold"
              disabled={isLoading || !!success}
              style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending…</>
                : 'Send Invite →'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
