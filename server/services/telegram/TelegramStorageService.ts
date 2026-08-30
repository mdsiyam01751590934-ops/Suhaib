import { TelegramClient } from 'telegram';
import { Response } from 'express';
import { getUserTelegramClient, closeUserTelegramClient, getTelegramConfig } from './telegramClient.js';
import { uploadToSavedMessages, TelegramUploadResult } from './telegramUpload.js';
import { downloadFromSavedMessages, deleteFromSavedMessages } from './telegramDownload.js';
import {
  getSavedCloudFiles,
  getSingleSavedCloudFile,
  updateFileMetadata,
  getVirtualFolders,
  TelegramCloudFile,
} from './telegramMessages.js';
import { startTelegramAuth, verifyTelegramCode, verifyTelegram2FA, revokeTelegramSession } from './telegramAuth.js';

export class TelegramStorageService {
  /**
   * Connect and retrieve user's Telegram MTProto client
   */
  public static async connect(
    userId: string,
    encryptedSession?: string | null
  ): Promise<TelegramClient | null> {
    return await getUserTelegramClient(userId, encryptedSession);
  }

  /**
   * Start login by sending SMS / Telegram code
   */
  public static async startLogin(phoneNumber: string) {
    return await startTelegramAuth(phoneNumber);
  }

  /**
   * Verify verification code
   */
  public static async verifyCode(authId: string, code: string) {
    return await verifyTelegramCode(authId, code);
  }

  /**
   * Verify 2FA password
   */
  public static async verify2FA(authId: string, password: string) {
    return await verifyTelegram2FA(authId, password);
  }

  /**
   * Get current authenticated user profile from Telegram MTProto
   */
  public static async getCurrentUser(client: TelegramClient) {
    return await client.getMe();
  }

  /**
   * Uploads a file directly into user's Telegram Saved Messages with embedded metadata
   */
  public static async sendFile(
    userId: string,
    encryptedSession: string | null,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'root',
    onProgress?: (progress: number) => void
  ): Promise<TelegramUploadResult> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) {
      throw new Error('Telegram MTProto client not connected. Please connect your Telegram account in settings.');
    }

    return await uploadToSavedMessages(client, fileBuffer, fileName, mimeType, folder, onProgress);
  }

  /**
   * Streams or downloads a file from user's Telegram Saved Messages
   */
  public static async downloadFile(
    userId: string,
    encryptedSession: string | null,
    messageId: number,
    res?: Response
  ): Promise<Buffer | void> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) {
      throw new Error('Telegram MTProto client not connected. Please connect your Telegram account.');
    }

    return await downloadFromSavedMessages(client, messageId, res);
  }

  /**
   * Permanently deletes a file message from user's Telegram Saved Messages
   */
  public static async deleteMessage(
    userId: string,
    encryptedSession: string | null,
    messageId: number
  ): Promise<boolean> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) return false;

    return await deleteFromSavedMessages(client, messageId);
  }

  /**
   * Edits virtual file metadata (rename, move to folder, star/unstar, trash/restore)
   */
  public static async editMetadata(
    userId: string,
    encryptedSession: string | null,
    messageId: number,
    updates: {
      name?: string;
      folder?: string;
      isStarred?: boolean;
      isTrashed?: boolean;
    }
  ): Promise<TelegramCloudFile> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) {
      throw new Error('Telegram MTProto client not connected.');
    }

    return await updateFileMetadata(client, messageId, updates);
  }

  /**
   * Gets list of files from user's Saved Messages with metadata filtering
   */
  public static async getMessages(
    userId: string,
    encryptedSession: string | null,
    options: {
      folder?: string;
      includeTrash?: boolean;
      onlyStarred?: boolean;
      search?: string;
      limit?: number;
    } = {}
  ): Promise<TelegramCloudFile[]> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) {
      return [];
    }

    return await getSavedCloudFiles(client, options);
  }

  /**
   * Searches user's Saved Messages
   */
  public static async searchMessages(
    userId: string,
    encryptedSession: string | null,
    query: string
  ): Promise<TelegramCloudFile[]> {
    return await this.getMessages(userId, encryptedSession, { search: query });
  }

  /**
   * Retrieves single file by message ID
   */
  public static async getFileInfo(
    userId: string,
    encryptedSession: string | null,
    messageId: number
  ): Promise<TelegramCloudFile | null> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) return null;

    return await getSingleSavedCloudFile(client, messageId);
  }

  /**
   * Gets list of virtual folders reconstructed from user's Telegram messages
   */
  public static async getFolders(
    userId: string,
    encryptedSession: string | null
  ): Promise<{ id: string; name: string; fileCount: number; size: number }[]> {
    const client = await this.connect(userId, encryptedSession);
    if (!client) return [];

    return await getVirtualFolders(client);
  }

  /**
   * Disconnects the user's active client
   */
  public static async disconnect(userId: string): Promise<void> {
    await closeUserTelegramClient(userId);
  }

  /**
   * Revokes and removes Telegram session
   */
  public static async revokeSession(encryptedSession: string): Promise<void> {
    await revokeTelegramSession(encryptedSession);
  }

  /**
   * Check if Telegram credentials are set up
   */
  public static isConfigured(): boolean {
    return getTelegramConfig().isConfigured;
  }
}
