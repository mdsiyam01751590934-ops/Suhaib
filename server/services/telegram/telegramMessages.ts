import { TelegramClient, Api } from 'telegram';
import { decodeMetadata, encodeMetadata, isAppFile } from './telegramMetadata.js';

export interface TelegramCloudFile {
  id: string;
  telegramMessageId: number;
  name: string;
  fileName: string;
  size: number;
  fileSize: number;
  mimeType: string;
  folder: string;
  folderId: string;
  isStarred: boolean;
  favorite: boolean;
  isTrashed: boolean;
  trash: boolean;
  createdAt: string;
  updatedAt: string;
  storageTarget: string;
}

/**
 * Extracts CloudFile data from a Telegram message
 */
export function parseTelegramMessageToFile(message: any): TelegramCloudFile | null {
  if (!message || !message.media) return null;

  const caption = message.message || message.text || '';
  const isApp = isAppFile(caption);
  const meta = decodeMetadata(caption);

  let size = 0;
  let mimeType = meta.mimeType || 'application/octet-stream';
  let originalDocName = '';

  const media = message.media;
  if (media instanceof Api.MessageMediaDocument || media.document) {
    const doc = (media as any).document;
    if (doc) {
      size = Number(doc.size || 0);
      if (doc.mimeType) mimeType = doc.mimeType;

      if (doc.attributes) {
        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename || (attr as any).fileName) {
            originalDocName = (attr as any).fileName;
          }
        }
      }
    }
  } else if (media instanceof Api.MessageMediaPhoto) {
    mimeType = 'image/jpeg';
    size = 1024 * 500; // approximation if photo sizes are nested
  }

  // Infer MIME type from filename if missing or generic
  const rawFileName = isApp && meta.name ? meta.name : originalDocName || (caption && !isApp ? caption.slice(0, 40) : `file_${message.id}`);
  let detectedMime = meta.mimeType || mimeType;
  if (!detectedMime || detectedMime === 'application/octet-stream') {
    const lower = rawFileName.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) detectedMime = 'image/jpeg';
    else if (lower.endsWith('.png')) detectedMime = 'image/png';
    else if (lower.endsWith('.gif')) detectedMime = 'image/gif';
    else if (lower.endsWith('.webp')) detectedMime = 'image/webp';
    else if (lower.endsWith('.svg')) detectedMime = 'image/svg+xml';
    else if (lower.endsWith('.mp4') || lower.endsWith('.mkv') || lower.endsWith('.mov')) detectedMime = 'video/mp4';
    else if (lower.endsWith('.mp3') || lower.endsWith('.m4a') || lower.endsWith('.ogg')) detectedMime = 'audio/mpeg';
    else if (lower.endsWith('.pdf')) detectedMime = 'application/pdf';
  }

  const fileName = rawFileName;
  const dateIso = new Date((message.date || Math.floor(Date.now() / 1000)) * 1000).toISOString();

  return {
    id: message.id.toString(),
    telegramMessageId: message.id,
    name: fileName,
    fileName: fileName,
    size: size,
    fileSize: size,
    mimeType: detectedMime,
    folder: meta.folder || 'root',
    folderId: meta.folder || 'root',
    isStarred: meta.isStarred || false,
    favorite: meta.isStarred || false,
    isTrashed: meta.isTrashed || false,
    trash: meta.isTrashed || false,
    createdAt: dateIso,
    updatedAt: dateIso,
    storageTarget: 'Telegram Saved Messages (MTProto)',
  };
}

/**
 * Fetches all application cloud files from user's Telegram Saved Messages
 */
