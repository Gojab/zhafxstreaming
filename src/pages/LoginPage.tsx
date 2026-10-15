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
  ShieldCheck,
  Check,
  AtSign,
} from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../hooks/useAuth';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useMyList } from '../hooks/useMyList';
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
    logout,
  } = useAuth();
  const { history } = useWatchHistory();
  const { myList } = useMyList();

  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login inputs
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

  // Check if user was redirected from protected route
  useEffect(() => {
    const state = location.state as { from?: string; reason?: string } | null;
    if (state?.reason) {
      setRedirectNotice(state.reason);
    }
  }, [location.state]);

  const historyCount = history.length;
  const myListCount = myList.length;

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setSuccessMessage(null);
    setRedirectNotice(null);

    const cleanLogin = loginInput.trim();
    const cleanPassword = loginPassword;

    // Client-side validations
    if (!cleanLogin && !cleanPassword) {
      setError('Silakan masukkan email atau nama pengguna dan kata sandi Anda.');
      return;
    }

    if (!cleanLogin) {
      setError('Silakan masukkan alamat email atau nama pengguna Anda.');
      return;
    }

    if (cleanLogin.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanLogin)) {
        setError('Format email tidak valid. Masukkan format seperti nama@domain.com.');
        return;
      }
    }

    if (!cleanPassword) {
      setError('Silakan masukkan kata sandi Anda.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginWithCredentials(cleanLogin, cleanPassword, rememberMe);

      if (result.success && result.user) {
        setSuccessMessage(`Berhasil masuk! Selamat datang kembali, ${result.user.name}.`);
        const targetPath = (location.state as { from?: string })?.from || '/';
        setTimeout(() => {
          navigate(targetPath, { replace: true });
        }, 500);
      } else {
        setError(result.error || 'Email atau kata sandi tidak cocok. Silakan coba kembali.');
      }
    } catch {
      setError('Terjadi kendala saat menghubungi server autentikasi. Silakan periksa jaringan Anda.');
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
    setRedirectNotice(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password;
    const cleanConfirmPassword = confirmPassword;

    if (!cleanName) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    if (cleanName.length < 2) {
      setError('Nama lengkap minimal harus terdiri dari 2 karakter.');
      return;
    }

    if (!cleanEmail) {
      setError('Alamat email wajib diisi.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid. Masukkan format seperti nama@domain.com.');
      return;
    }

    if (cleanUsername && cleanUsername.length < 3) {
      setError('Nama pengguna minimal 3 karakter.');
      return;
    }

    if (cleanUsername && !/^[a-z0-9_]+$/.test(cleanUsername)) {
      setError('Nama pengguna hanya boleh berisi huruf kecil, angka, dan garis bawah (_).');
      return;
    }

    if (!cleanPassword) {
      setError('Kata sandi wajib diisi.');
      return;
    }

    if (cleanPassword.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok dengan kata sandi yang dimasukkan.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await registerWithCredentials(
        cleanName,
        cleanEmail,
        cleanPassword,
        cleanUsername || undefined
      );

      if (result.success && result.user) {
        setSuccessMessage(`Akun berhasil dibuat! Selamat datang di ZHAFX, ${result.user.name}.`);
        const targetPath = (location.state as { from?: string })?.from || '/';
        setTimeout(() => {
          navigate(targetPath, { replace: true });
        }, 500);
      } else {
        setError(result.error || 'Gagal membuat akun. Silakan coba kembali.');
      }
    } catch {
      setError('Terjadi kendala saat menghubungi server pendaftaran. Silakan periksa jaringan Anda.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
      setSuccessMessage('Anda telah berhasil keluar dari akun.');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state during initial authentication check
  if (isLoadingAuth && !user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        <span className="text-xs text-zinc-400">Memeriksa status sesi...</span>
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
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12 sm:py-16 min-h-[75vh] flex flex-col justify-center">
        <div className="bg-[#111319] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 text-white flex items-center justify-center font-semibold text-xl shrink-0">
              {initials}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {user.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-zinc-300 text-[10px] font-medium">
                  <Check className="w-3 h-3 text-emerald-400" />
                  Akun Aktif
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {user.email}
                {user.username && (
                  <span className="ml-2 text-zinc-500 font-mono">@{user.username}</span>
                )}
              </p>
              <p className="text-[11px] text-zinc-500">
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
              className="p-3.5 rounded-xl bg-[#090A0E] border border-white/[0.08] hover:border-white/20 transition-colors flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 text-zinc-300 flex items-center justify-center shrink-0">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Riwayat Tontonan</span>
                <span className="text-sm font-semibold text-white group-hover:text-zinc-200 transition-colors">
                  {historyCount} Judul
                </span>
              </div>
            </Link>

            <Link
              to="/my-list"
              className="p-3.5 rounded-xl bg-[#090A0E] border border-white/[0.08] hover:border-white/20 transition-colors flex items-center gap-3 group"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 text-zinc-300 flex items-center justify-center shrink-0">
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-zinc-400 block">Daftar Saya</span>
                <span className="text-sm font-semibold text-white group-hover:text-zinc-200 transition-colors">
                  {myListCount} Tersimpan
                </span>
              </div>
            </Link>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/[0.08]">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Play className="w-4 h-4 fill-current" />
              Lanjut Menonton di Beranda
            </button>

            <button
              onClick={handleLogout}
              disabled={isSubmitting}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Keluar Akun
            </button>
          </div>
        </div>

        {/* Footer brand statement */}
        <p className="text-center text-[11px] text-zinc-500 pt-6">
          {CONFIG.TAGLINE_COPYRIGHT}
        </p>
      </div>
    );
  }

  // --- Unauthenticated View (Login / Register) ---
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md bg-[#111319] border border-white/[0.08] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Header Logo & Title */}
        <div className="text-center space-y-2">
          <div className="inline-block mb-2">
            <Logo size="lg" asLink={false} />
          </div>
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-xl sm:text-2xl font-semibold text-white tracking-tight"
          >
            {mode === 'login' ? 'Masuk ke ZHAFX' : 'Daftar Akun ZHAFX'}
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            {mode === 'login'
              ? 'Akses akun Anda untuk melanjutkan tontonan dan sinkronisasi daftar tayangan.'
              : 'Daftar akun gratis untuk menyimpan tayangan favorit dan riwayat menonton Anda.'}
          </p>
        </div>

        {/* Redirect Notice if coming from protected route */}
        {redirectNotice && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-zinc-800/80 border border-white/15 text-zinc-200 text-xs">
            <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <span>{redirectNotice}</span>
          </div>
        )}

        {/* Tab switcher: Masuk / Daftar Akun */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#090A0E] border border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
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
            className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Daftar Akun
          </button>
        </div>

        {/* Feedback Alert Messages */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/90 border border-white/15 text-white text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-identity" className="text-xs font-medium text-zinc-300">
                Email atau Nama Pengguna
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-identity"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Masukkan email atau nama pengguna"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-zinc-300">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                  className="rounded border-zinc-700 text-white focus:ring-0 bg-[#090A0E]"
                />
                <span>Ingat saya di perangkat ini</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 min-h-[42px]"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="register-name" className="text-xs font-medium text-zinc-300">
                Nama Lengkap
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-username" className="text-xs font-medium text-zinc-300">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan nama pengguna (opsional, min. 3 karakter)"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-email" className="text-xs font-medium text-zinc-300">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: nama@email.com"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-password" className="text-xs font-medium text-zinc-300">
                Kata Sandi (Min. 6 Karakter)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="register-confirm-password" className="text-xs font-medium text-zinc-300">
                Ulangi Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="register-confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi"
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#090A0E] border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                  aria-label={
                    showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'
                  }
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Register Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 min-h-[42px]"
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

        {/* Security badge note */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 pt-2 border-t border-white/[0.08]">
          <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
          <span>Kredensial disimpan dengan enkripsi salted hash di server</span>
        </div>
      </div>

      {/* Footer brand statement */}
      <p className="text-center text-[11px] text-zinc-500 pt-6">
        {CONFIG.TAGLINE_COPYRIGHT}
      </p>
    </div>
  );
};
