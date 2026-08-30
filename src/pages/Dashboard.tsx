import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  HardDrive,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Archive,
  Star,
  Upload,
  ArrowRight,
  Send,
  ShieldCheck,
  AlertTriangle,
  FolderPlus,
  Play,
  Download,
  Eye,
  Smartphone,
  CheckCircle2,
  Trash2,
  Folder,
} from 'lucide-react';
import { CloudFile, CloudFolder } from '../types';
import { formatBytes, formatDate, isImage, isVideo, isAudio, isPdf } from '../utils/formatters';
import { MediaViewer } from '../components/MediaViewer';
import { UploadModal } from '../components/UploadModal';
import { FolderModal } from '../components/FolderModal';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getFileUrl } from '../utils/api';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isTelegramConnected } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentFiles, setRecentFiles] = useState<CloudFile[]>([]);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);

  // Viewer State
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [sRes, fRes, filesRes] = await Promise.all([
        apiFetch('/api/stats'),
        apiFetch('/api/folders'),
        apiFetch('/api/files?limit=12'),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (fRes.ok) setFolders(await fRes.json());
      if (filesRes.ok) setRecentFiles(await filesRes.json());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handleToggleFavorite = async (file: CloudFile) => {
    try {
      await apiFetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !file.isStarred }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const categories = [
    {
      title: 'Images',
      count: stats?.breakdown?.images || 0,
      size: stats?.breakdown?.imagesSize || 0,
      icon: ImageIcon,
      color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
      type: 'images',
    },
    {
      title: 'Videos',
      count: stats?.breakdown?.videos || 0,
      size: stats?.breakdown?.videosSize || 0,
      icon: Video,
      color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
      type: 'videos',
    },
    {
      title: 'Documents',
      count: stats?.breakdown?.documents || 0,
      size: stats?.breakdown?.documentsSize || 0,
      icon: FileText,
      color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
      type: 'documents',
    },
    {
      title: 'Audio',
      count: stats?.breakdown?.audio || 0,
      size: stats?.breakdown?.audioSize || 0,
      icon: Music,
      color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
      type: 'audio',
    },
    {
      title: 'Archives',
      count: stats?.breakdown?.archives || 0,
      size: stats?.breakdown?.archivesSize || 0,
      icon: Archive,
      color: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
      type: 'archives',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Header with Title and Connection Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Your Files
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Your personal cloud, powered by Telegram.
          </p>

          <div className="mt-3 flex items-center gap-2">
            {isTelegramConnected ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Telegram Connected ✓ {user?.username ? `@${user.username}` : user?.phone || 'Saved Messages'}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Telegram Not Connected</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!isTelegramConnected && (
            <Link
              to="/connect-telegram"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Connect Telegram</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setFolderModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Storage Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Storage
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {formatBytes(stats?.totalSize || 0)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Unlimited Telegram Saved Messages
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Files
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <ImageIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.totalFiles || 0}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              In {stats?.foldersCount || folders.length || 0} virtual folders
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Starred
            </span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <Star className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.favorites || 0}
            </p>
            <Link
              to="/starred"
              className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline mt-1 inline-block"
            >
              View favorites →
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Trash
            </span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.trashFiles || 0}
            </p>
            <Link
              to="/trash"
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline mt-1 inline-block"
            >
              View trash bin →
            </Link>
          </div>
        </div>
      </div>

      {/* Category Folders Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            Categories & Media
          </h3>
          <Link
            to="/files"
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold flex items-center gap-1"
          >
            <span>Explore All Files</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.type}
                onClick={() => navigate(`/files?type=${cat.type}`)}
                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-sky-400 dark:hover:border-sky-500 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 border ${cat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-xs text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {cat.title}
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {cat.count} {cat.count === 1 ? 'file' : 'files'} {cat.size > 0 ? `• ${formatBytes(cat.size)}` : ''}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Files Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Recent Files
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Files uploaded to your Telegram Saved Messages
            </p>
          </div>
          <Link
            to="/recent"
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold"
          >
            View All Recent →
          </Link>
        </div>

        {recentFiles && recentFiles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentFiles.map((file, idx) => {
              const isImg = isImage(file.mimeType, file.name);
              const isVid = isVideo(file.mimeType, file.name);
              const isAud = isAudio(file.mimeType, file.name);
              const isDoc = isPdf(file.mimeType, file.name);
              const viewUrl = getFileUrl(file.id, 'view');
              const downloadUrl = getFileUrl(file.id, 'download');

              return (
                <div
                  key={file.id}
                  className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col"
                >
                  <div
                    onClick={() => openViewer(idx)}
                    className="relative aspect-square bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer"
                  >
                    {isImg && (
                      <img
                        src={viewUrl}
                        alt={file.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    )}

                    {isVid && (
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <div className="w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center backdrop-blur-xs group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">
                          Video
                        </span>
                      </div>
                    )}

                    {isAud && (
                      <div className="flex flex-col items-center justify-center text-purple-500">
                        <Music className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">
                          Audio
                        </span>
                      </div>
                    )}

                    {isDoc && (
                      <div className="flex flex-col items-center justify-center text-rose-500">
                        <FileText className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">
                          PDF Doc
                        </span>
                      </div>
                    )}

                    {!isImg && !isVid && !isAud && !isDoc && (
                      <div className="flex flex-col items-center justify-center text-zinc-400">
                        <HardDrive className="w-8 h-8" />
                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 text-zinc-400">
                          File
                        </span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openViewer(idx);
                        }}
                        className="p-1.5 rounded-lg bg-white/90 text-zinc-900 hover:bg-white transition-colors"
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <a
                        href={downloadUrl}
                        download={file.name}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-white/90 text-zinc-900 hover:bg-white transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  <div className="p-3 flex flex-col justify-between flex-1">
                    <div className="truncate">
                      <p
                        onClick={() => openViewer(idx)}
                        className="text-xs font-semibold text-zinc-900 dark:text-white truncate hover:text-sky-500 cursor-pointer"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {formatBytes(file.size || file.fileSize)} • {formatDate(file.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              Your Telegram Vault is Ready
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-6">
              Upload photos, videos, documents, or music. Files stream directly to and from your Telegram account's Saved Messages.
            </p>
            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload First File</span>
            </button>
          </div>
        )}
      </div>

      {/* Media Viewer Modal */}
      {recentFiles.length > 0 && (
        <MediaViewer
          files={recentFiles}
          currentIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onNavigate={(newIndex) => setViewerIndex(newIndex)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          setUploadModalOpen(false);
        }}
        folders={folders}
      />

      {/* Folder Creation Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
        }}
      />
    </div>
  );
};
export default Dashboard;
