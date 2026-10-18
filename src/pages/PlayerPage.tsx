import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Server,
  RotateCw,
  RotateCcw,
  Maximize,
  Minimize,
  ListOrdered,
  CheckCircle2,
  X,
  Tv,
  Volume2,
  VolumeX,
  Volume1,
  Play,
  Pause,
  AlertTriangle,
  Subtitles,
  Settings,
  SkipForward,
  FastForward,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, Provider, MediaType, Episode, StreamData, SubtitleTrack } from '../types';
import { storage } from '../lib/storage';

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
  const [animeAudio, setAnimeAudio] = useState<'sub' | 'dub'>('sub');
  const [playerMode, setPlayerMode] = useState<'hls' | 'embed'>(() => {
    return mediaType === 'anime' ? 'hls' : 'embed';
  });

  // Anime / Stream Native State
  const [animeStream, setAnimeStream] = useState<StreamData | null>(null);
  const [isLoadingAnime, setIsLoadingAnime] = useState(false);
  const [animeError, setAnimeError] = useState<string | null>(null);

  // Video playback controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('zhafx_player_volume');
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Quality & Subtitle menus
  const [qualities, setQualities] = useState<Array<{ id: number; label: string; height: number }>>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1); // -1 = auto
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeSubtitleUrl, setActiveSubtitleUrl] = useState<string | null>(null);
  const [isSubtitleMenuOpen, setIsSubtitleMenuOpen] = useState(false);
  const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);

  // Episode Drawer & Auto Next
  const [drawerEpisodes, setDrawerEpisodes] = useState<Episode[]>([]);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'thumbnails' | 'grid'>('thumbnails');
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState<number | null>(null);

  // Iframe state for Movies / TV only
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Save history
  const recordHistory = useCallback(
    (t: Title) => {
      if (!id) return;
      storage.saveHistory({
        id,
        type: mediaType,
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
      });
    },
    [id, mediaType, seasonNum, episodeNum]
  );

  // Save watch progress
  const saveProgress = useCallback(
    (cTime: number, totalDur: number) => {
      if (!id || !title || totalDur <= 0) return;
      const progressPercent = Math.min(100, Math.round((cTime / totalDur) * 100));
      const isCompleted = progressPercent >= 95;

      storage.saveProgress({
        contentId: id,
        mediaType,
        title: title.title,
        poster: title.poster,
        backdrop: title.backdrop,
        year: title.year,
        season: mediaType === 'tv' ? seasonNum : undefined,
        episode: mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined,
        episodeName:
          mediaType === 'tv'
            ? `Musim ${seasonNum} Ep ${episodeNum}`
            : mediaType === 'anime'
            ? `Episode ${episodeNum}`
            : undefined,
        currentTime: Math.round(cTime),
        duration: Math.round(totalDur),
        progressPercentage: progressPercent,
        completed: isCompleted,
      });
    },
    [id, title, mediaType, seasonNum, episodeNum]
  );

  // Load Title Metadata & Providers List
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    const fetchInitData = async () => {
      try {
        const [detailsResult, provsResult] = await Promise.allSettled([
          api.getDetails(id, mediaType, controller.signal),
          api.getProviders(controller.signal, mediaType),
        ]);

        if (controller.signal.aborted) return;

        if (provsResult.status === 'fulfilled' && provsResult.value) {
          setProviders(provsResult.value);
        }

        let finalTitle: Title;
        if (detailsResult.status === 'fulfilled' && detailsResult.value) {
          finalTitle = detailsResult.value;
        } else {
          const historyItem = storage.getHistory().find((h) => h.id === id);
          const myListItem = storage.getMyList().find((m) => m.id === id);
          finalTitle = {
            id,
            type: mediaType,
            title: searchParams.get('title') || historyItem?.title || myListItem?.title || `Tayangan #${id}`,
            poster: searchParams.get('poster') || historyItem?.poster || myListItem?.poster || '',
            backdrop: historyItem?.backdrop,
            year: historyItem?.year || '2024',
            rating: '8.5',
            overview: '',
            genres: [],
            numberOfEpisodes: mediaType === 'anime' ? 24 : 12,
          };
        }

        setTitle(finalTitle);
        recordHistory(finalTitle);

        if (mediaType === 'tv') {
          api.getSeasonEpisodes(id, seasonNum, controller.signal)
            .then((eps) => setDrawerEpisodes(eps))
            .catch(() => {});
        } else if (mediaType === 'anime') {
          api.getAnimeEpisodes(id, controller.signal)
            .then((eps) => setDrawerEpisodes(eps))
            .catch(() => {});
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.warn('[PlayerPage] Init error:', err?.message || err);
        }
      }
    };

    fetchInitData();
    return () => controller.abort();
  }, [id, mediaType, seasonNum, episodeNum, recordHistory, searchParams]);

  // STREAM: Load stream data directly from FrameX API when playerMode === 'hls'
  useEffect(() => {
    if (playerMode !== 'hls' || !id) {
      setIsLoadingAnime(false);
      return;
    }

    setIsLoadingAnime(true);
    setAnimeError(null);
    setAnimeStream(null);
    setNextEpisodeCountdown(null);
    const controller = new AbortController();

    const providerToRequest = selectedServer === 'auto' ? undefined : selectedServer;

    const streamPromise =
      mediaType === 'anime'
        ? api.getAnimeStream({
            id,
            episode: episodeNum,
            provider: providerToRequest,
            audio: animeAudio,
            signal: controller.signal,
          })
        : api.getStream({
            id,
            type: mediaType,
            season: seasonNum,
            episode: episodeNum,
            provider: providerToRequest,
            signal: controller.signal,
          });

    streamPromise
      .then((data) => {
        if (data && data.sources && data.sources.length > 0) {
          setAnimeStream(data);
          setAnimeError(null);

          // Subtitles processing
          if (Array.isArray(data.subtitles) && data.subtitles.length > 0) {
            setSubtitles(data.subtitles);
            const indo = data.subtitles.find(
              (s) =>
                s.lang === 'in' ||
                s.lang === 'id' ||
                (s.label && s.label.toLowerCase().includes('indonesian'))
            );
            setActiveSubtitleUrl(indo ? indo.url : data.subtitles[0].url);
          } else {
            setSubtitles([]);
            setActiveSubtitleUrl(null);
          }
        } else {
          setAnimeError('Stream HLS tidak tersedia untuk server ini. Silakan klik tombol di bawah untuk memutar via FrameX Embed.');
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setAnimeError(err?.message || 'Gagal memuat stream HLS dari API FrameX.');
        }
      })
      .finally(() => {
        setIsLoadingAnime(false);
      });

    return () => controller.abort();
  }, [id, mediaType, seasonNum, episodeNum, selectedServer, animeAudio, playerMode, iframeKey]);

  // Setup HLS.js or Native Video on Stream Loaded
  useEffect(() => {
    if (playerMode !== 'hls' || !animeStream?.sources?.[0]?.url || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const streamSource = animeStream.sources[0].url;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check if there is saved progress to resume
    const savedProgress = storage.getProgress(id!, 1, episodeNum);
    const resumeTime = savedProgress && savedProgress.currentTime > 5 && !savedProgress.completed
      ? savedProgress.currentTime
      : 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;

      hls.loadSource(streamSource);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsLoadingAnime(false);

        // Populate available video qualities
        if (data.levels && data.levels.length > 0) {
          const parsedQualities = data.levels.map((lvl, index) => ({
            id: index,
            height: lvl.height || 720,
            label: lvl.height ? `${lvl.height}p` : `Tingkat ${index + 1}`,
          }));
          // Sort descending
          parsedQualities.sort((a, b) => b.height - a.height);
          setQualities(parsedQualities);
        }

        if (resumeTime > 0) {
          video.currentTime = resumeTime;
        }

        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setCurrentQuality(data.level);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS] Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS] Fatal error:', data);
              hls.destroy();
              setAnimeError('Terjadi gangguan jaringan pemutar. Coba ganti server.');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari/iOS)
      video.src = streamSource;
      video.addEventListener('loadedmetadata', () => {
        setIsLoadingAnime(false);
        if (resumeTime > 0) {
          video.currentTime = resumeTime;
        }
        video.play().catch(() => setIsPlaying(false));
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [id, mediaType, animeStream, episodeNum]);

  // Handle Fullscreen tracking (Native + CSS Fallback)
  useEffect(() => {
    const handleFsChange = () => {
      const isNativeFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isNativeFs || isCssFullscreen);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCssFullscreen) {
        setIsCssFullscreen(false);
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCssFullscreen]);

  // Controls auto-hide timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
        setIsSubtitleMenuOpen(false);
        setIsQualityMenuOpen(false);
        setIsSpeedMenuOpen(false);
      }
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Periodic watch progress saver
  useEffect(() => {
    if (playerMode !== 'hls' || !isPlaying) return;
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.duration > 0) {
        saveProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [playerMode, isPlaying, saveProgress]);

  // Video playback handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(
      0,
      Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds)
    );
    resetControlsTimeout();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !videoRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
    resetControlsTimeout();
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    localStorage.setItem('zhafx_player_volume', String(newVol));
    resetControlsTimeout();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    videoRef.current.muted = nextMuted;
    if (!nextMuted && volume === 0) {
      handleVolumeChange(0.5);
    }
    resetControlsTimeout();
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setIsSpeedMenuOpen(false);
    resetControlsTimeout();
  };

  const handleQualityChange = (qualityId: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = qualityId;
      setCurrentQuality(qualityId);
    }
    setIsQualityMenuOpen(false);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const isCurrentlyFs =
      !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) || isCssFullscreen;

    if (isCurrentlyFs) {
      // Exit fullscreen mode
      setIsCssFullscreen(false);
      setIsFullscreen(false);
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          (document as any).msExitFullscreen();
        }
      } catch {
        // ignore
      }
    } else {
      // Enter fullscreen mode
      const container = playerContainerRef.current;
      if (!container) return;

      const reqFs =
        container.requestFullscreen ||
        (container as any).webkitRequestFullscreen ||
        (container as any).mozRequestFullScreen ||
        (container as any).msRequestFullscreen;

      if (reqFs) {
        try {
          const promise = reqFs.call(container);
          if (promise && typeof promise.then === 'function') {
            promise
              .then(() => {
                setIsFullscreen(true);
              })
              .catch((err: any) => {
                console.warn('[PlayerPage] Native fullscreen denied/unsupported, activating CSS Fullscreen:', err);
                setIsCssFullscreen(true);
                setIsFullscreen(true);
              });
          } else {
            setIsFullscreen(true);
          }
        } catch (err: any) {
          console.warn('[PlayerPage] RequestFullscreen error, activating CSS Fullscreen:', err);
          setIsCssFullscreen(true);
          setIsFullscreen(true);
        }
      } else {
        // iOS Safari / WebKit fallback
        if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
          try {
            (videoRef.current as any).webkitEnterFullscreen();
          } catch {
            setIsCssFullscreen(true);
            setIsFullscreen(true);
          }
        } else {
          setIsCssFullscreen(true);
          setIsFullscreen(true);
        }
      }
    }
    resetControlsTimeout();
  };

  const totalEpisodes =
    mediaType === 'anime'
      ? title?.numberOfEpisodes || 24
      : title?.seasons?.find((s) => s.number === seasonNum)?.episodeCount || title?.numberOfEpisodes || 12;

  const hasPrevEpisode = episodeNum > 1;
  const hasNextEpisode = (mediaType === 'tv' || mediaType === 'anime') && episodeNum < totalEpisodes;

  const navigateEpisode = (targetEp: number) => {
    setIsEpisodeDrawerOpen(false);
    setIsIframeLoading(true);
    setNextEpisodeCountdown(null);
    if (mediaType === 'tv') {
      navigate(`/watch/tv/${id}/${seasonNum}/${targetEp}`);
    } else if (mediaType === 'anime') {
      navigate(`/watch/anime/${id}/1/${targetEp}`);
    }
  };

  // Video time update handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration || 0);

    // Calculate buffer
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedTime(bufferedEnd);
    }
  };

  // On Video Ended: Trigger Auto-Next Episode for Anime
  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      saveProgress(videoRef.current.duration, videoRef.current.duration);
    }
    if (hasNextEpisode) {
      setNextEpisodeCountdown(5);
    }
  };

  // Countdown timer for next episode
  useEffect(() => {
    if (nextEpisodeCountdown === null) return;
    if (nextEpisodeCountdown <= 0) {
      navigateEpisode(episodeNum + 1);
      return;
    }
    const timer = setTimeout(() => {
      setNextEpisodeCountdown((c) => (c !== null ? c - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [nextEpisodeCountdown, episodeNum]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (mediaType === 'anime') {
        if (e.key === ' ' || e.key === 'k' || e.key === 'K') {
          e.preventDefault();
          togglePlay();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          skipTime(-10);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          skipTime(10);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          toggleMute();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mediaType, volume, isPlaying]);

  // Format Seconds into MM:SS or HH:MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Embed URL for Movie & TV Series
  const embedUrl = api.getEmbedUrl({
    type: mediaType,
    id: id || '',
    season: seasonNum,
    episode: episodeNum,
    server: selectedServer !== 'auto' ? selectedServer : undefined,
    autoplay: true,
    muted: false,
    title: title?.title,
    poster: title?.backdrop || title?.poster,
  });

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className={`min-h-screen w-full bg-[#06070B] flex flex-col relative select-none overflow-hidden ${
        isCssFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen !m-0 !p-0' : ''
      }`}
    >
      {/* Sleek Top Navigation Header */}
      <header
        className={`fixed top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 max-w-7xl mx-auto z-40 transition-all duration-300 pointer-events-none ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="min-h-12 sm:min-h-14 px-3 sm:px-4 py-1.5 rounded-[20px] sm:rounded-full liquid-glass-dense liquid-specular flex items-center justify-between gap-1.5 sm:gap-3 shadow-2xl pointer-events-auto border border-white/20 flex-wrap sm:flex-nowrap">
          {/* Left: Back & Media Info */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(`/detail/${mediaType}/${id}`);
                }
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] cursor-pointer ios-spring shrink-0"
              title="Kembali"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-white truncate leading-tight max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                {title?.title || 'Memuat Pemutar...'}
              </h1>
              {(mediaType === 'tv' || mediaType === 'anime') && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-[#FFB224] font-medium truncate">
                  <span>{mediaType === 'anime' ? 'FrameX Native Stream' : `Musim ${seasonNum}`}</span>
                  <span>•</span>
                  <span>Episode {episodeNum}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls & Server Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Episode Quick Switcher for TV / Anime */}
            {(mediaType === 'tv' || mediaType === 'anime') && (
              <div className="flex items-center gap-0.5 sm:gap-1 bg-white/[0.06] border border-white/10 rounded-full p-0.5">
                <button
                  onClick={() => navigateEpisode(episodeNum - 1)}
                  disabled={!hasPrevEpisode}
                  title="Episode Sebelumnya"
                  aria-label="Episode Sebelumnya"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-25 disabled:pointer-events-none ios-spring cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsEpisodeDrawerOpen(!isEpisodeDrawerOpen)}
                  className="px-2 sm:px-2.5 py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-[10px] sm:text-[11px] font-bold text-[#FFB224] flex items-center gap-1 cursor-pointer ios-spring"
                  title="Buka daftar episode dengan thumbnail"
                >
                  <ListOrdered className="w-3 h-3 text-[#FFB224]" />
                  <span>Ep {episodeNum}</span>
                </button>

                <button
                  onClick={() => navigateEpisode(episodeNum + 1)}
                  disabled={!hasNextEpisode}
                  title="Episode Berikutnya"
                  aria-label="Episode Berikutnya"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-25 disabled:pointer-events-none ios-spring cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Anime Audio Sub / Dub Selector */}
            {mediaType === 'anime' && (
              <button
                onClick={() => {
                  const nextAudio = animeAudio === 'sub' ? 'dub' : 'sub';
                  setAnimeAudio(nextAudio);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1 ${
                  animeAudio === 'sub'
                    ? 'bg-[#FFB224]/20 border-[#FFB224]/50 text-[#FFB224]'
                    : 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                }`}
                title="Pilih Audio: Sub (Jepang) atau Dub (Inggris)"
              >
                <Volume2 className="w-3 h-3" />
                <span>{animeAudio === 'sub' ? 'SUB' : 'DUB'}</span>
              </button>
            )}

            {/* Player Mode Switcher: HLS Stream vs FrameX Embed */}
            <button
              onClick={() => {
                const nextMode = playerMode === 'hls' ? 'embed' : 'hls';
                setPlayerMode(nextMode);
                setAnimeError(null);
                setIframeKey((k) => k + 1);
              }}
              className="px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border-white/20 text-white shrink-0"
              title="Ganti Mode Pemutar: HLS Stream vs FrameX Embed"
            >
              {playerMode === 'hls' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">HLS Stream</span>
                  <span className="sm:hidden">HLS</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-[#FFB224]" />
                  <span className="hidden sm:inline">FrameX Embed</span>
                  <span className="sm:hidden">Embed</span>
                </>
              )}
            </button>

            {/* Server Selector Dropdown */}
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full liquid-glass text-xs text-white">
              <Server className="w-3 h-3 text-[#FFB224] shrink-0" />
              <select
                value={selectedServer}
                onChange={(e) => {
                  setSelectedServer(e.target.value);
                  setIframeKey((k) => k + 1);
                }}
                aria-label="Pilih server stream"
                className="bg-transparent text-[10px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[95px] sm:max-w-[155px] truncate"
              >
                <option value="auto" className="bg-[#12141F] text-white">
                  ⚡ ZHAFX AUTO
                </option>
                {providers
                  .filter((p) => p.id !== 'auto' && p.id !== 'direct_stream')
                  .map((p, idx) => {
                    const serverLabel = p.name.startsWith('ZHAFX ENTITY')
                      ? p.name
                      : `ZHAFX ENTITY ${String(idx + 1).padStart(3, '0')}`;
                    return (
                      <option key={p.id} value={p.id} className="bg-[#12141F] text-white">
                        {serverLabel}
                      </option>
                    );
                  })}
              </select>
            </div>

            {/* Reload Stream Button */}
            <button
              onClick={() => {
                setIframeKey((k) => k + 1);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              title="Muat ulang stream"
              aria-label="Muat ulang stream"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Button (always visible on mobile & desktop) */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* SERIES EPISODE SELECTION DRAWER WITH THUMBNAILS */}
      {isEpisodeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
            onClick={() => setIsEpisodeDrawerOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] liquid-glass-dense liquid-specular p-5 sm:p-6 space-y-4 z-10 border border-white/20 shadow-2xl text-white">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-[#FFB224]" />
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Pilih Episode ({mediaType === 'anime' ? 'Anime HD' : `Musim ${seasonNum}`})
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Lihat cuplikan visual thumbnail setiap episode
                  </p>
                </div>
              </div>

              {/* View toggle (Thumbnails vs Quick Grid) */}
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 rounded-full bg-white/10 border border-white/10 text-xs">
                  <button
                    onClick={() => setDrawerTab('thumbnails')}
                    className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      drawerTab === 'thumbnails' ? 'bg-[#FFB224] text-black font-bold' : 'text-white/70'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => setDrawerTab('grid')}
                    className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      drawerTab === 'grid' ? 'bg-[#FFB224] text-black font-bold' : 'text-white/70'
                    }`}
                  >
                    Angka
                  </button>
                </div>

                <button
                  onClick={() => setIsEpisodeDrawerOpen(false)}
                  className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer ios-spring"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab 1: Thumbnails View */}
            {drawerTab === 'thumbnails' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => {
                  const isCurrent = ep === episodeNum;
                  const matchingEp = drawerEpisodes.find((e) => e.number === ep);
                  const epThumb = matchingEp?.still || matchingEp?.stillPath || title?.backdrop || title?.poster;

                  return (
                    <button
                      key={ep}
                      onClick={() => navigateEpisode(ep)}
                      className={`flex items-center gap-3 p-2.5 rounded-[18px] border text-left transition-all cursor-pointer ios-spring group ${
                        isCurrent
                          ? 'bg-[#FFB224]/15 border-[#FFB224] shadow-lg'
                          : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10'
                      }`}
                    >
                      <div className="relative w-28 aspect-video shrink-0 rounded-[10px] overflow-hidden bg-black/40 border border-white/10">
                        <img
                          src={epThumb}
                          alt={`Ep ${ep}`}
                          loading="lazy"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              title?.backdrop || title?.poster || '';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                          Ep {ep}
                        </div>
                        {isCurrent && (
                          <div className="absolute inset-0 bg-[#FFB224]/30 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-black" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-[#FFB224] line-clamp-1">
                          {matchingEp?.name || `Episode ${ep}`}
                        </h4>
                        {matchingEp?.overview && (
                          <p className="text-[10px] text-white/50 line-clamp-2 mt-0.5 leading-snug">
                            {matchingEp.overview}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Tab 2: Compact Numbers Grid */
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-[60vh] overflow-y-auto pr-1">
                {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => {
                  const isCurrent = ep === episodeNum;
                  return (
                    <button
                      key={ep}
                      onClick={() => navigateEpisode(ep)}
                      className={`py-3 px-2 rounded-[16px] text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ios-spring ${
                        isCurrent
                          ? 'bg-[#FFB224] text-black font-bold shadow-lg scale-105'
                          : 'bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-white'
                      }`}
                    >
                      <span>Ep {ep}</span>
                      {isCurrent && <CheckCircle2 className="w-3 h-3 text-black" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Viewport Container */}
      <div className="relative flex-1 w-full h-screen bg-black flex items-center justify-center overflow-hidden">
        {/* Loading Overlay */}
        {(isLoadingAnime || (playerMode === 'embed' && isIframeLoading)) && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070B] space-y-3 pointer-events-none px-4 text-center">
            <div className="w-11 h-11 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/60 tracking-wider uppercase">
              {playerMode === 'hls' ? 'Menyiapkan Stream HLS dari API FrameX...' : 'Memuat Pemutar Embed FrameX...'}
            </span>
          </div>
        )}

        {/* Error State for HLS Stream with 1-Click Failover to FrameX Embed */}
        {playerMode === 'hls' && animeError && !isLoadingAnime && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06070B] p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Stream HLS Memerlukan Mode Embed</h3>
            <p className="text-xs text-white/60 max-w-md">
              {animeError}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  setPlayerMode('embed');
                  setAnimeError(null);
                  setIsIframeLoading(true);
                  setIframeKey((k) => k + 1);
                }}
                className="px-5 py-2.5 rounded-full bg-[#FFB224] text-black text-xs font-bold hover:bg-[#FFA500] cursor-pointer shadow-lg ios-spring flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Putar via Embed FrameX (Rekomendasi)</span>
              </button>
              <button
                onClick={() => {
                  setSelectedServer('auto');
                  setIframeKey((k) => k + 1);
                }}
                className="px-4 py-2.5 rounded-full liquid-glass text-white text-xs font-semibold hover:bg-white/10 cursor-pointer ios-spring"
              >
                Ganti ke Server Otomatis
              </button>
              <button
                onClick={() => setIframeKey((k) => k + 1)}
                className="px-4 py-2.5 rounded-full liquid-glass text-white text-xs font-semibold hover:bg-white/10 cursor-pointer ios-spring"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {/* Next Episode Countdown Overlay */}
        {nextEpisodeCountdown !== null && (
          <div className="absolute inset-0 z-35 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#FFB224]/20 border border-[#FFB224]/40 flex items-center justify-center text-[#FFB224]">
              <FastForward className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Memutar Episode Berikutnya</h3>
              <p className="text-xs text-white/60 mt-1">
                Episode {episodeNum + 1} akan dimulai dalam <span className="text-[#FFB224] font-bold">{nextEpisodeCountdown}</span> detik
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateEpisode(episodeNum + 1)}
                className="px-6 py-2.5 rounded-full bg-[#FFB224] text-black text-xs font-bold hover:bg-[#FFA500] cursor-pointer shadow-lg ios-spring"
              >
                Putar Sekarang
              </button>
              <button
                onClick={() => setNextEpisodeCountdown(null)}
                className="px-4 py-2.5 rounded-full liquid-glass text-white text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------
            PLAYER RENDERING: HLS NATIVE OR OFFICIAL FRAMEX EMBED
            ------------------------------------------------------------- */}
        {playerMode === 'hls' && animeStream?.sources?.[0]?.url ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black group">
            {/* Video Element */}
            <video
              ref={videoRef}
              key={`${id}-${episodeNum}-${animeStream?.sources?.[0]?.url}`}
              playsInline
              crossOrigin="anonymous"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="w-full h-full object-contain cursor-pointer"
            >
              {subtitles.map((sub, i) => (
                <track
                  key={`${i}-${sub.url}`}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang || 'id'}
                  label={sub.label || `Subtitle ${i + 1}`}
                  default={activeSubtitleUrl === sub.url}
                />
              ))}
              Browser Anda tidak mendukung pemutar video HTML5.
            </video>

            {/* Big Center Play / Pause Indicator (shows on toggle) */}
            <div
              onClick={togglePlay}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 pointer-events-none ${
                !isPlaying && !isLoadingAnime ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl pl-1">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFB224]" />
              </div>
            </div>

            {/* Custom Control Bar Overlay */}
            <div
              className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-16 pb-4 sm:pb-6 px-3 sm:px-6 transition-all duration-300 ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              {/* Progress Timeline Scrubber */}
              <div className="relative mb-3 group/timeline cursor-pointer" onClick={handleSeek}>
                {/* Background track */}
                <div
                  ref={progressBarRef}
                  className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full relative overflow-hidden group-hover/timeline:h-2.5 transition-all"
                >
                  {/* Buffer bar */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all duration-150"
                    style={{ width: `${duration > 0 ? (bufferedTime / duration) * 100 : 0}%` }}
                  />
                  {/* Played progress bar */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-[#FFB224] rounded-full transition-all duration-75"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-2 text-white">
                {/* Left Controls: Play, Skips, Episode Prev/Next, Time */}
                <div className="flex items-center gap-1 sm:gap-3">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer ios-spring"
                    title={isPlaying ? 'Jeda (Spasi)' : 'Putar (Spasi)'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 pl-0.5 text-[#FFB224]" />}
                  </button>

                  {/* 10s Rewind */}
                  <button
                    onClick={() => skipTime(-10)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer ios-spring"
                    title="Mundur 10 Detik (Panah Kiri)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* 10s Fast Forward */}
                  <button
                    onClick={() => skipTime(10)}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer ios-spring"
                    title="Maju 10 Detik (Panah Kanan)"
                  >
                    <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  {/* Prev Episode */}
                  <button
                    onClick={() => navigateEpisode(episodeNum - 1)}
                    disabled={!hasPrevEpisode}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 hidden sm:flex items-center justify-center text-white/80 hover:text-white disabled:opacity-20 cursor-pointer"
                    title="Episode Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Next Episode */}
                  <button
                    onClick={() => navigateEpisode(episodeNum + 1)}
                    disabled={!hasNextEpisode}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 hidden sm:flex items-center justify-center text-white/80 hover:text-white disabled:opacity-20 cursor-pointer"
                    title="Episode Berikutnya"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  {/* Volume Controller */}
                  <div className="flex items-center gap-1.5 ml-1 group/vol">
                    <button
                      onClick={toggleMute}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
                      title={isMuted ? 'Buka Suara (M)' : 'Bisukan (M)'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-rose-400" />
                      ) : volume < 0.5 ? (
                        <Volume1 className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-14 sm:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#FFB224] hidden sm:block"
                    />
                  </div>

                  {/* Time Counter */}
                  <div className="text-[11px] sm:text-xs font-mono text-white/70 ml-2">
                    <span className="text-white font-semibold">{formatTime(currentTime)}</span>
                    <span className="mx-1 text-white/30">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Controls: Subtitles, Quality, Speed, Fullscreen */}
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Subtitle Selector */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsSubtitleMenuOpen(!isSubtitleMenuOpen);
                        setIsQualityMenuOpen(false);
                        setIsSpeedMenuOpen(false);
                      }}
                      className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 cursor-pointer ios-spring ${
                        activeSubtitleUrl
                          ? 'bg-[#FFB224]/20 border-[#FFB224]/50 text-[#FFB224]'
                          : 'bg-white/10 border-white/20 text-white/70'
                      }`}
                      title="Pilihan Subtitle"
                    >
                      <Subtitles className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Sub</span>
                    </button>

                    {isSubtitleMenuOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-56 max-h-60 overflow-y-auto rounded-[20px] liquid-glass-dense p-2 shadow-2xl border border-white/20 z-50 text-xs">
                        <div className="px-2 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                          Pilihan Teks Subtitle
                        </div>
                        <button
                          onClick={() => {
                            setActiveSubtitleUrl(null);
                            setIsSubtitleMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                            !activeSubtitleUrl ? 'bg-[#FFB224]/20 text-[#FFB224] font-bold' : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span>Nonaktifkan Subtitle</span>
                          {!activeSubtitleUrl && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        {subtitles.map((sub, i) => {
                          const isSelected = activeSubtitleUrl === sub.url;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                setActiveSubtitleUrl(sub.url);
                                setIsSubtitleMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between truncate ${
                                isSelected ? 'bg-[#FFB224]/20 text-[#FFB224] font-bold' : 'text-white/80 hover:bg-white/10'
                              }`}
                            >
                              <span className="truncate">{sub.label || `Subtitle ${sub.lang}`}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quality Selector */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsQualityMenuOpen(!isQualityMenuOpen);
                        setIsSubtitleMenuOpen(false);
                        setIsSpeedMenuOpen(false);
                      }}
                      className="px-2 py-1 rounded-full text-xs font-medium liquid-glass flex items-center gap-1 cursor-pointer ios-spring text-white"
                      title="Resolusi Kualitas Video"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#FFB224]" />
                      <span className="hidden sm:inline">
                        {currentQuality === -1 ? 'Auto' : qualities.find((q) => q.id === currentQuality)?.label || 'HD'}
                      </span>
                    </button>

                    {isQualityMenuOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-40 rounded-[20px] liquid-glass-dense p-2 shadow-2xl border border-white/20 z-50 text-xs">
                        <div className="px-2 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                          Kualitas Video
                        </div>
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                            currentQuality === -1 ? 'bg-[#FFB224]/20 text-[#FFB224] font-bold' : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span>Auto (Adaptif)</span>
                          {currentQuality === -1 && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        {qualities.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => handleQualityChange(q.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                              currentQuality === q.id ? 'bg-[#FFB224]/20 text-[#FFB224] font-bold' : 'text-white/80 hover:bg-white/10'
                            }`}
                          >
                            <span>{q.label}</span>
                            {currentQuality === q.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Playback Speed Selector */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsSpeedMenuOpen(!isSpeedMenuOpen);
                        setIsSubtitleMenuOpen(false);
                        setIsQualityMenuOpen(false);
                      }}
                      className="px-2 py-1 rounded-full text-xs font-medium liquid-glass flex items-center gap-1 cursor-pointer ios-spring text-white"
                      title="Kecepatan Putar"
                    >
                      <Gauge className="w-3.5 h-3.5 text-[#FFB224]" />
                      <span>{playbackRate}x</span>
                    </button>

                    {isSpeedMenuOpen && (
                      <div className="absolute bottom-full right-0 mb-2 w-32 rounded-[20px] liquid-glass-dense p-2 shadow-2xl border border-white/20 z-50 text-xs">
                        <div className="px-2 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                          Kecepatan
                        </div>
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => handleSpeedChange(spd)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                              playbackRate === spd ? 'bg-[#FFB224]/20 text-[#FFB224] font-bold' : 'text-white/80 hover:bg-white/10'
                            }`}
                          >
                            <span>{spd === 1 ? '1.0x (Normal)' : `${spd}x`}</span>
                            {playbackRate === spd && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white cursor-pointer ios-spring ml-1"
                    title={isFullscreen ? 'Keluar Layar Penuh (F)' : 'Layar Penuh (F)'}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* -------------------------------------------------------------
             OFFICIAL FRAMEX EMBED IFRAME (MOVIE, TV SERIES, ANIME)
             ------------------------------------------------------------- */
          <iframe
            key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${selectedServer}-${iframeKey}-${playerMode}`}
            src={embedUrl}
            title={title?.title || 'Zhafx Stream'}
            onLoad={() => setIsIframeLoading(false)}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
            allowFullScreen={true}
            referrerPolicy="origin"
            // @ts-ignore
            webkitallowfullscreen="true"
            // @ts-ignore
            mozallowfullscreen="true"
            loading="eager"
            className="w-full h-full border-0 absolute inset-0"
          />
        )}
      </div>
    </div>
  );
};
