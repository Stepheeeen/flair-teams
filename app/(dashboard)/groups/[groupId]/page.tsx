'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { GroupChat } from '@/components/groups/group-chat';
import { CreateSubGroupDialog } from '@/components/groups/create-subgroup-dialog';
import { Button } from '@/components/ui/button';
import { Plus, ChevronDown, ChevronRight, Layers, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Group {
  _id: string;
  name: string;
  description?: string;
  type: string;
  is_private: boolean;
  color: string;
}

interface SubGroup {
  _id: string;
  name: string;
  description?: string;
}

export default function GroupPage() {
  const { groupId } = useParams();
  const { user, authHeaders } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [subgroups, setSubgroups] = useState<SubGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateSubGroup, setShowCreateSubGroup] = useState(false);
  const [subgroupsOpen, setSubgroupsOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const headers = authHeaders();
        const subRes = await fetch(`/api/groups/${groupId}/subgroups`, { headers });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubgroups(subData.subgroups);
          if (subData.group) setGroup(subData.group);
        }
      } catch { /* silent */ } finally {
        setIsLoading(false);
      }
    };
    if (groupId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const channelInfo = group || { _id: groupId as string, name: 'Group', type: 'general', is_private: false, color: '#FFC078' };
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const SubGroupList = () => (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {subgroups.length === 0 ? (
        <div className="px-2 py-6 text-center">
          <p className="text-xs text-muted-foreground italic">No sub-groups yet.</p>
          {canManage && (
            <button
              onClick={() => setShowCreateSubGroup(true)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              Create one
            </button>
          )}
        </div>
      ) : (
        subgroups.map((sg) => (
          <Link key={sg._id} href={`/groups/${groupId}/sub/${sg._id}`} onClick={() => setMobileSheetOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{sg.name}</span>
              {sg.description && (
                <span className="text-xs text-muted-foreground/60 truncate ml-auto">{sg.description}</span>
              )}
            </div>
          </Link>
        ))
      )}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Group chat (main area) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <GroupChat
          channelType="group"
          channelId={groupId as string}
          channelInfo={channelInfo}
          onSubGroupsClick={() => setMobileSheetOpen(true)}
          subGroupCount={subgroups.length}
        />
      </div>

      {/* Sub-groups sidebar — desktop only */}
      <div className="hidden md:flex w-56 border-l border-border bg-card flex-shrink-0 flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSubgroupsOpen(!subgroupsOpen)}
              className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {subgroupsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Sub-groups
            </button>
            {canManage && (
              <Button
                size="icon" variant="ghost"
                className="w-5 h-5 text-muted-foreground hover:text-foreground"
                onClick={() => setShowCreateSubGroup(true)}
                title="Create sub-group"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        {subgroupsOpen && <SubGroupList />}
      </div>

      {/* Mobile sub-groups bottom sheet */}
      {mobileSheetOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSheetOpen(false)} />
          <div className="relative z-50 bg-card rounded-t-2xl border-t border-border shadow-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" style={{ color: '#FFC078' }} />
                <p className="font-bold text-sm">Sub-groups</p>
                <span className="text-xs text-muted-foreground">({subgroups.length})</span>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <button
                    onClick={() => { setShowCreateSubGroup(true); setMobileSheetOpen(false); }}
                    className="flex items-center gap-1 text-xs font-semibold text-primary"
                  >
                    <Plus className="w-3.5 h-3.5" /> New
                  </button>
                )}
                <button onClick={() => setMobileSheetOpen(false)} className="p-1 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <SubGroupList />
            <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </div>
      )}

      {group && (
        <CreateSubGroupDialog
          groupId={groupId as string}
          groupName={group.name}
          open={showCreateSubGroup}
          onOpenChange={setShowCreateSubGroup}
          onCreated={(sg) => setSubgroups((prev) => [...prev, sg])}
        />
      )}
    </div>
  );
}
