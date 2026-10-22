import React, { useState, useEffect } from 'react';
import {
  IoCloseOutline as X,
  IoMailOutline as Mail,
  IoLockClosedOutline as Lock,
  IoPersonOutline as UserIcon,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoAlertCircleOutline as AlertCircle,
  IoArrowForwardOutline as ArrowRight,
  IoShieldCheckmarkOutline as ShieldCheck,
  IoSyncOutline as RotateCw,
  IoSparkles as Sparkles,
  IoSendOutline as Send,
  IoArrowBackOutline as ArrowBack,
  IoKeyOutline as KeyIcon,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset form when modal opens to ensure a fresh session and prevent old account data leakage
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setIsLoading(false);
      setIsGoogleLoading(false);
      setEmail('');
      setPassword('');
      setName('');
    }
  }, [isOpen]);

  // Close on ESC & freeze background scroll
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.classList.add('modal-open');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.body.classList.remove('modal-open');
    };
  }, [isOpen, onClose]);

  // Listen for Google OAuth callback postMessage from popup window
  useEffect(() => {
    if (!isOpen) return;

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { token, user } = event.data;
        if (token && user) {
          setIsGoogleLoading(false);
          handleFinishAuth(
            user,
            token,
            `Berhasil masuk dengan Akun Google! Selamat datang, ${user.name || user.email}.`
          );
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setIsGoogleLoading(false);
        setError(event.data.error || 'Otorisasi Akun Google dibatalkan.');
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [isOpen]);

  const handleFinishAuth = (user: User, token: string, msg: string) => {
    // Save fresh user and token
    storage.saveToken(token);
    storage.saveUser(user);
    setSuccessMessage(msg);
    setIsLoading(false);
    setIsGoogleLoading(false);
    window.dispatchEvent(new Event('zhafx_auth_change'));
    window.dispatchEvent(new Event('zhafx_storage_change'));
    window.dispatchEvent(new Event('storage'));
    setTimeout(() => {
      onSuccess?.(user);
      onClose();
    }, 600);
  };

  // Google OAuth Login
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);

    const clientId = CONFIG.GOOGLE_CLIENT_ID;

    // 1. If active custom GOOGLE_CLIENT_ID is provided, launch direct Google OAuth flow
    if (clientId && clientId.trim() !== '') {
      const redirectUri = window.location.origin.includes('localhost') || window.location.origin.includes('run.app')
        ? `${window.location.origin}/auth/google/callback`
        : (CONFIG.GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`);
      const state = Math.random().toString(36).substring(2);

      const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleUrl.searchParams.set('client_id', clientId);
      googleUrl.searchParams.set('redirect_uri', redirectUri);
      googleUrl.searchParams.set('response_type', 'code');
      googleUrl.searchParams.set('scope', 'openid email profile');
      googleUrl.searchParams.set('access_type', 'offline');
      googleUrl.searchParams.set('prompt', 'select_account');
      googleUrl.searchParams.set('state', state);

      const width = 500;
      const height = 620;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        googleUrl.toString(),
        'zhafx_google_oauth',
        `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = googleUrl.toString();
      }
      return;
    }

    // 2. If no custom client ID, attempt Supabase Google OAuth provider
    try {
      // Clear any previous email session first to prevent session mixing
      await supabase.auth.signOut().catch(() => {});
      storage.clearAuth();

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/google/callback`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      console.warn('[Google Auth]:', err);
      setError(
        'Google Client ID sebelumnya telah dinonaktifkan oleh Google Cloud Console (Error 401: deleted_client). Silakan login dengan Email & Sandi di bawah, atau buat Client ID baru di Google Cloud Console.'
      );
    }
  };

  // Email/password auth handled with Supabase Auth + local backend fallback for reliable multi-account support
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('Email dan kata sandi wajib diisi.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Completely clear any previous session before authenticating new account
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    storage.clearAuth();

    try {
      if (mode === 'register') {
        let registeredUser: User | null = null;
        let registeredToken: string | null = null;

        // 1. Try Supabase signUp
        try {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password,
            options: {
              data: {
                name: name.trim() || cleanEmail.split('@')[0],
              },
            },
          });

          if (!signUpError && data?.user) {
            registeredUser = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              name: String(data.user.user_metadata?.name || name.trim() || cleanEmail.split('@')[0]),
              avatar: data.user.user_metadata?.avatar_url,
              joinedAt: new Date(data.user.created_at).getTime(),
            };
            if (data.session) {
              registeredToken = data.session.access_token;
            }
          }
        } catch {
          // continue to backend sync
        }

        // 2. Also register in local server DB
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: name.trim() || cleanEmail.split('@')[0],
              email: cleanEmail,
              password,
            }),
          });
          const serverData = await res.json().catch(() => ({}));
          if (res.ok && serverData.success && serverData.user && serverData.token) {
            registeredUser = serverData.user;
            registeredToken = serverData.token;
          }
        } catch {}

        if (registeredUser && registeredToken) {
          handleFinishAuth(registeredUser, registeredToken, `Pendaftaran berhasil! Selamat datang, ${registeredUser.name}.`);
        } else if (registeredUser) {
          setIsLoading(false);
          setSuccessMessage(
            'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.'
          );
        } else {
          throw new Error('Pendaftaran gagal. Silakan periksa kembali data Anda.');
        }
      } else {
        // Mode: 'login'
        let loggedInUser: User | null = null;
        let loggedInToken: string | null = null;
        let lastErrorMsg = '';

        // 1. Try Supabase Auth first
        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!signInError && data?.session && data?.user) {
            loggedInUser = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              name: String(data.user.user_metadata?.name || cleanEmail.split('@')[0]),
              avatar: data.user.user_metadata?.avatar_url,
              joinedAt: new Date(data.user.created_at).getTime(),
            };
            loggedInToken = data.session.access_token;
          } else if (signInError) {
            lastErrorMsg = signInError.message;
          }
        } catch (sbErr: any) {
          lastErrorMsg = sbErr?.message || '';
        }

        // 2. If not authenticated via Supabase, fallback to native server /api/auth/login
        if (!loggedInUser || !loggedInToken) {
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                login: cleanEmail,
                password,
              }),
            });
            const serverData = await res.json().catch(() => ({}));
            if (res.ok && serverData.success && serverData.user && serverData.token) {
              loggedInUser = serverData.user;
              loggedInToken = serverData.token;
            } else if (serverData.error) {
              lastErrorMsg = serverData.error;
            }
          } catch {}
        }

        if (!loggedInUser || !loggedInToken) {
          if (lastErrorMsg.includes('Invalid login credentials') || lastErrorMsg.includes('tidak cocok') || lastErrorMsg.includes('salah')) {
            throw new Error('Email atau kata sandi tidak cocok. Silakan periksa kembali.');
          } else if (lastErrorMsg.includes('Email not confirmed')) {
            throw new Error('Email belum dikonfirmasi. Periksa kotak masuk untuk tautan verifikasi.');
          } else {
            throw new Error(lastErrorMsg || 'Email atau kata sandi tidak cocok. Silakan periksa kembali.');
          }
        }

        handleFinishAuth(loggedInUser, loggedInToken, `Berhasil masuk! Selamat datang kembali, ${loggedInUser.name}.`);
      }
    } catch (err: any) {
      setIsLoading(false);
      let errMsg = err?.message || 'Autentikasi gagal. Silakan periksa data Anda.';
      if (errMsg.includes('Invalid login credentials')) {
        errMsg = 'Email atau kata sandi tidak cocok. Silakan periksa kembali.';
      } else if (errMsg.includes('User already registered')) {
        errMsg = 'Alamat email ini sudah terdaftar. Silakan pilih Masuk Akun.';
      } else if (errMsg.includes('Email not confirmed')) {
        errMsg = 'Email belum dikonfirmasi. Periksa kotak masuk untuk tautan verifikasi.';
      }
      setError(errMsg);
    }
  };

  // Forgot password handler using Supabase resetPasswordForEmail
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Alamat email wajib diisi.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const redirectOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'https://zhafxstreaming.web.id';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${redirectOrigin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccessMessage(
        'Tautan pemulihan kata sandi telah dikirim ke email Anda! Silakan periksa kotak masuk atau folder spam.'
      );
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim email pemulihan. Pastikan email terdaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Autentikasi Akun Zhafx"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Glass Sheet */}
      <div className="relative w-full max-w-md rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-white/20 shadow-2xl p-6 sm:p-7 space-y-4 z-10 text-white max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
              {mode === 'forgot' ? (
                <KeyIcon className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                {mode === 'forgot' ? 'Lupa Kata Sandi' : 'ZhafxStreaming'}
              </h2>
              <p className="text-[11px] text-white/50 mt-1">
                {mode === 'forgot'
                  ? 'Kirim tautan pemulihan kata sandi'
                  : 'Autentikasi Email & Kata Sandi (Supabase Auth)'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer ios-spring"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection: Masuk vs Daftar (only show when not in forgot password mode) */}
        {mode !== 'forgot' && (
          <div className="flex p-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Daftar Baru
            </button>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="p-3 rounded-[16px] bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-[18px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{mode === 'forgot' ? 'Tautan Terkirim' : 'Autentikasi Berhasil'}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-200/90">
              {successMessage}
            </p>
          </div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4 pt-1">
            <p className="text-xs text-white/70 leading-relaxed">
              Masukkan alamat email terdaftar akun Anda. Kami akan mengirimkan tautan aman dari Supabase untuk menyetel ulang kata sandi Anda.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/70 block">
                Alamat Email Terdaftar
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namaanda@email.com"
                  className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                />
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ios-spring cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-black" />
                  <span>Mengirim Email...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-black" />
                  <span>Kirim Tautan Reset</span>
                </>
              )}
            </button>

            <div className="pt-2 text-center border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-white/70 hover:text-white cursor-pointer transition-colors"
              >
                <ArrowBack className="w-3.5 h-3.5" />
                <span>Kembali ke Masuk Akun</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-1">
            {/* 1-Click Google OAuth Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading || isGoogleLoading}
              className="w-full h-11 rounded-full bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-xs shadow-md flex items-center justify-center gap-2.5 transition-all ios-spring cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>Menghubungkan Akun Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Lanjutkan dengan Google</span>
                </>
              )}
            </button>

            {/* Visual Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative px-3 text-[10px] text-zinc-400 bg-[#0E1017] rounded-full uppercase tracking-wider font-semibold">
                atau gunakan email
              </div>
            </div>

            {/* LOGIN & REGISTER FORM */}
            <form onSubmit={handlePasswordAuth} className="space-y-3.5">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 block">Nama Lengkap</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Lengkap Anda"
                      className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                    />
                    <UserIcon className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/70 block">
                  Alamat Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="namaanda@email.com"
                    className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                  />
                  <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-white/70 block">Kata Sandi</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-white/50 hover:text-white transition-colors underline cursor-pointer"
                    >
                      Lupa sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                  />
                  <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ios-spring cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-black" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {mode === 'register' ? 'Daftar Akun Baru' : 'Masuk Sekarang'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'register' ? 'login' : 'register');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-white/80 hover:text-white underline cursor-pointer"
                >
                  {mode === 'register'
                    ? 'Sudah memiliki akun? Masuk di sini'
                    : 'Belum memiliki akun? Daftar gratis sekarang'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/40 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-white/60" />
            <span>ZhafxStreaming &mdash; Autentikasi serverless aman dengan Supabase.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
