import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Bookmark, BookmarkCheck, Star, Info } from 'lucide-react';
import { Title } from '../types';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { storage } from '../lib/storage';
import { optimizeTmdbImage, getTmdbPosterSrcSet } from '../lib/image';

interface MediaCardProps {
  item: Title;
  className?: string;
  showType?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = React.memo(({ item, className = '', showType = false }) => {
  const navigate = useNavigate();
  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const [imageError, setImageError] = useState(false);

  const typeLabel = item.type === 'anime' ? 'Anime' : item.type === 'tv' ? 'Serial' : 'Film';
  const saved = isSaved(item.id);

  const detailPath = `/detail/${item.type}/${item.id}`;

  const lastHistory = storage.getHistory().find((h) => h.id === item.id);
  const targetSeason = item.season ?? lastHistory?.season ?? 1;
  const targetEpisode = item.episode ?? lastHistory?.episode ?? 1;

  const savedProgress = storage.getProgress(
    item.id,
    item.type === 'tv' ? targetSeason : undefined,
    item.type === 'tv' || item.type === 'anime' ? targetEpisode : undefined
  );

  const progressPercent =
    savedProgress?.progressPercentage ??
    lastHistory?.progressPercentage ??
    (savedProgress && savedProgress.duration > 0
      ? Math.round((savedProgress.currentTime / savedProgress.duration) * 100)
      : undefined);

  const hasResumePoint =
    (savedProgress && savedProgress.currentTime > 5 && !savedProgress.completed) ||
    Boolean(lastHistory?.currentTime && lastHistory.currentTime > 5);

  const currentSeconds = savedProgress?.currentTime || lastHistory?.currentTime || 0;

  const formatCardTime = (sec: number) => {
    if (!sec || isNaN(sec)) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}j ${m % 60}m`;
    return `${m}m ${s}d`;
  };

  const playPath =
    item.type === 'anime'
      ? `/watch/anime/${item.id}/1/${targetEpisode}`
      : item.type === 'tv'
      ? `/watch/tv/${item.id}/${targetSeason}/${targetEpisode}`
      : `/watch/movie/${item.id}`;

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle({
      id: item.id,
      type: item.type,
      title: item.title,
      poster: item.poster,
      backdrop: item.backdrop,
      year: item.year,
      rating: item.rating,
    });
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(playPath);
  };

  const handleInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(detailPath);
  };

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div
      onMouseEnter={() => {
        if (item.poster || item.backdrop) {
          setActiveMedia(item.backdrop || item.poster, item.title);
        }
      }}
      className={`group flex flex-col gap-2 relative ${className}`}
    >
      {/* Poster Media Box with clean DOM separation & 100% reliable click interaction */}
      <div
        onClick={(e) => {
          // If a quick-action button was clicked, don't trigger the general poster navigation
          if ((e.target as HTMLElement).closest('button')) return;
          navigate(detailPath);
        }}
        className="relative aspect-[2/3] w-full overflow-hidden rounded-[16px] sm:rounded-[20px] bg-[#0E1017] border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.45)] transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-hover:border-white/30 group-hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.85),0_0_20px_rgba(255,255,255,0.08)] active:scale-[0.98] select-none cursor-pointer transform-gpu"
      >
        {/* Clickable Poster Link to Detail (z-10) */}
        <Link
          to={detailPath}
          aria-label={`${item.title} (${item.year || 'Detail'})`}
          className="absolute inset-0 block cursor-pointer z-10"
        >
          {!imageError && item.poster ? (
            <img
              src={optimizeTmdbImage(item.poster, 'w342')}
              srcSet={getTmdbPosterSrcSet(item.poster)}
              sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 220px"
              alt={item.title}
              width={342}
              height={513}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05] pointer-events-none transform-gpu"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#0E1017] pointer-events-none">
              <span className="text-xl font-bold text-white/40 tracking-wider mb-1">
                {getInitials(item.title)}
              </span>
              <span className="text-[11px] text-zinc-300 line-clamp-2 px-1">
                {item.title}
              </span>
            </div>
          )}

          {/* Dynamic specular light sheen that slides across on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />

          {/* Subtle Dark Gradient at bottom of poster */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-75 group-hover:opacity-90 transition-opacity duration-250 pointer-events-none" />

          {/* Top Badges (Rating, Type, & Resume Point) */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-1 z-10">
            <div className="flex items-center gap-1">
              {item.rating && parseFloat(item.rating) > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold border border-white/10 group-hover:border-white/20 transition-colors">
                  <Star className="w-2.5 h-2.5 fill-current text-[#FFB224]" />
                  <span>{item.rating}</span>
                </span>
              ) : null}

              {hasResumePoint && currentSeconds > 5 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFB224] text-black text-[10px] font-extrabold shadow-md">
                  <span>{formatCardTime(currentSeconds)}</span>
                </span>
              )}
            </div>

            {showType && (
              <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/90 text-[10px] font-medium border border-white/10">
                {typeLabel}
              </span>
            )}
          </div>

          {/* Continue Watching / Playback Progress Bar */}
          {hasResumePoint && progressPercent !== undefined && progressPercent > 0 && progressPercent < 95 && (
            <div className="absolute bottom-0 inset-x-0 z-20 pointer-events-none">
              <div className="w-full h-1 sm:h-1.5 bg-black/80 backdrop-blur-xs overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-[#FFB224] rounded-r-full shadow-[0_0_8px_rgba(255,178,36,0.7)] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(4, progressPercent))}%` }}
                />
              </div>
            </div>
          )}
        </Link>

        {/* Action Overlay: container is strictly pointer-events-none so it NEVER blocks clicks on the poster */}
        <div className="hidden sm:flex absolute inset-0 z-20 flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-all duration-250 pointer-events-none">
          <div className="flex items-center justify-center gap-2.5 mb-2 pointer-events-auto transform translate-y-3 group-hover:translate-y-0 transition-transform duration-250 ease-[cubic-bezier(0.25,1,0.5,1)]">
            {/* Quick Play Glass Button (min 44x44px target) */}
            <button
              type="button"
              onClick={handlePlay}
              aria-label={hasResumePoint ? `Lanjutkan ${item.title} (${formatCardTime(currentSeconds)})` : `Putar ${item.title}`}
              title={hasResumePoint ? `Lanjutkan pemutaran (${formatCardTime(currentSeconds)})` : "Putar sekarang"}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular flex items-center justify-center text-white hover:bg-white/30 hover:border-white/40 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_0_16px_rgba(255,255,255,0.3)]"
            >
              <Play className="w-4 h-4 fill-current ml-0.5 text-white" />
            </button>

            {/* Quick Watchlist Glass Button (min 44x44px target) */}
            <button
              type="button"
              onClick={handleToggleWatchlist}
              aria-label={saved ? `Hapus ${item.title} dari daftar` : `Tambah ${item.title} ke daftar`}
              title={saved ? 'Tersimpan di Daftar' : 'Tambah ke Daftar'}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular flex items-center justify-center text-white hover:bg-white/30 hover:border-white/40 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_0_16px_rgba(255,255,255,0.3)]"
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 text-white" />
              ) : (
                <Bookmark className="w-4 h-4 text-white/90" />
              )}
            </button>

            {/* Detail Glass Button (min 44x44px target) */}
            <button
              type="button"
              onClick={handleInfo}
              aria-label={`Detail ${item.title}`}
              title="Lihat detail tayangan"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/90 hover:text-white hover:bg-white/30 hover:border-white/40 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-[0_0_16px_rgba(255,255,255,0.3)]"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Title & Metadata (Clean typography with smooth interactive feedback) */}
      <Link to={detailPath} className="flex flex-col px-0.5 group/text">
        <h3 className="text-xs sm:text-[13px] font-semibold text-white/90 group-hover:text-[#FFB224] line-clamp-1 transition-colors duration-200 leading-snug">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 group-hover:text-zinc-300 mt-0.5 font-medium transition-colors duration-200">
          <span>{item.year || 'N/A'}</span>
          {item.genres && item.genres.length > 0 && (
            <>
              <span>•</span>
              <span className="line-clamp-1 text-zinc-400 group-hover:text-zinc-300">{item.genres[0]}</span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
});
MediaCard.displayName = 'MediaCard';
