import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send,
  ShieldCheck,
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  RefreshCw,
  Info,
  Server,
  CloudLightning,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  Unlink,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TelegramStatusResponse } from '../types';
import { apiFetch, sanitizePhoneNumber } from '../utils/api';

const POPULAR_COUNTRIES = [
  { flag: '🇧🇩', name: 'Bangladesh', code: '+880' },
  { flag: '🇺🇸', name: 'USA / Canada', code: '+1' },
  { flag: '🇬🇧', name: 'UK', code: '+44' },
  { flag: '🇮🇳', name: 'India', code: '+91' },
  { flag: '🇵🇰', name: 'Pakistan', code: '+92' },
  { flag: '🇸🇦', name: 'Saudi Arabia', code: '+966' },
  { flag: '🇦🇪', name: 'UAE', code: '+971' },
];

export const ConnectTelegram: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<TelegramStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth Flow States: 'phone' | 'code' | '2fa' | 'connected'
  const [step, setStep] = useState<'phone' | 'code' | '2fa' | 'connected'>('phone');
  const [phone, setPhone] = useState('+880');
  const [code, setCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [authId, setAuthId] = useState('');
  const [isCodeViaApp, setIsCodeViaApp] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/user/telegram-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.isConnected) {
          setStep('connected');
        } else {
          setStep('phone');
        }
      }
    } catch (err) {
      console.error('Failed to fetch Telegram status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCountrySelect = (code: string) => {
    // If phone currently has another country code, replace or set prefix
    const currentNumberOnly = phone.replace(/^\+\d+\s*/, '');
    setPhone(`${code}${currentNumberOnly}`);
    setErrorMessage(null);
  };

  // Step 1: Send verification code to user's Telegram phone
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitizePhoneNumber(phone, '+880');
    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMessage('Please enter a valid phone number with country code (e.g. +8801642323871)');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiFetch('/api/auth/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, phoneNumber: cleanPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send Telegram verification code');
      }

      setAuthId(data.authId);
      setIsCodeViaApp(data.isCodeViaApp ?? true);
      setSuccessMessage('Verification code sent! Please check your official Telegram app messages.');
      setStep('code');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error connecting to Telegram MTProto');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMessage('Please enter the verification code you received');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId, code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification code failed');
      }

      if (data.needs2FA) {
        setStep('2fa');
        setSuccessMessage('2-Step Verification required. Please enter your Telegram cloud password.');
        return;
      }

      if (data.token) {
        localStorage.setItem('unlim_token', data.token);
      }

      setSuccessMessage('Telegram account connected successfully! Your Saved Messages will now act as your private cloud vault.');
      setStep('connected');
      await refreshUser();
      await fetchStatus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3: Verify 2FA Password
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password2FA) {
      setErrorMessage('Please enter your 2FA password');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await apiFetch('/api/auth/telegram/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authId, password: password2FA }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '2FA password verification failed');
      }

      if (data.token) {
        localStorage.setItem('unlim_token', data.token);
      }

      setSuccessMessage('Telegram account authenticated and connected!');
      setStep('connected');
      await refreshUser();
      await fetchStatus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect 2FA password');
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect Telegram Account
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Telegram storage? You can reconnect anytime.')) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/auth/disconnect-telegram', { method: 'POST' });
      if (res.ok) {
        setSuccessMessage('Telegram account disconnected.');
        setStep('phone');
        setPhone('+880');
        setCode('');
        setPassword2FA('');
        await refreshUser();
        await fetchStatus();
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
            <Send className="w-6 h-6 text-sky-500" />
            Connect Telegram MTProto Storage
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Connect your personal Telegram account to store files directly in your private <strong>Saved Messages</strong> vault.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status?.isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Storage Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-3.5 h-3.5" />
              Not Connected
            </span>
          )}
        </div>
      </div>

      {/* Architecture Highlights Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400">
            <CloudLightning className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Direct Saved Messages</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Uploads go straight to your Telegram account without intermediary storage bots.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">AES-256-GCM Session</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Your MTProto session string is encrypted at rest and never exposed to the browser.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white">Unlimited Personal Cloud</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Enjoy up to 2GB per file (4GB with Telegram Premium) with permanent cloud availability.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Connection Interface */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Step Indicator */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 px-6 py-4">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === 'phone'
                    ? 'bg-sky-600 text-white'
                    : step === 'connected' || step === 'code' || step === '2fa'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                1
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Phone</span>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-400" />

            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === 'code'
                    ? 'bg-sky-600 text-white'
                    : step === 'connected' || step === '2fa'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                2
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Code</span>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-400" />

            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === '2fa'
                    ? 'bg-sky-600 text-white'
                    : step === 'connected'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                3
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">2FA Password</span>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-400" />

            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  step === 'connected'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                ✓
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Connected</span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {/* STEP 1: Phone Input */}
            {step === 'phone' && (
              <motion.form
                key="step-phone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSendCode}
                className="max-w-md mx-auto space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Enter Your Telegram Phone Number</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    We will send a Telegram login code directly to your official Telegram app.
                  </p>
                </div>

                {/* Country Quick Pick */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Country Code
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_COUNTRIES.map((c) => {
                      const isActive = phone.startsWith(c.code);
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleCountrySelect(c.code)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? 'bg-sky-600 text-white font-semibold shadow-sm'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          <span>{c.flag}</span>
                          <span>{c.code}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Phone Number (with Country Code)
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 164 232 3871"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Auto-formats Bangladesh (+880), US (+1), UK (+44), India (+91), etc.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Connecting to Telegram MTProto...
                    </>
                  ) : (
                    <>
                      Send Login Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.form>
            )}

            {/* STEP 2: Code Verification */}
            {step === 'code' && (
              <motion.form
                key="step-code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleVerifyCode}
                className="max-w-md mx-auto space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Enter Verification Code</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A 5-digit code was sent to your <strong>Telegram app</strong> on <strong>{phone}</strong>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Telegram Login Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="12345"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all cursor-pointer"
                  >
                    Change Phone
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>Verify Code</>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 3: 2FA Password */}
            {step === '2fa' && (
              <motion.form
                key="step-2fa"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleVerify2FA}
                className="max-w-md mx-auto space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Two-Step Verification</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Your Telegram account is protected with a cloud 2FA password. Please enter it below.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Telegram 2FA Password
                  </label>
                  <input
                    type="password"
                    value={password2FA}
                    onChange={(e) => setPassword2FA(e.target.value)}
                    placeholder="Enter your 2FA password"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('code')}
                    className="flex-1 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all cursor-pointer"
                  >
                    Back to Code
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying Password...
                      </>
                    ) : (
                      <>Authenticate</>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* STEP 4: Connected Account Details */}
            {step === 'connected' && (
              <motion.div
                key="step-connected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto text-center space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Telegram MTProto Storage Active
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Your personal cloud storage vault is connected directly to your Telegram Saved Messages.
                  </p>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-4 text-left border border-zinc-200 dark:border-zinc-700/60 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Account ID:</span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-200 font-medium">
                      {user?.telegramUserId || user?.userId || 'tg_user'}
                    </span>
                  </div>
                  {user?.phone && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Phone:</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-200 font-medium">
                        {user.phone}
                      </span>
                    </div>
                  )}
                  {user?.username && (
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Telegram Username:</span>
                      <span className="text-sky-600 dark:text-sky-400 font-medium">@{user.username}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Session Status:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      AES-256-GCM Encrypted
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <a
                    href="/files"
                    className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Open File Explorer
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={submitting}
                    className="py-3 px-4 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Unlink className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Telegram MTProto Info Box */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
        <h4 className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-sky-500" />
          Telegram MTProto Architecture & Credentials Guide
        </h4>
        <p className="leading-relaxed">
          Shadowtech MTProto connects directly to the official <strong>Telegram MTProto protocol</strong> using user authorization. Files uploaded through the web app are saved directly into your personal <strong>Saved Messages</strong> dialogue.
        </p>
        <p className="leading-relaxed">
          To run the MTProto client, your backend container uses <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200">TELEGRAM_API_ID</code> and <code className="bg-zinc-200 dark:bg-zinc-800 px-1 py-0.5 rounded text-zinc-800 dark:text-zinc-200">TELEGRAM_API_HASH</code> obtained freely from <a href="https://my.telegram.org" target="_blank" rel="noreferrer" className="text-sky-500 underline inline-flex items-center gap-0.5">my.telegram.org <ExternalLink className="w-3 h-3 inline" /></a>.
        </p>
      </div>
    </div>
  );
};

export default ConnectTelegram;
