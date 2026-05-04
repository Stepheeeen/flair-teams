'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Trash2, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface ManageChannelDialogProps {
  channelType: 'group' | 'subgroup';
  channelId: string;
  channelInfo: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ManageChannelDialog({
  channelType,
  channelId,
  channelInfo,
  open,
  onOpenChange,
  onUpdate
}: ManageChannelDialogProps) {
  const { authHeaders, user } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState(channelInfo.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(channelInfo.name);
      if (channelInfo.is_private) {
        setSelectedMembers(channelInfo.members || []);
        loadMembers();
      }
    }
  }, [open, channelInfo]);

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch('/api/members', { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const endpoint = channelType === 'group' 
    ? `/api/groups/${channelId}` 
    : `/api/subgroups/${channelId}`;

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const bodyPayload: any = { name };
      if (channelInfo.is_private) {
        bodyPayload.members = selectedMembers;
      }
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(bodyPayload),
      });
      if (res.ok) {
        toast.success(`${channelType === 'group' ? 'Group' : 'Sub-group'} renamed successfully`);
        onUpdate();
        onOpenChange(false);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to rename');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        toast.success(`${channelType === 'group' ? 'Group' : 'Sub-group'} deleted`);
        onOpenChange(false);
        window.location.href = '/dashboard';
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Only admins or managers can manage this (assuming this is checked before rendering button, but just in case)
  if (user?.role !== 'admin' && user?.role !== 'manager') return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-border">
        <DialogHeader>
          <DialogTitle>Manage {channelType === 'group' ? 'Group' : 'Sub-group'}</DialogTitle>
          <DialogDescription>
            Rename or delete this {channelType === 'group' ? 'group' : 'sub-group'}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. general"
            />
          </div>

          {channelInfo.is_private && (
            <div className="space-y-3 pt-2">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Manage Members
              </Label>
              <div className="max-h-[160px] overflow-y-auto space-y-2 border border-border rounded-lg p-2 bg-muted/20">
                {isLoadingMembers ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-2">No members found</p>
                ) : (
                  members.map(member => {
                    // Admins/Managers are often required or it's just the workspace members.
                    // We allow checking/unchecking.
                    const isChecked = selectedMembers.includes(member.user_id);
                    const displayName = member.user?.name || member.user?.email || 'Unknown';
                    
                    return (
                      <div key={member.user_id} className="flex items-center gap-3 p-1 hover:bg-muted/50 rounded-md transition-colors">
                        <Checkbox 
                          id={`member-${member.user_id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleMember(member.user_id)}
                          disabled={member.user_id === user?.id} // Don't let user remove themselves
                        />
                        <div className="grid flex-1 leading-none">
                          <label
                            htmlFor={`member-${member.user_id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {displayName} {member.user_id === user?.id && '(You)'}
                          </label>
                          <p className="text-[10px] text-muted-foreground mt-1">{member.job_title || member.role}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between">
            <Button
              variant="outline"
              className="border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600 gap-2"
              onClick={() => setShowConfirmDelete(true)}
              disabled={isDeleting || isSaving}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving || isDeleting || !name.trim()}
              style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>

      <ConfirmDialog
        open={showConfirmDelete}
        onOpenChange={setShowConfirmDelete}
        title={`Delete ${channelType === 'group' ? 'Group' : 'Sub-group'}`}
        description={`Are you sure you want to delete "${channelInfo.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </Dialog>
  );
}
