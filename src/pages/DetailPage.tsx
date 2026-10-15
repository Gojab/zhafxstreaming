import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Share2,
  Sparkles,
  Star,
  Clock,
  Calendar,
  RotateCcw,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Film,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, Episode, MediaType } from '../types';
import { DetailSkeleton } from '../components/Skeleton';
import { MediaRow } from '../components/MediaRow';
import { useMyList } from '../hooks/useMyList';
import { useContinueWatching } from '../hooks/useContinueWatching';
import { storage } from '../lib/storage';

interface DetailPageProps {
  onOpenAIWithContext: (title: Title) => void;
}

export const DetailPage: React.FC<DetailPageProps> = ({ onOpenAIWithContext }) => {
  const { type: rawType, id } = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();

  const mediaType: MediaType =
    rawType === 'tv' || rawType === 'anime' || rawType === 'movie' ? rawType : 'movie';

  const [title, setTitle] = useState<Title | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synopsis expansion
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  // Seasons & Episodes state for TV/Anime
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  // Share feedback toast
  const [showShareToast, setShowShareToast] = useState(false);

  const { isSaved, toggle } = useMyList();
  const { getProgressForTitle } = useContinueWatching();
  const history = storage.getHistory();

  const loadDetails = async (signal?: AbortSignal) => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDetails(id, mediaType, signal);
      setTitle(data);
      if (data.seasons && data.seasons.length > 0) {
        setSelectedSeason(data.seasons[0].number);
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

  return (
    <div className="min-h-screen pb-16 space-y-12">
      {/* Toast Notification */}
      {showShareToast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/20 text-white text-xs font-medium shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          Tautan tayangan berhasil disalin!
        </div>
      )}

      {/* Hero Backdrop Banner */}
      <div className="relative w-full h-[45vh] sm:h-[55vh] min-h-[320px] max-h-[560px] overflow-hidden bg-[#0A0C14]">
        <img
          src={title.backdrop || title.poster}
          alt={title.title}
          className="w-full h-full object-cover object-top opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C14] via-[#0A0C14]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0C14]/90 via-transparent to-[#0A0C14]/90" />
      </div>

      {/* Main Metadata Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 -mt-36 sm:-mt-44 relative z-10 flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
        {/* 2:3 Fixed Poster */}
        <div className="w-44 sm:w-56 md:w-64 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden bg-[#12162A] border-2 border-[#2A3152] shadow-2xl shadow-black/80 mx-auto md:mx-0">
          <img
            src={title.poster}
            alt={title.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info Column */}
        <div className="flex-1 space-y-4 text-center md:text-left">
          {/* Badges */}
          <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-[#12162A] border border-[#2A3152] text-zinc-300 text-xs font-semibold uppercase tracking-wider">
              {typeLabel}
            </span>
            {title.rating && parseFloat(title.rating) > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#12162A] border border-[#2A3152] text-[#FFB224] text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" />
                {title.rating}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-[#98A2C3]">
              <Calendar className="w-3.5 h-3.5" />
              {title.year}
            </span>
            {title.runtime && (
              <span className="inline-flex items-center gap-1 text-xs text-[#98A2C3]">
                <Clock className="w-3.5 h-3.5" />
                {title.runtime} mnt
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#F2F4FB] tracking-tight leading-tight"
          >
            {title.title}
          </h1>

          {/* Genres */}
          {title.genres && title.genres.length > 0 && (
            <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap">
              {title.genres.map((g, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-0.5 rounded-lg bg-[#12162A]/80 border border-[#2A3152]/70 text-[11px] text-[#98A2C3]"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          <div className="space-y-1 max-w-2xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#98A2C3]">
              Sinopsis
            </h2>
            <p
              className={`text-xs sm:text-sm text-[#F2F4FB]/90 leading-relaxed ${
                !isOverviewExpanded ? 'line-clamp-3' : ''
              }`}
            >
              {title.overview || 'Sinopsis belum tersedia untuk tayangan ini.'}
            </p>
            {title.overview && title.overview.length > 180 && (
              <button
                onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                className="text-xs text-[#FFB224] hover:underline font-medium cursor-pointer pt-0.5"
              >
                {isOverviewExpanded ? 'Sembunyikan' : 'Baca selengkapnya'}
              </button>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-center md:justify-start gap-3 pt-2 flex-wrap">
            {/* Play Button (Dynamic Continue Watching or Start Fresh) */}
            {(() => {
              const activeProgress = getProgressForTitle(title.id);
              const formatSecs = (sec: number) => {
                const s = Math.max(0, Math.round(sec));
                const m = Math.floor(s / 60);
                const rem = s % 60;
                return `${m}:${rem.toString().padStart(2, '0')}`;
              };

              if (activeProgress && !activeProgress.completed && activeProgress.currentTime > 5) {
                const seasonParam = activeProgress.season || 1;
                const epParam = activeProgress.episode || 1;
                const startParam = Math.floor(activeProgress.currentTime);

                const continueUrl =
                  title.type === 'tv'
                    ? `/watch/tv/${title.id}/${seasonParam}/${epParam}?t=${startParam}`
                    : title.type === 'anime'
                    ? `/watch/anime/${title.id}/1/${epParam}?t=${startParam}`
                    : `/watch/movie/${title.id}?t=${startParam}`;

                return (
                  <>
                    <button
                      onClick={() => navigate(continueUrl)}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFB224] hover:bg-[#ffbe47] text-[#0A0C14] font-semibold text-sm transition-all duration-150 active:scale-95 cursor-pointer min-h-[42px] shadow-lg"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>
                        Lanjutkan Menonton{' '}
                        {activeProgress.episode
                          ? `(Ep ${activeProgress.episode} • ${formatSecs(activeProgress.currentTime)})`
                          : `(${formatSecs(activeProgress.currentTime)})`}
                      </span>
                    </button>

                    <button
                      onClick={() => navigate(`/watch/${title.type}/${title.id}?t=0`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] text-xs font-medium text-[#98A2C3] hover:text-[#F2F4FB] transition-colors cursor-pointer min-h-[42px]"
                      title="Putar dari awal (0:00)"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mulai dari awal</span>
                    </button>
                  </>
                );
              }

              return (
                <button
                  onClick={() => navigate(`/watch/${title.type}/${title.id}`)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-all duration-150 active:scale-95 cursor-pointer min-h-[42px]"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Putar sekarang
                </button>
              );
            })()}

            {/* Add to My List */}
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
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150 cursor-pointer min-h-[42px] ${
                inWatchlist
                  ? 'bg-[#12162A] border-amber-400 text-amber-400'
                  : 'bg-[#12162A] hover:bg-[#1A2038] border-white/10 text-zinc-200'
              }`}
            >
              {inWatchlist ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-amber-400" />
                  Tersimpan di daftar
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Tambah ke daftar
                </>
              )}
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#12162A] hover:bg-[#1A2038] border border-white/10 text-zinc-200 text-sm font-medium transition-colors cursor-pointer min-h-[42px]"
              title="Bagikan tautan film"
            >
              <Share2 className="w-4 h-4" />
              Bagikan
            </button>

            {/* Tanya AI Button for this title */}
            <button
              onClick={() => onOpenAIWithContext(title)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-sm font-medium transition-all cursor-pointer min-h-[42px]"
            >
              <Sparkles className="w-4 h-4 text-zinc-300" />
              Tanya AI tentang judul ini
            </button>
          </div>
        </div>
      </div>

      {/* For TV Series & Anime: Season & Episode Selector */}
      {mediaType === 'tv' && title.seasons && title.seasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-4 border-t border-white/[0.08]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#F2F4FB]">Pilih Musim & Episode</h2>
              <p className="text-xs text-[#98A2C3]">Pilih episode yang ingin langsung kamu tonton</p>
            </div>

            {/* Season Dropdown */}
            {title.seasons.length > 1 && (
              <div className="relative inline-block">
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="appearance-none px-4 py-2 pr-9 rounded-xl bg-[#12162A] border border-[#2A3152] text-xs font-semibold text-[#F2F4FB] focus:outline-none focus:border-[#FFB224] cursor-pointer"
                >
                  {title.seasons.map((s) => (
                    <option key={s.number} value={s.number} className="bg-[#12162A] text-white">
                      {s.name || `Musim ${s.number}`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[#98A2C3] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Episodes Grid */}
          {isLoadingEpisodes ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#12162A] animate-pulse" />
              ))}
            </div>
          ) : episodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {episodes.map((ep) => {
                const watched = isEpisodeWatched(selectedSeason, ep.number);
                const epProgress = getProgressForTitle(title.id, selectedSeason, ep.number);
                const hasProgress = epProgress && !epProgress.completed && epProgress.currentTime > 5;
                const epStart = hasProgress ? `?t=${Math.floor(epProgress.currentTime)}` : '';

                return (
                  <button
                    key={ep.number}
                    onClick={() =>
                      navigate(`/watch/tv/${title.id}/${selectedSeason}/${ep.number}${epStart}`)
                    }
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#12162A] hover:bg-[#1A2038] border border-white/[0.08] hover:border-white/20 text-left transition-all active:scale-[0.98] cursor-pointer group relative overflow-hidden"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#0A0C14] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-zinc-300 shrink-0 group-hover:bg-[#FFB224] group-hover:text-[#0A0C14] transition-colors">
                      {ep.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-[#F2F4FB] line-clamp-1 group-hover:text-white">
                          {ep.name || `Episode ${ep.number}`}
                        </span>
                        {watched && (
                          <span
                            title="Sudah ditonton"
                            className="text-emerald-400 shrink-0"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#98A2C3] mt-0.5">
                        <span>Musim {selectedSeason} • Ep {ep.number}</span>
                        {hasProgress && (
                          <span className="text-[#FFB224] font-medium">
                            {epProgress.progressPercentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar under episode card if in progress */}
                    {hasProgress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1A2038]">
                        <div
                          className="h-full bg-[#FFB224]"
                          style={{ width: `${epProgress.progressPercentage}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-[#12162A]/50 border border-white/[0.08] text-center text-xs text-[#98A2C3]">
              Memuat daftar episode langsung di pemutar...
              <button
                onClick={() => navigate(`/watch/tv/${title.id}/${selectedSeason}/1`)}
                className="mt-2 block mx-auto text-amber-400 font-semibold hover:underline"
              >
                Putar episode 1 sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* For Anime: Quick Episode Numbers */}
      {mediaType === 'anime' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-4 border-t border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-[#F2F4FB]">Pilih Episode Anime</h2>
            <p className="text-xs text-[#98A2C3]">Pilih nomor episode untuk mulai menonton</p>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {Array.from({ length: Math.min(title.numberOfEpisodes || 24, 48) }, (_, i) => i + 1).map((epNum) => {
              const watched = isEpisodeWatched(1, epNum);
              const epProgress = getProgressForTitle(title.id, 1, epNum);
              const hasProgress = epProgress && !epProgress.completed && epProgress.currentTime > 5;
              const epStart = hasProgress ? `?t=${Math.floor(epProgress.currentTime)}` : '';

              return (
                <button
                  key={epNum}
                  onClick={() => navigate(`/watch/anime/${title.id}/1/${epNum}${epStart}`)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative overflow-hidden ${
                    hasProgress
                      ? 'bg-[#1A2038] border-[#FFB224]/50 text-[#FFB224]'
                      : watched
                      ? 'bg-white/10 border-white/30 text-white'
                      : 'bg-[#12162A] hover:bg-[#1A2038] border-white/[0.08] hover:border-white/20 text-[#F2F4FB]'
                  }`}
                >
                  <span>Ep {epNum}</span>
                  {watched && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {hasProgress && !watched && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0A0C14]">
                      <div
                        className="h-full bg-[#FFB224]"
                        style={{ width: `${epProgress.progressPercentage}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
