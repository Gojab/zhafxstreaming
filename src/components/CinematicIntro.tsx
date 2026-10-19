import React, { useEffect, useState, useRef, useCallback } from 'react';
import { gsap } from 'gsap';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete, forcePlay = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const starsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const shockwaveRef = useRef<HTMLDivElement | null>(null);
  const flareRef = useRef<HTMLDivElement | null>(null);
  const logoGroupRef = useRef<SVGGElement | null>(null);
  const arrowheadGleamRef = useRef<HTMLDivElement | null>(null);
  const taglineRef = useRef<HTMLDivElement | null>(null);
  const godRaysRef = useRef<HTMLDivElement | null>(null);
  const letterboxTopRef = useRef<HTMLDivElement | null>(null);
  const letterboxBottomRef = useRef<HTMLDivElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Web Audio Engine for Epic Cinema Soundscape (Ta-Dum / Braam / Shimmer)
  const playEpicCinematicAudio = useCallback(() => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // 1. Atmospheric Shepard Rising Tension Tone (0.0s -> 2.2s)
      const riserOsc = ctx.createOscillator();
      const riserGain = ctx.createGain();
      riserOsc.type = 'sawtooth';
      riserOsc.frequency.setValueAtTime(60, now);
      riserOsc.frequency.exponentialRampToValueAtTime(540, now + 2.1);
      
      const riserFilter = ctx.createBiquadFilter();
      riserFilter.type = 'lowpass';
      riserFilter.frequency.setValueAtTime(120, now);
      riserFilter.frequency.exponentialRampToValueAtTime(3200, now + 2.1);

      riserGain.gain.setValueAtTime(0.001, now);
      riserGain.gain.linearRampToValueAtTime(0.07, now + 1.8);
      riserGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);

      riserOsc.connect(riserFilter);
      riserFilter.connect(riserGain);
      riserGain.connect(ctx.destination);
      riserOsc.start(now);
      riserOsc.stop(now + 2.25);

      // 2. Heavy Sub-Bass Boom (The "Ta-Dum" Impact at 2.2s)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now + 2.15);
      subOsc.frequency.exponentialRampToValueAtTime(32, now + 3.8);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.setValueAtTime(0.001, now + 2.15);
      subGain.gain.linearRampToValueAtTime(0.38, now + 2.22);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now + 2.15);
      subOsc.stop(now + 4.3);

      // 3. Timpani Impact Body (Metallic & punchy punch at 2.2s)
      const punchOsc = ctx.createOscillator();
      const punchGain = ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(180, now + 2.18);
      punchOsc.frequency.exponentialRampToValueAtTime(45, now + 2.7);

      punchGain.gain.setValueAtTime(0.001, now);
      punchGain.gain.setValueAtTime(0.001, now + 2.18);
      punchGain.gain.linearRampToValueAtTime(0.25, now + 2.22);
      punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      punchOsc.connect(punchGain);
      punchGain.connect(ctx.destination);
      punchOsc.start(now + 2.18);
      punchOsc.stop(now + 3.3);

      // 4. Ethereal Glass Shimmer Harmonic Chime (2.2s -> 4.2s)
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(880, now + 2.2);
      chimeOsc.frequency.exponentialRampToValueAtTime(1320, now + 3.6);

      chimeGain.gain.setValueAtTime(0.001, now + 2.2);
      chimeGain.gain.linearRampToValueAtTime(0.06, now + 2.3);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.1);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(ctx.destination);
      chimeOsc.start(now + 2.2);
      chimeOsc.stop(now + 4.2);
    } catch {
      // Browser audio policy safety
    }
  }, [isMuted]);

  // Starfield particle simulation for cosmic 3D depth
  useEffect(() => {
    if (!isVisible) return;
    const canvas = starsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    const count = 120;
    const stars = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * width,
      size: Math.random() * 1.8 + 0.4,
      brightness: Math.random() * 0.8 + 0.2,
    }));

    const render = () => {
      ctx.fillStyle = '#030408';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < count; i++) {
        const s = stars[i];
        s.z -= 1.8;
        if (s.z <= 0) {
          s.z = width;
          s.x = (Math.random() - 0.5) * width * 1.5;
          s.y = (Math.random() - 0.5) * height * 1.5;
        }

        const k = 320 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          const alpha = (1 - s.z / width) * s.brightness;
          const radius = Math.max(0.5, s.size * k);
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', onResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isVisible]);

  const finishIntro = useCallback(() => {
    if (timelineRef.current) timelineRef.current.kill();
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
    }

    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 1.05,
        duration: 0.6,
        ease: 'power3.inOut',
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

  // Master Epic Animation Sequence
  const runEpicSequence = useCallback(() => {
    setIsVisible(true);

    const prefersReducedMotion =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (prefersReducedMotion) {
      setTimeout(() => finishIntro(), 400);
      return;
    }

    playEpicCinematicAudio();

    const tl = gsap.timeline({
      onComplete: finishIntro,
    });
    timelineRef.current = tl;

    // Reset components to initial states
    if (containerRef.current) gsap.set(containerRef.current, { opacity: 1, scale: 1 });
    if (flareRef.current) gsap.set(flareRef.current, { opacity: 0, scaleX: 0, xPercent: -50 });
    if (shockwaveRef.current) gsap.set(shockwaveRef.current, { opacity: 0, scale: 0.1 });
    if (arrowheadGleamRef.current) gsap.set(arrowheadGleamRef.current, { opacity: 0, scale: 0 });
    if (taglineRef.current) gsap.set(taglineRef.current, { opacity: 0, y: 15 });
    if (godRaysRef.current) gsap.set(godRaysRef.current, { opacity: 0 });
    if (letterboxTopRef.current) gsap.set(letterboxTopRef.current, { height: '8vh' });
    if (letterboxBottomRef.current) gsap.set(letterboxBottomRef.current, { height: '8vh' });

    // Setup SVG letter paths
    if (logoGroupRef.current) {
      const paths = logoGroupRef.current.querySelectorAll('path');
      paths.forEach((p, idx) => {
        gsap.set(p, {
          opacity: 0,
          scale: 0.88,
          transformOrigin: '50% 50%',
          filter: 'drop-shadow(0 0 0px transparent)',
        });
      });
    }

    // --- PHASE 1: The Horizontal Anamorphic Laser Flare Sweep (0.1s - 1.2s) ---
    if (flareRef.current) {
      tl.to(
        flareRef.current,
        {
          opacity: 0.85,
          scaleX: 1.6,
          duration: 1.1,
          ease: 'power2.inOut',
        },
        0.1
      );
    }

    // --- PHASE 2: Neon Letter Strokes Assemble into Existence (0.8s - 2.1s) ---
    if (logoGroupRef.current) {
      const paths = Array.from(logoGroupRef.current.querySelectorAll('path'));
      tl.to(
        paths,
        {
          opacity: 0.5,
          scale: 1,
          stagger: 0.12,
          duration: 0.8,
          ease: 'power3.out',
        },
        0.8
      );
    }

    // --- PHASE 3: THE BASS DROP IMPACT (2.2s) ---
    // Massive illumination, shockwave blast, chromatic flash
    if (shockwaveRef.current) {
      tl.to(shockwaveRef.current, { opacity: 0.9, scale: 2.8, duration: 1.2, ease: 'power2.out' }, 2.18);
      tl.to(shockwaveRef.current, { opacity: 0, duration: 0.6, ease: 'power2.in' }, 2.6);
    }

    // Blast god rays behind the logo
    if (godRaysRef.current) {
      tl.to(godRaysRef.current, { opacity: 0.8, duration: 0.4, ease: 'power2.out' }, 2.2);
      tl.to(godRaysRef.current, { opacity: 0.2, duration: 0.9, ease: 'power2.out' }, 2.6);
    }

    // Ignite the full solid logo into blinding white-gold brilliance
    if (logoGroupRef.current) {
      const paths = Array.from(logoGroupRef.current.querySelectorAll('path'));
      tl.to(
        paths,
        {
          opacity: 1,
          filter: 'drop-shadow(0 0 28px rgba(255, 178, 36, 0.9)) drop-shadow(0 0 60px rgba(59, 130, 246, 0.5))',
          duration: 0.25,
          ease: 'power4.out',
        },
        2.2
      );

      // Settle glow into rich metallic gold
      tl.to(
        paths,
        {
          filter: 'drop-shadow(0 0 14px rgba(255, 178, 36, 0.65)) drop-shadow(0 0 32px rgba(255, 255, 255, 0.35))',
          duration: 0.8,
          ease: 'power2.out',
        },
        2.5
      );
    }

    // Arrowhead Tip Flash (Spark at the upper-right arrow of the X)
    if (arrowheadGleamRef.current) {
      tl.to(arrowheadGleamRef.current, { opacity: 1, scale: 1.8, duration: 0.2, ease: 'power4.out' }, 2.22);
      tl.to(arrowheadGleamRef.current, { opacity: 0.4, scale: 1, duration: 0.6, ease: 'power2.out' }, 2.42);
    }

    // --- PHASE 4: Studio Tagline Fade-In & Camera Dolly Zoom (2.4s - 3.4s) ---
    if (taglineRef.current) {
      tl.to(taglineRef.current, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 2.45);
    }

    // Cinematic anamorphic bars gently retreat
    const letterboxTargets = [letterboxTopRef.current, letterboxBottomRef.current].filter(
      (element): element is HTMLDivElement => element !== null
    );
    if (letterboxTargets.length > 0) {
      tl.to(letterboxTargets, { height: '0vh', duration: 0.8, ease: 'power3.inOut' }, 3.2);
    }

    // --- PHASE 5: Smooth Cinematic Zoom Dissolve into Homepage (3.4s - 4.1s) ---
    if (containerRef.current) {
      tl.to(containerRef.current, { opacity: 0, scale: 1.08, duration: 0.7, ease: 'power2.inOut' }, 3.4);
    }
  }, [finishIntro, playEpicCinematicAudio]);

  const runEpicSequenceRef = useRef(runEpicSequence);
  runEpicSequenceRef.current = runEpicSequence;

  useEffect(() => {
    const hasSeen = sessionStorage.getItem('zhafx_intro_seen');
    if (!hasSeen || forcePlay) {
      const timer = setTimeout(() => {
        runEpicSequenceRef.current();
      }, 60);
      return () => clearTimeout(timer);
    }

    const handleReplay = () => {
      runEpicSequenceRef.current();
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
      className="fixed inset-0 z-50 overflow-hidden select-none bg-[#030408] text-white flex items-center justify-center pointer-events-auto"
      style={{ willChange: 'opacity, transform' }}
    >
      {/* 3D Cosmic Starfield Canvas */}
      <canvas
        ref={starsCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Deep Radial Nebula Core */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,178,36,0.18)_0%,rgba(59,130,246,0.12)_35%,transparent_75%)] pointer-events-none z-1" />

      {/* Volumetric Radial God Rays */}
      <div
        ref={godRaysRef}
        className="absolute inset-0 pointer-events-none z-2 flex items-center justify-center opacity-0"
      >
        <div className="w-[120vw] h-[120vw] max-w-[900px] max-h-[900px] rounded-full bg-[conic-gradient(from_0deg_at_50%_50%,rgba(255,178,36,0.22)_0deg,transparent_40deg,rgba(59,130,246,0.2)_90deg,transparent_130deg,rgba(255,178,36,0.22)_180deg,transparent_220deg,rgba(59,130,246,0.2)_270deg,transparent_310deg,rgba(255,178,36,0.22)_360deg)] animate-spin [animation-duration:35s]" />
      </div>

      {/* Explosive Shockwave Ring (Triggers on 2.2s Bass Drop) */}
      <div
        ref={shockwaveRef}
        className="absolute w-[450px] h-[450px] rounded-full border-2 border-white/80 shadow-[0_0_80px_rgba(255,255,255,0.8),inset_0_0_50px_rgba(255,255,255,0.4)] pointer-events-none z-3 opacity-0"
      />

      {/* Anamorphic Horizontal Optical Flare */}
      <div
        ref={flareRef}
        className="absolute top-1/2 left-1/2 -translate-y-1/2 w-[140vw] h-[3px] pointer-events-none z-4 opacity-0 flex items-center justify-center"
      >
        <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent blur-[1px]" />
        <div className="absolute w-[60%] h-[8px] bg-gradient-to-r from-transparent via-white/80 to-transparent blur-[3px]" />
        <div className="absolute w-24 h-24 rounded-full bg-white blur-xl opacity-90" />
      </div>

      {/* Center Stage: The Iconic Official ZHAFX Logo & Arrow-X */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-4xl w-full">
        <div className="relative">
          {/* Main Vector Wordmark & Signature Arrow-X */}
          <svg
            viewBox="0 0 530 155"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[280px] sm:w-[440px] md:w-[580px] lg:w-[680px] h-auto overflow-visible filter"
          >
            <defs>
              {/* Ultra-luminous Platinum Glass Shimmer Gradient */}
              <linearGradient id="zhafxEpicGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="25%" stopColor="#F4F4F6" />
                <stop offset="50%" stopColor="#E4E4E7" />
                <stop offset="75%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#D4D4D8" />
              </linearGradient>

              {/* Specular Diagonal Gleam Mask */}
              <linearGradient id="gleamMask" x1="-100%" y1="0%" x2="200%" y2="0%">
                <stop offset="0%" stopColor="white" stopOpacity="0.1" />
                <stop offset="50%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            <g ref={logoGroupRef} fill="url(#zhafxEpicGold)">
              {/* LETTER Z */}
              <path d="M 30,45 H 98 V 65 L 53,115 H 98 V 135 H 30 V 115 L 75,65 H 30 Z" />

              {/* LETTER H */}
              <path d="M 118,45 H 138 V 80 H 166 V 45 H 186 V 135 H 166 V 100 H 138 V 135 H 118 Z" />

              {/* LETTER A */}
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M 233,45 H 251 L 280,135 H 258 L 253,116 H 231 L 226,135 H 204 Z M 242,70 L 249,98 H 235 Z"
              />

              {/* LETTER F */}
              <path d="M 298,45 H 362 V 65 H 318 V 82 H 350 V 102 H 318 V 135 H 298 Z" />

              {/* LETTER X: Descending leg (\) */}
              <path d="M 376,45 H 404 L 494,135 H 466 Z" />

              {/* LETTER X: Signature Rising Arrowhead Leg (/) */}
              <path d="M 380,135 H 408 L 495,48 L 507,60 L 518,11 L 469,22 L 481,34 Z" />
            </g>
          </svg>

          {/* Glowing Star Sparkle on Arrowhead Tip */}
          <div
            ref={arrowheadGleamRef}
            className="absolute top-[8%] right-[2%] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 opacity-0"
          >
            <div className="w-8 h-8 rounded-full bg-white blur-md" />
            <Sparkles className="w-7 h-7 text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.9)] absolute inset-0 animate-spin [animation-duration:8s]" />
          </div>
        </div>

        {/* Epic Studio Tagline Reveal */}
        <div
          ref={taglineRef}
          className="mt-6 sm:mt-8 flex flex-col items-center gap-2 text-center opacity-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 sm:w-16 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
            <span className="text-[10px] sm:text-xs md:text-sm font-semibold tracking-[0.45em] sm:tracking-[0.6em] text-white/90 uppercase font-mono">
              STREAM WITHOUT LIMITS
            </span>
            <div className="w-8 sm:w-16 h-[1px] bg-gradient-to-l from-transparent via-white/80 to-transparent" />
          </div>
          <span className="text-[9px] sm:text-[11px] text-white/70 tracking-[0.25em] font-medium uppercase mt-0.5">
            FILM • SERIAL TV • ANIME
          </span>
        </div>
      </div>

      {/* Cinematic 2.39:1 Anamorphic Top & Bottom Letterbox Bars */}
      <div
        ref={letterboxTopRef}
        className="absolute top-0 left-0 right-0 bg-black pointer-events-none z-20 transition-all duration-700"
        style={{ height: '8vh' }}
      />
      <div
        ref={letterboxBottomRef}
        className="absolute bottom-0 left-0 right-0 bg-black pointer-events-none z-20 transition-all duration-700"
        style={{ height: '8vh' }}
      />

      {/* Top Right HUD Controls: Audio Shimmer Toggle & Lewati Button */}
      <div className="absolute top-5 sm:top-7 right-5 sm:right-8 z-30 flex items-center gap-2.5 pointer-events-auto">
        <button
          onClick={() => {
            const nextMute = !isMuted;
            setIsMuted(nextMute);
            if (!nextMute) playEpicCinematicAudio();
          }}
          className="w-10 h-10 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring shadow-lg"
          title={isMuted ? 'Nyalakan Audio Sinematik' : 'Matikan Suara'}
          aria-label={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>

        <button
          onClick={finishIntro}
          className="px-4 py-2 rounded-full liquid-glass liquid-specular text-xs font-semibold text-white/90 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring shadow-lg"
          title="Lewati intro sinematik"
          aria-label="Lewati intro"
        >
          Lewati
        </button>
      </div>
    </div>
  );
};
