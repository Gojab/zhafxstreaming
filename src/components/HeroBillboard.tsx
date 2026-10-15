import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Title } from '../types';

interface HeroBillboardProps {
  items: Title[];
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({ items }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Check prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const validItems = items && items.length > 0 ? items.slice(0, 6) : [];

  const handleNext = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % validItems.length);
  }, [validItems.length]);

  const handlePrev = useCallback(() => {
    if (validItems.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + validItems.length) % validItems.length);
  }, [validItems.length]);

  // Autoplay every 7 seconds, pauses on hover/focus and reduced-motion
  useEffect(() => {
    if (validItems.length <= 1 || isPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      handleNext();
    }, 7000);

    return () => clearInterval(interval);
  }, [validItems.length, isPaused, prefersReducedMotion, handleNext]);

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  if (validItems.length === 0) return null;

  const current = validItems[currentIndex];
  const typeLabel = current.type === 'anime' ? 'Anime' : current.type === 'tv' ? 'Serial TV' : 'Film';

  return (
    <section
      className="relative w-full h-[65vh] sm:h-[75vh] min-h-[480px] max-h-[740px] overflow-hidden bg-[#090A0E] select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Pilihan Tayangan Unggulan"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id || currentIndex}
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          {/* Backdrop Image */}
          <img
            src={current.backdrop || current.poster}
            alt={current.title}
            className="w-full h-full object-cover object-center"
          />

          {/* Cinematic vignettes / gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090A0E] via-[#090A0E]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090A0E]/95 via-[#090A0E]/60 to-transparent sm:w-3/4" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_transparent_40%,_#090A0E_90%)]" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Information */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col justify-end pb-12 sm:pb-16 max-w-2xl">
        <motion.div
          key={`content-${current.id}`}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="space-y-3.5"
        >
          {/* Tag Badges */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300 text-xs font-medium uppercase tracking-wider">
              {typeLabel}
            </span>
            {current.rating && parseFloat(current.rating) > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-amber-400 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" />
                {current.rating}
              </span>
            )}
            <span className="text-xs text-zinc-400 font-medium">{current.year}</span>
            {current.genres && current.genres.length > 0 && (
              <span className="text-xs text-zinc-400 hidden sm:inline">
                • {current.genres.slice(0, 3).join(', ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-2xl sm:text-4xl md:text-5xl font-semibold text-white tracking-tight leading-tight line-clamp-2"
          >
            {current.title}
          </h1>

          {/* Overview */}
          <p className="text-xs sm:text-sm text-zinc-300 line-clamp-3 leading-relaxed max-w-xl">
            {current.overview || 'Sinopsis belum tersedia untuk tayangan ini.'}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate(`/watch/${current.type}/${current.id}`)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm transition-all duration-200 shadow-md active:scale-95 cursor-pointer min-h-[42px]"
            >
              <Play className="w-4 h-4 fill-current" />
              Putar sekarang
            </button>

            <button
              onClick={() => navigate(`/detail/${current.type}/${current.id}`)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/10 font-medium text-sm transition-all duration-200 backdrop-blur-md active:scale-95 cursor-pointer min-h-[42px]"
            >
              <Info className="w-4 h-4 text-zinc-300" />
              Detail
            </button>
          </div>
        </motion.div>
      </div>

      {/* Navigation Arrows for Desktop */}
      {validItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Tayangan sebelumnya"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hidden md:flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            aria-label="Tayangan berikutnya"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 hidden md:flex items-center justify-center transition-all cursor-pointer backdrop-blur-md active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Bottom Navigation Dots */}
      {validItems.length > 1 && (
        <div className="absolute bottom-5 right-5 sm:right-10 z-20 flex items-center gap-2">
          {validItems.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Pilih slide ${idx + 1}`}
              className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                idx === currentIndex
                  ? 'w-7 bg-white'
                  : 'w-2 bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
