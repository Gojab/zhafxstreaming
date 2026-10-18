import React, { useState, useEffect } from 'react';
import { useActiveMedia } from '../context/ActiveMediaContext';

export const LiquidBackground: React.FC = () => {
  const { activePoster } = useActiveMedia();
  const [currentPoster, setCurrentPoster] = useState<string>(activePoster);
  const [prevPoster, setPrevPoster] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);

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

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#06070B]"
    >
      {/* Previous poster fading out during crossfade */}
      {prevPoster && (
        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
            isCrossfading ? 'opacity-0' : 'opacity-40'
          }`}
        >
          <img
            src={prevPoster}
            alt=""
            className="w-full h-full object-cover scale-125 filter blur-[80px] sm:blur-[100px]"
          />
        </div>
      )}

      {/* Current active poster */}
      <div
        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
          isCrossfading ? 'opacity-40' : 'opacity-40'
        }`}
      >
        <img
          src={currentPoster}
          alt=""
          className="w-full h-full object-cover scale-125 filter blur-[80px] sm:blur-[100px]"
        />
      </div>

      {/* 3 Slow Moving Ambient Glass Luminous Blobs */}
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full bg-white/[0.04] filter blur-[100px] animate-blob-1 mix-blend-screen" />
      <div className="absolute top-1/3 -right-36 w-[620px] h-[620px] rounded-full bg-white/[0.03] filter blur-[120px] animate-blob-2 mix-blend-screen" />
      <div className="absolute -bottom-36 left-1/4 w-[500px] h-[500px] rounded-full bg-white/[0.025] filter blur-[95px] animate-blob-3 mix-blend-screen" />

      {/* Soft dark radial & vertical gradient for perfect typography legibility */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#06070B]/40 to-[#06070B]/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#06070B]/30 via-transparent to-[#06070B]/95" />
    </div>
  );
};
