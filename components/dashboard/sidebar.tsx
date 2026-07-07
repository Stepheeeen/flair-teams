'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Hash, Users, Megaphone, Lock,
  Plus, MessageSquare, ChevronDown, ChevronRight, MessageCircle,
  MoreHorizontal, X, User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateGroupDialog } from '@/components/groups/create-group-dialog';
import { isManagerOrAbove } from '@/lib/client-roles';

interface Group {
  _id: string;
  name: string;
  description?: string;
  type: 'general' | 'department' | 'announcement';
  is_private: boolean;
  color: string;
  team_id: string;
  unread_count?: number;
}

function GroupIcon({ type, is_private }: { type: string; is_private: boolean }) {
  if (is_private) return <Lock className="w-3.5 h-3.5 flex-shrink-0" />;
  if (type === 'announcement') return <Megaphone className="w-3.5 h-3.5 flex-shrink-0" />;
  if (type === 'department') return <Users className="w-3.5 h-3.5 flex-shrink-0" />;
  return <Hash className="w-3.5 h-3.5 flex-shrink-0" />;
}

// ─── Desktop sidebar nav content ────────────────────────────────────────────
function DesktopSidebarContent({
  user, pathname, groups, groupsOpen, setGroupsOpen,
  defaultTeamId, showCreateGroup, setShowCreateGroup,
  dmUnreadCount,
}: {
  user: any; pathname: string; groups: Group[];
  groupsOpen: boolean; setGroupsOpen: (v: boolean) => void;
  defaultTeamId: string | null; showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void;
  dmUnreadCount: number;
}) {
  const { token } = useAuth();
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  const navItem = (href: string, label: string, icon: React.ReactNode, exact = false, badge?: number) => {
    const active = isActive(href, exact);
    return (
      <Link href={href} className="block">
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          active
            ? 'bg-sidebar-primary/15 text-sidebar-primary'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
        }`}>
          {icon}
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-auto"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2.5">
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
        {navItem('/dm', 'Direct Messages', <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />, false, dmUnreadCount)}

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
            {isManagerOrAbove(user) && defaultTeamId && (
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
                  {isManagerOrAbove(user) && defaultTeamId && (
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
                  <Link key={group._id} href={`/groups/${group._id}`} className="block">
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive(`/groups/${group._id}`)
                        ? 'bg-sidebar-primary/15 text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    }`}>
                      <span className="text-sidebar-foreground/50">
                        <GroupIcon type={group.type} is_private={group.is_private} />
                      </span>
                      <span className="truncate flex-1">{group.name}</span>
                      {group.unread_count !== undefined && group.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-auto"
                          style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                          {group.unread_count > 9 ? '9+' : group.unread_count}
                        </span>
                      )}
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
        <Link href="/profile">
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer">
            {user?.avatar_url ? (
              <img src={(user.avatar_url.includes('/api/file') && token) ? `${user.avatar_url}&token=${token}` : user.avatar_url} alt={user?.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-sidebar-border" />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}
              >
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
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

// ─── Mobile bottom app bar ───────────────────────────────────────────────────
function BottomAppBar({
  pathname, groups, user, defaultTeamId, showCreateGroup, setShowCreateGroup, dmUnreadCount,
}: {
  pathname: string;
  groups: Group[];
  user: any;
  defaultTeamId: string | null;
  showCreateGroup: boolean;
  setShowCreateGroup: (v: boolean) => void;
  dmUnreadCount: number;
}) {
  const { token } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

  // Check if current path is a channel (for "Channels" tab active state)
  const channelActive = pathname.startsWith('/groups');
  const channelUnreadCount = groups.reduce((acc, g) => acc + (g.unread_count || 0), 0);

  return (
    <>
      {/* Bottom app bar */}
      <nav
        className="bottom-app-bar lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-md"
      >
        <div className="flex items-stretch h-16">
          {/* Home */}
          <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ color: isActive('/dashboard', true) ? '#FFC078' : undefined }}>
            <LayoutDashboard className={`w-5 h-5 ${isActive('/dashboard', true) ? 'text-[#FFC078]' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] font-semibold tracking-wide ${isActive('/dashboard', true) ? 'text-[#FFC078]' : 'text-muted-foreground'}`}>Home</span>
          </Link>

          {/* Members */}
          <Link href="/members" className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors">
            <Users className={`w-5 h-5 ${isActive('/members') ? 'text-[#FFC078]' : 'text-muted-foreground'}`} />
            <span className={`text-[10px] font-semibold tracking-wide ${isActive('/members') ? 'text-[#FFC078]' : 'text-muted-foreground'}`}>Members</span>
          </Link>

          {/* Direct Messages */}
          <Link href="/dm" className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors">
            <div className="relative">
              <MessageCircle className={`w-5 h-5 ${isActive('/dm') ? 'text-[#FFC078]' : 'text-muted-foreground'}`} />
              {dmUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                  {dmUnreadCount > 9 ? '9+' : dmUnreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide ${isActive('/dm') ? 'text-[#FFC078]' : 'text-muted-foreground'}`}>DMs</span>
          </Link>

          {/* Channels / More */}
          <button
            className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
            onClick={() => setMoreOpen(true)}
          >
            <div className="relative">
              <MessageSquare className={`w-5 h-5 ${channelActive ? 'text-[#FFC078]' : 'text-muted-foreground'}`} />
              {channelUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                  {channelUnreadCount > 9 ? '9+' : channelUnreadCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold tracking-wide ${channelActive ? 'text-[#FFC078]' : 'text-muted-foreground'}`}>Channels</span>
          </button>

          {/* Profile */}
          <Link href="/profile" className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors">
            {user?.avatar_url ? (
              <img src={(user.avatar_url.includes('/api/file') && token) ? `${user.avatar_url}&token=${token}` : user.avatar_url} alt={user?.name} className={`w-6 h-6 rounded-full object-cover flex-shrink-0 ${isActive('/profile') ? 'ring-2 ring-[#FFC078]' : ''}`} />
            ) : (
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${isActive('/profile') ? 'ring-2' : ''}`}
                style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}
              >
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <span className={`text-[10px] font-semibold tracking-wide ${isActive('/profile') ? 'text-[#FFC078]' : 'text-muted-foreground'}`}>Profile</span>
          </Link>
        </div>
      </nav>

      {/* Channels sheet — slides up from bottom */}
      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="relative z-50 bg-card rounded-t-2xl border-t border-border shadow-2xl max-h-[70vh] flex flex-col">
            {/* Sheet handle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: '#FFC078' }} />
                <p className="font-bold text-sm">Channels</p>
              </div>
              <div className="flex items-center gap-2">
                {isManagerOrAbove(user) && defaultTeamId && (
                  <button
                    onClick={() => { setShowCreateGroup(true); setMoreOpen(false); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-primary"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                )}
                <button
                  onClick={() => setMoreOpen(false)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Channel list */}
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {groups.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No channels yet</p>
                  {isManagerOrAbove(user) && defaultTeamId && (
                    <button
                      onClick={() => { setShowCreateGroup(true); setMoreOpen(false); }}
                      className="mt-2 text-sm font-semibold text-primary hover:underline"
                    >
                      Create your first channel
                    </button>
                  )}
                </div>
              ) : (
                groups.map((group) => (
                  <Link
                    key={group._id}
                    href={`/groups/${group._id}`}
                    onClick={() => setMoreOpen(false)}
                    className="block"
                  >
                    <div className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                      isActive(`/groups/${group._id}`)
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${group.color || '#FFC078'}, ${group.color ? group.color + 'CC' : '#DA9646'})`,
                          color: '#1B1C1B',
                        }}
                      >
                        <GroupIcon type={group.type} is_private={group.is_private} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">#{group.name}</p>
                        {group.description && (
                          <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                        )}
                      </div>
                      {group.unread_count !== undefined && group.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ml-2"
                          style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                          {group.unread_count > 9 ? '9+' : group.unread_count}
                        </span>
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Safe area spacer */}
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Sidebar export ─────────────────────────────────────────────────────
export function Sidebar() {
  const { user, fetcher, token } = useAuth();
  const pathname = usePathname();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);

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
    if (user) {
      fetchGroups();
      fetcher('/api/dm').then(res => res.ok ? res.json() : null).then(data => {
        if (data?.conversations) {
          const count = data.conversations.reduce((acc: number, c: any) => acc + (c.unread_count || 0), 0);
          setDmUnreadCount(count);
        }
      }).catch(() => {});
    }
  }, [user, fetchGroups, fetcher, pathname]);

  const sharedProps = {
    user, pathname, groups, groupsOpen, setGroupsOpen,
    defaultTeamId, showCreateGroup, setShowCreateGroup, dmUnreadCount,
  };

  return (
    <>
      {/* ── Desktop sidebar (visible ≥ lg) ── */}
      <aside className="hidden lg:flex w-60 bg-sidebar border-r border-sidebar-border flex-col h-full flex-shrink-0">
        <DesktopSidebarContent {...sharedProps} />
      </aside>

      {/* ── Mobile bottom app bar (visible < lg) ── */}
      <BottomAppBar {...sharedProps} />

      {/* Create group dialog (shared) */}
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
