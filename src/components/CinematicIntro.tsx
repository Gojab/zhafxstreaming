import React, { useEffect, useState, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Volume2, VolumeX, X } from 'lucide-react';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

interface GlassPanel {
  id: number;
  width: number;
  leftPct: number;
  refractOffset: number;
  edgeColor: string;
}

const GLITCH_CHARS = ['Z', 'H', 'A', 'F', 'X', '7', '0', '1', '/', '|', '#'];

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete, forcePlay = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [glitchText, setGlitchText] = useState('ZHAFX');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lightSweepsRef = useRef<HTMLDivElement | null>(null);
  const leftBloomRef = useRef<HTMLDivElement | null>(null);
  const centerTextRef = useRef<HTMLDivElement | null>(null);
  const finalTitleRef = useRef<HTMLDivElement | null>(null);
  const panelsContainerRef = useRef<HTMLDivElement | null>(null);
  const bgLayerRef = useRef<HTMLDivElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Generate panels depending on device screen
  const [panels, setPanels] = useState<GlassPanel[]>([]);

  useEffect(() => {
    const isMobile = window.innerWidth < 640;
    const panelCount = isMobile ? 6 : 14;
    const colors = [
      'rgba(255, 138, 76, 0.7)', // #FF8A4C Orange
      'rgba(59, 108, 255, 0.7)', // #3B6CFF Blue
      'rgba(255, 94, 138, 0.65)', // Pink
      'rgba(147, 51, 234, 0.6)', // Purple
    ];

    const generated: GlassPanel[] = [];
    const step = 100 / panelCount;
    for (let i = 0; i < panelCount; i++) {
      const width = isMobile ? 30 + Math.random() * 40 : 35 + Math.random() * 85;
      const leftPct = i * step + (Math.random() * 4 - 2);
      const refractOffset = (Math.random() - 0.5) * (isMobile ? 24 : 48);
      const edgeColor = colors[i % colors.length];
      generated.push({ id: i, width, leftPct, refractOffset, edgeColor });
    }
    setPanels(generated);
  }, []);

  // Web Audio subtle shimmer sound
  const playShimmerSound = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      // Ambient sub drone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, ctx.currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 3.5);
      subGain.gain.setValueAtTime(0.001, ctx.currentTime);
      subGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.8);
      subGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.8);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(ctx.currentTime);
      subOsc.stop(ctx.currentTime + 4.0);

      // Shimmer sweep
      const shimmer = ctx.createOscillator();
      const sGain = ctx.createGain();
      shimmer.type = 'triangle';
      shimmer.frequency.setValueAtTime(380, ctx.currentTime + 0.8);
      shimmer.frequency.exponentialRampToValueAtTime(920, ctx.currentTime + 2.5);
      sGain.gain.setValueAtTime(0.0001, ctx.currentTime + 0.8);
      sGain.gain.linearRampToValueAtTime(0.025, ctx.currentTime + 1.8);
      sGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.6);
      shimmer.connect(sGain);
      sGain.connect(ctx.destination);
      shimmer.start(ctx.currentTime + 0.8);
      shimmer.stop(ctx.currentTime + 3.8);
    } catch {
      // Browser audio policy safe
    }
  }, [isMuted]);

  const finishIntro = useCallback(() => {
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    if (glitchIntervalRef.current) {
      clearInterval(glitchIntervalRef.current);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
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

  // Main Intro Sequence (Total ±4.2 seconds)
  const runAnimationSequence = useCallback(() => {
    setIsVisible(true);

    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      setTimeout(() => finishIntro(), 600);
      return;
    }

    // Easing matching user request: cubic-bezier(0.22, 1, 0.36, 1)
    const iosEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

    playShimmerSound();

    const tl = gsap.timeline({
      onComplete: finishIntro,
    });
    timelineRef.current = tl;

    // Reset initial states
    if (containerRef.current) gsap.set(containerRef.current, { opacity: 1 });
    if (bgLayerRef.current) gsap.set(bgLayerRef.current, { backgroundColor: '#000000' });
    if (leftBloomRef.current) gsap.set(leftBloomRef.current, { opacity: 0, x: -30 });
    if (centerTextRef.current) gsap.set(centerTextRef.current, { opacity: 0, scale: 0.95 });
    if (finalTitleRef.current) gsap.set(finalTitleRef.current, { opacity: 0 });
    if (panelsContainerRef.current) gsap.set(panelsContainerRef.current, { opacity: 0 });

    // 1. 0 – 0.8s: Layar hitam pekat. Garis cahaya vertikal menyapu. Huruf putih "ZHAFX" menyala di sisi kiri
    tl.to(
      leftBloomRef.current,
      {
        opacity: 0.9,
        x: 0,
        duration: 0.7,
        ease: iosEase,
      },
      0.1
    );

    if (lightSweepsRef.current) {
      tl.fromTo(
        lightSweepsRef.current.children,
        { scaleY: 0, opacity: 0, transformOrigin: 'top' },
        {
          scaleY: 1,
          opacity: 0.5,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power2.inOut',
        },
        0.05
      );
    }

    // 2. 0.8 – 2.0s: Belasan panel kaca vertikal bergeser melintasi layar.
    // Latar berubah jadi abu-biru berkabut (#2A3A4D) dengan sorotan biru terang.
    tl.to(
      leftBloomRef.current,
      {
        opacity: 0,
        duration: 0.35,
        ease: 'power1.out',
      },
      0.8
    );

    tl.to(
      bgLayerRef.current,
      {
        backgroundColor: '#2A3A4D',
        duration: 1.1,
        ease: iosEase,
      },
      0.8
    );

    tl.to(
      panelsContainerRef.current,
      {
        opacity: 1,
        duration: 0.3,
      },
      0.8
    );

    if (panelsContainerRef.current) {
      const panelElements = panelsContainerRef.current.children;
      tl.fromTo(
        panelElements,
        { x: (i) => (i % 2 === 0 ? -120 : 120), opacity: 0 },
        {
          x: 0,
          opacity: 1,
          stagger: 0.035,
          duration: 1.1,
          ease: iosEase,
        },
        0.8
      );
    }

    // 3. 2.0 – 2.8s: Teks "ZHAFX" huruf renggang muncul di tengah dengan efek glitch (±40ms per frame)
    tl.add(() => {
      let stepCount = 0;
      glitchIntervalRef.current = setInterval(() => {
        stepCount++;
        if (stepCount >= 18) {
          if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
          setGlitchText('ZHAFX');
        } else {
          // Scramble characters with jitter
          const scrambled = 'ZHAFX'
            .split('')
            .map((c) => (Math.random() > 0.45 ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] : c))
            .join('');
          setGlitchText(scrambled);
        }
      }, 40);
    }, 2.0);

    tl.fromTo(
      centerTextRef.current,
      { opacity: 0, scale: 0.94 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: iosEase,
      },
      2.0
    );

    // 4. 2.8 – 3.6s: Panel meredup, latar jadi biru tua gelap (#050814 ke #0B1230).
    // Teks "ZHAFX" putih bersih, sangat renggang (letter-spacing ±0.5em), font geometric thin, lebar ~55% layar.
    tl.to(
      panelsContainerRef.current,
      {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
      },
      2.7
    );

    tl.to(
      centerTextRef.current,
      {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out',
      },
      2.75
    );

    tl.to(
      bgLayerRef.current,
      {
        background: 'linear-gradient(180deg, #050814 0%, #0B1230 100%)',
        duration: 0.8,
        ease: iosEase,
      },
      2.8
    );

    tl.fromTo(
      finalTitleRef.current,
      { opacity: 0, scale: 0.98 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: iosEase,
      },
      2.85
    );

    // Hold steady for 0.5s from 3.1s to 3.6s

    // 5. 3.6 – 4.2s: Fade-out, beranda muncul halus.
    tl.to(
      containerRef.current,
      {
        opacity: 0,
        duration: 0.6,
        ease: iosEase,
      },
      3.6
    );
  }, [finishIntro, isMuted, playShimmerSound]);

  const runAnimationSequenceRef = useRef(runAnimationSequence);
  runAnimationSequenceRef.current = runAnimationSequence;

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('zhafx_intro_seen');
    if (!hasSeen || forcePlay) {
      const timer = setTimeout(() => {
        runAnimationSequenceRef.current();
      }, 50);
      return () => clearTimeout(timer);
    }

    const handleReplay = () => {
      runAnimationSequenceRef.current();
    };
    window.addEventListener('play-zhafx-intro', handleReplay);
    return () => window.removeEventListener('play-zhafx-intro', handleReplay);
  }, [forcePlay]);

  // Keyboard shortcut to skip (Escape or Space)
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
      className="fixed inset-0 z-50 overflow-hidden select-none bg-black text-white"
      style={{ willChange: 'opacity' }}
    >
      {/* Background Atmosphere Layer */}
      <div
        ref={bgLayerRef}
        className="absolute inset-0 transition-colors duration-700 bg-black"
      >
        {/* Soft Radial Spotlight at Center */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(59,108,255,0.22)_0%,transparent_65%)] pointer-events-none" />
      </div>

      {/* 0-0.8s: Thin Vertical Light Sweeps */}
      <div
        ref={lightSweepsRef}
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div className="absolute left-[15%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent" />
        <div className="absolute left-[28%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-blue-400/30 to-transparent" />
        <div className="absolute left-[42%] top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-transparent via-cyan-300/40 to-transparent" />
        <div className="absolute left-[70%] top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-white/30 to-transparent" />
      </div>

      {/* 0-0.8s: Left Bloom Typography */}
      <div
        ref={leftBloomRef}
        className="absolute left-6 sm:left-16 top-1/2 -translate-y-1/2 z-10 pointer-events-none opacity-0"
      >
        <span
          className="text-4xl sm:text-6xl md:text-7xl font-light text-white tracking-[0.25em] drop-shadow-[0_0_24px_rgba(255,255,255,0.8)] font-sans"
          style={{ fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif' }}
        >
          ZHAFX
        </span>
      </div>

      {/* 0.8-2.0s: Refracting Vertical Glass Panels Container */}
      <div
        ref={panelsContainerRef}
        className="absolute inset-0 pointer-events-none z-20 opacity-0 overflow-hidden"
      >
        {panels.map((p) => (
          <div
            key={p.id}
            className="absolute top-0 bottom-0 overflow-hidden"
            style={{
              left: `${p.leftPct}%`,
              width: `${p.width}px`,
              backdropFilter: 'blur(7px)',
              WebkitBackdropFilter: 'blur(7px)',
              mixBlendMode: 'screen',
              borderLeft: `1px solid ${p.edgeColor}`,
              borderRight: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: `inset 0 0 16px ${p.edgeColor}`,
            }}
          >
            {/* Edge gleam shine */}
            <div
              className="absolute inset-y-0 left-0 w-1 opacity-70"
              style={{ background: p.edgeColor }}
            />
            {/* Shifted text reflection inside panel */}
            <div
              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center whitespace-nowrap text-3xl sm:text-5xl font-light tracking-[0.4em] text-white/80 pointer-events-none select-none"
              style={{
                left: `-${(p.leftPct / 100) * window.innerWidth}px`,
                width: `${window.innerWidth}px`,
                transform: `translateY(-50%) translateX(${p.refractOffset}px)`,
                textShadow: `0 0 18px ${p.edgeColor}`,
              }}
            >
              ZHAFX
            </div>
          </div>
        ))}
      </div>

      {/* 2.0-2.8s: Center Glitch Typography */}
      <div
        ref={centerTextRef}
        className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none opacity-0"
      >
        <div className="relative">
          <span
            className="text-4xl sm:text-6xl md:text-7xl font-light text-white tracking-[0.38em] font-sans drop-shadow-[0_0_28px_rgba(59,108,255,0.7)]"
            style={{
              fontFamily: 'Plus Jakarta Sans, -apple-system, sans-serif',
              textShadow:
                '1.5px 0 #3B6CFF, -1.5px 0 #FF8A4C, 0 0 24px rgba(255,255,255,0.85)',
            }}
          >
            {glitchText}
          </span>
        </div>
      </div>

      {/* 2.8-3.6s: Pure Pristine Wide-Spaced "ZHAFX" with Subtle Glow */}
      <div
        ref={finalTitleRef}
        className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none opacity-0 px-4"
      >
        <div className="w-[85%] sm:w-[55%] text-center">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extralight text-white uppercase tracking-[0.5em] leading-none drop-shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            style={{
              fontFamily: 'Plus Jakarta Sans, "SF Pro Display", sans-serif',
              letterSpacing: '0.5em',
            }}
          >
            ZHAFX
          </h1>
          <div className="w-16 sm:w-24 h-[1px] bg-gradient-to-r from-transparent via-[#FFB224]/80 to-transparent mx-auto mt-4 sm:mt-6 opacity-80" />
        </div>
      </div>

      {/* Top Controls: Audio Shimmer Toggle & Lewati Button */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-40 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            const nextMute = !isMuted;
            setIsMuted(nextMute);
            if (!nextMute) playShimmerSound();
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
