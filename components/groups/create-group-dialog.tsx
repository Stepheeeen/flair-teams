'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Hash, Users, Megaphone, Lock, Loader2 } from 'lucide-react';

interface CreateGroupDialogProps {
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (group: any) => void;
}

const GROUP_TYPES = [
  { value: 'general', label: 'General', desc: 'Open conversation for everyone', icon: Hash },
  { value: 'department', label: 'Department', desc: 'Focused team or department channel', icon: Users },
  { value: 'announcement', label: 'Announcement', desc: 'Broadcast-only (admins/managers post)', icon: Megaphone },
];

const COLORS = ['#FFC078', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#0A0042'];

export function CreateGroupDialog({ teamId, open, onOpenChange, onCreated }: CreateGroupDialogProps) {
  const { authHeaders } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('general');
  const [isPrivate, setIsPrivate] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setName(''); setDescription(''); setType('general');
    setIsPrivate(false); setColor(COLORS[0]); setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ team_id: teamId, name, description, type, is_private: isPrivate, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      onCreated(data.group);
      reset();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Group</DialogTitle>
          <DialogDescription>Create a communication channel for your team</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Channel name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span>
              <Input
                placeholder="e.g. engineering, general"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                required
                disabled={isLoading}
                className="pl-7"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="What's this channel for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Type</label>
            <div className="grid grid-cols-1 gap-2">
              {GROUP_TYPES.map(({ value, label, desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setType(value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    type === value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80 hover:bg-muted/30'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${type === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  {type === value && (
                    <div className="ml-auto w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: '#FFC078' }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Private toggle */}
          <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded"
            />
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Private group
              </p>
              <p className="text-xs text-muted-foreground">Only invited members can see and join</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !name}
              style={{ background: 'linear-gradient(135deg, #FFC078 0%, #DA9646 100%)', color: '#1B1C1B' }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
