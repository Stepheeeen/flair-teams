'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useIsMobile } from '@/lib/hooks/use-is-mobile';
import { getSupabaseClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import {
  Send, Reply, Hash, Users, Lock, Megaphone, ChevronRight,
  Loader2, Paperclip, File as FileIcon, X, Download, Settings, ArrowLeft
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'sonner';
import Link from 'next/link';
import { ManageChannelDialog } from './manage-channel-dialog';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Attachment {
  url: string;
  name: string;
  size: number;
  mime_type: string;
  bucket_path: string;
}

interface Message {
  _id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  content: string;
  type: 'text' | 'file' | 'system';
  createdAt: string;
  reply_to?: string | null;
  attachment?: Attachment;
  mentions?: string[];
}

interface ChannelInfo {
  _id: string;
  name: string;
  description?: string;
  type?: string;
  is_private?: boolean;
}

interface GroupChatProps {
  channelType: 'group' | 'subgroup';
  channelId: string;
  channelInfo: ChannelInfo;
  parentGroupName?: string;
  headerActions?: React.ReactNode;
}

interface TeamMember {
  id: string;
  name: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const formatTime = (d: string) => {
  const date = new Date(d);
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
  return format(date, 'MMM d, HH:mm');
};

const USER_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];
const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
};

const groupByDate = (messages: Message[]) => {
  const groups: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const d = new Date(msg.createdAt);
    const key = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMMM d');
    if (key !== currentDate) { currentDate = key; groups.push({ date: key, messages: [msg] }); }
    else groups[groups.length - 1].messages.push(msg);
  }
  return groups;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function MessageContent({ content, currentUserId, mentions }: { content: string; currentUserId: string; mentions?: string[] }) {
  // Simple regex highlight — bold @mentions
  const parts = content.split(/(@[\w-]+)/g);
  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        /^@[\w-]/.test(part) ? (
          <span key={i} className="font-bold px-0.5 rounded bg-foreground/10">{part}</span>
        ) : part
      )}
    </p>
  );
}

