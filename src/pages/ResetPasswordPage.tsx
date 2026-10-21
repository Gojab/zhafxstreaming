import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  IoLockClosedOutline as Lock,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoAlertCircleOutline as AlertCircle,
  IoSyncOutline as RotateCw,
  IoArrowForwardOutline as ArrowRight,
  IoKeyOutline as KeyIcon,
} from 'react-icons/io5';
import { supabase } from '../lib/supabase';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess('Kata sandi berhasil diperbarui! Anda akan diarahkan ke beranda...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui kata sandi. Tautan mungkin telah kedaluwarsa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 pt-24 pb-16">
      <div className="w-full max-w-md liquid-glass-dense border border-white/20 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto mb-3">
            <KeyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Setel Sandi Baru
          </h1>
          <p className="text-xs text-zinc-400">
            Masukkan kata sandi baru untuk akun Zhafx Streaming Anda
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-full bg-white hover:bg-zinc-200 text-black font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2 ios-spring"
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-black" />
                <span>Menyimpan Sandi Baru...</span>
              </>
            ) : (
              <>
                <span>Simpan Kata Sandi</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 text-center">
          <Link
            to="/"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
};
