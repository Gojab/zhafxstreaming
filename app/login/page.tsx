'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  IoMailOutline as Mail,
  IoLockClosedOutline as Lock,
  IoLogInOutline as LogIn,
  IoAlertCircleOutline as AlertCircle,
  IoSyncOutline as RotateCw,
} from 'react-icons/io5';
import { login } from '@/app/auth/actions';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await login(formData);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#090A0E] text-[#F4F4F5] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Masuk Akun
          </h1>
          <p className="text-xs text-zinc-400">
            Masuk menggunakan Email dan Kata Sandi Supabase Anda
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
              htmlFor="email"
              className="text-xs font-semibold text-zinc-300 block"
            >
              Alamat Email
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nama@email.com"
                className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
              />
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Kata Sandi
              </label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-zinc-400 hover:text-white transition-colors"
              >
                Lupa kata sandi?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                placeholder="Minimal 6 karakter"
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
                <span>Memproses Masuk...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-black" />
                <span>Masuk</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-zinc-400">
            Belum punya akun?{' '}
            <Link
              href="/register"
              className="text-white hover:underline font-semibold"
            >
              Daftar di sini
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
