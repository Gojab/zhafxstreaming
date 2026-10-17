import React, { useState, useEffect } from 'react';
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
  Sparkles,
} from 'lucide-react';
import { storage } from '../lib/storage';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [tab, setTab] = useState<'google' | 'otp' | 'password'>('google');
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);

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

  if (!isOpen) return null;

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
  const handleGoogleLogin = async (customEmail?: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const targetEmail = customEmail || email.trim() || 'user@gmail.com';
    const targetName = name.trim() || targetEmail.split('@')[0];

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal masuk dengan akun Google.');
      }

      handleFinishAuth(data.user, data.token, `Berhasil masuk sebagai ${data.user.name}!`);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat masuk dengan Google.');
      setIsLoading(false);
    }
  };

  // 2. Request Email OTP Verification Code
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Masukkan alamat email yang valid.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengirim kode verifikasi.');
      }

      setOtpSent(true);
      setSimulatedCode(data.code || null);
      setSuccessMessage(data.message || 'Kode verifikasi 6 digit telah dikirim.');
      setIsLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Gagal mengirim kode verifikasi.');
      setIsLoading(false);
    }
  };

  // 3. Verify OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length < 6) {
      setError('Masukkan kode verifikasi 6-digit.');
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
          email: email.trim(),
          code: verificationCode.trim(),
          name: name.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Kode verifikasi tidak valid.');
      }

      handleFinishAuth(data.user, data.token, data.message || 'Verifikasi berhasil!');
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

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Autentikasi gagal.');
      }

      handleFinishAuth(
        data.user,
        data.token,
        isRegister ? 'Pendaftaran berhasil! Selamat datang di Zhafx.' : 'Berhasil masuk akun!'
      );
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan sistem.');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Glass Sheet */}
      <div className="relative w-full max-w-md rounded-[32px] sm:rounded-[36px] liquid-glass-dense liquid-specular border border-white/20 shadow-2xl p-6 sm:p-8 space-y-5 z-10 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FFB224]/20 border border-[#FFB224]/30 flex items-center justify-center text-[#FFB224]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                Masuk ke Zhafx
              </h2>
              <p className="text-[11px] text-white/50 mt-1">
                Sinkronisasi daftar tontonan & riwayat continue watching
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer ios-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold">
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
          <div className="p-3 rounded-[16px] bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-[16px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* TAB 1: Google / Gmail 1-Click Login */}
        {tab === 'google' && (
          <div className="space-y-4 pt-1">
            <div className="p-4 rounded-[22px] bg-white/[0.04] border border-white/10 text-center space-y-2">
              <p className="text-xs text-white/70 leading-relaxed">
                Masuk instan menggunakan akun Gmail tanpa perlu mengingat kata sandi.
              </p>
            </div>

            {/* Quick Gmail input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-white/70 block">
                Alamat Email Gmail Anda
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="namaanda@gmail.com"
                  className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FFB224] transition-colors"
                />
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Google Brand Button */}
            <button
              onClick={() => handleGoogleLogin()}
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
              <span>{isLoading ? 'Menghubungkan...' : 'Masuk dengan Akun Google'}</span>
            </button>
          </div>
        )}

        {/* TAB 2: OTP Verification Code */}
        {tab === 'otp' && (
          <div className="space-y-4 pt-1">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 block">
                    Alamat Email Anda
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="namaanda@gmail.com"
                      className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FFB224] transition-colors"
                    />
                    <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-full bg-[#FFB224] hover:bg-[#FFA500] text-black font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ios-spring cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Mengirim...' : 'Kirim Kode Verifikasi'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div className="p-3 rounded-[18px] bg-white/[0.06] border border-white/10 text-xs space-y-1">
                  <p className="text-white/80">
                    Kode 6-digit dikirim ke: <strong className="text-[#FFB224]">{email}</strong>
                  </p>
                  {simulatedCode && (
                    <p className="text-[11px] text-emerald-400 font-mono">
                      Kode Verifikasi Cepat: <strong>{simulatedCode}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/70 block">
                    Masukkan Kode 6-Digit
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-center font-mono text-base tracking-widest text-[#FFB224] focus:outline-none focus:border-[#FFB224] transition-colors"
                    />
                    <KeyRound className="w-4 h-4 text-white/40 absolute left-3.5 top-3.5" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 rounded-full bg-[#FFB224] hover:bg-[#FFA500] text-black font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all ios-spring cursor-pointer disabled:opacity-50"
                >
                  <span>{isLoading ? 'Memverifikasi...' : 'Verifikasi & Masuk'}</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-center text-xs text-white/50 hover:text-white cursor-pointer pt-1"
                >
                  Kirim ulang kode ke email lain
                </button>
              </form>
            )}
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
                    placeholder="Nama Anda"
                    className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FFB224] transition-colors"
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
                  placeholder="user@gmail.com"
                  className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FFB224] transition-colors"
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
                  className="w-full h-11 px-4 pl-10 rounded-full bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-[#FFB224] transition-colors"
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
                  ? 'Daftar Akun Baru'
                  : 'Masuk Akun'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-xs text-[#FFB224] hover:underline cursor-pointer"
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
            <Sparkles className="w-3 h-3 text-[#FFB224]" />
            <span>Data riwayat & favorit tersimpan otomatis dan aman.</span>
          </p>
        </div>
      </div>
    </div>
  );
};
