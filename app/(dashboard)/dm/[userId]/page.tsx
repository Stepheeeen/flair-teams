'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DirectMessageChat } from '@/components/dm/dm-chat';
import { Loader2 } from 'lucide-react';

export default function DMPage() {
  const { userId } = useParams();
  const { fetcher } = useAuth();
  const [otherUser, setOtherUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetcher(`/api/members/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setOtherUser(data.user);
      }
    } catch { /* handled globally */ } finally {
      setIsLoading(false);
    }
  }, [fetcher, userId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="h-full">
      <DirectMessageChat otherUserId={userId as string} otherUser={otherUser} />
    </div>
  );
}
