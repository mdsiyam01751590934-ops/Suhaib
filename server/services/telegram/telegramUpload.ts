import { TelegramClient, Api } from 'telegram';
import { CustomFile } from 'telegram/client/uploads.js';
import { encodeMetadata } from './telegramMetadata.js';

export interface TelegramUploadResult {
  messageId: number;
  fileId: string;
  accessHash: string;
  mimeType: string;
  size: number;
  name: string;
  folder: string;
  isStarred: boolean;
  isTrashed: boolean;
  thumbnailBase64?: string | null;
}

/**
 * Uploads a file buffer directly to the user's Telegram Saved Messages ('me')
 * with robust metadata encoding.
 */
export async function uploadToSavedMessages(
  client: TelegramClient,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  folder: string = 'root',
  onProgress?: (progress: number) => void
): Promise<TelegramUploadResult> {
  const customFile = new CustomFile(fileName, buffer.length, '', buffer);

  const caption = encodeMetadata({
    name: fileName,
    folder: folder || 'root',
    isStarred: false,
    isTrashed: false,
    mimeType: mimeType || 'application/octet-stream',
  });

  const message: any = await client.sendFile('me', {
    file: customFile,
    caption,
    forceDocument: true,
    progressCallback: (progress: number) => {
      if (onProgress) {
        onProgress(Math.round(progress * 100));
      }
    },
  });

  const media = message.media as Api.MessageMediaDocument;
  const doc = media?.document as Api.Document;

  const fileId = doc?.id?.toString() || message.id.toString();
  const accessHash = doc?.accessHash?.toString() || '';
  const size = Number(doc?.size || buffer.length);
  const detectedMime = doc?.mimeType || mimeType || 'application/octet-stream';

  return {
    messageId: message.id,
    fileId,
    accessHash,
    mimeType: detectedMime,
    size,
    name: fileName,
    folder: folder || 'root',
    isStarred: false,
    isTrashed: false,
    thumbnailBase64: null,
  };
}
