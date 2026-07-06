'use client';

import { useState } from 'react';
import { Bot, X, Maximize2, Minimize2 } from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { useAuth } from '@/lib/auth-context';

export function GlobalAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  // Only show for admins and managers
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return null;
  }

  const widthClass = isExpanded ? 'w-full sm:w-[680px]' : 'w-full sm:w-[480px] md:w-[540px]';

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 lg:bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 z-50 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        title="Open HR Assistant"
      >
        <Bot className="w-6 h-6" />
      </button>

      {/* Slide-over Panel */}
      <div
        className={`fixed inset-y-0 right-0 ${widthClass} bg-background shadow-2xl z-50 flex flex-col transform transition-all duration-300 ease-in-out border-l border-border ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ height: 'var(--visual-viewport-height, 100dvh)', top: 'var(--visual-viewport-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">HR Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors hidden sm:block"
              title={isExpanded ? 'Collapse width' : 'Expand width'}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              title="Close panel"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 p-3 pt-2">
          <ChatPanel />
        </div>
      </div>

      {/* Backdrop for mobile & expanded view */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
