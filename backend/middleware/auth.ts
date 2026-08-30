import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserSession, listUserSessionIds } from '../../server/storage/sessionStore.js';

const JWT_SECRET = process.env.SESSION_SECRET || 'unlim-cloud-secret-token-key-2026';

export interface AuthenticatedUser {
  userId: string;
  telegramUserId?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
  role: 'USER' | 'ADMIN';
  sessionToken?: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  encryptedSession?: string | null;
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const queryToken = (req.query.token || req.query.auth_token) as string | undefined;
  const token =
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) ||
    queryToken ||
    req.cookies?.token;

  if (!token) {
    // If no token is provided, check if there is an active session in local encrypted storage (single user / active session)
    try {
      const activeSessionIds = await listUserSessionIds();
      if (activeSessionIds.length >= 1) {
        const defaultUserId = activeSessionIds[0];
        const encryptedSession = await getUserSession(defaultUserId);
        if (encryptedSession) {
          req.user = {
            userId: defaultUserId,
            role: 'USER',
            sessionToken: encryptedSession,
          };
          req.encryptedSession = encryptedSession;
          return next();
        }
      }
    } catch (fallbackErr) {
      console.error('Session fallback check error:', fallbackErr);
    }

    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;

    // Load encrypted session statelessly from JWT first, fallback to /data/sessions
    if (decoded.sessionToken) {
      req.encryptedSession = decoded.sessionToken;
    } else if (decoded.userId) {
      const encryptedSession = await getUserSession(decoded.userId);
      req.encryptedSession = encryptedSession;
    }

    next();
  } catch (err) {
    // If token invalid, try active user session fallback
    try {
      const activeSessionIds = await listUserSessionIds();
      if (activeSessionIds.length >= 1) {
        const defaultUserId = activeSessionIds[0];
        const encryptedSession = await getUserSession(defaultUserId);
        if (encryptedSession) {
          req.user = {
            userId: defaultUserId,
            role: 'USER',
            sessionToken: encryptedSession,
          };
          req.encryptedSession = encryptedSession;
          return next();
        }
      }
    } catch (fallbackErr) {
      // ignore
    }

    res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

export function generateToken(payload: AuthenticatedUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

