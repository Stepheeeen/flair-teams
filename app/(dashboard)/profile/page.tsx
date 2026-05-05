'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, User, Camera, Bell, Shield, PaintBucket } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function ProfilePage() {
  const { user, authHeaders, token } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [jobTitle, setJobTitle] = useState((user as any)?.job_title || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim(), job_title: jobTitle.trim(), avatar_url: avatarUrl }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('File must be smaller than 5MB');
    
    setIsUploading(true);
    try {
      // 1. Get signed URL
      const urlRes = await fetch('/api/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ filename: file.name, content_type: file.type, channel_type: 'profile', channel_id: user?.id || 'avatar' }),
      });
      if (!urlRes.ok) throw new Error('Failed to get upload URL');
      const { signed_url, path } = await urlRes.json();

      // 2. Upload to Supabase Storage
      const uploadRes = await fetch(signed_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed');

      // 3. Save the permanent proxy URL
      const secureUrl = `/api/file?path=${encodeURIComponent(path)}`;
      setAvatarUrl(secureUrl);
      
      // Auto-save the new avatar
      await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ avatar_url: secureUrl }),
      });
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto h-full overflow-hidden flex flex-col">
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-3xl font-black">Account & Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information and application preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 flex-shrink-0 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'profile' ? 'border-[#FFC078] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><User className="w-4 h-4" /> Profile</div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'settings' ? 'border-[#FFC078] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Preferences</div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pb-24 lg:pb-12">
        {activeTab === 'profile' && (
          <Card className="border-border shadow-sm max-w-2xl">
            <CardHeader>
              <CardTitle>Personal details</CardTitle>
              <CardDescription>Update your profile information visible to teammates</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Avatar Upload */}
              <div className="flex items-center gap-6 mb-8 p-4 rounded-xl border border-border bg-muted/20">
                <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
                  <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black overflow-hidden relative border-2 border-background shadow-md"
                    style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
                    {avatarUrl ? (
                      <Image src={(avatarUrl.includes('/api/file') && token) ? `${avatarUrl}&token=${token}` : avatarUrl} alt="Avatar" fill className="object-cover" />
                    ) : (
                      name.charAt(0).toUpperCase() || '?'
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      {isUploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                </div>
                <div>
                  <p className="font-bold text-lg">{name || user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <span className="inline-flex mt-1.5 items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                    {user?.role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label htmlFor="profile-name" className="text-sm font-semibold">Display name</label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      required
                      disabled={isSaving}
                      className="h-11 bg-muted/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="profile-job" className="text-sm font-semibold">Job title</label>
                    <Input
                      id="profile-job"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Senior Engineer"
                      disabled={isSaving}
                      className="h-11 bg-muted/30"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Email address</label>
                  <Input value={user?.email || ''} disabled className="h-11 bg-muted/50 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Email cannot be changed via the dashboard.</p>
                </div>

                <div className="pt-4 border-t border-border flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSaving || !name.trim()}
                    className="gap-2 shadow-sm font-bold"
                    style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === 'settings' && (
          <div className="grid gap-6 max-w-2xl">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-primary" /> Notifications</CardTitle>
                <CardDescription>Choose what you want to be notified about</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Direct Messages', desc: 'Get notified when someone sends you a message' },
                  { label: 'Mentions', desc: 'Get notified when someone @mentions you' },
                  { label: 'Channel Updates', desc: 'Get notified about all channel activities' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 cursor-pointer ${i < 2 ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                      <div className={`w-4 h-4 rounded-full bg-background transition-transform ${i < 2 ? 'translate-x-5' : ''}`} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2"><PaintBucket className="w-5 h-5 text-primary" /> Appearance</CardTitle>
                <CardDescription>Customize the look and feel of your workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Use the top navigation bar to toggle between Light and Dark mode globally.</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
