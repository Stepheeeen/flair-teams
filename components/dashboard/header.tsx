'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CommandPalette } from '@/components/ui/command-palette';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sun, Moon, LogOut, User, ChevronDown, Bell, Search,
  Hash, Folder, Building2, MessageSquare, Check, CheckCheck,
  Plus, PlusCircle, LayoutDashboard, Bot,
} from 'lucide-react';
import { isManagerOrAbove } from '@/lib/client-roles';
import { useAssistant } from '@/components/ai/assistant-context';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CreateProjectDialog } from './create-project-dialog';
import { CreateTaskDialog } from './create-task-dialog';
import { CreateTeamDialog } from './create-team-dialog';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  actor_name?: string;
  createdAt: string;
}

const NOTIF_TYPE_ICONS: Record<string, React.ReactNode> = {
  mention: <MessageSquare className="w-3.5 h-3.5" />,
  team_invite: <Building2 className="w-3.5 h-3.5" />,
  task_assigned: <Folder className="w-3.5 h-3.5" />,
  channel_message: <Hash className="w-3.5 h-3.5" />,
};

export function Header() {
  const { user, signOut, authHeaders, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { isOpen, setIsOpen } = useAssistant();

  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeDialog, setActiveDialog] = useState<'project' | 'team' | 'task' | null>(null);

  // Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=20', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch { /* silent */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll notifications every 30s
      const interval = setInterval(fetchNotifications, 30_000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PUT', headers: authHeaders() });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH', headers: authHeaders() });
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/signin');
  };

  const getPageTitle = () => {
    const p = pathname || '';
    if (p === '/dashboard') return 'Overview';
    if (p.startsWith('/teams/')) return 'Team Space';
    if (p.startsWith('/projects/')) return 'Project Workspace';
    if (p.startsWith('/groups/')) return 'Channel';
    if (p.startsWith('/dm')) return 'Messages';
    if (p.startsWith('/members')) return 'Directory';
    if (p.startsWith('/profile')) return 'My Account';
    return 'Flair Teams';
  };

  return (
    <>
       <header className="h-14 border-b border-border/50 bg-card/60 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-20 transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Logo (mobile only) */}
          <Link href="/dashboard" className="lg:hidden flex items-center gap-2 group">
            <div className="relative w-6 h-6 flex-shrink-0 transition-transform group-hover:scale-110">
              <Image src="/logo.png" alt="Flair Teams" fill className="object-contain" priority />
            </div>
            <div className="h-4 w-px bg-border/50 mx-1 hidden xs:block" />
          </Link>
          {/* Page title */}
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-foreground/90">{getPageTitle()}</span>
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Create Button (Desktop) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="hidden md:flex gap-2 h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full transition-all shadow-sm hover:shadow-md">
                <Plus className="w-3.5 h-3.5" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setActiveDialog('task')} className="gap-2 cursor-pointer">
                <Check className="w-4 h-4" /> New Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveDialog('project')} className="gap-2 cursor-pointer">
                <Folder className="w-4 h-4" /> New Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveDialog('team')} className="gap-2 cursor-pointer">
                <Building2 className="w-4 h-4" /> New Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Create Button (Mobile) */}
          <Button variant="ghost" size="icon" className="w-8 h-8 md:hidden text-primary" onClick={() => setActiveDialog('task')}>
            <PlusCircle className="w-5 h-5" />
          </Button>

          <div className="w-px h-4 bg-border/50 mx-1 hidden sm:block" />

          {/* Search trigger */}
          <Button variant="ghost" size="sm"
            className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 text-xs h-8 px-3 rounded-full transition-all border border-transparent hover:border-border/50"
            onClick={() => setCmdOpen(true)}>
            <Search className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Search anything...</span>
            <span className="lg:hidden">Search</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted font-mono text-[10px] opacity-50">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 sm:hidden text-muted-foreground hover:text-foreground" onClick={() => setCmdOpen(true)}>
            <Search className="w-4 h-4" />
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground transition-colors rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* HR Assistant Toggle (Desktop navbar only) */}
          {isManagerOrAbove(user) && (
            <Button
              variant="ghost"
              size="icon"
              className={`w-8 h-8 rounded-full hidden lg:flex items-center justify-center transition-all ${
                isOpen
                  ? 'bg-primary/15 text-primary hover:bg-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
              onClick={() => setIsOpen(!isOpen)}
              title="HR Assistant"
            >
              <Bot className="w-4 h-4" />
            </Button>
          )}

          {/* Notification bell */}
          <Popover open={notifOpen} onOpenChange={(v) => { setNotifOpen(v); if (v) fetchNotifications(); }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground relative transition-colors rounded-full">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center animate-in zoom-in-50"
                    style={{ backgroundColor: '#FFC078', color: '#1B1C1B', border: '2px solid hsl(var(--card))' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden shadow-2xl border-border/40">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b border-border">
                <p className="text-sm font-bold">Notifications</p>
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary transition-colors" onClick={markAllRead}>
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-[28rem] overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 opacity-20">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">No new notifications</p>
                    <p className="text-xs text-muted-foreground/60 px-6 mt-1">We'll let you know when something important happens.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id}
                      onClick={() => { markOneRead(n._id); if (n.link) router.push(n.link); setNotifOpen(false); }}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-primary/5 transition-all border-b border-border/50 relative ${!n.read ? 'bg-primary/[0.02]' : ''}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${!n.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {NOTIF_TYPE_ICONS[n.type] || <Bell className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-tight ${!n.read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                        <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-border" />
                          {format(new Date(n.createdAt), 'dd MMM, HH:mm')}
                        </p>
                      </div>
                      {!n.read && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 bg-primary animate-pulse" />}
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 p-1 h-9 hover:bg-accent/50 rounded-full transition-all group">
                <div className="relative">
                  {user?.avatar_url ? (
                    <img src={(user.avatar_url.includes('/api/file') && token) ? `${user.avatar_url}&token=${token}` : user.avatar_url} alt={user?.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-border group-hover:ring-primary/50 transition-all" />
                  ) : (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                      {user?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border-border/40">
              <DropdownMenuLabel className="font-normal px-2 py-2">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold leading-none">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-sm"
                      style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>{user?.role}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem asChild className="gap-2 py-2 cursor-pointer rounded-md focus:bg-primary/5">
                <Link href="/profile">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Profile Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="gap-2 py-2 cursor-pointer rounded-md focus:bg-primary/5 lg:hidden">
                <Link href="/dashboard">
                  <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                  <span>Dashboard</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer rounded-md">
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* Action Dialogs */}
      {activeDialog === 'project' && (
        <CreateProjectDialog open={true} onOpenChange={(v) => !v && setActiveDialog(null)} />
      )}
      {activeDialog === 'team' && (
        <CreateTeamDialog open={true} onOpenChange={(v) => !v && setActiveDialog(null)} />
      )}
      {activeDialog === 'task' && (
        <CreateTaskDialog open={true} onOpenChange={(v) => !v && setActiveDialog(null)} />
      )}
    </>
  );
}
