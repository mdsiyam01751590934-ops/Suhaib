import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { apiFetch } from '../utils/api';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isTelegramConnected: boolean;
  telegramConfigured: boolean;
  loading: boolean;
  loginWithTelegramStart: (phone: string) => Promise<{ authId: string; phoneCodeHash?: string; isCodeViaApp?: boolean; formattedPhone?: string }>;
  loginWithTelegramVerify: (authId: string, code: string) => Promise<{ needs2FA?: boolean }>;
  loginWithTelegram2FA: (authId: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  disconnectTelegram: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isTelegramConnected, setIsTelegramConnected] = useState<boolean>(false);
  const [telegramConfigured, setTelegramConfigured] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('unlim_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('unlim_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('unlim_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setIsTelegramConnected(!!data.isTelegramConnected);
        setTelegramConfigured(data.telegramConfigured !== false);
      } else {
        setUser(null);
        setIsTelegramConnected(false);
      }
    } catch {
      setUser(null);
      setIsTelegramConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithTelegramStart = async (phone: string) => {
    const res = await apiFetch('/api/auth/telegram/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, phoneNumber: phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to start Telegram verification');
    }
    return data;
  };

  const loginWithTelegramVerify = async (authId: string, code: string) => {
    const res = await apiFetch('/api/auth/telegram/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify code');
    }
    if (data.needs2FA) {
      return { needs2FA: true };
    }
    if (data.token) {
      localStorage.setItem('unlim_token', data.token);
    }
    setUser(data.user);
    setIsTelegramConnected(true);
    return { needs2FA: false };
  };

  const loginWithTelegram2FA = async (authId: string, password: string) => {
    const res = await apiFetch('/api/auth/telegram/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authId, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to verify 2FA password');
    }
    if (data.token) {
      localStorage.setItem('unlim_token', data.token);
    }
    setUser(data.user);
    setIsTelegramConnected(true);
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await apiFetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid admin credentials');
    }
    if (data.token) {
      localStorage.setItem('unlim_token', data.token);
    }
    setUser(data.user);
    setIsTelegramConnected(false);
  };

  const disconnectTelegram = async () => {
    try {
      await apiFetch('/api/auth/disconnect-telegram', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setIsTelegramConnected(false);
    await refreshUser();
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('unlim_token');
    setUser(null);
    setIsTelegramConnected(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isTelegramConnected,
        telegramConfigured,
        loading,
        loginWithTelegramStart,
        loginWithTelegramVerify,
        loginWithTelegram2FA,
        adminLogin,
        disconnectTelegram,
        logout,
        refreshUser,
        darkMode,
        toggleDarkMode,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
