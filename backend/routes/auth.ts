import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { TelegramStorageService } from '../../server/services/telegram/TelegramStorageService.js';
import { saveUserSession, deleteUserSession, getUserSession } from '../../server/storage/sessionStore.js';
import { authenticateToken, generateToken, AuthRequest, AuthenticatedUser } from '../middleware/auth.js';

const router = Router();

function cleanPhoneNumber(input: string): string {
  if (!input) return '';
  let cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
  }

  // Handle local Bangladesh 11-digit numbers (e.g. 01642323871)
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    cleaned = '+880' + cleaned.slice(1);
  }

  // Handle accidental +88001... or 88001...
  if (cleaned.startsWith('+88001')) {
    cleaned = '+8801' + cleaned.slice(6);
  } else if (cleaned.startsWith('88001')) {
    cleaned = '+8801' + cleaned.slice(5);
  } else if (cleaned.startsWith('8801') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('0')) {
      cleaned = '+880' + cleaned.slice(1);
    } else {
      cleaned = '+880' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Step 1: Start Telegram login with phone number
 */
router.post('/telegram/start', async (req, res) => {
  const rawPhone = req.body.phone || req.body.phoneNumber || req.body.number;
  if (!rawPhone || typeof rawPhone !== 'string') {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const phone = cleanPhoneNumber(rawPhone);

  if (!TelegramStorageService.isConfigured()) {
    return res.status(503).json({
      error: 'Telegram MTProto API is not configured. Please set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env',
      code: 'TELEGRAM_NOT_CONFIGURED',
    });
  }

  try {
    const result = await TelegramStorageService.startLogin(phone);
    res.json({
      success: true,
      authId: result.authId,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp,
      formattedPhone: phone,
      message: 'Verification code sent to your Telegram account / phone.',
    });
  } catch (err: any) {
    console.error('Telegram startLogin error:', err);
    res.status(400).json({
      error: err.message || 'Failed to send Telegram login code. Please check your phone number.',
    });
  }
});

/**
 * Step 2: Verify Telegram code
 */
router.post('/telegram/verify', async (req, res) => {
  const { authId, code } = req.body;
  if (!authId || !code) {
    return res.status(400).json({ error: 'authId and code are required' });
  }

  try {
    const result = await TelegramStorageService.verifyCode(authId, code);

    if (result.needs2FA) {
      return res.json({
        needs2FA: true,
        message: 'Two-Step Verification (2FA) is enabled on this account. Please enter your password.',
      });
    }

    if (!result.user || !result.encryptedSession) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    const userId = `tg_${result.user.telegramUserId}`;
    
    // Save encrypted session to /data/sessions/user_<userId>.session.enc
    await saveUserSession(userId, result.encryptedSession);

    const userPayload: AuthenticatedUser = {
      userId,
      telegramUserId: result.user.telegramUserId,
      username: result.user.username,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      phone: result.user.phone,
      role: 'USER',
      sessionToken: result.encryptedSession,
    };

    const token = generateToken(userPayload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: userPayload,
      token,
      isTelegramConnected: true,
    });
  } catch (err: any) {
    console.error('Telegram verify error:', err);
    res.status(400).json({
      error: err.message || 'Invalid verification code. Please try again.',
    });
  }
});

/**
 * Step 3: Verify 2FA password
 */
router.post('/telegram/verify-2fa', async (req, res) => {
  const { authId, password } = req.body;
  if (!authId || !password) {
    return res.status(400).json({ error: 'authId and password are required' });
  }

  try {
    const result = await TelegramStorageService.verify2FA(authId, password);
    const userId = `tg_${result.user.telegramUserId}`;

    // Save encrypted session to /data/sessions/user_<userId>.session.enc
    await saveUserSession(userId, result.encryptedSession);

    const userPayload: AuthenticatedUser = {
      userId,
      telegramUserId: result.user.telegramUserId,
      username: result.user.username,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      phone: result.user.phone,
      role: 'USER',
      sessionToken: result.encryptedSession,
    };

    const token = generateToken(userPayload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: userPayload,
      token,
      isTelegramConnected: true,
    });
  } catch (err: any) {
    console.error('Telegram 2FA error:', err);
    res.status(400).json({
      error: err.message || 'Invalid 2FA password. Please try again.',
    });
  }
});

// Alias for 2FA endpoint
router.post('/telegram/2fa', async (req, res) => {
  const { authId, password } = req.body;
  if (!authId || !password) {
    return res.status(400).json({ error: 'authId and password are required' });
  }

  try {
    const result = await TelegramStorageService.verify2FA(authId, password);
    const userId = `tg_${result.user.telegramUserId}`;

    await saveUserSession(userId, result.encryptedSession);

    const userPayload: AuthenticatedUser = {
      userId,
      telegramUserId: result.user.telegramUserId,
      username: result.user.username,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      phone: result.user.phone,
      role: 'USER',
      sessionToken: result.encryptedSession,
    };

    const token = generateToken(userPayload);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      user: userPayload,
      token,
      isTelegramConnected: true,
    });
  } catch (err: any) {
    console.error('Telegram 2FA error:', err);
    res.status(400).json({
      error: err.message || 'Invalid 2FA password. Please try again.',
    });
  }
});

/**
 * Get Telegram connection status
 */
router.get('/telegram-status', authenticateToken, async (req: AuthRequest, res: Response) => {
  const isConnected = !!req.encryptedSession;
  res.json({
    isConnected,
    isConfigured: TelegramStorageService.isConfigured(),
    user: req.user || null,
  });
});

/**
 * Admin Login Endpoint
 */
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@shadowtech.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';

  if (
    !email ||
    !password ||
    email.trim().toLowerCase() !== adminEmail ||
    password !== adminPassword
  ) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const adminUser: AuthenticatedUser = {
    userId: 'admin_root',
    email: adminEmail,
    username: 'admin',
    firstName: 'System',
    lastName: 'Administrator',
    role: 'ADMIN',
  };

  const token = generateToken(adminUser);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: adminUser,
    token,
    isTelegramConnected: false,
  });
});

/**
 * Get current authenticated user profile
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const hasSession = !!req.encryptedSession;

  res.json({
    user: req.user,
    isTelegramConnected: hasSession,
    telegramConfigured: TelegramStorageService.isConfigured(),
  });
});

/**
 * Disconnect Telegram (deletes encrypted session at rest)
 */
router.post('/disconnect-telegram', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

  try {
    if (req.encryptedSession) {
      await TelegramStorageService.revokeSession(req.encryptedSession);
    }
    await TelegramStorageService.disconnect(req.user.userId);
    await deleteUserSession(req.user.userId);

    res.json({ success: true, message: 'Telegram account disconnected and session deleted at rest.' });
  } catch (err) {
    console.error('Error disconnecting Telegram:', err);
    res.status(500).json({ error: 'Failed to disconnect Telegram' });
  }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;
