import crypto from 'crypto';

// Use ENCRYPTION_KEY or derive from SESSION_SECRET
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET || 'unlim-cloud-super-secure-encryption-key-32-chars!';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypts a Telegram MTProto session string with AES-256-GCM
 */
export function encryptSession(sessionString: string): string {
  if (!sessionString) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(sessionString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted Telegram MTProto session string
 */
export function decryptSession(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      // Legacy or plain fallback if not in iv:authTag:cipher format
      return encryptedData;
    }
    
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Error decrypting Telegram session:', err);
    throw new Error('Failed to decrypt Telegram session');
  }
}
