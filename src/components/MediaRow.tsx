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

  const uniqueItems = items.filter((item, index, self) =>
    index === self.findIndex((t) => t.id === item.id && t.type === item.type)
  );

  return (
    <section className="relative space-y-4 my-7 sm:my-9 group/row">
      {/* Row Header - Apple SF Pro Typography */}
      <div className="flex items-end justify-between px-4 sm:px-6 md:px-8">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-white/50">{subtitle}</p>
          )}
        </div>

        {viewAllLink && (
          <Link
            to={viewAllLink}
            className="text-xs font-medium text-white/70 hover:text-white flex items-center gap-1 transition-all py-1 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 ios-spring"
          >
            <span>Lihat semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Row Container with Liquid Glass Scroll Buttons */}
      <div className="relative">
        {/* Left Arrow Glass Button */}
        <button
          onClick={() => handleScroll('left')}
          aria-label={`Geser ${title} ke kiri`}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex ios-spring shadow-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Track with generous spacing and snap */}
        <div
          ref={scrollRef}
          tabIndex={0}
          aria-label={`Daftar tayangan ${title}`}
          className="flex gap-4 sm:gap-5 overflow-x-auto px-4 sm:px-6 md:px-8 pb-4 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {uniqueItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="w-[140px] sm:w-[170px] md:w-[190px] shrink-0 snap-start"
            >
              <MediaCard item={item} />
            </div>
          ))}
        </div>

        {/* Right Arrow Glass Button */}
        <button
          onClick={() => handleScroll('right')}
          aria-label={`Geser ${title} ke kanan`}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex ios-spring shadow-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
