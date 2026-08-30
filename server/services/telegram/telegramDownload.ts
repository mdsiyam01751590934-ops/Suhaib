import { TelegramClient } from 'telegram';
import { Response } from 'express';

/**
 * Downloads media from Telegram Saved Messages and streams directly to Express Response or returns Buffer
 */
export async function downloadFromSavedMessages(
  client: TelegramClient,
  messageId: number,
  res?: Response
): Promise<Buffer | void> {
  const messages = await client.getMessages('me', {
    ids: [messageId],
  });

  if (!messages || messages.length === 0 || !messages[0]) {
    throw new Error(`Telegram message #${messageId} not found in Saved Messages`);
  }

  const message = messages[0];
  if (!message.media) {
    throw new Error(`Telegram message #${messageId} does not contain any file or media`);
  }

  if (res) {
    try {
      // First try downloading buffer directly with client.downloadMedia for maximum compatibility across photo, doc, video
      const buffer = await client.downloadMedia(message, {});
      if (buffer && !res.writableEnded) {
        const finalBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
        res.end(finalBuf);
        return;
      }
    } catch (directErr) {
      console.warn(`Direct downloadMedia failed for message #${messageId}, attempting iterDownload:`, directErr);
    }

    try {
      // Stream chunks directly to response
      for await (const chunk of client.iterDownload({
        file: message.media as any,
        requestSize: 512 * 1024, // 512KB chunks
      })) {
        if (res.writableEnded) break;
        res.write(chunk);
      }
      if (!res.writableEnded) {
        res.end();
      }
      return;
    } catch (iterErr) {
      console.error(`Streaming iterDownload also failed for message #${messageId}:`, iterErr);
      throw iterErr;
    }
  }

  // If no response stream provided, download whole buffer
  const buffer = await client.downloadMedia(message, {});

  if (!buffer) {
    throw new Error('Failed to retrieve media buffer from Telegram');
  }

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
}

/**
 * Deletes a file message from Telegram Saved Messages
 */
export async function deleteFromSavedMessages(
  client: TelegramClient,
  messageId: number
): Promise<boolean> {
  try {
    await client.deleteMessages('me', [messageId], {
      revoke: true,
    });
    return true;
  } catch (err) {
    console.error(`Failed to delete Telegram message #${messageId}:`, err);
    return false;
  }
}

