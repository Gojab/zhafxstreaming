'use client';

import React, { useState, useTransition } from 'react';
import {
  IoPersonOutline as User,
  IoMailOutline as Mail,
  IoCreateOutline as Edit3,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoAlertCircleOutline as AlertCircle,
  IoSyncOutline as RotateCw,
  IoCheckmarkOutline as Save,
  IoCloseOutline as X,
} from 'react-icons/io5';
import { updateProfile } from '@/app/auth/actions';

interface EditProfileFormProps {
  initialName: string;
  initialEmail: string;
}

export function EditProfileForm({
  initialName,
  initialEmail,
}: EditProfileFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    if (isOpen) {
      // Reset to original values on cancel
      setName(initialName);
      setEmail(initialEmail);
      setError(null);
      setSuccess(null);
    }
    setIsOpen(!isOpen);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);

    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        setSuccess(result.success);
      }
    });
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 space-y-4">
      {/* Header bar of Edit Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white">
            Pengaturan Profil Akun
          </h2>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
            isOpen
              ? 'bg-white/10 hover:bg-white/15 text-zinc-300'
              : 'bg-white text-black hover:bg-zinc-200 font-semibold shadow-sm'
          }`}
        >
          {isOpen ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Tutup</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5 text-black" />
              <span>Edit Profil</span>
            </>
          )}
        </button>
      </div>

      {/* Collapsed state quick hint */}
      {!isOpen && (
        <p className="text-xs text-zinc-400">
          Ubah nama tampilan atau perbarui alamat email akun Anda sewaktu-waktu.
        </p>
      )}

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{success}</span>
        </div>
      )}

      {/* Form when open */}
      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Input Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-name"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Nama Lengkap / Tampilan
              </label>
              <div className="relative">
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  className="w-full h-10 px-3 pl-9 rounded-xl bg-white/[0.06] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Input Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="profile-email"
                className="text-xs font-semibold text-zinc-300 block"
              >
                Alamat Email
              </label>
              <div className="relative">
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full h-10 px-3 pl-9 rounded-xl bg-white/[0.06] border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-medium cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-black" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
