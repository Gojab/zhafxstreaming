import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Logo } from './Logo';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete, forcePlay = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stage, setStage] = useState<'initial' | 'bloom' | 'sweep' | 'tagline' | 'done'>('initial');
  const timerRefs = useRef<NodeJS.Timeout[]>([]);
  const hasTriggeredAudio = useRef(false);

  const clearAllTimers = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  }, []);

  // Web Audio subtle cinematic chord / sub-bass rumble (safe, error-handled)
  const playCinematicSound = useCallback(() => {
    if (hasTriggeredAudio.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      hasTriggeredAudio.current = true;

      // 1. Deep cinematic sub-bass drone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, ctx.currentTime); // A1 note
      osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 2.2);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.5);

      // 2. High cinematic shimmer / sheen sweep harmonic
      const shimmerOsc = ctx.createOscillator();
      const shimmerGain = ctx.createGain();
      shimmerOsc.type = 'triangle';
      shimmerOsc.frequency.setValueAtTime(440, ctx.currentTime + 0.8);
      shimmerOsc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.8);

      shimmerGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.8);
      shimmerGain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 1.3);
      shimmerGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.3);

      shimmerOsc.connect(shimmerGain);
      shimmerGain.connect(ctx.destination);
      shimmerOsc.start(ctx.currentTime + 0.8);
      shimmerOsc.stop(ctx.currentTime + 2.4);
    } catch {
      // Audio autoplay policy might silently block if user hasn't interacted, which is completely expected
    }
  }, []);

  const handleFinish = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(true);
    const finishTimeout = setTimeout(() => {
      setIsVisible(false);
      sessionStorage.setItem('zhafx_intro_seen', 'true');
      if (onComplete) onComplete();
    }, 600);
    timerRefs.current.push(finishTimeout);
  }, [clearAllTimers, onComplete]);

  const startIntroSequence = useCallback(() => {
    clearAllTimers();
    setIsVisible(true);
    setIsFadingOut(false);
    setStage('initial');

    // Attempt subtle audio
    playCinematicSound();

    // Stage 1: Reveal logo with gentle bloom (350ms)
    const t1 = setTimeout(() => {
      setStage('bloom');
    }, 350);

    // Stage 2: Light sweep / sheen across logo (1100ms)
    const t2 = setTimeout(() => {
      setStage('sweep');
    }, 1100);

    // Stage 3: Tagline fade in (1700ms)
    const t3 = setTimeout(() => {
      setStage('tagline');
    }, 1700);

    // Stage 4: Cinematic dissolve out (2800ms)
    const t4 = setTimeout(() => {
      setIsFadingOut(true);
    }, 2800);

    // Stage 5: Unmount & finish (3400ms)
    const t5 = setTimeout(() => {
      setIsVisible(false);
      setStage('done');
      sessionStorage.setItem('zhafx_intro_seen', 'true');
      if (onComplete) onComplete();
    }, 3400);

    timerRefs.current = [t1, t2, t3, t4, t5];
  }, [clearAllTimers, handleFinish, onComplete, playCinematicSound]);

  useEffect(() => {
    const hasSeenIntro = sessionStorage.getItem('zhafx_intro_seen');
    if (!hasSeenIntro || forcePlay) {
      startIntroSequence();
    }

    // Custom event to replay intro on demand (e.g. from footer or settings)
    const handleReplayEvent = () => {
      startIntroSequence();
    };
    window.addEventListener('play-zhafx-intro', handleReplayEvent);

    return () => {
      clearAllTimers();
      window.removeEventListener('play-zhafx-intro', handleReplayEvent);
    };
  }, [forcePlay, startIntroSequence, clearAllTimers]);

  // Handle keyboard shortcuts (Escape or Space to skip instantly)
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleFinish]);

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Animasi Pembuka ZHAFX"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#030407] select-none cursor-pointer transition-opacity duration-700 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onClick={handleFinish}
    >
      {/* Cinematic Ambient Backdrop Glow (Spotlight behind logo) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-1000 ease-out flex items-center justify-center ${
          stage !== 'initial' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 0%, rgba(120, 119, 198, 0.03) 30%, rgba(3, 4, 7, 0.95) 70%, #030407 100%)',
        }}
      />

      {/* Subtle Horizontal Flare Line */}
      <div
        className={`absolute w-full max-w-2xl h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-1000 ease-out ${
          stage === 'sweep' || stage === 'tagline'
            ? 'opacity-80 scale-x-100'
            : 'opacity-0 scale-x-50'
        }`}
      />

      {/* Main Logo Showcase Container */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6">
        {/* Logo wrapper with smooth fade & subtle cinematic scale */}
        <div
          className={`relative transition-all duration-1000 ease-out transform ${
            stage === 'initial'
              ? 'opacity-0 scale-95 blur-sm'
              : 'opacity-100 scale-100 blur-0'
          }`}
        >
          {/* Official ZHAFX Logo Component with exact proportions & geometry */}
          <div className="relative overflow-hidden p-3 rounded-2xl">
            <Logo size="intro" asLink={false} />

            {/* Shimmer / Light Sweep Overlay across the logo */}
            <div
              className={`absolute inset-0 pointer-events-none transition-transform duration-1000 ease-in-out ${
                stage === 'sweep' || stage === 'tagline'
                  ? 'translate-x-[250%]'
                  : '-translate-x-[150%]'
              }`}
              style={{
                background:
                  'linear-gradient(105deg, transparent 20%, rgba(255, 255, 255, 0.35) 50%, transparent 80%)',
                width: '60%',
              }}
            />
          </div>
        </div>

        {/* Cinematic Tagline */}
        <div
          className={`mt-6 transition-all duration-800 delay-100 ease-out text-center ${
            stage === 'tagline'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-zinc-400 uppercase select-none drop-shadow-sm">
            YOUR NEXT WATCH STARTS HERE
          </span>
        </div>
      </div>

      {/* Skip Button (Top Right) */}
      <div className="absolute top-6 right-6 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="text-xs font-medium text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-white/20 transition-all cursor-pointer backdrop-blur-md"
          title="Lewati animasi (atau tekan Spasi / Esc)"
        >
          Lewati
        </button>
      </div>

      {/* Subtle Bottom Tip */}
      <div className="absolute bottom-6 z-20 text-[10px] text-zinc-600 tracking-wider">
        <span>Klik di mana saja untuk melanjutkan</span>
      </div>
    </div>
  );
};
