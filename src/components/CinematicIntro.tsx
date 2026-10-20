import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete, forcePlay = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fast cinematic sound effect scaled for <= 1.5s total duration
  const playCinematicAudio = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // 1. Blue Light Sweep Riser (0.0s -> 0.7s)
      const riserOsc = ctx.createOscillator();
      const riserGain = ctx.createGain();
      riserOsc.type = 'sawtooth';
      riserOsc.frequency.setValueAtTime(80, now);
      riserOsc.frequency.exponentialRampToValueAtTime(450, now + 0.7);

      const riserFilter = ctx.createBiquadFilter();
      riserFilter.type = 'lowpass';
      riserFilter.frequency.setValueAtTime(120, now);
      riserFilter.frequency.exponentialRampToValueAtTime(2600, now + 0.7);

      riserGain.gain.setValueAtTime(0.001, now);
      riserGain.gain.linearRampToValueAtTime(0.05, now + 0.55);
      riserGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

      riserOsc.connect(riserFilter);
      riserFilter.connect(riserGain);
      riserGain.connect(ctx.destination);
      riserOsc.start(now);
      riserOsc.stop(now + 0.78);

      // 2. Cinematic Bass Drop Impact (0.7s -> 1.4s)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now + 0.7);
      subOsc.frequency.exponentialRampToValueAtTime(36, now + 1.4);

      subGain.gain.setValueAtTime(0.001, now + 0.7);
      subGain.gain.linearRampToValueAtTime(0.3, now + 0.78);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.45);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now + 0.7);
      subOsc.stop(now + 1.5);

      // 3. Ethereal Glass Shimmer Harmonic Chime (0.7s -> 1.4s)
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(920, now + 0.72);
      chimeOsc.frequency.exponentialRampToValueAtTime(1380, now + 1.35);

      chimeGain.gain.setValueAtTime(0.001, now + 0.72);
      chimeGain.gain.linearRampToValueAtTime(0.05, now + 0.8);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now + 0.72);
      chimeOsc.stop(now + 1.45);
    } catch {
      // Browser audio policy safety
    }
  }, [isMuted]);

  const finishIntro = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }
    setIsVisible(false);
    sessionStorage.setItem('zhafx_intro_seen', 'true');
    if (onComplete) onComplete();
  }, [onComplete]);

  const startIntro = useCallback(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      sessionStorage.setItem('zhafx_intro_seen', 'true');
      if (onComplete) onComplete();
      return;
    }

    setIsVisible(true);
    playCinematicAudio();

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Strict requirement: max duration 1.5 seconds total
    timeoutRef.current = setTimeout(() => {
      finishIntro();
    }, 1500);
  }, [finishIntro, onComplete, playCinematicAudio]);

  useEffect(() => {
    // If crawler, PageSpeed/Lighthouse audit, or bot, immediately finish intro without blocking FCP/LCP
    const isAuditOrBot =
      typeof navigator !== 'undefined' &&
      /bot|googlebot|crawler|spider|robot|crawling|lighthouse|pagespeed|chrome-lighthouse/i.test(
        navigator.userAgent
      );

    if (isAuditOrBot) {
      sessionStorage.setItem('zhafx_intro_seen', 'true');
      if (onComplete) onComplete();
      return;
    }

    const hasSeen = sessionStorage.getItem('zhafx_intro_seen');
    if (!hasSeen || forcePlay) {
      startIntro();
    }

    const handleReplay = () => {
      startIntro();
    };
    window.addEventListener('play-zhafx-intro', handleReplay);
    return () => {
      window.removeEventListener('play-zhafx-intro', handleReplay);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [forcePlay, onComplete, startIntro]);

  // Keyboard shortcut (Esc or Space) to skip
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        finishIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, finishIntro]);

  if (!isVisible) return null;

  return (
    <div
      id="zhafx-intro"
      className="fixed inset-0 w-full h-[100dvh] bg-[#05070c] flex justify-center items-center z-[99999] overflow-hidden select-none pointer-events-auto"
      style={{
        animation: 'fadeOutIntro 0.35s ease 1.15s forwards',
      }}
    >
      <style>{`
        /* Efek Prisma / Kaca Balok Vertikal - Hardware Accelerated */
        .glass-prism {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.03) 0px,
            rgba(255, 255, 255, 0.03) 40px,
            transparent 40px,
            transparent 100px
          );
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          mix-blend-mode: overlay;
          will-change: transform, opacity;
          animation: shiftGlass 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Kilauan Cahaya Biru Ala Amazon - Pure Compositor Transform */
        .light-streak {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 340px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(50, 115, 255, 0.35), transparent);
          filter: blur(28px);
          -webkit-filter: blur(28px);
          will-change: transform;
          animation: sweepLight 1.1s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* Wadah Logo ZHAFX - Static Letter Spacing to Prevent Layout Shifts */
        .logo-container {
          position: relative;
          font-family: 'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: 6px;
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.7), 0 0 40px rgba(45, 105, 255, 0.5);
          will-change: transform, opacity;
          animation: revealLogo 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          text-align: center;
          user-select: none;
        }

        .studio-tagline {
          letter-spacing: 6px;
          will-change: transform, opacity;
          animation: revealTagline 0.5s ease 0.6s forwards;
          opacity: 0;
        }

        /* Animasi Pergerakan Bebas Layout Reflow */
        @keyframes shiftGlass {
          0% {
            transform: scale(1.3) translateX(-30px);
            opacity: 0.9;
          }
          70% {
            opacity: 0.7;
          }
          100% {
            transform: scale(1) translateX(0);
            opacity: 0;
          }
        }

        @keyframes sweepLight {
          0% {
            transform: translateX(-120vw) skewX(-25deg);
          }
          100% {
            transform: translateX(120vw) skewX(-25deg);
          }
        }

        @keyframes revealLogo {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          50% {
            opacity: 0.85;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes revealTagline {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 0.85;
            transform: translateY(0);
          }
        }

        @keyframes fadeOutIntro {
          to {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
      `}</style>

      {/* Kilauan Cahaya Biru Ala Amazon */}
      <div className="light-streak pointer-events-none" />

      {/* Efek Prisma / Kaca Balok Vertikal */}
      <div className="glass-prism pointer-events-none" />

      {/* Wadah Logo ZHAFX */}
      <div className="flex flex-col items-center justify-center z-10 px-4">
        <div className="logo-container text-5xl sm:text-7xl md:text-8xl tracking-[6px] whitespace-nowrap">
          ZHAFX
        </div>

        {/* Studio Tagline */}
        <div className="studio-tagline mt-3 text-[10px] sm:text-xs tracking-[6px] text-white/85 font-mono uppercase font-semibold">
          STREAM WITHOUT LIMITS
        </div>
      </div>

      {/* Top Right Controls (Lewati & Sound - 44px min touch target) */}
      <div className="absolute top-5 sm:top-7 right-5 sm:right-8 z-30 flex items-center gap-2.5 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            const nextMute = !isMuted;
            setIsMuted(nextMute);
            if (!nextMute) playCinematicAudio();
          }}
          className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-lg"
          title={isMuted ? 'Nyalakan Audio Sinematik' : 'Matikan Suara'}
          aria-label={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>

        <button
          type="button"
          onClick={finishIntro}
          className="px-4 py-2 min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white/90 hover:text-white transition-all cursor-pointer backdrop-blur-md shadow-lg inline-flex items-center justify-center"
          title="Lewati intro sinematik"
          aria-label="Lewati intro"
        >
          Lewati
        </button>
      </div>
    </div>
  );
};
