import React, { useRef, useState, useMemo } from 'react';
import {
  IoChevronBackOutline as ChevronLeft,
  IoChevronForwardOutline as ChevronRight,
} from 'react-icons/io5';
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

export const MediaRow: React.FC<MediaRowProps> = React.memo(({
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

  const uniqueItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    return items.filter((item, index, self) =>
      index === self.findIndex((t) => t.id === item.id && t.type === item.type)
    );
  }, [items]);

  if (uniqueItems.length === 0) return null;

  const displayedItems = uniqueItems.slice(0, visibleCount);

  return (
    <section
      className="relative space-y-3 sm:space-y-4 group/row"
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: '300px',
      }}
    >
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
            className="text-xs font-semibold text-white/90 hover:text-white inline-flex items-center gap-1.5 transition-all duration-200 py-1.5 sm:py-2 px-3 sm:px-3.5 min-h-[38px] sm:min-h-[44px] min-w-[38px] sm:min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.15] hover:border-white/30 border border-white/15 ios-spring active:scale-95"
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
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-white/25 hover:border-white/30 hover:scale-110 active:scale-95 transition-[transform,opacity,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer hidden md:flex ios-spring shadow-xl transform-gpu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable Track with generous spacing and snap */}
        <div
          ref={scrollRef}
          tabIndex={0}
          onScroll={handleContainerScroll}
          aria-label={`Daftar tayangan ${title}`}
          className="flex gap-3 sm:gap-5 overflow-x-auto px-4 sm:px-6 md:px-8 pb-3.5 sm:pb-5 pt-2.5 sm:pt-3 snap-x snap-mandatory scrollbar-none focus:outline-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
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
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full liquid-glass liquid-specular text-white flex items-center justify-center opacity-0 group-hover/row:opacity-100 hover:bg-white/25 hover:border-white/30 hover:scale-110 active:scale-95 transition-[transform,opacity,background-color,border-color] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer hidden md:flex ios-spring shadow-xl transform-gpu"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
});
MediaRow.displayName = 'MediaRow';
