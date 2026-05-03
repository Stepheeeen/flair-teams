'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, User } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, authHeaders } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your personal information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
          <CardDescription>Update your name visible to teammates</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl border border-border bg-muted/30">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
              {name.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p className="font-bold">{name || user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="inline-flex mt-1 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>{user?.role}</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="profile-name" className="text-sm font-semibold">Display name</label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                disabled={isSaving}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Email</label>
              <Input value={user?.email || ''} disabled className="h-11 bg-muted/50" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
            </div>

            <Button
              type="submit"
              disabled={isSaving || !name.trim() || name === user?.name}
              className="gap-2"
              style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
