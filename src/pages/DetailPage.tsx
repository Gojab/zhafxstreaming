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
import { useActiveMedia } from '../context/ActiveMediaContext';
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
  const [posterError, setPosterError] = useState(false);
  const [backdropError, setBackdropError] = useState(false);

  // Seasons & Episodes state for TV/Anime
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);

  // Share feedback toast
  const [showShareToast, setShowShareToast] = useState(false);

  const { isSaved, toggle } = useMyList();
  const { getProgressForTitle } = useContinueWatching();
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
        {/* Full-bleed 20px Poster (NOT glass) */}
        <div className="w-48 sm:w-60 md:w-64 aspect-[2/3] shrink-0 rounded-[20px] overflow-hidden bg-[#0E1017] shadow-[0_20px_50px_rgba(0,0,0,0.85)] mx-auto md:mx-0 border border-white/10 flex items-center justify-center">
          {!posterError && title.poster ? (
            <img
              src={title.poster}
              alt={title.title}
              onError={() => setPosterError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-[#0E1017]">
              <Film className="w-12 h-12 text-white/30 mb-2" />
              <span className="text-sm font-semibold text-white/50">{title.title}</span>
            </div>
          )}
        </div>

        {/* Floating Liquid Glass Info Panel */}
        <div className="flex-1 w-full rounded-[28px] sm:rounded-[36px] liquid-glass liquid-specular p-5 sm:p-8 shadow-2xl space-y-5 text-center md:text-left">
          {/* Metadata Badges */}
          <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full liquid-glass text-white/90 text-xs font-semibold uppercase tracking-wider">
              {typeLabel}
            </span>
            {title.rating && parseFloat(title.rating) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass text-amber-300 text-xs font-bold">
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
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-[-0.03em] leading-tight">
            {title.title}
          </h1>

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
                className="text-xs text-[#FFB224] hover:underline font-semibold cursor-pointer pt-0.5 ios-spring"
              >
                {isOverviewExpanded ? 'Sembunyikan' : 'Baca selengkapnya'}
              </button>
            )}
          </div>

          {/* Liquid Glass Action Pills */}
          <div className="flex items-center justify-center md:justify-start gap-2.5 sm:gap-3 pt-2 flex-wrap">
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
                      className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-white text-[#06070B] font-bold text-sm shadow-[0_8px_25px_rgba(255,255,255,0.25)] ios-spring cursor-pointer min-h-[46px]"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5 text-[#06070B]" />
                      <span>
                        Lanjutkan{' '}
                        {activeProgress.episode
                          ? `(Ep ${activeProgress.episode} • ${formatSecs(activeProgress.currentTime)})`
                          : `(${formatSecs(activeProgress.currentTime)})`}
                      </span>
                    </button>

                    <button
                      onClick={() => navigate(`/watch/${title.type}/${title.id}?t=0`)}
                      className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full liquid-glass liquid-specular text-xs font-semibold text-white/80 hover:text-white transition-all cursor-pointer min-h-[46px] ios-spring"
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
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white text-[#06070B] font-bold text-sm shadow-[0_8px_25px_rgba(255,255,255,0.25)] ios-spring cursor-pointer min-h-[46px]"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5 text-[#06070B]" />
                  <span>Putar sekarang</span>
                </button>
              );
            })()}

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
              className={`inline-flex items-center gap-2 px-5 py-3 rounded-full liquid-glass liquid-specular text-sm font-semibold transition-all cursor-pointer min-h-[46px] ios-spring ${
                inWatchlist ? 'text-[#FFB224] bg-white/[0.16]' : 'text-white hover:bg-white/[0.14]'
              }`}
            >
              {inWatchlist ? (
                <>
                  <BookmarkCheck className="w-4 h-4 text-[#FFB224]" />
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
              className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white text-sm font-medium transition-all cursor-pointer min-h-[46px] ios-spring"
              title="Bagikan tautan film"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Bagikan</span>
            </button>

            {/* Tanya AI Pill */}
            <button
              onClick={() => onOpenAIWithContext(title)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white text-sm font-medium transition-all cursor-pointer min-h-[46px] ios-spring"
            >
              <Sparkles className="w-4 h-4 text-[#FFB224]" />
              <span className="hidden sm:inline">Tanya AI</span>
            </button>
          </div>
        </div>
      </div>

      {/* For TV Series & Anime: Season & Episode Selector */}
      {mediaType === 'tv' && title.seasons && title.seasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Pilih Musim & Episode</h2>
              <p className="text-xs text-white/50">Pilih episode yang ingin langsung kamu tonton</p>
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
                        ? 'bg-white text-[#06070B] shadow-sm'
                        : 'liquid-glass text-white/70 hover:text-white'
                    }`}
                  >
                    {s.name || `Musim ${s.number}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episodes Grid */}
          {isLoadingEpisodes ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-[20px] bg-white/[0.04] animate-pulse" />
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
                    className="flex items-center gap-3 p-3.5 rounded-[20px] bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-left transition-all active:scale-[0.97] cursor-pointer group relative overflow-hidden ios-spring"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center font-bold text-xs text-white/80 shrink-0 group-hover:bg-[#FFB224] group-hover:text-[#06070B] transition-colors">
                      {ep.number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-white/95 line-clamp-1 group-hover:text-white">
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
                      <div className="flex items-center justify-between text-[11px] text-white/50 mt-0.5">
                        <span>Musim {selectedSeason} • Ep {ep.number}</span>
                        {hasProgress && (
                          <span className="text-[#FFB224] font-semibold">
                            {epProgress.progressPercentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar under episode card if in progress */}
                    {hasProgress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
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
            <div className="p-6 rounded-[24px] liquid-glass text-center text-xs text-white/60">
              Memuat daftar episode langsung di pemutar...
              <button
                onClick={() => navigate(`/watch/tv/${title.id}/${selectedSeason}/1`)}
                className="mt-2 block mx-auto text-[#FFB224] font-semibold hover:underline cursor-pointer"
              >
                Putar episode 1 sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* For Anime: Quick Episode Numbers with Liquid Glass */}
      {mediaType === 'anime' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-4 pt-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Pilih Episode Anime</h2>
            <p className="text-xs text-white/50">Pilih nomor episode untuk mulai menonton</p>
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
                  className={`p-3 rounded-[16px] text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative overflow-hidden ios-spring ${
                    hasProgress
                      ? 'bg-white/[0.14] border border-[#FFB224]/50 text-[#FFB224]'
                      : watched
                      ? 'bg-white/10 border border-white/20 text-white'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/90'
                  }`}
                >
                  <span>Ep {epNum}</span>
                  {watched && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {hasProgress && !watched && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
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
