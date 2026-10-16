import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlayCircle,
  Tv,
  Film,
  Sparkles,
} from 'lucide-react';
import { WatchProgressItem } from '../types';

interface ContinueWatchingSectionProps {
  items: WatchProgressItem[];
  onRemove: (contentId: string, season?: number, episode?: number) => void;
  isLoading?: boolean;
}

export const ContinueWatchingSection: React.FC<ContinueWatchingSectionProps> = ({
  items,
  onRemove,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!isLoading && items.length === 0) {
    return null;
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const formatTime = (totalSeconds: number): string => {
    const s = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatRemaining = (current: number, total: number): string => {
    const remainingSeconds = Math.max(0, total - current);
    const mins = Math.ceil(remainingSeconds / 60);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `Sisa ${h}j ${m}m` : `Sisa ${h} jam`;
    }
    return `Sisa ${mins} mnt`;
  };

  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diffMs = Math.max(0, now - timestamp);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric' }).format(new Date(timestamp));
  };

  return (
    <section className="relative space-y-4 my-7 sm:my-9 group/cwatch">
      {/* Header - Apple SF Pro Typography */}
      <div className="flex items-end justify-between px-4 sm:px-6 md:px-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight">
              Lanjutkan Menonton
            </h2>
            <span className="px-2.5 py-0.5 rounded-full liquid-glass text-[11px] font-semibold text-[#FFB224]">
              {items.length}
            </span>
          </div>
          <p className="text-xs text-white/50">
            Lanjutkan film, serial, dan anime tepat dari posisi terakhir yang Anda tonton
          </p>
        </div>

        <Link
          to="/history"
          className="text-xs font-medium text-white/70 hover:text-white flex items-center gap-1 transition-all py-1 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 ios-spring cursor-pointer"
        >
          <span>Semua Riwayat</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Row with Liquid Glass Scroll Buttons */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll('left')}
          aria-label="Geser lanjutkan menonton ke kiri"
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/cwatch:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex ios-spring shadow-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label="Daftar tayangan lanjutkan menonton"
          className="flex gap-4 sm:gap-5 overflow-x-auto px-4 sm:px-6 md:px-8 pb-4 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => {
            const seasonNum = item.season || 1;
            const episodeNum = item.episode || 1;
            const startParam = Math.max(0, Math.floor(item.currentTime));

            const playUrl =
              item.mediaType === 'tv'
                ? `/watch/tv/${item.contentId}/${seasonNum}/${episodeNum}?t=${startParam}`
                : item.mediaType === 'anime'
                ? `/watch/anime/${item.contentId}/1/${episodeNum}?t=${startParam}`
                : `/watch/movie/${item.contentId}?t=${startParam}`;

            const detailUrl = `/detail/${item.mediaType}/${item.contentId}`;

            const percentage = Math.min(
              100,
              Math.max(1, item.progressPercentage || Math.round((item.currentTime / item.duration) * 100))
            );

            const displayImage = item.backdrop || item.poster;

            return (
              <div
                key={item.id}
                className="w-[260px] sm:w-[300px] md:w-[320px] shrink-0 snap-start flex flex-col rounded-[20px] bg-[#0E1017] shadow-lg hover:shadow-[0_16px_36px_rgba(0,0,0,0.65)] transition-all duration-300 group/card overflow-hidden"
              >
                {/* Thumbnail Container (16:9 full-bleed with 20px corners) */}
                <div className="relative aspect-video w-full bg-[#0E1017] overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 font-bold text-2xl tracking-wider select-none">
                    {item.title ? item.title.slice(0, 2).toUpperCase() : 'ZH'}
                  </div>
                  {displayImage && (
                    <img
                      src={displayImage}
                      alt={item.title}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover/card:scale-105 relative z-0"
                    />
                  )}

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60 pointer-events-none" />

                  {/* Top Badge: Type & Episode */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-semibold uppercase tracking-wider">
                      {item.mediaType === 'tv' ? (
                        <>
                          <Tv className="w-3 h-3 text-[#FFB224]" />
                          <span>S{seasonNum} E{episodeNum}</span>
                        </>
                      ) : item.mediaType === 'anime' ? (
                        <>
                          <Sparkles className="w-3 h-3 text-[#FFB224]" />
                          <span>Ep {episodeNum}</span>
                        </>
                      ) : (
                        <>
                          <Film className="w-3 h-3 text-[#FFB224]" />
                          <span>Film</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Top Right: Delete Button (Liquid Glass Circular Pill) */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(item.contentId, item.season, item.episode);
                    }}
                    title="Hapus dari Continue Watching"
                    aria-label={`Hapus ${item.title} dari daftar lanjutkan menonton`}
                    className="absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer ios-spring"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Center Play Button on Hover */}
                  <Link
                    to={playUrl}
                    className="absolute inset-0 flex items-center justify-center z-10 focus:outline-none"
                    aria-label={`Lanjutkan menonton ${item.title}`}
                  >
                    <div className="w-12 h-12 rounded-full liquid-glass-dense liquid-specular text-white flex items-center justify-center shadow-2xl transform scale-90 group-hover/card:scale-105 transition-all duration-200 cursor-pointer ios-spring">
                      <Play className="w-5 h-5 fill-current ml-0.5 text-[#FFB224]" />
                    </div>
                  </Link>

                  {/* Bottom Time Stamp Indicator on Poster */}
                  <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none text-[11px] font-medium text-white/90">
                    <span className="font-mono bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md">
                      {formatTime(item.currentTime)} / {formatTime(item.duration)}
                    </span>
                    <span className="bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-md text-[#FFB224] font-semibold">
                      {formatRemaining(item.currentTime, item.duration)}
                    </span>
                  </div>

                  {/* Progress Bar (Apple style at the bottom edge) */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FFB224] to-[#ffc559] transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Card Info & Actions */}
                <div className="p-3.5 flex flex-col justify-between flex-1 gap-2.5">
                  <div className="space-y-1">
                    <Link
                      to={detailUrl}
                      className="text-xs sm:text-[13px] font-semibold text-white/95 hover:text-[#FFB224] transition-colors line-clamp-1 block leading-snug"
                      title={item.title}
                    >
                      {item.title}
                    </Link>

                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      {item.episodeName ? (
                        <span className="text-[#FFB224] font-medium truncate">
                          {item.episodeName}
                        </span>
                      ) : (
                        <span>{item.year || 'N/A'}</span>
                      )}
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(item.lastWatchedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Action CTA Button */}
                  <div className="pt-1 border-t border-white/[0.08]">
                    <button
                      onClick={() => navigate(playUrl)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-full liquid-glass liquid-specular text-white hover:bg-white/[0.14] text-xs font-semibold transition-all cursor-pointer ios-spring"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-[#FFB224]" />
                      <span>Lanjutkan Menonton</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll('right')}
          aria-label="Geser lanjutkan menonton ke kanan"
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/cwatch:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex ios-spring shadow-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
