'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Hash, Users, Megaphone, Lock,
  Plus, MessageSquare, ChevronDown, ChevronRight, MessageCircle, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';

interface Group {
  _id: string;
  name: string;
  description?: string;
  type: 'general' | 'department' | 'announcement';
  is_private: boolean;
  color: string;
  team_id: string;
}

function GroupIcon({ type, is_private }: { type: string; is_private: boolean }) {
  if (is_private) return <Lock className="w-3.5 h-3.5 flex-shrink-0" />;
  if (type === 'announcement') return <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />;
  if (type === 'department') return <Users className="w-3.5 h-3.5 flex-shrink-0" />;
  return <Hash className="w-3.5 h-3.5 flex-shrink-0" />;
}

// Shared sidebar content used in both mobile drawer and desktop sidebar
function SidebarContent({
  user, pathname, groups, groupsOpen, setGroupsOpen,
  defaultTeamId, showCreateGroup, setShowCreateGroup, onNavigate,
}: {
  user: any; pathname: string; groups: Group[];
  groupsOpen: boolean; setGroupsOpen: (v: boolean) => void;
  defaultTeamId: string | null; showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void; onNavigate?: () => void;
}) {
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const navItem = (href: string, label: string, icon: React.ReactNode, exact = false) => {
    const active = isActive(href, exact);
    return (
      <Link href={href} className="block" onClick={onNavigate}>
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? 'bg-sidebar-primary/15 text-sidebar-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}>
          {icon}
          <span className="truncate">{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="relative w-8 h-8 flex-shrink-0">
            <Image src="/logo.png" alt="Flair Technologies" fill className="object-contain" priority />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] font-bold text-sidebar-foreground/40 uppercase tracking-widest">
              Flair Technologies
            </p>
            <p className="text-sm font-extrabold text-sidebar-foreground leading-tight">Teams</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
        {navItem('/dashboard', 'Dashboard', <LayoutDashboard className="w-3.5 h-3.5 flex-shrink-0" />, true)}
        {navItem('/members', 'Members', <Users className="w-3.5 h-3.5 flex-shrink-0" />)}
        {navItem('/dm', 'Direct Messages', <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />)}

        {/* Channels section */}
        <div className="pt-3">
          <div className="flex items-center justify-between px-3 py-1.5">
            <button
              onClick={() => setGroupsOpen(!groupsOpen)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-sidebar-foreground/40 hover:text-sidebar-foreground/60 transition-colors"
            >
              {groupsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <MessageSquare className="w-3 h-3" />
              Channels
            </button>
            {(user?.role === 'admin' || user?.role === 'manager') && defaultTeamId && (
              <Button
                size="icon"
                variant="ghost"
                className="w-4 h-4 text-sidebar-foreground/40 hover:text-sidebar-foreground"
                onClick={() => setShowCreateGroup(true)}
                title="New channel"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>

          {groupsOpen && (
            <div className="mt-1 space-y-0.5">
              {groups.length === 0 ? (
                <div className="px-3 py-3 text-center">
                  <p className="text-xs text-sidebar-foreground/30 italic">No channels yet</p>
                  {(user?.role === 'admin' || user?.role === 'manager') && defaultTeamId && (
                    <button
                      onClick={() => setShowCreateGroup(true)}
                      className="mt-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Create your first channel
                    </button>
                  )}
                </div>
              ) : (
                groups.map((group) => (
                  <Link key={group._id} href={`/groups/${group._id}`} className="block" onClick={onNavigate}>
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(`/groups/${group._id}`)
                        ? 'bg-sidebar-primary/15 text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}>
                      <span className="text-sidebar-foreground/50">
                        <GroupIcon type={group.type} is_private={group.is_private} />
                      </span>
                      <span className="truncate">{group.name}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}
        </div>
      </nav>

      {/* User footer */}
      <div className="p-2 border-t border-sidebar-border">
        <Link href="/profile" onClick={onNavigate}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}
            >
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name}</p>
              <p className="text-[10px] text-sidebar-foreground/40 capitalize">{user?.role}</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { user, fetcher } = useAuth();
  const pathname = usePathname();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetcher('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
        if (data.groups.length > 0) {
          setDefaultTeamId(data.groups[0].team_id);
        } else {
          const tr = await fetcher('/api/teams');
          if (tr.ok) {
            const td = await tr.json();
            if (td.teams?.length) setDefaultTeamId(td.teams[0]._id);
          }
        }
      }
    } catch { /* 401 handled globally */ }
  }, [fetcher]);

  useEffect(() => {
    if (user) fetchGroups();
  }, [user, fetchGroups]);

  const sharedProps = {
    user, pathname, groups, groupsOpen, setGroupsOpen,
    defaultTeamId, showCreateGroup, setShowCreateGroup,
  };

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ lg) ── */}
      <aside className="hidden lg:flex w-60 bg-sidebar border-r border-sidebar-border flex-col h-screen flex-shrink-0">
        <SidebarContent {...sharedProps} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Drawer panel */}
          <aside className="relative z-50 w-72 max-w-[85vw] bg-sidebar border-r border-sidebar-border flex flex-col h-full shadow-2xl">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent {...sharedProps} onNavigate={onClose} />
          </aside>
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
    </>
  );
}
