import React, { useState, useEffect, useRef } from 'react';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { optimizeTmdbImage } from '../lib/image';

export const LiquidBackground: React.FC = () => {
  const { activePoster } = useActiveMedia();
  const [currentPoster, setCurrentPoster] = useState<string>(activePoster);
  const [prevPoster, setPrevPoster] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);
  const [isTabActive, setIsTabActive] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pause heavy background animations when browser tab is inactive
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility, { passive: true });
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Pause continuous background blob animations during active scrolling for locked 60/120 FPS
  useEffect(() => {
    const handleScroll = () => {
      if (!isScrolling) setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isScrolling]);

  useEffect(() => {
    if (activePoster && activePoster !== currentPoster) {
      setPrevPoster(currentPoster);
      setCurrentPoster(activePoster);
      setIsCrossfading(true);

      const timer = setTimeout(() => {
        setIsCrossfading(false);
        setPrevPoster(null);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [activePoster, currentPoster]);

  const animationPlayState = !isTabActive || isScrolling ? 'paused' : 'running';

  const animationStyle = {
    animationPlayState,
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
  } as React.CSSProperties;

  // Use ultra-lightweight w300 thumbnail for blurred background to save 95% bandwidth and decode time
  const optimizedPrev = prevPoster ? optimizeTmdbImage(prevPoster, 'w300') : null;
  const optimizedCurrent = currentPoster ? optimizeTmdbImage(currentPoster, 'w300') : '';

  return (
    <div
      aria-hidden="true"
      style={{ contain: 'strict', willChange: 'auto' }}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#06070B]"
    >
      {/* Previous poster fading out during crossfade */}
      {optimizedPrev && (
        <div
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            isCrossfading ? 'opacity-0' : 'opacity-30'
          }`}
          style={{ willChange: isCrossfading ? 'opacity' : 'auto' }}
        >
          <img
            src={optimizedPrev}
            alt=""
            width={300}
            height={169}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover scale-105 filter blur-[24px] sm:blur-[32px] opacity-75 transform-gpu"
          />
        </div>
      )}

      {/* Current active poster */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
          isCrossfading ? 'opacity-30' : 'opacity-30'
        }`}
        style={{ willChange: isCrossfading ? 'opacity' : 'auto' }}
      >
        <img
          src={optimizedCurrent}
          alt=""
          width={300}
          height={169}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover scale-105 filter blur-[24px] sm:blur-[32px] opacity-75 transform-gpu"
        />
      </div>

      {/* Hardware-Accelerated Ambient Glass Blobs (hidden on small mobile to preserve battery & high FPS) */}
      <div
        style={animationStyle}
        className="hidden md:block absolute -top-28 -left-28 w-[380px] h-[380px] rounded-full bg-radial from-white/[0.04] via-white/[0.015] to-transparent blur-md animate-blob-1 transform-gpu"
      />
      <div
        style={animationStyle}
        className="hidden md:block absolute top-1/3 -right-32 w-[420px] h-[420px] rounded-full bg-radial from-white/[0.035] via-white/[0.01] to-transparent blur-md animate-blob-2 transform-gpu"
      />
      <div
        style={animationStyle}
        className="hidden md:block absolute -bottom-28 left-1/4 w-[360px] h-[360px] rounded-full bg-radial from-white/[0.03] via-white/[0.008] to-transparent blur-md animate-blob-3 transform-gpu"
      />

      {/* Soft dark radial & vertical gradient for perfect typography legibility */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#06070B]/50 to-[#06070B]/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06070B]/35 via-transparent to-[#06070B]/95" />
    </div>
  );
};
