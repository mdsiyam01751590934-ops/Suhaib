import { Router, Response } from 'express';
import multer from 'multer';
import { TelegramStorageService } from '../../server/services/telegram/TelegramStorageService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Multer in-memory storage — NEVER writes permanent files to disk!
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file chunk
  },
});

/**
 * List files from Telegram Saved Messages
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const folder = req.query.folder as string | undefined;
  const folderId = req.query.folderId as string | undefined;
  const targetFolder = folder || folderId;
  const search = req.query.search as string | undefined;
  const onlyStarred = req.query.onlyStarred === 'true' || req.query.favorite === 'true';
  const includeTrash = req.query.includeTrash === 'true' || req.query.trash === 'true';

  try {
    const files = await TelegramStorageService.getMessages(req.user.userId, req.encryptedSession, {
      folder: targetFolder === 'root' ? 'root' : targetFolder,
      search,
      onlyStarred,
      includeTrash,
    });

    res.json(files);
  } catch (err: any) {
    console.error('Error fetching files from Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch files from Telegram' });
  }
});

/**
 * Upload a file directly into user's Telegram Saved Messages
 */
router.post('/upload', authenticateToken, upload.single('file') as any, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  if (!req.encryptedSession) {
    return res.status(400).json({
      error: 'Telegram account not connected. Please connect your Telegram account first.',
      code: 'TELEGRAM_NOT_CONNECTED',
    });
  }

  const folder = (req.body.folder || req.body.folderId || 'root') as string;
  const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const mimeType = req.file.mimetype || 'application/octet-stream';

  try {
    const uploadResult = await TelegramStorageService.sendFile(
      req.user.userId,
      req.encryptedSession,
      req.file.buffer,
      fileName,
      mimeType,
      folder
    );

    // Explicitly delete buffer reference from memory
    req.file.buffer = Buffer.alloc(0);

    res.status(201).json({
      success: true,
      file: {
        id: uploadResult.messageId.toString(),
        telegramMessageId: uploadResult.messageId,
        name: fileName,
        fileName: fileName,
        size: uploadResult.size,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        folder: uploadResult.folder,
        folderId: uploadResult.folder,
        isStarred: false,
        favorite: false,
        isTrashed: false,
        trash: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Upload to Telegram failed:', err);
    res.status(500).json({ error: err.message || 'Failed to upload to Telegram Saved Messages' });
  }
});

/**
 * Get single file metadata
 */
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const messageId = parseInt(req.params.id, 10);
  if (isNaN(messageId)) return res.status(400).json({ error: 'Invalid file ID' });

  try {
    const file = await TelegramStorageService.getFileInfo(
      req.user.userId,
      req.encryptedSession,
      messageId
    );

    if (!file) return res.status(404).json({ error: 'File not found in Telegram Saved Messages' });

    res.json(file);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load file' });
  }
});

/**
 * Stream file for in-browser viewing / preview / thumbnail
 */
const handleFileView = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const messageId = parseInt(req.params.id, 10);
  if (isNaN(messageId)) return res.status(400).json({ error: 'Invalid file ID' });

  try {
    const file = await TelegramStorageService.getFileInfo(
      req.user.userId,
      req.encryptedSession,
      messageId
    );

    const mimeType = file?.mimeType || 'application/octet-stream';
    const fileName = file?.name || `file_${messageId}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (file && file.size > 0) {
      res.setHeader('Content-Length', file.size);
    }

    await TelegramStorageService.downloadFile(
      req.user.userId,
      req.encryptedSession,
      messageId,
      res
    );
  } catch (err: any) {
    console.error('View stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to stream media from Telegram' });
    }
  }
};

router.get('/:id/view', authenticateToken, handleFileView);
router.get('/:id/stream', authenticateToken, handleFileView);
router.get('/:id/thumbnail', authenticateToken, handleFileView);
router.get('/stream/:id', authenticateToken, handleFileView);

/**
 * Download file attachment
 */
const handleFileDownload = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const messageId = parseInt(req.params.id, 10);
  if (isNaN(messageId)) return res.status(400).json({ error: 'Invalid file ID' });

  try {
    const file = await TelegramStorageService.getFileInfo(
      req.user.userId,
      req.encryptedSession,
      messageId
    );

    const mimeType = file?.mimeType || 'application/octet-stream';
    const fileName = file?.name || `download_${messageId}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    if (file && file.size > 0) {
      res.setHeader('Content-Length', file.size);
    }

    await TelegramStorageService.downloadFile(
      req.user.userId,
      req.encryptedSession,
      messageId,
      res
    );
  } catch (err: any) {
    console.error('Download stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to download from Telegram' });
    }
  }
};

