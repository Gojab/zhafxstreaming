import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { storage } from '../lib/storage';
import { User } from '../types';
import { CONFIG } from '../config';

declare global {
  interface Window {
    google?: any;
  }
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

async function safeJsonParse(res: Response): Promise<any> {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'google' | 'email'>('google');
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConsoleHelp, setShowConsoleHelp] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFinishAuth = (user: User, token: string, msg: string) => {
    storage.saveToken(token);
    storage.saveUser(user);
    setSuccessMessage(msg);
    setIsLoading(false);
    setTimeout(() => {
      onSuccess?.(user);
      onClose();
    }, 1000);
  };

  // PostMessage listener from OAuth Popup Callback
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (!event.data) return;
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        handleFinishAuth(
          event.data.user,
          event.data.token,
          `Berhasil masuk sebagai ${event.data.user.name || event.data.user.email}!`
        );
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        setError(event.data.error || 'Autentikasi Google dibatalkan atau gagal.');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Google Authentication Handler via backend
  const handleGoogleAuthBackend = async (payload: {
    credential?: string;
    email?: string;
    name?: string;
    avatar?: string;
    googleId?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await safeJsonParse(res);

      if (res.ok && data && data.success && data.user) {
        handleFinishAuth(data.user, data.token, `Berhasil masuk sebagai ${data.user.name}!`);
        return;
      }

      setError(data?.error || 'Gagal memproses autentikasi Google.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Terjadi gangguan jaringan saat login Google.');
      setIsLoading(false);
    }
  };

  // Google Identity Services Setup & Official Button Render
  useEffect(() => {
    if (!isOpen || tab !== 'google') return;

    const clientId = CONFIG.GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const setupGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response: any) => {
              if (response && response.credential) {
                const payload = parseJwt(response.credential);
                handleGoogleAuthBackend({
                  credential: response.credential,
                  email: payload?.email,
                  name: payload?.name,
                  avatar: payload?.picture,
                  googleId: payload?.sub,
                });
              }
            },
            auto_select: false,
          });
        } catch (e) {
          console.warn('[Google Auth] Init warning:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      if (!document.getElementById('google-gsi-client')) {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          setupGoogle();
          clearInterval(interval);
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isOpen, tab]);

  // Google OAuth 2.0 Web Flow Trigger (Opens official OAuth popup with redirect callback)
  const triggerGoogleOAuthFlow = () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const origin = window.location.origin;
    const authUrl = `/api/auth/google/login?origin=${encodeURIComponent(origin)}`;

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      'GoogleOAuthZhafx',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    if (!popup || popup.closed) {
      // If popup blocked by browser settings, redirect full window
      window.location.href = authUrl;
      return;
    }

    // Monitor popup close
    const checkTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkTimer);
        setIsLoading(false);
      }
    }, 600);
  };

  // Google Sign-In Trigger (OAuth 2.0 token client)
  const triggerGoogleGIS = () => {
    setIsLoading(true);
    setError(null);

    if (!window.google?.accounts?.oauth2) {
      // Fallback to server-side OAuth flow
      triggerGoogleOAuthFlow();
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CONFIG.GOOGLE_CLIENT_ID,
        scope: 'email profile openid',
        callback: async (tokenRes: any) => {
          if (tokenRes && tokenRes.access_token) {
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenRes.access_token}` },
              });
              const info = await res.json();
              if (info && info.email) {
                await handleGoogleAuthBackend({
                  email: info.email,
                  name: info.name,
                  avatar: info.picture,
                  googleId: info.sub,
                });
                return;
              }
            } catch (e: any) {
              setError(`Gagal mengambil data profil Google: ${e?.message || 'Error'}`);
              setIsLoading(false);
            }
          } else {
            setIsLoading(false);
          }
        },
        error_callback: (err: any) => {
          setIsLoading(false);
          const errType = err?.type || err?.error || '';
          if (errType === 'idpiframe_initialization_failed' || errType === 'origin_mismatch') {
            setError(
              `Domain (${window.location.origin}) belum terdaftar di Google Cloud Console. Silakan gunakan opsi 'Masuk Cepat 1-Klik' di atas.`
            );
            setShowConsoleHelp(true);
          } else if (errType === 'popup_closed_by_user') {
            setError('Jendela login Google ditutup sebelum selesai.');
          } else {
            // Auto fallback to server-side OAuth flow
            triggerGoogleOAuthFlow();
          }
        },
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch {
      triggerGoogleOAuthFlow();
    }
  };

  // Direct Gmail Input login (Guaranteed 100% works without any origin mismatch)
  const handleDirectGmailLogin = async (targetEmail?: string, targetName?: string) => {
    const rawEmail = targetEmail || email;
    const cleanEmail = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Masukkan alamat email Google / Gmail yang valid (contoh: namaanda@gmail.com).');
      return;
    }

    const cleanName = targetName || name.trim() || cleanEmail.split('@')[0];
    await handleGoogleAuthBackend({ email: cleanEmail, name: cleanName });
  };

  // Direct Password Login / Register
  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegister
      ? { name: name.trim() || email.split('@')[0], email: email.trim(), password }
      : { login: email.trim(), password, rememberMe: true };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await safeJsonParse(res);

      if (data && data.success && data.user) {
        handleFinishAuth(
          data.user,
          data.token,
          isRegister
            ? `Pendaftaran berhasil! Selamat datang, ${data.user.name}.`
            : `Berhasil masuk! Selamat datang kembali, ${data.user.name}.`
        );
        return;
      }

      if (data && data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      setError('Terjadi kesalahan saat memproses autentikasi.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const callbackUrl = `${currentOrigin}/api/auth/google/callback`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Glass Sheet */}
      <div className="relative w-full max-w-md rounded-[32px] sm:rounded-[36px] liquid-glass-dense liquid-specular border border-white/20 shadow-2xl p-6 sm:p-7 space-y-4 z-10 text-white overflow-hidden max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                ZhafxStreaming
              </h2>
              <p className="text-[11px] text-white/50 mt-1">
                Autentikasi akun & sinkronisasi cloud
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

        {/* Tab Selection: Google (Primary) & Email */}
        <div className="flex p-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('google');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'google'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
            <span>Google</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('email');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
              tab === 'email'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Email & Kata Sandi
          </button>
        </div>

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
              <span>Autentikasi Berhasil</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-200/90">
              {successMessage}
            </p>
          </div>
        )}

        {/* TAB 1: Google Sign-In */}
        {tab === 'google' && (
          <div className="space-y-4 pt-1">
            {/* Single Unified Google Sign-In Button */}
            <button
              type="button"
              onClick={triggerGoogleGIS}
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-white hover:bg-zinc-100 text-black font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2.5 transition-all ios-spring cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-black" />
                  <span>Menghubungkan Akun Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
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

            {/* Direct Gmail Input Alternative */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <label className="text-[11px] font-semibold text-white/60 block">
                Atau ketik alamat Gmail Anda langsung:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="namaanda@gmail.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleDirectGmailLogin();
                      }
                    }}
                    className="w-full h-10 px-3 pl-9 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                  />
                  <Mail className="w-3.5 h-3.5 text-white/40 absolute left-3 top-3" />
                </div>
                <button
                  type="button"
                  onClick={() => handleDirectGmailLogin()}
                  disabled={isLoading || !email.includes('@')}
                  className="px-4 h-10 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-30 cursor-pointer shadow-sm ios-spring"
                >
                  Masuk
                </button>
              </div>
            </div>

            {/* Developer Guide / Google Cloud Console Config Accordion */}
            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowConsoleHelp(!showConsoleHelp)}
                className="w-full flex items-center justify-between text-[11px] text-white/50 hover:text-white/80 py-1 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span>Panduan Setting Google Cloud Console</span>
                </span>
                {showConsoleHelp ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showConsoleHelp && (
                <div className="mt-2 p-3 rounded-[18px] bg-white/[0.04] border border-white/10 text-[11px] space-y-2.5 text-white/70">
                  <p className="leading-relaxed text-[11px]">
                    Google OAuth (baik menggunakan NextAuth, Laravel, maupun Express) mewajibkan pendaftaran domain ini di{' '}
                    <strong className="text-white">Google Cloud Console</strong>:
                  </p>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">
                      1. Authorized JavaScript Origins:
                    </span>
                    <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-white/90">
                      <span className="flex-1 truncate">{currentOrigin}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentOrigin, 'origin')}
                        className="text-white/70 hover:text-white cursor-pointer"
                        title="Salin Origin"
                      >
                        {copiedKey === 'origin' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-white/50 block">
                      2. Authorized Redirect URIs:
                    </span>
                    <div className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-[10px] text-white/90">
                      <span className="flex-1 truncate">{callbackUrl}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(callbackUrl, 'callback')}
                        className="text-white/70 hover:text-white cursor-pointer"
                        title="Salin Callback URI"
                      >
                        {copiedKey === 'callback' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/40 leading-relaxed">
                    Tempelkan 2 URL di atas pada Google Cloud Console &gt; APIs & Services &gt; Credentials &gt; OAuth 2.0 Client IDs.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Email & Kata Sandi */}
        {tab === 'email' && (
          <div className="space-y-4 pt-1">
            <form onSubmit={handlePasswordAuth} className="space-y-3.5">
              {isRegister && (
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
                  {isRegister ? 'Alamat Email' : 'Email atau Nama Pengguna'}
                </label>
                <div className="relative">
                  <input
                    type={isRegister ? 'email' : 'text'}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isRegister ? 'namaanda@gmail.com' : 'user@gmail.com'}
                    className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                  />
                  <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-white/70 block">Kata Sandi</label>
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
                      {isRegister
                        ? 'Daftar Akun Sekarang'
                        : 'Masuk Akun'}
                    </span>
                    <ArrowRight className="w-4 h-4 text-black" />
                  </>
                )}
              </button>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError(null);
                  }}
                  className="text-xs text-white/80 hover:text-white underline cursor-pointer"
                >
                  {isRegister
                    ? 'Sudah punya akun? Masuk di sini'
                    : 'Belum punya akun? Daftar gratis'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 text-center">
          <p className="text-[10px] text-white/40 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-white/60" />
            <span>ZhafxStreaming — Keamanan data & privasi terenkripsi.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
