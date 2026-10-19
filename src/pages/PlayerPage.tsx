import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Hls from 'hls.js';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Server,
  RotateCw,
  Maximize,
  Minimize,
  ListOrdered,
  CheckCircle2,
  X,
  Tv,
  Film,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  Pause,
  AlertTriangle,
  ShieldCheck,
  Subtitles,
  ExternalLink,
  Wrench,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, MediaType, Episode, SubtitleTrack } from '../types';
import { storage } from '../lib/storage';

export interface ServerOption {
  id: string;
  name: string;
  tagline: string;
  type: 'movie_embed' | 'tv_embed' | 'anime_embed';
  provider: string;
  badge?: string;
  serverParam?: string;
}

// =========================================================================
// 1. DEDICATED SERVERS KHUSUS FILM (Movie) — FrameX API Engine
// =========================================================================
export const MOVIE_SERVERS: ServerOption[] = [
  {
    id: 'server-movie-1',
    name: 'Server Film 1 — Miner 4K',
    tagline: 'Movy Multi-City 4K Server • Ultra HD',
    type: 'movie_embed',
    provider: 'miner',
    badge: '4K ULTRA',
  },
  {
    id: 'server-movie-2',
    name: 'Server Film 2 — Headhunter HD',
    tagline: 'VidLink Server Multi-Sub Kualitas Tinggi',
    type: 'movie_embed',
    provider: 'headhunter',
    badge: 'HD MULTI-SUB',
  },
  {
    id: 'server-movie-3',
    name: 'Server Film 3 — Valkyrie 4K Ultra',
    tagline: '4K Ultra Multi-Server Stabil & Cepat',
    type: 'movie_embed',
    provider: 'valkyrie',
    badge: 'ULTRA STABIL',
  },
  {
    id: 'server-movie-4',
    name: 'Server Film 4 — Titan Direct',
    tagline: 'Films365 Direct MP4 1080p Server',
    type: 'movie_embed',
    provider: 'titan',
    badge: 'DIRECT 1080P',
  },
  {
    id: 'server-movie-5',
    name: 'Server Film 5 — Hog Rider 4K',
    tagline: '4K Pilled Server Cadangan Super Cepat',
    type: 'movie_embed',
    provider: 'hog_rider',
    badge: '4K FAST',
  },
  {
    id: 'server-movie-6',
    name: 'Server Film 6 — Lava Hound',
    tagline: '4K Fast Multi-Server Stream',
    type: 'movie_embed',
    provider: 'lavahound',
    badge: 'MULTI-CDN',
  },
  {
    id: 'server-movie-7',
    name: 'Server Film 7 — Super Barbarian',
    tagline: 'Direct Auto HLS Stream Cadangan',
    type: 'movie_embed',
    provider: 'super_barbarian',
    badge: 'AUTO HLS',
  },
  {
    id: 'server-movie-8',
    name: 'Server Film 8 — Bowler Multi-Lang',
    tagline: 'Multi-Language Audio & Subtitle',
    type: 'movie_embed',
    provider: 'bowler',
    badge: 'MULTI-LANG',
  },
  {
    id: 'server-movie-9',
    name: 'Server Film 9 — Giant Multi-Audio',
    tagline: 'Multi-Audio Direct Stream',
    type: 'movie_embed',
    provider: 'giant',
    badge: 'MULTI-AUDIO',
  },
];

// =========================================================================
// 2. DEDICATED SERVERS KHUSUS SERIAL TV — FrameX API Engine
// =========================================================================
export const TV_SERVERS: ServerOption[] = [
  {
    id: 'server-tv-1',
    name: 'Server TV 1 — Headhunter Series',
    tagline: 'VidLink TV Series Multi-Sub & Episode Lengkap',
    type: 'tv_embed',
    provider: 'headhunter',
    badge: 'SERIES UTAMA',
  },
  {
    id: 'server-tv-2',
    name: 'Server TV 2 — Valkyrie Series HD',
    tagline: '4K Ultra TV Multi-Server Stabil & Cepat',
    type: 'tv_embed',
    provider: 'valkyrie',
    badge: '4K ULTRA TV',
  },
  {
    id: 'server-tv-3',
    name: 'Server TV 3 — Miner Series 4K',
    tagline: 'Movy Multi-City TV Series 4K Server',
    type: 'tv_embed',
    provider: 'miner',
    badge: '4K SERIES',
  },
  {
    id: 'server-tv-4',
    name: 'Server TV 4 — Super Barbarian HLS',
    tagline: 'Direct Auto HLS TV Series Stream',
    type: 'tv_embed',
    provider: 'super_barbarian',
    badge: 'AUTO HLS TV',
  },
  {
    id: 'server-tv-5',
    name: 'Server TV 5 — Bowler Multi-Sub',
    tagline: 'Multi-Language TV Episodes & Softsub',
    type: 'tv_embed',
    provider: 'bowler',
    badge: 'MULTI-SUB',
  },
  {
    id: 'server-tv-6',
    name: 'Server TV 6 — Giant TV Stream',
    tagline: 'Multi-Audio TV Stream Cepat',
    type: 'tv_embed',
    provider: 'giant',
    badge: 'MULTI-AUDIO',
  },
  {
    id: 'server-tv-7',
    name: 'Server TV 7 — Lava Hound TV',
    tagline: '4K Fast TV Series Multi-Server',
    type: 'tv_embed',
    provider: 'lavahound',
    badge: 'FAST TV',
  },
  {
    id: 'server-tv-8',
    name: 'Server TV 8 — Hog Rider TV',
    tagline: '4K TV Server Dedicated',
    type: 'tv_embed',
    provider: 'hog_rider',
    badge: '4K BACKUP',
  },
];

