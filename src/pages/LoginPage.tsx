import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  History,
  Bookmark,
  LogOut,
  Play,
  KeyRound,
  Sparkles,
  ShieldCheck,
  AtSign,
  Check,
  Send,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useMyList } from '../hooks/useMyList';
import { authApi } from '../services/authApi';
import { CONFIG } from '../config';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    isAuthenticated,
    isLoadingAuth,
    loginWithCredentials,
    registerWithCredentials,
    loginWithGoogle,
    loginWithOtpCode,
    logout,
  } = useAuth();
  const { history } = useWatchHistory();
  const { myList } = useMyList();

  const [mode, setMode] = useState<'otp' | 'password' | 'register'>('otp');

  // OTP inputs
  const [otpEmail, setOtpEmail] = useState('zhafranfaisal103@gmail.com');
  const [otpCode, setOtpCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [simulatedCode, setSimulatedCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  // Password Login inputs
  const [loginInput, setLoginInput] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register inputs
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Check redirect message
  useEffect(() => {
    const state = location.state as { from?: string; reason?: string } | null;
    if (state?.reason) {
      setRedirectNotice(state.reason);
    }
  }, [location.state]);

  const historyCount = history.length;
  const myListCount = myList.length;

  // Handle Send OTP Code
  const handleSendCode = async () => {
    setError(null);
    setSuccessMessage(null);
    const cleanEmail = otpEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Masukkan alamat email atau Gmail yang valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authApi.sendVerificationCode(cleanEmail);
      if (res.success && res.code) {
        setCodeSent(true);
        setSimulatedCode(res.code);
        setCountdown(60);
        setSuccessMessage(`Kode verifikasi 6 digit telah dikirim ke ${cleanEmail}`);
      } else {
        setError(res.error || 'Gagal mengirim kode verifikasi.');
      }
    } catch {
      setError('Terjadi kendala saat menghubungi server verifikasi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP Submit
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMessage(null);
    const cleanEmail = otpEmail.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!cleanEmail) {
      setError('Masukkan alamat email Anda.');
      return;
    }
    if (!cleanCode || cleanCode.length < 6) {
      setError('Masukkan 6 digit kode verifikasi yang dikirimkan ke email Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithOtpCode(cleanEmail, cleanCode);
      if (res.success && res.user) {
        setSuccessMessage(`Verifikasi berhasil! Selamat datang, ${res.user.name}.`);
        const targetPath = (location.state as { from?: string })?.from || '/';
        setTimeout(() => navigate(targetPath, { replace: true }), 500);
      } else {
        setError(res.error || 'Kode verifikasi tidak sesuai.');
      }
    } catch {
      setError('Gagal memverifikasi kode dengan server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google 1-Click Login
  const handleGoogleLogin = async (targetEmail = 'zhafranfaisal103@gmail.com') => {
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle(targetEmail, 'Zhafran Faisal');
      if (res.success && res.user) {
        setSuccessMessage(`Berhasil masuk dengan akun Google: ${res.user.email}`);
        const targetPath = (location.state as { from?: string })?.from || '/';
        setTimeout(() => navigate(targetPath, { replace: true }), 500);
      } else {
        setError(res.error || 'Gagal masuk dengan Google.');
      }
    } catch {
      setError('Terjadi kendala saat menghubungkan akun Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Password Login submission
  const handlePasswordLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMessage(null);
    setRedirectNotice(null);

    const cleanLogin = loginInput.trim();
    const cleanPassword = loginPassword;

    if (!cleanLogin || !cleanPassword) {
      setError('Email atau nama pengguna dan kata sandi wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await loginWithCredentials(cleanLogin, cleanPassword, rememberMe);
      if (result.success && result.user) {
        setSuccessMessage(`Berhasil masuk! Selamat datang kembali, ${result.user.name}.`);
        const targetPath = (location.state as { from?: string })?.from || '/';
        setTimeout(() => navigate(targetPath, { replace: true }), 500);
      } else {
        setError(result.error || 'Email atau kata sandi tidak cocok.');
      }
    } catch {
      setError('Terjadi kendala jaringan saat menghubungi server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register submission
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await registerWithCredentials(
        cleanName,
        cleanEmail,
        password,
        cleanUsername || undefined
      );

      if (result.success && result.user) {
        setSuccessMessage(`Akun berhasil dibuat! Selamat datang di ZHAFX, ${result.user.name}.`);
        const targetPath = (location.state as { from?: string })?.from || '/';
        setTimeout(() => navigate(targetPath, { replace: true }), 500);
      } else {
        setError(result.error || 'Gagal membuat akun.');
      }
    } catch {
      setError('Terjadi kendala jaringan saat mendaftar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
      setSuccessMessage('Anda telah berhasil keluar dari akun.');
      setTimeout(() => setSuccessMessage(null), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoadingAuth && !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-xs text-white/50">Memeriksa status akun...</span>
      </div>
    );
  }

  // --- Authenticated Profile View ---
  if (isAuthenticated && user) {
    const initials = (user.name || 'User')
      .split(' ')
      .slice(0, 2)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase();

    return (
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-24 pb-16 min-h-[75vh] flex flex-col justify-center">
        <div className="rounded-[32px] sm:rounded-[36px] liquid-glass liquid-specular p-6 sm:p-8 space-y-6 shadow-2xl border border-white/20">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-[#FFB224] text-[#06070B] flex items-center justify-center font-bold text-2xl shadow-xl shrink-0">
              {initials}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Email Terverifikasi</span>
                </span>
              </div>
              <p className="text-xs text-white/60">
                {user.email}
                {user.username && (
                  <span className="ml-2 text-[#FFB224] font-mono">@{user.username}</span>
                )}
              </p>
              <p className="text-[11px] text-white/40">
                Terdaftar sejak{' '}
                {new Intl.DateTimeFormat('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }).format(new Date(user.joinedAt))}
              </p>
            </div>
          </div>

          {/* User Activity Stats */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Link
              to="/history"
              className="p-4 rounded-[22px] liquid-glass hover:bg-white/[0.12] transition-all flex items-center gap-3.5 group ios-spring"
            >
              <div className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-[#FFB224] shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-white/50 block">Riwayat Tontonan</span>
                <span className="text-sm font-semibold text-white group-hover:text-[#FFB224] transition-colors">
                  {historyCount} Judul
                </span>
              </div>
            </Link>

            <Link
              to="/my-list"
              className="p-4 rounded-[22px] liquid-glass hover:bg-white/[0.12] transition-all flex items-center gap-3.5 group ios-spring"
            >
              <div className="w-10 h-10 rounded-full liquid-glass flex items-center justify-center text-[#FFB224] shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-white/50 block">Daftar Saya</span>
                <span className="text-sm font-semibold text-white group-hover:text-[#FFB224] transition-colors">
                  {myListCount} Tersimpan
                </span>
              </div>
            </Link>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/[0.08]">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:flex-1 py-3 px-5 rounded-full bg-white hover:bg-white/90 text-[#06070B] font-bold text-xs sm:text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ios-spring"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Mulai Menonton</span>
            </button>

            <button
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full sm:w-auto py-3 px-5 rounded-full liquid-glass text-white/70 hover:text-white hover:bg-white/[0.14] font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ios-spring"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Unauthenticated View ---
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 pt-24 pb-16">
      <div className="w-full max-w-md rounded-[32px] sm:rounded-[36px] liquid-glass liquid-specular p-6 sm:p-8 space-y-6 shadow-2xl border border-white/20">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Logo size="lg" />
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight pt-1">
            {mode === 'register'
              ? 'Daftar Akun ZHAFX'
              : mode === 'otp'
              ? 'Masuk dengan Gmail & Verifikasi'
              : 'Masuk dengan Kata Sandi'}
          </h1>
          <p className="text-xs text-white/55 max-w-xs leading-relaxed">
            Sinkronkan tontonan, daftar simpan, dan download offline di semua perangkat Anda.
          </p>
        </div>

        {/* Redirect Notice */}
        {redirectNotice && (
          <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>{redirectNotice}</span>
          </div>
        )}

        {/* Quick Google 1-Click Login Button */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleGoogleLogin('zhafranfaisal103@gmail.com')}
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-full bg-white hover:bg-white/95 text-[#06070B] font-bold text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2.5 transition-all ios-spring cursor-pointer disabled:opacity-50"
          >
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
            <span>Masuk Cepat dengan Google / Gmail</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#0E1017] px-3 text-[11px] text-white/40 uppercase tracking-wider shrink-0 font-medium">
              atau pilih metode lain
            </span>
          </div>
        </div>

        {/* 3-Way Mode Switcher (Segmented Control) */}
        <div className="grid grid-cols-3 p-1 rounded-full liquid-glass shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mode === 'otp'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Kode Gmail
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('password');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mode === 'password'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Kata Sandi
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 rounded-full text-[11px] sm:text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-2 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* OTP SIMULATION HELPER BANNER */}
        {simulatedCode && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                <span>Kode Verifikasi Email:</span>
              </span>
              <strong className="text-white font-mono text-base tracking-widest bg-black/40 px-2.5 py-0.5 rounded-lg border border-amber-400/40">
                {simulatedCode}
              </strong>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(simulatedCode)}
              className="text-[11px] text-[#FFB224] hover:underline font-semibold block cursor-pointer"
            >
              Klik di sini untuk mengisi otomatis ({simulatedCode})
            </button>
          </div>
        )}

        {/* MODE 1: OTP GMAIL / EMAIL VERIFICATION */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="otp-email" className="text-xs font-medium text-white/70">
                Alamat Gmail atau Email
              </label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="otp-email"
                    type="email"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    disabled={isSubmitting}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={isSubmitting || countdown > 0}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/[0.12] hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all disabled:opacity-40 shrink-0 cursor-pointer ios-spring"
                >
                  {countdown > 0 ? `${countdown}s` : 'Kirim Kode'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="otp-code" className="text-xs font-medium text-white/70">
                Kode Verifikasi 6 Digit
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="otp-code"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Contoh: 849201"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-sm text-white font-mono tracking-widest placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
              <p className="text-[11px] text-white/45">
                Kode dikirim langsung ke kotak masuk atau folder spam Gmail/email Anda.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !otpCode}
              className="w-full py-3 px-5 rounded-full bg-white hover:bg-white/90 text-[#06070B] font-bold text-xs sm:text-sm shadow-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ios-spring disabled:opacity-50 min-h-[46px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verifikasi & Masuk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 2: CLASSIC PASSWORD LOGIN */}
        {mode === 'password' && (
          <form onSubmit={handlePasswordLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-identity" className="text-xs font-medium text-white/70">
                Email atau Nama Pengguna
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-identity"
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Masukkan email atau nama pengguna"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-white/70">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/60">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="rounded border-white/20 text-[#FFB224] focus:ring-0 bg-white/10"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-full bg-white hover:bg-white/90 text-[#06070B] font-bold text-xs sm:text-sm shadow-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ios-spring disabled:opacity-50 min-h-[46px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk dengan Kata Sandi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* MODE 3: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="register-name" className="text-xs font-medium text-white/70">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-xs font-medium text-white/70">
                Alamat Email / Gmail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-xs font-medium text-white/70">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-confirm" className="text-xs font-medium text-white/70">
                Ulangi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-white/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 focus:border-white/40 focus:bg-white/[0.12] text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-5 rounded-full bg-white hover:bg-white/90 text-[#06070B] font-bold text-xs sm:text-sm shadow-xl transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ios-spring disabled:opacity-50 min-h-[46px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Daftar Akun Baru</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
