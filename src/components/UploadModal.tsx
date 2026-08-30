import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  X,
  File as FileIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Folder,
  Send,
  Trash2,
  Smartphone,
} from 'lucide-react';
import { CloudFolder } from '../types';
import { formatBytes } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  folders: CloudFolder[];
  currentFolderId?: string;
  currentFolder?: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  folders,
  currentFolderId = 'root',
  currentFolder = 'root',
}) => {
  const { isTelegramConnected } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<string>(currentFolderId || currentFolder);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (currentFolderId && currentFolderId !== 'root') {
      setSelectedFolder(currentFolderId);
    } else if (currentFolder && currentFolder !== 'root') {
      setSelectedFolder(currentFolder);
    } else {
      setSelectedFolder('root');
    }
  }, [currentFolderId, currentFolder, isOpen]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newItems: UploadItem[] = acceptedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      status: 'pending',
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024,
  } as any);

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const uploadFiles = async () => {
    if (queue.length === 0 || isUploading) return;
    setIsUploading(true);

    let hasSuccess = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'success') continue;

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading', progress: 30 } : q))
      );

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('folderId', selectedFolder);
      formData.append('folder', selectedFolder);

      try {
        const response = await apiFetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to stream to Telegram Saved Messages');
        }

        hasSuccess = true;
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: 'success', progress: 100 } : q))
        );
      } catch (error: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'error', progress: 0, error: error.message || 'Upload failed' }
              : q
          )
        );
      }
    }

    setIsUploading(false);
    if (hasSuccess) {
      onSuccess();
    }
  };

  if (!isOpen) return null;

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const successCount = queue.filter((i) => i.status === 'success').length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">
                  Upload to Telegram Saved Messages
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Files stream directly to your private Telegram account via MTProto
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {!isTelegramConnected && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Smartphone className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  Telegram account not connected yet. Files will be saved locally and sync once connected.
                </span>
              </div>
            )}

            {/* Target Folder Selector */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                <Folder className="w-4 h-4 text-sky-500" />
                <span className="font-semibold">Destination Folder:</span>
              </div>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                disabled={isUploading}
                className="text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-1.5 font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="root">Root (Default Vault)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/20 scale-[0.99]'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-sky-400 dark:hover:border-sky-500 bg-zinc-50/50 dark:bg-zinc-900/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-semibold text-xs text-zinc-900 dark:text-white mb-1">
                {isDragActive ? 'Drop files here to upload...' : 'Drag & drop files here, or click to browse'}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Photos, Videos, Documents, Audio, and Archives up to 50MB
              </p>
            </div>

            {/* Upload Queue List */}
            {queue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
                  <span>Queue ({queue.length} files)</span>
                  {successCount > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {successCount} uploaded
                    </span>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-3 truncate flex-1 min-w-0 pr-3">
                        <FileIcon className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div className="truncate flex-1">
                          <p className="font-medium text-zinc-900 dark:text-white truncate">
                            {item.file.name}
                          </p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {formatBytes(item.file.size)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'uploading' && (
                          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 text-xs font-medium">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Streaming...</span>
                          </div>
                        )}
                        {item.status === 'success' && (
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span title={item.error}>{item.error || 'Failed'}</span>
                          </div>
                        )}
                        {item.status === 'pending' && !isUploading && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-zinc-400 hover:text-rose-500 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/40 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span>MTProto Saved Messages</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                {successCount > 0 && pendingCount === 0 ? 'Done' : 'Cancel'}
              </button>

              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Streaming ({pendingCount})...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Start Upload ({pendingCount})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default UploadModal;
