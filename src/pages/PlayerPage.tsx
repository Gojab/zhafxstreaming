import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Server,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  Check,
  Flag,
  Play,
  Pause,
  CheckCircle2,
  X,
  Clock,
  Sparkles,
  Maximize,
  Minimize,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, Provider, MediaType } from '../types';
import { storage } from '../lib/storage';
import { offlineStorage } from '../lib/offlineStorage';
import { useContinueWatching } from '../hooks/useContinueWatching';

export const PlayerPage: React.FC = () => {
  const { type: rawType, id, season: rawSeason, episode: rawEpisode } = useParams<{
    type?: string;
    id?: string;
    season?: string;
    episode?: string;
  }>();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const mediaType: MediaType =
    rawType === 'tv' || rawType === 'anime' || rawType === 'movie' ? rawType : 'movie';

  const seasonNum = parseInt(rawSeason || '1', 10);
  const episodeNum = parseInt(rawEpisode || '1', 10);

  const [title, setTitle] = useState<Title | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('auto');
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [isStalled, setIsStalled] = useState(false);
  const [isReported, setIsReported] = useState(false);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // Continue Watching Hook
  const { saveProgress, getProgressForTitle } = useContinueWatching();

  // Playback Tracking State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(() => {
    return mediaType === 'anime' ? 24 * 60 : mediaType === 'tv' ? 45 * 60 : 110 * 60;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [resumeNotice, setResumeNotice] = useState<{ show: boolean; time: number } | null>(null);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(duration);
  const lastSavedTimeRef = useRef<number>(0);
  const titleRef = useRef<Title | null>(null);

  // Sync refs with state
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Track Fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (totalSeconds: number): string => {
    const s = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Immediate save helper
  const performSave = useCallback(
    (explicitTime?: number, explicitCompleted?: boolean) => {
      if (!id || !titleRef.current) return;

      const tToSave = explicitTime !== undefined ? explicitTime : currentTimeRef.current;
      const dToSave = durationRef.current;
      const pct = Math.min(100, Math.max(0, Math.round((tToSave / dToSave) * 100)));

      const completed =
        explicitCompleted !== undefined
          ? explicitCompleted
          : pct >= 95 || (dToSave > 60 && dToSave - tToSave <= 30 && tToSave > 30);

      const t = titleRef.current;
      saveProgress({
        contentId: id,
        mediaType,
        title: t.title,
        poster: t.poster,
        backdrop: t.backdrop,
        year: t.year,
        season: mediaType === 'tv' ? seasonNum : undefined,
        episode: mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined,
        episodeName:
          mediaType === 'tv'
            ? `Musim ${seasonNum} Ep ${episodeNum}`
            : mediaType === 'anime'
            ? `Episode ${episodeNum}`
            : undefined,
        currentTime: tToSave,
        duration: dToSave,
        completed,
      });

      lastSavedTimeRef.current = tToSave;
    },
    [id, mediaType, seasonNum, episodeNum, saveProgress]
  );

  // Load details and initialize starting time
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    // Check if stream already reported
    setIsReported(storage.isStreamReported(id));

    // Fetch title details and providers
    Promise.all([
      api.getDetails(id, mediaType, controller.signal),
      api.getProviders(controller.signal, mediaType),
    ])
      .then(([details, provs]) => {
        setTitle(details);
        setProviders(provs);

        const runtimeNum = Number(details.runtime);
        if (!isNaN(runtimeNum) && runtimeNum > 0) {
          const estimatedSecs = runtimeNum * 60;
          setDuration(estimatedSecs);
          durationRef.current = estimatedSecs;
        }

        // Determine starting timestamp
        const urlTimeParam = searchParams.get('t') || searchParams.get('start');
        let initialTime = 0;

        if (urlTimeParam && !isNaN(Number(urlTimeParam))) {
          initialTime = Math.max(0, Number(urlTimeParam));
        } else {
          const savedProgress = getProgressForTitle(
            id,
            mediaType === 'tv' ? seasonNum : undefined,
            mediaType === 'anime' || mediaType === 'tv' ? episodeNum : undefined
          );

          if (savedProgress && !savedProgress.completed && savedProgress.currentTime > 5) {
            initialTime = savedProgress.currentTime;
            setResumeNotice({ show: true, time: savedProgress.currentTime });
          }
        }

        setCurrentTime(initialTime);
        currentTimeRef.current = initialTime;

        // Also record in legacy history for backward compatibility
        storage.saveHistory({
          id,
          type: mediaType,
          title: details.title,
          poster: details.poster,
          backdrop: details.backdrop,
          year: details.year,
          season: mediaType === 'tv' ? seasonNum : undefined,
          episode: mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined,
          episodeName:
            mediaType === 'tv'
              ? `Musim ${seasonNum} Ep ${episodeNum}`
              : mediaType === 'anime'
              ? `Episode ${episodeNum}`
              : undefined,
          progressSeconds: initialTime,
          durationSeconds: durationRef.current,
        });

        performSave(initialTime);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('[PlayerPage] Initialization error:', err);
          const offlineItem = offlineStorage.getDownload(id, seasonNum, episodeNum);
          if (offlineItem) {
            setTitle({
              id: offlineItem.contentId,
              title: offlineItem.title,
              type: offlineItem.mediaType,
              poster: offlineItem.poster || '',
              backdrop: offlineItem.backdrop || '',
              year: offlineItem.year || '2026',
              overview: offlineItem.overview || '',
              rating: '8.5',
              genres: [],
            });
          }
        }
      });

    return () => controller.abort();
  }, [id, mediaType, seasonNum, episodeNum, searchParams, getProgressForTitle, performSave]);

  // Periodic heartbeat timer (saves progress every 12 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && !isIframeLoading) {
        setCurrentTime((prev) => {
          const next = Math.min(durationRef.current, prev + 12);
          currentTimeRef.current = next;

          if (Math.abs(next - lastSavedTimeRef.current) >= 10) {
            performSave(next);
          }
          return next;
        });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isPlaying, isIframeLoading, performSave]);

  // Listen to postMessage from iframe player
  useEffect(() => {
    const handlePlayerMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object') return;

        if (data.type === 'timeupdate' || data.event === 'timeupdate') {
          const t = Number(data.currentTime || data.time || data.seconds);
          const d = Number(data.duration || data.total);
          if (!isNaN(t) && t > 0) {
            setCurrentTime(t);
            currentTimeRef.current = t;
          }
          if (!isNaN(d) && d > 60) {
            setDuration(d);
            durationRef.current = d;
          }
        }

        if (data.type === 'pause' || data.event === 'pause') {
          setIsPlaying(false);
          performSave();
        }

        if (data.type === 'play' || data.event === 'play') {
          setIsPlaying(true);
        }

        if (data.type === 'ended' || data.event === 'ended') {
          setIsCompleted(true);
          performSave(durationRef.current, true);
        }
      } catch {
        // Not a JSON postMessage
      }
    };

    window.addEventListener('message', handlePlayerMessage);
    return () => window.removeEventListener('message', handlePlayerMessage);
  }, [performSave]);

  // Save on page exit / unload / tab blur
  useEffect(() => {
    const handleBeforeUnload = () => {
      performSave();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [performSave]);

  // Guaranteed progress save on SPA unmount when navigating to another route
  useEffect(() => {
    return () => {
      performSave();
    };
  }, [performSave]);

  // 15 seconds stall helper timer
  useEffect(() => {
    setIsIframeLoading(true);
    setIsStalled(false);

    stallTimerRef.current = setTimeout(() => {
      setIsStalled(true);
    }, 15000);

    return () => {
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
  }, [id, mediaType, seasonNum, episodeNum, selectedServer]);

  const handleIframeLoaded = () => {
    setIsIframeLoading(false);
    setIsStalled(false);
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
  };

  const handleReport = () => {
    if (!id || isReported) return;
    storage.reportStream(id, `Server: ${selectedServer}, S${seasonNum}E${episodeNum}`);
    setIsReported(true);
    setShowReportSuccess(true);
    setTimeout(() => setShowReportSuccess(false), 3000);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    currentTimeRef.current = newTime;
    performSave(newTime);
  };

  const handleSkip = (deltaSeconds: number) => {
    const next = Math.max(0, Math.min(duration, currentTime + deltaSeconds));
    setCurrentTime(next);
    currentTimeRef.current = next;
    performSave(next);
  };

  const handleMarkCompleted = () => {
    setIsCompleted(true);
    setCurrentTime(duration);
    currentTimeRef.current = duration;
    performSave(duration, true);
  };

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        if (playerContainerRef.current?.requestFullscreen) {
          playerContainerRef.current.requestFullscreen();
        } else if ((playerContainerRef.current as any)?.webkitRequestFullscreen) {
          (playerContainerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any)?.webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('[PlayerPage] Fullscreen error:', err);
    }
  };

  const togglePlayPause = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (!nextState) {
      performSave();
    }
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: nextState ? 'play' : 'pause', type: nextState ? 'play' : 'pause' }),
          '*'
        );
      }
    } catch {
      // Cross-origin safe
    }
  };

  const handleRestartFromBeginning = () => {
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setResumeNotice(null);
    performSave(0, false);
  };

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-sm text-white/50">ID tayangan tidak valid.</p>
      </div>
    );
  }

  // Construct official embed URL with timestamp support
  const embedUrl = api.getEmbedUrl({
    type: mediaType,
    id,
    season: seasonNum,
    episode: episodeNum,
    server: selectedServer !== 'auto' ? selectedServer : undefined,
    autoplay: true,
    muted: false,
    title: title?.title,
    poster: title?.backdrop || title?.poster,
    start: currentTimeRef.current > 0 ? currentTimeRef.current : undefined,
  });

  const hasPrevEpisode = episodeNum > 1;
  const hasNextEpisode =
    mediaType === 'tv' || mediaType === 'anime'
      ? episodeNum < (title?.numberOfEpisodes || 999)
      : false;

  const navigateEpisode = (direction: 'prev' | 'next') => {
    performSave();
    const nextEp = direction === 'prev' ? episodeNum - 1 : episodeNum + 1;
    if (mediaType === 'tv') {
      navigate(`/watch/tv/${id}/${seasonNum}/${nextEp}`);
    } else if (mediaType === 'anime') {
      navigate(`/watch/anime/${id}/1/${nextEp}`);
    }
  };

  const progressPct = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));

  return (
    <div className="min-h-screen bg-[#06070B] flex flex-col relative select-none">
      {/* Apple iOS 26 Floating Top Navigation Bar */}
      <header className="fixed top-3 sm:top-5 left-3 right-3 sm:left-6 sm:right-6 max-w-7xl mx-auto z-40 pointer-events-none">
        <div className="h-14 sm:h-16 px-3 sm:px-5 rounded-full liquid-glass-dense liquid-specular flex items-center justify-between gap-3 shadow-2xl pointer-events-auto border border-white/20">
          {/* Left: Back to Detail Button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => {
                performSave();
                navigate(`/detail/${mediaType}/${id}`);
              }}
              className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.16] cursor-pointer ios-spring shrink-0"
              title="Kembali ke halaman detail"
              aria-label="Kembali ke detail"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-semibold text-white truncate leading-tight">
                {title?.title || 'Memuat pemutar...'}
              </h1>
              {(mediaType === 'tv' || mediaType === 'anime') && (
                <span className="text-[11px] text-[#FFB224] font-medium block truncate">
                  {mediaType === 'tv'
                    ? `Musim ${seasonNum} • Episode ${episodeNum}`
                    : `Episode ${episodeNum}`}
                </span>
              )}
            </div>
          </div>

          {/* Right: Server Provider Dropdown Pill & Report Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Server Selector Glass Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full liquid-glass text-xs text-white">
              <Server className="w-3.5 h-3.5 text-[#FFB224]" />
              <select
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                aria-label="Pilih server pemutar"
                className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[110px] sm:max-w-none truncate"
              >
                <option value="auto" className="bg-[#12141F] text-white">
                  Server Otomatis
                </option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#12141F] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Report Button Pill */}
            <button
              onClick={handleReport}
              disabled={isReported}
              className={`h-9 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ios-spring ${
                isReported
                  ? 'liquid-glass text-emerald-400 border-emerald-400/30'
                  : 'liquid-glass text-white/70 hover:text-white hover:bg-white/[0.16]'
              }`}
              title="Laporkan kendala pemutaran"
              aria-label="Laporkan kendala"
            >
              {isReported ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Dilaporkan</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lapor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Floating Apple Liquid Glass Resume Toast */}
      {resumeNotice?.show && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 max-w-md mx-auto z-40">
          <div className="rounded-full liquid-glass-dense liquid-specular px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-white shadow-2xl border border-white/25 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2 truncate">
              <Clock className="w-4 h-4 text-[#FFB224] shrink-0" />
              <span>
                Melanjutkan dari <strong className="text-[#FFB224] font-mono">{formatTime(resumeNotice.time)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleRestartFromBeginning}
                className="px-3 py-1 rounded-full bg-white/[0.12] hover:bg-white/20 border border-white/20 text-[11px] font-semibold text-white transition-all cursor-pointer ios-spring"
              >
                Dari Awal
              </button>
              <button
                onClick={() => setResumeNotice(null)}
                className="w-6 h-6 rounded-full hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup pesan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Toast Notification */}
      {showReportSuccess && (
        <div className="fixed top-20 sm:top-24 left-4 right-4 max-w-md mx-auto z-40">
          <div className="rounded-full liquid-glass-dense px-4 py-2 text-center text-xs text-white font-medium shadow-2xl border border-white/20">
            Laporan diterima! Sistem akan memverifikasi server alternatif.
          </div>
        </div>
      )}

      {/* Main Video Viewport (Edge-to-edge cinematic canvas) */}
      <div
        ref={playerContainerRef}
        className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden pt-16 sm:pt-20 pb-24 md:pb-20"
      >
        {/* Loading Overlay */}
        {isIframeLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#06070B] space-y-3">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/50 tracking-wider uppercase">
              Memuat Stream Pemutar Zhafx...
            </span>
          </div>
        )}

        {/* 15-Second Stalled Helper Notice */}
        {isStalled && (
          <div className="absolute top-20 left-4 right-4 z-20 max-w-lg mx-auto p-4 rounded-[24px] liquid-glass-dense liquid-specular shadow-2xl backdrop-blur-xl flex items-start gap-3.5 text-left border border-white/20">
            <AlertTriangle className="w-5 h-5 text-[#FFB224] shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xs font-semibold text-white">
                  Video belum mulai memutar otomatis?
                </h2>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  Beberapa server memerlukan klik langsung pada tombol Play di tengah layar player, atau pilih server lain di bawah.
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {providers.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedServer(p.id)}
                    className="px-3 py-1 rounded-full liquid-glass text-[10px] text-white hover:bg-white/[0.16] transition-all cursor-pointer ios-spring"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sandboxed Embed Iframe */}
        <iframe
          ref={iframeRef}
          key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${selectedServer}`}
          src={embedUrl}
          title={title?.title || 'Zhafx Player'}
          onLoad={handleIframeLoaded}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen allow-forms"
          referrerPolicy="no-referrer"
          allow="autoplay; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full h-full min-h-[60vh] sm:min-h-[75vh] border-0"
        />
      </div>

      {/* Floating Apple iOS 26 Liquid Glass Player Dock (Bottom Controls) */}
      <div className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-6 sm:right-6 max-w-4xl mx-auto z-40 pointer-events-none">
        <div className="rounded-[28px] sm:rounded-full liquid-glass-dense liquid-specular shadow-[0_16px_40px_rgba(0,0,0,0.65)] p-3 sm:p-4 flex flex-col gap-2.5 pointer-events-auto border border-white/20">
          {/* Interactive Progress Slider & Counters */}
          <div className="flex items-center gap-3 px-1">
            <span className="text-[11px] font-mono text-white/90 min-w-[44px]">
              {formatTime(currentTime)}
            </span>

            {/* Sleek Scrubber Bar */}
            <div className="relative flex-1 flex items-center group/scrubber">
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Progres video"
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#FFB224] focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #FFB224 ${progressPct}%, rgba(255,255,255,0.18) ${progressPct}%)`,
                }}
              />
            </div>

            <span className="text-[11px] font-mono text-white/50 min-w-[44px] text-right">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action Row: Skip -10s, Play/Pause, Skip +10s, Prev/Next Ep, Mark Complete, Fullscreen */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.08]">
            {/* Left Controls: Rewind, Play/Pause, & Forward Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => handleSkip(-10)}
                title="Mundur 10 detik"
                aria-label="Mundur 10 detik"
                className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlayPause}
                title={isPlaying ? 'Jeda Video' : 'Putar Video'}
                aria-label={isPlaying ? 'Jeda Video' : 'Putar Video'}
                className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-[#FFB224] hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={() => handleSkip(10)}
                title="Maju 10 detik"
                aria-label="Maju 10 detik"
                className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Center Controls: Episode Navigation for Series/Anime */}
            {(mediaType === 'tv' || mediaType === 'anime') && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => navigateEpisode('prev')}
                  disabled={!hasPrevEpisode}
                  className="px-3 py-1.5 rounded-full liquid-glass text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.18] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 ios-spring cursor-pointer"
                  title="Episode Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ep Sebelumnya</span>
                </button>

                <span className="px-2.5 py-1 rounded-full bg-white/[0.1] text-xs font-semibold text-[#FFB224] min-w-[64px] text-center">
                  Ep {episodeNum}
                </span>

                <button
                  onClick={() => navigateEpisode('next')}
                  disabled={!hasNextEpisode}
                  className="px-3 py-1.5 rounded-full liquid-glass text-xs font-medium text-white/80 hover:text-white hover:bg-white/[0.18] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 ios-spring cursor-pointer"
                  title="Episode Berikutnya"
                >
                  <span className="hidden sm:inline">Ep Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Right Controls: Mark as Complete & Fullscreen Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkCompleted}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ios-spring cursor-pointer ${
                  isCompleted
                    ? 'liquid-glass text-emerald-400 font-semibold'
                    : 'liquid-glass text-white/70 hover:text-white hover:bg-white/[0.18]'
                }`}
                title="Tandai telah selesai ditonton"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isCompleted ? 'Selesai Ditonton' : 'Tandai Selesai'}
                </span>
              </button>

              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5" />
                ) : (
                  <Maximize className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
