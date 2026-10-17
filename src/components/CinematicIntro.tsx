import React, { useEffect, useState, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Volume2, VolumeX } from 'lucide-react';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete, forcePlay = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const beamRef = useRef<HTMLDivElement | null>(null);
  const flareRef = useRef<HTMLDivElement | null>(null);
  const titleLettersRef = useRef<HTMLDivElement | null>(null);
  const subtitleRef = useRef<HTMLDivElement | null>(null);
  const auraGlowRef = useRef<HTMLDivElement | null>(null);
  const prismLineRef = useRef<HTMLDivElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cinematic Amazon Original 2020 inspired audio chord & deep sub swell
  const playCinematicAudio = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;

      // 1. Deep Sub Woofer Drone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(55, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + 3.0);
      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.12, now + 0.5);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.4);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 3.6);

      // 2. Anamorphic Chime Harmonic Chord (Amazon Prime style glass swell)
      const frequencies = [220, 330, 440, 660];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + 0.4);
        osc.frequency.linearRampToValueAtTime(freq * 1.01, now + 2.5);

        gain.gain.setValueAtTime(0.0001, now + 0.4);
        gain.gain.linearRampToValueAtTime(0.025 / (idx + 1), now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.4);
        osc.stop(now + 3.4);
      });
    } catch {
      // Safe fallback
    }
  }, [isMuted]);

  const finishIntro = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.inOut',
        onComplete: () => {
          setIsVisible(false);
          sessionStorage.setItem('zhafx_intro_seen', 'true');
          if (onComplete) onComplete();
        },
      });
    } else {
      setIsVisible(false);
      sessionStorage.setItem('zhafx_intro_seen', 'true');
      if (onComplete) onComplete();
    }
  }, [onComplete]);

  // Amazon Original 2020 Animation Sequence
  const runAmazonStyleSequence = useCallback(() => {
    setIsVisible(true);

    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      setTimeout(() => finishIntro(), 500);
      return;
    }

    playCinematicAudio();

    const tl = gsap.timeline({
      onComplete: finishIntro,
    });
    timelineRef.current = tl;

    // Reset components
    if (containerRef.current) gsap.set(containerRef.current, { opacity: 1 });
    if (beamRef.current) gsap.set(beamRef.current, { scaleX: 0, opacity: 0 });
    if (prismLineRef.current) gsap.set(prismLineRef.current, { x: '-100%', opacity: 0 });
    if (flareRef.current) gsap.set(flareRef.current, { x: '-60vw', opacity: 0, scale: 0.4 });
    if (auraGlowRef.current) gsap.set(auraGlowRef.current, { opacity: 0, scale: 0.8 });
    if (subtitleRef.current) gsap.set(subtitleRef.current, { opacity: 0, y: 10 });

    const letters = titleLettersRef.current ? Array.from(titleLettersRef.current.children) : [];
    if (letters.length > 0) {
      gsap.set(letters, { opacity: 0, y: 15, filter: 'blur(10px)' });
    }

    // 0.0 - 0.7s: Deep cosmic darkness with subtle amber-cyan aura bloom
    tl.to(
      auraGlowRef.current,
      {
        opacity: 0.8,
        scale: 1.1,
        duration: 1.2,
        ease: 'power2.out',
      },
      0.1
    );

    // 0.4 - 1.6s: Prismatic light beam sweeps across horizontally
    tl.to(
      beamRef.current,
      {
        scaleX: 1,
        opacity: 0.9,
        duration: 0.9,
        ease: 'power3.out',
      },
      0.3
    );

    tl.fromTo(
      prismLineRef.current,
      { x: '-100%', opacity: 0 },
      {
        x: '100%',
        opacity: 1,
        duration: 1.6,
        ease: 'power2.inOut',
      },
      0.4
    );

    // 0.6 - 2.2s: Anamorphic lens flare sweeps from left to right across the title
    tl.fromTo(
      flareRef.current,
      { x: '-50vw', opacity: 0, scale: 0.6 },
      {
        x: '50vw',
        opacity: 0.95,
        scale: 1.2,
        duration: 1.8,
        ease: 'power1.inOut',
      },
      0.5
    );

    // 0.8 - 1.8s: Letters "Z H A F X" reveal with optical blur-to-sharp precision
    if (letters.length > 0) {
      tl.to(
        letters,
        {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          stagger: 0.08,
          duration: 0.8,
          ease: 'power2.out',
        },
        0.7
      );
    }

    // 1.5 - 2.4s: "ORIGINAL" or "STREAMING" subtitle reveals cleanly
    tl.to(
      subtitleRef.current,
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: 'power2.out',
      },
      1.4
    );

    // 1.8 - 2.8s: Lens flare fades out as title settles in pure majestic clarity
    tl.to(
      flareRef.current,
      {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      },
      2.0
    );

    tl.to(
      beamRef.current,
      {
        opacity: 0.4,
        scaleY: 0.5,
        duration: 0.8,
        ease: 'power2.out',
      },
      2.2
    );

    // 3.0 - 3.7s: Smooth cinematic crossfade into homepage
    tl.to(
      containerRef.current,
      {
        opacity: 0,
        duration: 0.7,
        ease: 'power2.inOut',
      },
      3.0
    );
  }, [finishIntro, isMuted, playCinematicAudio]);

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('zhafx_intro_seen');
    if (!hasSeen || forcePlay) {
      const timer = setTimeout(() => {
        runAmazonStyleSequence();
      }, 50);
      return () => clearTimeout(timer);
    }

    const handleReplay = () => {
      runAmazonStyleSequence();
    };
    window.addEventListener('play-zhafx-intro', handleReplay);
    return () => window.removeEventListener('play-zhafx-intro', handleReplay);
  }, [forcePlay, runAmazonStyleSequence]);

  // Keyboard shortcut to skip
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
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden select-none bg-[#030408] text-white flex items-center justify-center"
      style={{ willChange: 'opacity' }}
    >
      {/* Background Deep Cosmic Gradient */}
      <div
        ref={bgRef}
        className="absolute inset-0 bg-gradient-to-b from-[#020306] via-[#050813] to-[#010204]"
      >
        {/* Fine Star Dust Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(18,28,52,0.45)_0%,rgba(0,0,0,0.95)_75%)]" />
      </div>

      {/* Central Ambient Aura Bloom */}
      <div
        ref={auraGlowRef}
        className="absolute w-[600px] h-[300px] rounded-full blur-[90px] bg-gradient-to-r from-cyan-600/25 via-blue-500/20 to-amber-500/25 pointer-events-none"
      />

      {/* Horizontal Prismatic Anamorphic Beam (Amazon Original Signature) */}
      <div
        ref={beamRef}
        className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none opacity-0 shadow-[0_0_24px_rgba(56,189,248,0.85)]"
        style={{ transformOrigin: 'center' }}
      />

      {/* Sweeping Prismatic Caustic Line */}
      <div
        ref={prismLineRef}
        className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white via-amber-300 to-transparent pointer-events-none blur-[0.5px]"
      />

      {/* Anamorphic Lens Flare Starburst */}
      <div
        ref={flareRef}
        className="absolute pointer-events-none flex items-center justify-center opacity-0 z-20"
      >
        {/* Core hot spark */}
        <div className="w-12 h-12 rounded-full bg-white blur-[2px] shadow-[0_0_40px_rgba(255,255,255,0.95)]" />
        {/* Horizontal ray streak */}
        <div className="absolute w-[450px] h-[2px] bg-gradient-to-r from-transparent via-cyan-300 to-transparent blur-[1px]" />
        {/* Vertical subtle ray */}
        <div className="absolute h-[120px] w-[2px] bg-gradient-to-b from-transparent via-amber-200 to-transparent blur-[1px]" />
      </div>

      {/* Main Studio Typography (Amazon Original 2020 Architectural Aesthetic) */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        {/* Signature Brand Letters */}
        <div
          ref={titleLettersRef}
          className="flex items-center justify-center gap-3 sm:gap-6 md:gap-8"
        >
          {['Z', 'H', 'A', 'F', 'X'].map((letter, idx) => (
            <span
              key={idx}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-white tracking-widest select-none drop-shadow-[0_0_25px_rgba(255,255,255,0.45)]"
              style={{
                fontFamily: '"Plus Jakarta Sans", -apple-system, sans-serif',
                fontWeight: 300,
              }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Elegant Studio Subtitle */}
        <div
          ref={subtitleRef}
          className="mt-4 sm:mt-6 flex items-center gap-3 opacity-0"
        >
          <div className="w-8 sm:w-14 h-[1px] bg-gradient-to-r from-transparent to-[#FFB224]/70" />
          <span
            className="text-[10px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.45em] text-[#FFB224] drop-shadow-[0_0_12px_rgba(255,178,36,0.6)]"
            style={{ letterSpacing: '0.45em' }}
          >
            ORIGINAL
          </span>
          <div className="w-8 sm:w-14 h-[1px] bg-gradient-to-l from-transparent to-[#FFB224]/70" />
        </div>
      </div>

      {/* Top Right Controls: Audio Toggle & Skip */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-40 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            const nextMute = !isMuted;
            setIsMuted(nextMute);
            if (!nextMute) playCinematicAudio();
          }}
          className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
          title={isMuted ? 'Nyalakan Efek Suara' : 'Matikan Suara'}
          aria-label={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#FFB224]" />}
        </button>

        <button
          onClick={finishIntro}
          className="px-3.5 py-1.5 rounded-full liquid-glass text-xs font-medium text-white/80 hover:text-white transition-all cursor-pointer ios-spring"
          title="Lewati intro sinematik"
          aria-label="Lewati intro"
        >
          Lewati
        </button>
      </div>
    </div>
  );
};
