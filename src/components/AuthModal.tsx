import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { storage } from '../lib/storage';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  // Email/password auth handled directly by Supabase Auth (Serverless Auth)
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
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: name.trim() || cleanEmail.split('@')[0],
            },
          },
        });

        if (signUpError) throw signUpError;

        const authUser = data.user;
        const session = data.session;

        if (session && authUser) {
          const user: User = {
            id: authUser.id,
            email: authUser.email || cleanEmail,
            name: String(authUser.user_metadata?.name || cleanEmail.split('@')[0]),
            avatar: authUser.user_metadata?.avatar_url,
            joinedAt: new Date(authUser.created_at).getTime(),
          };
          handleFinishAuth(user, session.access_token, `Pendaftaran berhasil! Selamat datang, ${user.name}.`);
        } else {
          setIsLoading(false);
          setSuccessMessage(
            'Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.'
          );
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInError) throw signInError;

        const authUser = data.user;
        const session = data.session;

        if (!authUser || !session) {
          throw new Error('Sesi login tidak valid. Silakan coba lagi.');
        }

        const user: User = {
          id: authUser.id,
          email: authUser.email || cleanEmail,
          name: String(authUser.user_metadata?.name || cleanEmail.split('@')[0]),
          avatar: authUser.user_metadata?.avatar_url,
          joinedAt: new Date(authUser.created_at).getTime(),
        };
        handleFinishAuth(user, session.access_token, `Berhasil masuk! Selamat datang kembali, ${user.name}.`);
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-none">
                ZhafxStreaming
              </h2>
              <p className="text-[11px] text-white/50 mt-1">
                Autentikasi Email & Kata Sandi (Supabase Auth)
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

        {/* Tab Selection: Masuk vs Daftar */}
        <div className="flex p-1 rounded-full bg-white/[0.06] border border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !isRegister
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isRegister
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Daftar Baru
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

        {/* Email & Password Form */}
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
                  {isRegister ? 'Daftar Akun Baru' : 'Masuk Sekarang'}
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
                setSuccessMessage(null);
              }}
              className="text-xs text-white/80 hover:text-white underline cursor-pointer"
            >
              {isRegister
                ? 'Sudah memiliki akun? Masuk di sini'
                : 'Belum memiliki akun? Daftar gratis sekarang'}
            </button>
          </div>
        </form>

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
