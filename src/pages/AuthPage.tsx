import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  IoMailOutline as Mail,
  IoLockClosedOutline as Lock,
  IoPersonOutline as UserIcon,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoAlertCircleOutline as AlertCircle,
  IoArrowForwardOutline as ArrowRight,
  IoSyncOutline as RotateCw,
  IoArrowBackOutline as ArrowBack,
  IoKeyOutline as KeyIcon,
  IoSparkles as Sparkles,
  IoSendOutline as Send,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../config';

interface AuthPageProps {
  initialMode?: 'login' | 'register' | 'forgot';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  const navigate = useNavigate();
  const location = useLocation();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync mode from prop if it changes
  useEffect(() => {
    if (location.pathname === '/register') setMode('register');
    else if (location.pathname === '/forgot-password') setMode('forgot');
    else if (location.pathname === '/login') setMode('login');
  }, [location.pathname]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (storage.getUser()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleFinishAuth = (user: User, token: string, msg: string) => {
    storage.saveToken(token);
    storage.saveUser(user);
    setSuccessMessage(msg);
    setIsLoading(false);
    setIsGoogleLoading(false);
    window.dispatchEvent(new Event('zhafx_auth_change'));
    window.dispatchEvent(new Event('zhafx_storage_change'));
    window.dispatchEvent(new Event('storage'));
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 800);
  };

  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    setError(null);
    setSuccessMessage(null);

    const clientId = CONFIG.GOOGLE_CLIENT_ID;

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

      window.location.href = googleUrl.toString();
      return;
    }

    try {
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

      if (oauthError) throw oauthError;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      console.warn('[Google Auth]:', err);
      setError(
        'Google OAuth tidak terkonfigurasi. Silakan masuk menggunakan Email & Kata Sandi.'
      );
    }
  };

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

    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}
    storage.clearAuth();

    try {
      if (mode === 'register') {
        let registeredUser: User | null = null;
        let registeredToken: string | null = null;

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
          // continue to backend
        }

        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              password,
              name: name.trim() || cleanEmail.split('@')[0],
            }),
          });
          const backendData = await res.json();
          if (res.ok && backendData.success && backendData.user) {
            registeredUser = backendData.user;
            registeredToken = backendData.token || registeredToken;
          }
        } catch {
          // ignore
        }

        if (registeredUser) {
          const finalToken = registeredToken || `token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          handleFinishAuth(
            registeredUser,
            finalToken,
            `Pendaftaran berhasil! Selamat datang di Zhafx, ${registeredUser.name}.`
          );
          return;
        }

        throw new Error('Gagal mendaftarkan akun. Silakan periksa kembali email Anda.');
      } else {
        // Mode Login
        let loggedUser: User | null = null;
        let loggedToken: string | null = null;

        try {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (!signInError && data?.user && data.session) {
            loggedUser = {
              id: data.user.id,
              email: data.user.email || cleanEmail,
              name: String(data.user.user_metadata?.name || cleanEmail.split('@')[0]),
              avatar: data.user.user_metadata?.avatar_url,
              joinedAt: new Date(data.user.created_at).getTime(),
            };
            loggedToken = data.session.access_token;
          }
        } catch {
          // continue to backend
        }

        if (!loggedUser) {
          try {
            const res = await fetch('/api/auth/login-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: cleanEmail,
                password,
              }),
            });
            const backendData = await res.json();
            if (res.ok && backendData.success && backendData.user) {
              loggedUser = backendData.user;
              loggedToken = backendData.token;
            }
          } catch {
            // ignore
          }
        }

        if (loggedUser && loggedToken) {
          handleFinishAuth(
            loggedUser,
            loggedToken,
            `Berhasil masuk! Selamat datang kembali, ${loggedUser.name}.`
          );
          return;
        }

        throw new Error('Email atau kata sandi tidak cocok. Silakan periksa kembali.');
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat memproses akun.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Masukkan alamat email Anda.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccessMessage(
        'Tautan atur ulang kata sandi telah dikirim ke email Anda! Silakan periksa kotak masuk atau spam.'
      );
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim email reset. Pastikan email Anda terdaftar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 pt-24 pb-16">
      <div className="w-full max-w-md liquid-glass-dense border border-white/20 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 text-white relative">
        {/* Navigation Link back */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowBack className="w-4 h-4" />
            <span>Beranda</span>
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3 h-3" />
            <span>ZHAFX CLOUD</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto mb-2">
            {mode === 'forgot' ? (
              <KeyIcon className="w-6 h-6" />
            ) : mode === 'register' ? (
              <UserIcon className="w-6 h-6" />
            ) : (
              <Lock className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === 'login'
              ? 'Masuk ke Zhafx'
              : mode === 'register'
              ? 'Buat Akun Baru'
              : 'Lupa Kata Sandi?'}
          </h1>
          <p className="text-xs text-zinc-400">
            {mode === 'login'
              ? 'Akses daftar tontonan, riwayat, dan komentar di semua perangkat'
              : mode === 'register'
              ? 'Daftar gratis tanpa batas untuk sinkronisasi tayangan favoritmu'
              : 'Masukkan email untuk menerima tautan atur ulang kata sandi'}
          </p>
        </div>

        {/* Tab switch for Login / Register */}
        {mode !== 'forgot' && (
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-white/[0.05] border border-white/10 text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Daftar Baru
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        {mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isGoogleLoading || isLoading}
              className="w-full h-11 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-xs shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGoogleLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-zinc-900" />
                  <span>Menghubungkan Google...</span>
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
                  <span>
                    {mode === 'login'
                      ? 'Lanjutkan dengan Google'
                      : 'Daftar dengan Google'}
                  </span>
                </>
              )}
            </button>

            <div className="relative flex items-center justify-center my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative px-3 text-[10px] text-zinc-400 bg-[#0E1017] rounded-full uppercase tracking-wider font-semibold">
                atau gunakan email
              </div>
            </div>
          </>
        )}

        {/* Forms */}
        {mode === 'forgot' ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="forgot-email"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Alamat Email
              </label>
              <div className="relative">
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-black" />
                  <span>Mengirim Tautan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-black" />
                  <span>Kirim Tautan Reset</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Kembali ke halaman masuk
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePasswordAuth} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label
                  htmlFor="auth-name"
                  className="text-xs font-semibold text-zinc-300 block"
                >
                  Nama Tampilan
                </label>
                <div className="relative">
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nama lengkap Anda"
                    className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                  />
                  <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="auth-email"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Alamat Email
              </label>
              <div className="relative">
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="auth-password"
                  className="text-xs font-semibold text-zinc-300 block"
                >
                  Kata Sandi
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Lupa sandi?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-black" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'login' ? 'Masuk ke Akun' : 'Daftar Sekarang'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
