import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { Title } from '../types';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { storage } from '../lib/storage';
import { optimizeTmdbImage, getTmdbBackdropSrcSet } from '../lib/image';
import { translateToIndonesian, isIndonesian } from '../lib/translator';

interface HeroBillboardProps {
  items: Title[];
}

export const HeroBillboard: React.FC<HeroBillboardProps> = ({ items }) => {
  const navigate = useNavigate();
  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [translatedOverview, setTranslatedOverview] = useState<string>('');
  const touchStartX = useRef<number | null>(null);

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const validItems = items && items.length > 0 ? items.slice(0, 6) : [];
  const current = validItems[currentIndex];

  // Keep Indonesian synopsis updated whenever current item changes
  useEffect(() => {
    if (!current) return;
    let isMounted = true;
    const raw = current.overview || '';
    if (isIndonesian(raw)) {
      setTranslatedOverview(raw);
    } else {
      setTranslatedOverview(raw);
      translateToIndonesian(raw, current.title).then((trans) => {
        if (isMounted && trans) {
          setTranslatedOverview(trans);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [current]);

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

  if (validItems.length === 0 || !current) return null;

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
      className="relative z-10 w-full h-[540px] xs:h-[580px] sm:h-[75vh] sm:min-h-[540px] sm:max-h-[780px] overflow-hidden bg-transparent select-none mb-4 sm:mb-10"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Tayangan Unggulan"
    >
      {/* Main Backdrop Artwork - brought forward with crisp visibility */}
      <div
        key={current.id || currentIndex}
        className="absolute inset-0 z-0 animate-in fade-in duration-700 ease-out will-change-[opacity]"
      >
        <img
          src={optimizeTmdbImage(current.backdrop || current.poster, 'w780')}
          srcSet={getTmdbBackdropSrcSet(current.backdrop || current.poster)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1280px"
          alt={current.title}
          width={780}
          height={439}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          // @ts-ignore
          fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
          decoding="async"
          className="w-full h-full object-cover object-center relative z-0 select-none"
        />

        {/* Top Vignette for seamless contrast under floating Navbar */}
        <div className="absolute inset-x-0 top-0 h-28 sm:h-32 bg-gradient-to-b from-[#06070B]/85 via-[#06070B]/30 to-transparent pointer-events-none z-[1]" />

        {/* Seamless Apple iOS Vignette Blend (balanced so backdrop artwork stays vivid) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070B] via-[#06070B]/35 to-transparent pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070B]/80 via-[#06070B]/30 to-transparent sm:w-2/3 pointer-events-none z-[1]" />
      </div>

      {/* Hero Content Information - SF Pro typography */}
      <div className="relative z-10 h-full w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col justify-end pb-16 sm:pb-20">
        <div
          key={`content-${current.id}`}
          className="space-y-2.5 sm:space-y-4 max-w-2xl sm:max-w-3xl animate-in fade-in duration-300 ease-out will-change-[opacity]"
        >
          {/* Metadata Badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="px-2.5 sm:px-3 py-1 rounded-full liquid-glass text-white/90 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider shadow-sm">
              {typeLabel}
            </span>
            {current.rating && parseFloat(current.rating) > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full liquid-glass text-white text-[10px] sm:text-[11px] font-bold shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                <span>{current.rating}</span>
              </span>
            )}
            <span className="text-[11px] sm:text-xs text-white/70 font-medium px-1">{current.year}</span>
            {current.genres && current.genres.length > 0 && (
              <span className="text-xs text-white/60 hidden sm:inline">
                • {current.genres.slice(0, 3).join(', ')}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-[-0.035em] leading-[1.12] line-clamp-2 drop-shadow-md">
            {current.title}
          </h1>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-white/75 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl font-normal">
            {translatedOverview || current.overview || 'Sinopsis belum tersedia untuk tayangan ini.'}
          </p>

          {/* Liquid Glass Action Buttons with Apple Spring Physics */}
          <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 flex-wrap">
            {/* Putar Button */}
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
                  className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 xs:px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-white text-[#06070B] hover:bg-white/90 font-bold text-xs sm:text-sm shadow-[0_8px_25px_rgba(255,255,255,0.25)] ios-spring cursor-pointer min-h-[40px] sm:min-h-[46px] shrink-0"
                >
                  <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current ml-0.5 text-[#06070B]" />
                  <span>
                    {hasHistory && (current.type === 'tv' || current.type === 'anime')
                      ? `Lanjutkan (Ep ${targetEpisode})`
                      : 'Putar'}
                  </span>
                </button>
              );
            })()}

            {/* Daftar Saya */}
            <button
              onClick={handleToggleMyList}
              className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 xs:px-4 sm:px-5 py-2.5 sm:py-3 rounded-full liquid-glass liquid-specular text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[46px] ios-spring shrink-0 ${
                saved ? 'text-white bg-white/[0.22] font-bold shadow-md' : 'text-white hover:bg-white/[0.14]'
              }`}
            >
              {saved ? (
                <>
                  <BookmarkCheck className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
                  <span>Tersimpan</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  <span>Daftar Saya</span>
                </>
              )}
            </button>

            {/* Detail Button */}
            <button
              onClick={() => navigate(`/detail/${current.type}/${current.id}`)}
              className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full liquid-glass liquid-specular text-white/80 hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer min-h-[40px] sm:min-h-[46px] ios-spring shrink-0"
              title="Informasi tayangan"
            >
              <Info className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              <span className="hidden xs:inline">Detail</span>
            </button>
          </div>
        </div>
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

      {/* Bottom Glass Navigation Indicator Pills - compact on mobile to never overlap buttons */}
      {validItems.length > 1 && (
        <div className="absolute bottom-2.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 p-1 rounded-full bg-black/40 sm:liquid-glass backdrop-blur-md border border-white/10 sm:border-white/15 shadow-lg pointer-events-auto">
          {validItems.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Pilih slide tayangan ${idx + 1}`}
              className="min-h-[22px] sm:min-h-[44px] min-w-[18px] sm:min-w-[32px] p-1 sm:p-2 flex items-center justify-center cursor-pointer ios-spring"
            >
              <span
                className={`h-1 sm:h-1.5 transition-all duration-300 rounded-full block ${
                  idx === currentIndex ? 'w-4 sm:w-6 bg-white shadow-sm' : 'w-1 sm:w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
