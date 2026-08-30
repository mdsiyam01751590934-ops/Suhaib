import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { CloudFile } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { apiFetch } from '../utils/api';

export const Trash: React.FC = () => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/files?trash=true');
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
    setSelectedIds(new Set());
  }, []);

  const handleRestore = async (file: CloudFile) => {
    try {
      await apiFetch(`/api/files/${file.id}/restore`, { method: 'POST' });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      console.error('Failed to restore file:', err);
    }
  };

  const handlePermanentDelete = async (file: CloudFile) => {
    if (!confirm(`Permanently delete "${file.name}"? This will delete the message from your Telegram Saved Messages and cannot be undone.`)) {
      return;
    }

    try {
      await apiFetch(`/api/files/${file.id}`, { method: 'DELETE' });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      console.error('Failed to delete file permanently:', err);
    }
  };

  const handleEmptyTrash = async () => {
    if (files.length === 0) return;
    if (!confirm(`Permanently delete all ${files.length} items in trash? Messages will be removed from your Telegram Saved Messages.`)) {
      return;
    }

    try {
      await apiFetch('/api/files/trash/empty', { method: 'DELETE' });
      setFiles([]);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleBatchRestore = async () => {
    if (selectedIds.size === 0) return;
    try {
      await apiFetch('/api/files/batch-trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedIds), isTrash: false }),
      });
      setSelectedIds(new Set());
      fetchTrash();
    } catch (err) {
      console.error('Batch restore failed:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Permanently delete ${selectedIds.size} selected items?`)) return;

    try {
      await apiFetch('/api/files/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchTrash();
    } catch (err) {
      console.error('Batch delete failed:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Trash2 className="w-6 h-6 text-rose-500" />
            Trash
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Items moved to trash can be restored back to their folder or permanently deleted from Telegram.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {files.length > 0 && (
            <button
              type="button"
              onClick={handleEmptyTrash}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Trash</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Action Banner */}
      {selectedIds.size > 0 && (
        <div className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-3.5 px-5 rounded-2xl shadow-lg flex items-center justify-between gap-4">
          <span className="text-xs font-semibold">{selectedIds.size} file(s) selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchRestore}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restore</span>
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Permanently</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-rose-500 mx-auto" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Loading trash items...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <Trash2 className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Trash is empty</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            No deleted files found in your recycling bin.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-4 w-8">
                    <button type="button" onClick={selectAll} className="cursor-pointer">
                      {selectedIds.size === files.length ? (
                        <CheckSquare className="w-4 h-4 text-sky-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">File Name</th>
                  <th className="p-3.5">Original Folder</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Trashed Date</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3.5 pl-4">
                      <button type="button" onClick={() => toggleSelect(file.id)} className="cursor-pointer">
                        {selectedIds.has(file.id) ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-400" />
                        )}
                      </button>
                    </td>
                    <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">
                      {file.name}
                    </td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400">
                      {file.folder || 'Root'}
                    </td>
                    <td className="p-3.5 font-mono text-zinc-600 dark:text-zinc-400">
                      {formatBytes(file.size || file.fileSize)}
                    </td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400">
                      {formatDate(file.deletedAt || file.updatedAt)}
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleRestore(file)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePermanentDelete(file)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title="Permanent Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default Trash;
