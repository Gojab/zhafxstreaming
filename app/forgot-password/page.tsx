'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  IoMailOutline as Mail,
  IoArrowBackOutline as ArrowBack,
  IoSendOutline as Send,
  IoAlertCircleOutline as AlertCircle,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoSyncOutline as RotateCw,
  IoKeyOutline as KeyIcon,
} from 'react-icons/io5';
import { sendResetPasswordEmail } from '@/app/auth/actions';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await sendResetPasswordEmail(formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        setSuccess(res.success);
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
            Lupa Kata Sandi?
          </h1>
          <p className="text-xs text-zinc-400">
            Masukkan alamat email yang terdaftar untuk menerima tautan pemulihan kata sandi via Supabase Auth
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
            <label
              htmlFor="email"
              className="text-xs font-semibold text-zinc-300 block"
            >
              Alamat Email Terdaftar
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

          <button
            type="submit"
            disabled={isPending}
            className="w-full h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {isPending ? (
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
        </form>

        <div className="pt-4 border-t border-white/10 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowBack className="w-3.5 h-3.5" />
            <span>Kembali ke halaman masuk</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
