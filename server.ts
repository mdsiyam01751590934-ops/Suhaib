import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './backend/routes/auth.js';
import fileRoutes from './backend/routes/files.js';
import folderRoutes from './backend/routes/folders.js';
import statsRoutes from './backend/routes/stats.js';
import adminRoutes from './backend/routes/admin.js';
import { ensureSessionStorageDirectory } from './server/storage/sessionStore.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust proxy for rate limiting (since we're behind a reverse proxy)
  app.set('trust proxy', 1);

  // Initialize secure /data/sessions directory
  ensureSessionStorageDirectory();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // Rate limiter for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
    validate: { xForwardedForHeader: false, default: true },
    keyGenerator: (req) => {
      return (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';
    }
  });

  // API Routes
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/user', authRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/admin', adminRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'Shadowtech MTProto',
      storageEngine: 'Telegram MTProto API',
      database: 'NONE (100% MTProto Saved Messages & /data/sessions encrypted auth)',
      timestamp: new Date().toISOString(),
    });
  });

  // Serve Vite or Static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Shadowtech MTProto] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
