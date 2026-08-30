import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  HardDrive,
  Clock,
  Star,
  Trash2,
  Settings as SettingsIcon,
  Upload,
  Search,
  Moon,
  Sun,
  LogOut,
  Send,
  ShieldCheck,
  AlertTriangle,
  Menu,
  X,
  Plus,
  ShieldAlert,
  Smartphone,
  FolderPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UploadModal } from './UploadModal';
import { FolderModal } from './FolderModal';
import { formatBytes } from '../utils/formatters';
import { CloudFolder, StorageStats } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, darkMode, toggleDarkMode, searchQuery, setSearchQuery, isTelegramConnected } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);

  const fetchFoldersAndStats = async () => {
    try {
      const [fRes, sRes] = await Promise.all([
        fetch('/api/folders'),
        fetch('/api/stats'),
      ]);
      if (fRes.ok) setFolders(await fRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } catch (err) {
      console.error('Failed to load navigation data:', err);
    }
  };

  useEffect(() => {
    fetchFoldersAndStats();
  }, [location.pathname]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'File Explorer', path: '/files', icon: HardDrive, badge: stats?.totalFiles },
    { label: 'Recent', path: '/recent', icon: Clock },
    { label: 'Starred', path: '/starred', icon: Star, badge: stats?.favorites },
    { label: 'Trash', path: '/trash', icon: Trash2, badge: stats?.trashFiles },
    { label: 'Telegram MTProto', path: '/connect-telegram', icon: Smartphone, highlight: !isTelegramConnected },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ label: 'Admin Console', path: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Navigation */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
          </div>
          <span className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
            Shadowtech MTProto
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="p-2 bg-sky-600 text-white rounded-lg cursor-pointer"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Desktop & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Send className="w-5 h-5 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base tracking-tight text-zinc-900 dark:text-white">
                  Shadowtech MTProto
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold">
                  MTProto
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium">Telegram Saved Messages</p>
            </div>
          </Link>
        </div>

        {/* Primary Action Button */}
        <div className="p-4 pb-2">
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white py-2.5 px-4 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload to Telegram</span>
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all font-medium ${
                  isActive
                    ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                } ${item.highlight ? 'ring-1 ring-amber-400/50 dark:ring-amber-500/40 text-amber-600 dark:text-amber-400' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-600 dark:text-sky-400' : ''}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isActive
                        ? 'bg-sky-200 dark:bg-sky-900 text-sky-800 dark:text-sky-200'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}

          {/* User Folders Section */}
          <div className="pt-4 pb-1">
            <div className="flex items-center justify-between px-3 mb-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <span>Vault Folders</span>
              <button
                type="button"
                onClick={() => setFolderModalOpen(true)}
                className="p-1 hover:text-sky-500 text-zinc-400 rounded transition-colors cursor-pointer"
                title="Create Folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5 max-h-36 overflow-y-auto">
              {folders.length === 0 ? (
                <div className="px-3 py-1.5 text-[11px] text-zinc-400 italic">No custom folders</div>
              ) : (
                folders.slice(0, 8).map((folder) => {
                  const isFolderActive = location.pathname === '/files' && location.search.includes(`folderId=${folder.id}`);
                  return (
                    <NavLink
                      key={folder.id}
                      to={`/files?folderId=${folder.id}`}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                        isFolderActive
                          ? 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="text-sm leading-none">📁</span>
                      <span className="truncate">{folder.name}</span>
                    </NavLink>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Telegram Vault Connection Indicator */}
        <div className="p-3 m-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {isTelegramConnected ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Telegram MTProto
              </span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                isTelegramConnected
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {isTelegramConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          <div className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Saved Storage</span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {formatBytes(stats?.totalSize || 0)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>{stats?.totalFiles || 0} files</span>
              <span>Unlimited GB</span>
            </div>
          </div>
        </div>

        {/* User Account & Theme Toggle Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate max-w-[130px]">
            <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center justify-center shrink-0">
              {user?.firstName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'User'}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-zinc-500 hover:text-rose-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top App Bar with Search */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30">
          <div className="relative w-96 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (location.pathname !== '/files') {
                  navigate('/files');
                }
              }}
              placeholder="Search files by name, extension, folder..."
              className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white dark:focus:bg-zinc-800 transition-all"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFolderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Folder</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={() => {
          fetchFoldersAndStats();
          setUploadModalOpen(false);
        }}
        folders={folders}
      />

      {/* Folder Creation Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        onClose={() => setFolderModalOpen(false)}
        onSuccess={() => {
          fetchFoldersAndStats();
        }}
      />
    </div>
  );
};
export default Layout;
