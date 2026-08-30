import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');

// Ensure /data/sessions directory exists
export function ensureSessionStorageDirectory(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true, mode: 0o700 });
    }
  } catch (err) {
    console.error('Failed to create secure session storage directory:', err);
  }
}

// Initialize directory on module load
ensureSessionStorageDirectory();

function getSessionFilePath(userId: string): string {
  // Sanitize userId to prevent directory traversal
  const sanitizedId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(SESSIONS_DIR, `user_${sanitizedId}.session.enc`);
}

/**
 * Saves encrypted Telegram session to /data/sessions/user_<userId>.session.enc
 */
export async function saveUserSession(userId: string, encryptedSession: string): Promise<void> {
  ensureSessionStorageDirectory();
  const filePath = getSessionFilePath(userId);
  await fs.promises.writeFile(filePath, encryptedSession, { encoding: 'utf8', mode: 0o600 });
}

/**
 * Reads encrypted Telegram session from /data/sessions/user_<userId>.session.enc
 */
export async function getUserSession(userId: string): Promise<string | null> {
  ensureSessionStorageDirectory();
  const filePath = getSessionFilePath(userId);
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data.trim() || null;
  } catch (err) {
    console.error(`Error reading session file for user ${userId}:`, err);
    return null;
  }
}

/**
 * Deletes user encrypted session file upon disconnection
 */
export async function deleteUserSession(userId: string): Promise<void> {
  ensureSessionStorageDirectory();
  const filePath = getSessionFilePath(userId);
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err) {
    console.error(`Error deleting session file for user ${userId}:`, err);
  }
}

/**
 * Counts total active encrypted Telegram session files for admin statistics
 */
export async function countUserSessions(): Promise<number> {
  ensureSessionStorageDirectory();
  try {
    const files = await fs.promises.readdir(SESSIONS_DIR);
    return files.filter((f) => f.endsWith('.session.enc')).length;
  } catch (err) {
    return 0;
  }
}

/**
 * Lists all session user IDs for admin metrics (without exposing keys or sessions)
 */
export async function listUserSessionIds(): Promise<string[]> {
  ensureSessionStorageDirectory();
  try {
    const files = await fs.promises.readdir(SESSIONS_DIR);
    return files
      .filter((f) => f.startsWith('user_') && f.endsWith('.session.enc'))
      .map((f) => f.replace(/^user_/, '').replace(/\.session\.enc$/, ''));
  } catch (err) {
    return [];
  }
}
