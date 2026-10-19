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
  Play,
  Pause,
  AlertTriangle,
  Subtitles,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, MediaType, Episode, StreamSource, SubtitleTrack } from '../types';
import { storage } from '../lib/storage';

export interface ServerOption {
  id: string;
  name: string;
  tagline: string;
  mode: 'hls' | 'embed';
  provider: string;
}

export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'anime-1',
    name: 'Server 1 — Grand Warden (HLS Bebas Iklan)',
    tagline: 'Grand Warden • 1080p Ultra HD Direct Stream',
    mode: 'hls',
    provider: 'grand_warden',
  },
  {
    id: 'anime-2',
    name: 'Server 2 — Wizard Dual Audio (HLS Bebas Iklan)',
    tagline: 'Wizard • Dual Audio & Softsub Cepat',
    mode: 'hls',
    provider: 'wizard',
  },
  {
    id: 'anime-3',
    name: 'Server 3 — Super P.E.K.K.A (HLS Bebas Iklan)',
    tagline: 'Super P.E.K.K.A • 1080p High Bitrate Multi-Source',
    mode: 'hls',
    provider: 'super_pekka',
  },
  {
    id: 'anime-4',
    name: 'Server 4 — Valkyrie (HLS Bebas Iklan)',
    tagline: 'Valkyrie • FlixCloud HD Fast CDN',
    mode: 'hls',
    provider: 'valkyrie',
  },
  {
    id: 'anime-5',
    name: 'Server 5 — Giant (HLS Bebas Iklan)',
    tagline: 'Giant • Universal Multi-CDN Stream',
    mode: 'hls',
    provider: 'giant',
  },
  {
    id: 'anime-6',
    name: 'Server 6 — Goblin (HLS Bebas Iklan)',
    tagline: 'Goblin • Direct Fast Auto Stream',
    mode: 'hls',
    provider: 'goblin',
  },
  {
    id: 'anime-embed',
    name: 'Server 7 — FrameX Embed (Sandboxed Proteksi Iklan)',
    tagline: 'Player Embed Cadangan dengan Proteksi Sandbox Anti-Iklan',
    mode: 'embed',
    provider: 'framex',
  },
];

