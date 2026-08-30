export interface CloudFile {
  id: string;
  userId?: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  fileSize: number;
  folderId?: string | null;
  folder?: string | null;
  isStarred: boolean;
  favorite: boolean;
  isDeleted: boolean;
  isTrash: boolean;
  deletedAt?: string | null;
  telegramMessageId?: number | null;
  telegramFileId?: string | null;
  thumbnail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CloudFolder {
  id: string;
  name: string;
  parentId?: string | null;
  color?: string | null;
  fileCount?: number;
  subfolderCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: 'USER' | 'ADMIN' | string;
  telegramUserId?: string | null;
  isTelegramConnected?: boolean;
  createdAt?: string;
}

export interface TelegramInfo {
  id?: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  isSelfStorageReady?: boolean;
}

export interface TelegramStatusResponse {
  isConfigured: boolean;
  isConnected: boolean;
  user: {
    id: string;
    email: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    telegramUserId?: string | null;
  };
  telegramInfo?: TelegramInfo | null;
}

export interface CategoryData {
  count: number;
  size: number;
}

export interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  starredCount: number;
  trashCount: number;
  totalStorageBytes: number;
  isTelegramConnected: boolean;
  telegramConfigured: boolean;
  categories: {
    images: CategoryData;
    videos: CategoryData;
    audio: CategoryData;
    documents: CategoryData;
    archives: CategoryData;
    others: CategoryData;
  };
}

export interface AdminStats {
  totalUsers: number;
  connectedTelegramUsers: number;
  totalFiles: number;
  totalFolders: number;
  totalStorageBytes: number;
  categories: {
    images: CategoryData;
    videos: CategoryData;
    audio: CategoryData;
    documents: CategoryData;
    archives: CategoryData;
    others: CategoryData;
  };
  recentUploads: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    userEmail: string;
    userName: string;
    createdAt: string;
  }[];
}

export interface AdminUser {
  id: string;
  email: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: string;
  isTelegramConnected: boolean;
  telegramUserId?: string | null;
  filesCount: number;
  foldersCount: number;
  createdAt: string;
}

export interface SystemStatus {
  status: string;
  uptimeSeconds: number;
  timestamp: string;
  telegram: {
    isApiConfigured: boolean;
    apiIdPresent: boolean;
    apiHashPresent: boolean;
    storageArchitecture: string;
  };
  system: {
    nodeVersion: string;
    platform: string;
    arch: string;
    totalMemory: number;
    freeMemory: number;
    cpus: number;
    processMemory: any;
  };
  database: {
    type: string;
    status: string;
  };
}

export type CategoryFilter =
  | 'all'
  | 'images'
  | 'videos'
  | 'documents'
  | 'audio'
  | 'archives'
  | 'favorites'
  | 'starred'
  | 'trash';

export type SortOrder =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc'
  | 'size-asc'
  | 'size-desc';

export type ViewMode = 'grid' | 'list';
