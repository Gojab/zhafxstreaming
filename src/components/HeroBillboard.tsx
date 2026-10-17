import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Title } from '../types';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { storage } from '../lib/storage';

interface HeroBillboardProps {
  items: Title[];
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({ items }) => {
  const navigate = useNavigate();
  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const validItems = items && items.length > 0 ? items.slice(0, 6) : [];

  // Synchronize active background poster whenever current item changes
  useEffect(() => {
    if (validItems.length > 0 && validItems[currentIndex]) {
      const active = validItems[currentIndex];
      setActiveMedia(active.backdrop || active.poster, active.title);
    }
  }, [currentIndex, validItems, setActiveMedia]);

  const handleNext = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validItems.length);
  }, [validItems.length]);

  const handlePrev = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validItems.length) % validItems.length);
  }, [validItems.length]);

  // Autoplay crossfade every 8 seconds
  useEffect(() => {
    if (validItems.length <= 1 || isPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      handleNext();
    }, 8000);

    return () => clearInterval(interval);
  }, [validItems.length, isPaused, prefersReducedMotion, handleNext]);

  // Touch swipe support for iOS gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  if (validItems.length === 0) return null;

  const current = validItems[currentIndex];
  const typeLabel = current.type === 'anime' ? 'Anime' : current.type === 'tv' ? 'Serial TV' : 'Film';
  const saved = isSaved(current.id);

  const handleToggleMyList = () => {
    toggle({
      id: current.id,
      type: current.type,
      title: current.title,
      poster: current.poster,
      backdrop: current.backdrop,
      year: current.year,
      rating: current.rating,
    });
  };

  return (
    <section
      className="relative w-full h-[70vh] sm:h-[80vh] min-h-[520px] max-h-[820px] overflow-hidden bg-transparent select-none pt-16 sm:pt-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Tayangan Unggulan"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id || currentIndex}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          {/* Main Backdrop Artwork */}
          <img
            src={current.backdrop || current.poster}
            alt={current.title}
            className="w-full h-full object-cover object-center"
          />

          {/* Seamless Apple iOS Vignette Blend */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06070B] via-[#06070B]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06070B]/90 via-[#06070B]/40 to-transparent sm:w-2/3" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Information - SF Pro typography */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col justify-end pb-14 sm:pb-20 max-w-3xl">
        <motion.div
          key={`content-${current.id}`}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="space-y-4"
        >
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full liquid-glass text-white/90 text-[11px] font-semibold uppercase tracking-wider shadow-sm">
              {typeLabel}
            </span>
            {current.rating && parseFloat(current.rating) > 0 && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full liquid-glass text-amber-300 text-[11px] font-bold shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                <span>{current.rating}</span>
              </span>
            )}
            <span className="text-xs text-white/70 font-medium px-1.5">{current.year}</span>
            {current.genres && current.genres.length > 0 && (
              <span className="text-xs text-white/60 hidden sm:inline">
                • {current.genres.slice(0, 3).join(', ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-[-0.035em] leading-[1.08] line-clamp-2 drop-shadow-md">
            {current.title}
          </h1>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-white/75 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl font-normal">
            {current.overview || 'Sinopsis belum tersedia untuk tayangan ini.'}
          </p>

          {/* Liquid Glass Action Buttons with Apple Spring Physics */}
          <div className="flex items-center gap-3 pt-3 flex-wrap">
            {/* Putar Button (White Liquid Glass Pill with bounce & progress resumption) */}
            {(() => {
              const lastHistory = storage.getHistory().find((h) => h.id === current.id);
              const targetSeason = lastHistory?.season ?? 1;
              const targetEpisode = lastHistory?.episode ?? 1;
              const hasHistory = Boolean(lastHistory && (lastHistory.season || lastHistory.episode));

              const playPath =
                current.type === 'anime'
                  ? `/watch/anime/${current.id}/1/${targetEpisode}`
                  : current.type === 'tv'
                  ? `/watch/tv/${current.id}/${targetSeason}/${targetEpisode}`
                  : `/watch/movie/${current.id}`;

              return (
                <button
                  onClick={() => navigate(playPath)}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white text-[#06070B] hover:bg-white/90 font-bold text-sm shadow-[0_8px_25px_rgba(255,255,255,0.25)] ios-spring cursor-pointer min-h-[46px]"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5 text-[#06070B]" />
                  <span>
                    {hasHistory && (current.type === 'tv' || current.type === 'anime')
                      ? `Lanjutkan (Ep ${targetEpisode})`
                      : 'Putar'}
                  </span>
                </button>
              );
            })()}

            {/* Daftar Saya (Liquid Glass Pill) */}
            <button
              onClick={handleToggleMyList}
              className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full liquid-glass liquid-specular text-sm font-semibold transition-all cursor-pointer min-h-[46px] ios-spring ${
                saved ? 'text-[#FFB224] bg-white/[0.16]' : 'text-white hover:bg-white/[0.14]'
              }`}
            >
              {saved ? (
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

            {/* Detail Button (Liquid Glass Circular / Pill) */}
            <button
              onClick={() => navigate(`/detail/${current.type}/${current.id}`)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white text-sm font-medium transition-all cursor-pointer min-h-[46px] ios-spring"
              title="Informasi tayangan"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Detail</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Floating Glass Navigation Arrows (Desktop) */}
      {validItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Tayangan sebelumnya"
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full liquid-glass liquid-specular text-white hidden md:flex items-center justify-center cursor-pointer ios-spring shadow-xl"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            aria-label="Tayangan berikutnya"
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full liquid-glass liquid-specular text-white hidden md:flex items-center justify-center cursor-pointer ios-spring shadow-xl"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Glass Navigation Indicator Pills */}
      {validItems.length > 1 && (
        <div className="absolute bottom-6 right-5 sm:right-10 z-20 flex items-center gap-1.5 p-1 rounded-full liquid-glass backdrop-blur-md">
          {validItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Pilih slide ${idx + 1}`}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer ios-spring ${
                idx === currentIndex ? 'w-6 bg-white shadow-sm' : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