export const MOVIE_SERVERS: ServerOption[] = [
  {
    id: 'movie-1',
    name: 'Server 1 — Bowler Multi-Bahasa (HLS Bebas Iklan)',
    tagline: 'Bowler • Direct HLS HD Stream Bebas Iklan',
    mode: 'hls',
    provider: 'bowler',
  },
  {
    id: 'movie-2',
    name: 'Server 2 — Miner 1080p (HLS Bebas Iklan)',
    tagline: 'Miner • 1080p Ultra Cloud Stream',
    mode: 'hls',
    provider: 'miner',
  },
  {
    id: 'movie-3',
    name: 'Server 3 — Headhunter Multi-Sub (HLS Bebas Iklan)',
    tagline: 'Headhunter • Multi-Subtitle & High Quality',
    mode: 'hls',
    provider: 'headhunter',
  },
  {
    id: 'movie-4',
    name: 'Server 4 — Valkyrie Stabil (HLS Bebas Iklan)',
    tagline: 'Valkyrie • Cloud CDN Cepat',
    mode: 'hls',
    provider: 'valkyrie',
  },
  {
    id: 'movie-5',
    name: 'Server 5 — Super Barbarian (HLS Bebas Iklan)',
    tagline: 'Super Barbarian • Direct Auto HLS',
    mode: 'hls',
    provider: 'super_barbarian',
  },
  {
    id: 'movie-embed',
    name: 'Server 6 — FrameX Embed (Sandboxed Proteksi Iklan)',
    tagline: 'Player Embed Cadangan dengan Proteksi Sandbox Anti-Iklan',
    mode: 'embed',
    provider: 'framex',
  },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

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

  const isIdValid = Boolean(id && String(id).trim() !== '' && String(id) !== 'undefined' && String(id) !== 'null');
  const isEpisodeValid = !isNaN(episodeNum) && episodeNum >= 1;
  const isPlayable = isIdValid && isEpisodeValid;

  const serverList = mediaType === 'anime' ? ANIME_SERVERS : MOVIE_SERVERS;

  const [title, setTitle] = useState<Title | null>(null);
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [animeAudio, setAnimeAudio] = useState<'sub' | 'dub'>('sub');

  // Stream state for HLS playback
  const [streamSources, setStreamSources] = useState<StreamSource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<string>('off');
  const [activePlaybackSpeed, setActivePlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);

  // Player mode: 'hls' or 'embed'
  const activeServer = serverList[currentServerIndex] || serverList[0];
  const [effectiveMode, setEffectiveMode] = useState<'hls' | 'embed'>('hls');

  // Loading, buffering & error state
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [failoverToast, setFailoverToast] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Video playback controls state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // UI Fullscreen & HUD controls auto-hide
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Episode Drawer
  const [drawerEpisodes, setDrawerEpisodes] = useState<Episode[]>([]);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'thumbnails' | 'grid'>('thumbnails');

  // DOM Refs
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastTouchTimeRef = useRef<number>(0);
  const hasSeekedInitRef = useRef<boolean>(false);

  // Strict Global Anti-Popup and Anti-Redirect Protection
  useEffect(() => {
    const originalOpen = window.open;
    // Disarm window.open completely
    window.open = function (...args: any[]) {
      console.warn('[Zhafx Anti-Ad Engine] Intercepted and blocked window.open popup attempt:', args);
      return null;
    };

    const handleIntercept = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target?.closest?.('a');
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        const targetAttr = anchor.getAttribute('target');
        if (targetAttr === '_blank' || (href.startsWith('http') && !href.includes(window.location.hostname))) {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[Zhafx Anti-Ad Engine] Intercepted rogue external anchor navigation:', href);
        }
      }
    };

    window.addEventListener('click', handleIntercept, true);
    window.addEventListener('auxclick', handleIntercept, true);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('click', handleIntercept, true);
      window.removeEventListener('auxclick', handleIntercept, true);
    };
  }, []);

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

  // Fetch Title Metadata & Season Episodes
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    const fetchInitData = async () => {
      try {
        const details = await api.getDetails(id, mediaType, controller.signal).catch(() => null);
        if (controller.signal.aborted) return;

        let finalTitle: Title;
        if (details) {
          finalTitle = details;
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

  // Main Stream Resolver: fetches direct HLS stream or switches gracefully to Embed
  useEffect(() => {
    if (!isPlayable) {
      setIsLoading(false);
      return;
    }

    const currentOption = serverList[currentServerIndex] || serverList[0];

    // If server option is explicitly embed, switch directly to sandboxed embed player
    if (currentOption.mode === 'embed') {
      setEffectiveMode('embed');
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    setIsLoading(true);
    hasSeekedInitRef.current = false;

    const loadStream = async () => {
      try {
        let streamData: any = null;

        if (mediaType === 'anime') {
          // Determine target provider for sub vs dub
          let targetProv = currentOption.provider;
          if (animeAudio === 'dub' && !targetProv.endsWith('_dub')) {
            targetProv = `${targetProv}_dub`;
          }

          streamData = await api.getAnimeStream({
            id: String(id),
            episode: episodeNum,
            provider: targetProv,
            audio: animeAudio,
            title: title?.title || searchParams.get('title') || undefined,
            signal: controller.signal,
          });
        } else {
          // Movie or TV series
          streamData = await api.getStream({
            id: String(id),
            type: mediaType,
            season: seasonNum,
            episode: episodeNum,
            provider: currentOption.provider,
            signal: controller.signal,
          });
        }

        if (isCancelled) return;

        if (streamData && streamData.sources && streamData.sources.length > 0) {
          setStreamSources(streamData.sources);
          setActiveSourceIndex(0);
          setSubtitles(streamData.subtitles || []);
          setEffectiveMode('hls');
          setIsLoading(false);
        } else {
          // If this HLS server has no stream, try cascading to the next HLS server automatically!
          const nextIdx = currentServerIndex + 1;
          if (nextIdx < serverList.length && serverList[nextIdx].mode === 'hls') {
            const nextServer = serverList[nextIdx];
            setFailoverToast(`Server ${currentOption.name} kosong, beralih ke ${nextServer.name}...`);
            setTimeout(() => setFailoverToast(null), 3500);
            setCurrentServerIndex(nextIdx);
          } else {
            // All HLS servers exhausted, smoothly fallback to sandboxed embed mode
            setFailoverToast('Beralih ke Server Cadangan Terproteksi (Anti-Iklan)...');
            setTimeout(() => setFailoverToast(null), 3500);
            setEffectiveMode('embed');
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.warn('[PlayerPage] Stream load error:', err?.message || err);

        // Auto failover on network error
        const nextIdx = currentServerIndex + 1;
        if (nextIdx < serverList.length && serverList[nextIdx].mode === 'hls') {
          setCurrentServerIndex(nextIdx);
        } else {
          setEffectiveMode('embed');
          setIsLoading(false);
        }
      }
    };

    loadStream();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [id, mediaType, seasonNum, episodeNum, currentServerIndex, animeAudio, reloadKey, isPlayable, title?.title, searchParams, serverList]);

  // HLS Video Element Binding
  useEffect(() => {
    if (effectiveMode !== 'hls' || streamSources.length === 0 || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const currentSrc = streamSources[activeSourceIndex] || streamSources[0];
    const streamUrl = currentSrc?.url;

    if (!streamUrl) return;

    // Destroy any existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Auto-resume from watch progress
    const initSeekProgress = () => {
      if (hasSeekedInitRef.current || !id) return;
      const progress = storage.getProgress(
        id,
        mediaType === 'tv' ? seasonNum : undefined,
        mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined
      );
      if (progress && progress.progressPercentage && progress.progressPercentage > 2 && progress.progressPercentage < 95) {
        if (progress.duration && progress.currentTime) {
          video.currentTime = progress.currentTime;
          hasSeekedInitRef.current = true;
        }
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        initSeekProgress();
        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.warn('[Hls Error]:', data.type, data.details);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HLS Fatal] Network error, recovering...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS Fatal] Media error, recovering...');
              hls.recoverMediaError();
              break;
            default:
              console.warn('[HLS Fatal] Unrecoverable error, cascading to next server');
              hls.destroy();
              if (currentServerIndex + 1 < serverList.length) {
                setCurrentServerIndex((prev) => prev + 1);
              } else {
                setEffectiveMode('embed');
              }
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari iOS / iPadOS HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        initSeekProgress();
        video.play().catch(() => setIsPlaying(false));
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [effectiveMode, streamSources, activeSourceIndex, id, currentServerIndex, serverList]);

  // Video Events Listeners (timeupdate, buffering, progress saving)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || effectiveMode !== 'hls') return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsLoading(false);
    };

    let lastSavedTime = 0;
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);

      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }

      // Save watch progress to local & server every 8 seconds
      const now = Math.floor(video.currentTime);
      if (now - lastSavedTime >= 8 && id && video.duration > 0) {
        lastSavedTime = now;
        const progressPct = Math.round((video.currentTime / video.duration) * 100);
        storage.saveProgress({
          contentId: id,
          mediaType,
          title: title?.title || 'Tayangan',
          poster: title?.poster || '',
          backdrop: title?.backdrop,
          year: title?.year || '2024',
          season: mediaType === 'tv' ? seasonNum : undefined,
          episode: mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined,
          currentTime: Math.round(video.currentTime),
          duration: Math.round(video.duration),
          progressPercentage: progressPct,
          completed: progressPct >= 95,
        });
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, [effectiveMode, id, mediaType, seasonNum, episodeNum, title]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const video = videoRef.current;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video && effectiveMode === 'hls') {
            if (video.paused) video.play();
            else video.pause();
          }
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          if (video && effectiveMode === 'hls') {
            video.currentTime = Math.max(0, video.currentTime - 10);
          }
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (video && effectiveMode === 'hls') {
            video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (video && effectiveMode === 'hls') {
            const newVol = Math.min(1, video.volume + 0.1);
            video.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (video && effectiveMode === 'hls') {
            const newVol = Math.max(0, video.volume - 0.1);
            video.volume = newVol;
            setVolume(newVol);
            setIsMuted(newVol === 0);
          }
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          if (video && effectiveMode === 'hls') {
            video.muted = !video.muted;
            setIsMuted(video.muted);
          }
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveMode]);

  // Switch to Next Server
  const handleNextServer = () => {
    const nextIdx = (currentServerIndex + 1) % serverList.length;
    setCurrentServerIndex(nextIdx);
    setFailoverToast(`Beralih ke ${serverList[nextIdx].name}...`);
    setTimeout(() => setFailoverToast(null), 3000);
    setReloadKey((k) => k + 1);
  };

  // Reload current stream
  const handleReload = () => {
    setReloadKey((k) => k + 1);
  };

  // Seekbar click handler
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    videoRef.current.currentTime = percent * duration;
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    const isCurrentlyFs =
      !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) || isCssFullscreen;

    if (isCurrentlyFs) {
      setIsCssFullscreen(false);
      setIsFullscreen(false);
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      } catch {}
    } else {
      const reqFs =
        container.requestFullscreen ||
        (container as any).webkitRequestFullscreen ||
        (container as any).mozRequestFullScreen ||
        (container as any).msRequestFullscreen;

      if (reqFs) {
        reqFs
          .call(container)
          .then(() => setIsFullscreen(true))
          .catch(() => {
            setIsCssFullscreen(true);
            setIsFullscreen(true);
          });
      } else {
        setIsCssFullscreen(true);
        setIsFullscreen(true);
      }
    }
  };

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedMenu(false);
      setShowSubMenu(false);
    }, 4500);
  }, []);

  // Handle Double-Tap for 10s Seek on Mobile Touch
  const handleVideoTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    resetControlsTimeout();
    const now = Date.now();
    const timeSinceLast = now - lastTouchTimeRef.current;
    lastTouchTimeRef.current = now;

    if (timeSinceLast < 300 && videoRef.current && effectiveMode === 'hls') {
      const touch = e.touches[0] || e.changedTouches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      if (x < rect.width * 0.4) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      } else if (x > rect.width * 0.6) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
      }
    }
  };

  const totalEpisodes =
    mediaType === 'anime'
      ? title?.numberOfEpisodes || 24
      : title?.seasons?.find((s) => s.number === seasonNum)?.episodeCount || title?.numberOfEpisodes || 12;

  const hasPrevEpisode = episodeNum > 1;
  const hasNextEpisode = (mediaType === 'tv' || mediaType === 'anime') && episodeNum < totalEpisodes;

  const navigateEpisode = (targetEp: number) => {
    setIsEpisodeDrawerOpen(false);
    setIsLoading(true);
    if (mediaType === 'tv') {
      navigate(`/watch/tv/${id}/${seasonNum}/${targetEp}`);
    } else if (mediaType === 'anime') {
      navigate(`/watch/anime/${id}/1/${targetEp}`);
    }
  };

  // Safe Sandboxed Embed URL builder (with adblock params)
  const buildSandboxedEmbedUrl = (): string => {
    if (!isPlayable) return '';
    const cleanId = encodeURIComponent(String(id).trim());
    const validEp = Math.max(1, episodeNum);
    const validSeason = Math.max(1, seasonNum);

    if (mediaType === 'anime') {
      const url = new URL(`https://framextv.xyz/embed/anime/${cleanId}/${validEp}`);
      url.searchParams.set('id', String(id));
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('season', '1');
      url.searchParams.set('type', 'anime');
      url.searchParams.set('sub_type', animeAudio);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      // Anti-ad parameters to suppress popup scripts
      url.searchParams.set('no_ads', '1');
      url.searchParams.set('adblock', '1');
      if (title?.title) url.searchParams.set('title', title.title.trim());
      return url.toString();
    }

    if (mediaType === 'tv') {
      const url = new URL(`https://framextv.xyz/embed/tv/${cleanId}/${validSeason}/${validEp}`);
      url.searchParams.set('id', String(id));
      url.searchParams.set('season', String(validSeason));
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('type', 'tv');
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1');
      url.searchParams.set('adblock', '1');
      if (title?.title) url.searchParams.set('title', title.title.trim());
      return url.toString();
    }

    // Movie
    const url = new URL(`https://framextv.xyz/embed/movie/${cleanId}`);
    url.searchParams.set('id', String(id));
    url.searchParams.set('type', 'movie');
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
    url.searchParams.set('no_ads', '1');
    url.searchParams.set('adblock', '1');
    if (title?.title) url.searchParams.set('title', title.title.trim());
    return url.toString();
  };

  const embedUrl = buildSandboxedEmbedUrl();

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className={`min-h-screen w-full bg-[#06070B] flex flex-col relative select-none overflow-hidden ${
        isCssFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen !m-0 !p-0' : ''
      }`}
    >
      {/* Top Navigation Bar */}
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
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-bold text-white truncate leading-tight max-w-[130px] sm:max-w-[200px] md:max-w-xs">
                  {title?.title || 'Memuat Pemutar...'}
                </h1>
                {effectiveMode === 'hls' && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold border border-emerald-500/30">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Bebas Iklan
                  </span>
                )}
              </div>
              {(mediaType === 'tv' || mediaType === 'anime') && (
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/80 font-medium truncate">
                  <span>{mediaType === 'anime' ? 'Anime Stream' : `Musim ${seasonNum}`}</span>
                  <span>•</span>
                  <span>Episode {episodeNum}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls & Server Switcher */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Episode Selector for TV / Anime */}
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
                  className="px-2 sm:px-2.5 py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer ios-spring"
                  title="Buka daftar episode"
                >
                  <ListOrdered className="w-3 h-3 text-white" />
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
                  setReloadKey((k) => k + 1);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1 ${
                  animeAudio === 'sub'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-[#FFB224]/20 border-[#FFB224]/50 text-[#FFB224]'
                }`}
                title="Pilih Audio: Sub (Jepang) atau Dub (Inggris)"
              >
                <Volume2 className="w-3 h-3" />
                <span>{animeAudio === 'sub' ? 'SUB' : 'DUB'}</span>
              </button>
            )}

            {/* Dedicated "Ganti Server" Button */}
            <button
              onClick={handleNextServer}
              className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1.5 bg-[#FFB224]/20 hover:bg-[#FFB224]/30 border-[#FFB224]/50 text-[#FFB224] shrink-0"
              title="Ganti ke Server Cadangan Berikutnya"
            >
              <Server className="w-3 h-3" />
              <span className="hidden xs:inline">Ganti</span> Server
            </button>

            {/* Server Selector Dropdown */}
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full liquid-glass text-xs text-white">
              <select
                value={currentServerIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  setCurrentServerIndex(idx);
                  setReloadKey((k) => k + 1);
                }}
                aria-label="Pilih server stream"
                className="bg-transparent text-[10px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[170px] truncate"
              >
                {serverList.map((s, idx) => (
                  <option key={s.id} value={idx} className="bg-[#12141F] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reload Stream Button */}
            <button
              onClick={handleReload}
              title="Muat ulang pemutar"
              aria-label="Muat ulang pemutar"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Button */}
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

      {/* SERIES EPISODE SELECTION DRAWER */}
      {isEpisodeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
            onClick={() => setIsEpisodeDrawerOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] liquid-glass-dense liquid-specular p-5 sm:p-6 space-y-4 z-10 border border-white/20 shadow-2xl text-white">
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
      <div
        className="relative flex-1 w-full h-screen bg-black flex items-center justify-center overflow-hidden"
        onTouchStart={handleVideoTouch}
        onClick={() => {
          if (effectiveMode === 'hls') {
            setShowControls(!showControls);
          }
        }}
      >
        {/* Failover Toast Notice */}
        {failoverToast && (
          <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full liquid-glass-dense border border-amber-500/50 text-amber-300 text-[11px] sm:text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{failoverToast}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && isPlayable && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06070B]/85 backdrop-blur-sm space-y-3 pointer-events-none px-4 text-center">
            <div className="w-12 h-12 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/90 tracking-wider">
              Menghubungkan ke {serverList[currentServerIndex].name}...
            </span>
          </div>
        )}

        {/* Buffering Spinner during playback */}
        {isBuffering && !isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 border-4 border-white/15 border-t-[#FFB224] rounded-full animate-spin" />
          </div>
        )}

        {/* Validation Error Screen */}
        {!isPlayable && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06070B] p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
              <AlertTriangle className="w-7 h-7 text-[#FFB224]" />
            </div>
            <h3 className="text-lg font-bold text-white">Tayangan belum tersedia</h3>
            <p className="text-xs text-white/60 max-w-md">
              Tayangan atau episode yang Anda tuju belum tersedia atau ID tidak valid.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                  } else {
                    navigate(`/detail/${mediaType}/${id || ''}`);
                  }
                }}
                className="px-5 py-2.5 rounded-full bg-[#FFB224] text-black text-xs font-bold hover:bg-[#FFA500] cursor-pointer shadow-lg ios-spring"
              >
                Kembali
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            MODE 1: NATIVE HLS VIDEO PLAYER (100% Ad-Free, No Popups)
            ======================================================== */}
        {isPlayable && effectiveMode === 'hls' && (
          <div className="relative w-full h-full flex items-center justify-center group">
            <video
              ref={videoRef}
              playsInline
              className="w-full h-full object-contain bg-black cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  if (videoRef.current.paused) videoRef.current.play();
                  else videoRef.current.pause();
                }
              }}
            >
              {/* Native Subtitles Track */}
              {subtitles.map((sub, idx) => (
                <track
                  key={idx}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang || 'id'}
                  label={sub.label || `Subtitle ${idx + 1}`}
                  default={idx === 0}
                />
              ))}
            </video>

            {/* Bottom Cinematic Control Bar */}
            <div
              className={`absolute bottom-0 inset-x-0 z-40 p-3 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-all duration-300 ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Seekbar */}
              <div
                className="relative w-full h-2.5 sm:h-3 rounded-full bg-white/20 cursor-pointer flex items-center group/seek mb-3.5"
                onClick={handleSeek}
              >
                {/* Buffered Range */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-white/30 rounded-full"
                  style={{ width: `${duration > 0 ? (bufferedEnd / duration) * 100 : 0}%` }}
                />
                {/* Played Range */}
                <div
                  className="absolute left-0 top-0 bottom-0 bg-[#FFB224] rounded-full flex items-center justify-end"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-white shadow-lg scale-0 group-hover/seek:scale-100 transition-transform -mr-1.5" />
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
                {/* Left Controls: Play/Pause, Rewind, Forward, Time */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) videoRef.current.pause();
                        else videoRef.current.play();
                      }
                    }}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-lg"
                    title={isPlaying ? 'Jeda' : 'Putar'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
                  </button>

                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                      }
                    }}
                    className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
                    title="Mundur 10 detik"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 10);
                      }
                    }}
                    className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
                    title="Maju 10 detik"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  {/* Volume Control */}
                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="text-white/80 hover:text-white cursor-pointer"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        if (videoRef.current) {
                          videoRef.current.volume = val;
                          videoRef.current.muted = val === 0;
                          setIsMuted(val === 0);
                        }
                      }}
                      className="w-16 h-1 accent-[#FFB224] cursor-pointer"
                    />
                  </div>

                  {/* Time Display */}
                  <div className="text-[11px] sm:text-xs font-mono text-white/80 pl-1">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-white/40"> / </span>
                    <span className="text-white/60">{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Right Controls: Quality, Subtitles, Speed, Fullscreen */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Quality Indicator */}
                  {streamSources[activeSourceIndex]?.quality && (
                    <div className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white border border-white/15">
                      {streamSources[activeSourceIndex].quality}
                    </div>
                  )}

                  {/* Subtitles Button & Popover */}
                  {subtitles.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowSubMenu(!showSubMenu)}
                        className={`p-2 rounded-full liquid-glass cursor-pointer ${
                          activeSubtitleLang !== 'off' ? 'text-[#FFB224] border-[#FFB224]/50' : 'text-white/80'
                        }`}
                        title="Subtitle"
                      >
                        <Subtitles className="w-3.5 h-3.5" />
                      </button>

                      {showSubMenu && (
                        <div className="absolute bottom-11 right-0 rounded-2xl liquid-glass-dense p-2 min-w-36 space-y-1 shadow-2xl border border-white/20 text-xs z-50">
                          <button
                            onClick={() => {
                              setActiveSubtitleLang('off');
                              if (videoRef.current) {
                                for (let i = 0; i < videoRef.current.textTracks.length; i++) {
                                  videoRef.current.textTracks[i].mode = 'disabled';
                                }
                              }
                              setShowSubMenu(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg ${
                              activeSubtitleLang === 'off' ? 'bg-[#FFB224] text-black font-bold' : 'text-white hover:bg-white/10'
                            }`}
                          >
                            Nonaktif
                          </button>
                          {subtitles.map((sub, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setActiveSubtitleLang(sub.lang || String(idx));
                                if (videoRef.current) {
                                  for (let i = 0; i < videoRef.current.textTracks.length; i++) {
                                    videoRef.current.textTracks[i].mode = i === idx ? 'showing' : 'disabled';
                                  }
                                }
                                setShowSubMenu(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg truncate ${
                                activeSubtitleLang === (sub.lang || String(idx))
                                  ? 'bg-[#FFB224] text-black font-bold'
                                  : 'text-white hover:bg-white/10'
                              }`}
                            >
                              {sub.label || sub.lang || `Track ${idx + 1}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Playback Speed Button & Popover */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                      className="px-2 py-1 rounded-full liquid-glass text-[10px] sm:text-xs font-bold text-white/90 cursor-pointer"
                      title="Kecepatan Putar"
                    >
                      {activePlaybackSpeed}x
                    </button>

                    {showSpeedMenu && (
                      <div className="absolute bottom-11 right-0 rounded-2xl liquid-glass-dense p-1.5 min-w-24 space-y-0.5 shadow-2xl border border-white/20 text-xs z-50">
                        {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => {
                              setActivePlaybackSpeed(spd);
                              if (videoRef.current) videoRef.current.playbackRate = spd;
                              setShowSpeedMenu(false);
                            }}
                            className={`w-full text-center px-2 py-1 rounded-lg ${
                              activePlaybackSpeed === spd ? 'bg-[#FFB224] text-black font-bold' : 'text-white hover:bg-white/10'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    onClick={toggleFullscreen}
                    className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/90 hover:text-white cursor-pointer"
                    title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            MODE 2: SAFE SANDBOXED EMBED PLAYER (Zero Popups Policy)
            ======================================================== */}
        {isPlayable && effectiveMode === 'embed' && (
          <div className="relative w-full h-full">
            <iframe
              key={`embed-${id}-${mediaType}-${seasonNum}-${episodeNum}-${currentServerIndex}-${reloadKey}`}
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              referrerPolicy="origin"
              loading="eager"
              title={title?.title || 'Zhafx Stream Player'}
              onLoad={() => setIsLoading(false)}
              /*
               * CRITICAL ANTI-AD SANDBOX:
               * allow-scripts and allow-same-origin allow video to render.
               * STRICTLY OMIT allow-popups, allow-popups-to-escape-sandbox, and allow-top-navigation.
               * This guarantees rogue ad scripts cannot open new tabs or switch the browser tab on mobile/tablet!
               */
              sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
              className="w-full h-full border-0 absolute inset-0 z-10"
            />
          </div>
        )}
      </div>
    </div>
  );
};
