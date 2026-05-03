'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Hash, Folder, Users, MessageSquare, Building2 } from 'lucide-react';
import { useDebounce } from '@/lib/hooks/use-debounce';

interface SearchResult {
  type: 'team' | 'project' | 'group' | 'subgroup' | 'message';
  id: string;
  title: string;
  subtitle?: string;
  url: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  team: <Building2 className="w-4 h-4 text-muted-foreground" />,
  project: <Folder className="w-4 h-4 text-muted-foreground" />,
  group: <Hash className="w-4 h-4 text-muted-foreground" />,
  subgroup: <Hash className="w-4 h-4 text-muted-foreground opacity-60" />,
  message: <MessageSquare className="w-4 h-4 text-muted-foreground" />,
};

const TYPE_LABELS: Record<string, string> = {
  team: 'Teams',
  project: 'Projects',
  group: 'Channels',
  subgroup: 'Sub-channels',
  message: 'Messages',
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const { authHeaders } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 250);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
      }
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);
  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const handleSelect = (url: string) => {
    router.push(url);
    onOpenChange(false);
  };

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden max-w-xl gap-0">
        {/* sr-only title satisfies Radix accessibility requirement */}
        <DialogTitle className="sr-only">Search workspace</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-3">
          <CommandInput
            placeholder="Search teams, channels, projects, messages…"
            value={query}
            onValueChange={setQuery}
            className="h-12 text-sm"
          />
          <CommandList className="max-h-[400px]">
            {isLoading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
            )}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <CommandEmpty>No results for &ldquo;{query}&rdquo;</CommandEmpty>
            )}
            {!isLoading && query.length < 2 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Start typing to search across your workspace
              </div>
            )}

            {Object.entries(grouped).map(([type, items], i) => (
              <div key={type}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={TYPE_LABELS[type]}>
                  {items.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.url}
                      onSelect={() => handleSelect(item.url)}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    >
                      {TYPE_ICONS[type]}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            ))}
          </CommandList>
          <div className="border-t border-border px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd> to open</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd> to close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
