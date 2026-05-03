'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { GroupChat } from '@/components/groups/group-chat';
import { Loader2 } from 'lucide-react';

interface SubGroup {
  _id: string;
  name: string;
  description?: string;
  group_id: string;
}

export default function SubGroupPage() {
  const { groupId, subGroupId } = useParams();
  const { authHeaders } = useAuth();
  const [subgroup, setSubgroup] = useState<SubGroup | null>(null);
  const [parentGroupName, setParentGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const headers = authHeaders();
        // Load subgroup list to get info
        const res = await fetch(`/api/groups/${groupId}/subgroups`, { headers });
        if (res.ok) {
          const data = await res.json();
          const found = data.subgroups?.find((sg: SubGroup) => sg._id === subGroupId);
          if (found) setSubgroup(found);
          if (data.group?.name) setParentGroupName(data.group.name);
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (groupId && subGroupId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, subGroupId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const channelInfo = subgroup || {
    _id: subGroupId as string,
    name: 'Sub-group',
    type: 'general',
    is_private: false,
  };

  return (
    <div className="h-full">
      <GroupChat
        channelType="subgroup"
        channelId={subGroupId as string}
        channelInfo={channelInfo}
        parentGroupName={parentGroupName || 'Group'}
      />
    </div>
  );
}
