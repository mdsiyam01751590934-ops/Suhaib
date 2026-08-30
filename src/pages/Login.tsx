import React, { useState } from 'react';
import { Send, Lock, Mail, ShieldCheck, ArrowRight, Loader2, Sparkles, CheckCircle2, QrCode, Phone, KeyRound, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sanitizePhoneNumber } from '../utils/api';

const POPULAR_COUNTRIES = [
  { flag: '🇧🇩', name: 'Bangladesh', code: '+880' },
  { flag: '🇺🇸', name: 'USA', code: '+1' },
  { flag: '🇬🇧', name: 'UK', code: '+44' },
  { flag: '🇮🇳', name: 'India', code: '+91' },
  { flag: '🇵🇰', name: 'Pakistan', code: '+92' },
  { flag: '🇸🇦', name: 'Saudi', code: '+966' },
  { flag: '🇦🇪', name: 'UAE', code: '+971' },
];

export default function Login() {
  const { loginWithTelegramStart, loginWithTelegramVerify, loginWithTelegram2FA, adminLogin, telegramConfigured } = useAuth();
  
  const [tab, setTab] = useState<'telegram' | 'qr' | 'admin'>('telegram');

  // Telegram phone auth state
  const [phone, setPhone] = useState('+880');
  const [code, setCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | '2fa'>('phone');
  const [authId, setAuthId] = useState('');
  const [isCodeViaApp, setIsCodeViaApp] = useState(false);

  // Admin login state
  const [adminEmail, setAdminEmail] = useState('admin@shadowtech.com');
  const [adminPassword, setAdminPassword] = useState('admin123456');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleCountrySelect = (cCode: string) => {
    const numberOnly = phone.replace(/^\+\d+\s*/, '');
    setPhone(`${cCode}${numberOnly}`);
    setError('');
  };

  // Step 1: Send phone verification code
  const handleStartTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = sanitizePhoneNumber(phone, '+880');
    if (!cleanPhone || cleanPhone.length < 7) {
      setError('Please enter a valid phone number with country code (e.g. +8801642323871)');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await loginWithTelegramStart(cleanPhone);
      setAuthId(res.authId);
      setIsCodeViaApp(!!res.isCodeViaApp);
      setStep('code');
      setSuccessMsg(
        res.isCodeViaApp
          ? 'Verification code sent to your official Telegram app!'
          : 'Verification code sent via SMS/Telegram.'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Telegram login.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify login code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.trim().length < 3) {
      setError('Please enter the code you received');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await loginWithTelegramVerify(authId, code.trim());
      if (res.needs2FA) {
        setStep('2fa');
        setSuccessMsg('Two-Step Verification (2FA) required. Please enter your Telegram cloud password.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and retry.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify 2FA password
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password2FA) {
      setError('Please enter your 2FA password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginWithTelegram2FA(authId, password2FA);
    } catch (err: any) {
      setError(err.message || 'Incorrect 2FA password.');
    } finally {
      setLoading(false);
    }
  };

  // Admin login submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminLogin(adminEmail, adminPassword);
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative overflow-hidden antialiased font-sans">
      {/* Background Decorative Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side: Product Identity */}
        <div className="space-y-6 hidden lg:block pr-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-xl shadow-blue-500/25">
              <Send className="w-6 h-6 -rotate-12 translate-x-0.5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Shadowtech MTProto</h1>
              <p className="text-xs text-sky-400 font-semibold tracking-wider uppercase">
                Telegram MTProto Storage
              </p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              Your personal cloud, powered by Telegram.
            </h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              Store your files securely in your Telegram account's Saved Messages with zero server retention and instant high-speed streaming.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-sm text-zinc-300">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Real MTProto client integration directly to your Saved Messages</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Zero server-side permanent file storage or database lock-in</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Virtual folders, starred files, and trash using message metadata</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>AES-256-GCM encrypted session storage at rest</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Box */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-sky-400 flex items-center justify-center mx-auto mb-3 lg:hidden">
              <Send className="w-5 h-5 -rotate-12" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Your personal cloud
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Store your files securely in your Telegram account.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80 mb-6">
            <button
              type="button"
              onClick={() => {
                setTab('telegram');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                tab === 'telegram'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Phone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('qr');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                tab === 'qr'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('admin');
                setError('');
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                tab === 'admin'
                  ? 'bg-zinc-800 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {error && (
            <div className="p-3 mb-4 text-xs bg-rose-950/50 text-rose-300 rounded-xl border border-rose-800/80 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 mb-4 text-xs bg-emerald-950/50 text-emerald-300 rounded-xl border border-emerald-800/80 flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: TELEGRAM PHONE AUTH FLOW */}
          {tab === 'telegram' && (
            <div>
              {step === 'phone' && (
                <form onSubmit={handleStartTelegram} className="space-y-4">
                  {/* Quick country selection */}
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
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
                                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
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
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Phone Number (with Country Code)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 164 232 3871"
                        className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Auto-formats Bangladesh (+880), USA (+1), UK (+44), India (+91), etc.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Telegram MTProto...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue with Telegram</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {step === 'code' && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Telegram Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="12345"
                        className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-lg"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Check your Telegram app messages for the login code.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Open Vault</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      ← Change phone number
                    </button>
                  </div>
                </form>
              )}

              {step === '2fa' && (
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Telegram 2FA Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        value={password2FA}
                        onChange={(e) => setPassword2FA(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Enter your Telegram cloud password configured in Security Settings.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying 2FA...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Authorization</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: QR CODE LOGIN */}
          {tab === 'qr' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-inner flex items-center justify-center">
                <div className="w-full h-full border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center justify-center text-zinc-800 p-4 text-center">
                  <QrCode className="w-16 h-16 text-zinc-800 mb-2" />
                  <span className="text-[11px] font-semibold">Scan with Telegram</span>
                </div>
              </div>
              <div className="text-xs text-zinc-400 max-w-xs mx-auto space-y-1">
                <p>1. Open Telegram on your phone</p>
                <p>2. Go to <strong>Settings → Devices → Link Desktop Device</strong></p>
                <p>3. Point your phone at this screen to confirm</p>
              </div>
              <p className="text-[11px] text-sky-400">
                Or use the Phone Login tab for direct code verification.
              </p>
            </div>
          )}

          {/* TAB 3: ADMIN LOGIN */}
          {tab === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@shadowtech.com"
                    className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-zinc-800/80 border border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all border border-zinc-700 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Sign In to Admin Panel</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
