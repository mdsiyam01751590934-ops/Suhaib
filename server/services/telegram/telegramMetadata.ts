/**
 * Robust Telegram Metadata Encoder / Decoder for Unlim Cloud
 * Encodes virtual folders, starred status, trash status, and original filenames
 * into Telegram Saved Messages captions without requiring any database.
 */

export interface UnlimFileMetadata {
  isUnlimFile: boolean;
  name: string;
  folder: string;
  isStarred: boolean;
  isTrashed: boolean;
  mimeType?: string;
  notes?: string;
}

const METADATA_TAG = '[UNLIM_FILE_V1]';

function safeBase64Encode(str: string): string {
  return Buffer.from(str || '', 'utf8').toString('base64');
}

function safeBase64Decode(b64: string): string {
  try {
    return Buffer.from(b64 || '', 'base64').toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Encodes file metadata into a compact, robust caption for Telegram Saved Messages
 */
export function encodeMetadata(meta: {
  name: string;
  folder?: string;
  isStarred?: boolean;
  isTrashed?: boolean;
  mimeType?: string;
  notes?: string;
}): string {
  const nameB64 = safeBase64Encode(meta.name || 'Untitled');
  const folderB64 = safeBase64Encode(meta.folder || 'root');
  const mimeB64 = safeBase64Encode(meta.mimeType || '');
  const starredFlag = meta.isStarred ? '1' : '0';
  const trashFlag = meta.isTrashed ? '1' : '0';

  // Metadata block
  const metaHeader = `${METADATA_TAG}[NAME:${nameB64}][FOLDER:${folderB64}][STAR:${starredFlag}][TRASH:${trashFlag}][MIME:${mimeB64}]`;

  // Human readable title when viewed directly in the official Telegram app
  const readableDisplay = `📁 Shadowtech MTProto: ${meta.name} ${meta.folder && meta.folder !== 'root' ? `(${meta.folder})` : ''}`;

  return `${metaHeader}\n${readableDisplay}`;
}

/**
 * Decodes metadata from a Telegram message caption
 */
export function decodeMetadata(caption?: string | null): UnlimFileMetadata {
  if (!caption || typeof caption !== 'string') {
    return {
      isUnlimFile: false,
      name: 'Untitled',
      folder: 'root',
      isStarred: false,
      isTrashed: false,
    };
  }

  const isUnlim = caption.includes(METADATA_TAG) || caption.includes('Unlim Cloud Vault:') || caption.includes('Shadowtech MTProto:');

  if (!isUnlim) {
    return {
      isUnlimFile: false,
      name: 'Untitled',
      folder: 'root',
      isStarred: false,
      isTrashed: false,
    };
  }

  // Parse structured tags
  let name = '';
  let folder = 'root';
  let isStarred = false;
  let isTrashed = false;
  let mimeType: string | undefined = undefined;

  const nameMatch = caption.match(/\[NAME:([A-Za-z0-9+/=]+)\]/);
  if (nameMatch && nameMatch[1]) {
    name = safeBase64Decode(nameMatch[1]);
  }

  const folderMatch = caption.match(/\[FOLDER:([A-Za-z0-9+/=]+)\]/);
  if (folderMatch && folderMatch[1]) {
    folder = safeBase64Decode(folderMatch[1]) || 'root';
  }

  const starMatch = caption.match(/\[STAR:([01])\]/);
  if (starMatch) {
    isStarred = starMatch[1] === '1';
  } else if (caption.includes('[UNLIM_STARRED]')) {
    isStarred = true;
  }

  const trashMatch = caption.match(/\[TRASH:([01])\]/);
  if (trashMatch) {
    isTrashed = trashMatch[1] === '1';
  } else if (caption.includes('[UNLIM_TRASH]')) {
    isTrashed = true;
  }

  const mimeMatch = caption.match(/\[MIME:([A-Za-z0-9+/=]+)\]/);
  if (mimeMatch && mimeMatch[1]) {
    mimeType = safeBase64Decode(mimeMatch[1]);
  }

  // Legacy format fallback: "📁 Unlim Cloud Vault: filename.ext" or Shadowtech
  if (!name) {
    let match = caption.match(/Shadowtech MTProto:\s*([^\n\r]+)/i);
    if (!match) {
      match = caption.match(/Unlim Cloud Vault:\s*([^\n\r]+)/i);
    }
    if (match && match[1]) {
      name = match[1].trim();
    }
  }

  return {
    isUnlimFile: true,
    name: name || 'Untitled',
    folder: folder || 'root',
    isStarred,
    isTrashed,
    mimeType,
  };
}

/**
 * Checks if a message belongs to Shadowtech MTProto
 */
export function isAppFile(caption?: string | null): boolean {
  if (!caption) return false;
  return caption.includes(METADATA_TAG) || caption.includes('Unlim Cloud Vault:') || caption.includes('Shadowtech MTProto:');
}

export function getFolder(caption?: string | null): string {
  return decodeMetadata(caption).folder;
}

export function isStarred(caption?: string | null): boolean {
  return decodeMetadata(caption).isStarred;
}

export function isTrashed(caption?: string | null): boolean {
  return decodeMetadata(caption).isTrashed;
}
