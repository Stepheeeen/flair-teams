'use client';

import { useState, useEffect } from 'react';
import { Bot, X, Maximize2, Minimize2 } from 'lucide-react';
import { ChatPanel } from './chat-panel';
import { useAuth } from '@/lib/auth-context';
import { useAssistant } from './assistant-context';
import { isManagerOrAbove } from '@/lib/client-roles';
import { usePathname } from 'next/navigation';

export function GlobalAssistantWidget() {
  const { isOpen, setIsOpen } = useAssistant();
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  // Only show for admins and managers
  if (!isManagerOrAbove(user)) {
    return null;
  }

  const widthClass = isExpanded ? 'w-full sm:w-[680px]' : 'w-full sm:w-[480px] md:w-[540px]';

  return (
    <>

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
          className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
