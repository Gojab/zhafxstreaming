import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Star } from 'lucide-react';
import { Title } from '../types';

interface MediaCardProps {
  item: Title;
  className?: string;
  showType?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ item, className = '', showType = false }) => {
  const [imageError, setImageError] = useState(false);

  // Type label in Indonesian
  const typeLabel = item.type === 'anime' ? 'Anime' : item.type === 'tv' ? 'Serial TV' : 'Film';

  // Get initials for fallback
  const getInitials = (text: string) => {
    return text
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  };

  const detailPath = `/detail/${item.type}/${item.id}`;

  return (
    <Link
      to={detailPath}
      className={`group flex flex-col gap-2 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFB224] rounded-xl transition-transform duration-200 hover:-translate-y-1.5 ${className}`}
      aria-label={`${item.title} (${item.year}) - ${typeLabel}`}
    >
      {/* Poster with 2:3 fixed aspect ratio */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[#111319] border border-white/[0.08] shadow-md group-hover:border-white/25 transition-all duration-200">
        {!imageError && item.poster ? (
          <img
            src={item.poster}
            alt={item.title}
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-[#111319]">
            <span
              style={{ fontFamily: 'var(--font-heading)' }}
              className="text-2xl font-bold text-zinc-500 tracking-wider mb-1"
            >
              {getInitials(item.title)}
            </span>
            <span className="text-[11px] text-zinc-400 line-clamp-2 px-1">
              {item.title}
            </span>
          </div>
        )}

        {/* Hover dark vignette overlay + play icon */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none gap-1">
          {item.rating && parseFloat(item.rating) > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-amber-400 text-[10px] font-medium">
              <Star className="w-2.5 h-2.5 fill-current" />
              {item.rating}
            </span>
          ) : <span />}

          {showType && (
            <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-zinc-300 text-[10px] font-medium">
              {typeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Title & Metadata */}
      <div className="flex flex-col px-0.5">
        <h3 className="text-xs sm:text-sm font-medium text-[#F2F4FB] group-hover:text-white line-clamp-1 transition-colors leading-snug">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-[#98A2C3] mt-0.5">
          <span>{item.year || 'N/A'}</span>
          {item.genres && item.genres.length > 0 && (
            <>
              <span>•</span>
              <span className="line-clamp-1">{item.genres[0]}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};
