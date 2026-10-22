import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoPlay as Play,
  IoInformationCircleOutline as Info,
  IoStar as Star,
  IoBookmarkOutline as Bookmark,
  IoBookmark as BookmarkCheck,
} from 'react-icons/io5';
import { Title } from '../types';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { storage } from '../lib/storage';
import { optimizeTmdbImage, getTmdbBackdropSrcSet } from '../lib/image';
import { translateToIndonesian, isIndonesian } from '../lib/translator';
import { CoverflowCarousel, CoverflowSlide } from './ui/coverflow-carousel';

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

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const validItems = useMemo(
    () => (items && items.length > 0 ? items.slice(0, 8) : []),
    [items]
  );
  const current = validItems[currentIndex] || validItems[0];

  // Convert validItems into CoverflowSlide objects
  const slides = useMemo<CoverflowSlide[]>(() => {
    return validItems.map((item) => ({
      src: optimizeTmdbImage(item.poster || item.backdrop, 'w500'),
      alt: item.title,
      title: item.title,
      subtitle: item.genres?.slice(0, 2).join(' • '),
      rating: item.rating,
      year: item.year,
      type: item.type,
      genres: item.genres,
      id: item.id,
      backdrop: item.backdrop,
      overview: item.overview,
    }));
  }, [validItems]);

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

  // Autoplay rotation every 8 seconds (paused when tab is hidden or user interacts)
  useEffect(() => {
    if (validItems.length <= 1 || isPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      handleNext();
    }, 8000);

    return () => clearInterval(interval);
  }, [validItems.length, isPaused, prefersReducedMotion, handleNext]);

  const handleSlideChange = useCallback((newIndex: number) => {
    setCurrentIndex(newIndex);
  }, []);

  if (validItems.length === 0 || !current) return null;

  const typeLabel =
    current.type === 'anime'
      ? 'Anime'
      : current.type === 'tv'
      ? 'Serial TV'
      : 'Film';
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

  const lastHistory = storage.getHistory().find((h) => h.id === current.id);
  const targetSeason = lastHistory?.season ?? 1;
  const targetEpisode = lastHistory?.episode ?? 1;
  const hasHistory = Boolean(
    lastHistory && (lastHistory.season || lastHistory.episode)
  );

  const playPath =
    current.type === 'anime'
      ? `/watch/anime/${current.id}/1/${targetEpisode}`
      : current.type === 'tv'
      ? `/watch/tv/${current.id}/${targetSeason}/${targetEpisode}`
      : `/watch/movie/${current.id}`;

  return (
    <section
      className="relative z-10 w-full overflow-hidden bg-transparent select-none mb-4 sm:mb-10 pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 min-h-[580px] sm:min-h-[640px] lg:min-h-[680px] flex flex-col justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-label="Tayangan Unggulan"
    >
      {/* Ambient Atmospheric Backdrop Artwork */}
      <div
        key={current.id || currentIndex}
        className="absolute inset-0 z-0 animate-in fade-in duration-700 ease-out will-change-[opacity]"
      >
        <img
          src={optimizeTmdbImage(current.backdrop || current.poster, 'w1280')}
          srcSet={getTmdbBackdropSrcSet(current.backdrop || current.poster)}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1920px"
          alt={current.title}
          width={1280}
          height={720}
          loading={currentIndex === 0 ? 'eager' : 'lazy'}
          // @ts-ignore
          fetchPriority={currentIndex === 0 ? 'high' : 'auto'}
          decoding="async"
          className="w-full h-full object-cover object-center relative z-0 select-none opacity-40 sm:opacity-50 scale-105 blur-[2px] sm:blur-[3px] transition-all duration-700"
        />

        {/* Top Vignette for seamless contrast under floating Navbar */}
        <div className="absolute inset-x-0 top-0 h-32 sm:h-40 bg-gradient-to-b from-[#06070B] via-[#06070B]/70 to-transparent pointer-events-none z-[1]" />

        {/* Seamless Apple iOS Vignette Blend */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070B] via-[#06070B]/60 to-transparent pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070B]/85 via-[#06070B]/50 to-transparent lg:w-3/4 pointer-events-none z-[1]" />
      </div>

      {/* Hero Showcase Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
          
          {/* Movie Details Column (Desktop: Left, Mobile: Below Cards) */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-center space-y-3 sm:space-y-4 pt-4 lg:pt-0">
            {/* Metadata Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="px-2.5 sm:px-3 py-1 rounded-full liquid-glass text-white/90 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider shadow-sm">
                {typeLabel}
              </span>
              {current.rating && parseFloat(current.rating) > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full liquid-glass text-white text-[10px] sm:text-[11px] font-bold shadow-sm">
                  <Star className="w-3 h-3 fill-current text-amber-400" />
                  <span>{current.rating}</span>
                </span>
              )}
              <span className="text-[11px] sm:text-xs text-white/70 font-medium px-1">
                {current.year}
              </span>
              {current.genres && current.genres.length > 0 && (
                <span className="text-xs text-white/60 hidden sm:inline">
                  • {current.genres.slice(0, 3).join(', ')}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-[-0.035em] leading-[1.12] line-clamp-2 drop-shadow-md">
              {current.title}
            </h1>

            {/* Synopsis */}
            <p className="text-xs sm:text-sm text-white/75 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-xl font-normal">
              {translatedOverview ||
                current.overview ||
                'Sinopsis belum tersedia untuk tayangan ini.'}
            </p>

            {/* Liquid Glass Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 flex-wrap">
              {/* Putar Button */}
              <button
                onClick={() => navigate(playPath)}
                className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4 xs:px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-white text-[#06070B] hover:bg-white/90 font-bold text-xs sm:text-sm shadow-[0_8px_25px_rgba(255,255,255,0.25)] ios-spring cursor-pointer min-h-[40px] sm:min-h-[46px] shrink-0"
              >
                <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current ml-0.5 text-[#06070B]" />
                <span>
                  {hasHistory &&
                  (current.type === 'tv' || current.type === 'anime')
                    ? `Lanjutkan (Ep ${targetEpisode})`
                    : 'Putar'}
                </span>
              </button>

              {/* Daftar Saya */}
              <button
                onClick={handleToggleMyList}
                className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 xs:px-4 sm:px-5 py-2.5 sm:py-3 rounded-full liquid-glass liquid-specular text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[40px] sm:min-h-[46px] ios-spring shrink-0 ${
                  saved
                    ? 'text-white bg-white/[0.22] font-bold shadow-md'
                    : 'text-white hover:bg-white/[0.14]'
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

          {/* 3D Coverflow Movie Cards Showcase (Desktop: Right, Mobile: Top) */}
          <div className="order-1 lg:order-2 lg:col-span-7 w-full overflow-visible">
            <CoverflowCarousel
              slides={slides}
              selectedIndex={currentIndex}
              onSlideChange={handleSlideChange}
              onCardClick={(slide) => {
                const targetPath =
                  slide.type === 'anime'
                    ? `/watch/anime/${slide.id}/1/1`
                    : slide.type === 'tv'
                    ? `/watch/tv/${slide.id}/1/1`
                    : `/watch/movie/${slide.id}`;
                navigate(targetPath);
              }}
              cardWidth="clamp(145px, 22vw, 240px)"
              rotate={42}
              depth={0.65}
              perspective={3.2}
              falloff={0.55}
              fade={0.12}
              gap={0.06}
              loop={true}
              showNavigation={true}
              showPagination={true}
            />
          </div>

        </div>
      </div>
    </section>
  );
};
