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
} from 'lucide-react';
import { api } from '../services/api';
import { Title, Provider, MediaType } from '../types';
import { storage } from '../lib/storage';
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

    // Determine initial timestamp from query param or saved progress
    const queryTime = searchParams.get('t');
    let startSeconds = 0;

    if (queryTime && !isNaN(parseInt(queryTime, 10))) {
      startSeconds = Math.max(0, parseInt(queryTime, 10));
    } else {
      const saved = getProgressForTitle(
        id,
        mediaType === 'tv' ? seasonNum : undefined,
        mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined
      );
      if (saved && saved.currentTime > 5 && !saved.completed) {
        startSeconds = saved.currentTime;
      }
    }

    // Set duration estimate from title runtime
    api
      .getDetails(id, mediaType, controller.signal)
      .then((data) => {
        setTitle(data);
        titleRef.current = data;

        let totalDuration = mediaType === 'anime' ? 24 * 60 : mediaType === 'tv' ? 45 * 60 : 110 * 60;
        if (data.runtime) {
          const parsedRuntime = parseInt(String(data.runtime), 10);
          if (!isNaN(parsedRuntime) && parsedRuntime > 0) {
            totalDuration = parsedRuntime * 60;
          }
        }
        setDuration(totalDuration);
        durationRef.current = totalDuration;

        // Check if startSeconds is near the end
        if (startSeconds > 0 && startSeconds < totalDuration * 0.95) {
          setCurrentTime(startSeconds);
          currentTimeRef.current = startSeconds;
          lastSavedTimeRef.current = startSeconds;
          setResumeNotice({ show: true, time: startSeconds });
        } else {
          setCurrentTime(0);
          currentTimeRef.current = 0;
          lastSavedTimeRef.current = 0;
        }

        // Perform initial save
        performSave(startSeconds);
      })
      .catch((err) => {
        console.warn('[Player] Failed to fetch details:', err);
      });

    // Fetch server providers
    api
      .getProviders(controller.signal)
      .then((provs) => {
        setProviders(provs);
      })
      .catch(() => {
        setProviders([
          { id: 'miner', name: 'Miner XIX' },
          { id: 'headhunter', name: 'Headhunter XXXI' },
          { id: 'valkyrie', name: 'Valkyrie VI' },
          { id: 'super_barbarian', name: 'Super Barbarian' },
          { id: 'bowler', name: 'Bowler XVIII' },
        ]);
      });

    return () => {
      controller.abort();
      // Save on unmount
      performSave();
    };
  }, [id, mediaType, seasonNum, episodeNum, searchParams, getProgressForTitle, performSave]);

  // Listen for postMessage from embed iframe if available
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data) return;

        // Handle various player postMessage formats
        if (data.event === 'timeupdate' || data.type === 'timeupdate' || data.event === 'media:timeupdate') {
          const cTime = Number(data.currentTime || data.time || (data.data && data.data.currentTime));
          const dur = Number(data.duration || (data.data && data.data.duration));

          if (!isNaN(cTime) && cTime >= 0) {
            setCurrentTime(cTime);
            currentTimeRef.current = cTime;
          }
          if (!isNaN(dur) && dur > 0) {
            setDuration(dur);
            durationRef.current = dur;
          }
        } else if (data.event === 'pause' || data.type === 'pause') {
          setIsPlaying(false);
          performSave();
        } else if (data.event === 'play' || data.type === 'play') {
          setIsPlaying(true);
        } else if (data.event === 'ended' || data.type === 'ended') {
          setIsCompleted(true);
          performSave(durationRef.current, true);
        }
      } catch {
        // Not a JSON message, ignore
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [performSave]);

  // 1-second ticker to advance current time when playing & active
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      // Don't advance if page is completely hidden/backgrounded
      if (document.hidden) return;

      setCurrentTime((prev) => {
        const next = prev + 1;
        if (next >= durationRef.current) {
          setIsCompleted(true);
          performSave(durationRef.current, true);
          return durationRef.current;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, performSave]);

  // Throttled periodic save every 12 seconds
  useEffect(() => {
    if (!isPlaying) return;

    const saveInterval = setInterval(() => {
      const cur = currentTimeRef.current;
      // Only save if time has changed by more than 5 seconds since last save
      if (Math.abs(cur - lastSavedTimeRef.current) >= 5) {
        performSave();
      }
    }, 12000);

    return () => clearInterval(saveInterval);
  }, [isPlaying, performSave]);

  // Save on pageleave / refresh / tab close
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

  const handleRestartFromBeginning = () => {
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setResumeNotice(null);
    performSave(0, false);
  };

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-sm text-[#98A2C3]">ID tayangan tidak valid.</p>
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
    <div className="min-h-screen bg-[#0A0C14] flex flex-col">
      {/* Top Player Control Header */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#0A0C14]/95 border-b border-[#2A3152] flex items-center justify-between gap-3 shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              performSave();
              navigate(`/detail/${mediaType}/${id}`);
            }}
            className="flex items-center gap-1.5 p-2 rounded-xl bg-[#12162A] hover:bg-[#1A2038] text-[#98A2C3] hover:text-[#F2F4FB] border border-[#2A3152] transition-colors cursor-pointer shrink-0"
            title="Kembali ke halaman detail"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs hidden sm:inline">Detail</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold text-[#F2F4FB] truncate">
              {title?.title || 'Memuat pemutar...'}
            </h1>
            {(mediaType === 'tv' || mediaType === 'anime') && (
              <span className="text-[11px] text-[#FFB224] block truncate">
                {mediaType === 'tv'
                  ? `Musim ${seasonNum} • Episode ${episodeNum}`
                  : `Episode ${episodeNum}`}
              </span>
            )}
          </div>
        </div>

        {/* Server Provider Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#12162A] border border-[#2A3152] text-xs">
            <Server className="w-3.5 h-3.5 text-[#FFB224]" />
            <span className="text-[11px] text-[#98A2C3] hidden md:inline">Server:</span>
            <select
              value={selectedServer}
              onChange={(e) => setSelectedServer(e.target.value)}
              aria-label="Pilih server pemutar"
              className="bg-transparent text-xs text-[#F2F4FB] font-medium focus:outline-none cursor-pointer"
            >
              <option value="auto" className="bg-[#12162A] text-white">
                Otomatis (Multi-Server)
              </option>
              {providers.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#12162A] text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Report Button */}
          <button
            onClick={handleReport}
            disabled={isReported}
            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              isReported
                ? 'bg-[#12162A] border-white/20 text-emerald-400'
                : 'bg-[#12162A] hover:bg-[#1A2038] border-[#2A3152] text-[#98A2C3] hover:text-[#FF5C6C]'
            }`}
            title="Laporkan kendala pemutaran"
          >
            {isReported ? (
              <>
                <Check className="w-3.5 h-3.5" />
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
      </header>

      {/* Resume Notification Toast */}
      {resumeNotice?.show && (
        <div className="bg-[#1A2038] border-b border-[#FFB224]/30 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-[#F2F4FB] z-30 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2 truncate">
            <Clock className="w-4 h-4 text-[#FFB224] shrink-0" />
            <span>
              Melanjutkan tayangan dari posisi terakhir:{' '}
              <strong className="text-[#FFB224] font-mono">{formatTime(resumeNotice.time)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleRestartFromBeginning}
              className="px-2.5 py-1 rounded-lg bg-[#12162A] hover:bg-[#2A3152] border border-[#2A3152] text-[11px] font-medium text-[#F2F4FB] transition-colors cursor-pointer"
            >
              Mulai dari awal (0:00)
            </button>
            <button
              onClick={() => setResumeNotice(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-[#98A2C3] hover:text-white transition-colors cursor-pointer"
              title="Tutup pesan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Report Toast Notification */}
      {showReportSuccess && (
        <div className="bg-[#12162A] border-b border-white/10 px-4 py-2 text-center text-xs text-zinc-300 font-medium">
          Laporan diterima! Tim Zhafx akan memverifikasi server cadangan untuk tayangan ini.
        </div>
      )}

      {/* Main Video Viewport (Fullscreen 16:9 container) */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Loading Overlay */}
        {isIframeLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0A0C14] space-y-3">
            <div className="w-10 h-10 border-3 border-[#2A3152] border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-[#98A2C3] tracking-wider uppercase">
              Memuat Stream Pemutar Zhafx...
            </span>
          </div>
        )}

        {/* 15-Second Stalled Helper Notice */}
        {isStalled && (
          <div className="absolute top-4 left-4 right-4 z-20 max-w-xl mx-auto p-3.5 rounded-2xl bg-[#12162A]/95 border border-[#FFB224]/50 shadow-2xl backdrop-blur flex items-start gap-3 text-left">
            <AlertTriangle className="w-5 h-5 text-[#FFB224] shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div>
                <h2 className="text-xs font-semibold text-[#F2F4FB]">
                  Video belum termuat otomatis?
                </h2>
                <p className="text-[11px] text-[#98A2C3] leading-relaxed">
                  Sebagian provider membutuhkan server alternatif atau klik langsung tombol Play pada player di bawah.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-[10px] text-[#98A2C3]">Coba server lain:</span>
                {providers.slice(0, 3).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedServer(p.id)}
                    className="px-2.5 py-1 rounded-lg bg-[#1A2038] hover:bg-[#2A3152] border border-[#2A3152] text-[10px] text-[#F2F4FB] hover:text-[#FFB224] transition-colors cursor-pointer"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Securely Sandboxed Embed Iframe */}
        <iframe
          key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${selectedServer}`}
          src={embedUrl}
          title={title?.title || 'Zhafx Player'}
          onLoad={handleIframeLoaded}
          sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen"
          referrerPolicy="no-referrer"
          allow="autoplay; fullscreen; picture-in-picture"
          loading="lazy"
          className="w-full h-full min-h-[50vh] sm:min-h-[70vh] border-0"
        />
      </div>

      {/* Integrated Continue Watching & Playback Status Controller Bar */}
      <div className="bg-[#0A0C14] border-t border-[#2A3152] px-4 py-3 sm:px-6 flex flex-col gap-2.5 z-20">
        {/* Scrubber bar & Time counters */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-[#F2F4FB] min-w-[48px]">
            {formatTime(currentTime)}
          </span>

          {/* Interactive Progress Slider */}
          <div className="relative flex-1 flex items-center group/scrubber">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Progres video"
              className="w-full h-2 bg-[#1A2038] rounded-lg appearance-none cursor-pointer accent-[#FFB224] focus:outline-none focus:ring-1 focus:ring-[#FFB224]"
              style={{
                background: `linear-gradient(to right, #FFB224 ${progressPct}%, #1A2038 ${progressPct}%)`,
              }}
            />
          </div>

          <span className="text-[11px] font-mono text-[#98A2C3] min-w-[48px] text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Controls Row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Play / Pause Tracking Button */}
            <button
              onClick={() => {
                const nextState = !isPlaying;
                setIsPlaying(nextState);
                if (!nextState) performSave();
              }}
              className="p-1.5 rounded-lg bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] text-[#F2F4FB] text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isPlaying ? 'Jeda pelacakan waktu' : 'Lanjutkan pelacakan waktu'}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#FFB224]" />
                  <span className="text-[11px] hidden sm:inline">Sedang Memutar</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 text-[#FFB224] fill-current" />
                  <span className="text-[11px] hidden sm:inline">Jeda</span>
                </>
              )}
            </button>

            {/* Quick Rewind -10s */}
            <button
              onClick={() => handleSkip(-10)}
              className="p-1.5 rounded-lg bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] text-[#98A2C3] hover:text-[#F2F4FB] text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Mundur 10 detik"
            >
              <RotateLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">-10 dtk</span>
            </button>

            {/* Quick Forward +10s */}
            <button
              onClick={() => handleSkip(10)}
              className="p-1.5 rounded-lg bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] text-[#98A2C3] hover:text-[#F2F4FB] text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Maju 10 detik"
            >
              <RotateRight className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">+10 dtk</span>
            </button>

            <span className="text-[11px] text-[#98A2C3] hidden lg:inline ml-2">
              Progres tersimpan otomatis • {progressPct}% selesai
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mark as Completed */}
            <button
              onClick={handleMarkCompleted}
              className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-[#12162A] hover:bg-[#1A2038] border-[#2A3152] text-[#98A2C3] hover:text-[#F2F4FB]'
              }`}
              title="Tandai tayangan ini telah selesai ditonton"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isCompleted ? 'Selesai Ditonton' : 'Tandai Selesai'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Episode Navigation Bar for TV Series & Anime */}
      {(mediaType === 'tv' || mediaType === 'anime') && (
        <div className="p-3 sm:p-4 bg-[#0A0C14] border-t border-[#2A3152] flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={() => navigateEpisode('prev')}
            disabled={!hasPrevEpisode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#12162A] hover:bg-[#1A2038] disabled:opacity-40 border border-[#2A3152] text-xs font-medium text-[#F2F4FB] transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Episode sebelumnya</span>
          </button>

          <span className="text-xs text-[#98A2C3] font-medium hidden sm:inline">
            Episode {episodeNum}
          </span>

          <button
            onClick={() => navigateEpisode('next')}
            disabled={!hasNextEpisode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFB224] hover:bg-[#ffbe47] disabled:opacity-40 text-xs font-semibold text-[#0A0C14] transition-all cursor-pointer shadow-md disabled:cursor-not-allowed"
          >
            <span>Episode berikutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