// =========================================================================
// 3. DEDICATED SERVERS KHUSUS ANIME — FrameX API Engine
// =========================================================================
export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'server-anime-1',
    name: 'Server Anime 1 — Grand Warden Cloud',
    tagline: 'Multi-Source Cloud • 1080p Ultra Fast',
    type: 'anime_embed',
    provider: 'grand_warden',
    badge: 'CLOUD UTAMA',
  },
  {
    id: 'server-anime-2',
    name: 'Server Anime 2 — Wizard Dual Audio',
    tagline: 'Dual Audio & Softsub • Ultra Fast',
    type: 'anime_embed',
    provider: 'wizard',
    badge: 'DUAL AUDIO',
  },
  {
    id: 'server-anime-3',
    name: 'Server Anime 3 — Valkyrie FlixCloud',
    tagline: 'FlixCloud HD • Fast Stream',
    type: 'anime_embed',
    provider: 'valkyrie',
    badge: 'FLIXCLOUD',
  },
  {
    id: 'server-anime-4',
    name: 'Server Anime 4 — Super PEKKA Ultra',
    tagline: '1080p Ultra High Bitrate Multi-Source',
    type: 'anime_embed',
    provider: 'super_pekka',
    badge: 'HIGH BITRATE',
  },
  {
    id: 'server-anime-5',
    name: 'Server Anime 5 — Giant Cloud',
    tagline: 'Ultra High Speed Cloud Server',
    type: 'anime_embed',
    provider: 'giant',
    badge: 'HIGH SPEED',
  },
  {
    id: 'server-anime-6',
    name: 'Server Anime 6 — Archer Multi-Audio',
    tagline: 'Multi-Audio & Fast Stream',
    type: 'anime_embed',
    provider: 'archer',
    badge: 'MULTI-AUDIO',
  },
  {
    id: 'server-anime-7',
    name: 'Server Anime 7 — Goblin Direct',
    tagline: 'Direct Fast Auto Stream',
    type: 'anime_embed',
    provider: 'goblin',
    badge: 'DIRECT AUTO',
  },
  {
    id: 'server-anime-8',
    name: 'Server Anime 8 — Dragon VidNest',
    tagline: 'VidNest Multi-Source Server',
    type: 'anime_embed',
    provider: 'dragon',
    badge: 'VIDNEST',
  },
];

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

  // Validation: Check if ID and Episode are valid
  const isIdValid = Boolean(id && String(id).trim() !== '' && String(id) !== 'undefined' && String(id) !== 'null');
  const isEpisodeValid = !isNaN(episodeNum) && episodeNum >= 1;
  const isPlayable = isIdValid && isEpisodeValid;

  const [title, setTitle] = useState<Title | null>(null);
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [animeAudio, setAnimeAudio] = useState<'sub' | 'dub'>('sub');

  // Dynamic server lists per mediaType
  const [dynamicServers, setDynamicServers] = useState<ServerOption[]>(() => {
    if (mediaType === 'anime') return ANIME_SERVERS;
    if (mediaType === 'tv') return TV_SERVERS;
    return MOVIE_SERVERS;
  });

  // Anime Sandbox-Free Engine state: 'embed' (FrameX Embed 100% bebas sandbox) vs 'hls' (Native HLS Player)
  const [animePlayMode, setAnimePlayMode] = useState<'embed' | 'hls'>('embed');
  const [isSandboxDisabled] = useState<boolean>(true); // Sandbox is ALWAYS disabled for anime
  const [isAnimeErrorModalOpen, setIsAnimeErrorModalOpen] = useState(false);
  const [streamErrorDetected, setStreamErrorDetected] = useState(false);

  // Native HLS Player refs & state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsInstanceRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleTrack[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('off');
  const [isHlsError, setIsHlsError] = useState(false);
  const [hlsErrorMsg, setHlsErrorMsg] = useState<string | null>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Iframe loading and watchdog state
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [failoverNotice, setFailoverNotice] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);
  const watchdogRef = useRef<any>(null);

  // UI state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Episode Drawer
  const [drawerEpisodes, setDrawerEpisodes] = useState<Episode[]>([]);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'thumbnails' | 'grid'>('thumbnails');

  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // Comprehensive anti-ad and anti-popup protection
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (...args: any[]) {
      console.warn('[Zhafx Player] Blocked popup / new tab ad attempt:', args);
      return null;
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target?.closest?.('a');
      if (anchor) {
        const href = anchor.getAttribute('href') || '';
        const targetAttr = anchor.getAttribute('target');
        if (targetAttr === '_blank' || (href.startsWith('http') && !href.includes(window.location.hostname))) {
          e.preventDefault();
          e.stopPropagation();
          console.warn('[Zhafx Player] Blocked rogue ad anchor redirection:', href);
        }
      }
    };
    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('auxclick', handleGlobalClick, true);

    return () => {
      window.open = originalOpen;
      window.removeEventListener('click', handleGlobalClick, true);
      window.removeEventListener('auxclick', handleGlobalClick, true);
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

  // Load Title Metadata & Episode List
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

  // Synchronize server list from FrameX API (/api/providers?type=...)
  useEffect(() => {
    const controller = new AbortController();
    const loadProviders = async () => {
      try {
        const provs = await api.getProviders(controller.signal, mediaType);
        if (controller.signal.aborted || !provs || provs.length === 0) return;

        // Build server options specifically for this mediaType
        const filteredProvs = provs.filter((p) => p.id !== 'auto');
        if (filteredProvs.length > 0) {
          const formatted: ServerOption[] = filteredProvs.map((p, idx) => {
            const prefix =
              mediaType === 'anime'
                ? `Server Anime ${idx + 1}`
                : mediaType === 'tv'
                ? `Server TV ${idx + 1}`
                : `Server Film ${idx + 1}`;
            return {
              id: `server-${mediaType}-${p.id}`,
              name: `${prefix} — ${p.name.replace(/^ZHAFX\s+(TV\s+|FILM\s+|ENTITY\s+)?/i, '') || p.id}`,
              tagline: p.tagline || 'Server Streaming FrameX HD',
              type: mediaType === 'anime' ? 'anime_embed' : mediaType === 'tv' ? 'tv_embed' : 'movie_embed',
              provider: p.id,
              badge: mediaType === 'anime' ? 'ANIME 1080P' : mediaType === 'tv' ? 'TV SERIES' : '4K ULTRA',
            };
          });

          // Merge with predefined list to ensure zero missing items
          const defaultList =
            mediaType === 'anime' ? ANIME_SERVERS : mediaType === 'tv' ? TV_SERVERS : MOVIE_SERVERS;
          const merged = [...defaultList];
          for (const s of formatted) {
            if (!merged.some((m) => m.provider === s.provider)) {
              merged.push(s);
            }
          }
          setDynamicServers(merged);
        }
      } catch (err) {
        console.warn('[PlayerPage] Error fetching dynamic providers:', err);
      }
    };

    loadProviders();
    return () => controller.abort();
  }, [mediaType]);

  const safeServerIndex = currentServerIndex < dynamicServers.length ? currentServerIndex : 0;
  const activeServer = dynamicServers[safeServerIndex] || dynamicServers[0];

  // Reset server index if mediaType changes
  useEffect(() => {
    setCurrentServerIndex(0);
    setStreamErrorDetected(false);
    setIsAnimeErrorModalOpen(false);
  }, [mediaType]);

  // Iframe Watchdog: Detect slow loading / stalled stream on Anime
  useEffect(() => {
    if (!isPlayable) {
      setIsIframeLoading(false);
      return;
    }

    setIsIframeLoading(true);
    setStreamErrorDetected(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (watchdogRef.current) clearTimeout(watchdogRef.current);

    // Watchdog: If anime stream takes > 9s, alert user with sandbox-free recovery actions
    if (mediaType === 'anime') {
      watchdogRef.current = setTimeout(() => {
        if (isIframeLoading) {
          setStreamErrorDetected(true);
        }
      }, 9000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, [id, episodeNum, seasonNum, safeServerIndex, iframeKey, isPlayable, animeAudio, mediaType]);

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
    setStreamErrorDetected(false);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
  };

  // Switch to next dedicated server for this media type
  const handleNextServer = () => {
    const nextIdx = (safeServerIndex + 1) % dynamicServers.length;
    setCurrentServerIndex(nextIdx);
    setFailoverNotice(`Beralih ke ${dynamicServers[nextIdx].name}...`);
    setTimeout(() => setFailoverNotice(null), 3500);
    setIsIframeLoading(true);
    setStreamErrorDetected(false);
    setIsAnimeErrorModalOpen(false);
    setIframeKey((k) => k + 1);
  };

  // Retry loading current server (Forces clean cache-busting reload)
  const handleRetry = () => {
    setIsIframeLoading(true);
    setStreamErrorDetected(false);
    setIsAnimeErrorModalOpen(false);
    setIframeKey((k) => k + 1);
  };

  // Force disable sandbox & reload (Specifically for anime player error recovery)
  const handleForceUnsandboxedReload = () => {
    setFailoverNotice('🛡️ Memuat ulang anime dalam mode 100% Bebas Sandbox...');
    setTimeout(() => setFailoverNotice(null), 3500);
    setIsIframeLoading(true);
    setStreamErrorDetected(false);
    setIsAnimeErrorModalOpen(false);
    setIframeKey((k) => k + 1);
  };

  // Load HLS Stream for Anime in Native mode (100% Sandbox Free via <video> + hls.js)
  useEffect(() => {
    if (mediaType !== 'anime' || animePlayMode !== 'hls' || !isPlayable) {
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    setIsIframeLoading(true);
    setIsHlsError(false);
    setHlsErrorMsg(null);

    const loadHls = async () => {
      try {
        const streamData = await api.getAnimeStream({
          id: id!,
          episode: episodeNum,
          provider: activeServer.provider,
          audio: animeAudio,
          title: title?.title,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!streamData || !streamData.sources || streamData.sources.length === 0) {
          throw new Error(`Stream anime tidak ditemukan pada ${activeServer.name}.`);
        }

        const source = streamData.sources[0];
        const streamUrl = source.url || source.directUrl || '';
        if (!streamUrl) throw new Error('URL stream video kosong.');

        if (Array.isArray(streamData.subtitles)) {
          setAvailableSubtitles(streamData.subtitles);
        }

        const video = videoRef.current;
        if (!video) return;

        if (Hls.isSupported()) {
          if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
          }

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsIframeLoading(false);
            video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          });

          hls.on(Hls.Events.ERROR, (_evt, data) => {
            if (data.fatal) {
              console.warn('[HLS Fatal Error]:', data.type, data.details);
              setIsHlsError(true);
              setHlsErrorMsg(`Server ${activeServer.name} gagal memuat stream.`);
              setStreamErrorDetected(true);
            }
          });

          hlsInstanceRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = streamUrl;
          video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
          setIsIframeLoading(false);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.warn('[HLS Init Error]:', err?.message);
          setIsHlsError(true);
          setHlsErrorMsg(err?.message || 'Gagal memuat stream');
          setIsIframeLoading(false);
          setStreamErrorDetected(true);
        }
      }
    };

    loadHls();

    return () => {
      controller.abort();
      if (hlsInstanceRef.current) {
        hlsInstanceRef.current.destroy();
        hlsInstanceRef.current = null;
      }
    };
  }, [id, mediaType, episodeNum, safeServerIndex, animeAudio, animePlayMode, isPlayable, title, activeServer.name, activeServer.provider]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      videoRef.current.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  // Build clean FrameX Embed URL (HTTPS only, URL and URLSearchParams, no_ads=1)
  const buildEmbedUrl = (): string => {
    if (!isPlayable) return '';

    const cleanId = String(id).trim();
    const validEp = Math.max(1, episodeNum);
    const validSeason = Math.max(1, seasonNum);
    let targetProvider = activeServer.provider || 'miner';

    if (mediaType === 'anime') {
      // Determine sub/dub provider variant
      if (animeAudio === 'dub') {
        if (targetProvider === 'grand_warden') targetProvider = 'grand_warden_dub';
        else if (targetProvider === 'wizard') targetProvider = 'wizard_dub';
        else if (targetProvider === 'valkyrie') targetProvider = 'valkyrie_dub';
        else if (targetProvider === 'archer') targetProvider = 'archer_dub';
        else if (targetProvider === 'goblin') targetProvider = 'goblin_dub';
        else if (targetProvider === 'dragon') targetProvider = 'dragon_dub';
      }

      // Official FrameX Anime Embed
      const baseUrl = `https://framextv.xyz/embed/anime/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validEp))}`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('season', String(validSeason));
      url.searchParams.set('type', 'anime');
      url.searchParams.set('sub_type', animeAudio);
      url.searchParams.set('provider', targetProvider);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1');
      url.searchParams.set('sandbox', '0'); // Explicit signal to upstream player to avoid sandbox constraints
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    if (mediaType === 'tv') {
      // Official FrameX TV Series Embed
      const baseUrl = `https://framextv.xyz/embed/tv/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validSeason))}/${encodeURIComponent(String(validEp))}`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('season', String(validSeason));
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('type', 'tv');
      url.searchParams.set('provider', targetProvider);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1');
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    // Official FrameX Movie Embed
    const baseUrl = `https://framextv.xyz/embed/movie/${encodeURIComponent(cleanId)}`;
    const url = new URL(baseUrl);
    url.searchParams.set('id', cleanId);
    url.searchParams.set('type', 'movie');
    url.searchParams.set('provider', targetProvider);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
    url.searchParams.set('no_ads', '1');
    if (title?.title) {
      url.searchParams.set('title', title.title.trim());
    }
    return url.toString();
  };

  const embedUrl = buildEmbedUrl();

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
      setShowControls(false);
    }, 4500);
  }, []);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const toggleFullscreen = () => {
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
      } catch {
        // ignore
      }
    } else {
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
              .then(() => setIsFullscreen(true))
              .catch(() => {
                setIsCssFullscreen(true);
                setIsFullscreen(true);
              });
          } else {
            setIsFullscreen(true);
          }
        } catch {
          setIsCssFullscreen(true);
          setIsFullscreen(true);
        }
      } else {
        setIsCssFullscreen(true);
        setIsFullscreen(true);
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
    setStreamErrorDetected(false);
    if (mediaType === 'tv') {
      navigate(`/watch/tv/${id}/${seasonNum}/${targetEp}`);
    } else if (mediaType === 'anime') {
      navigate(`/watch/anime/${id}/1/${targetEp}`);
    }
  };

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className={`min-h-screen w-full bg-[#06070B] flex flex-col relative select-none overflow-hidden ${
        isCssFullscreen ? 'fixed inset-0 z-[99999] w-screen h-screen !m-0 !p-0' : ''
      }`}
    >
      {/* =========================================================================
          SLEEK TOP NAVIGATION BAR (STREAMLINED & RESPONSIVE, ZERO WRAPPING CLUTTER)
          ========================================================================= */}
      <header
        className={`fixed top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 max-w-7xl mx-auto z-40 transition-all duration-300 pointer-events-none ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <div className="min-h-12 sm:min-h-14 px-3 sm:px-4 py-1.5 rounded-2xl sm:rounded-full liquid-glass-dense liquid-specular flex items-center justify-between gap-2 shadow-2xl pointer-events-auto border border-white/20">
          {/* Left: Back Button & Title Info */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
              <div className="flex items-center gap-1.5 flex-nowrap">
                <h1 className="text-xs sm:text-sm font-bold text-white truncate leading-tight max-w-[120px] sm:max-w-[200px] md:max-w-xs">
                  {title?.title || 'Memuat Pemutar...'}
                </h1>

                {/* Media Type Badges */}
                {mediaType === 'movie' && (
                  <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[#FFB224] text-[9px] sm:text-[10px] font-bold tracking-wide shrink-0">
                    <Film className="w-2.5 h-2.5" />
                    FILM
                  </span>
                )}
                {mediaType === 'tv' && (
                  <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[9px] sm:text-[10px] font-bold tracking-wide shrink-0">
                    <Tv className="w-2.5 h-2.5" />
                    TV S{seasonNum}E{episodeNum}
                  </span>
                )}
                {mediaType === 'anime' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/25 border border-violet-500/40 text-violet-300 text-[9px] sm:text-[10px] font-bold tracking-wide shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                    <Sparkles className="w-2.5 h-2.5 text-violet-300 animate-pulse" />
                    ANIME EP {episodeNum}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Controls, Server Dropdown & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Anime Audio Sub / Dub Selector */}
            {mediaType === 'anime' && (
              <button
                onClick={() => {
                  const nextAudio = animeAudio === 'sub' ? 'dub' : 'sub';
                  setAnimeAudio(nextAudio);
                }}
                className={`px-2 sm:px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1 ${
                  animeAudio === 'sub'
                    ? 'bg-violet-600/30 border-violet-400 text-violet-200 shadow-sm'
                    : 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm'
                }`}
                title="Pilih Audio: Sub (Jepang) atau Dub (Inggris)"
              >
                <Volume2 className="w-3 h-3" />
                <span>{animeAudio === 'sub' ? 'JP SUB' : 'EN DUB'}</span>
              </button>
            )}

            {/* Dedicated Server Dropdown (Filtered only for this media type) */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full liquid-glass text-xs text-white border border-white/10 max-w-[130px] sm:max-w-[210px]">
              <Server className="w-3 h-3 text-white/70 shrink-0" />
              <select
                value={safeServerIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  setCurrentServerIndex(idx);
                  setIsIframeLoading(true);
                  setStreamErrorDetected(false);
                  setIframeKey((k) => k + 1);
                }}
                aria-label={`Pilih server khusus ${mediaType}`}
                className="bg-transparent text-[10px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer w-full truncate"
              >
                {dynamicServers.map((s, idx) => (
                  <option key={s.id} value={idx} className="bg-[#12141F] text-white">
                    {s.name} {s.badge ? `• ${s.badge}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Episode Drawer Trigger for TV / Anime */}
            {(mediaType === 'tv' || mediaType === 'anime') && (
              <button
                onClick={() => setIsEpisodeDrawerOpen(!isEpisodeDrawerOpen)}
                className="px-2 sm:px-2.5 py-1 rounded-full bg-white/[0.1] hover:bg-white/[0.2] text-[10px] sm:text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer ios-spring border border-white/10"
                title="Buka daftar episode"
              >
                <ListOrdered className="w-3 h-3 text-white/80" />
                <span className="hidden sm:inline">Episode</span>
              </button>
            )}

            {/* Reload Stream Button */}
            <button
              onClick={handleRetry}
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

      {/* =========================================================================
          EPISODE SELECTION DRAWER (VISUAL THUMBNAILS & NUMBER GRID)
          ========================================================================= */}
      {isEpisodeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-xl transition-opacity"
            onClick={() => setIsEpisodeDrawerOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-[32px] liquid-glass-dense liquid-specular p-5 sm:p-6 space-y-4 z-10 border border-white/20 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                {mediaType === 'anime' ? (
                  <Sparkles className="w-4 h-4 text-violet-400" />
                ) : (
                  <Tv className="w-4 h-4 text-[#FFB224]" />
                )}
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Pilih Episode ({mediaType === 'anime' ? 'Anime 1080p' : `Musim ${seasonNum}`})
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Total {totalEpisodes} Episode tersedia
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex p-0.5 rounded-full bg-white/10 border border-white/10 text-xs">
                  <button
                    onClick={() => setDrawerTab('thumbnails')}
                    className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      drawerTab === 'thumbnails' ? 'bg-violet-600 sm:bg-[#FFB224] text-white sm:text-black font-bold' : 'text-white/70'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => setDrawerTab('grid')}
                    className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                      drawerTab === 'grid' ? 'bg-violet-600 sm:bg-[#FFB224] text-white sm:text-black font-bold' : 'text-white/70'
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
                          ? 'bg-violet-500/20 border-violet-400 shadow-lg'
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
                          <div className="absolute inset-0 bg-violet-600/40 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-white group-hover:text-violet-300 line-clamp-1">
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
                          ? 'bg-violet-600 text-white font-bold shadow-lg scale-105'
                          : 'bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 text-white'
                      }`}
                    >
                      <span>Ep {ep}</span>
                      {isCurrent && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ANIME ERROR RECOVERY MODAL (KHUSUS PLAYER ANIME YG EROR - BEBAS SANDBOX)
          ========================================================================= */}
      {isAnimeErrorModalOpen && mediaType === 'anime' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
            onClick={() => setIsAnimeErrorModalOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-[28px] liquid-glass-dense liquid-specular p-6 space-y-4 z-10 border border-violet-500/40 shadow-2xl text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Pemulihan Stream Anime
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                      Bebas Sandbox
                    </span>
                  </h3>
                  <p className="text-xs text-white/60">
                    Server {activeServer.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAnimeErrorModalOpen(false)}
                className="w-7 h-7 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/80 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/10">
              Semua pembatasan sandbox telah dinonaktifkan secara penuh pada player ini. Jika video masih buffering atau menampilkan layar hitam, gunakan opsi pemulihan otomatis di bawah:
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleNextServer}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-between cursor-pointer shadow-lg ios-spring"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Ganti ke Server Anime Cadangan Berikutnya
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleForceUnsandboxedReload}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 font-semibold text-xs flex items-center justify-between cursor-pointer ios-spring"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Paksa Muat Ulang 100% Bebas Sandbox
                </span>
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setAnimePlayMode(animePlayMode === 'hls' ? 'embed' : 'hls');
                  setIsAnimeErrorModalOpen(false);
                  setIsIframeLoading(true);
                  setIframeKey((k) => k + 1);
                }}
                className="w-full py-2.5 px-4 rounded-xl liquid-glass hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-between cursor-pointer ios-spring border border-white/10"
              >
                <span className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  Beralih ke Mode {animePlayMode === 'hls' ? 'Embed Resmi FrameX' : 'HLS Direct Native Player'}
                </span>
                <span className="text-[10px] text-white/50">Ganti Mode</span>
              </button>

              <a
                href={embedUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 font-medium text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                Buka Stream di Jendela Langsung (Bypass Semua Hambatan)
              </a>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN VIEWPORT CONTAINER
          ========================================================================= */}
      <div className="relative flex-1 w-full h-screen bg-black flex items-center justify-center overflow-hidden">
        {/* Failover Toast Notice */}
        {failoverNotice && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full liquid-glass border border-violet-500/40 text-violet-200 text-[11px] sm:text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
            <span>{failoverNotice}</span>
          </div>
        )}

        {/* Loading Spinner Overlay */}
        {isIframeLoading && isPlayable && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070B]/80 backdrop-blur-sm space-y-3 pointer-events-none px-4 text-center">
            <div className={`w-11 h-11 border-3 border-white/20 rounded-full animate-spin ${
              mediaType === 'anime' ? 'border-t-violet-400' : 'border-t-[#FFB224]'
            }`} />
            <span className="text-xs font-mono text-white/80 tracking-wider uppercase">
              Menghubungkan ke {activeServer.name}...
            </span>
            {mediaType === 'anime' && (
              <span className="text-[10px] text-emerald-400/90 font-medium">
                🛡️ Mode Bebas Sandbox Aktif (Tanpa Pembatasan Iframe)
              </span>
            )}
          </div>
        )}

        {/* Streaming Error Helper Card (Khusus Player Anime yg Eror) */}
        {streamErrorDetected && mediaType === 'anime' && (
          <div className="absolute bottom-20 sm:bottom-24 z-40 max-w-md mx-4 p-3.5 rounded-2xl liquid-glass-dense border border-violet-500/50 shadow-2xl flex items-center justify-between gap-3 text-white backdrop-blur-xl animate-fade-in">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Stream lambat atau terhenti di {activeServer.name}?
                </p>
                <p className="text-[10px] text-emerald-400">
                  Sandbox telah dinonaktifkan. Anda dapat beralih server sekarang.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleNextServer}
                className="px-2.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[10px] cursor-pointer ios-spring"
              >
                Ganti Server
              </button>
              <button
                onClick={() => setIsAnimeErrorModalOpen(true)}
                className="p-1.5 rounded-xl liquid-glass text-white/80 hover:text-white cursor-pointer"
                title="Buka menu perbaikan"
              >
                <Wrench className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Validation Error: Episode Not Available */}
        {!isPlayable && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06070B] p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80">
              <AlertTriangle className="w-7 h-7 text-[#FFB224]" />
            </div>
            <h3 className="text-lg font-bold text-white">Episode belum tersedia</h3>
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
                className="px-5 py-2.5 rounded-full bg-violet-600 sm:bg-[#FFB224] text-white sm:text-black text-xs font-bold hover:opacity-90 cursor-pointer shadow-lg ios-spring"
              >
                Kembali
              </button>
              {drawerEpisodes.length > 0 && (
                <button
                  onClick={() => setIsEpisodeDrawerOpen(true)}
                  className="px-4 py-2.5 rounded-full liquid-glass text-white text-xs font-semibold hover:bg-white/10 cursor-pointer ios-spring"
                >
                  Pilih Episode Lain
                </button>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            1. NATIVE HLS PLAYER (Khusus Anime Mode HLS — 100% Bebas Sandbox via <video>)
            ========================================================================= */}
        {isPlayable && mediaType === 'anime' && animePlayMode === 'hls' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black group select-none">
            <video
              ref={videoRef}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              playsInline
            >
              {availableSubtitles.map((sub, idx) => (
                <track
                  key={idx}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang || 'id'}
                  label={sub.label || sub.language || `Sub ${idx + 1}`}
                  default={idx === 0 || sub.lang === 'id' || sub.label?.toLowerCase().includes('indo')}
                />
              ))}
            </video>

            {/* Error fallback overlay if HLS fails on current server */}
            {isHlsError && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#06070B]/90 p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Gangguan Stream di {activeServer.name}</h3>
                <p className="text-xs text-white/60 max-w-sm">
                  {hlsErrorMsg || 'Stream HLS tidak dapat dimuat. Sedang mencoba server cadangan...'}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleNextServer}
                    className="px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg cursor-pointer ios-spring"
                  >
                    Coba Server Anime Berikutnya
                  </button>
                  <button
                    onClick={() => setAnimePlayMode('embed')}
                    className="px-4 py-2 rounded-full liquid-glass text-white text-xs font-semibold hover:bg-white/10 cursor-pointer ios-spring"
                  >
                    Beralih ke Mode Embed
                  </button>
                </div>
              </div>
            )}

            {/* Center Play/Pause Floating Action Button */}
            {!isPlaying && !isIframeLoading && !isHlsError && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full liquid-glass-dense flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer shadow-2xl z-20"
                title="Putar Video Anime"
              >
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white translate-x-0.5" />
              </button>
            )}

            {/* Custom Playback Scrubber Bar (HLS Mode) */}
            <div
              className={`absolute bottom-16 sm:bottom-20 left-3 right-3 sm:left-6 sm:right-6 max-w-4xl mx-auto rounded-2xl liquid-glass-dense liquid-specular p-2.5 sm:p-3 z-30 transition-all duration-300 ${
                showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}
            >
              <div className="w-full mb-2">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-violet-400"
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-white">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={togglePlay}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass flex items-center justify-center text-white hover:bg-white/20 cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-14 sm:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hidden sm:block"
                  />

                  <div className="font-mono text-[10px] sm:text-[11px] text-white/80">
                    <span>{formatTime(currentTime)}</span>
                    <span className="text-white/40 mx-1">/</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {availableSubtitles.length > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full liquid-glass text-xs">
                      <Subtitles className="w-3.5 h-3.5 text-white/80" />
                      <select
                        value={selectedSubtitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedSubtitle(val);
                          if (videoRef.current) {
                            const tracks = videoRef.current.textTracks;
                            for (let i = 0; i < tracks.length; i++) {
                              tracks[i].mode = val === 'off' ? 'disabled' : (String(i) === val ? 'showing' : 'disabled');
                            }
                          }
                        }}
                        className="bg-transparent text-[10px] text-white focus:outline-none cursor-pointer"
                      >
                        <option value="off" className="bg-[#12141F] text-white">Sub: Nonaktif</option>
                        {availableSubtitles.map((sub, idx) => (
                          <option key={idx} value={String(idx)} className="bg-[#12141F] text-white">
                            {sub.label || sub.language || `Sub ${idx + 1}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            2. OFFICIAL FRAMEX EMBED (KHUSUS BEBAS SANDBOX)
            - Sandbox attribute completely REMOVED/OMITTED to disable sandbox restrictions
            - Full permissions for unhindered video playback & decoders
            ========================================================================= */}
        {isPlayable && (mediaType !== 'anime' || animePlayMode === 'embed') && (
          <div className="relative w-full h-full">
            <iframe
              key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${safeServerIndex}-${iframeKey}-${animeAudio}`}
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; clipboard-write; display-capture; web-share"
              referrerPolicy="no-referrer-when-downgrade"
              loading="eager"
              title={title?.title || 'Zhafx Stream Player'}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 absolute inset-0 z-10"
              // Sandbox attribute is omitted to ensure zero sandbox restrictions
            />
          </div>
        )}

        {/* =========================================================================
            3. DEDICATED ANIME BOTTOM DOCK (PERFECTLY POSITIONED UI/UX)
            ========================================================================= */}
        {mediaType === 'anime' && (
          <div
            className={`fixed bottom-3 sm:bottom-5 left-2 right-2 max-w-2xl mx-auto z-40 transition-all duration-300 pointer-events-none ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <div className="px-3 py-1.5 rounded-full liquid-glass-dense liquid-specular flex items-center justify-between gap-1 sm:gap-2 shadow-2xl pointer-events-auto border border-violet-500/30 text-white backdrop-blur-xl">
              {/* Prev Episode */}
              <button
                onClick={() => navigateEpisode(episodeNum - 1)}
                disabled={!hasPrevEpisode}
                className="px-2.5 py-1 rounded-full liquid-glass hover:bg-white/20 text-[10px] sm:text-xs font-semibold flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer ios-spring"
                title="Episode Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>

              {/* Current Episode Indicator / Quick Drawer Trigger */}
              <button
                onClick={() => setIsEpisodeDrawerOpen(true)}
                className="px-2.5 py-1 rounded-full bg-violet-600/30 border border-violet-500/50 hover:bg-violet-600/50 text-[10px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer ios-spring text-violet-200"
                title="Klik untuk membuka daftar semua episode"
              >
                <ListOrdered className="w-3.5 h-3.5 text-violet-300" />
                <span>Ep {episodeNum} / {totalEpisodes}</span>
              </button>

              {/* Next Episode */}
              <button
                onClick={() => navigateEpisode(episodeNum + 1)}
                disabled={!hasNextEpisode}
                className="px-2.5 py-1 rounded-full liquid-glass hover:bg-white/20 text-[10px] sm:text-xs font-semibold flex items-center gap-1 disabled:opacity-30 disabled:pointer-events-none cursor-pointer ios-spring"
                title="Episode Selanjutnya"
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-[1px] bg-white/20 mx-0.5 sm:mx-1" />

              {/* Quick Ganti Server Anime */}
              <button
                onClick={handleNextServer}
                className="px-2.5 py-1 rounded-full bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer ios-spring"
                title="Beralih langsung ke server anime cadangan berikutnya"
              >
                <Server className="w-3 h-3" />
                <span className="hidden sm:inline">Ganti Server</span>
                <span className="sm:hidden">Server</span>
              </button>

              {/* Status: Sandbox Bebas Aktif (Click to force refresh / fix error) */}
              <button
                onClick={() => setIsAnimeErrorModalOpen(true)}
                className="px-2.5 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer ios-spring"
                title="Sandbox dinonaktifkan. Klik untuk bantuan pemulihan jika video eror"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Bebas Sandbox: Aktif</span>
                <span className="sm:hidden">Bebas Sandbox</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
