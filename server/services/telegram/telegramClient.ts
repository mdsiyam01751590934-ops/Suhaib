import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { decryptSession } from './telegramSession.js';

export function getTelegramConfig() {
  const apiIdStr = process.env.TELEGRAM_API_ID;
  const apiHash = process.env.TELEGRAM_API_HASH;
  
  const apiId = apiIdStr ? parseInt(apiIdStr, 10) : 0;
  
  return {
    apiId,
    apiHash: apiHash || '',
    isConfigured: !!(apiId && apiHash && !isNaN(apiId)),
  };
}

// Active client pool by userId
const clientPool = new Map<string, { client: TelegramClient; lastUsed: number }>();
const connectionPromises = new Map<string, Promise<TelegramClient | null>>();

// Cleanup stale clients after 24 hours of inactivity
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of clientPool.entries()) {
    if (now - entry.lastUsed > 24 * 60 * 60 * 1000) {
      try {
        entry.client.disconnect();
      } catch (e) {
        // ignore
      }
      clientPool.delete(userId);
    }
  }
}, 60 * 60 * 1000);

/**
 * Creates or retrieves an active TelegramClient instance for a user
 */
export async function getUserTelegramClient(
  userId: string,
  encryptedSession?: string | null
): Promise<TelegramClient | null> {
  const pending = connectionPromises.get(userId);
  if (pending) {
    return pending;
  }

  const connectTask = async () => {
    const config = getTelegramConfig();
    if (!config.isConfigured) {
      return null;
    }

    // Check if we have an active connected client in the pool
    const existing = clientPool.get(userId);
    if (existing) {
      try {
        if (existing.client.connected) {
          existing.lastUsed = Date.now();
          return existing.client;
        }
        await existing.client.connect();
        existing.lastUsed = Date.now();
        return existing.client;
      } catch (e) {
        clientPool.delete(userId);
      }
    }

    if (!encryptedSession) {
      return null;
    }

    const sessionString = decryptSession(encryptedSession);
    if (!sessionString) {
      return null;
    }

    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
      connectionRetries: 5,
      useWSS: false,
      autoReconnect: true,
    });

    try {
      await client.connect();
      clientPool.set(userId, { client, lastUsed: Date.now() });
      return client;
    } catch (err) {
      console.error(`Failed to connect Telegram client for user ${userId}:`, err);
      return null;
    }
  };

  const promise = connectTask();
  connectionPromises.set(userId, promise);
  
  try {
    return await promise;
  } finally {
    connectionPromises.delete(userId);
  }
}

/**
 * Disconnects and removes a user client from the pool
 */
export async function closeUserTelegramClient(userId: string): Promise<void> {
  const existing = clientPool.get(userId);
  if (existing) {
    try {
      await existing.client.disconnect();
    } catch (e) {
      // ignore
    }
    clientPool.delete(userId);
  }
}
