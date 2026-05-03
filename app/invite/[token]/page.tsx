'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, Users, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface InviteInfo {
  email: string;
  role: string;
  team: { _id: string; name: string; description?: string };
  expires_at: string;
}

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading, authHeaders } = useAuth();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Load invite details
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInvite(data.invite);
      } catch (err: any) {
        setInviteError(err.message);
      } finally {
        setIsLoadingInvite(false);
      }
    };

    if (token) fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      // Redirect to signup with the invite token as a return URL
      router.push(`/signup?invite=${token}&email=${encodeURIComponent(invite?.email || '')}`);
      return;
    }

    setIsAccepting(true);
    setAcceptError(null);

    try {
      const res = await fetch(`/api/invite/${token}`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAccepted(true);
      setTimeout(() => router.push('/dashboard'), 2000);
    } catch (err: any) {
      setAcceptError(err.message);
    } finally {
      setIsAccepting(false);
    }
  };

  const roleLabel = (role: string) =>
    role === 'manager' ? 'Manager' : 'Member';

  if (isLoadingInvite || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <h2 className="text-xl font-bold text-center">Invite Unavailable</h2>
            <p className="text-muted-foreground text-center text-sm">{inviteError}</p>
            <Button asChild variant="outline">
              <Link href="/">Go Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-10">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <h2 className="text-xl font-bold text-center">You've joined the team!</h2>
            <p className="text-muted-foreground text-center text-sm">
              Welcome to <strong>{invite?.team.name}</strong>. Redirecting you now...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Team Invitation</CardTitle>
          <CardDescription>You've been invited to join a team on Flair Teams</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Team</span>
              <span className="font-semibold">{invite?.team.name}</span>
            </div>
            {invite?.team.description && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">About</span>
                <span className="text-right max-w-[200px]">{invite.team.description}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your role</span>
              <span className="font-semibold capitalize">{roleLabel(invite?.role || 'member')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Invited email</span>
              <span className="font-medium">{invite?.email}</span>
            </div>
            <div className="flex items-center gap-1 justify-between text-sm">
              <span className="text-muted-foreground">Expires</span>
              <span className="flex items-center gap-1 text-amber-600">
                <Clock className="w-3 h-3" />
                {invite?.expires_at
                  ? new Date(invite.expires_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>

          {acceptError && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm text-center">
              {acceptError}
            </div>
          )}

          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account with <strong>{invite?.email}</strong> to accept this invitation.
              </p>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleAccept}
                >
                  Sign Up & Accept
                </Button>
                <Button variant="outline" asChild className="flex-1">
                  <Link href={`/signin?invite=${token}`}>Sign In</Link>
                </Button>
              </div>
            </div>
          ) : user.email !== invite?.email ? (
            <div className="space-y-3">
              <p className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-lg">
                You are signed in as <strong>{user.email}</strong>, but this invite is for <strong>{invite?.email}</strong>.
                Please sign in with the correct account.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/signin?invite=${token}`}>Sign in with correct account</Link>
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={isAccepting}
            >
              {isAccepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Invitation
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