router.get('/:id/download', authenticateToken, handleFileDownload);
router.get('/download/:id', authenticateToken, handleFileDownload);

/**
 * Update virtual file metadata (rename, move to folder, star, trash)
 */
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const messageId = parseInt(req.params.id, 10);
  if (isNaN(messageId)) return res.status(400).json({ error: 'Invalid file ID' });

  const { name, fileName, folder, folderId, isStarred, favorite, isTrashed, trash } = req.body;

  try {
    const updated = await TelegramStorageService.editMetadata(
      req.user.userId,
      req.encryptedSession,
      messageId,
      {
        name: name || fileName,
        folder: folder || folderId,
        isStarred: isStarred !== undefined ? isStarred : favorite,
        isTrashed: isTrashed !== undefined ? isTrashed : trash,
      }
    );

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating metadata in Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to update file metadata' });
  }
});

/**
 * Permanently delete message from Telegram Saved Messages
 */
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const messageId = parseInt(req.params.id, 10);
  if (isNaN(messageId)) return res.status(400).json({ error: 'Invalid file ID' });

  try {
    const success = await TelegramStorageService.deleteMessage(
      req.user.userId,
      req.encryptedSession,
      messageId
    );

    res.json({ success, message: 'Message permanently removed from Telegram Saved Messages' });
  } catch (err: any) {
    console.error('Error deleting message in Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to delete file from Telegram' });
  }
});

/**
 * Batch move files to folder
 */
router.post('/batch-move', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { fileIds, folder, folderId } = req.body;
  const targetFolder = folder || folderId || 'root';

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'fileIds must be a non-empty array' });
  }

  try {
    for (const idStr of fileIds) {
      const msgId = parseInt(idStr, 10);
      if (!isNaN(msgId)) {
        await TelegramStorageService.editMetadata(req.user.userId, req.encryptedSession, msgId, {
          folder: targetFolder,
        });
      }
    }

    res.json({ success: true, count: fileIds.length, targetFolder });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to move files' });
  }
});

/**
 * Batch trash / restore files
 */
router.post('/batch-trash', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { fileIds, trash = true, isTrashed } = req.body;
  const trashState = isTrashed !== undefined ? isTrashed : trash;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'fileIds must be a non-empty array' });
  }

  try {
    for (const idStr of fileIds) {
      const msgId = parseInt(idStr, 10);
      if (!isNaN(msgId)) {
        await TelegramStorageService.editMetadata(req.user.userId, req.encryptedSession, msgId, {
          isTrashed: trashState,
        });
      }
    }

    res.json({ success: true, count: fileIds.length, trashed: trashState });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to trash files' });
  }
});

/**
 * Batch star / unstar files
 */
router.post('/batch-star', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { fileIds, isStarred = true, favorite } = req.body;
  const starState = isStarred !== undefined ? isStarred : favorite;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'fileIds must be a non-empty array' });
  }

  try {
    for (const idStr of fileIds) {
      const msgId = parseInt(idStr, 10);
      if (!isNaN(msgId)) {
        await TelegramStorageService.editMetadata(req.user.userId, req.encryptedSession, msgId, {
          isStarred: starState,
        });
      }
    }

    res.json({ success: true, count: fileIds.length, starred: starState });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to star files' });
  }
});

/**
 * Batch permanent delete from Telegram
 */
router.post('/batch-delete', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { fileIds } = req.body;

  if (!Array.isArray(fileIds) || fileIds.length === 0) {
    return res.status(400).json({ error: 'fileIds must be a non-empty array' });
  }

  try {
    for (const idStr of fileIds) {
      const msgId = parseInt(idStr, 10);
      if (!isNaN(msgId)) {
        await TelegramStorageService.deleteMessage(req.user.userId, req.encryptedSession, msgId);
      }
    }

    res.json({ success: true, count: fileIds.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete files' });
  }
});

export default router;
