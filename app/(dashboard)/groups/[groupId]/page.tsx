'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { GroupChat } from '@/components/groups/group-chat';
import { CreateSubGroupDialog } from '@/components/groups/create-subgroup-dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Plus, ChevronDown, ChevronRight, Hash, Users, Loader2 } from 'lucide-react';
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
  const [error, setError] = useState<string | null>(null);
  const [showCreateSubGroup, setShowCreateSubGroup] = useState(false);
  const [subgroupsOpen, setSubgroupsOpen] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const headers = authHeaders();
        // Fetch group info from subgroups endpoint (group info needed separately)
        const [subRes] = await Promise.all([
          fetch(`/api/groups/${groupId}/subgroups`, { headers }),
        ]);

        // Also need the group itself — get from the groups list using teamId stored in group
        // We'll get group info via a dedicated endpoint or embed it in subgroups response
        // For now, fetch it from the subgroups response (we add group info there)

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubgroups(subData.subgroups);
          // Group info should come from a GET /api/groups/[groupId] endpoint
          // Let's get it from the groups list via a search approach:
          if (subData.group) setGroup(subData.group);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
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

  // If group info isn't loaded yet (pending dedicated GET endpoint), still show the chat
  const channelInfo = group || { _id: groupId as string, name: 'Group', type: 'general', is_private: false, color: '#FFC078' };

  return (
    <div className="flex h-full">
      {/* Group chat (main area) */}
      <div className="flex-1 flex flex-col min-w-0">
        <GroupChat
          channelType="group"
          channelId={groupId as string}
          channelInfo={channelInfo}
        />
      </div>

      {/* Sub-groups sidebar — hidden on mobile */}
      <div className="hidden md:flex w-56 border-l border-border bg-card flex-shrink-0 flex-col">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSubgroupsOpen(!subgroupsOpen)}
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {subgroupsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Sub-groups
            </button>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Button
                size="icon"
                variant="ghost"
                className="w-5 h-5"
                onClick={() => setShowCreateSubGroup(true)}
                title="Create sub-group"
              >
                <Plus className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {subgroupsOpen && (
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {subgroups.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No sub-groups yet.
                {(user?.role === 'admin' || user?.role === 'manager') && (
                  <button
                    onClick={() => setShowCreateSubGroup(true)}
                    className="block mx-auto mt-1 text-primary hover:underline"
                  >
                    Create one
                  </button>
                )}
              </div>
            ) : (
              subgroups.map((sg) => (
                <Link key={sg._id} href={`/groups/${groupId}/sub/${sg._id}`}>
                  <div className="flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors text-muted-foreground hover:bg-muted hover:text-foreground">
                    <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{sg.name}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

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
