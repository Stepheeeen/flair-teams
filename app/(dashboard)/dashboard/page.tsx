'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  Hash, Users, Megaphone, Lock, Plus, MessageSquare, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { isManagerOrAbove } from '@/lib/client-roles';
import { format } from 'date-fns';

interface Group {
  _id: string;
  name: string;
  description?: string;
  type: 'general' | 'department' | 'announcement';
  is_private: boolean;
  color: string;
  team_id: string;
  createdAt: string;
}

function ChannelTypeIcon({ type, is_private }: { type: string; is_private: boolean }) {
  if (is_private) return <Lock className="w-5 h-5" />;
  if (type === 'announcement') return <Megaphone className="w-5 h-5" />;
  if (type === 'department') return <Users className="w-5 h-5" />;
  return <Hash className="w-5 h-5" />;
}

function ChannelTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    general: 'General',
    department: 'Department',
    announcement: 'Announcement',
  };
  const colors: Record<string, string> = {
    general: '#3b82f6',
    department: '#10b981',
    announcement: '#FFC078',
  };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: `${colors[type] || '#FFC078'}20`,
        color: colors[type] || '#FFC078',
      }}
    >
      {labels[type] || type}
    </span>
  );
}

export default function DashboardPage() {
  const { user, fetcher } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetcher('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
        if (data.groups.length > 0) setDefaultTeamId(data.groups[0].team_id);
        else {
          const tr = await fetcher('/api/teams');
          if (tr.ok) {
            const td = await tr.json();
            if (td.teams?.length) setDefaultTeamId(td.teams[0]._id);
          }
        }
      }
    } catch { /* handled globally */ } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const canCreate = isManagerOrAbove(user);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 max-w-5xl mx-auto pb-24 lg:pb-8">
        {/* Welcome */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Here's what's happening across your channels today.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Channels', value: groups.length, color: '#FFC078' },
            {
              label: 'Departments',
              value: groups.filter((g) => g.type === 'department').length,
              color: '#10b981',
            },
            {
              label: 'Announcements',
              value: groups.filter((g) => g.type === 'announcement').length,
              color: '#3b82f6',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4">
              <div className="w-8 h-1 rounded-full mb-3" style={{ backgroundColor: color }} />
              <p className="text-3xl font-black text-foreground">{isLoading ? '—' : value}</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Channel grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5" style={{ color: '#FFC078' }} />
            Channels
          </h2>
          {canCreate && defaultTeamId && (
            <Button
              size="sm"
              className="gap-2 text-xs"
              onClick={() => setShowCreateGroup(true)}
              style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Channel
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-muted mb-3" />
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-muted/20">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}
            >
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-lg font-bold text-foreground mb-1">No channels yet</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Channels are where your team communicates. Create your first one to get started.
            </p>
            {canCreate && defaultTeamId && (
              <Button
                onClick={() => setShowCreateGroup(true)}
                style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Channel
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Link key={group._id} href={`/groups/${group._id}`}>
                <div className="group bg-card border border-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer h-full flex flex-col">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform group-hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, ${group.color || '#FFC078'}, ${group.color ? group.color + 'CC' : '#DA9646'})`,
                      color: '#1B1C1B',
                    }}
                  >
                    <ChannelTypeIcon type={group.type} is_private={group.is_private} />
                  </div>

                  {/* Name + badge */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-foreground truncate">#{group.name}</h3>
                    <ChannelTypeBadge type={group.type} />
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2 flex-1 mb-3">
                    {group.description || 'No description'}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(group.createdAt), 'dd MMM yyyy')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {defaultTeamId && (
          <CreateGroupDialog
            teamId={defaultTeamId}
            open={showCreateGroup}
            onOpenChange={setShowCreateGroup}
            onCreated={(g) => {
              setGroups((prev) => [...prev, g]);
              setShowCreateGroup(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
