import { Router, Response } from 'express';
import { TelegramStorageService } from '../../server/services/telegram/TelegramStorageService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

function getCategory(mimeType: string = '', fileName: string = ''): 'images' | 'videos' | 'audio' | 'documents' | 'archives' | 'other' {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();

  if (mime.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|heic|avif)$/.test(name)) {
    return 'images';
  }
  if (mime.startsWith('video/') || /\.(mp4|mkv|mov|avi|webm|m4v|3gp)$/.test(name)) {
    return 'videos';
  }
  if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|wma)$/.test(name)) {
    return 'audio';
  }
  if (
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('document') ||
    mime.includes('text') ||
    mime.includes('sheet') ||
    mime.includes('presentation') ||
    /\.(pdf|doc|docx|txt|rtf|xls|xlsx|csv|ppt|pptx|md)$/.test(name)
  ) {
    return 'documents';
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('rar') ||
    mime.includes('7z') ||
    mime.includes('compressed') ||
    /\.(zip|rar|7z|tar|gz|bz2|iso)$/.test(name)
  ) {
    return 'archives';
  }
  return 'other';
}

/**
 * Calculates live storage metrics directly from Telegram Saved Messages
 */
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const allFiles = await TelegramStorageService.getMessages(req.user.userId, req.encryptedSession, {
      includeTrash: true,
      limit: 500,
    });

    let totalSize = 0;
    let activeFilesCount = 0;
    let favoritesCount = 0;
    let trashCount = 0;
    let trashSize = 0;

    const categories = {
      images: { count: 0, size: 0 },
      videos: { count: 0, size: 0 },
      audio: { count: 0, size: 0 },
      documents: { count: 0, size: 0 },
      archives: { count: 0, size: 0 },
      other: { count: 0, size: 0 },
    };

    const uniqueFolders = new Set<string>();

    for (const file of allFiles) {
      if (file.isTrashed) {
        trashCount += 1;
        trashSize += file.size || 0;
      } else {
        activeFilesCount += 1;
        totalSize += file.size || 0;

        if (file.isStarred) {
          favoritesCount += 1;
        }

        if (file.folder && file.folder !== 'root') {
          uniqueFolders.add(file.folder);
        }

        const cat = getCategory(file.mimeType, file.name);
        categories[cat].count += 1;
        categories[cat].size += file.size || 0;
      }
    }

    res.json({
      totalFiles: activeFilesCount,
      totalSize,
      formattedTotalSize: totalSize,
      favorites: favoritesCount,
      trashFiles: trashCount,
      trashSize,
      foldersCount: uniqueFolders.size,
      breakdown: {
        images: categories.images.count,
        imagesSize: categories.images.size,
        videos: categories.videos.count,
        videosSize: categories.videos.size,
        audio: categories.audio.count,
        audioSize: categories.audio.size,
        documents: categories.documents.count,
        documentsSize: categories.documents.size,
        archives: categories.archives.count,
        archivesSize: categories.archives.size,
        other: categories.other.count,
        otherSize: categories.other.size,
      },
    });
  } catch (err: any) {
    console.error('Error calculating stats from Telegram:', err);
    res.status(500).json({ error: err.message || 'Failed to compute storage stats' });
  }
});

export default router;
