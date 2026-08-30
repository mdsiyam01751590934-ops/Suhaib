import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Folder, X, FolderInput, Check } from 'lucide-react';
import { CloudFile, CloudFolder } from '../types';
import { apiFetch } from '../utils/api';

interface MoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fileIds?: string[];
  filesToMove?: CloudFile[];
  folders: CloudFolder[];
}

export const MoveModal: React.FC<MoveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  fileIds = [],
  filesToMove = [],
  folders,
}) => {
  const [targetFolder, setTargetFolder] = useState<string>('root');
  const [loading, setLoading] = useState(false);

  const effectiveIds = fileIds.length > 0 ? fileIds : filesToMove.map((f) => f.id);

  if (!isOpen || effectiveIds.length === 0) return null;

  const handleMove = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/files/batch-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: effectiveIds, folder: targetFolder, folderId: targetFolder }),
      });

      if (!res.ok) throw new Error('Failed to move files');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error moving files:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <FolderInput className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">
                Move {effectiveIds.length} {effectiveIds.length === 1 ? 'Item' : 'Items'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-3">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select the destination folder in your Telegram cloud vault:
            </p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setTargetFolder('root')}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                  targetFolder === 'root'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-medium'
                    : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4 h-4 text-zinc-400" />
                  <span>Root (Main Vault)</span>
                </div>
                {targetFolder === 'root' && <Check className="w-4 h-4 text-sky-500" />}
              </button>

              {folders.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTargetFolder(f.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    targetFolder === f.name || targetFolder === f.id
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-medium'
                      : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4 text-sky-500" />
                    <span>{f.name}</span>
                  </div>
                  {(targetFolder === f.name || targetFolder === f.id) && <Check className="w-4 h-4 text-sky-500" />}
                </button>
              ))}
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMove}
                disabled={loading}
                className="px-5 py-2 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Moving...' : 'Move Here'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default MoveModal;
