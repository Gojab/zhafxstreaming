import React, { useState, useEffect } from 'react';
import { useActiveMedia } from '../context/ActiveMediaContext';

export const LiquidBackground: React.FC = () => {
  const { activePoster } = useActiveMedia();
  const [currentPoster, setCurrentPoster] = useState<string>(activePoster);
  const [prevPoster, setPrevPoster] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);
  const [isTabActive, setIsTabActive] = useState<boolean>(() =>
    typeof document !== 'undefined' ? !document.hidden : true
  );

  // Pause heavy background animations when browser tab is inactive to eliminate CPU & TBT load
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabActive(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility, { passive: true });
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (activePoster && activePoster !== currentPoster) {
      setPrevPoster(currentPoster);
      setCurrentPoster(activePoster);
      setIsCrossfading(true);

      const timer = setTimeout(() => {
        setIsCrossfading(false);
        setPrevPoster(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [activePoster, currentPoster]);

  const animationStyle = {
    animationPlayState: isTabActive ? 'running' : 'paused',
    willChange: 'transform',
    transform: 'translate3d(0, 0, 0)',
    backfaceVisibility: 'hidden',
  } as React.CSSProperties;

  return (
    <div
      aria-hidden="true"
      style={{ contain: 'strict' }}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#06070B]"
    >
      {/* Previous poster fading out during crossfade */}
      {prevPoster && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
            isCrossfading ? 'opacity-0' : 'opacity-35'
          }`}
          style={{ willChange: 'opacity' }}
        >
          <img
            src={prevPoster}
            alt=""
            width={1280}
            height={720}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover scale-110 filter blur-[45px] sm:blur-[60px] opacity-80"
          />
        </div>
      )}

      {/* Current active poster */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isCrossfading ? 'opacity-35' : 'opacity-35'
        }`}
        style={{ willChange: 'opacity' }}
      >
        <img
          src={currentPoster}
          alt=""
          width={1280}
          height={720}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover scale-110 filter blur-[45px] sm:blur-[60px] opacity-80"
        />
      </div>

      {/* 3 Lightweight Hardware-Accelerated Ambient Glass Blobs */}
      <div
        style={animationStyle}
        className="absolute -top-28 -left-28 w-[420px] h-[420px] rounded-full bg-radial from-white/[0.05] via-white/[0.02] to-transparent filter blur-[40px] animate-blob-1"
      />
      <div
        style={animationStyle}
        className="absolute top-1/3 -right-32 w-[480px] h-[480px] rounded-full bg-radial from-white/[0.04] via-white/[0.015] to-transparent filter blur-[50px] animate-blob-2"
      />
      <div
        style={animationStyle}
        className="absolute -bottom-28 left-1/4 w-[400px] h-[400px] rounded-full bg-radial from-white/[0.035] via-white/[0.01] to-transparent filter blur-[40px] animate-blob-3"
      />

      {/* Soft dark radial & vertical gradient for perfect typography legibility */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#06070B]/50 to-[#06070B]/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06070B]/35 via-transparent to-[#06070B]/95" />
    </div>
  );
};
