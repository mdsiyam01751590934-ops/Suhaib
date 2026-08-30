import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Folder,
  FolderPlus,
  Upload,
  Grid,
  List,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Star,
  Trash2,
  Download,
  Eye,
  Edit2,
  FolderInput,
  CheckSquare,
  Square,
  ChevronRight,
  Home,
  RefreshCw,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Archive,
  File as FileIcon,
  Play,
  Share2,
  Check,
  Send,
} from 'lucide-react';
import { CloudFile, CloudFolder, CategoryFilter, SortOrder, ViewMode } from '../types';
import { formatBytes, formatDate, isImage, isVideo, isAudio, isPdf } from '../utils/formatters';
import { MediaViewer } from '../components/MediaViewer';
import { UploadModal } from '../components/UploadModal';
import { FolderModal } from '../components/FolderModal';
import { MoveModal } from '../components/MoveModal';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getFileUrl } from '../utils/api';

export const Files: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery } = useAuth();

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [loading, setLoading] = useState(true);

  // Active folder ID from URL
  const currentFolderId = searchParams.get('folderId') || 'root';
  const activeCategory = (searchParams.get('type') || 'all') as CategoryFilter;
  const sortParam = (searchParams.get('sort') || 'newest') as SortOrder;

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('unlim_view_mode') as ViewMode) || 'grid';
  });

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<CloudFolder | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetFileIds, setMoveTargetFileIds] = useState<string[]>([]);

  // Media Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Multi-Selection
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Drag over window state
  const [isDragOver, setIsDragOver] = useState(false);

  // Fetch folders and files
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const folderParam = currentFolderId === 'root' ? 'root' : currentFolderId;
      const [filesRes, foldersRes] = await Promise.all([
        apiFetch(`/api/files?folderId=${folderParam}&type=${activeCategory}&sort=${sortParam}&search=${encodeURIComponent(searchQuery)}`),
        apiFetch('/api/folders'),
      ]);

      if (filesRes.ok) {
        const fileData = await filesRes.json();
        setFiles(fileData);
      }
      if (foldersRes.ok) {
        const folderData = await foldersRes.json();
        setFolders(folderData);
      }
    } catch (err) {
      console.error('Error fetching file manager data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId, activeCategory, sortParam, searchQuery]);

  useEffect(() => {
    fetchData();
    setSelectedFileIds(new Set());
  }, [fetchData]);

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('unlim_view_mode', mode);
  };

  // Breadcrumbs calculation
  const breadcrumbs = useMemo(() => {
    if (currentFolderId === 'root' || !currentFolderId) {
      return [{ id: 'root', name: 'Root Vault' }];
    }

    const trail: { id: string; name: string }[] = [];
    let curr: string | null = currentFolderId;

    while (curr && curr !== 'root') {
      const found: CloudFolder | undefined = folders.find((f) => f.id === curr);
      if (found) {
        trail.unshift({ id: found.id, name: found.name });
        curr = found.parentId || null;
      } else {
        break;
      }
    }

    return [{ id: 'root', name: 'Root Vault' }, ...trail];
  }, [currentFolderId, folders]);

  // Subfolders in current view
  const currentSubfolders = useMemo(() => {
    if (activeCategory !== 'all' || searchQuery) return [];
    if (currentFolderId === 'root') {
      return folders.filter((f) => !f.parentId || f.parentId === 'root');
    }
    return folders.filter((f) => f.parentId === currentFolderId);
  }, [folders, currentFolderId, activeCategory, searchQuery]);

  // Selection handlers
  const toggleSelectFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedFileIds.size === files.length) {
      setSelectedFileIds(new Set());
    } else {
      setSelectedFileIds(new Set(files.map((f) => f.id)));
    }
  };

  // Actions
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

  const handleBatchTrash = async () => {
    if (selectedFileIds.size === 0) return;
    if (!confirm(`Move ${selectedFileIds.size} selected file(s) to trash?`)) return;

    try {
      await apiFetch('/api/files/batch-trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: Array.from(selectedFileIds), isTrash: true }),
      });
      setSelectedFileIds(new Set());
      fetchData();
    } catch (err) {
      console.error('Batch trash error:', err);
    }
  };

  const handleBatchMove = () => {
    if (selectedFileIds.size === 0) return;
    setMoveTargetFileIds(Array.from(selectedFileIds));
    setMoveModalOpen(true);
  };

  const handleSingleMove = (file: CloudFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMoveTargetFileIds([file.id]);
    setMoveModalOpen(true);
  };

  const handleRenameFile = async (file: CloudFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newName = prompt('Enter new file name:', file.name);
    if (!newName || !newName.trim() || newName.trim() === file.name) return;

    try {
      const res = await apiFetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, name: data.name, fileName: data.name } : f))
        );
      }
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
  };

  const handleDeleteFolder = async (folder: CloudFolder, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete folder "${folder.name}"? Contained files will be moved to root.`)) return;

    try {
      await apiFetch(`/api/folders/${folder.id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  // Drag & drop file upload onto window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadModalOpen(true);
    }
  };

  const openViewerForFile = (file: CloudFile) => {
    const idx = files.findIndex((f) => f.id === file.id);
    if (idx !== -1) {
      setViewerIndex(idx);
      setViewerOpen(true);
    }
  };

  const categoryChips: { key: CategoryFilter; label: string; icon: any }[] = [
    { key: 'all', label: 'All Vault Files', icon: Home },
    { key: 'images', label: 'Photos', icon: ImageIcon },
    { key: 'videos', label: 'Videos', icon: Video },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'audio', label: 'Audio', icon: Music },
    { key: 'archives', label: 'Archives', icon: Archive },
  ];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="space-y-6 pb-16 relative min-h-[calc(100vh-140px)]"
    >
      {/* Drag and Drop Overlay */}
      {isDragOver && (
        <div className="fixed inset-0 z-50 bg-sky-600/20 backdrop-blur-xs border-4 border-dashed border-sky-500 rounded-3xl flex items-center justify-center pointer-events-none transition-all">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl text-center space-y-2 border border-sky-200 dark:border-sky-800">
            <Upload className="w-12 h-12 text-sky-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Drop files to upload to Telegram Vault</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Direct streaming to Saved Messages MTProto</p>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.id}>
                {idx > 0 && <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />}
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      if (crumb.id === 'root') next.delete('folderId');
                      else next.set('folderId', crumb.id);
                      return next;
                    });
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isLast
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingFolder(null);
              setFolderModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Filter and View Mode Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categoryChips.map((chip) => {
            const Icon = chip.icon;
            const active = activeCategory === chip.key;
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (chip.key === 'all') next.delete('type');
                    else next.set('type', chip.key);
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs'
                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* View Toggle & Sort */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Sort Selector */}
          <select
            value={sortParam}
            onChange={(e) => {
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('sort', e.target.value);
                return next;
              });
            }}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name (A → Z)</option>
            <option value="name-desc">Name (Z → A)</option>
            <option value="size-desc">Size (Largest)</option>
            <option value="size-asc">Size (Smallest)</option>
          </select>

          {/* Grid / List Toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => handleToggleViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleToggleViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Batch Selection Banner */}
      {selectedFileIds.size > 0 && (
        <div className="sticky top-20 z-20 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-3.5 px-5 rounded-2xl shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <button
              type="button"
              onClick={selectAll}
              className="flex items-center gap-1.5 hover:underline cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>{selectedFileIds.size} file(s) selected</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBatchMove}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <FolderInput className="w-3.5 h-3.5" />
              <span>Move</span>
            </button>
            <button
              type="button"
              onClick={handleBatchTrash}
              className="px-3 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFileIds(new Set())}
              className="px-3 py-1.5 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Subfolders Section */}
      {currentSubfolders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Folders ({currentSubfolders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {currentSubfolders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('folderId', folder.id);
                    return next;
                  });
                }}
                className="group bg-white dark:bg-zinc-900 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
                    <Folder className="w-5 h-5 fill-current" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate group-hover:text-sky-600 dark:group-hover:text-sky-400">
                      {folder.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">{folder.fileCount || 0} items</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDeleteFolder(folder, e)}
                  className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-zinc-400 hover:text-rose-500 transition-all cursor-pointer"
                  title="Delete Folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Files Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Files ({files.length})
          </h3>
          {files.length > 0 && (
            <button
              type="button"
              onClick={selectAll}
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              {selectedFileIds.size === files.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Loading Telegram vault files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              No files found in this location
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-5">
              Upload photos, documents, videos, or archives to store them directly in your Telegram Saved Messages.
            </p>
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New File</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {files.map((file) => {
              const isSelected = selectedFileIds.has(file.id);
              const isImg = isImage(file.mimeType, file.name);
              const isVid = isVideo(file.mimeType, file.name);
              const isAud = isAudio(file.mimeType, file.name);
              const isDoc = isPdf(file.mimeType, file.name);
              const viewUrl = getFileUrl(file.id, 'view');

              return (
                <div
                  key={file.id}
                  onClick={() => openViewerForFile(file)}
                  className={`group bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col cursor-pointer relative ${
                    isSelected
                      ? 'border-sky-500 ring-2 ring-sky-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Thumbnail / Media Canvas */}
                  <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {isImg ? (
                      <img
                        src={viewUrl}
                        alt={file.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : isVid ? (
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <div className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">Video</span>
                      </div>
                    ) : isAud ? (
                      <div className="flex flex-col items-center justify-center text-purple-500">
                        <Music className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">Audio</span>
                      </div>
                    ) : isDoc ? (
                      <div className="flex flex-col items-center justify-center text-rose-500">
                        <FileText className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">PDF</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <FileIcon className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">File</span>
                      </div>
                    )}

                    {/* Top Badges (Selection Checkbox & Star) */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={(e) => toggleSelectFile(file.id, e)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white'
                            : 'bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/60'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleStarFile(file, e)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                          file.isStarred
                            ? 'bg-amber-500 text-white opacity-100'
                            : 'bg-black/40 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-black/60'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Hover Actions Bar */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={getFileUrl(file.id, 'download')}
                        download={file.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-white/90 text-zinc-900 hover:bg-white transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={(e) => handleSingleMove(file, e)}
                        className="p-1.5 rounded-lg bg-white/90 text-zinc-900 hover:bg-white transition-colors cursor-pointer"
                        title="Move to folder"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleRenameFile(file, e)}
                        className="p-1.5 rounded-lg bg-white/90 text-zinc-900 hover:bg-white transition-colors cursor-pointer"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleTrashFile(file, e)}
                        className="p-1.5 rounded-lg bg-rose-600/90 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* File Metadata */}
                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div className="truncate">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate" title={file.name}>
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                        <span>{formatBytes(file.size || file.fileSize)}</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3.5 pl-4 w-8">
                      <button
                        type="button"
                        onClick={selectAll}
                        className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                      >
                        {selectedFileIds.size === files.length && files.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">Name</th>
                    <th className="p-3.5">Folder</th>
                    <th className="p-3.5">Size</th>
                    <th className="p-3.5">Uploaded</th>
                    <th className="p-3.5 text-right pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {files.map((file) => {
                    const isSelected = selectedFileIds.has(file.id);
                    return (
                      <tr
                        key={file.id}
                        onClick={() => openViewerForFile(file)}
                        className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer ${
                          isSelected ? 'bg-sky-50/60 dark:bg-sky-950/40' : ''
                        }`}
                      >
                        <td className="p-3.5 pl-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => toggleSelectFile(file.id, e)}
                            className="cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-sky-600" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-400" />
                            )}
                          </button>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              {isImage(file.mimeType, file.name) ? (
                                <ImageIcon className="w-4 h-4 text-emerald-500" />
                              ) : isVideo(file.mimeType, file.name) ? (
                                <Video className="w-4 h-4 text-indigo-500" />
                              ) : isAudio(file.mimeType, file.name) ? (
                                <Music className="w-4 h-4 text-purple-500" />
                              ) : isPdf(file.mimeType, file.name) ? (
                                <FileText className="w-4 h-4 text-rose-500" />
                              ) : (
                                <FileIcon className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                            <div className="truncate max-w-xs sm:max-w-md">
                              <span className="font-semibold text-zinc-900 dark:text-white truncate block">
                                {file.name}
                              </span>
                              <span className="text-[10px] text-zinc-400">{file.mimeType}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 text-zinc-500 dark:text-zinc-400">
                          {file.folder && file.folder !== 'root' ? (
                            <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                              {file.folder}
                            </span>
                          ) : (
                            <span className="text-zinc-400 text-[11px]">Root</span>
                          )}
                        </td>

                        <td className="p-3.5 text-zinc-600 dark:text-zinc-400 font-mono text-[11px]">
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
                                  : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                              }`}
                              title="Star"
                            >
                              <Star className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-current' : ''}`} />
                            </button>

                            <a
                              href={getFileUrl(file.id, 'download')}
                              download={file.name}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>

                            <button
                              type="button"
                              onClick={(e) => handleSingleMove(file, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Move"
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleRenameFile(file, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                              title="Rename"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleTrashFile(file, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Media Lightbox Viewer */}
      {files.length > 0 && (
        <MediaViewer
          files={files}
          currentIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onNavigate={(newIndex) => setViewerIndex(newIndex)}
          onToggleFavorite={handleStarFile}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          fetchData();
          setUploadModalOpen(false);
        }}
        folders={folders}
        currentFolderId={currentFolderId !== 'root' ? currentFolderId : undefined}
      />

      {/* Folder Create/Edit Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        folder={editingFolder}
        currentParentId={currentFolderId !== 'root' ? currentFolderId : undefined}
        onClose={() => {
          setFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSuccess={() => {
          fetchData();
          setFolderModalOpen(false);
          setEditingFolder(null);
        }}
      />

      {/* Move Files Modal */}
      <MoveModal
        isOpen={moveModalOpen}
        fileIds={moveTargetFileIds}
        folders={folders}
        onClose={() => {
          setMoveModalOpen(false);
          setMoveTargetFileIds([]);
        }}
        onSuccess={() => {
          fetchData();
          setMoveModalOpen(false);
          setMoveTargetFileIds([]);
          setSelectedFileIds(new Set());
        }}
      />
    </div>
  );
};
export default Files;
