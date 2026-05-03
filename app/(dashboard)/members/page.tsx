'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { InviteMemberDialog } from '@/components/members/invite-member-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  UserPlus, Search, MessageSquare, Briefcase, Shield, Loader2,
} from 'lucide-react';

interface Member {
  user_id: string;
  role: string;
  job_title: string;
  joined_at: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    job_title?: string;
  } | null;
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#FFC078',
  manager: '#3b82f6',
  member: '#6b7280',
};

function Avatar({ name, size = 10 }: { name: string; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm`}
      style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

export default function MembersPage() {
  const { user, fetcher } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);

  const canInvite =
    user?.role === 'admin' ||
    ['ceo', 'cto'].some((t) => user?.job_title?.toLowerCase().includes(t));

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetcher('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
        // Get a teamId for invite dialog
        const tr = await fetcher('/api/teams');
        if (tr.ok) {
          const td = await tr.json();
          if (td.teams?.length) setTeamId(td.teams[0]._id);
        }
      }
    } catch { /* handled globally */ } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q) ||
      m.job_title?.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground">Members</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLoading ? '…' : `${members.length} people in your workspace`}
          </p>
        </div>
        {canInvite && teamId && (
          <Button
            onClick={() => setShowInvite(true)}
            className="gap-2 font-semibold"
            style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10"
        />
      </div>

      {/* Members grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">{search ? 'No results found' : 'No members yet'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => {
            const isMe = member.user_id === user?.id;
            const displayName = member.user?.name || member.user?.email || 'Unknown';
            const jobTitle = member.job_title || member.user?.job_title || '';

            return (
              <div
                key={member.user_id}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                {/* Top: avatar + name */}
                <div className="flex items-start gap-3 mb-3">
                  <Avatar name={displayName} size={10} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{displayName}</p>
                      {isMe && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">You</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                  </div>
                </div>

                {/* Job title */}
                {jobTitle && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <Briefcase className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{jobTitle}</p>
                  </div>
                )}

                {/* Role badge */}
                <div className="flex items-center gap-1.5 mb-4">
                  <Shield className="w-3 h-3 flex-shrink-0" style={{ color: ROLE_COLORS[member.role] }} />
                  <span
                    className="text-[11px] font-bold capitalize px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${ROLE_COLORS[member.role]}20`,
                      color: ROLE_COLORS[member.role],
                    }}
                  >
                    {member.role}
                  </span>
                </div>

                {/* Actions */}
                {!isMe && (
                  <Link href={`/dm/${member.user_id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Send Message
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      {teamId && (
        <InviteMemberDialog
          teamId={teamId}
          open={showInvite}
          onOpenChange={setShowInvite}
          onInvited={load}
        />
      )}
    </div>
  );
}
