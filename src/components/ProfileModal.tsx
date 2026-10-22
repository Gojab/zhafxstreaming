import React, { useState, useEffect } from 'react';
import {
  IoCloseOutline as CloseIcon,
  IoPersonOutline as UserIcon,
  IoMailOutline as Mail,
  IoShieldCheckmarkOutline as ShieldCheck,
  IoKeyOutline as KeyIcon,
  IoCalendarOutline as Calendar,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoAlertCircleOutline as AlertCircle,
  IoSyncOutline as RotateCw,
  IoCheckmarkOutline as SaveIcon,
  IoLogOutOutline as LogOut,
  IoLockClosedOutline as Lock,
  IoCopyOutline as CopyIcon,
  IoSparkles as Sparkles,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { User } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout?: () => void;
}

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow&backgroundColor=06070B',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Titan&backgroundColor=151822',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber&backgroundColor=1e293b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Ronin&backgroundColor=312e81',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aura&backgroundColor=0f172a',
  'https://api.dicebear.com/7.x/initials/svg?seed=Zhafx&backgroundColor=4285f4,34a853,fbbc05,ea4335',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onLogout,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => storage.getUser());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Sync user on open
  useEffect(() => {
    if (isOpen) {
      const u = storage.getUser();
      setCurrentUser(u);
      setName(u?.name || '');
      setEmail(u?.email || '');
      setAvatar(u?.avatar || '');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

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
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyId = () => {
    if (currentUser?.id) {
      navigator.clipboard.writeText(currentUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError('Nama tampilan tidak boleh kosong.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setError('Kata sandi baru minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok.');
        return;
      }
    }

    setIsLoading(true);

    try {
      const activeToken = storage.getToken();

      // 1. Update in Supabase session if authenticated via Supabase
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          const userUpdates: { data: { name: string; avatar_url?: string }; password?: string } = {
            data: {
              name: cleanName,
              avatar_url: avatar || undefined,
            },
          };
          if (newPassword) {
            userUpdates.password = newPassword;
          }
          await supabase.auth.updateUser(userUpdates);
        }
      } catch (sbErr) {
        console.warn('[ProfileModal] Supabase updateUser info:', sbErr);
      }

      // 2. Update in Express backend Auth DB
      try {
        await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
          },
          body: JSON.stringify({
            name: cleanName,
            avatar,
            email: currentUser?.email || email,
          }),
        });
      } catch (apiErr) {
        console.warn('[ProfileModal] Backend update-profile warning:', apiErr);
      }

      // 3. Update localStorage and broadcast change
      const updatedUser: User = {
        id: currentUser?.id || 'usr_' + Date.now(),
        email: currentUser?.email || email || 'user@zhafx.id',
        name: cleanName,
        avatar: avatar || undefined,
        joinedAt: currentUser?.joinedAt || Date.now(),
      };

      storage.saveUser(updatedUser);
      setCurrentUser(updatedUser);
      window.dispatchEvent(new Event('zhafx_auth_change'));

      setSuccess('Profil berhasil diperbarui!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccess(null);
      }, 3500);
    } catch (err: any) {
      console.error('[ProfileModal Error]:', err);
      setError(err?.message || 'Gagal menyimpan profil. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutAction = async () => {
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      try {
        await supabase.auth.signOut();
      } catch {
        // silent
      }
      storage.clearAuth();
      window.dispatchEvent(new Event('zhafx_auth_change'));
    }
  };

  const joinedDateFormatted = currentUser?.joinedAt
    ? new Date(currentUser.joinedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Anggota Aktif';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Profil Akun"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Profile Modal Card */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-white/20 shadow-2xl p-5 sm:p-7 space-y-5 z-10 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-inner">
              <UserIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Pengaturan Profil</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                  Terverifikasi
                </span>
              </h2>
              <p className="text-[11px] text-white/50">Kelola identitas akun & preferensi Anda</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Tutup"
            className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* User Snapshot Banner */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {avatar ? (
              <img
                src={avatar}
                alt={name || 'Avatar'}
                className="w-12 h-12 rounded-full object-cover border-2 border-white/30 shadow-md shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white text-black font-extrabold text-base flex items-center justify-center uppercase shadow-md shrink-0">
                {name?.charAt(0) || email?.charAt(0) || 'U'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{name || 'Pengguna Zhafx'}</p>
              <p className="text-xs text-white/60 truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>{email || currentUser?.email || 'user@zhafx.id'}</span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-zinc-400 block">Bergabung</span>
            <span className="text-xs font-semibold text-zinc-300">{joinedDateFormatted}</span>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Avatar Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Pilih Avatar Karakter</span>
              <span className="text-[10px] text-zinc-400">Klik untuk mengganti</span>
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {PRESET_AVATARS.map((presetUrl, idx) => {
                const isSelected = avatar === presetUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(presetUrl)}
                    className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full p-0.5 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105'
                        : 'opacity-65 hover:opacity-100 hover:scale-105 border border-white/20'
                    }`}
                  >
                    <img
                      src={presetUrl}
                      alt={`Avatar Preset ${idx + 1}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="modal-profile-name" className="text-xs font-semibold text-zinc-300 block">
              Nama Lengkap / Tampilan
            </label>
            <div className="relative">
              <input
                id="modal-profile-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tampilan Anda"
                className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
              />
              <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          {/* Email Input (Readonly) */}
          <div className="space-y-1.5">
            <label htmlFor="modal-profile-email" className="text-xs font-semibold text-zinc-300 block">
              Alamat Email Terdaftar
            </label>
            <div className="relative">
              <input
                id="modal-profile-email"
                type="email"
                readOnly
                value={email || currentUser?.email || ''}
                className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-400 cursor-not-allowed select-all"
              />
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
            </div>
            <p className="text-[10px] text-zinc-500">Email terikat secara permanen dengan akun autentikasi Anda.</p>
          </div>

          {/* Optional Password Update */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ganti Kata Sandi (Opsional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Sandi baru (min 6 kar)"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi sandi baru"
                  className="w-full h-10 px-3 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* User ID section */}
          {currentUser?.id && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400">
              <div className="flex items-center gap-1.5 truncate">
                <KeyIcon className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                <span className="font-mono truncate" title={currentUser.id}>
                  ID: {currentUser.id}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-zinc-300 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer ml-2"
              >
                <CopyIcon className="w-3 h-3" />
                <span>{copiedId ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleLogoutAction}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Akun</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-3.5 h-3.5 text-black" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
