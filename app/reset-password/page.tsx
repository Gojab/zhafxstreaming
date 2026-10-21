'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  IoLockClosedOutline as Lock,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoAlertCircleOutline as AlertCircle,
  IoSyncOutline as RotateCw,
  IoArrowForwardOutline as ArrowRight,
  IoKeyOutline as KeyIcon,
} from 'react-icons/io5';
import { updatePassword } from '@/app/auth/actions';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirm_password') as string;

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    startTransition(async () => {
      const res = await updatePassword(formData);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#090A0E] text-[#F4F4F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mx-auto mb-3">
            <KeyIcon className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Atur Kata Sandi Baru
          </h1>
          <p className="text-xs text-zinc-400">
            Masukkan kata sandi baru untuk akun Supabase Anda
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-zinc-300 block"
            >
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm_password"
              className="text-xs font-semibold text-zinc-300 block"
            >
              Ulangi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                minLength={6}
                placeholder="Ulangi kata sandi baru"
                className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
              />
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {isPending ? (
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
            href="/login"
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Batal dan kembali ke login
          </Link>
        </div>
      </div>
    </main>
  );
}
