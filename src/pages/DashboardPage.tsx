import React, { useState, useEffect, useMemo } from 'react';
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
  IoTrashOutline as TrashIcon,
  IoServerOutline as ServerIcon,
  IoChatbubbleEllipsesOutline as CommentIcon,
  IoPeopleOutline as PeopleIcon,
  IoStar as StarIcon,
  IoSearchOutline as SearchIcon,
  IoOpenOutline as OpenIcon,
  IoFilterOutline as FilterIcon,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { checkIsAdminEmail } from '../config';

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

  // Administrator state & management
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminComments, setAdminComments] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminNotes, setAdminNotes] = useState<any[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [notesTableCreated, setNotesTableCreated] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'comments' | 'notes' | 'users' | 'database'>('comments');
  const [commentSearch, setCommentSearch] = useState('');
  const [commentRatingFilter, setCommentRatingFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');

  const filteredComments = useMemo(() => {
    return adminComments.filter((comm) => {
      if (commentRatingFilter !== 'all' && comm.rating && String(comm.rating) !== commentRatingFilter) {
        return false;
      }
      if (commentSearch.trim()) {
        const q = commentSearch.toLowerCase();
        const matchName = (comm.userName || '').toLowerCase().includes(q);
        const matchText = (comm.text || '').toLowerCase().includes(q);
        const matchTitle = (comm.contentTitle || '').toLowerCase().includes(q);
        const matchId = String(comm.contentId || '').toLowerCase().includes(q);
        return matchName || matchText || matchTitle || matchId;
      }
      return true;
    });
  }, [adminComments, commentSearch, commentRatingFilter]);

  const loadAdminData = async (token?: string | null) => {
    const activeToken = token || storage.getToken() || '';
    const u = storage.getUser();
    setAdminLoading(true);
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${activeToken}`,
        'x-user-email': u?.email || '',
      };
      const [statsRes, commentsRes, usersRes, notesRes] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/comments', { headers }),
        fetch('/api/admin/users', { headers }),
        fetch('/api/notes'),
      ]);
      if (statsRes.ok) setAdminStats(await statsRes.json());
      if (commentsRes.ok) {
        const cData = await commentsRes.json();
        setAdminComments(cData.comments || []);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setAdminUsers(uData.users || []);
      }
      if (notesRes.ok) {
        const nData = await notesRes.json();
        setAdminNotes(nData.notes || []);
        setNotesTableCreated(Boolean(nData.tableCreated));
      }
    } catch (err) {
      console.warn('[Admin Panel load error]:', err);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newNoteTitle.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.note) {
          setAdminNotes((prev) => [...prev, data.note]);
          setNewNoteTitle('');
        }
      }
    } catch (err) {
      console.error('Gagal menambah catatan:', err);
    }
  };

  const handleDeleteNote = async (id: number | string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAdminNotes((prev) => prev.filter((n) => String(n.id) !== String(id)));
      }
    } catch (err) {
      console.error('Gagal menghapus catatan:', err);
    }
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    if (!confirm('Hapus komentar ini secara permanen dari Supabase & server?')) return;
    const token = storage.getToken() || '';
    try {
      const res = await fetch(`/api/admin/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAdminComments((prev) => prev.filter((c) => c.id !== commentId));
        if (adminStats) {
          setAdminStats((prev: any) => ({
            ...prev,
            totalComments: Math.max(0, (prev?.totalComments || 1) - 1),
          }));
        }
      }
    } catch (err) {
      console.error('Gagal menghapus komentar:', err);
    }
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const token = storage.getToken();
      const u = storage.getUser();
      const isOwner = checkIsAdminEmail(u?.email);

      if (isOwner) {
        setIsAdmin(true);
        loadAdminData(token);
        return;
      }

      if (token) {
        try {
          const res = await fetch('/api/admin/check', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.isAdmin) {
              setIsAdmin(true);
              loadAdminData(token);
            }
          }
        } catch {}
      }
    };
    checkAdmin();
  }, [currentUser]);

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

      {/* 9. Dedicated Administrator Panel (Supabase & Moderasi) */}
      {isAdmin && (
        <motion.div
          variants={cardVariants}
          className="rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-amber-500/30 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden"
        >
          {/* Subtle amber ambient glow for admin */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/10 blur-[90px] pointer-events-none rounded-full" />

          {/* Admin Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <SecurityShield className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">Panel Administrator</h2>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Super Admin
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Koneksi Database Supabase &bull; Moderasi Komentar & Pengguna
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadAdminData()}
              disabled={adminLoading}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-xs text-white font-medium flex items-center gap-1.5 cursor-pointer transition-colors self-start sm:self-auto"
            >
              <RotateCw className={`w-3.5 h-3.5 ${adminLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Data</span>
            </button>
          </div>

          {/* Admin Stat Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px]">Database Supabase</span>
                <ServerIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Terhubung (@supabase/server)
              </p>
              <p className="text-[10px] text-zinc-500 truncate" title="xjyzfunqiazlayivjsxj.supabase.co">
                xjyzfunqiazlayivjsxj.supabase.co
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px]">Total Komentar</span>
                <CommentIcon className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {adminStats?.totalComments ?? adminComments.length} Komentar
              </p>
              <p className="text-[10px] text-zinc-400">Tersinkronisasi ke Supabase & DB lokal</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-[11px]">Pengguna Terdaftar</span>
                <PeopleIcon className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-lg font-bold text-white">
                {adminStats?.totalUsers ?? adminUsers.length} Akun
              </p>
              <p className="text-[10px] text-zinc-400">Akun terverifikasi di server</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveAdminTab('comments')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
                activeAdminTab === 'comments'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Moderasi Komentar ({adminComments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('notes')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
                activeAdminTab === 'notes'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Supabase Notes ({adminNotes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('users')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
                activeAdminTab === 'users'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Daftar Pengguna ({adminUsers.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminTab('database')}
              className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer shrink-0 ${
                activeAdminTab === 'database'
                  ? 'bg-white text-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              Info Supabase
            </button>
          </div>

          {/* Tab 1: Moderasi Komentar */}
          {activeAdminTab === 'comments' && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="relative flex-1">
                  <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={commentSearch}
                    onChange={(e) => setCommentSearch(e.target.value)}
                    placeholder="Cari nama, judul film/anime, atau isi komentar..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                  />
                  {commentSearch && (
                    <button
                      type="button"
                      onClick={() => setCommentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0 text-xs">
                  <span className="text-[11px] text-zinc-500 flex items-center gap-1 mr-1">
                    <FilterIcon className="w-3.5 h-3.5" />
                    Rating:
                  </span>
                  {(['all', '5', '4', '3', '2', '1'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCommentRatingFilter(r)}
                      className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-colors cursor-pointer shrink-0 ${
                        commentRatingFilter === r
                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                          : 'bg-white/[0.03] text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {r === 'all' ? 'Semua' : `★ ${r}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between text-xs px-1 text-zinc-400">
                <span>
                  Menampilkan <strong className="text-white">{filteredComments.length}</strong> dari{' '}
                  <strong className="text-white">{adminComments.length}</strong> komentar
                </span>
                <button
                  type="button"
                  onClick={() => loadAdminData()}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  Segarkan
                </button>
              </div>

              {/* Comment Cards List */}
              {adminComments.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <CommentIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="font-semibold text-zinc-300">Belum Ada Komentar</p>
                  <p className="text-[11px] text-zinc-500">
                    Komentar dari penonton di film, series, atau anime akan muncul di sini.
                  </p>
                </div>
              ) : filteredComments.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <p>Tidak ada komentar yang cocok dengan pencarian atau filter rating.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setCommentSearch('');
                      setCommentRatingFilter('all');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {filteredComments.map((comm) => {
                    const mediaTypeLabel =
                      comm.mediaType === 'anime'
                        ? 'Anime'
                        : comm.mediaType === 'tv'
                        ? 'Series'
                        : 'Film';

                    return (
                      <div
                        key={comm.id}
                        className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 transition-all space-y-3 text-xs"
                      >
                        {/* Top info line */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Avatar placeholder with initial */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0 shadow">
                              {(comm.userName || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white truncate">
                                  {comm.userName || 'Pengguna'}
                                </span>
                                {comm.isAdmin && (
                                  <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                                    Admin
                                  </span>
                                )}
                                {comm.source === 'supabase' ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                                    Supabase DB
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-medium">
                                    Server Sync
                                  </span>
                                )}
                              </div>
                              {comm.userEmail && (
                                <p className="text-[10px] text-zinc-500 truncate">{comm.userEmail}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            {/* Rating Stars */}
                            {comm.rating ? (
                              <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-semibold">
                                <StarIcon className="w-3 h-3 fill-amber-400 text-amber-400" />
                                <span>{comm.rating}/5</span>
                              </div>
                            ) : null}

                            {/* Timestamp */}
                            <span className="text-[10px] text-zinc-500">
                              {new Date(comm.createdAt).toLocaleString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Media Context Banner */}
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-zinc-300 uppercase shrink-0">
                              {mediaTypeLabel}
                            </span>
                            <span className="text-xs font-medium text-zinc-200 truncate" title={comm.contentTitle || `ID: ${comm.contentId}`}>
                              {comm.contentTitle ? comm.contentTitle : `ID Konten: ${comm.contentId}`}
                            </span>
                          </div>

                          {comm.contentId && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetType = comm.mediaType || 'movie';
                                navigate(`/detail/${targetType}/${comm.contentId}`);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 font-semibold hover:underline shrink-0 cursor-pointer"
                            >
                              <span>Lihat Media</span>
                              <OpenIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Comment Text Body */}
                        <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-zinc-200 text-xs leading-relaxed whitespace-pre-wrap break-words">
                          {comm.text || '(Komentar tanpa teks)'}
                        </div>

                        {/* Action footer */}
                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleAdminDeleteComment(comm.id)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors text-xs"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                            <span>Hapus Komentar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Supabase Notes */}
          {activeAdminTab === 'notes' && (
            <div className="space-y-4">
              {/* Status Header */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${notesTableCreated ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span className="text-white font-semibold">
                    {notesTableCreated ? 'Tabel public.notes Terhubung di Supabase' : 'Tabel public.notes Mode Sinkronisasi / Fallback'}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {adminNotes.length} Catatan
                </span>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Tambah catatan baru ke Supabase..."
                  className="flex-1 h-11 px-4 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-500"
                />
                <button
                  type="submit"
                  disabled={!newNoteTitle.trim()}
                  className="px-4 h-11 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs cursor-pointer transition-colors disabled:opacity-50 shrink-0 shadow-md"
                >
                  Tambah Catatan
                </button>
              </form>

              {/* Notes List */}
              <div className="space-y-2">
                {adminNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-white/10 text-[10px] font-mono text-zinc-300 flex items-center justify-center shrink-0">
                        #{note.id}
                      </span>
                      <span className="text-white font-medium break-all">{note.title}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      title="Hapus Catatan"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Raw JSON Pre Output (as requested in Supabase quickstart) */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-zinc-400 block">
                  Hasil Query Langsung Supabase &lt;pre&gt;:
                </span>
                <pre className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-48 scrollbar-thin">
                  {JSON.stringify(adminNotes, null, 2)}
                </pre>
              </div>

              {/* SQL Setup Helper */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200/90 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Script SQL Tabel Supabase (Jalankan di Supabase SQL Editor jika belum):</span>
                </div>
                <pre className="p-3 rounded-xl bg-black/50 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 overflow-x-auto select-all">
{`create table notes (
  id bigint primary key generated always as identity,
  title text not null
);

insert into notes (title) values
  ('Today I created a Supabase project.'),
  ('I added some data and queried it from Next.js.'),
  ('It was awesome!');

alter table notes enable row level security;
create policy "public can read notes" on public.notes for select to anon using (true);`}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 2: Users */}
          {activeAdminTab === 'users' && (
            <div className="space-y-3">
              {adminUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400 rounded-2xl bg-white/[0.02] border border-white/5">
                  Tidak ada pengguna lain terdaftar.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {adminUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{u.name}</span>
                          {u.isAdmin && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-400 text-[11px] truncate">{u.email}</p>
                      </div>
                      <div className="text-right text-[10px] text-zinc-500 shrink-0">
                        <span>
                          {new Date(u.joinedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Database & Supabase Details */}
          {activeAdminTab === 'database' && (
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs leading-relaxed">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Supabase Backend & Database Terkonfigurasi</span>
              </div>
              <p className="text-zinc-300">
                Backend terhubung ke project Supabase: <span className="font-mono text-white">xjyzfunqiazlayivjsxj</span> menggunakan paket <span className="font-mono text-emerald-300">@supabase/server</span> dan <span className="font-mono text-emerald-300">@supabase/supabase-js</span>.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-zinc-400 block font-semibold">Project Endpoint:</span>
                  <span className="font-mono text-zinc-300 break-all">https://xjyzfunqiazlayivjsxj.supabase.co</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-zinc-400 block font-semibold">Tabel Terkelola:</span>
                  <span className="font-mono text-zinc-300">comments, users, watch_progress</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};
