import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Title } from '../types';
import { MediaCard } from './MediaCard';

interface MediaRowProps {
  title: string;
  items: Title[];
  viewAllLink?: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  items,
  viewAllLink,
  icon,
  subtitle,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="relative space-y-3.5 my-6 sm:my-8 group/row">
      {/* Row Header */}
      <div className="flex items-end justify-between px-4 sm:px-6 md:px-8">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            {icon && <span className="text-zinc-300">{icon}</span>}
            <h2 className="text-base sm:text-lg md:text-xl font-semibold text-white tracking-tight">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-400">{subtitle}</p>
          )}
        </div>

        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs font-medium text-zinc-400 hover:text-white hover:underline flex items-center gap-1 transition-colors py-1 focus:outline-none rounded"
          >
            Lihat semua
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Row Container with Scroll Buttons */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll('left')}
          aria-label={`Geser ${title} ke kiri`}
          className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#111319]/90 hover:bg-[#181A22] text-white border border-white/10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 backdrop-blur cursor-pointer hidden md:flex active:scale-95"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label={`Daftar tayangan ${title}`}
          className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-6 md:px-8 pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="w-[130px] sm:w-[160px] md:w-[180px] shrink-0 snap-start"
            >
              <MediaCard item={item} />
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll('right')}
          aria-label={`Geser ${title} ke kanan`}
          className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#111319]/90 hover:bg-[#181A22] text-white border border-white/10 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-200 backdrop-blur cursor-pointer hidden md:flex active:scale-95"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
