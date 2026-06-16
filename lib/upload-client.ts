export interface Attachment {
  url: string;
  name: string;
  size: number;
  mime_type: string;
  bucket_path: string;
}

/**
 * Uploads a file using the proxy upload endpoints and returns metadata.
 */
export async function uploadFile(
  file: File,
  channelType: 'group' | 'subgroup' | 'profile' | 'dm',
  channelId: string,
  authHeaders: () => Record<string, string>
): Promise<Attachment> {
  // 1. Get signed upload URL
  const urlRes = await fetch('/api/upload', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
      channel_type: channelType,
      channel_id: channelId,
    }),
  });
  if (!urlRes.ok) {
    const errorData = await urlRes.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to get upload URL');
  }
  const { signed_url, path } = await urlRes.json();

  // 2. Upload directly to Supabase Storage
  const uploadRes = await fetch(signed_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error('Upload failed');

  // 3. Get download URL
  const dlRes = await fetch(`/api/upload?path=${encodeURIComponent(path)}`, {
    headers: authHeaders(),
  });
  if (!dlRes.ok) throw new Error('Failed to get download URL');
  const { url } = await dlRes.json();

  return { url, name: file.name, size: file.size, mime_type: file.type, bucket_path: path };
}
