import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  HardDrive,
  Folder,
  Send,
  Activity,
  Cpu,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Archive,
  Database,
  Lock,
} from 'lucide-react';
import { AdminStats, AdminUser, SystemStatus } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, usersRes, statusRes] = await Promise.all([
        apiFetch('/api/admin/stats'),
        apiFetch('/api/admin/users'),
        apiFetch('/api/admin/system-status'),
      ]);

      if (statsRes.status === 403 || usersRes.status === 403) {
        setError('Admin privileges required. Your account does not have ADMIN role.');
        setLoading(false);
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (statusRes.ok) setSysStatus(await statusRes.json());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Admin Access Restricted</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">{error}</p>
        <p className="text-xs text-zinc-400">
          Tip: You can use the Demo Admin login on the sign-in page to access the admin console.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-sky-500" />
            System & Storage Administration
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Global metrics, Telegram MTProto engine status, active user sessions, and storage telemetry.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAdminData}
          className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh Metrics"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Users
            </span>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.totalUsers || 0}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              {stats?.connectedTelegramUsers || 0} connected to Telegram
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Files in Telegram
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stats?.totalFiles || 0}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              In {stats?.totalFolders || 0} virtual folders
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Storage Replicated
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {formatBytes(stats?.totalStorageBytes || 0)}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Distributed across Telegram cloud
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              MTProto Engine
            </span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {sysStatus?.telegram.isApiConfigured ? 'Active' : 'Ready'}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              AES-256-GCM Session Encrypted
            </p>
          </div>
        </div>
      </div>

      {/* System Infrastructure Health Card */}
      {sysStatus && (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Server & Storage Architecture Health
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-zinc-400 block mb-1">Architecture</span>
              <span className="font-semibold text-zinc-900 dark:text-white">MTProto (Saved Messages)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-zinc-400 block mb-1">Database Engine</span>
              <span className="font-semibold text-zinc-900 dark:text-white">PostgreSQL / Prisma ORM</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-zinc-400 block mb-1">Node Runtime</span>
              <span className="font-semibold text-zinc-900 dark:text-white">{sysStatus.system.nodeVersion}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
              <span className="text-zinc-400 block mb-1">Server Uptime</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {Math.floor(sysStatus.uptimeSeconds / 60)} min {sysStatus.uptimeSeconds % 60} sec
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Table */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-sky-500" />
          Registered Users ({users.length})
        </h3>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-4">User</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Telegram Vault Status</th>
                  <th className="p-3.5">Files</th>
                  <th className="p-3.5">Folders</th>
                  <th className="p-3.5 pr-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="p-3.5 pl-4">
                      <span className="font-semibold text-zinc-900 dark:text-white block">
                        {u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username || 'User'}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">{u.email}</span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.isTelegramConnected ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Connected ({u.telegramUserId || 'User ID'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-zinc-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not connected
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-semibold text-zinc-900 dark:text-white">{u.filesCount}</td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400">{u.foldersCount}</td>
                    <td className="p-3.5 text-zinc-500 dark:text-zinc-400 pr-4">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Admin;
