import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { signout } from '@/app/auth/actions';
import { EditProfileForm } from '@/app/dashboard/EditProfileForm';
import {
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Mail,
  Calendar,
  KeyRound,
  BadgeCheck,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const userName = String(
    user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split('@')[0] ||
      'Pengguna'
  );

  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-';

  return (
    <main className="min-h-screen bg-[#090A0E] text-[#F4F4F5] p-4 sm:p-8 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white/[0.04] border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {userName}
                </h1>
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xs text-zinc-400">
                Dashboard Akun &bull; Supabase Serverless Auth
              </p>
            </div>
          </div>

          <form action={signout}>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </form>
        </div>

        {/* User Profile Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Informasi Pengguna Terverifikasi</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <UserIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Nama Pengguna</span>
              </div>
              <p className="text-sm font-semibold text-white break-all">
                {userName}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span>Alamat Email</span>
              </div>
              <p className="text-sm font-semibold text-white break-all">
                {user.email}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>User ID</span>
              </div>
              <p className="text-xs font-mono text-zinc-300 truncate" title={user.id}>
                {user.id}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Terdaftar Sejak</span>
              </div>
              <p className="text-sm font-medium text-white">
                {createdDate}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Profile Feature Section */}
        <EditProfileForm
          initialName={userName}
          initialEmail={user.email || ''}
        />

        {/* Security & Token Info */}
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 leading-relaxed">
          <p className="font-semibold text-emerald-300 mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Sesi Serverless Aktif</span>
          </p>
          Perubahan profil langsung disinkronkan ke Supabase Auth melalui Server Action yang terenkripsi dan terlindungi di level server.
        </div>
      </div>
    </main>
  );
}
