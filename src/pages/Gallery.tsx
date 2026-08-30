import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  HardDrive,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Archive,
  Star,
  Trash2,
  Upload,
  Plus,
  Grid,
  List as ListIcon,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  Download,
  Eye,
  Edit2,
  FolderInput,
  RotateCcw,
  CheckSquare,
  Square,
  Folder,
  FolderPlus,
  Loader2,
  Play,
  Share2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { CloudFile, CloudFolder, CategoryFilter, SortOrder } from '../types';
import { formatBytes, formatDate, isImage, isVideo, isAudio, isPdf } from '../utils/formatters';
import { MediaViewer } from '../components/MediaViewer';
import { UploadModal } from '../components/UploadModal';
import { FolderModal } from '../components/FolderModal';
import { MoveModal } from '../components/MoveModal';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getFileUrl } from '../utils/api';

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { searchQuery, setSearchQuery } = useAuth();
  const navigate = useNavigate();

  const currentType = (searchParams.get('type') || 'all') as CategoryFilter;
  const currentFolder = searchParams.get('folder') || 'all';
  const isFavoriteView = searchParams.get('favorite') === 'true';
  const isTrashView = searchParams.get('trash') === 'true';

  const [files, setFiles] = useState<CloudFile[]>([]);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOrder>('newest');

  // Multi-Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<CloudFolder | null>(null);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [filesToMove, setFilesToMove] = useState<CloudFile[]>([]);

  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // File Rename State
  const [renameFileModal, setRenameFileModal] = useState<CloudFile | null>(null);
  const [newFileName, setNewFileName] = useState('');

  // Delete Confirm State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    file?: CloudFile;
    isBatch?: boolean;
    isEmptyTrash?: boolean;
  } | null>(null);

  // Active file menu dropdown
  const [activeMenuFileId, setActiveMenuFileId] = useState<string | null>(null);

  const fetchFilesAndFolders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFolder && currentFolder !== 'all') params.set('folder', currentFolder);
      if (currentType && currentType !== 'all') params.set('type', currentType);
      if (isFavoriteView) params.set('favorite', 'true');
      if (isTrashView) params.set('trash', 'true');
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy) params.set('sort', sortBy);

      const [filesRes, foldersRes] = await Promise.all([
        apiFetch(`/api/files?${params.toString()}`),
        apiFetch('/api/folders'),
      ]);

      if (filesRes.ok) setFiles(await filesRes.json());
      if (foldersRes.ok) setFolders(await foldersRes.json());
    } catch (err) {
      console.error('Error fetching gallery data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilesAndFolders();
    setSelectedIds([]);
  }, [currentType, currentFolder, isFavoriteView, isTrashView, searchQuery, sortBy]);

  // Click outside to close active file menu
  useEffect(() => {
    const handleWindowClick = () => setActiveMenuFileId(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleToggleFavorite = async (file: CloudFile) => {
    try {
      await apiFetch(`/api/files/${file.id}/favorite`, { method: 'PATCH' });
      fetchFilesAndFolders();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleTrashToggle = async (file: CloudFile, isTrash: boolean) => {
    try {
      await apiFetch(`/api/files/${file.id}/trash`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTrash }),
      });
      fetchFilesAndFolders();
    } catch (err) {
      console.error('Failed to update trash state:', err);
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameFileModal || !newFileName.trim()) return;

    try {
      const res = await apiFetch(`/api/files/${renameFileModal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: newFileName.trim() }),
      });
      if (res.ok) {
        setRenameFileModal(null);
        fetchFilesAndFolders();
      }
    } catch (err) {
      console.error('Failed to rename file:', err);
    }
  };

  const handlePermanentDelete = async (fileId: string) => {
    try {
      await apiFetch(`/api/files/${fileId}`, { method: 'DELETE' });
      fetchFilesAndFolders();
      setDeleteConfirmModal(null);
    } catch (err) {
      console.error('Failed to delete file:', err);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      if (isTrashView) {
        await apiFetch('/api/files/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: selectedIds }),
        });
      } else {
        await apiFetch('/api/files/batch-trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileIds: selectedIds, isTrash: true }),
        });
      }
      setSelectedIds([]);
      fetchFilesAndFolders();
      setDeleteConfirmModal(null);
    } catch (err) {
      console.error('Failed batch operation:', err);
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await apiFetch('/api/files/trash/empty', { method: 'DELETE' });
      fetchFilesAndFolders();
      setDeleteConfirmModal(null);
    } catch (err) {
      console.error('Failed to empty trash:', err);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === files.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(files.map((f) => f.id));
    }
  };

  const filterTabs = [
    { label: 'All Files', type: 'all', icon: HardDrive, count: files.length },
    { label: 'Photos', type: 'images', icon: ImageIcon },
    { label: 'Videos', type: 'videos', icon: Video },
    { label: 'Documents', type: 'documents', icon: FileText },
    { label: 'Audio', type: 'audio', icon: Music },
    { label: 'Archives', type: 'archives', icon: Archive },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {isTrashView
                ? 'Trash & Recycling Bin'
                : isFavoriteView
                ? 'Starred Files'
                : currentFolder !== 'all'
                ? `Folder: ${currentFolder}`
                : currentType !== 'all'
                ? `${currentType.charAt(0).toUpperCase() + currentType.slice(1)} Vault`
                : 'Cloud File Explorer'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold">
              {files.length} items
            </span>
          </div>

          {currentFolder !== 'all' && (
            <div className="flex items-center space-x-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              <button
                onClick={() => {
                  searchParams.delete('folder');
                  setSearchParams(searchParams);
                }}
                className="hover:underline hover:text-blue-500"
              >
                Root Vault
              </button>
              <span>/</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentFolder}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {isTrashView && files.length > 0 && (
            <button
              onClick={() => setDeleteConfirmModal({ isEmptyTrash: true })}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Empty Trash</span>
            </button>
          )}

          {!isTrashView && (
            <>
              <button
                onClick={() => setFolderModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors shadow-sm"
              >
                <FolderPlus className="w-4 h-4" />
                <span>New Folder</span>
              </button>

              <button
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Categories Filter Tabs & Sort Controls */}
      {!isTrashView && !isFavoriteView && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 max-w-full">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentType === tab.type;
              return (
                <button
                  key={tab.type}
                  onClick={() => {
                    if (tab.type === 'all') searchParams.delete('type');
                    else searchParams.set('type', tab.type);
                    setSearchParams(searchParams);
                  }}
                  className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOrder)}
                className="bg-transparent text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A - Z)</option>
                <option value="name-desc">Name (Z - A)</option>
                <option value="size-desc">Largest Size</option>
                <option value="size-asc">Smallest Size</option>
              </select>
            </div>

            {/* Grid / List Mode */}
            <div className="flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-zinc-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subfolder Cards (Only in Main / Root view) */}
      {!isTrashView && !isFavoriteView && currentFolder === 'all' && folders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  searchParams.set('folder', f.name);
                  setSearchParams(searchParams);
                }}
                className="bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate group-hover:text-blue-500 transition-colors">
                    {f.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Loading State */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-zinc-500">Loading Telegram vault files...</p>
        </div>
      ) : files.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto mb-4">
            {isTrashView ? <Trash2 className="w-8 h-8" /> : <HardDrive className="w-8 h-8" />}
          </div>
          <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            {isTrashView ? 'Trash is Empty' : 'No Files Found'}
          </h4>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
            {isTrashView
              ? 'Deleted files will appear here before being permanently wiped from Telegram.'
              : searchQuery
              ? `No files matching "${searchQuery}".`
              : 'Upload files to start managing your cloud storage.'}
          </p>

          {!isTrashView && (
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New File</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {files.map((file, idx) => {
            const isImg = isImage(file.mimeType, file.fileName);
            const isVid = isVideo(file.mimeType, file.fileName);
            const isAud = isAudio(file.mimeType, file.fileName);
            const isDoc = isPdf(file.mimeType, file.fileName);
            const viewUrl = getFileUrl(file.id, 'view');
            const downloadUrl = getFileUrl(file.id, 'download');
            const isSelected = selectedIds.includes(file.id);

            return (
              <div
                key={file.id}
                onClick={() => openViewer(idx)}
                className={`group relative bg-white dark:bg-zinc-900 border rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {/* Checkbox Selector */}
                <button
                  onClick={(e) => toggleSelect(file.id, e)}
                  className={`absolute top-2.5 left-2.5 z-10 p-1.5 rounded-lg backdrop-blur-md transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white opacity-100'
                      : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60'
                  }`}
                  title="Select Item"
                >
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                </button>

                {/* Favorite Toggle */}
                {!isTrashView && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(file);
                    }}
                    className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-lg backdrop-blur-md transition-all ${
                      file.favorite
                        ? 'bg-yellow-400/90 text-yellow-950 opacity-100'
                        : 'bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60'
                    }`}
                    title="Star Item"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                )}

                {/* Thumbnail Display */}
                <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center overflow-hidden">
                  {isImg && (
                    <img
                      src={viewUrl}
                      alt={file.fileName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  )}

                  {isVid && (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <div className="w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-current" />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 text-zinc-400">
                        Video
                      </span>
                    </div>
                  )}

                  {isAud && (
                    <div className="flex flex-col items-center justify-center text-purple-500">
                      <Music className="w-9 h-9" />
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 text-zinc-400">
                        Audio
                      </span>
                    </div>
                  )}

                  {isDoc && (
                    <div className="flex flex-col items-center justify-center text-rose-500">
                      <FileText className="w-9 h-9" />
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 text-zinc-400">
                        PDF
                      </span>
                    </div>
                  )}

                  {!isImg && !isVid && !isAud && !isDoc && (
                    <div className="flex flex-col items-center justify-center text-zinc-400">
                      <HardDrive className="w-9 h-9" />
                      <span className="text-[10px] uppercase font-bold tracking-wider mt-1.5 text-zinc-400">
                        File
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Meta & Menu */}
                <div className="p-3 flex items-center justify-between gap-2">
                  <div className="truncate min-w-0">
                    <p
                      className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-500 transition-colors"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      {formatBytes(file.fileSize)} • {formatDate(file.createdAt)}
                    </p>
                  </div>

                  {/* Context Menu Button */}
                  <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() =>
                        setActiveMenuFileId(activeMenuFileId === file.id ? null : file.id)
                      }
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuFileId === file.id && (
                      <div className="absolute right-0 bottom-full mb-1 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-1.5 z-30 text-xs">
                        <button
                          onClick={() => {
                            setActiveMenuFileId(null);
                            openViewer(idx);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300"
                        >
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Open & Preview</span>
                        </button>

                        <a
                          href={downloadUrl}
                          download={file.fileName}
                          onClick={() => setActiveMenuFileId(null)}
                          className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300"
                        >
                          <Download className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Download</span>
                        </a>

                        {!isTrashView && (
                          <>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                setRenameFileModal(file);
                                setNewFileName(file.fileName);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Rename</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                setFilesToMove([file]);
                                setMoveModalOpen(true);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300"
                            >
                              <FolderInput className="w-3.5 h-3.5 text-zinc-400" />
                              <span>Move to Folder</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                handleTrashToggle(file, true);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Move to Trash</span>
                            </button>
                          </>
                        )}

                        {isTrashView && (
                          <>
                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                handleTrashToggle(file, false);
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Restore File</span>
                            </button>

                            <button
                              onClick={() => {
                                setActiveMenuFileId(null);
                                setDeleteConfirmModal({ file });
                              }}
                              className="w-full flex items-center space-x-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Permanently</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="p-3.5 w-10">
                  <button onClick={selectAll} className="text-zinc-400 hover:text-zinc-600">
                    {selectedIds.length === files.length && files.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Name</th>
                <th className="p-3.5 hidden sm:table-cell">Folder</th>
                <th className="p-3.5 hidden md:table-cell">Size</th>
                <th className="p-3.5 hidden lg:table-cell">Uploaded</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {files.map((file, idx) => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <tr
                    key={file.id}
                    onClick={() => openViewer(idx)}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="p-3.5" onClick={(e) => toggleSelect(file.id, e)}>
                      <button className="text-zinc-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                          {isImage(file.mimeType, file.fileName) ? (
                            <ImageIcon className="w-4 h-4 text-emerald-500" />
                          ) : isVideo(file.mimeType, file.fileName) ? (
                            <Video className="w-4 h-4 text-indigo-500" />
                          ) : isAudio(file.mimeType, file.fileName) ? (
                            <Music className="w-4 h-4 text-purple-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div className="truncate max-w-xs">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-xs sm:text-sm">
                            {file.fileName}
                          </p>
                          <p className="text-[11px] text-zinc-400 sm:hidden">
                            {formatBytes(file.fileSize)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-xs text-zinc-500 hidden sm:table-cell capitalize">
                      {file.folder || 'Root'}
                    </td>
                    <td className="p-3.5 text-xs text-zinc-500 hidden md:table-cell">
                      {formatBytes(file.fileSize)}
                    </td>
                    <td className="p-3.5 text-xs text-zinc-500 hidden lg:table-cell">
                      {formatDate(file.createdAt)}
                    </td>
                    <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-1">
                        <a
                          href={getFileUrl(file.id, 'download')}
                          download={file.fileName}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        {!isTrashView ? (
                          <button
                            onClick={() => handleTrashToggle(file, true)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTrashToggle(file, false)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Floating Multi-Selection Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 max-w-xl mx-auto px-4 z-40">
          <div className="bg-zinc-900/95 dark:bg-zinc-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-semibold">{selectedIds.length} items selected</span>
            </div>

            <div className="flex items-center space-x-2">
              {!isTrashView && (
                <>
                  <button
                    onClick={() => {
                      const selectedFiles = files.filter((f) => selectedIds.includes(f.id));
                      setFilesToMove(selectedFiles);
                      setMoveModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                    <span>Move</span>
                  </button>

                  <button
                    onClick={() => handleBatchDelete()}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trash</span>
                  </button>
                </>
              )}

              {isTrashView && (
                <>
                  <button
                    onClick={async () => {
                      await fetch('/api/files/batch-trash', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileIds: selectedIds, isTrash: false }),
                      });
                      setSelectedIds([]);
                      fetchFilesAndFolders();
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmModal({ isBatch: true })}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-medium transition-colors shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Forever</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                title="Deselect All"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {renameFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">Rename File</h3>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                autoFocus
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRenameFileModal(null)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {deleteConfirmModal.isEmptyTrash
                ? 'Empty Entire Trash?'
                : deleteConfirmModal.isBatch
                ? `Permanently Delete ${selectedIds.length} Items?`
                : 'Permanently Delete File?'}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
              This will remove the file(s) permanently from your Telegram private channel vault and
              cloud metadata. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmModal.isEmptyTrash) handleEmptyTrash();
                  else if (deleteConfirmModal.isBatch) handleBatchDelete();
                  else if (deleteConfirmModal.file) handlePermanentDelete(deleteConfirmModal.file.id);
                }}
                className="px-5 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/25"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Lightbox */}
      <MediaViewer
        files={files}
        currentIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        onNavigate={(newIndex) => setViewerIndex(newIndex)}
        onToggleFavorite={handleToggleFavorite}
        onDelete={(file) => {
          setViewerOpen(false);
          handleTrashToggle(file, true);
        }}
      />

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          fetchFilesAndFolders();
          setUploadModalOpen(false);
        }}
        folders={folders}
        currentFolder={currentFolder !== 'all' ? currentFolder : 'root'}
      />

      {/* Folder Creation Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => {
          setFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        onSuccess={() => fetchFilesAndFolders()}
        folderToEdit={folderToEdit}
      />

      {/* Move Files Modal */}
      <MoveModal
        isOpen={moveModalOpen}
        onClose={() => {
          setMoveModalOpen(false);
          setFilesToMove([]);
        }}
        onSuccess={() => {
          setSelectedIds([]);
          fetchFilesAndFolders();
        }}
        filesToMove={filesToMove}
        folders={folders}
      />
    </div>
  );
}
