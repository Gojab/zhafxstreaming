import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoCloseOutline as CloseIcon,
  IoPersonAddOutline as FollowIcon,
  IoCheckmarkOutline as CheckIcon,
  IoPlayOutline as PlayIcon,
  IoTimeOutline as TimeIcon,
  IoTrophyOutline as TrophyIcon,
  IoShieldCheckmarkOutline as ShieldIcon,
  IoFlameOutline as FlameIcon,
  IoSparkles as SparklesIcon,
  IoSyncOutline as RotateCw,
  IoBookmarkOutline as BookmarkIcon,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import { UserProfileDetail, FriendActivity } from '../types';

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  onOpenAuth,
}) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfileDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      return;
    }

    const token = storage.getToken();
    setIsLoading(true);

    fetch(`/api/community/profile/${encodeURIComponent(userId)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setProfile(data.profile);
          setIsFollowing(Boolean(data.profile.isFollowing || storage.isFollowing(userId)));
          setFollowersCount(data.profile.followersCount || 0);
        }
      })
      .catch((err) => {
        console.warn('[UserProfileModal] Error loading profile:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, userId]);

  // Close on Escape & freeze body scroll
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleFollow = async () => {
    const currentUser = storage.getUser();
    if (!currentUser) {
      if (onOpenAuth) {
        onClose();
        onOpenAuth();
      }
      return;
    }

    if (!userId || isFollowLoading) return;

    // Optimistic UI update
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));
    storage.setFollowing(userId, nextState);

    setIsFollowLoading(true);
    try {
      const token = storage.getToken();
      const res = await fetch('/api/community/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setIsFollowing(data.isFollowing);
          setFollowersCount(data.followersCount);
          storage.setFollowing(userId, data.isFollowing);
        }
      }
    } catch (e) {
      console.warn('[UserProfileModal] Follow error:', e);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleWatch = (type: string, id: string, season?: number, episode?: number) => {
    onClose();
    if (season && episode) {
      navigate(`/watch/${type}/${id}/${season}/${episode}`);
    } else {
      navigate(`/detail/${type}/${id}`);
    }
  };

  const currentUser = storage.getUser();
  const isSelf = currentUser && currentUser.id === userId;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-white/20 shadow-2xl p-5 sm:p-7 space-y-5 z-10 text-white animate-modal-card">
        {/* Top Bar with Close */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Profil Komunitas ZHAFX
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <RotateCw className="w-8 h-8 animate-spin text-white/60" />
            <p className="text-xs text-zinc-400">Memuat data teman...</p>
          </div>
        ) : profile ? (
          <>
            {/* Header: Avatar, Name, Badge & Follow Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={profile.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.name)}`}
                    alt={profile.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white/25 shadow-lg bg-zinc-900"
                  />
                  {profile.rank <= 3 && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs flex items-center justify-center shadow-md">
                      #{profile.rank}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 id="user-profile-modal-title" className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      {profile.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
                      <ShieldIcon className="w-3 h-3" />
                      <span>{profile.badge}</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">@{profile.username}</p>
                </div>
              </div>

              {!isSelf && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={isFollowLoading}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto ${
                    isFollowing
                      ? 'bg-white/10 hover:bg-rose-500/20 text-zinc-200 hover:text-rose-300 border border-white/20 hover:border-rose-500/30'
                      : 'bg-white hover:bg-zinc-200 text-black shadow-lg hover:scale-105 active:scale-95'
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5" />
                      <span>Mengikuti</span>
                    </>
                  ) : (
                    <>
                      <FollowIcon className="w-3.5 h-3.5" />
                      <span>+ Ikuti Teman</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-xs text-zinc-300/90 leading-relaxed bg-white/[0.03] p-3 rounded-2xl border border-white/5">
                {profile.bio}
              </p>
            )}

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Pengikut</span>
                <span className="text-base font-bold text-white">{followersCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Mengikuti</span>
                <span className="text-base font-bold text-white">{profile.followingCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Total Nonton</span>
                <span className="text-base font-bold text-amber-300">{profile.watchTimeHours} Jam</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-center">
                <span className="text-[10px] text-zinc-400 block mb-0.5">Ranking</span>
                <span className="text-base font-bold text-emerald-400">#{profile.rank}</span>
              </div>
            </div>

            {/* Sedang Menonton (Live Watching Status) */}
            {profile.currentWatching && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-white/15 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                    <FlameIcon className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                    <span>Sedang Ditonton Teman</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-zinc-300 uppercase font-bold">
                    {profile.currentWatching.type}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {profile.currentWatching.poster && (
                      <img
                        src={profile.currentWatching.poster}
                        alt={profile.currentWatching.title}
                        className="w-10 h-14 rounded-lg object-cover border border-white/20 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {profile.currentWatching.title}
                      </p>
                      {profile.currentWatching.season && profile.currentWatching.episode && (
                        <p className="text-[11px] text-zinc-400">
                          Musim {profile.currentWatching.season} &bull; Episode {profile.currentWatching.episode}
                        </p>
                      )}
                      {profile.currentWatching.percentage !== undefined && (
                        <div className="w-28 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${profile.currentWatching.percentage}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleWatch(
                        profile.currentWatching!.type,
                        profile.currentWatching!.title,
                        profile.currentWatching!.season,
                        profile.currentWatching!.episode
                      )
                    }
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-transform active:scale-95"
                  >
                    <PlayIcon className="w-3.5 h-3.5 fill-black" />
                    <span>Tonton</span>
                  </button>
                </div>
              </div>
            )}

            {/* Aktivitas Terkini */}
            {profile.recentActivities && profile.recentActivities.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-white">Aktivitas Menonton Terkini</span>
                  <span className="text-[11px] text-zinc-500">{profile.recentActivities.length} aktivitas</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {profile.recentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {act.poster && (
                          <img
                            src={act.poster}
                            alt={act.mediaTitle}
                            className="w-7 h-10 rounded-md object-cover border border-white/10 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate">{act.mediaTitle}</p>
                          <p className="text-[10px] text-zinc-400">
                            {act.action === 'completed'
                              ? 'Menyelesaikan tayangan ini'
                              : act.action === 'rated'
                              ? `Memberi rating ★ ${act.rating || 5}`
                              : act.action === 'added_list'
                              ? 'Menambahkan ke Daftar Saya'
                              : 'Sedang maraton'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] text-zinc-500 shrink-0">
                        {new Date(act.timestamp).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center text-xs text-zinc-400">
            Pengguna tidak ditemukan atau profil bersifat privat.
          </div>
        )}
      </div>
    </div>
  );
};
