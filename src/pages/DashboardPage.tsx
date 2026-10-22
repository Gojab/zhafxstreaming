import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
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
  IoBookmarkOutline as Bookmark,
  IoTimeOutline as TimeIcon,
  IoArrowBackOutline as ArrowBack,
  IoPlayOutline as PlayIcon,
  IoShieldOutline as SecurityShield,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { User } from '../types';

import type { Variants } from 'motion/react';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.98,
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.55,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow&backgroundColor=06070B',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Titan&backgroundColor=151822',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber&backgroundColor=1e293b',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Ronin&backgroundColor=312e81',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Aura&backgroundColor=0f172a',
  'https://api.dicebear.com/7.x/initials/svg?seed=Zhafx&backgroundColor=4285f4,34a853,fbbc05,ea4335',
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [stats, setStats] = useState({
    myListCount: 0,
    historyCount: 0,
    progressCount: 0,
  });

  useEffect(() => {
    const updateStats = () => {
      setStats({
        myListCount: storage.getMyList().length,
        historyCount: storage.getHistory().length,
        progressCount: storage.getAllProgress().length,
      });
    };
    updateStats();
    window.addEventListener('zhafx_storage_change', updateStats);
    window.addEventListener('storage', updateStats);
    return () => {
      window.removeEventListener('zhafx_storage_change', updateStats);
      window.removeEventListener('storage', updateStats);
    };
  }, []);

  useEffect(() => {
    const syncUser = () => {
      const u = storage.getUser();
      if (!u) {
        navigate('/');
        return;
      }
      setCurrentUser(u);
      setName(u.name || '');
      setEmail(u.email || '');
      setAvatar(u.avatar || '');
    };
    syncUser();
    window.addEventListener('zhafx_auth_change', syncUser);
    return () => window.removeEventListener('zhafx_auth_change', syncUser);
  }, [navigate]);

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

      // 1. Supabase Auth update
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
        console.warn('[DashboardPage] Supabase updateUser warning:', sbErr);
      }

      // 2. Express backend Auth DB update
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
        console.warn('[DashboardPage] Backend update-profile warning:', apiErr);
      }

      // 3. Update localStorage and broadcast
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
      }, 4000);
    } catch (err: any) {
      console.error('[DashboardPage Save Error]:', err);
      setError(err?.message || 'Gagal menyimpan profil.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${storage.getToken() || ''}`,
        },
      });
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
    storage.clearAuth();
    setCurrentUser(null);
    window.dispatchEvent(new Event('zhafx_auth_change'));
    navigate('/');
  };

  const joinedDateFormatted = currentUser?.joinedAt
    ? new Date(currentUser.joinedAt).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Anggota Aktif';

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen pt-24 pb-16 px-4 sm:px-6 max-w-4xl mx-auto space-y-6"
    >
      {/* 1. Top Breadcrumb Card */}
      <motion.div
        variants={cardVariants}
        className="flex items-center justify-between"
      >
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowBack className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>

        <button
          onClick={handleLogout}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar Akun</span>
        </button>
      </motion.div>

      {/* 2. Main Profile Header Card */}
      <motion.div
        variants={cardVariants}
        className="rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-white/20 shadow-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Header Profile Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={name || 'Avatar'}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white text-black font-extrabold text-2xl flex items-center justify-center uppercase shadow-lg">
                {name?.charAt(0) || email?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {name || 'Pengguna Zhafx'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Terverifikasi</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>{email || currentUser?.email || 'user@zhafx.id'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => navigate('/my-list')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-white/90 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-300" />
              <span>Daftar Saya</span>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-white/90 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <TimeIcon className="w-3.5 h-3.5 text-sky-300" />
              <span>Riwayat</span>
            </button>
          </div>
        </div>

        {/* 3. Staggered Quick Activity Cards Grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs"
        >
          <motion.div
            variants={cardVariants}
            onClick={() => navigate('/my-list')}
            className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px]">Daftar Saya</span>
              <Bookmark className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg font-bold text-white">{stats.myListCount} Judul</p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            onClick={() => navigate('/history')}
            className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px]">Riwayat Tontonan</span>
              <TimeIcon className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-lg font-bold text-white">{stats.historyCount} Ditonton</p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px]">Progres Aktif</span>
              <PlayIcon className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-white">{stats.progressCount} Tayangan</p>
          </motion.div>

          <motion.div
            variants={cardVariants}
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"
          >
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-[11px]">Status Keamanan</span>
              <SecurityShield className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-emerald-400">Aktif & Aman</p>
          </motion.div>
        </motion.div>

        {/* Status Alerts */}
        {error && (
          <motion.div
            variants={cardVariants}
            className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            variants={cardVariants}
            className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{success}</span>
          </motion.div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* 4. Avatar Selection Card */}
          <motion.div variants={cardVariants} className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 block">
              Pilih Avatar Karakter
            </label>
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {PRESET_AVATARS.map((presetUrl, idx) => {
                const isSelected = avatar === presetUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAvatar(presetUrl)}
                    className={`relative w-12 h-12 rounded-full p-0.5 transition-all cursor-pointer shrink-0 ${
                      isSelected
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-105'
                        : 'opacity-65 hover:opacity-100 hover:scale-105 border border-white/20'
                    }`}
                  >
                    <img
                      src={presetUrl}
                      alt={`Preset Avatar ${idx + 1}`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* 5. Name and Email Inputs Card */}
          <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="dashboard-name" className="text-xs font-semibold text-zinc-300 block">
                Nama Lengkap / Tampilan
              </label>
              <div className="relative">
                <input
                  id="dashboard-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama tampilan Anda"
                  className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.06] border border-white/15 text-sm text-white focus:outline-none focus:border-white transition-colors"
                />
                <UserIcon className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dashboard-email" className="text-xs font-semibold text-zinc-300 block">
                Alamat Email
              </label>
              <div className="relative">
                <input
                  id="dashboard-email"
                  type="email"
                  readOnly
                  value={email || currentUser?.email || ''}
                  className="w-full h-11 px-4 pl-10 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-zinc-400 cursor-not-allowed select-all"
                />
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              </div>
            </div>
          </motion.div>

          {/* 6. Password update section Card */}
          <motion.div variants={cardVariants} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Lock className="w-4 h-4 text-zinc-400" />
              <span>Ganti Kata Sandi (Opsional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Kata sandi baru (min 6 karakter)"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </motion.div>

          {/* 7. Account Meta Information Cards */}
          <motion.div variants={cardVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <span className="text-[10px] text-zinc-400 block">Terdaftar Sejak</span>
              <span className="font-medium text-white">{joinedDateFormatted}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">User ID</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-zinc-400 hover:text-white cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <CopyIcon className="w-3 h-3" />
                  <span>{copiedId ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
              <span className="font-mono text-zinc-300 block truncate" title={currentUser?.id}>
                {currentUser?.id || '-'}
              </span>
            </div>
          </motion.div>

          {/* 8. Save Actions Card */}
          <motion.div variants={cardVariants} className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-black" />
                  <span>Menyimpan Perubahan...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4 text-black" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </motion.div>
  );
};
