'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { useKeyboardHeight } from '@/lib/hooks/use-keyboard-height';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Send, Loader2, ArrowLeft, Reply } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';

interface DMMessage {
  _id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  createdAt: string;
  read: boolean;
  reply_to?: DMMessage | null;
}

interface OtherUser {
  id: string;
  name: string;
  email: string;
  job_title?: string;
  avatar_url?: string;
}

interface DirectMessageChatProps {
  otherUserId: string;
  otherUser: OtherUser | null;
}

function formatTime(d: string) {
  const date = new Date(d);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  return format(date, 'dd MMM HH:mm');
}

const USER_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

function groupByDate(messages: DMMessage[]) {
  const groups: { date: string; messages: DMMessage[] }[] = [];
  let curr = '';
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMMM d');
    if (key !== curr) { curr = key; groups.push({ date: key, messages: [m] }); }
    else groups[groups.length - 1].messages.push(m);
  }
  return groups;
}

function Avatar({ name, src, token }: { name: string; src?: string; token?: string | null }) {
  if (src) {
    const imgUrl = (src.includes('/api/file') && token) ? `${src}&token=${token}` : src;
    return (
      <img src={imgUrl} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border" />
    );
  }

  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(135deg,#FFC078,#DA9646)', color: '#1B1C1B' }}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

export function DirectMessageChat({ otherUserId, otherUser }: DirectMessageChatProps) {
  const { user, fetcher, token } = useAuth();
  const isMobile = useIsMobile();
  const keyboardHeight = useKeyboardHeight();
  const isKeyboardOpen = keyboardHeight > 80;
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState(false);
  const [replyTo, setReplyTo] = useState<DMMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);

  const apiUrl = `/api/dm/${otherUserId}/messages`;

  const load = useCallback(async () => {
    try {
      const res = await fetcher(apiUrl);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch { /* handled globally */ } finally {
      setIsLoading(false);
    }
  }, [apiUrl, fetcher]);

  // Supabase Realtime
  useEffect(() => {
    setMessages([]); setIsLoading(true);
    load();

    const convId = [user!.id, otherUserId].sort().join(':');
    const supabase = getSupabaseClient();
    const ch = supabase.channel(`dm:${convId}`, {
      config: { broadcast: { self: false } },
    });

    ch.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      // Skip messages we sent ourselves — already in state from the API response.
      // Only append messages from the other participant.
      if (payload.sender_id === user?.id) return;
      setMessages((prev) => prev.some((m) => m._id === payload._id) ? prev : [...prev, payload]);
    });
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.user_id !== user?.id) {
        setTypingUsers(true);
        setTimeout(() => setTypingUsers(false), 2500);
      }
    });

    ch.subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otherUserId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Scroll to latest message when keyboard opens on iOS
  useEffect(() => {
    if (isKeyboardOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isKeyboardOpen]);

  const broadcastTyping = () => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { user_id: user?.id } });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || isSending) return;

    setIsSending(true);
    const optId = `opt-${Date.now()}`;
    const opt: DMMessage = {
      _id: optId,
      conversation_id: '',
      sender_id: user!.id,
      sender_name: user!.name,
      content,
      createdAt: new Date().toISOString(),
      read: false,
      reply_to: replyTo,
    };
    setMessages((p) => [...p, opt]);
    setInput('');
    setReplyTo(null);

    try {
      const res = await fetcher(apiUrl, {
        method: 'POST',
        body: JSON.stringify({ content, reply_to: replyTo?._id }),
      });
      if (!res.ok) {
        setMessages((p) => p.filter((m) => m._id !== optId));
        setInput(content);
        return;
      }
      const data = await res.json();
      setMessages((p) => p.map((m) => m._id === optId ? data.message : m));
    } catch {
      setMessages((p) => p.filter((m) => m._id !== optId));
      setInput(content);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Enter sends, Shift+Enter = new line
    // Mobile:  Enter always inserts a new line, send via button only
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      send();
    }
  };

  const grouped = groupByDate(messages);
  const displayName = otherUser?.name || otherUser?.email || 'Member';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center gap-3 bg-card/80 backdrop-blur-sm flex-shrink-0">
        <Link href="/dm">
          <Button variant="ghost" size="icon" className="w-8 h-8 lg:hidden"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <Avatar name={displayName} src={otherUser?.avatar_url} token={token} />
        <div>
          <p className="text-sm font-bold">{displayName}</p>
          {otherUser?.job_title && (
            <p className="text-xs text-muted-foreground">{otherUser.job_title}</p>
          )}
        </div>
      </div>

      {/* Messages — bottom padding accounts for fixed input+nav on mobile */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-36 lg:pb-4 scroll-container">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center text-muted-foreground">
            <Avatar name={displayName} src={otherUser?.avatar_url} token={token} />
            <div>
              <p className="font-semibold text-foreground">Start a conversation with {displayName}</p>
              <p className="text-sm text-muted-foreground">
                {otherUser?.job_title ? `${otherUser.job_title} · ` : ''}{otherUser?.email}
              </p>
            </div>
          </div>
        ) : (
          grouped.map((g) => (
            <div key={g.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-border" />
                <span className="text-[11px] font-semibold text-muted-foreground px-2">{g.date}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              {g.messages.map((msg, i) => {
                const prev = i > 0 ? g.messages[i - 1] : null;
                const consec = prev &&
                  prev.sender_id === msg.sender_id &&
                  new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 300_000;
                const isOwn = msg.sender_id === user?.id;

                return (
                  <div key={msg._id}
                    className={`flex items-start gap-3 px-2 py-0.5 rounded-lg hover:bg-muted/30 ${consec ? 'mt-0.5' : 'mt-3'} ${isOwn ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 flex-shrink-0 ${consec ? 'invisible' : ''}`}>
                      <Avatar name={isOwn ? user!.name : displayName} src={isOwn ? user?.avatar_url : otherUser?.avatar_url} token={token} />
                    </div>
                      <div className={`flex-1 min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!consec && (
                          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm font-bold" style={{ color: isOwn ? '#FFC078' : getUserColor(msg.sender_id) }}>
                              {isOwn ? 'You' : displayName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                          </div>
                        )}

                        {/* Reply reference */}
                        {msg.reply_to && (
                          <div className={`mb-1 px-3 py-1 rounded-lg border-l-2 text-xs bg-muted/40 max-w-[90%] truncate opacity-80 ${isOwn ? 'border-primary/50' : 'border-border'}`}>
                            <p className="font-bold text-[10px] opacity-70">{msg.reply_to.sender_name}</p>
                            <p className="truncate">{msg.reply_to.content}</p>
                          </div>
                        )}

                        <div 
                          className={`py-1.5 px-3 rounded-2xl max-w-[85%] relative group transition-all ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                          
                          {/* Reply button (appears on hover) */}
                          <button
                            onClick={() => {
                              setReplyTo(msg);
                              inputRef.current?.focus();
                            }}
                            className={`absolute top-0 ${isOwn ? '-left-8' : '-right-8'} p-1.5 rounded-full bg-card border border-border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity`}
                            title="Reply"
                          >
                            <Reply className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        {typingUsers && (
          <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground mt-2">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </span>
            {displayName} is typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input
          Mobile: position:fixed just above the nav bar — rises naturally with the iOS keyboard (WhatsApp pattern).
          Desktop (lg): normal static flow.
      */}
      <div
        className={[
          'border-t border-border px-4 py-3 bg-card/80 backdrop-blur-sm z-20',
          'fixed left-0 right-0',
          isKeyboardOpen ? 'bottom-0' : 'bottom-16',
          'lg:static lg:bottom-auto lg:flex-shrink-0',
        ].join(' ')}
      >
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 rounded-lg bg-muted/50 border-l-2" style={{ borderColor: '#FFC078' }}>
            <Reply className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground flex-1 truncate">
              Replying to <strong>{replyTo.sender_name}</strong>: {replyTo.content}
            </p>
            <button onClick={() => setReplyTo(null)} className="text-muted-foreground font-bold text-xs">✕</button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); broadcastTyping(); }}
            onKeyDown={onKeyDown}
            placeholder={`Message ${displayName}…`}
            rows={1}
            disabled={isSending}
            className="flex-1 resize-none bg-muted/50 border border-border rounded-xl px-4 py-3 text-[16px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-40"
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isSending}
            size="icon"
            className="h-9 w-9 rounded-xl flex-shrink-0 mb-[6px]"
            style={{ background: input.trim() ? 'linear-gradient(135deg,#FFC078,#DA9646)' : undefined, color: input.trim() ? '#1B1C1B' : undefined }}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