export async function getSavedCloudFiles(
  client: TelegramClient,
  options: {
    folder?: string;
    includeTrash?: boolean;
    onlyStarred?: boolean;
    search?: string;
    limit?: number;
  } = {}
): Promise<TelegramCloudFile[]> {
  const { folder, includeTrash = false, onlyStarred = false, search, limit = 200 } = options;

  const files: TelegramCloudFile[] = [];

  try {
    // Get messages from Saved Messages ('me')
    const messages = await client.getMessages('me', {
      limit: limit,
    });

    for (const msg of messages) {
      const cloudFile = parseTelegramMessageToFile(msg);
      if (!cloudFile) continue;

      // Filter by trash
      if (!includeTrash && cloudFile.isTrashed) continue;
      if (includeTrash && !cloudFile.isTrashed) continue;

      // Filter by starred
      if (onlyStarred && !cloudFile.isStarred) continue;

      // Filter by folder
      if (folder && folder !== 'all') {
        const fileFolder = (cloudFile.folder || 'root').toLowerCase();
        const targetFolder = folder.toLowerCase();
        if (fileFolder !== targetFolder) continue;
      }

      // Filter by search
      if (search && search.trim()) {
        const query = search.toLowerCase();
        const matchName = cloudFile.name.toLowerCase().includes(query);
        const matchFolder = (cloudFile.folder || '').toLowerCase().includes(query);
        const matchMime = (cloudFile.mimeType || '').toLowerCase().includes(query);
        if (!matchName && !matchFolder && !matchMime) continue;
      }

      files.push(cloudFile);
    }
  } catch (err) {
    console.error('Error fetching Telegram Saved Messages:', err);
  }

  // Sort latest first
  return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Retrieves a single file message by ID
 */
export async function getSingleSavedCloudFile(
  client: TelegramClient,
  messageId: number
): Promise<TelegramCloudFile | null> {
  const messages = await client.getMessages('me', { ids: [messageId] });
  if (!messages || messages.length === 0) return null;
  return parseTelegramMessageToFile(messages[0]);
}

/**
 * Updates metadata of a Telegram file message (e.g. rename, move, star, trash)
 */
export async function updateFileMetadata(
  client: TelegramClient,
  messageId: number,
  updates: {
    name?: string;
    folder?: string;
    isStarred?: boolean;
    isTrashed?: boolean;
  }
): Promise<TelegramCloudFile> {
  const messages = await client.getMessages('me', { ids: [messageId] });
  if (!messages || messages.length === 0 || !messages[0]) {
    throw new Error(`Telegram message #${messageId} not found in Saved Messages`);
  }

  const msg = messages[0];
  const currentMeta = decodeMetadata(msg.message || msg.text || '');

  const newMeta = {
    name: updates.name !== undefined ? updates.name : currentMeta.name,
    folder: updates.folder !== undefined ? updates.folder : currentMeta.folder,
    isStarred: updates.isStarred !== undefined ? updates.isStarred : currentMeta.isStarred,
    isTrashed: updates.isTrashed !== undefined ? updates.isTrashed : currentMeta.isTrashed,
    mimeType: currentMeta.mimeType,
  };

  const newCaption = encodeMetadata(newMeta);

  await client.editMessage('me', {
    message: messageId,
    text: newCaption,
  });

  const updatedMsg = await client.getMessages('me', { ids: [messageId] });
  const parsed = parseTelegramMessageToFile(updatedMsg[0]);
  if (!parsed) {
    throw new Error('Failed to parse updated Telegram file');
  }
  return parsed;
}

/**
 * Derives unique virtual folders from all user's files in Telegram
 */
export async function getVirtualFolders(client: TelegramClient): Promise<{ id: string; name: string; fileCount: number; size: number }[]> {
  const files = await getSavedCloudFiles(client, { includeTrash: false, limit: 300 });

  const folderMap = new Map<string, { count: number; size: number }>();

  for (const file of files) {
    const f = file.folder || 'root';
    if (f && f !== 'root') {
      const curr = folderMap.get(f) || { count: 0, size: 0 };
      curr.count += 1;
      curr.size += file.size;
      folderMap.set(f, curr);
    }
  }

  const result: { id: string; name: string; fileCount: number; size: number }[] = [];
  for (const [name, stats] of folderMap.entries()) {
    result.push({
      id: name,
      name: name,
      fileCount: stats.count,
      size: stats.size,
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
