import { Router, Response } from 'express';
import { TelegramStorageService } from '../../server/services/telegram/TelegramStorageService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * List all virtual folders derived from Telegram Saved Messages
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const folders = await TelegramStorageService.getFolders(req.user.userId, req.encryptedSession);
    res.json(folders);
  } catch (err: any) {
    console.error('Error fetching folders from Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch folders' });
  }
});

/**
 * Create a new virtual folder
 */
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  const cleanName = name.trim().replace(/[/\\?%*:|"<>]/g, '-');

  res.status(201).json({
    id: cleanName,
    name: cleanName,
    fileCount: 0,
    size: 0,
    createdAt: new Date().toISOString(),
  });
});

/**
 * Rename a virtual folder by updating captions of all files in that folder
 */
router.patch('/:name', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const oldName = decodeURIComponent(req.params.name);
  const { name: newName } = req.body;

  if (!newName || typeof newName !== 'string' || !newName.trim()) {
    return res.status(400).json({ error: 'New folder name is required' });
  }

  const cleanNewName = newName.trim().replace(/[/\\?%*:|"<>]/g, '-');

  try {
    const files = await TelegramStorageService.getMessages(req.user.userId, req.encryptedSession, {
      folder: oldName,
      includeTrash: true,
    });

    for (const file of files) {
      const msgId = parseInt(file.id, 10);
      if (!isNaN(msgId)) {
        await TelegramStorageService.editMetadata(req.user.userId, req.encryptedSession, msgId, {
          folder: cleanNewName,
        });
      }
    }

    res.json({
      success: true,
      oldName,
      name: cleanNewName,
      updatedFilesCount: files.length,
    });
  } catch (err: any) {
    console.error('Error renaming folder in Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to rename folder' });
  }
});

/**
 * Delete a virtual folder (moves files to root)
 */
router.delete('/:name', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const folderName = decodeURIComponent(req.params.name);

  try {
    const files = await TelegramStorageService.getMessages(req.user.userId, req.encryptedSession, {
      folder: folderName,
      includeTrash: true,
    });

    for (const file of files) {
      const msgId = parseInt(file.id, 10);
      if (!isNaN(msgId)) {
        await TelegramStorageService.editMetadata(req.user.userId, req.encryptedSession, msgId, {
          folder: 'root',
        });
      }
    }

    res.json({
      success: true,
      deletedFolder: folderName,
      movedFilesCount: files.length,
    });
  } catch (err: any) {
    console.error('Error deleting folder in Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to delete folder' });
  }
});

export default router;
