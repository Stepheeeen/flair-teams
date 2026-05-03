'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface CreateSubGroupDialogProps {
  groupId: string;
  groupName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (subgroup: any) => void;
}

export function CreateSubGroupDialog({
  groupId, groupName, open, onOpenChange, onCreated
}: CreateSubGroupDialogProps) {
  const { authHeaders } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setName(''); setDescription(''); setError(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/subgroups`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create sub-group');
      onCreated(data.subgroup);
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create Sub-Group</DialogTitle>
          <DialogDescription>
            Add a focused sub-channel under <strong>#{groupName}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Sub-group name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">›</span>
              <Input
                placeholder="e.g. frontend, backend, ux"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                required
                disabled={isLoading}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Purpose <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="What does this sub-group focus on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !name}
              style={{ background: 'linear-gradient(135deg, #FFC078 0%, #DA9646 100%)', color: '#1B1C1B' }}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Sub-Group'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
