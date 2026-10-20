import React, { useRef, useState } from 'react';
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
  const [visibleCount, setVisibleCount] = useState(10);

  const handleScroll = (direction: 'left' | 'right') => {
    if (visibleCount < items.length) {
      setVisibleCount(items.length);
    }
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const handleContainerScroll = () => {
    if (visibleCount < items.length) {
      setVisibleCount(items.length);
    }
  };

  if (!items || items.length === 0) return null;

  const uniqueItems = items.filter((item, index, self) =>
    index === self.findIndex((t) => t.id === item.id && t.type === item.type)
  );

  const displayedItems = uniqueItems.slice(0, visibleCount);

  return (
    <section className="relative space-y-3 sm:space-y-4 group/row">
      {/* Row Header - Apple SF Pro Typography */}
      <div className="flex items-end justify-between px-4 sm:px-6 md:px-8">
        <div className="space-y-0.5 sm:space-y-1">
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-zinc-400">{subtitle}</p>
          )}
        </div>

        {viewAllLink && (
          <Link
            to={viewAllLink}
            aria-label={`Lihat semua ${title}`}
            className="text-xs font-semibold text-white/90 hover:text-white inline-flex items-center gap-1.5 transition-all py-1.5 sm:py-2 px-3 sm:px-3.5 min-h-[38px] sm:min-h-[44px] min-w-[38px] sm:min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 ios-spring"
          >
            <span>Lihat semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Row Container with Liquid Glass Scroll Buttons */}
      <div className="relative">
        {/* Left Arrow Glass Button (min 44x44px target) */}
        <button
          type="button"
          onClick={() => handleScroll('left')}
          aria-label={`Geser ${title} ke kiri`}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex ios-spring shadow-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Track with generous spacing and snap */}
        <div
          ref={scrollRef}
          tabIndex={0}
          onScroll={handleContainerScroll}
          aria-label={`Daftar tayangan ${title}`}
          className="flex gap-3 sm:gap-5 overflow-x-auto px-4 sm:px-6 md:px-8 pb-3 sm:pb-4 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {displayedItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="w-[128px] xs:w-[140px] sm:w-[170px] md:w-[190px] shrink-0 snap-start"
            >
              <MediaCard item={item} />
            </div>
          ))}
          {/* Spacer at end of track for mobile edge breathing room */}
          <div className="w-1 sm:hidden shrink-0" aria-hidden="true" />
        </div>

        {/* Right Arrow Glass Button (min 44x44px target) */}
        <button
          type="button"
          onClick={() => handleScroll('right')}
          aria-label={`Geser ${title} ke kanan`}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all duration-200 cursor-pointer hidden md:flex ios-spring shadow-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
};
