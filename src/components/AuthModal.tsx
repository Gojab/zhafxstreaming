import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
  ShieldCheck,
  RotateCw,
  Edit2,
  Sparkles,
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

function maskEmailClient(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (!domain) return email;
  if (local.length <= 3) {
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${local.slice(0, 4)}***@${domain}`;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'otp' | 'google' | 'password'>('otp');
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');

  // Countdown timer for resend
  const [countdown, setCountdown] = useState(0);
  const countdownIntervalRef = useRef<any>(null);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Countdown timer management
  useEffect(() => {
    if (countdown > 0) {
      countdownIntervalRef.current = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
    }
    return () => {
      if (countdownIntervalRef.current) clearTimeout(countdownIntervalRef.current);
    };
  }, [countdown]);

  const handleFinishAuth = (user: User, token: string, msg: string) => {
    storage.saveToken(token);
    storage.saveUser(user);
    setSuccessMessage(msg);
    setIsLoading(false);
    setTimeout(() => {
      onSuccess?.(user);
      onClose();
    }, 1200);
  };

  // 1. Google / Gmail 1-Click Login
  const handleGoogleLogin = async (customEmail?: string, customName?: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const targetEmail = customEmail || email.trim();
    const targetName = customName || name.trim() || targetEmail.split('@')[0];

    if (!targetEmail) {
      setError('Masukkan alamat email Google Anda.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
        }),
      });
      const data = await safeJsonParse(res);

      if (data && data.success && data.user) {
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

  // Google Identity Services Setup
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
                if (payload && payload.email) {
                  handleGoogleLogin(payload.email, payload.name);
                }
              }
            },
            auto_select: false,
          });

          const btnContainer = document.getElementById('googleButtonContainer');
          if (btnContainer) {
            btnContainer.innerHTML = '';
            window.google.accounts.id.renderButton(btnContainer, {
              theme: 'filled_black',
              size: 'large',
              shape: 'pill',
              width: 320,
              text: 'continue_with',
              logo_alignment: 'left',
            });
          }
        } catch (e) {
          console.warn('[Google Auth] Init error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          setupGoogle();
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isOpen, tab]);

  const triggerGoogleSignIn = () => {
    if (window.google?.accounts?.oauth2) {
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
                await handleGoogleLogin(info.email, info.name);
                return;
              }
            } catch {
              // fallback
            }
          }
        },
      });
      client.requestAccessToken();
    } else if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  };

  // 2. Request Real Email OTP Verification Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Masukkan alamat email yang valid (contoh: namaanda@gmail.com).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: name.trim() || undefined,
        }),
      });
      const data = await safeJsonParse(res);

      if (res.ok && data?.success) {
        setOtpSent(true);
        setMaskedEmail(data.maskedEmail || maskEmailClient(cleanEmail));
        setCountdown(data.cooldownSeconds || 60);
        setSuccessMessage(
          'Verifikasi email diperlukan. Kami telah mengirimkan kode verifikasi ke alamat email kamu. Silakan periksa kotak masuk Gmail, termasuk folder Spam atau Promosi, kemudian masukkan kode untuk melanjutkan pendaftaran.'
        );
        setIsLoading(false);
      } else {
        setError(
          data?.error ||
            'Gagal mengirim kode verifikasi ke email Anda. Harap periksa kembali alamat email atau pastikan konfigurasi email di server sudah benar.'
        );
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi gangguan jaringan saat meminta kode verifikasi.');
      setIsLoading(false);
    }
  };

  // 3. Verify OTP Code and Log In
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = verificationCode.trim();

    if (!cleanCode || cleanCode.length !== 6) {
      setError('Masukkan kode verifikasi 6-digit lengkap yang Anda terima di email.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: cleanCode,
          name: name.trim() || undefined,
        }),
      });
      const data = await safeJsonParse(res);

      if (res.ok && data?.success && data.user) {
        handleFinishAuth(
          data.user,
          data.token,
          data.message || `Verifikasi email berhasil! Selamat datang, ${data.user.name}.`
        );
        return;
      }

      setError(data?.error || 'Kode verifikasi tidak sesuai atau telah kedaluwarsa.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal memverifikasi kode.');
      setIsLoading(false);
    }
  };

  // 4. Standard Password Login / Register
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
          isRegister ? 'Pendaftaran berhasil! Selamat datang di ZhafxStreaming.' : 'Berhasil masuk akun!'
        );
        return;
      }

      // If registration or login requires email verification
      if (data && (data.requiresVerification || res.status === 403)) {
        setTab('otp');
        setOtpSent(true);
        setMaskedEmail(data.maskedEmail || maskEmailClient(email));
        setCountdown(60);
        setSuccessMessage(
          data.message ||
            'Verifikasi email diperlukan. Kami telah mengirimkan kode verifikasi ke alamat email kamu. Silakan periksa kotak masuk Gmail, termasuk folder Spam atau Promosi, kemudian masukkan kode untuk melanjutkan.'
        );
        setIsLoading(false);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Glass Sheet */}
      <div className="relative w-full max-w-md rounded-[32px] sm:rounded-[36px] liquid-glass-dense liquid-specular border border-white/20 shadow-2xl p-6 sm:p-8 space-y-5 z-10 text-white overflow-hidden">
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

        {/* Tab Selection */}
        <div className="flex p-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('otp');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
              tab === 'otp'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Kode Email
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('google');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
              tab === 'google'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Gmail / Google
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer ${
              tab === 'password'
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Kata Sandi
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
          <div className="p-3.5 rounded-[18px] bg-white/[0.08] border border-white/20 text-white/90 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-white">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
              <span>Verifikasi Email Diperlukan</span>
            </div>
            <p className="text-[11px] leading-relaxed text-white/75">
              {successMessage}
            </p>
          </div>
        )}

        {/* TAB 1: Real Email OTP Verification */}
        {tab === 'otp' && (
          <div className="space-y-4 pt-1">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div className="p-3 rounded-[18px] bg-white/[0.04] border border-white/10 text-xs space-y-1">
                  <p className="text-white/90 font-medium">
                    Pendaftaran & Masuk via Email Aman
                  </p>
                  <p className="text-[11px] text-white/50 leading-relaxed">
                    Kode verifikasi 6-digit rahasia akan dikirimkan ke kotak masuk Gmail Anda.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 block">
                    Nama Lengkap (Opsional)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/30"
                    />
                    <UserIcon className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 block">
                    Alamat Email (Gmail)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="namaanda@gmail.com"
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
                      <span>Mengirim Kode ke Email...</span>
                    </>
                  ) : (
                    <>
                      <span>Daftar / Kirim Kode Verifikasi</span>
                      <ArrowRight className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                {/* Masked Email Banner */}
                <div className="p-3.5 rounded-[20px] bg-white/[0.06] border border-white/15 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 text-[11px]">Email Tujuan:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSent(false);
                        setVerificationCode('');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      className="text-[11px] text-white/80 hover:text-white flex items-center gap-1 cursor-pointer underline"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Ganti Alamat Email</span>
                    </button>
                  </div>
                  <p className="text-sm font-mono font-bold text-white tracking-wide">
                    {maskedEmail || maskEmailClient(email)}
                  </p>
                  <p className="text-[10px] text-white/45">
                    Kode berlaku selama 5 menit. Periksa folder <strong>Spam</strong> atau <strong>Promosi</strong> jika tidak ada di kotak masuk utama.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 block">
                    Masukkan Kode OTP 6-Digit
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full h-12 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/20 text-center font-mono text-lg tracking-[8px] text-white focus:outline-none focus:border-white transition-colors"
                    />
                    <KeyRound className="w-4 h-4 text-white/40 absolute left-3.5 top-4" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length < 6}
                  className="w-full h-11 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ios-spring cursor-pointer disabled:opacity-40"
                >
                  {isLoading ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin text-black" />
                      <span>Memverifikasi...</span>
                    </>
                  ) : (
                    <>
                      <span>Verifikasi Email & Masuk</span>
                      <CheckCircle2 className="w-4 h-4 text-black" />
                    </>
                  )}
                </button>

                {/* Resend button with 60-second cooldown */}
                <div className="pt-2 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={countdown > 0 || isLoading}
                    className="text-xs text-white/70 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${countdown > 0 ? 'opacity-40' : ''}`} />
                    <span>
                      {countdown > 0
                        ? `Kirim Ulang Kode (${countdown}s)`
                        : 'Kirim Ulang Kode Verifikasi'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setVerificationCode('');
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-white/40 hover:text-white/70 cursor-pointer"
                  >
                    Ganti alamat email pendaftaran
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: Google / Gmail 1-Click Login */}
        {tab === 'google' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-[22px] bg-white/[0.04] border border-white/10 text-center space-y-1.5">
              <p className="text-xs text-white/90 font-medium">
                Masuk aman dengan akun Google resmi Anda.
              </p>
              <p className="text-[11px] text-white/40">
                Akun Google diverifikasi otomatis tanpa perlu konfirmasi manual.
              </p>
            </div>

            {/* Official Google Identity Button Container */}
            <div className="flex justify-center items-center min-h-12 w-full">
              <div id="googleButtonContainer" className="flex justify-center w-full" />
            </div>

            {/* Custom Google Brand Button */}
            <button
              onClick={() => triggerGoogleSignIn()}
              disabled={isLoading}
              className="w-full h-12 rounded-full bg-white hover:bg-zinc-100 text-[#1F1F1F] font-bold text-sm shadow-[0_8px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2.5 transition-all ios-spring cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
              <span>{isLoading ? 'Menghubungkan Akun Google...' : 'Masuk dengan Akun Google'}</span>
            </button>

            {/* Direct Gmail Input alternative */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <label className="text-[11px] font-semibold text-white/50 block">
                Atau masukkan alamat email Gmail secara langsung:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="namaanda@gmail.com"
                    className="w-full h-10 px-3 pl-9 rounded-full bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors"
                  />
                  <Mail className="w-3.5 h-3.5 text-white/40 absolute left-3 top-3" />
                </div>
                <button
                  type="button"
                  onClick={() => handleGoogleLogin()}
                  disabled={isLoading || !email.includes('@')}
                  className="px-4 h-10 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-30 cursor-pointer"
                >
                  Masuk
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Email & Password */}
        {tab === 'password' && (
          <form onSubmit={handlePasswordAuth} className="space-y-3.5 pt-1">
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
                {isRegister ? 'Alamat Email (Gmail)' : 'Email atau Nama Pengguna'}
              </label>
              <div className="relative">
                <input
                  type={isRegister ? 'email' : 'text'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gmail.com"
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
              <span>
                {isLoading
                  ? 'Memproses...'
                  : isRegister
                  ? 'Daftar & Kirim Kode Verifikasi'
                  : 'Masuk Akun'}
              </span>
              <ArrowRight className="w-4 h-4 text-black" />
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
