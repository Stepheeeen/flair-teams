import { FileIcon, Download } from 'lucide-react';

export interface Attachment {
  url: string;
  name: string;
  size: number;
  mime_type: string;
  bucket_path: string;
}

interface AttachmentRendererProps {
  attachment: Attachment;
  token: string | null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachmentRenderer({ attachment, token }: AttachmentRendererProps) {
  const fileUrl = `/api/file?path=${encodeURIComponent(attachment.bucket_path || '')}&token=${token || ''}`;

  if (attachment.mime_type?.startsWith('image/')) {
    return (
      <div className="mt-1 relative rounded-xl overflow-hidden border border-border inline-block max-w-[280px] sm:max-w-sm group/file">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={attachment.name}
          className="w-full h-auto object-cover max-h-60"
        />
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded text-white backdrop-blur-sm transition-colors opacity-0 group-hover/file:opacity-100 group-hover:opacity-100"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/40 hover:bg-muted transition-colors group/file mt-1 max-w-full"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: '#FFC078' }}
      >
        <FileIcon className="w-4 h-4 text-[#1B1C1B]" />
      </div>
      <div className="min-w-0 overflow-hidden">
        <p className="text-sm font-semibold truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
      </div>
      <Download className="w-4 h-4 text-muted-foreground group-hover/file:text-foreground ml-2 flex-shrink-0" />
    </a>
  );
}
