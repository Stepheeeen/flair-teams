'use client';

import { ChatPanel } from '@/components/ai/chat-panel';
import { useAuth } from '@/lib/auth-context';
import { Bot } from 'lucide-react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AssistantPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        router.push('/');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null; // Layout preloader or redirect will handle this
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/20">
      <div className="p-6 pb-2 border-b">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-8 h-8 text-primary" />
          HR Assistant
        </h1>
        <p className="text-muted-foreground mt-1">
          Your dedicated AI workspace for schedules, meetings, and HR operations.
        </p>
      </div>
      <div className="flex-1 p-6 max-w-5xl mx-auto w-full h-full">
        {/* We reuse the ChatPanel, but maybe pass a prop to make it full height without border radius if desired */}
        <div className="h-[calc(100vh-12rem)] w-full shadow-md rounded-xl overflow-hidden border">
          <ChatPanel />
        </div>
      </div>
    </div>
  );
}
