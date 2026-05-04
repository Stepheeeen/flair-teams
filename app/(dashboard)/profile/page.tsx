'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Camera, Bell, Lock, LogOut, Trash2, Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import Image from 'next/image';

type Tab = 'profile' | 'notifications' | 'security';

export default function ProfilePage() {
  const { user, authHeaders, signOut, fetcher } = useAuth();
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>('profile');

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  useEffect(() => {
    // Load extended profile
    fetcher('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        setName(d.user.name || '');
        setJobTitle(d.user.job_title || '');
        setAvatarUrl(d.user.avatar_url || '');
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }

    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { Authorization: authHeaders().Authorization },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setAvatarUrl(data.avatar_url);
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetcher('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), job_title: jobTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return; }
    if (newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setIsChangingPass(true);
    try {
      const res = await fetcher('/api/auth/password', {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPass, new_password: newPass }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      toast.success('Password changed successfully');
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPass(false);
    }
  };

  const initials = name.charAt(0).toUpperCase() || '?';

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <Camera className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account and preferences</p>
      </div>

      {/* Avatar hero */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-2xl border border-border bg-card">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden">
            {avatarUrl ? (
              <Image src={avatarUrl} alt={name} width={64} height={64} className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-black"
                style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
                {initials}
              </div>
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-background flex items-center justify-center"
            style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}
            title="Change photo"
          >
            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{name || user?.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>{user?.role}</span>
            {jobTitle && <span className="text-xs text-muted-foreground truncate">{jobTitle}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-colors ${
              tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Display name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required disabled={isSaving} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Job title</label>
            <Input value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Senior Engineer" disabled={isSaving} className="h-11" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Email</label>
            <Input value={user?.email || ''} disabled className="h-11 bg-muted/50" />
            <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
          </div>
          <Button type="submit" disabled={isSaving || !name.trim()} className="gap-2 w-full sm:w-auto"
            style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </Button>
        </form>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div>
              <p className="font-semibold text-sm">Appearance</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
            </div>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
          <div className="p-4 rounded-xl border border-border bg-card text-center text-sm text-muted-foreground">
            Notification preferences coming soon.
          </div>
        </div>
      )}

      {/* Security Tab */}
      {tab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handleChangePassword} className="space-y-4 p-4 rounded-xl border border-border bg-card">
            <p className="font-bold text-sm">Change password</p>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Current password</label>
              <Input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">New password</label>
              <Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} required className="h-10" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Confirm new password</label>
              <Input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required className="h-10" />
            </div>
            <Button type="submit" disabled={isChangingPass || !currentPass || !newPass} size="sm" className="gap-2">
              {isChangingPass ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Update password
            </Button>
          </form>

          <div className="space-y-3">
            <button
              onClick={async () => { await signOut(); }}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">Sign out</p>
                <p className="text-xs text-muted-foreground">Sign out of your account on this device</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
