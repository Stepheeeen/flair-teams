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
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

  const [cmdOpen, setCmdOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
    if (pathname === '/dashboard') return 'Dashboard';
    if (pathname.startsWith('/teams/')) return 'Team';
    if (pathname.startsWith('/projects/')) return 'Project';
    if (pathname.startsWith('/groups/')) return 'Channel';
    if (pathname.startsWith('/profile')) return 'Profile';
    return 'Flair Teams';
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm px-4 lg:px-6 flex items-center justify-between flex-shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* Logo (mobile only) */}
          <div className="lg:hidden relative w-5 h-5 flex-shrink-0">
            <Image src="/logo.png" alt="Flair Teams" fill className="object-contain" priority />
          </div>
          {/* Page title */}
          <span className="text-sm font-semibold">{getPageTitle()}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {/* Search trigger */}
          <Button variant="ghost" size="sm"
            className="hidden sm:flex gap-2 text-muted-foreground hover:text-foreground text-xs h-8 px-3"
            onClick={() => setCmdOpen(true)}>
            <Search className="w-3.5 h-3.5" />
            Search
            <kbd className="ml-1 px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">⌘K</kbd>
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8 sm:hidden text-muted-foreground" onClick={() => setCmdOpen(true)}>
            <Search className="w-4 h-4" />
          </Button>

          {/* Theme toggle */}
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Notification bell */}
          <Popover open={notifOpen} onOpenChange={(v) => { setNotifOpen(v); if (v) fetchNotifications(); }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground relative">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                    style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold">Notifications</p>
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-muted-foreground" onClick={markAllRead}>
                    <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                  </Button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n._id}
                      onClick={() => { markOneRead(n._id); if (n.link) router.push(n.link); setNotifOpen(false); }}
                      className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 ${!n.read ? 'bg-primary/5' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'text-primary' : 'text-muted-foreground'}`}
                        style={!n.read ? { backgroundColor: 'rgba(255,192,120,0.15)' } : {}}>
                        {NOTIF_TYPE_ICONS[n.type] || <Bell className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{format(new Date(n.createdAt), 'dd MMM, HH:mm')}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#FFC078' }} />}
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2 h-8 hover:bg-accent/10">
                {user?.avatar_url ? (
                  <img src={(user.avatar_url.includes('/api/file') && token) ? `${user.avatar_url}&token=${token}` : user.avatar_url} alt={user?.name} className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-border" />
                ) : (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                    {user?.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-sm font-medium hidden sm:block max-w-[120px] truncate">{user?.name}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <span className="inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide w-fit"
                    style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>{user?.role}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                <Link href="/profile">
                  <User className="w-4 h-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
