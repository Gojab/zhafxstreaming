import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  IoTrophyOutline as TrophyIcon,
  IoFlame as FlameIcon,
  IoPersonAddOutline as FollowIcon,
  IoCheckmarkOutline as CheckIcon,
  IoSearchOutline as SearchIcon,
  IoPlay as PlayIcon,
  IoTimeOutline as TimeIcon,
  IoPeopleOutline as PeopleIcon,
  IoStar as StarIcon,
  IoSparkles as SparklesIcon,
  IoShieldCheckmarkOutline as ShieldIcon,
  IoEyeOutline as EyeIcon,
  IoSyncOutline as RotateCw,
  IoArrowForwardOutline as ArrowRight,
  IoFilterOutline as FilterIcon,
  IoBookmarkOutline as BookmarkIcon,
} from 'react-icons/io5';
import { storage } from '../lib/storage';
import {
  CommunityFriend,
  FriendActivity,
  TopWatchedRankingTitle,
  TopWatcherUser,
} from '../types';
import { UserProfileModal } from '../components/UserProfileModal';

export const CommunityRankingPage: React.FC = () => {
  const navigate = useNavigate();

  // Tab State: 'ranking' | 'community'
  const [activeMainTab, setActiveMainTab] = useState<'ranking' | 'community'>('ranking');

  // Ranking Sub-States
  const [rankingMode, setRankingMode] = useState<'watchers' | 'titles'>('watchers');
  const [rankingPeriod, setRankingPeriod] = useState<'all_time' | 'monthly' | 'weekly'>('all_time');
  const [titleTypeFilter, setTitleTypeFilter] = useState<'all' | 'movie' | 'tv' | 'anime'>('all');

  // Community Sub-States
  const [communityTab, setCommunityTab] = useState<'explore' | 'following' | 'followers' | 'feed'>('explore');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [leaderboardData, setLeaderboardData] = useState<{
    podium: TopWatcherUser[];
    runnersUp: TopWatcherUser[];
    currentUserRank: TopWatcherUser | null;
  }>({
    podium: [],
    runnersUp: [],
    currentUserRank: null,
  });

  const [topTitles, setTopTitles] = useState<TopWatchedRankingTitle[]>([]);
  const [friendsList, setFriendsList] = useState<CommunityFriend[]>([]);
  const [activities, setActivities] = useState<FriendActivity[]>([]);

  // Loading States
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [isTitlesLoading, setIsTitlesLoading] = useState(false);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(false);

  // Profile Modal
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

  // Current Logged In User
  const [currentUser, setCurrentUser] = useState(() => storage.getUser());

  useEffect(() => {
    const handleAuth = () => setCurrentUser(storage.getUser());
    window.addEventListener('zhafx_auth_change', handleAuth);
    return () => window.removeEventListener('zhafx_auth_change', handleAuth);
  }, []);

  // 1. Fetch Leaderboard Data
  const loadLeaderboard = () => {
    setIsLeaderboardLoading(true);
    const token = storage.getToken();
    fetch(`/api/rankings/top-watchers?period=${rankingPeriod}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) {
          setLeaderboardData({
            podium: data.podium || [],
            runnersUp: data.runnersUp || [],
            currentUserRank: data.currentUserRank || null,
          });
        }
      })
      .catch((e) => console.warn('[Leaderboard] Load error:', e))
      .finally(() => setIsLeaderboardLoading(false));
  };

  useEffect(() => {
    loadLeaderboard();
  }, [rankingPeriod, currentUser]);

  // 2. Fetch Top Watched Titles
  const loadTopTitles = () => {
    setIsTitlesLoading(true);
    fetch(`/api/rankings/top-watched?type=${titleTypeFilter}&period=${rankingPeriod}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.results) {
          setTopTitles(data.results);
        }
      })
      .catch((e) => console.warn('[TopTitles] Load error:', e))
      .finally(() => setIsTitlesLoading(false));
  };

  useEffect(() => {
    loadTopTitles();
  }, [titleTypeFilter, rankingPeriod]);

  // 3. Fetch Friends & Community Users
  const loadFriends = () => {
    setIsFriendsLoading(true);
    const token = storage.getToken();
    const q = searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : '';
    fetch(`/api/community/friends?${q}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.friends) {
          setFriendsList(data.friends);
        }
      })
      .catch((e) => console.warn('[Friends] Load error:', e))
      .finally(() => setIsFriendsLoading(false));
  };

  useEffect(() => {
    loadFriends();
  }, [searchQuery, currentUser]);

  // 4. Fetch Community Activities Feed
  const loadActivities = () => {
    setIsActivitiesLoading(true);
    const token = storage.getToken();
    fetch('/api/community/activities?limit=50', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.activities) {
          setActivities(data.activities);
        }
      })
      .catch((e) => console.warn('[Activities] Load error:', e))
      .finally(() => setIsActivitiesLoading(false));
  };

  useEffect(() => {
    loadActivities();
  }, [currentUser]);

  // Quick Follow Toggle Handler
  const handleFollowToggle = async (targetUserId: string, currentFollowState: boolean) => {
    const user = storage.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    // Optimistic state
    const nextFollow = !currentFollowState;
    storage.setFollowing(targetUserId, nextFollow);

    // Update friends list state
    setFriendsList((prev) =>
      prev.map((f) =>
        f.id === targetUserId
          ? {
              ...f,
              isFollowing: nextFollow,
              followersCount: Math.max(0, f.followersCount + (nextFollow ? 1 : -1)),
            }
          : f
      )
    );

    // Update leaderboard state
    setLeaderboardData((prev) => ({
      podium: prev.podium.map((p) =>
        p.userId === targetUserId ? { ...p, isFollowing: nextFollow } : p
      ),
      runnersUp: prev.runnersUp.map((p) =>
        p.userId === targetUserId ? { ...p, isFollowing: nextFollow } : p
      ),
      currentUserRank: prev.currentUserRank,
    }));

    try {
      const token = storage.getToken();
      await fetch('/api/community/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ targetUserId }),
      });
    } catch (e) {
      console.warn('[CommunityRankingPage] Follow error:', e);
    }
  };

  // Filter friends according to communityTab
  const filteredFriends = useMemo(() => {
    if (communityTab === 'following') {
      return friendsList.filter((f) => f.isFollowing);
    }
    if (communityTab === 'followers') {
      // Show simulated or real followers
      return friendsList.filter((f) => f.rank % 2 === 1 && !f.isCurrentUser);
    }
    return friendsList;
  }, [friendsList, communityTab]);

  return (
    <div className="min-h-screen pt-24 pb-20 px-3.5 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-7 text-white">
      {/* Hero Header */}
      <section className="relative rounded-[32px] sm:rounded-[40px] liquid-glass-dense border border-white/20 p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[110px] pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <TrophyIcon className="w-4 h-4" />
            <span>Pusat Komunitas & Ranking Zhafx</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Top Watch Leaderboard <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-white to-amber-400">
              & Teman Menonton Komunitas
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300/90 leading-relaxed max-w-2xl">
            Ikuti teman sesama pecinta film dan anime, pantau judul yang sedang mereka maraton, dan bersainglah di papan peringkat penonton teraktif di Zhafx!
          </p>

          {/* Main Segmented Switcher */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 rounded-2xl bg-white/[0.08] border border-white/15 backdrop-blur-xl">
              <button
                type="button"
                onClick={() => setActiveMainTab('ranking')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'ranking'
                    ? 'bg-white text-black shadow-lg scale-100'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <TrophyIcon className="w-4 h-4" />
                <span>🏆 Ranking Top Watch</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMainTab('community')}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeMainTab === 'community'
                    ? 'bg-white text-black shadow-lg scale-100'
                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <PeopleIcon className="w-4 h-4" />
                <span>👥 Teman & Komunitas</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TAB 1: RANKING TOP WATCH */}
      {activeMainTab === 'ranking' && (
        <section className="space-y-6">
          {/* Controls Bar: Mode & Time Period Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            {/* Watchers vs Titles */}
            <div className="inline-flex p-1 rounded-xl bg-white/[0.06] border border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRankingMode('watchers')}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rankingMode === 'watchers'
                    ? 'bg-white text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Leaderboard Penonton
              </button>
              <button
                type="button"
                onClick={() => setRankingMode('titles')}
                className={`px-4 py-1.5 rounded-lg transition-all cursor-pointer ${
                  rankingMode === 'titles'
                    ? 'bg-white text-black shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Top Tayangan Paling Banyak Ditonton
              </button>
            </div>

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[11px] text-zinc-400 mr-1 hidden xs:inline">Periode:</span>
              {[
                { id: 'all_time', label: 'Sepanjang Masa' },
                { id: 'monthly', label: 'Bulan Ini' },
                { id: 'weekly', label: 'Minggu Ini' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setRankingPeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-xs ${
                    rankingPeriod === p.id
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submode 1: Watchers Leaderboard */}
          {rankingMode === 'watchers' && (
            <div className="space-y-6">
              {/* Podium: Top 3 Watchers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
                {/* 2nd Place */}
                {leaderboardData.podium[1] && (
                  <div
                    onClick={() => setSelectedProfileUserId(leaderboardData.podium[1].userId)}
                    className="order-2 md:order-1 p-5 rounded-[28px] liquid-glass border border-white/20 text-center space-y-3 relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1.5 duration-300"
                  >
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-slate-300/20 text-slate-200 font-black text-xs flex items-center justify-center border border-slate-300/40">
                      #2
                    </div>
                    <div className="relative mx-auto w-20 h-20">
                      <img
                        src={leaderboardData.podium[1].avatar}
                        alt={leaderboardData.podium[1].name}
                        className="w-full h-full rounded-2xl object-cover border-2 border-slate-300 shadow-xl"
                      />
                      <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full bg-slate-300 text-black font-extrabold text-[10px] shadow">
                        🥈 PERAK
                      </div>
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-base text-white truncate">
                        {leaderboardData.podium[1].name}
                      </h3>
                      <p className="text-xs text-zinc-400">@{leaderboardData.podium[1].username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-semibold">
                        {leaderboardData.podium[1].badge}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs flex items-center justify-around">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Jam Nonton</span>
                        <span className="font-bold text-amber-300 text-sm">
                          {leaderboardData.podium[1].watchTimeHours} Jam
                        </span>
                      </div>
                      <div className="w-[1px] h-6 bg-white/10" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Tamat</span>
                        <span className="font-bold text-white text-sm">
                          {leaderboardData.podium[1].completedCount} Judul
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place - Golden Crown Podium */}
                {leaderboardData.podium[0] && (
                  <div
                    onClick={() => setSelectedProfileUserId(leaderboardData.podium[0].userId)}
                    className="order-1 md:order-2 p-6 sm:p-7 rounded-[32px] liquid-glass-dense border-2 border-amber-400/50 text-center space-y-3.5 relative overflow-hidden group cursor-pointer shadow-[0_0_40px_rgba(245,158,11,0.25)] transition-transform hover:-translate-y-2 duration-300 md:-mt-4"
                  >
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-amber-400 text-black font-black text-sm flex items-center justify-center shadow-lg">
                      #1
                    </div>
                    <div className="relative mx-auto w-24 h-24">
                      <img
                        src={leaderboardData.podium[0].avatar}
                        alt={leaderboardData.podium[0].name}
                        className="w-full h-full rounded-3xl object-cover border-4 border-amber-400 shadow-2xl"
                      />
                      <div className="absolute -top-3 inset-x-0 mx-auto w-max text-amber-300 animate-pulse text-xl">
                        👑
                      </div>
                      <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-3 py-0.5 rounded-full bg-amber-400 text-black font-black text-[11px] shadow-lg">
                        🥇 JUARA 1
                      </div>
                    </div>
                    <div className="pt-2">
                      <h3 className="font-black text-lg text-white truncate">
                        {leaderboardData.podium[0].name}
                      </h3>
                      <p className="text-xs text-zinc-400">@{leaderboardData.podium[0].username}</p>
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[11px] text-amber-300 font-bold">
                        <SparklesIcon className="w-3 h-3" />
                        <span>{leaderboardData.podium[0].badge}</span>
                      </span>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-around">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Jam Nonton</span>
                        <span className="font-extrabold text-amber-300 text-base">
                          {leaderboardData.podium[0].watchTimeHours} Jam
                        </span>
                      </div>
                      <div className="w-[1px] h-7 bg-white/10" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Tamat</span>
                        <span className="font-extrabold text-white text-base">
                          {leaderboardData.podium[0].completedCount} Judul
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboardData.podium[2] && (
                  <div
                    onClick={() => setSelectedProfileUserId(leaderboardData.podium[2].userId)}
                    className="order-3 p-5 rounded-[28px] liquid-glass border border-white/20 text-center space-y-3 relative overflow-hidden group cursor-pointer transition-transform hover:-translate-y-1.5 duration-300"
                  >
                    <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-amber-700/30 text-amber-400 font-black text-xs flex items-center justify-center border border-amber-700/50">
                      #3
                    </div>
                    <div className="relative mx-auto w-20 h-20">
                      <img
                        src={leaderboardData.podium[2].avatar}
                        alt={leaderboardData.podium[2].name}
                        className="w-full h-full rounded-2xl object-cover border-2 border-amber-700/70 shadow-xl"
                      />
                      <div className="absolute -bottom-2 inset-x-0 mx-auto w-max px-2 py-0.5 rounded-full bg-amber-700 text-white font-extrabold text-[10px] shadow">
                        🥉 PERUNGGU
                      </div>
                    </div>
                    <div className="pt-2">
                      <h3 className="font-bold text-base text-white truncate">
                        {leaderboardData.podium[2].name}
                      </h3>
                      <p className="text-xs text-zinc-400">@{leaderboardData.podium[2].username}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-zinc-300 font-semibold">
                        {leaderboardData.podium[2].badge}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs flex items-center justify-around">
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Jam Nonton</span>
                        <span className="font-bold text-amber-300 text-sm">
                          {leaderboardData.podium[2].watchTimeHours} Jam
                        </span>
                      </div>
                      <div className="w-[1px] h-6 bg-white/10" />
                      <div>
                        <span className="text-[10px] text-zinc-400 block">Tamat</span>
                        <span className="font-bold text-white text-sm">
                          {leaderboardData.podium[2].completedCount} Judul
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pinned Current User Card */}
              {leaderboardData.currentUserRank && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-400 text-black font-black text-sm flex items-center justify-center shrink-0">
                      #{leaderboardData.currentUserRank.rank}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>Peringkat Kamu: {leaderboardData.currentUserRank.name}</span>
                        <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-md font-semibold">
                          Aktif
                        </span>
                      </p>
                      <p className="text-zinc-400 text-[11px]">
                        Total menonton: <strong className="text-emerald-300">{leaderboardData.currentUserRank.watchTimeHours} Jam</strong> &bull;{' '}
                        {leaderboardData.currentUserRank.completedCount} Judul Selesai
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs self-start sm:self-auto cursor-pointer transition-colors"
                  >
                    Buka Dashboard
                  </button>
                </div>
              )}

              {/* Runners-Up Leaderboard List (Rank #4 - #50) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-2 text-xs text-zinc-400">
                  <span>Peringkat 4 - {Math.max(4, leaderboardData.runnersUp.length + 3)}</span>
                  <button
                    type="button"
                    onClick={loadLeaderboard}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Segarkan</span>
                  </button>
                </div>

                <div className="rounded-[28px] liquid-glass-dense border border-white/15 overflow-hidden divide-y divide-white/5">
                  {leaderboardData.runnersUp.map((u) => {
                    const isSelf = currentUser && currentUser.id === u.userId;
                    return (
                      <div
                        key={u.userId}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
                      >
                        <div
                          onClick={() => setSelectedProfileUserId(u.userId)}
                          className="flex items-center gap-3.5 min-w-0 cursor-pointer flex-1"
                        >
                          <span className="font-extrabold text-sm sm:text-base text-zinc-400 w-7 shrink-0 text-center">
                            #{u.rank}
                          </span>
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-white/20 shrink-0 bg-zinc-900"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-white truncate">
                                {u.name}
                              </span>
                              <span className="px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300 text-[10px] font-medium shrink-0">
                                {u.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">@{u.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-xs">
                          <div className="text-right hidden sm:block">
                            <span className="font-bold text-amber-300 block text-xs sm:text-sm">
                              {u.watchTimeHours} Jam
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {u.completedCount} tamat
                            </span>
                          </div>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleFollowToggle(u.userId, Boolean(u.isFollowing))}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                                u.isFollowing
                                  ? 'bg-white/10 hover:bg-rose-500/20 text-zinc-200 hover:text-rose-300 border border-white/15'
                                  : 'bg-white hover:bg-zinc-200 text-black font-bold shadow'
                              }`}
                            >
                              {u.isFollowing ? 'Mengikuti' : '+ Ikuti'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Submode 2: Top Watched Titles */}
          {rankingMode === 'titles' && (
            <div className="space-y-6">
              {/* Type Category Filter */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: '🔥 Semua Tayangan' },
                  { id: 'movie', label: '🎬 Film' },
                  { id: 'tv', label: '📺 Serial TV' },
                  { id: 'anime', label: '⚔️ Anime' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTitleTypeFilter(t.id as any)}
                    className={`px-4 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                      titleTypeFilter === t.id
                        ? 'bg-white text-black shadow-lg scale-100'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Ranked Titles Grid */}
              {isTitlesLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RotateCw className="w-8 h-8 animate-spin text-white/50" />
                  <p className="text-xs text-zinc-400">Memuat ranking tayangan...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topTitles.map((title) => (
                    <div
                      key={title.id}
                      className="p-3.5 sm:p-4 rounded-[26px] liquid-glass hover:bg-white/[0.10] border border-white/15 transition-all flex gap-3.5 sm:gap-4 items-center group relative overflow-hidden"
                    >
                      {/* Big Rank Number */}
                      <div className="w-9 sm:w-11 text-center shrink-0">
                        <span
                          className={`font-black text-2xl sm:text-3xl tracking-tighter ${
                            title.rank === 1
                              ? 'text-amber-400'
                              : title.rank === 2
                              ? 'text-slate-200'
                              : title.rank === 3
                              ? 'text-amber-600'
                              : 'text-zinc-500'
                          }`}
                        >
                          #{title.rank}
                        </span>
                      </div>

                      {/* Poster */}
                      <div
                        onClick={() => navigate(`/detail/${title.type}/${title.id}`)}
                        className="relative w-16 sm:w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/15 cursor-pointer shadow-md group-hover:scale-105 transition-transform duration-300"
                      >
                        <img
                          src={title.poster}
                          alt={title.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PlayIcon className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>

                      {/* Meta Information */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-zinc-300 uppercase">
                            {title.type}
                          </span>
                          <span className="text-[11px] text-zinc-400">{title.year}</span>
                          <div className="flex items-center gap-0.5 text-amber-300 text-xs font-bold ml-auto">
                            <StarIcon className="w-3 h-3 fill-amber-300" />
                            <span>{title.rating}</span>
                          </div>
                        </div>

                        <h3
                          onClick={() => navigate(`/detail/${title.type}/${title.id}`)}
                          className="font-bold text-sm sm:text-base text-white group-hover:text-amber-300 transition-colors truncate cursor-pointer"
                        >
                          {title.title}
                        </h3>

                        {/* Live and Views Stat */}
                        <div className="flex items-center gap-3 text-xs text-zinc-400 pt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            {title.liveWatchers.toLocaleString()} sedang nonton
                          </span>
                          <span className="text-zinc-500">&bull;</span>
                          <span className="text-[11px] text-zinc-300">
                            {title.viewsCount.toLocaleString()} total putar
                          </span>
                        </div>

                        {/* Quick Action Button */}
                        <div className="pt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/watch/${title.type}/${title.id}`)}
                            className="px-3 py-1 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
                          >
                            <PlayIcon className="w-3 h-3 fill-black" />
                            <span>Tonton</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/detail/${title.type}/${title.id}`)}
                            className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-colors"
                          >
                            Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: TEMAN & KOMUNITAS */}
      {activeMainTab === 'community' && (
        <section className="space-y-6">
          {/* Sub-navigation & Search Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 sm:p-4 rounded-2xl bg-white/[0.03] border border-white/10">
            {/* Sub-tab pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              {[
                { id: 'explore', label: `Jelajahi Teman (${friendsList.length})` },
                { id: 'following', label: `Mengikuti (${friendsList.filter((f) => f.isFollowing).length})` },
                { id: 'followers', label: 'Pengikut' },
                { id: 'feed', label: `Aktivitas Langsung (${activities.length})` },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCommunityTab(st.id as any)}
                  className={`px-3.5 py-2 rounded-xl font-bold cursor-pointer transition-all shrink-0 ${
                    communityTab === st.id
                      ? 'bg-white text-black shadow-md'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Search Input (For friends list tabs) */}
            {communityTab !== 'feed' && (
              <div className="relative w-full md:w-72">
                <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari teman di Zhafx..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/30 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* View 1: Friends Cards Grid (Explore / Following / Followers) */}
          {communityTab !== 'feed' && (
            <div>
              {isFriendsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RotateCw className="w-8 h-8 animate-spin text-white/50" />
                  <p className="text-xs text-zinc-400">Memuat teman komunitas...</p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-16 text-center text-xs text-zinc-400 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
                  <PeopleIcon className="w-8 h-8 text-zinc-600 mx-auto mb-1" />
                  <p className="font-semibold text-zinc-300">Tidak ada teman yang cocok</p>
                  <p className="text-[11px] text-zinc-500">
                    {communityTab === 'following'
                      ? 'Kamu belum mengikuti siapa pun. Jelajahi teman untuk mulai mengikuti!'
                      : 'Coba ubah kata kunci pencarianmu.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="p-5 rounded-[28px] liquid-glass hover:bg-white/[0.08] border border-white/15 transition-all space-y-4 group relative"
                    >
                      {/* Top User Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div
                          onClick={() => setSelectedProfileUserId(friend.id)}
                          className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        >
                          <div className="relative">
                            <img
                              src={friend.avatar}
                              alt={friend.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-white/20 shadow-md bg-zinc-900 group-hover:scale-105 transition-transform"
                            />
                            {friend.rank <= 3 && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center justify-center shadow">
                                #{friend.rank}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="font-bold text-sm text-white truncate group-hover:text-amber-300 transition-colors">
                                {friend.name}
                              </h4>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate">@{friend.username}</p>
                          </div>
                        </div>

                        {!friend.isCurrentUser && (
                          <button
                            type="button"
                            onClick={() => handleFollowToggle(friend.id, friend.isFollowing)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 ${
                              friend.isFollowing
                                ? 'bg-white/10 hover:bg-rose-500/20 text-zinc-200 hover:text-rose-300 border border-white/15'
                                : 'bg-white hover:bg-zinc-200 text-black shadow hover:scale-105 active:scale-95'
                            }`}
                          >
                            {friend.isFollowing ? 'Mengikuti' : '+ Ikuti'}
                          </button>
                        )}
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                        {friend.bio}
                      </p>

                      {/* Status Sedang Ditonton Pill */}
                      {friend.currentWatching ? (
                        <div
                          onClick={() => navigate(`/detail/${friend.currentWatching!.type}/${friend.currentWatching!.title}`)}
                          className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-white/[0.06] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FlameIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-[11px] font-semibold text-zinc-200 truncate">
                              {friend.currentWatching.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-400 font-bold shrink-0">
                            Sedang Nonton
                          </span>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-zinc-500">
                          <span className="text-[11px]">Badge: {friend.badge}</span>
                          <span className="text-[11px] font-semibold text-zinc-400">
                            {friend.watchTimeHours} Jam
                          </span>
                        </div>
                      )}

                      {/* Followers and Stats */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-400">
                        <span>
                          <strong className="text-white">{friend.followersCount}</strong> Pengikut
                        </span>
                        <span>
                          <strong className="text-white">{friend.completedCount}</strong> Judul Tamat
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedProfileUserId(friend.id)}
                          className="text-sky-400 hover:underline cursor-pointer"
                        >
                          Lihat Profil &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View 2: Live Activity Feed */}
          {communityTab === 'feed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-zinc-400">
                <span>Update Menonton Komunitas Real-Time</span>
                <button
                  type="button"
                  onClick={loadActivities}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Perbarui Feed</span>
                </button>
              </div>

              {isActivitiesLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <RotateCw className="w-8 h-8 animate-spin text-white/50" />
                  <p className="text-xs text-zinc-400">Memuat aktivitas teman...</p>
                </div>
              ) : (
                <div className="rounded-[32px] liquid-glass-dense border border-white/15 divide-y divide-white/5 overflow-hidden">
                  {activities.map((act) => (
                    <div
                      key={act.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={act.userAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(act.userName)}`}
                          alt={act.userName}
                          onClick={() => setSelectedProfileUserId(act.userId)}
                          className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0 cursor-pointer hover:scale-105 transition-transform bg-zinc-900"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-zinc-200">
                            <strong
                              onClick={() => setSelectedProfileUserId(act.userId)}
                              className="text-white hover:underline cursor-pointer"
                            >
                              {act.userName}
                            </strong>{' '}
                            {act.action === 'completed' ? (
                              <span className="text-emerald-300">
                                baru saja menyelesaikan{' '}
                                {act.season && act.episode
                                  ? `Musim ${act.season} Episode ${act.episode} dari `
                                  : ''}
                              </span>
                            ) : act.action === 'rated' ? (
                              <span className="text-amber-300">
                                memberi rating ★ {act.rating || 5} untuk{' '}
                              </span>
                            ) : act.action === 'added_list' ? (
                              <span className="text-sky-300">menambahkan ke Daftar Tontonan: </span>
                            ) : (
                              <span className="text-zinc-300">sedang menonton </span>
                            )}
                            <strong
                              onClick={() => navigate(`/detail/${act.mediaType}/${act.mediaId}`)}
                              className="text-white hover:text-amber-300 transition-colors cursor-pointer"
                            >
                              {act.mediaTitle}
                            </strong>
                          </p>

                          <p className="text-[10px] text-zinc-500 mt-0.5">
                            {new Date(act.timestamp).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                        {act.poster && (
                          <img
                            src={act.poster}
                            alt={act.mediaTitle}
                            className="w-8 h-11 rounded-md object-cover border border-white/10 shrink-0"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/watch/${act.mediaType}/${act.mediaId}`)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white text-white hover:text-black font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <PlayIcon className="w-3 h-3 fill-current" />
                          <span>Tonton</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* User Profile Detail Modal */}
      <UserProfileModal
        userId={selectedProfileUserId}
        isOpen={Boolean(selectedProfileUserId)}
        onClose={() => setSelectedProfileUserId(null)}
        onOpenAuth={() => navigate('/login')}
      />
    </div>
  );
};
