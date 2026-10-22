import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  IoPlay as Play,
  IoBookmarkOutline as Bookmark,
  IoBookmark as BookmarkCheck,
  IoShareSocialOutline as Share2,
  IoSparkles as Sparkles,
  IoStar as Star,
  IoTimeOutline as Clock,
  IoCalendarOutline as Calendar,
  IoReloadOutline as RotateCcw,
  IoWarningOutline as AlertTriangle,
  IoChevronDownOutline as ChevronDown,
  IoCheckmarkCircleOutline as CheckCircle2,
  IoFilmOutline as Film,
  IoVideocamOutline as Video,
  IoPeopleOutline as Users,
  IoMicOutline as Mic,
  IoCloseOutline as X,
  IoChatbubbleEllipsesOutline as MessageCircle,
  IoSendOutline as Send,
  IoTrashOutline as Trash2,
  IoPersonOutline as UserIcon,
  IoLogInOutline as LogIn,
  IoCheckmarkCircle as CheckCircle,
  IoShieldCheckmark as ShieldCheck,
} from 'react-icons/io5';
import { api } from '../services/api';
import { Title, Episode, MediaType, CastMember, VideoTrailer } from '../types';
import { DetailSkeleton } from '../components/Skeleton';
import { MediaRow } from '../components/MediaRow';
import { SEOHead } from '../components/SEOHead';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { storage } from '../lib/storage';
import { translateToIndonesian, isIndonesian } from '../lib/translator';

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Baru saja';
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'Baru saja';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} minggu lalu`;
  const date = new Date(timestamp);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getAvatarGradient(name: string): string {
  const gradients = [
    'from-rose-500 to-orange-500',
    'from-violet-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-amber-500 to-yellow-500',
    'from-fuchsia-500 to-pink-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

const RATING_LABELS: Record<number, string> = {
  1: '1 Bintang (Buruk)',
  2: '2 Bintang (Kurang)',
  3: '3 Bintang (Cukup)',
  4: '4 Bintang (Bagus)',
  5: '5 Bintang (Sangat Bagus!)',
};

interface DetailPageProps {
  onOpenAIWithContext: (title: Title) => void;
  onOpenAuth?: () => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({ onOpenAIWithContext, onOpenAuth }) => {
  const { type: rawType, id } = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();

  const mediaType: MediaType =
    rawType === 'tv' || rawType === 'anime' || rawType === 'movie' ? rawType : 'movie';

  const [title, setTitle] = useState<Title | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synopsis expansion
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  // Seasons & Episodes state for TV/Anime
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  // Trailer modal state
  const [activeTrailer, setActiveTrailer] = useState<VideoTrailer | null>(null);

  // Share feedback toast
  const [showShareToast, setShowShareToast] = useState(false);
  const [comments, setComments] = useState<Array<{
    id: string;
    userName: string;
    text?: string;
    rating?: number;
    createdAt: number;
    userId?: string;
    isVerified?: boolean;
  }>>([]);
  const [commentText, setCommentText] = useState('');
  const [guestName, setGuestName] = useState('');
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'rating'>('newest');
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(storage.getUser()));

  const ratedComments = comments.filter((c) => typeof c.rating === 'number' && c.rating > 0);
  const avgRating = ratedComments.length > 0
    ? (ratedComments.reduce((acc, c) => acc + (c.rating || 0), 0) / ratedComments.length).toFixed(1)
    : null;

  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const history = storage.getHistory();

  const loadDetails = async (signal?: AbortSignal) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDetails(id, mediaType, signal);
      setTitle(data);
      if (data.backdrop || data.poster) {
        setActiveMedia(data.backdrop || data.poster, data.title);
      }
      if (data.overview && !isIndonesian(data.overview)) {
        translateToIndonesian(data.overview, data.title).then((trans) => {
          if (trans && trans !== data.overview) {
            setTitle((prev) => (prev ? { ...prev, overview: trans } : null));
          }
        });
      }
      if (data.seasons && data.seasons.length > 0) {
        // Prioritize Season 1 over Season 0 (Specials)
        const s1 = data.seasons.find((s) => s.number === 1);
        setSelectedSeason(s1 ? s1.number : data.seasons[0].number);
      }
      if (data.episodes && data.episodes.length > 0) {
        setEpisodes(data.episodes);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Gagal memuat detail tayangan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDetails(controller.signal);
    return () => controller.abort();
  }, [id, mediaType]);

  useEffect(() => {
    const syncAuthState = () => setIsLoggedIn(Boolean(storage.getUser()));
    window.addEventListener('zhafx_auth_change', syncAuthState);
    window.addEventListener('storage', syncAuthState);
    return () => {
      window.removeEventListener('zhafx_auth_change', syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const cacheKey = `zhafx_comments_${id}`;

    // Load locally cached comments immediately if available
    try {
      const local = localStorage.getItem(cacheKey);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setComments(parsed);
        }
      }
    } catch {
      // Ignore cache read errors
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`/api/comments?contentId=${encodeURIComponent(id)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        clearTimeout(timeoutId);
        const text = await response.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          // Response was HTML error or non-JSON text
          return;
        }
        if (response.ok && data && Array.isArray(data.comments)) {
          setComments((prev) => {
            const map = new Map<string, any>();
            data.comments.forEach((c: any) => c && c.id && map.set(c.id, c));
            prev.forEach((c) => c && c.id && map.set(c.id, c));
            const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            try {
              localStorage.setItem(cacheKey, JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {
        clearTimeout(timeoutId);
        // Silent fallback to avoid alarming users when comments are empty
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [id]);

  const submitComment = async () => {
    if (!commentText.trim() && !selectedRating) {
      setCommentError('Tulis komentar atau pilih bintang rating terlebih dahulu.');
      return;
    }

    const user = storage.getUser();
    let guestId = '';
    try {
      guestId = localStorage.getItem('zhafx_guest_id') || '';
      if (!guestId) {
        guestId = `usr_guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem('zhafx_guest_id', guestId);
      }
    } catch {
      guestId = `usr_guest_${Date.now()}`;
    }

    const effectiveUserId = user?.id || guestId;
    const effectiveUserName = (user?.name || (user?.email ? user.email.split('@')[0] : null) || guestName.trim() || 'Penonton');

    setIsSubmittingComment(true);
    setCommentError(null);
    setCommentSuccess(null);

    const localComment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userName: effectiveUserName,
      userId: effectiveUserId,
      text: commentText.trim() || undefined,
      rating: selectedRating || undefined,
      createdAt: Date.now(),
      isVerified: Boolean(user),
    };

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${storage.getToken() || ''}`,
        },
        body: JSON.stringify({
          contentId: id,
          mediaType,
          text: commentText.trim(),
          rating: selectedRating || undefined,
          userId: effectiveUserId,
          userName: effectiveUserName,
        }),
      });

      const text = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (response.ok && data?.comment) {
        setComments((current) => {
          const updated = [data.comment, ...current.filter((c) => c.id !== localComment.id)];
          try {
            if (id) localStorage.setItem(`zhafx_comments_${id}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setCommentText('');
        setSelectedRating(0);
        setHoverRating(0);
        setCommentSuccess('Ulasan dan rating kamu berhasil dikirim!');
        setTimeout(() => setCommentSuccess(null), 4000);
      } else {
        // Fallback: save local comment if server returned error or offline
        setComments((current) => {
          const updated = [localComment, ...current];
          try {
            if (id) localStorage.setItem(`zhafx_comments_${id}`, JSON.stringify(updated));
          } catch {}
          return updated;
        });
        setCommentText('');
        setSelectedRating(0);
        setHoverRating(0);
        setCommentSuccess('Ulasan kamu berhasil disimpan!');
        setTimeout(() => setCommentSuccess(null), 4000);
      }
    } catch {
      // Network failure / offline: keep user's comment locally
      setComments((current) => {
        const updated = [localComment, ...current];
        try {
          if (id) localStorage.setItem(`zhafx_comments_${id}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setCommentText('');
      setSelectedRating(0);
      setHoverRating(0);
      setCommentSuccess('Ulasan disimpan di perangkat kamu!');
      setTimeout(() => setCommentSuccess(null), 4000);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!window.confirm('Yakin ingin menghapus komentar ini?')) return;
    setDeletingId(commentId);
    const user = storage.getUser();
    let guestId = '';
    try {
      guestId = localStorage.getItem('zhafx_guest_id') || '';
    } catch {}
    const effectiveUserId = user?.id || guestId;

    try {
      await fetch(`/api/comments/${encodeURIComponent(commentId)}?userId=${encodeURIComponent(effectiveUserId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${storage.getToken() || ''}`,
        },
      });
    } catch {
      // continue local cleanup
    }

    setComments((current) => {
      const updated = current.filter((c) => c.id !== commentId);
      try {
        if (id) localStorage.setItem(`zhafx_comments_${id}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setDeletingId(null);
  };

  // Load episodes when season changes for TV series
  useEffect(() => {
    if (!id || mediaType !== 'tv') return;
    const controller = new AbortController();
    setIsLoadingEpisodes(true);

    api
      .getSeasonEpisodes(id, selectedSeason, controller.signal)
      .then((eps) => {
        setEpisodes(eps);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[Season Episodes] Failed to load:', err);
        }
      })
      .finally(() => {
        setIsLoadingEpisodes(false);
      });

    return () => controller.abort();
  }, [id, selectedSeason, mediaType]);

  // Load episodes with thumbnails for Anime series
  useEffect(() => {
    if (!id || mediaType !== 'anime') return;
    const controller = new AbortController();
    setIsLoadingEpisodes(true);

    api
      .getAnimeEpisodes(id, controller.signal)
      .then((eps) => {
        setEpisodes(eps);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('[Anime Episodes] Failed to load:', err);
        }
      })
      .finally(() => {
        setIsLoadingEpisodes(false);
      });

    return () => controller.abort();
  }, [id, mediaType]);

  const handleShare = async () => {
    if (!title) return;
    const shareData = {
      title: `${title.title} di Zhafx`,
      text: `Nonton ${title.title} (${title.year}) di Zhafx:`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Share dismissed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    }
  };

  // Check if an episode was previously watched in history
  const isEpisodeWatched = (seasonNum: number, epNum: number) => {
    return history.some(
      (h) => h.id === id && h.season === seasonNum && h.episode === epNum
    );
  };

  // 1. Loading State
  if (isLoading) {
    return <DetailSkeleton />;
  }

  // 2. Error State
  if (error || !title) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/30 text-[#FF5C6C] flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-[#F2F4FB] mb-2">Gagal Menampilkan Detail Tayangan</h2>
        <p className="text-xs sm:text-sm text-[#98A2C3] max-w-md mb-6 leading-relaxed">
          {error || 'Tayangan yang Anda cari tidak ditemukan.'}
        </p>
        <button
          onClick={() => loadDetails()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Coba lagi
        </button>
      </div>
    );
  }

  const inWatchlist = isSaved(title.id);
  const typeLabel = title.type === 'anime' ? 'Anime' : title.type === 'tv' ? 'Serial TV' : 'Film';
  const availableTrailers = title.trailers || title.videos || [];
  const primaryTrailer = availableTrailers.find((t) => t.site === 'YouTube' || Boolean(t.key)) || availableTrailers[0];

  const lastHistory = history.find((h) => h.id === title.id);
  const resumeSeason =
    lastHistory?.season ??
    (title.seasons?.find((s) => s.number === 1)?.number ?? title.seasons?.[0]?.number ?? 1);
  const resumeEpisode = lastHistory?.episode ?? 1;
  const hasHistory = Boolean(lastHistory && (lastHistory.season || lastHistory.episode));

  const playTargetUrl =
    title.type === 'anime'
      ? `/watch/anime/${title.id}/1/${resumeEpisode}`
      : title.type === 'tv'
      ? `/watch/tv/${title.id}/${resumeSeason}/${resumeEpisode}`
      : `/watch/movie/${title.id}`;

  return (
    <div className="min-h-screen pb-20 space-y-12">
      <SEOHead
        title={title.title}
        description={title.overview || `Nonton ${title.title} (${title.year}) di Zhafx dengan kualitas sinematik dan rekomendasi cerdas AI.`}
        canonicalPath={`/detail/${mediaType}/${id}`}
        ogType="video.movie"
      />
      {/* Toast Notification */}
      {showShareToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/20 text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-modal-card transform-gpu">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Tautan tayangan berhasil disalin!
        </div>
      )}

      {/* Video Trailer Modal */}
      {activeTrailer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl animate-modal-backdrop"
            onClick={() => setActiveTrailer(null)}
          />
          <div className="relative w-full max-w-3xl aspect-video rounded-[24px] overflow-hidden bg-black border border-white/20 shadow-2xl z-10 animate-modal-card transform-gpu">
            <button
              onClick={() => setActiveTrailer(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <iframe
              src={`https://www.youtube.com/embed/${activeTrailer.key}?autoplay=1&rel=0`}
              title={activeTrailer.name || 'Trailer'}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              className="w-full h-full border-0"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Top Blurred Backdrop Atmos */}
      <div className="relative w-full h-[50vh] sm:h-[60vh] min-h-[360px] max-h-[600px] overflow-hidden">
        {!backdropError && (title.backdrop || title.poster) ? (
          <img
            src={title.backdrop || title.poster}
            alt={title.title}
            onError={() => setBackdropError(true)}
            className="w-full h-full object-cover object-top opacity-60 filter blur-sm scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-[#181C2E] to-[#06070B]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070B] via-[#06070B]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070B]/90 via-transparent to-[#06070B]/90" />
      </div>

      {/* Main Metadata Container - Apple iOS Liquid Glass Sheet */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 -mt-40 sm:-mt-52 relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
        {/* Full-bleed 20px Poster (Clickable to start watching) */}
        <div
          onClick={() => navigate(playTargetUrl)}
          title="Putar sekarang"
          aria-label={`Putar ${title.title}`}
          className="w-48 sm:w-60 md:w-64 aspect-[2/3] shrink-0 rounded-[20px] overflow-hidden bg-[#0E1017] shadow-[0_20px_50px_rgba(0,0,0,0.85)] mx-auto md:mx-0 border border-white/10 flex items-center justify-center relative group cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
        >
          {!posterError && title.poster ? (
            <img
              src={title.poster}
              alt={title.title}
              onError={() => setPosterError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#0E1017]">
              <Film className="w-12 h-12 text-white/30 mb-2" />
              <span className="text-sm font-semibold text-white/50">{title.title}</span>
            </div>
          )}

          {/* Hover Play Button Overlay */}
          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-full bg-white text-[#06070B] flex items-center justify-center shadow-xl transform group-hover:scale-110 transition-transform ios-spring">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="text-xs font-bold text-white bg-black/75 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              Putar Sekarang
            </span>
          </div>
        </div>

        {/* Floating Liquid Glass Info Panel */}
        <div className="flex-1 w-full rounded-[28px] sm:rounded-[36px] liquid-glass liquid-specular p-5 sm:p-8 shadow-2xl space-y-5 text-center md:text-left">
          {/* Metadata Badges */}
          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full liquid-glass text-white/90 text-xs font-semibold uppercase tracking-wider">
              {typeLabel}
            </span>
            {title.rating && parseFloat(title.rating) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass text-white text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{title.rating}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-white/70 px-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>{title.year}</span>
            </span>
            {title.runtime && (
              <span className="inline-flex items-center gap-1 text-xs text-white/70 px-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{title.runtime} mnt</span>
              </span>
            )}
            {title.status && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.08] text-[11px] text-white/70 font-medium">
                {title.status}
              </span>
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-[-0.03em] leading-tight">
              {title.title}
            </h1>
            {title.tagline && (
              <p className="text-xs sm:text-sm text-white/50 italic mt-1 font-medium">
                "{title.tagline}"
              </p>
            )}
          </div>

          {/* Genre Chips */}
          {title.genres && title.genres.length > 0 && (
            <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
              {title.genres.map((g, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-white/80 font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <div className="space-y-1.5 max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Sinopsis
            </h2>
            <p
              className={`text-xs sm:text-sm text-white/85 leading-relaxed ${
                !isOverviewExpanded ? 'line-clamp-3' : ''
              }`}
            >
              {title.overview || 'Sinopsis belum tersedia untuk tayangan ini.'}
            </p>
            {title.overview && title.overview.length > 180 && (
              <button
                onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                className="text-xs text-white hover:underline font-semibold cursor-pointer pt-0.5 ios-spring"
              >
                {isOverviewExpanded ? 'Sembunyikan' : 'Baca selengkapnya'}
              </button>
            )}
          </div>

          {/* Liquid Glass Action Pills with Fixed Responsive Button Positions */}
          <div className="flex items-center justify-center md:justify-start gap-2 sm:gap-3 pt-2 flex-wrap">
            {/* Play / Continue Watching Button */}
            {(() => {
              const lastHistory = history.find((h) => h.id === title.id);
              const resumeSeason = lastHistory?.season ?? (title.seasons?.[0]?.number ?? 1);
              const resumeEpisode = lastHistory?.episode ?? 1;
              const savedProg = storage.getProgress(
                title.id,
                title.type === 'tv' ? resumeSeason : undefined,
                title.type === 'tv' || title.type === 'anime' ? resumeEpisode : undefined
              );

              const curTime = savedProg?.currentTime || lastHistory?.currentTime || 0;
              const hasSavedTime = curTime > 5 && !savedProg?.completed;
              const formattedTime = hasSavedTime
                ? `${Math.floor(curTime / 60)}:${Math.floor(curTime % 60) < 10 ? '0' : ''}${Math.floor(curTime % 60)}`
                : '';

              const playTargetUrl =
                title.type === 'anime'
                  ? `/watch/anime/${title.id}/1/${resumeEpisode}`
                  : title.type === 'tv'
                  ? `/watch/tv/${title.id}/${resumeSeason}/${resumeEpisode}`
                  : `/watch/movie/${title.id}`;

              return (
                <button
                  onClick={() => navigate(playTargetUrl)}
                  className="inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-white text-[#06070B] font-bold text-xs sm:text-sm shadow-[0_8px_25px_rgba(255,255,255,0.25)] hover:bg-zinc-200 hover:text-[#06070B] transition-all ios-spring cursor-pointer min-h-[44px]"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>
                    {hasSavedTime
                      ? title.type === 'tv' || title.type === 'anime'
                        ? `Lanjutkan Ep ${resumeEpisode} (${formattedTime})`
                        : `Lanjutkan (${formattedTime})`
                      : lastHistory && (title.type === 'tv' || title.type === 'anime')
                      ? `Lanjutkan (Ep ${resumeEpisode})`
                      : 'Putar sekarang'}
                  </span>
                </button>
              );
            })()}

            {/* Video Trailer Button (FrameX Feature) */}
            {primaryTrailer && (
              <button
                onClick={() => setActiveTrailer(primaryTrailer)}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-full liquid-glass liquid-specular text-xs sm:text-sm font-semibold text-white hover:bg-white/[0.16] transition-all cursor-pointer min-h-[44px] ios-spring"
                title="Tonton Cuplikan Trailer"
              >
                <Video className="w-4 h-4 text-white" />
                <span>Trailer</span>
              </button>
            )}

            {/* Add to My List Pill */}
            <button
              onClick={() => {
                toggle({
                  id: title.id,
                  type: title.type,
                  title: title.title,
                  poster: title.poster,
                  backdrop: title.backdrop,
                  year: title.year,
                  rating: title.rating,
                });
              }}
              className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 rounded-full liquid-glass liquid-specular text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] ios-spring ${
                inWatchlist ? 'text-white bg-white/[0.22] font-bold shadow-md' : 'text-white hover:bg-white/[0.14]'
              }`}
            >
              {inWatchlist ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-white" />
                  <span>Tersimpan</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  <span>Daftar Saya</span>
                </>
              )}
            </button>

            {/* Share Pill */}
            <button
              onClick={handleShare}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-3 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[44px] ios-spring"
              title="Bagikan tautan film"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>

            {/* Tanya AI Pill */}
            <button
              onClick={() => onOpenAIWithContext(title)}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-3 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[44px] ios-spring"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span className="hidden sm:inline">Tanya AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* CAST & CREW SECTION (Film, Anime, and TV) */}
      {title.cast && title.cast.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Pemeran & Karakter
                </h2>
                <p className="text-xs text-white/50">
                  {title.type === 'anime'
                    ? 'Karakter utama & Seiyuu (Pengisi Suara Jepang)'
                    : 'Aktor & pemeran utama tayangan ini'}
                </p>
              </div>
            </div>
          </div>

          {/* Cast Cards Horizontal Scroll Carousel */}
          <div className="flex items-stretch gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none scroll-smooth">
            {title.cast.map((c, idx) => (
              <div
                key={c.id || idx}
                className="w-32 sm:w-36 shrink-0 rounded-[22px] liquid-glass p-3 flex flex-col items-center text-center space-y-2 border border-white/10 hover:border-white/20 transition-all group ios-spring"
              >
                {/* Profile Photo */}
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-white/10 border-2 border-white/15 relative shrink-0 shadow-md">
                  {c.profile || c.profilePath ? (
                    <img
                      src={c.profile || c.profilePath}
                      alt={c.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white/40 text-lg">
                      {c.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="w-full min-w-0">
                  <h4 className="text-xs font-bold text-white line-clamp-1 leading-tight">
                    {c.name}
                  </h4>
                  {c.character && (
                    <p className="text-[11px] text-white/80 line-clamp-1 font-medium mt-0.5">
                      {c.character}
                    </p>
                  )}
                  {c.voiceActor && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-white/50 mt-1 line-clamp-1">
                      <Mic className="w-2.5 h-2.5 text-white/40 shrink-0" />
                      <span className="truncate">{c.voiceActor}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SERIES EPISODES WITH THUMBNAILS (For TV Series) */}
      {mediaType === 'tv' && title.seasons && title.seasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Daftar Episode
              </h2>
              <p className="text-xs text-white/50">Pilih episode untuk langsung diputar</p>
            </div>

            {/* Season Pill Buttons */}
            {title.seasons.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {title.seasons.map((s) => (
                  <button
                    key={s.number}
                    onClick={() => setSelectedSeason(s.number)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ios-spring cursor-pointer ${
                      selectedSeason === s.number
                        ? 'bg-white text-[#06070B] shadow-sm font-bold'
                        : 'liquid-glass text-white/70 hover:text-white'
                    }`}
                  >
                    {s.name || `Musim ${s.number}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episodes Grid with 16:9 Stills / Thumbnails */}
          {isLoadingEpisodes ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-[22px] bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : episodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {episodes.map((ep) => {
                const watched = isEpisodeWatched(selectedSeason, ep.number);
                const thumbImage = ep.still || ep.stillPath || title.backdrop || title.poster;

                return (
                  <button
                    key={ep.number}
                    onClick={() =>
                      navigate(`/watch/tv/${title.id}/${selectedSeason}/${ep.number}`)
                    }
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-[22px] bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-left transition-all active:scale-[0.98] cursor-pointer group relative overflow-hidden ios-spring shadow-md"
                  >
                    {/* Episode Thumbnail 16:9 */}
                    <div className="relative w-full sm:w-36 aspect-video shrink-0 rounded-[14px] overflow-hidden bg-black/40 border border-white/10">
                      <img
                        src={thumbImage}
                        alt={ep.name || `Episode ${ep.number}`}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = title.backdrop || title.poster;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Episode Badge overlay */}
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
                        Ep {ep.number}
                      </div>
                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Episode Info */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-white/80 transition-colors line-clamp-1">
                          {ep.name || `Episode ${ep.number}`}
                        </h4>
                        {watched && (
                          <span
                            title="Sudah ditonton"
                            className="text-emerald-400 shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      {ep.airDate && (
                        <p className="text-[10px] text-white/50 mt-0.5">
                          Rilis: {ep.airDate}
                        </p>
                      )}

                      {ep.overview && (
                        <p className="text-[11px] text-white/65 line-clamp-2 mt-1 leading-snug">
                          {ep.overview}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-8 rounded-[24px] liquid-glass text-center text-xs text-white/60 space-y-2">
              <p>Memuat daftar episode langsung di pemutar...</p>
              <button
                onClick={() => navigate(`/watch/tv/${title.id}/${selectedSeason}/1`)}
                className="px-5 py-2 rounded-full bg-white text-black font-bold text-xs inline-block hover:bg-zinc-200 cursor-pointer"
              >
                Putar Musim {selectedSeason} Episode 1
              </button>
            </div>
          )}
        </div>
      )}

      {/* ANIME EPISODES WITH THUMBNAIL (For Anime Series) */}
      {mediaType === 'anime' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Daftar Episode
              </h2>
              <p className="text-xs text-white/50">
                Total {episodes.length > 0 ? episodes.length : (title.numberOfEpisodes || 24)} episode siap diputar dengan sub & dub
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {(episodes.length > 0
              ? episodes
              : Array.from({ length: Math.min(title.numberOfEpisodes || 24, 48) }, (_, i) => ({
                  number: i + 1,
                  name: `Episode ${i + 1}`,
                  still: title.backdrop || title.poster,
                  stillPath: title.backdrop || title.poster,
                } as Episode))
            ).map((ep) => {
              const watched = isEpisodeWatched(1, ep.number);
              const thumbImage = ep.still || ep.stillPath || title.backdrop || title.poster;

              return (
                <button
                  key={ep.number}
                  onClick={() => navigate(`/watch/anime/${title.id}/1/${ep.number}`)}
                  className={`p-3 rounded-[20px] text-left transition-all cursor-pointer relative overflow-hidden ios-spring group flex flex-col gap-2.5 ${
                    watched
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-white/90'
                  }`}
                >
                  {/* Thumbnail 16:9 */}
                  <div className="relative w-full aspect-video rounded-[14px] overflow-hidden bg-black/40 border border-white/10">
                    <img
                      src={thumbImage}
                      alt={ep.name || `Episode ${ep.number}`}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = title.backdrop || title.poster;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
                      Ep {ep.number}
                    </div>
                    {/* Play Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                    </div>
                    {watched && (
                      <div className="absolute bottom-2 right-2 text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-white/80 transition-colors truncate">
                      {ep.name || `Episode ${ep.number}`}
                    </h4>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      Klik untuk putar langsung
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Comments & Ratings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-6 pt-4" aria-labelledby="comments-heading">
        {/* Header & Community Rating Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 shadow-md">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="comments-heading" className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Komentar & Rating
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[11px] font-semibold text-white/80">
                  {comments.length}
                </span>
              </div>
              <p className="text-xs text-white/50">
                Bagikan ulasan dan penilaian kamu untuk tayangan ini
              </p>
            </div>
          </div>

          {/* Average Rating Score Card */}
          {avgRating && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.05] border border-white/15 backdrop-blur-md self-start sm:self-auto">
              <div className="flex items-center gap-1.5 text-amber-300">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-lg font-bold text-white">{avgRating}</span>
                <span className="text-xs text-white/50">/ 5</span>
              </div>
              <div className="h-6 w-[1px] bg-white/15" />
              <div className="text-[11px] text-white/70">
                <p className="font-semibold text-white">{ratedComments.length} Penilai</p>
                <p className="text-[10px] text-white/50">Skor Komunitas</p>
              </div>
            </div>
          )}
        </div>

        {/* Comment Input Card */}
        <div className="rounded-[24px] liquid-glass p-5 sm:p-6 space-y-4 border border-white/15 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Star Rating Picker */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white/80">Beri Rating:</span>
                <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = (hoverRating || selectedRating) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSelectedRating(selectedRating === value ? 0 : value)}
                        onMouseEnter={() => setHoverRating(value)}
                        aria-label={`${value} bintang`}
                        className="p-1 cursor-pointer transition-transform duration-150 hover:scale-125 focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors duration-150 ${
                            active ? 'text-amber-300 fill-current drop-shadow-[0_0_8px_rgba(252,211,77,0.5)]' : 'text-white/25 hover:text-white/50'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {(hoverRating || selectedRating) > 0 && (
                  <span className="text-xs font-medium text-amber-300 animate-in fade-in duration-200">
                    {RATING_LABELS[hoverRating || selectedRating]}
                  </span>
                )}
                {selectedRating > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRating(0);
                      setHoverRating(0);
                    }}
                    className="text-[10px] text-white/40 hover:text-white/70 underline ml-1 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* User Identity Chip / Login Prompt */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.08] border border-white/15 self-start sm:self-auto text-xs text-white/90">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Masuk sebagai <strong className="text-white">{storage.getUser()?.name || storage.getUser()?.email}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => (onOpenAuth ? onOpenAuth() : navigate('/login'))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Masuk Akun</span>
                </button>
                <span className="text-[11px] text-white/40">atau berkomentar langsung</span>
              </div>
            )}
          </div>

          {/* Guest Name Field (if not logged in) */}
          {!isLoggedIn && (
            <div className="pt-1">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={40}
                placeholder="Nama kamu (opsional, bawaan: Penonton)..."
                className="w-full sm:w-72 rounded-xl bg-black/30 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-white/35 focus:outline-none focus:border-white/30"
              />
            </div>
          )}

          {/* Comment Text Area */}
          <div className="relative">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="Tulis ulasan, opini, atau kesanmu setelah menonton tayangan ini..."
              className="w-full resize-none rounded-2xl bg-black/30 border border-white/10 p-4 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/35 transition-colors"
            />
            <div className="absolute right-3 bottom-3 text-[10px] text-white/40">
              {commentText.length}/1000
            </div>
          </div>

          {/* Status feedback alerts */}
          {commentSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{commentSuccess}</span>
            </div>
          )}
          {commentError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{commentError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-white/45 hidden sm:block">
              Ulasan kamu akan langsung terlihat oleh komunitas penonton ZHAFX.
            </p>
            <button
              type="button"
              onClick={submitComment}
              disabled={isSubmittingComment || (!commentText.trim() && !selectedRating)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#06070B] font-bold text-xs shadow-lg hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 ml-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmittingComment ? 'Mengirim...' : 'Kirim Ulasan'}</span>
            </button>
          </div>
        </div>

        {/* Comments List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Ulasan Penonton</span>
              <span className="text-xs font-normal text-white/50">({comments.length})</span>
            </h3>

            {/* Sorting Tabs */}
            {comments.length > 1 && (
              <div className="flex items-center gap-1 p-1 rounded-full bg-white/[0.05] border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setSortBy('newest')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                    sortBy === 'newest' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Terbaru
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('rating')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                    sortBy === 'rating' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  Rating Tertinggi
                </button>
              </div>
            )}
          </div>

          {/* List or Empty State */}
          {comments.length === 0 ? (
            <div className="rounded-[24px] bg-white/[0.02] border border-white/10 p-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/40">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white/80">Belum ada ulasan untuk tayangan ini</p>
              <p className="text-xs text-white/45 max-w-sm mx-auto">
                Jadilah yang pertama memberikan penilaian dan membagikan pengalaman menontonmu!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...comments]
                .sort((a, b) => {
                  if (sortBy === 'rating') {
                    const rA = a.rating || 0;
                    const rB = b.rating || 0;
                    if (rB !== rA) return rB - rA;
                  }
                  return (b.createdAt || 0) - (a.createdAt || 0);
                })
                .map((comment) => {
                  const currentUser = storage.getUser();
                  let currentGuestId = '';
                  try {
                    currentGuestId = localStorage.getItem('zhafx_guest_id') || '';
                  } catch {}
                  const effectiveCurrentUserId = currentUser?.id || currentGuestId;
                  const isOwner =
                    Boolean(comment.userId && comment.userId === effectiveCurrentUserId) ||
                    Boolean(currentUser && comment.userName === (currentUser.name || currentUser.email));

                  const initial = (comment.userName || 'P').trim().charAt(0).toUpperCase();
                  const gradient = getAvatarGradient(comment.userName || 'Penonton');

                  return (
                    <article
                      key={comment.id}
                      className="p-4 sm:p-5 rounded-[22px] bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* User Avatar */}
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr ${gradient} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0`}
                          >
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-bold text-white tracking-tight">
                                {comment.userName || 'Penonton'}
                              </span>
                              {comment.isVerified && (
                                <span
                                  title="Akun Terverifikasi"
                                  className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-full border border-emerald-500/20"
                                >
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Terverifikasi</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-white/45">
                              {formatRelativeTime(comment.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Rating Stars & Delete Option */}
                        <div className="flex items-center gap-3 shrink-0">
                          {comment.rating && comment.rating > 0 && (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span className="text-xs font-bold">{comment.rating}</span>
                              <span className="text-[10px] text-amber-300/60">/ 5</span>
                            </div>
                          )}
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => deleteComment(comment.id)}
                              disabled={deletingId === comment.id}
                              title="Hapus ulasan saya"
                              className="text-white/30 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Comment Body */}
                      {comment.text && (
                        <p className="text-sm text-white/80 leading-relaxed pl-12 whitespace-pre-line">
                          {comment.text}
                        </p>
                      )}
                    </article>
                  );
                })}
            </div>
          )}
        </div>
      </section>

      {/* Similar Titles Row */}
      {title.similar && title.similar.length > 0 && (
        <div className="pt-6">
          <MediaRow
            title="Tayangan serupa yang mungkin kamu sukai"
            items={title.similar}
          />
        </div>
      )}
    </div>
  );
};
