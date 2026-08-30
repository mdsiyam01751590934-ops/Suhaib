import { Router, Response } from 'express';
import os from 'os';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { countUserSessions, listUserSessionIds } from '../../server/storage/sessionStore.js';
import { TelegramStorageService } from '../../server/services/telegram/TelegramStorageService.js';

const router = Router();

/**
 * Admin System Status & Metrics
 */
router.get('/metrics', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const sessionCount = await countUserSessions();
    const sessionIds = await listUserSessionIds();

    const isTelegramConfigured = TelegramStorageService.isConfigured();

    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      status: 'operational',
      app: 'Shadowtech MTProto',
      architecture: 'Telegram MTProto Storage (Database-Free)',
      telegram: {
        apiConfigured: isTelegramConfigured,
        storageLayer: 'Telegram MTProto User Saved Messages',
      },
      sessions: {
        activeTelegramSessionsCount: sessionCount,
        sessionStorageLocation: '/data/sessions/*.session.enc (Encrypted at Rest with AES-256-GCM)',
        activeUserIdsMasked: sessionIds.map((id) => id.replace(/(.{3}).*(.{3})/, '$1***$2')),
      },
      system: {
        nodeVersion: process.version,
        platform: os.platform(),
        cpus: os.cpus().length,
        freeMemoryBytes: os.freemem(),
        totalMemoryBytes: os.totalmem(),
        processMemoryRssBytes: memoryUsage.rss,
        processMemoryHeapUsedBytes: memoryUsage.heapUsed,
        uptimeSeconds: Math.floor(uptime),
      },
    });
  } catch (err: any) {
    console.error('Admin metrics error:', err);
    res.status(500).json({ error: 'Failed to retrieve admin system metrics' });
  }
});

export default router;
