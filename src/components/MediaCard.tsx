import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Play, Bookmark, BookmarkCheck, Star, Info } from 'lucide-react';
import { Title } from '../types';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';

interface MediaCardProps {
  item: Title;
  className?: string;
  showType?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, className = '', showType = false }) => {
  const navigate = useNavigate();
  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const [imageError, setImageError] = useState(false);

  const typeLabel = item.type === 'anime' ? 'Anime' : item.type === 'tv' ? 'Serial' : 'Film';
  const saved = isSaved(item.id);

  const detailPath = `/detail/${item.type}/${item.id}`;
  const playPath =
    item.type === 'anime'
      ? `/watch/anime/${item.id}/1/1`
      : item.type === 'tv'
      ? `/watch/tv/${item.id}/1/1`
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
      {/* Clickable Poster Link - 100% accessible and responsive on touch & mobile */}
      <Link
        to={detailPath}
        aria-label={`${item.title} (${item.year || 'Detail'})`}
        className="relative aspect-[2/3] w-full block overflow-hidden rounded-[20px] bg-[#0E1017] shadow-lg transition-all duration-300 ease-out group-hover:scale-[1.04] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.65)] ios-spring-soft cursor-pointer select-none"
      >
        {!imageError && item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#0E1017] pointer-events-none">
            <span className="text-xl font-bold text-white/40 tracking-wider mb-1">
              {getInitials(item.title)}
            </span>
            <span className="text-[11px] text-white/50 line-clamp-2 px-1">
              {item.title}
            </span>
          </div>
        )}

        {/* Subtle Dark Gradient at bottom of poster */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity pointer-events-none" />

        {/* Top Badges (Rating & Type) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none gap-1 z-10">
          {item.rating && parseFloat(item.rating) > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-semibold">
              <Star className="w-2.5 h-2.5 fill-current" />
              <span>{item.rating}</span>
            </span>
          ) : <span />}

          {showType && (
            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white/80 text-[10px] font-medium">
              {typeLabel}
            </span>
          )}
        </div>

        {/* Desktop Hover Quick Action Overlay (pointer-events-none unless hovered on desktop) */}
        <div className="hidden sm:flex absolute inset-0 z-20 flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
          <div className="flex items-center justify-center gap-2 mb-2">
            {/* Quick Play Glass Button */}
            <button
              type="button"
              onClick={handlePlay}
              aria-label={`Putar ${item.title}`}
              title="Putar sekarang"
              className="w-10 h-10 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-transform cursor-pointer ios-spring"
            >
              <Play className="w-4 h-4 fill-current ml-0.5 text-[#FFB224]" />
            </button>

            {/* Quick Watchlist Glass Button */}
            <button
              type="button"
              onClick={handleToggleWatchlist}
              aria-label={saved ? `Hapus ${item.title} dari daftar` : `Tambah ${item.title} ke daftar`}
              title={saved ? 'Tersimpan di Daftar' : 'Tambah ke Daftar'}
              className="w-9 h-9 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white hover:bg-white/20 active:scale-90 transition-transform cursor-pointer ios-spring"
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 text-[#FFB224]" />
              ) : (
                <Bookmark className="w-4 h-4 text-white/80" />
              )}
            </button>

            {/* Detail Glass Button */}
            <button
              type="button"
              onClick={handleInfo}
              aria-label={`Detail ${item.title}`}
              title="Lihat detail tayangan"
              className="w-9 h-9 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 active:scale-90 transition-transform cursor-pointer ios-spring"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Link>

      {/* Title & Metadata (Clean SF Pro typography) */}
      <Link to={detailPath} className="flex flex-col px-0.5 group/text">
        <h3 className="text-xs sm:text-[13px] font-semibold text-white/95 group-hover/text:text-white line-clamp-1 transition-colors leading-snug">
          {item.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-white/50 mt-0.5 font-medium">
          <span>{item.year || 'N/A'}</span>
          {item.genres && item.genres.length > 0 && (
            <>
              <span>•</span>
              <span className="line-clamp-1 text-white/40">{item.genres[0]}</span>
            </>
          )}
        </div>
      </Link>
    </div>
  );
};
