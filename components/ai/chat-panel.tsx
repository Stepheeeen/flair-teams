'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Send, Bot, User as UserIcon, Loader2, AlertCircle, RefreshCw, Users, Calendar, Clock, Bell, PlusCircle, BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState, useMemo, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth-context';

function formatToolName(name: string) {
  const clean = name.replace(/^tool-/, '');
  return clean
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/** Render basic markdown formatting: bold, bullets, newlines */
function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bullet point line
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-primary font-bold text-xs mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatBold(content) }} />
            </div>
          );
        }

        return (
          <p key={idx} dangerouslySetInnerHTML={{ __html: formatBold(line) }} />
        );
      })}
    </div>
  );
}

function formatBold(str: string) {
  return str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function ToolResultRenderer({ output }: { output: any }) {
  if (!output) return null;

  if (output.error) {
    return (
      <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded text-xs flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{output.error}</span>
      </div>
    );
  }

  // Analytics Output
  if (output.analytics) {
    const { employees, tasks, projects, meetings } = output.analytics;
    return (
      <div className="mt-2.5 space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-background/90 rounded-lg border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Employees</span>
            </div>
            <p className="text-lg font-bold text-foreground">{employees?.total || 0}</p>
            <p className="text-[10px] text-muted-foreground">{employees?.admins} admin · {employees?.managers} mgr · {employees?.members} mbr</p>
          </div>
          <div className="p-2.5 bg-background/90 rounded-lg border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Tasks</span>
            </div>
            <p className="text-lg font-bold text-foreground">{tasks?.pending || 0}</p>
            <p className="text-[10px] text-muted-foreground">Total: {tasks?.total || 0} · Completed: {tasks?.completed || 0}</p>
          </div>
          <div className="p-2.5 bg-background/90 rounded-lg border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-500" />
              <span>Active Meetings</span>
            </div>
            <p className="text-lg font-bold text-foreground">{meetings?.scheduled || 0}</p>
            <p className="text-[10px] text-muted-foreground">Scheduled in system</p>
          </div>
          <div className="p-2.5 bg-background/90 rounded-lg border shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Active Projects</span>
            </div>
            <p className="text-lg font-bold text-foreground">{projects?.active || 0}</p>
            <p className="text-[10px] text-muted-foreground">Ongoing projects</p>
          </div>
        </div>
      </div>
    );
  }

  // Single Created Meeting Output
  if (output.meeting) {
    const m = output.meeting;
    return (
      <div className="mt-2 p-2.5 bg-background/90 rounded-md border border-green-500/30 shadow-2xs text-xs space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground text-sm">{m.title}</p>
          <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-600 font-bold">Scheduled</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          📅 <strong>{m.date}</strong> at <strong>{m.start_time}</strong> {m.end_time ? `- ${m.end_time}` : ''}
        </p>
        {m.attendees && m.attendees.length > 0 && (
          <p className="text-[10px] text-muted-foreground">Attendees ({m.attendees.length}): {m.attendees.join(', ')}</p>
        )}
      </div>
    );
  }

  // Single Created Task Output
  if (output.task) {
    const t = output.task;
    return (
      <div className="mt-2 p-2.5 bg-background/90 rounded-md border border-blue-500/30 shadow-2xs text-xs space-y-1">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-foreground text-sm">{t.title}</p>
          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-600 uppercase font-bold">{t.priority} priority</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Assigned to: <strong>{t.assigned_to}</strong> · Status: <span className="capitalize font-medium text-foreground">{t.status}</span>
        </p>
      </div>
    );
  }

  if (output.users && Array.isArray(output.users)) {
    if (output.users.length === 0) return <p className="text-xs text-muted-foreground mt-1">No employee records found.</p>;
    return (
      <div className="mt-2 space-y-1.5 text-xs max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
        <div className="text-[10px] text-muted-foreground font-medium mb-1">Found {output.count || output.users.length} employee(s):</div>
        {output.users.map((u: any, idx: number) => (
          <div key={idx} className="p-2.5 bg-background/90 rounded-md border shadow-2xs flex items-center justify-between gap-2 hover:border-primary/40 transition-colors">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{u.name || u.email}</p>
              <p className="text-[11px] text-muted-foreground truncate">{u.email} {u.job_title ? `· ${u.job_title}` : ''}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold shrink-0 ${
              u.role === 'admin' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
              u.role === 'manager' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'
            }`}>
              {u.role}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (output.meetings && Array.isArray(output.meetings)) {
    if (output.meetings.length === 0) return <p className="text-xs text-muted-foreground mt-1">No upcoming meetings scheduled.</p>;
    return (
      <div className="mt-2 space-y-1.5 text-xs max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
        {output.meetings.map((m: any, idx: number) => (
          <div key={idx} className="p-2.5 bg-background/90 rounded-md border shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="font-semibold text-foreground">{m.title}</p>
              <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                {m.date ? `${m.date} ` : ''}{m.start_time || m.time}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">Attendees: {m.attendees?.join(', ') || 'N/A'}</p>
          </div>
        ))}
      </div>
    );
  }

  if (output.tasks && Array.isArray(output.tasks)) {
    if (output.tasks.length === 0) return <p className="text-xs text-muted-foreground mt-1">No tasks or schedules found.</p>;
    return (
      <div className="mt-2 space-y-1.5 text-xs max-h-[300px] overflow-y-auto pr-1.5 scrollbar-thin">
        <div className="text-[10px] text-muted-foreground font-medium mb-1">Top {output.tasks.length} item(s):</div>
        {output.tasks.map((t: any, idx: number) => (
          <div key={idx} className="p-2.5 bg-background/90 rounded-md border shadow-2xs flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{t.title}</p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {t.priority} priority · Status: <span className="font-medium text-foreground">{t.status}</span>
              </p>
            </div>
            {t.due_date && (
              <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                {new Date(t.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (output.message || output.note) {
    return <p className="text-xs text-muted-foreground mt-1 font-medium bg-background/50 p-2 rounded border">{output.message || output.note}</p>;
  }

  return (
    <pre className="mt-1.5 text-[11px] bg-background/90 p-2 rounded-md overflow-x-auto font-mono border">
      {JSON.stringify(output, null, 2)}
    </pre>
  );
}

export function ChatPanel() {
  const { fetcher } = useAuth();
  
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        fetch: (input: RequestInfo | URL, init?: RequestInit) => fetcher(input.toString(), init),
      }),
    [fetcher]
  );

  const { messages, sendMessage, status, error, clearError, regenerate } = useChat({
    transport,
  });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === 'submitted' || status === 'streaming';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status, error]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input.trim() });
    setInput('');
  };

  const sendQuickPrompt = (promptText: string) => {
    if (isLoading) return;
    sendMessage({ text: promptText });
  };

  const handleRetry = () => {
    clearError();
    regenerate();
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-xl shadow-2xs overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b bg-muted/20 shrink-0 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Bot className="w-4.5 h-4.5 text-primary" />
            HR Assistant
          </h3>
          <p className="text-[11px] text-muted-foreground">Manage meetings, tasks, employee records & HR analytics.</p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-6">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 text-primary">
              <Bot className="w-6 h-6" />
            </div>
            <h4 className="font-semibold text-sm mb-1">Welcome! How can I assist you today?</h4>
            <p className="text-xs text-muted-foreground mb-5 max-w-[300px]">
              Ask me to schedule meetings, assign tasks, look up employee records, or view company HR analytics.
            </p>

            {/* Quick Action Chips */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-[360px]">
              <button
                onClick={() => sendQuickPrompt('schedule a meeting for tomorrow at 10am')}
                className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted text-xs text-left font-medium transition-colors flex items-center gap-2 group"
              >
                <Calendar className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
                <span>Schedule Meeting</span>
              </button>
              <button
                onClick={() => sendQuickPrompt('create a high priority task for an employee')}
                className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted text-xs text-left font-medium transition-colors flex items-center gap-2 group"
              >
                <PlusCircle className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                <span>Assign Task</span>
              </button>
              <button
                onClick={() => sendQuickPrompt('give me an HR analytics summary')}
                className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted text-xs text-left font-medium transition-colors flex items-center gap-2 group"
              >
                <BarChart3 className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                <span>HR Analytics</span>
              </button>
              <button
                onClick={() => sendQuickPrompt('fetch employee records and roles')}
                className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted text-xs text-left font-medium transition-colors flex items-center gap-2 group"
              >
                <Users className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                <span>Employee Records</span>
              </button>
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`px-3.5 py-2.5 rounded-2xl max-w-[92%] sm:max-w-[88%] ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-xs'
                    : 'bg-muted/70 text-foreground rounded-tl-xs border border-border/50'
                }`}
              >
                {m.parts?.map((part: any, i: number) => {
                  if (part.type === 'text') {
                    return <FormattedMessageText key={i} text={part.text} />;
                  }
                  if (part.type?.startsWith('tool-') || part.toolName || part.type === 'dynamic-tool') {
                    const rawName = part.toolName || part.type || 'Tool';
                    const output = part.output || part.result;
                    const isDone = part.state === 'output-available' || part.state === 'result' || part.state === 'done';
                    return (
                      <div key={i} className="mt-2 p-2.5 bg-background/80 rounded-xl text-xs border border-border shadow-2xs">
                        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 mb-1">
                          <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                            <Bot className="w-3.5 h-3.5 text-primary" />
                            {formatToolName(rawName)}
                          </span>
                          {isDone ? (
                            <span className="text-green-600 dark:text-green-400 font-semibold text-[10px]">✓ Loaded</span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Loader2 className="w-3 h-3 animate-spin text-primary" />
                              Fetching data…
                            </span>
                          )}
                        </div>
                        {isDone && <ToolResultRenderer output={output} />}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-muted/70 rounded-tl-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Assistant is thinking…</span>
            </div>
          </div>
        )}

        {/* Error Banner with Retry */}
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error.message || 'Something went wrong. Please try again.'}</span>
            </div>
            <button
              onClick={handleRetry}
              className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-[10px] font-semibold flex items-center gap-1 hover:opacity-90 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Footer */}
      <form onSubmit={handleSubmit} className="p-3 border-t bg-background shrink-0">
        <div className="relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="w-full pl-4 pr-11 py-2.5 rounded-full border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm placeholder:text-muted-foreground/70"
            disabled={isLoading}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            title="Send message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
