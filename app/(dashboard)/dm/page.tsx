'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { MessageCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  _id: string;
  last_message: { content: string; sender_id: string; createdAt: string };
  unread_count: number;
  other_user: { id: string; name: string; email: string; job_title?: string; avatar_url?: string } | null;
}

function Avatar({ name, src, token }: { name: string; src?: string; token?: string | null }) {
  if (src) {
    const imgUrl = (src.includes('/api/file') && token) ? `${src}&token=${token}` : src;
    return (
      <img src={imgUrl} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border" />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

export default function DMIndexPage() {
  const { fetcher, user, token } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetcher('/api/dm');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations);
      }
    } catch { /* handled globally */ } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-black mb-5 sm:mb-6">Direct Messages</h1>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="font-semibold text-foreground mb-1">No messages yet</p>
          <p className="text-sm text-muted-foreground">
            Go to <Link href="/members" className="text-primary hover:underline font-medium">Members</Link> to start a conversation.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {conversations.map((conv) => {
            const other = conv.other_user;
            const name = other?.name || other?.email || 'Member';
            const isOwn = conv.last_message.sender_id === user?.id;

            return (
              <Link key={conv._id} href={`/dm/${other?.id || ''}`}>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                  <Avatar name={name} src={other?.avatar_url} token={token} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-bold truncate">{name}</p>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.last_message.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {other?.job_title && (
                      <p className="text-[11px] text-muted-foreground mb-0.5">{other.job_title}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">
                      {isOwn ? 'You: ' : ''}{conv.last_message.content}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
                      {conv.unread_count > 9 ? '9+' : conv.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
