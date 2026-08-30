import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Key,
  Database,
  Lock,
  User as UserIcon,
  HardDrive,
  Info,
  Smartphone,
  Unlink,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TelegramStatusResponse } from '../types';
import { apiFetch } from '../utils/api';

export const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatusResponse | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const checkTelegramStatus = async () => {
    setTesting(true);
    try {
      const res = await apiFetch('/api/user/telegram-status');
      if (res.ok) {
        const data = await res.json();
        setTelegramStatus(data);
      }
    } catch (err) {
      console.error('Error checking telegram status:', err);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    checkTelegramStatus();
  }, []);

  const sampleEnv = `TELEGRAM_API_ID="12345678"
TELEGRAM_API_HASH="0123456789abcdef0123456789abcdef"
SESSION_SECRET="your-secure-session-secret-at-least-32-chars"
ENCRYPTION_KEY="your-super-secure-aes256-encryption-key"
ADMIN_EMAIL="admin@shadowtech.com"
ADMIN_PASSWORD="admin123456"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(sampleEnv);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Telegram account from this session?')) return;
    setDisconnecting(true);
    try {
      const res = await apiFetch('/api/auth/disconnect-telegram', { method: 'POST' });
      if (res.ok) {
        await refreshUser();
        await checkTelegramStatus();
      }
    } catch (err) {
      console.error('Failed to disconnect Telegram:', err);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Account & Storage Settings
        </h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your personal Telegram MTProto Saved Messages storage, session encryption, and account security.
        </p>
      </div>

      {/* Telegram MTProto Connection Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                telegramStatus?.isConnected
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
              }`}
            >
              <Send className="w-6 h-6 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">
                  Telegram MTProto Storage Vault
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    telegramStatus?.isConnected
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {telegramStatus?.isConnected ? 'CONNECTED (SAVED MESSAGES)' : 'NOT CONNECTED'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {telegramStatus?.isConnected
                  ? 'Your personal Telegram account Saved Messages is actively storing files via MTProto.'
                  : 'Connect your phone number to store files directly in your private Telegram Saved Messages.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={checkTelegramStatus}
              disabled={testing}
              className="px-3.5 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? 'Checking...' : 'Check Status'}</span>
            </button>

            {!telegramStatus?.isConnected ? (
              <Link
                to="/connect-telegram"
                className="px-4 py-2 text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5"
              >
                <span>Connect Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3.5 py-2 text-xs font-semibold border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>

        {/* Telegram Details if connected */}
        {telegramStatus?.isConnected && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
                Telegram Account
              </span>
              <p className="font-semibold text-zinc-900 dark:text-white mt-0.5">
                {telegramStatus.telegramInfo?.firstName || telegramStatus.user?.firstName || 'Connected User'}{' '}
                {telegramStatus.telegramInfo?.lastName || ''}
              </p>
              <p className="text-zinc-500 font-mono text-[11px]">{telegramStatus.telegramInfo?.phone || telegramStatus.user?.phone || 'Telegram Phone'}</p>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
                Storage Destination
              </span>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <Send className="w-3 h-3" /> Saved Messages (me)
              </p>
              <p className="text-zinc-500 text-[11px]">Direct MTProto Stream</p>
            </div>
            <div>
              <span className="font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
                Session Security
              </span>
              <p className="font-semibold text-zinc-900 dark:text-white mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> AES-256-GCM
              </p>
              <p className="text-zinc-500 text-[11px]">Encrypted at rest</p>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-sky-500" />
          <h3 className="font-bold text-base text-zinc-900 dark:text-white">Account Profile</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Name</span>
            <p className="font-semibold text-zinc-900 dark:text-white mt-1">
              {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.username || 'User'}
            </p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Email Address</span>
            <p className="font-semibold text-zinc-900 dark:text-white mt-1 font-mono">{user?.email}</p>
          </div>
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Role</span>
            <p className="font-semibold text-zinc-900 dark:text-white mt-1">{user?.role || 'USER'}</p>
          </div>
        </div>
      </div>

      {/* Server & MTProto Configuration Reference */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">
              MTProto Environment Variables
            </h3>
          </div>
          <button
            type="button"
            onClick={handleCopyEnv}
            className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer font-medium"
          >
            {copiedEnv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedEnv ? 'Copied' : 'Copy Sample .env'}</span>
          </button>
        </div>

        <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-zinc-800 leading-relaxed">
          {sampleEnv}
        </pre>
      </div>
    </div>
  );
};
export default Settings;
