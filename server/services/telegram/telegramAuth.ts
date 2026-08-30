import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { computeCheck } from 'telegram/Password.js';
import { getTelegramConfig } from './telegramClient.js';
import { encryptSession, decryptSession } from './telegramSession.js';

// Temporary map for pending auth states (phoneCodeHash & temp client)
interface PendingAuth {
  phoneNumber: string;
  phoneCodeHash: string;
  client: TelegramClient;
  createdAt: number;
}

const pendingAuths = new Map<string, PendingAuth>();

// Clean up stale pending auths after 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [authId, data] of pendingAuths.entries()) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      try {
        data.client.disconnect();
      } catch (e) {}
      pendingAuths.delete(authId);
    }
  }
}, 2 * 60 * 1000);

export async function startTelegramAuth(phoneNumber: string): Promise<{
  authId: string;
  phoneCodeHash: string;
  isCodeViaApp?: boolean;
}> {
  const config = getTelegramConfig();
  if (!config.isConfigured) {
    throw new Error('TELEGRAM_API_ID and TELEGRAM_API_HASH are not configured in environment variables');
  }

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  let formattedPhone = phoneNumber.trim().replace(/[\s\-\(\)]/g, '').replace(/^[+]/, '');

  if (formattedPhone.startsWith('00')) {
    formattedPhone = formattedPhone.slice(2);
  }

  // Handle local Bangladesh numbers starting with 01
  if (/^01[3-9]\d{8}$/.test(formattedPhone)) {
    formattedPhone = '880' + formattedPhone.slice(1);
  }

  // Handle accidental 88001...
  if (formattedPhone.startsWith('88001')) {
    formattedPhone = '8801' + formattedPhone.slice(5);
  }

  try {
    const result = await client.sendCode(
      {
        apiId: config.apiId,
        apiHash: config.apiHash,
      },
      `+${formattedPhone}`
    );

    const authId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    
    pendingAuths.set(authId, {
      phoneNumber: `+${formattedPhone}`,
      phoneCodeHash: result.phoneCodeHash,
      client,
      createdAt: Date.now(),
    });

    return {
      authId,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: (result as any).isCodeViaApp,
    };
  } catch (err: any) {
    try {
      await client.disconnect();
    } catch (e) {}
    console.error('Telegram sendCode error:', err);
    throw new Error(err.message || 'Failed to send Telegram verification code');
  }
}

export async function verifyTelegramCode(
  authId: string,
  code: string
): Promise<{
  needs2FA?: boolean;
  user?: {
    telegramUserId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  encryptedSession?: string;
}> {
  const pending = pendingAuths.get(authId);
  if (!pending) {
    throw new Error('Authentication session expired or not found. Please request a new code.');
  }

  const { client, phoneNumber, phoneCodeHash } = pending;

  try {
    const userResult: any = await client.invoke(
      new Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash,
        phoneCode: code.trim(),
      })
    );

    const sessionString = (client.session as StringSession).save();
    const encryptedSession = encryptSession(sessionString);

    const me: any = await client.getMe();
    
    // Auth complete, remove from pending
    pendingAuths.delete(authId);

    const u = me || userResult?.user;

    return {
      needs2FA: false,
      user: {
        telegramUserId: u?.id?.toString() || '',
        username: u?.username || null,
        firstName: u?.firstName || null,
        lastName: u?.lastName || null,
        phone: u?.phone ? `+${u.phone}` : phoneNumber,
      },
      encryptedSession,
    };
  } catch (err: any) {
    if (
      err.errorMessage === 'SESSION_PASSWORD_NEEDED' ||
      err.message?.includes('SESSION_PASSWORD_NEEDED') ||
      err.message?.includes('2FA') ||
      err.message?.includes('password')
    ) {
      return { needs2FA: true };
    }
    console.error('Telegram signIn error:', err);
    throw new Error(err.errorMessage || err.message || 'Invalid verification code');
  }
}

export async function verifyTelegram2FA(
  authId: string,
  password: string
): Promise<{
  user: {
    telegramUserId: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
  encryptedSession: string;
}> {
  const pending = pendingAuths.get(authId);
  if (!pending) {
    throw new Error('Authentication session expired. Please request a new code.');
  }

  const { client, phoneNumber } = pending;

  try {
    const passwordObj = await client.invoke(new Api.account.GetPassword());
    const passwordCheck = await computeCheck(passwordObj, password.trim());
    
    const userResult: any = await client.invoke(
      new Api.auth.CheckPassword({
        password: passwordCheck,
      })
    );

    const sessionString = (client.session as StringSession).save();
    const encryptedSession = encryptSession(sessionString);

    const me: any = await client.getMe();
    
    pendingAuths.delete(authId);

    const u = me || userResult?.user;

    return {
      user: {
        telegramUserId: u?.id?.toString() || '',
        username: u?.username || null,
        firstName: u?.firstName || null,
        lastName: u?.lastName || null,
        phone: u?.phone ? `+${u.phone}` : phoneNumber,
      },
      encryptedSession,
    };
  } catch (err: any) {
    console.error('Telegram 2FA error:', err);
    throw new Error(err.errorMessage || err.message || 'Invalid 2FA password');
  }
}

export async function revokeTelegramSession(encryptedSession: string): Promise<void> {
  if (!encryptedSession) return;
  const config = getTelegramConfig();
  if (!config.isConfigured) return;

  try {
    const sessionString = decryptSession(encryptedSession);
    const stringSession = new StringSession(sessionString);
    const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
      connectionRetries: 1,
    });
    await client.connect();
    await client.invoke(new Api.auth.LogOut());
    await client.disconnect();
  } catch (err) {
    console.error('Error logging out from Telegram:', err);
  }
}
