import React, { useState, useEffect } from 'react';
import { Clock, Download, Eye, Star, Trash2, HardDrive, RefreshCw } from 'lucide-react';
import { CloudFile } from '../types';
import { formatBytes, formatDate, isImage, isVideo, isAudio, isPdf } from '../utils/formatters';
import { MediaViewer } from '../components/MediaViewer';
import { apiFetch, getFileUrl } from '../utils/api';

export const Recent: React.FC = () => {
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchRecent = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/files?sort=newest&limit=50');
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (err) {
      console.error('Failed to load recent files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const handleStarFile = async (file: CloudFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/api/files/${file.id}/star`, { method: 'POST' });
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, isStarred: !f.isStarred, favorite: !f.favorite } : f))
      );
    } catch (err) {
      console.error('Failed to toggle star:', err);
    }
  };

  const handleTrashFile = async (file: CloudFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Move "${file.name}" to trash?`)) return;
    try {
      await apiFetch(`/api/files/${file.id}/trash`, { method: 'POST' });
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err) {
      console.error('Failed to trash file:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-sky-500" />
            Recent Uploads
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Chronological view of all files saved directly into your personal Telegram vault.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRecent}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Loading recent uploads...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
          <Clock className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">No recent uploads</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Upload files in the File Explorer to see them organized here.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">File Name</th>
                  <th className="p-3.5">Folder</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Upload Date</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {files.map((file, idx) => (
                  <tr
                    key={file.id}
                    onClick={() => {
                      setViewerIndex(idx);
                      setViewerOpen(true);
                    }}
                    className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 pl-4 font-semibold text-zinc-900 dark:text-white">
                      {file.name}
                    </td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400">
                      {file.folder || 'Root'}
                    </td>
                    <td className="p-3.5 font-mono text-zinc-600 dark:text-zinc-400">
                      {formatBytes(file.size || file.fileSize)}
                    </td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="p-3.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleStarFile(file, e)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            file.isStarred
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-zinc-400 hover:text-amber-500'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-current' : ''}`} />
                        </button>
                        <a
                          href={getFileUrl(file.id, 'download')}
                          download={file.name}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={(e) => handleTrashFile(file, e)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {files.length > 0 && (
        <MediaViewer
          files={files}
          currentIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onNavigate={(idx) => setViewerIndex(idx)}
          onToggleFavorite={handleStarFile}
        />
      )}
    </div>
  );
};
export default Recent;