function ChannelIcon({ type, is_private }: { type?: string; is_private?: boolean }) {
  if (is_private) return <Lock className="w-4 h-4" />;
  if (type === 'announcement') return <Megaphone className="w-4 h-4" />;
  if (type === 'department') return <Users className="w-4 h-4" />;
  return <Hash className="w-4 h-4" />;
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
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function SwipeableMessage({ children, onSwipe, isOwn }: { children: React.ReactNode, onSwipe: () => void, isOwn: boolean }) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const diff = e.touches[0].clientX - startX.current;
    // Allow swipe right to reply (up to 60px)
    if (diff > 0 && diff < 60) {
      setOffset(diff);
    }
  };

  const onTouchEnd = () => {
    isDragging.current = false;
    if (offset > 40) {
      onSwipe();
    }
    setOffset(0);
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: `translateX(${offset}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s cubic-bezier(0.1, 0.7, 0.1, 1)' }}
      className="relative flex items-center w-full"
    >
      <div 
        className="absolute top-1/2 -translate-y-1/2 left-0 flex items-center justify-center transition-opacity z-[-1]"
        style={{ opacity: offset / 40, transform: `translateX(-${20 + offset/2}px)` }}
      >
        <div className="bg-muted p-1.5 rounded-full shadow-sm">
          <Reply className="w-3 h-3 text-foreground" />
        </div>
      </div>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}

/* ─── File Upload Helper ─────────────────────────────────────────────────── */
async function uploadFile(
  file: File,
  channelType: string,
  channelId: string,
  authHeaders: () => Record<string, string>
): Promise<Attachment> {
  // 1. Get signed upload URL
  const urlRes = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ filename: file.name, content_type: file.type, channel_type: channelType, channel_id: channelId }),
  });
  if (!urlRes.ok) throw new Error('Failed to get upload URL');
  const { signed_url, path } = await urlRes.json();

  // 2. Upload directly to Supabase Storage
  const uploadRes = await fetch(signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error('Upload failed');

  // 3. Get download URL
  const dlRes = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, { headers: authHeaders() });
  if (!dlRes.ok) throw new Error('Failed to get download URL');
  const { url } = await dlRes.json();

  return { url, name: file.name, size: file.size, mime_type: file.type, bucket_path: path };
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export function GroupChat({ channelType, channelId, channelInfo, parentGroupName, headerActions }: GroupChatProps) {
  const { user, authHeaders, token } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<TeamMember[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [showManageDialog, setShowManageDialog] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeChannelRef = useRef<any>(null);

  const messagesUrl =
    channelType === 'group'
      ? `/api/groups/${channelId}/messages`
      : `/api/subgroups/${channelId}/messages`;

  const realtimeChannelName = `chat:${channelType}:${channelId}`;

  /* ── Load initial messages ─────────────────────────────────────────────── */
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(messagesUrl, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  /* ── Supabase Realtime subscription ────────────────────────────────────── */
  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    setReplyTo(null);
    setTypingUsers([]);
    loadMessages();

    const supabase = getSupabaseClient();
    const channel = supabase.channel(realtimeChannelName, {
      config: { broadcast: { self: false }, presence: { key: user?.id } },
    });

    // New message event
    channel.on('broadcast', { event: 'new_message' }, ({ payload }) => {
      setMessages((prev) => {
        // Skip messages we sent — already in state from optimistic update + API response.
        if (payload.sender_id === user?.id) return prev;
        if (prev.some((m) => m._id === payload._id)) return prev;
        return [...prev, payload as Message];
      });
    });

    // Typing indicator events
    channel.on('broadcast', { event: 'typing_start' }, ({ payload }) => {
      if (payload.user_id !== user?.id) {
        setTypingUsers((prev) => prev.includes(payload.name) ? prev : [...prev, payload.name]);
      }
    });
    channel.on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
      setTypingUsers((prev) => prev.filter((n) => n !== payload.name));
    });

    channel.subscribe();
    realtimeChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      realtimeChannelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, channelType]);

  /* ── Auto-scroll ───────────────────────────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  /* ── Typing broadcast ──────────────────────────────────────────────────── */
  const broadcastTyping = useCallback((isTyping: boolean) => {
    const ch = realtimeChannelRef.current;
    if (!ch || !user) return;
    ch.send({
      type: 'broadcast',
      event: isTyping ? 'typing_start' : 'typing_stop',
      payload: { user_id: user.id, name: user.name },
    });
  }, [user]);

  /* ── @mention autocomplete ─────────────────────────────────────────────── */
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Typing indicator
    broadcastTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => broadcastTyping(false), 2000);

    // Detect @mention trigger
    const cursorPos = e.target.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const mentionMatch = textBefore.match(/@([\w-]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  /* ── Insert @mention ───────────────────────────────────────────────────── */
  const insertMention = (member: TeamMember) => {
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const replaced = textBefore.replace(/@[\w-]*$/, `@${member.name.replace(/\s+/g, '-')} `);
    setInput(replaced + textAfter);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  /* ── Send message ──────────────────────────────────────────────────────── */
  const sendMessage = async (overrideContent?: string, attachment?: Attachment) => {
    const content = overrideContent || input.trim();
    if (!content || isSending) return;

    setIsSending(true);
    const optimisticId = `opt-${Date.now()}`;
    const optimistic: Message = {
      _id: optimisticId,
      sender_id: user!.id,
      sender_name: user!.name,
      sender_avatar: user!.avatar_url,
      content,
      type: attachment ? 'file' : 'text',
      attachment,
      createdAt: new Date().toISOString(),
      reply_to: replyTo?._id || null,
    };

    setMessages((prev) => [...prev, optimistic]);
    if (!overrideContent) setInput('');
    setReplyTo(null);
    broadcastTyping(false);

    try {
      const res = await fetch(messagesUrl, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          content,
          reply_to: replyTo?._id,
          type: attachment ? 'file' : 'text',
          attachment,
        }),
      });

      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
        const data = await res.json();
        toast.error(data.error || 'Failed to send message');
        if (!overrideContent) setInput(content);
        return;
      }

      const data = await res.json();
      setMessages((prev) => prev.map((m) => m._id === optimisticId ? data.message : m));
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      toast.error('Network error, please try again');
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  /* ── File upload ───────────────────────────────────────────────────────── */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX = 25 * 1024 * 1024;
    if (file.size > MAX) { toast.error('File too large (max 25 MB)'); return; }

    setIsUploading(true);
    try {
      const attachment = await uploadFile(file, channelType, channelId, authHeaders);
      await sendMessage(file.name, attachment);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && e.key === 'Escape') { setShowSuggestions(false); return; }
    // Desktop: Enter sends, Shift+Enter = new line
    // Mobile:  Enter always inserts a new line, send via button only
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isAnnouncement = channelInfo.type === 'announcement';
  const canWrite = !isAnnouncement || user?.role === 'admin' || user?.role === 'manager';
  const grouped = groupByDate(messages);

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Channel header */}
      <div className="border-b border-border px-4 lg:px-6 py-3 flex items-center gap-3 flex-shrink-0 bg-card/80 backdrop-blur-sm">
        <Link href="/dashboard" className="lg:hidden">
          <Button variant="ghost" size="icon" className="w-8 h-8"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <span className="text-muted-foreground hidden lg:inline-block"><ChannelIcon type={channelInfo.type} is_private={channelInfo.is_private} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {parentGroupName && (
              <><span className="text-sm text-muted-foreground">{parentGroupName}</span><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></>
            )}
            <h2 className="text-sm font-bold truncate">{channelInfo.name}</h2>
          </div>
          {channelInfo.description && <p className="text-xs text-muted-foreground truncate">{channelInfo.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {isAnnouncement && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>Announcement</span>
          )}
          {headerActions}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <Button
              size="icon"
              variant="ghost"
              className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted ml-1"
              onClick={() => setShowManageDialog(true)}
              title="Manage Channel"
            >
              <Settings className="w-4 h-4" />
            </Button>
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
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: '#FFC078', color: '#1B1C1B' }}>
              <ChannelIcon type={channelInfo.type} is_private={channelInfo.is_private} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Welcome to #{channelInfo.name}</p>
              <p className="text-sm">{channelInfo.description || 'Start the conversation!'}</p>
            </div>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-border" />
                <span className="text-[11px] font-semibold text-muted-foreground px-2">{group.date}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              {group.messages.map((msg, i) => {
                const prev = i > 0 ? group.messages[i - 1] : null;
                const isConsecutive = prev &&
                  prev.sender_id === msg.sender_id &&
                  new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
                const isOwn = msg.sender_id === user?.id;
                const repliedMsg = msg.reply_to ? messages.find(m => m._id === msg.reply_to) : null;

                return (
                  <SwipeableMessage key={msg._id} isOwn={isOwn} onSwipe={() => setReplyTo(msg)}>
                    <div className={`group flex items-start gap-3 hover:bg-muted/30 px-2 py-0.5 rounded-lg ${isConsecutive ? 'mt-0.5' : 'mt-3'} ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 flex-shrink-0 ${isConsecutive ? 'invisible' : ''}`}>
                        <Avatar name={msg.sender_name} src={msg.sender_avatar} token={token} />
                      </div>
                      <div className={`flex-1 min-w-0 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                        {!isConsecutive && (
                          <div className={`flex items-baseline gap-2 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-sm font-bold" style={{ color: isOwn ? '#FFC078' : getUserColor(msg.sender_id) }}>
                              {isOwn ? 'You' : msg.sender_name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                          </div>
                        )}

                        {repliedMsg && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 mb-1 rounded-xl bg-muted/50 border-l-2 text-[11px] max-w-[85%] ${isOwn ? 'border-primary/50' : 'border-border'}`} style={{ borderColor: isOwn ? undefined : '#FFC078' }}>
                            <Reply className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="font-semibold truncate max-w-[80px]">{repliedMsg.sender_name}:</span>
                            <span className="text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">{repliedMsg.content || 'Attachment'}</span>
                          </div>
                        )}

                        {msg.type === 'file' && msg.attachment ? (
                          msg.attachment.mime_type?.startsWith('image/') ? (
                            <div className="mt-1 relative rounded-xl overflow-hidden border border-border inline-block max-w-[280px] sm:max-w-sm">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/api/file?path=${encodeURIComponent(msg.attachment.bucket_path || '')}&token=${token || ''}`} alt={msg.attachment.name} className="w-full h-auto object-cover max-h-60" />
                              <a href={`/api/file?path=${encodeURIComponent(msg.attachment.bucket_path || '')}&token=${token || ''}`} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded text-white backdrop-blur-sm transition-colors opacity-0 group-hover/file:opacity-100 group-hover:opacity-100">
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ) : (
                            <a href={`/api/file?path=${encodeURIComponent(msg.attachment.bucket_path || '')}&token=${token || ''}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors group/file mt-1 max-w-full">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFC078' }}>
                                <FileIcon className="w-4 h-4 text-[#1B1C1B]" />
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <p className="text-sm font-semibold truncate">{msg.attachment.name}</p>
                                <p className="text-xs text-muted-foreground">{formatBytes(msg.attachment.size)}</p>
                              </div>
                              <Download className="w-4 h-4 text-muted-foreground group-hover/file:text-foreground ml-2 flex-shrink-0" />
                            </a>
                          )
                        ) : (
                          <div className={`py-1.5 px-3 rounded-2xl max-w-[85%] ${isOwn ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                            <MessageContent content={msg.content} currentUserId={user?.id || ''} mentions={msg.mentions} />
                          </div>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setReplyTo(msg)} className="p-1 text-muted-foreground hover:text-foreground" title="Reply">
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </SwipeableMessage>
                );
              })}
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
              ))}
            </span>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area
          Mobile: position:fixed just above the nav bar — rises naturally with the iOS keyboard (WhatsApp pattern).
          Desktop (lg): normal static flow inside the flex column.
      */}
      {canWrite ? (
        <div
          className="chat-input-wrapper border-t border-border px-4 py-3 bg-card/80 backdrop-blur-sm z-20 fixed left-0 right-0 bottom-16 lg:static lg:bottom-auto lg:flex-shrink-0"
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

          {/* @mention suggestions — sits above the fixed input bar */}
          {showSuggestions && mentionSuggestions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 mb-1 z-10 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {mentionSuggestions.map((m) => (
                <button key={m.id} onClick={() => insertMention(m)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors text-left">
                  <Avatar name={m.name} />
                  {m.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* File upload button */}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp,.gif,.zip" />
            <Button variant="ghost" size="icon"
              className="w-9 h-9 rounded-xl flex-shrink-0 text-muted-foreground hover:text-foreground mb-[6px]"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSending}
              title="Attach file">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isMobile
                  ? `Message #${channelInfo.name}  •  @ to mention`
                  : `Message #${channelInfo.name}  •  Enter to send  •  Shift+Enter for new line  •  @ to mention`}
                rows={1}
                disabled={isSending || isUploading}
                className="w-full resize-none bg-muted/50 border border-border rounded-xl px-4 py-3 text-[16px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 max-h-40"
              />
            </div>

            <Button onClick={() => sendMessage()} disabled={!input.trim() || isSending} size="icon"
              className="h-9 w-9 rounded-xl flex-shrink-0 mb-[6px]"
              style={{ background: input.trim() ? 'linear-gradient(135deg,#FFC078,#DA9646)' : undefined, color: input.trim() ? '#1B1C1B' : undefined }}>
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="chat-input-wrapper border-t border-border px-4 py-3 text-center text-sm text-muted-foreground bg-card/80 backdrop-blur-sm z-20 fixed left-0 right-0 bottom-16 lg:static lg:bottom-auto lg:flex-shrink-0"
        >
          <Megaphone className="w-4 h-4 inline mr-2" />
          Announcement channel — only admins and managers can post.
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileSelect}
      />

      <ManageChannelDialog
        channelType={channelType}
        channelId={channelId}
        channelInfo={channelInfo}
        open={showManageDialog}
        onOpenChange={setShowManageDialog}
        onUpdate={() => { window.location.reload(); }}
      />
    </div>
  );
}
