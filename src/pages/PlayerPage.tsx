import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  IoArrowBackOutline as ArrowLeft,
  IoChevronBackOutline as ChevronLeft,
  IoChevronForwardOutline as ChevronRight,
  IoServerOutline as Server,
  IoSyncOutline as RotateCw,
  IoExpandOutline as Maximize,
  IoContractOutline as Minimize,
  IoStar as Star,
  IoBookmarkOutline as Bookmark,
  IoBookmark as BookmarkCheck,
  IoShareSocialOutline as Share2,
  IoSparkles as Sparkles,
  IoFilmOutline as Film,
  IoTvOutline as Tv,
  IoPlay as Play,
  IoInformationCircleOutline as Info,
  IoWarningOutline as AlertTriangle,
  IoChevronDownOutline as ChevronDown,
  IoChevronUpOutline as ChevronUp,
  IoTimeOutline as Clock,
  IoLayersOutline as Layers,
  IoListOutline as ListOrdered,
  IoCloseOutline as X,
  IoChatbubbleEllipsesOutline as Subtitles,
  IoFlashOutline as Zap,
} from 'react-icons/io5';
import { api } from '../services/api';
import { Title, MediaType, Episode } from '../types';
import { storage } from '../lib/storage';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { MediaRow } from '../components/MediaRow';
import { SEOHead } from '../components/SEOHead';

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
// 1. Dedicated Servers Khusus FILM (Movie) — FrameX API Engine
// =========================================================================
// 1. Dedicated Servers Khusus FILM (Movie) — FrameX API Engine
// =========================================================================
export const MOVIE_SERVERS: ServerOption[] = [
  {
    id: 'server-movie-1',
    name: 'Server 1',
    tagline: 'Server Utama • Pemutaran Cepat & Stabil',
    type: 'movie_embed',
    provider: 'miner',
    badge: 'Utama',
  },
  {
    id: 'server-movie-2',
    name: 'Server 2',
    tagline: 'Server Cadangan • Multi-Subtitle',
    type: 'movie_embed',
    provider: 'headhunter',
  },
  {
    id: 'server-movie-3',
    name: 'Server 3',
    tagline: 'Server Cadangan • Multi-Server',
    type: 'movie_embed',
    provider: 'valkyrie',
  },
  {
    id: 'server-movie-4',
    name: 'Server 4',
    tagline: 'Server Cadangan • Direct Stream',
    type: 'movie_embed',
    provider: 'titan',
  },
  {
    id: 'server-movie-5',
    name: 'Server 5',
    tagline: 'Server Cadangan • Jalur Cepat',
    type: 'movie_embed',
    provider: 'hog_rider',
  },
  {
    id: 'server-movie-6',
    name: 'Server 6',
    tagline: 'Server Cadangan • Multi-CDN',
    type: 'movie_embed',
    provider: 'lavahound',
  },
  {
    id: 'server-movie-7',
    name: 'Server 7',
    tagline: 'Server Cadangan • Auto Stream',
    type: 'movie_embed',
    provider: 'super_barbarian',
  },
  {
    id: 'server-movie-8',
    name: 'Server 8',
    tagline: 'Server Cadangan • Multi-Bahasa',
    type: 'movie_embed',
    provider: 'bowler',
  },
  {
    id: 'server-movie-9',
    name: 'Server 9',
    tagline: 'Server Cadangan • Multi-Audio',
    type: 'movie_embed',
    provider: 'giant',
  },
];

// =========================================================================
// 2. Dedicated Servers Khusus SERIAL TV — FrameX API Engine
// =========================================================================
export const TV_SERVERS: ServerOption[] = [
  {
    id: 'server-tv-1',
    name: 'Server 1',
    tagline: 'Server Utama • Serial TV Lengkap',
    type: 'tv_embed',
    provider: 'miner',
    badge: 'Utama',
  },
  {
    id: 'server-tv-2',
    name: 'Server 2',
    tagline: 'Server Cadangan • Multi-Subtitle & Episode Lengkap',
    type: 'tv_embed',
    provider: 'headhunter',
  },
  {
    id: 'server-tv-3',
    name: 'Server 3',
    tagline: 'Server Cadangan • Multi-Server Stabil',
    type: 'tv_embed',
    provider: 'valkyrie',
  },
  {
    id: 'server-tv-4',
    name: 'Server 4',
    tagline: 'Server Cadangan • Direct Stream',
    type: 'tv_embed',
    provider: 'titan',
  },
  {
    id: 'server-tv-5',
    name: 'Server 5',
    tagline: 'Server Cadangan • Dedicated',
    type: 'tv_embed',
    provider: 'hog_rider',
  },
  {
    id: 'server-tv-6',
    name: 'Server 6',
    tagline: 'Server Cadangan • Multi-CDN',
    type: 'tv_embed',
    provider: 'lavahound',
  },
  {
    id: 'server-tv-7',
    name: 'Server 7',
    tagline: 'Server Cadangan • Auto Stream',
    type: 'tv_embed',
    provider: 'super_barbarian',
  },
  {
    id: 'server-tv-8',
    name: 'Server 8',
    tagline: 'Server Cadangan • Multi-Bahasa',
    type: 'tv_embed',
    provider: 'bowler',
  },
  {
    id: 'server-tv-9',
    name: 'Server 9',
    tagline: 'Server Cadangan • Multi-Audio',
    type: 'tv_embed',
    provider: 'giant',
  },
];

// =========================================================================
// 3. Dedicated Servers Khusus ANIME — FrameX TV Engine (Grand Warden, Wizard, dll.)
// =========================================================================
export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'server-anime-1',
    name: 'Server 1 (Grand Warden)',
    tagline: 'Server Utama • Multi-Source Cloud 1080p',
    type: 'anime_embed',
    provider: 'grand_warden',
    badge: 'Utama',
  },
  {
    id: 'server-anime-2',
    name: 'Server 2 (Wizard)',
    tagline: 'Server Cadangan • Dual Audio & Softsub Cepat',
    type: 'anime_embed',
    provider: 'wizard',
  },
  {
    id: 'server-anime-3',
    name: 'Server 3 (Valkyrie)',
    tagline: 'Server Cadangan • FlixCloud HD',
    type: 'anime_embed',
    provider: 'valkyrie',
  },
  {
    id: 'server-anime-4',
    name: 'Server 4 (Super PEKKA)',
    tagline: 'Server Cadangan • Direct Fast CDN 1080p',
    type: 'anime_embed',
    provider: 'super_pekka',
  },
  {
    id: 'server-anime-5',
    name: 'Server 5 (Goblin)',
    tagline: 'Server Cadangan • Direct Fast Auto Stream',
    type: 'anime_embed',
    provider: 'goblin',
  },
  {
    id: 'server-anime-6',
    name: 'Server 6 (Giant)',
    tagline: 'Server Cadangan • Ultra High Speed Server',
    type: 'anime_embed',
    provider: 'giant',
  },
];

function formatTime(sec: number): string {
  if (isNaN(sec) || sec < 0) return '00:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const h = Math.floor(m / 60);
  if (h > 0) {
    const remM = m % 60;
    return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
}

interface PlayerPageProps {
  onOpenAIWithContext?: (title: Title) => void;
}

export const PlayerPage: React.FC<PlayerPageProps> = ({ onOpenAIWithContext }) => {
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

  let seasonNum = 1;
  let episodeNum = 1;

  if (rawEpisode !== undefined) {
    seasonNum = parseInt(rawSeason || '1', 10);
    episodeNum = parseInt(rawEpisode || '1', 10);
  } else if (rawSeason !== undefined) {
    if (mediaType === 'anime') {
      seasonNum = 1;
      episodeNum = parseInt(rawSeason, 10);
    } else {
      seasonNum = parseInt(rawSeason, 10);
      episodeNum = 1;
    }
  }

  if (isNaN(seasonNum) || seasonNum < 1) seasonNum = 1;
  if (isNaN(episodeNum) || episodeNum < 1) episodeNum = 1;

  // Validation: Check if ID and Episode are valid
  const isIdValid = Boolean(id && String(id).trim() !== '' && String(id) !== 'undefined' && String(id) !== 'null');
  const isEpisodeValid = !isNaN(episodeNum) && episodeNum >= 1;
  const isPlayable = isIdValid && isEpisodeValid;

  const [title, setTitle] = useState<Title | null>(null);
  const [currentServerIndex, setCurrentServerIndex] = useState(0);
  const [animeAudio, setAnimeAudio] = useState<'sub' | 'dub'>('sub');

  // Iframe loading and watchdog state
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [failoverNotice, setFailoverNotice] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

  // Continue Watching & Resume Playback timestamp state
  const [resumePrompt, setResumePrompt] = useState<{
    time: number;
    formatted: string;
    show: boolean;
  } | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const currentPlaybackTimeRef = useRef<number>(0);
  const playbackDurationRef = useRef<number>(0);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [episodeViewMode, setEpisodeViewMode] = useState<'visual' | 'grid'>('visual');
  const [selectedSeason, setSelectedSeason] = useState<number>(seasonNum);
  const [episodesList, setEpisodesList] = useState<Episode[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isTipDismissed, setIsTipDismissed] = useState(false);

  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const isNativeFsActive = useRef<boolean>(false);

  // Anti-ad & popup-blocking engine (No Sandbox: prevents popup tabs, redirects, and clickjacking without breaking iOS/Windows media MSE)
  useEffect(() => {
    const originalOpen = window.open;
    let popupTimer: any = null;

    window.open = function (url?: string | URL, target?: string, features?: string) {
      const targetUrl = typeof url === 'string' ? url : url?.toString() || '';
      if (
        targetUrl.includes('saweria.co') ||
        targetUrl.includes('accounts.google.com') ||
        targetUrl.includes('twitter.com') ||
        targetUrl.includes('whatsapp.com') ||
        targetUrl.includes('t.me')
      ) {
        return originalOpen.call(window, url, target, features);
      }
      console.warn('[Zhafx Anti-Ad] Blocked player ad popup attempt:', targetUrl);
      document.body.classList.add('has-popup');
      clearTimeout(popupTimer);
      popupTimer = setTimeout(() => {
        document.body.classList.remove('has-popup');
      }, 1500);
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
          console.warn('[Zhafx Anti-Ad] Blocked rogue ad anchor redirection:', href);
          document.body.classList.add('has-popup');
          setTimeout(() => document.body.classList.remove('has-popup'), 1500);
        }
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    window.addEventListener('auxclick', handleGlobalClick, true);

    return () => {
      window.open = originalOpen;
      clearTimeout(popupTimer);
      document.body.classList.remove('has-popup');
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
        if (finalTitle.backdrop || finalTitle.poster) {
          setActiveMedia(finalTitle.backdrop || finalTitle.poster, finalTitle.title);
        }

        if (mediaType === 'tv') {
          api.getSeasonEpisodes(id, selectedSeason, controller.signal)
            .then((eps) => setEpisodesList(eps))
            .catch(() => {});
        } else if (mediaType === 'anime') {
          api.getAnimeEpisodes(id, controller.signal)
            .then((eps) => setEpisodesList(eps))
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
  }, [id, mediaType, seasonNum, episodeNum, selectedSeason, recordHistory, searchParams, setActiveMedia]);

  // Synchronize and persist playback progress into local storage
  const saveProgressNow = useCallback(
    (curTime: number, durTime: number, forceCompleted?: boolean) => {
      if (!id || !title || curTime <= 2) return;
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
        currentTime: curTime,
        duration: durTime,
        completed: forceCompleted,
      });
    },
    [id, title, mediaType, seasonNum, episodeNum]
  );

  // Load saved playback progress from local storage on mount or episode change
  useEffect(() => {
    if (!id) return;
    const prog = storage.getProgress(
      id,
      mediaType === 'tv' ? seasonNum : undefined,
      mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined
    );

    if (prog && prog.currentTime > 5 && !prog.completed) {
      setResumePrompt({
        time: prog.currentTime,
        formatted: formatTime(prog.currentTime),
        show: true,
      });
      currentPlaybackTimeRef.current = prog.currentTime;
      if (prog.duration > 0) {
        playbackDurationRef.current = prog.duration;
      }
    } else {
      setResumePrompt(null);
      currentPlaybackTimeRef.current = 0;
    }
  }, [id, seasonNum, episodeNum, mediaType]);

  // Listen for iframe postMessage playback events (FrameX, VideoJS, standard HTML5 embed postMessage)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const raw = event.data;
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!data || typeof data !== 'object') return;

        const time =
          typeof data.currentTime === 'number'
            ? data.currentTime
            : typeof data.time === 'number'
            ? data.time
            : typeof data.data?.currentTime === 'number'
            ? data.data.currentTime
            : typeof data.data?.time === 'number'
            ? data.data.time
            : null;

        const dur =
          typeof data.duration === 'number'
            ? data.duration
            : typeof data.data?.duration === 'number'
            ? data.data.duration
            : playbackDurationRef.current;

        if (time !== null && time > 0) {
          currentPlaybackTimeRef.current = time;
          if (dur > 0) {
            playbackDurationRef.current = dur;
          }
          const now = Date.now();
          if (now - lastSaveTimeRef.current >= 2500) {
            lastSaveTimeRef.current = now;
            saveProgressNow(time, dur);
          }
        }
      } catch {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [saveProgressNow]);

  // Periodic active watch tracker for embed player to keep timestamp updated in local storage
  useEffect(() => {
    if (isIframeLoading || !isPlayable || !title) return;

    const interval = setInterval(() => {
      if (document.hidden) return;
      currentPlaybackTimeRef.current += 3;
      const cur = currentPlaybackTimeRef.current;
      const dur = playbackDurationRef.current || (mediaType === 'movie' ? 7200 : 1500);
      saveProgressNow(cur, dur);
    }, 3000);

    return () => clearInterval(interval);
  }, [isIframeLoading, isPlayable, title, saveProgressNow, mediaType]);

  // Save latest playback timestamp on page leave or unmount
  useEffect(() => {
    const handleUnload = () => {
      if (currentPlaybackTimeRef.current > 3) {
        saveProgressNow(currentPlaybackTimeRef.current, playbackDurationRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      if (currentPlaybackTimeRef.current > 3) {
        saveProgressNow(currentPlaybackTimeRef.current, playbackDurationRef.current);
      }
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [saveProgressNow]);

  // Primary supported playback source for every media type branded as ZHAFX.
  const activeServerList: ServerOption[] = [
    {
      id: `zhafx-${mediaType}`,
      name: 'ZHAFX',
      tagline: 'Pemutaran resmi ZHAFX',
      type: mediaType === 'anime' ? 'anime_embed' : mediaType === 'tv' ? 'tv_embed' : 'movie_embed',
      provider: 'framex',
      badge: 'Utama',
    },
  ];

  const safeServerIndex = currentServerIndex < activeServerList.length ? currentServerIndex : 0;
  const activeServer = activeServerList[safeServerIndex] || activeServerList[0];

  // Reset server index if out of range when mediaType changes
  useEffect(() => {
    setCurrentServerIndex(0);
  }, [mediaType]);

  // Clean up global fullscreen lock on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('player-fullscreen');
      document.documentElement.classList.remove('player-fullscreen');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    };
  }, []);

  // Iframe loading management
  useEffect(() => {
    if (!isPlayable) {
      setIsIframeLoading(false);
      return;
    }

    setIsIframeLoading(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsIframeLoading(false);
    }, 2000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [id, episodeNum, seasonNum, safeServerIndex, iframeKey, isPlayable, animeAudio]);

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // Switch to next dedicated fallback server for this specific media type
  const handleNextServer = () => {
    const nextIdx = (safeServerIndex + 1) % activeServerList.length;
    setCurrentServerIndex(nextIdx);
    setFailoverNotice(`Beralih ke ${activeServerList[nextIdx].name}...`);
    setTimeout(() => setFailoverNotice(null), 3000);
    setIsIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  // Build clean FrameX Embed URL (HTTPS only, URL and URLSearchParams, no double encoding, no_ads=1)
  const buildEmbedUrl = (): string => {
    if (!isPlayable) return '';

    const cleanId = String(id).trim();
    const validEp = Math.max(1, episodeNum);
    const validSeason = Math.max(1, seasonNum);
    let targetProvider = activeServer.provider || 'grand_warden';
    const resumeTimeSec =
      resumePrompt?.time && resumePrompt.time > 5 ? Math.floor(resumePrompt.time) : 0;

    if (mediaType === 'anime') {
      // Official FrameX Anime Embed (https://framextv.cc/)
      let targetProv = activeServer.provider || 'grand_warden';
      if (animeAudio === 'dub' && !targetProv.endsWith('_dub')) {
        const dubCandidate = `${targetProv}_dub`;
        if (['grand_warden_dub', 'wizard_dub', 'valkyrie_dub', 'goblin_dub'].includes(dubCandidate)) {
          targetProv = dubCandidate;
        }
      } else if (animeAudio === 'sub' && targetProv.endsWith('_dub')) {
        targetProv = targetProv.replace('_dub', '');
      }

      const baseUrl = `https://framextv.cc/embed/anime`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('anilist_id', cleanId);
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('season', '1');
      url.searchParams.set('type', 'anime');
      url.searchParams.set('sub_type', animeAudio);
      url.searchParams.set('audio', animeAudio);
      url.searchParams.set('provider', targetProv);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1');
      url.searchParams.set('adblock', '1');
      url.searchParams.set('origin', 'internal');
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('webkit-playsinline', '1');
      url.searchParams.set('preload', 'auto');
      if (resumeTimeSec > 0) {
        url.searchParams.set('start', String(resumeTimeSec));
        url.searchParams.set('time', String(resumeTimeSec));
        url.searchParams.set('t', String(resumeTimeSec));
      }
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    if (mediaType === 'tv') {
      // Official FrameX TV Series Embed (https://framextv.cc/)
      const baseUrl = `https://framextv.cc/embed/tv/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validSeason))}/${encodeURIComponent(String(validEp))}`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('season', String(validSeason));
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('type', 'tv');
      url.searchParams.set('provider', targetProvider);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1'); // Disables popup ads on TV series
      url.searchParams.set('playsinline', '1');
      url.searchParams.set('webkit-playsinline', '1');
      url.searchParams.set('preload', 'auto');
      if (resumeTimeSec > 0) {
        url.searchParams.set('start', String(resumeTimeSec));
        url.searchParams.set('time', String(resumeTimeSec));
        url.searchParams.set('t', String(resumeTimeSec));
      }
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    // Official FrameX Movie Embed (https://framextv.cc/)
    const baseUrl = `https://framextv.cc/embed/movie/${encodeURIComponent(cleanId)}`;
    const url = new URL(baseUrl);
    url.searchParams.set('id', cleanId);
    url.searchParams.set('type', 'movie');
    url.searchParams.set('provider', targetProvider);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
    url.searchParams.set('no_ads', '1'); // Disables popup ads on Movies
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('webkit-playsinline', '1');
    url.searchParams.set('preload', 'auto');
    if (resumeTimeSec > 0) {
      url.searchParams.set('start', String(resumeTimeSec));
      url.searchParams.set('time', String(resumeTimeSec));
      url.searchParams.set('t', String(resumeTimeSec));
    }
    if (title?.title) {
      url.searchParams.set('title', title.title.trim());
    }
    return url.toString();
  };

  const embedUrl = buildEmbedUrl();

  // Fullscreen tracking & cross-browser synchronization
  useEffect(() => {
    const handleFsChange = () => {
      const isNativeFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      if (isNativeFs) {
        isNativeFsActive.current = true;
        setIsFullscreen(true);
      } else if (isNativeFsActive.current) {
        // Native fullscreen was exited via browser UI or Esc
        isNativeFsActive.current = false;
        setIsFullscreen(false);
        document.body.style.overflow = '';
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'Esc') && isFullscreen) {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          try {
            if (document.exitFullscreen) document.exitFullscreen();
            else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
          } catch {}
        }
        isNativeFsActive.current = false;
        setIsFullscreen(false);
        document.body.style.overflow = '';
      } else if (
        (e.key === 'f' || e.key === 'F') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        toggleFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = async () => {
    const el = playerContainerRef.current as any;
    if (!el) return;

    // 1. If HTML5 video is available on iOS (iPhone / iPad), invoke native Apple QuickTime Fullscreen!
    const targetVideo = el?.querySelector?.('video');
    if (targetVideo && typeof targetVideo.webkitEnterFullscreen === 'function') {
      try {
        targetVideo.webkitEnterFullscreen();
        setIsFullscreen(true);
        document.body.classList.add('player-fullscreen');
        document.documentElement.classList.add('player-fullscreen');
        return;
      } catch (err) {
        console.warn('[iOS webkitEnterFullscreen]:', err);
      }
    }

    // 2. Standard HTML5 or responsive CSS fullscreen
    if (!isFullscreen) {
      setIsFullscreen(true);
      document.body.classList.add('player-fullscreen');
      document.documentElement.classList.add('player-fullscreen');
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';

      // On iOS Safari, immediately scroll to (0,0) to retract URL/toolbar
      window.scrollTo(0, 0);

      // Attempt screen orientation lock to landscape on mobile devices
      try {
        if (screen.orientation && typeof (screen.orientation as any).lock === 'function') {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}

      // Attempt native HTML5 element requestFullscreen (iPad, desktop, Android)
      try {
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
          isNativeFsActive.current = true;
        } else if (el?.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
          isNativeFsActive.current = true;
        }
      } catch (err) {
        console.warn('[Fullscreen fallback]:', err);
      }

      // Signal iframe embedded player if present
      try {
        const iframe = el?.querySelector?.('iframe');
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage({ type: 'fullscreen', action: 'fullscreen', value: true }, '*');
          iframe.contentWindow.postMessage('fullscreen', '*');
        }
      } catch {}
    } else {
      isNativeFsActive.current = false;
      setIsFullscreen(false);
      document.body.classList.remove('player-fullscreen');
      document.documentElement.classList.remove('player-fullscreen');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';

      try {
        if (screen.orientation && typeof (screen.orientation as any).unlock === 'function') {
          (screen.orientation as any).unlock();
        }
      } catch {}

      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('[Exit fullscreen fallback]:', err);
      }
    }
  };

  const totalEpisodes =
    mediaType === 'anime'
      ? title?.numberOfEpisodes || 24
      : title?.seasons?.find((s) => s.number === seasonNum)?.episodeCount || title?.numberOfEpisodes || 12;

  const hasPrevEpisode = episodeNum > 1;
  const hasNextEpisode = (mediaType === 'tv' || mediaType === 'anime') && episodeNum < totalEpisodes;

  const currentEpisodeObj = episodesList.find((e) => e.number === episodeNum);
  const nextEpisodeObj = episodesList.find((e) => e.number === episodeNum + 1);
  const nextEpisodeTitle = nextEpisodeObj?.name || (hasNextEpisode ? `Episode ${episodeNum + 1}` : null);

  const navigateEpisode = (targetEp: number) => {
    setIsIframeLoading(true);
    if (mediaType === 'tv') {
      navigate(`/watch/tv/${id}/${seasonNum}/${targetEp}`);
    } else if (mediaType === 'anime') {
      navigate(`/watch/anime/${id}/1/${targetEp}`);
    }
  };

  const handleShare = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2500);
      }
    } catch {}
  };

  return (
    <div className={`min-h-screen bg-[#06070B] text-white flex flex-col relative ${isFullscreen ? 'p-0 m-0 overflow-hidden bg-black' : 'pb-[max(5rem,calc(env(safe-area-inset-bottom)+4.5rem))]'}`}>
      {/* Dynamic SEO Meta */}
      {title && (
        <SEOHead
          title={`Nonton ${title.title} ${mediaType === 'tv' ? `Musim ${seasonNum} Ep ${episodeNum}` : mediaType === 'anime' ? `Episode ${episodeNum}` : ''}`}
          description={title.overview || `Streaming ${title.title} kualitas HD di Zhafx.`}
          canonicalPath={`/detail/${mediaType}/${id}`}
          ogType="video.movie"
        />
      )}

      {/* Breadcrumb & Top Bar Above Player with iOS Notch/Island safe area padding */}
      {!isFullscreen && (
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-[max(5.5rem,calc(env(safe-area-inset-top)+4.5rem))] pb-3 flex items-center justify-between gap-3 text-xs text-white/70">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate(`/detail/${mediaType}/${id}`);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-medium cursor-pointer transition-all active:scale-95 shrink-0"
              title="Kembali"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kembali</span>
            </button>

            <span className="text-white/30 hidden sm:inline">/</span>

            <span
              className="truncate text-white/60 hover:text-white cursor-pointer hidden sm:inline"
              onClick={() => navigate('/explore')}
            >
              {mediaType === 'movie' ? 'Film' : mediaType === 'tv' ? 'Serial TV' : 'Anime'}
            </span>

            <span className="text-white/30 hidden sm:inline">/</span>

            <span className="truncate text-white font-semibold">
              {title?.title || 'Memuat Pemutar...'}
            </span>

            {(mediaType === 'tv' || mediaType === 'anime') && (
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold text-white shrink-0">
                {mediaType === 'tv' ? `S${seasonNum} E${episodeNum}` : `Ep ${episodeNum}`}
              </span>
            )}
          </div>

          {/* Right Top Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {title && (
              <button
                onClick={() =>
                  toggle({
                    id: title.id,
                    type: title.type,
                    title: title.title,
                    poster: title.poster,
                    year: title.year,
                    rating: title.rating,
                  })
                }
                className={`p-2 rounded-full bg-white/10 hover:bg-white/15 cursor-pointer transition-all ${
                  isSaved(title.id) ? 'text-[#FFB224]' : 'text-white/80'
                }`}
                title={isSaved(title.id) ? 'Hapus dari Daftar Saya' : 'Simpan ke Daftar Saya'}
              >
                {isSaved(title.id) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-white/80 hover:text-white cursor-pointer transition-all relative"
              title="Bagikan Tayangan"
            >
              <Share2 className="w-3.5 h-3.5" />
              {showShareToast && (
                <span className="absolute -bottom-8 right-0 bg-[#FFB224] text-black text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-lg">
                  Tautan disalin!
                </span>
              )}
            </button>

            {title && onOpenAIWithContext && (
              <button
                onClick={() => onOpenAIWithContext(title)}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-white font-semibold text-xs hover:bg-white/15 cursor-pointer transition-all"
              >
                <Sparkles className="w-3 h-3 text-[#FFB224]" />
                <span>Tanya AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Keluar dari Layar Penuh' : 'Buka Layar Penuh'}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] min-w-[44px] rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-xs cursor-pointer transition-all active:scale-95 border border-white/15 shadow-sm shrink-0"
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh (F)'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-white" /> : <Maximize className="w-4 h-4 text-white" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Keluar' : 'Layar Penuh'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          THE PLAYER CONTAINER
          ========================================================================= */}
      <div className={isFullscreen ? 'fixed inset-0 z-[2147483647] w-full h-full p-0 m-0 bg-black flex items-center justify-center' : 'w-full max-w-5xl mx-auto px-3 sm:px-6 mt-1 sm:mt-2 relative'}>
        {/* Failover Toast Notice */}
        {failoverNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md pointer-events-none animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{failoverNotice}</span>
          </div>
        )}

        {/* Video Box with Rounded Corners (Kotak Sudut Tumpul, 16:9 Aspect Video) */}
        <div
          id="player-container"
          ref={playerContainerRef}
          onDragStart={(e) => e.preventDefault()}
          className={`transition-all duration-300 select-none overflow-hidden bg-black ${
            isFullscreen
              ? 'fixed inset-0 z-[2147483647] w-screen h-screen h-[100dvh] m-0 p-0 rounded-none border-0 bg-black flex items-center justify-center touch-none overscroll-none'
              : 'relative w-full aspect-video rounded-2xl sm:rounded-3xl border border-white/10 sm:border-white/15 bg-black shadow-[0_20px_50px_rgba(0,0,0,0.95)] overscroll-none'
          }`}
          style={{
            touchAction: isFullscreen ? 'none' : 'pan-y',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            ...(isFullscreen
              ? {
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100vw',
                  height: '100dvh',
                  zIndex: 2147483647,
                }
              : {}),
          }}
        >
          {/* Interactive Resume Notification Banner */}
          {resumePrompt && resumePrompt.show && resumePrompt.time > 10 && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 max-w-[94%] px-3.5 sm:px-4 py-2 rounded-full bg-[#12162A]/90 border border-[#FFB224]/30 text-white text-xs font-medium flex items-center justify-between gap-3 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-md animate-fade-in pointer-events-auto">
              <div className="flex items-center gap-2 truncate">
                <span className="w-2 h-2 rounded-full bg-[#FFB224] animate-pulse shrink-0" />
                <span className="truncate">
                  Melanjutkan dari <span className="font-mono text-[#FFB224] font-bold">{resumePrompt.formatted}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/20 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (id) {
                      storage.removeProgress(
                        id,
                        mediaType === 'tv' ? seasonNum : undefined,
                        mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined
                      );
                    }
                    setResumePrompt(null);
                    currentPlaybackTimeRef.current = 0;
                    setIframeKey((k) => k + 1);
                    setFailoverNotice('Memutar ulang dari awal (00:00)');
                    setTimeout(() => setFailoverNotice(null), 2500);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                >
                  Mulai dari awal
                </button>
                <button
                  type="button"
                  onClick={() => setResumePrompt((prev) => (prev ? { ...prev, show: false } : null))}
                  className="p-1 rounded-full hover:bg-white/15 text-white/60 hover:text-white cursor-pointer transition-colors"
                  title="Tutup pemberitahuan"
                  aria-label="Tutup pemberitahuan lanjutkan menonton"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {isPlayable ? (
            /* =========================================================
               Single Official Embed Player (FrameX Embed - NO SANDBOX)
               Optimized for iOS (iPhone/iPad Safari) & Windows
               ========================================================= */
            <iframe
              key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${safeServerIndex}-${iframeKey}-${animeAudio}`}
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              allowFullScreen={true}
              // @ts-ignore
              webkitallowfullscreen="true"
              // @ts-ignore
              mozallowfullscreen="true"
              // @ts-ignore
              playsInline={true}
              // @ts-ignore
              playsinline="true"
              // @ts-ignore
              webkit-playsinline="true"
              allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *; accelerometer *; gyroscope *; clipboard-write *; web-share *"
              referrerPolicy="origin"
              loading="eager"
              title={title?.title || 'Zhafx Stream Player'}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 absolute inset-0 z-10 bg-black"
              style={{
                touchAction: 'manipulation',
                overscrollBehavior: 'none',
                pointerEvents: 'auto',
              }}
            />
          ) : (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#0E1017]">
              <AlertTriangle className="w-10 h-10 text-[#FFB224]" />
              <h3 className="text-base font-bold text-white">Episode Tidak Tersedia</h3>
              <p className="text-xs text-white/60 max-w-sm">
                Tayangan atau episode yang Anda pilih tidak valid atau belum dirilis.
              </p>
              <button
                onClick={() => navigate(`/detail/${mediaType}/${id || ''}`)}
                className="px-4 py-2 rounded-full bg-[#FFB224] text-black text-xs font-bold hover:bg-[#FFA500] cursor-pointer"
              >
                Kembali ke Detail
              </button>
            </div>
          )}

          {/* Loading Indicator Spinner (for iframe mode) */}
          {isIframeLoading && isPlayable && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070B]/85 backdrop-blur-sm space-y-3 pointer-events-none">
              <div className="w-10 h-10 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
              <span className="text-xs font-mono text-white/80 tracking-wider">
                Menghubungkan ke {activeServer.name}...
              </span>
            </div>
          )}

          {/* Floating Fullscreen button on Player box (Bottom-Right) */}
          {!isFullscreen && isPlayable && (
            <div className="absolute bottom-3 right-3 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Layar Penuh"
                title="Layar Penuh (F)"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-black/75 hover:bg-black/95 text-white flex items-center justify-center backdrop-blur-md cursor-pointer transition-all border border-white/25 hover:scale-105 active:scale-95 shadow-2xl"
              >
                <Maximize className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Fullscreen Close / Exit Button with Safe Area Padding */}
          {isFullscreen && (
            <div className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-[2147483647] pointer-events-auto">
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-label="Keluar Layar Penuh"
                className="min-w-[44px] min-h-[44px] p-3 rounded-full bg-black/85 hover:bg-black text-white cursor-pointer shadow-2xl border border-white/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                title="Keluar Layar Penuh (Esc)"
              >
                <Minimize className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          KETERANGAN DI BAWAH PLAYER (SEPERTI PADA FRAMEXTV)
          ========================================================================= */}
      {!isFullscreen && (
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {/* 1. Server Tip Banner (FrameX Style) */}
        {!isTipDismissed && (
          <aside className="px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-amber-500/25 backdrop-blur-md shadow-lg flex items-center justify-between gap-2.5 text-xs text-zinc-300 animate-in fade-in">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </div>
              <p className="leading-snug">
                <span className="font-semibold text-white">Buffering atau lambat memuat?</span>{' '}
                <span className="text-zinc-400 hidden sm:inline">Ganti server streaming melalui tombol server di bawah ini.</span>
                <span className="text-zinc-400 sm:hidden">Ganti server di bawah ini.</span>
              </p>
            </div>
            <button
              onClick={() => setIsTipDismissed(true)}
              className="p-1 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Tutup tips"
              aria-label="Tutup tips"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </aside>
        )}

        {/* 2. Episode Quick Navigator Bar (Khusus Serial TV & Anime - FrameX WatchPage style) */}
        {(mediaType === 'tv' || mediaType === 'anime') && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-zinc-950/70 border border-white/[0.08] shadow-md">
            <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
              <button
                onClick={() => navigateEpisode(episodeNum - 1)}
                disabled={!hasPrevEpisode}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 min-h-[38px] rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.08] text-xs font-semibold text-zinc-200 hover:text-white disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-all active:scale-95"
                title="Episode Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-400" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('episode-browser-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="flex-2 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/[0.1] text-xs font-bold text-white transition-all active:scale-95 cursor-pointer"
                title="Buka daftar episode"
              >
                <ListOrdered className="w-3.5 h-3.5 text-[#FFB224] shrink-0" />
                <span>
                  {mediaType === 'tv'
                    ? `Musim ${seasonNum} • Ep ${episodeNum}`
                    : `Episode ${episodeNum}${totalEpisodes ? ` dari ${totalEpisodes}` : ''}`}
                </span>
              </button>

              <button
                onClick={() => navigateEpisode(episodeNum + 1)}
                disabled={!hasNextEpisode}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3.5 py-2 min-h-[38px] rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-all active:scale-95 shadow-sm"
                title="Episode Berikutnya"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4 text-black" />
              </button>
            </div>

            {nextEpisodeTitle && (
              <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-400 truncate max-w-xs">
                <span className="text-zinc-600">•</span>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Berikutnya:</span>
                <span className="text-zinc-300 truncate">{nextEpisodeTitle}</span>
              </div>
            )}
          </div>
        )}

        {/* 3. Header Information & Actions (Keterangan FrameX Style) */}
        <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-zinc-950/80 border border-white/[0.08] shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="space-y-1.5 min-w-0">
              <button
                onClick={() => navigate(`/detail/${mediaType}/${id}`)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-[#FFB224] transition-colors cursor-pointer group"
              >
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
                <span className="font-semibold truncate">{title?.title || 'Detail Tayangan'}</span>
              </button>

              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {mediaType === 'tv'
                  ? `Musim ${seasonNum} · Episode ${episodeNum}${currentEpisodeObj?.name ? ` — ${currentEpisodeObj.name}` : ''}`
                  : mediaType === 'anime'
                  ? `Episode ${episodeNum}${totalEpisodes ? ` dari ${totalEpisodes}` : ''}${currentEpisodeObj?.name ? ` — ${currentEpisodeObj.name}` : ''}`
                  : title?.title || 'Memuat Film...'}
              </h1>

              {/* Badges and metadata */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-white/70">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-medium text-[11px]">
                  {title?.year || '2024'}
                </span>

                <span className="px-2.5 py-0.5 rounded-full bg-[#FFB224]/15 border border-[#FFB224]/30 text-[#FFB224] font-bold text-[11px] flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#FFB224]" />
                  {title?.rating || '8.5'}
                </span>

                {title?.genres && title.genres.length > 0 && (
                  <>
                    <span className="text-white/30 hidden sm:inline">•</span>
                    <span className="text-white/60 hidden sm:inline">{title.genres.slice(0, 3).join(' / ')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions (Save, Share, Refresh) */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0">
              {title && (
                <button
                  onClick={() =>
                    toggle({
                      id: title.id,
                      type: title.type,
                      title: title.title,
                      poster: title.poster,
                      year: title.year,
                      rating: title.rating,
                    })
                  }
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer border transition-all ${
                    isSaved(title.id)
                      ? 'bg-[#FFB224] text-black border-[#FFB224]'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  }`}
                >
                  {isSaved(title.id) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  <span>{isSaved(title.id) ? 'Tersimpan' : 'Simpan'}</span>
                </button>
              )}

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold cursor-pointer transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Bagikan</span>
              </button>

              <button
                onClick={() => {
                  setIsIframeLoading(true);
                  setIframeKey((k) => k + 1);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white cursor-pointer transition-all"
                title="Muat ulang pemutar"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Synopsis / Description with expander */}
          <div>
            <p className={`text-xs sm:text-sm text-white/80 leading-relaxed ${isOverviewExpanded ? '' : 'line-clamp-3'}`}>
              {currentEpisodeObj?.overview || title?.overview || 'Sinopsis belum tersedia untuk episode ini.'}
            </p>
            {(currentEpisodeObj?.overview || title?.overview) && (
              <button
                onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                className="text-xs font-bold text-[#FFB224] hover:underline mt-1.5 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{isOverviewExpanded ? 'Tampilkan Lebih Sedikit' : 'Selengkapnya'}</span>
                {isOverviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* 4. Pilihan Server Streaming (FrameX TV Engine) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#FFB224]" />
                Pilihan Server
              </span>

              {/* Anime Sub/Dub Selector (Official FrameX Engine) */}
              {mediaType === 'anime' && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center p-0.5 rounded-full bg-white/10 border border-white/15 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setAnimeAudio('sub');
                        setIsIframeLoading(true);
                        setIframeKey((k) => k + 1);
                      }}
                      className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                        animeAudio === 'sub' ? 'bg-[#FFB224] text-black shadow-sm' : 'text-white/70 hover:text-white'
                      }`}
                      title="Audio Asli / Japanese Audio dengan Subtitle"
                    >
                      SUB (Jepang)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAnimeAudio('dub');
                        setIsIframeLoading(true);
                        setIframeKey((k) => k + 1);
                      }}
                      className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                        animeAudio === 'dub' ? 'bg-[#FFB224] text-black shadow-sm' : 'text-white/70 hover:text-white'
                      }`}
                      title="Audio Sulih Suara (Dubbing)"
                    >
                      DUB (Inggris)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Server Pills with iOS momentum scrolling */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {activeServerList.map((server, idx) => {
                const isActive = idx === safeServerIndex;
                return (
                  <button
                    key={server.id}
                    onClick={() => {
                      setCurrentServerIndex(idx);
                      setIsIframeLoading(true);
                      setIframeKey((k) => k + 1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-[transform,background-color,color,border-color,box-shadow] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center gap-1.5 shrink-0 transform-gpu will-change-transform ${
                      isActive
                        ? 'bg-[#FFB224] text-black shadow-lg scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 active:scale-95'
                    }`}
                  >
                    <span>{server.name}</span>
                    {server.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-black/20 text-black' : 'bg-white/15 text-white/70'
                        }`}
                      >
                        {server.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Tips: Jika pemutar buffering atau lambat, ganti server di atas untuk menghubungkan ke jalur CDN cadangan.
            </p>
          </div>
        </div>

        {/* 5. Episode Browser (Khusus Serial TV & Anime) */}
        {(mediaType === 'tv' || mediaType === 'anime') && (
          <div
            id="episode-browser-section"
            className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-zinc-950/80 border border-white/[0.08] shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <ListOrdered className="w-4 h-4 text-[#FFB224]" />
                <h3 className="text-base font-bold text-white">
                  Daftar Episode {mediaType === 'tv' ? `(Musim ${seasonNum})` : 'Anime'}
                </h3>
                <span className="text-xs text-white/40 font-mono">
                  {episodesList.length || totalEpisodes} Episode
                </span>
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-2">
                <div className="flex p-0.5 rounded-full bg-white/10 border border-white/15 text-[11px]">
                  <button
                    onClick={() => setEpisodeViewMode('visual')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      episodeViewMode === 'visual' ? 'bg-[#FFB224] text-black' : 'text-white/70'
                    }`}
                  >
                    Visual
                  </button>
                  <button
                    onClick={() => setEpisodeViewMode('grid')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      episodeViewMode === 'grid' ? 'bg-[#FFB224] text-black' : 'text-white/70'
                    }`}
                  >
                    Nomor
                  </button>
                </div>
              </div>
            </div>

            {/* Episode Content with iOS momentum scrolling */}
            {episodeViewMode === 'visual' ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {Array.from({ length: episodesList.length || totalEpisodes }, (_, i) => i + 1).map((ep) => {
                  const isCurrent = ep === episodeNum;
                  const matchingEp = episodesList.find((e) => e.number === ep);
                  const epThumb = matchingEp?.still || matchingEp?.stillPath || title?.backdrop || title?.poster;
                  const fallbackThumb = title?.backdrop || title?.poster || '';

                  return (
                    <button
                      key={ep}
                      onClick={() => navigateEpisode(ep)}
                      className={`flex items-start gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer group relative overflow-hidden min-h-[56px] active:scale-[0.98] ${
                        isCurrent
                          ? 'bg-[#FFB224]/15 border-[#FFB224] shadow-lg scale-[1.01]'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-black/40 shrink-0 relative">
                        {epThumb || fallbackThumb ? (
                          <img
                            src={epThumb || fallbackThumb}
                            alt={`Ep ${ep}`}
                            loading="lazy"
                            onError={(e) => {
                              if (fallbackThumb && (e.currentTarget as HTMLImageElement).src !== fallbackThumb) {
                                (e.currentTarget as HTMLImageElement).src = fallbackThumb;
                              }
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-mono">
                            Ep {ep}
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 fill-white text-white" />
                        </div>

                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] font-bold text-white">
                          Ep {ep}
                        </span>
                      </div>

                      {/* Episode Details */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-bold truncate ${isCurrent ? 'text-[#FFB224]' : 'text-white'}`}>
                            {matchingEp?.name || `Episode ${ep}`}
                          </h4>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded bg-[#FFB224] text-black text-[9px] font-extrabold uppercase shrink-0">
                              Sedang Diputar
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-white/50 line-clamp-2 mt-1 leading-relaxed">
                          {matchingEp?.overview || 'Klik untuk memutar episode ini secara instan.'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Grid View (Quick Numbers with iOS touch momentum scrolling) */
              <div
                className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2 max-h-[300px] overflow-y-auto pr-1"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {Array.from({ length: episodesList.length || totalEpisodes }, (_, i) => i + 1).map((ep) => {
                  const isCurrent = ep === episodeNum;
                  return (
                    <button
                      key={ep}
                      onClick={() => navigateEpisode(ep)}
                      className={`h-10 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-[#FFB224] text-black shadow-lg scale-105'
                          : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10'
                      }`}
                      title={`Episode ${ep}`}
                    >
                      {ep}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 6. Sinopsis & Informasi Detail */}
        {title && (
          <div className="p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-zinc-950/80 border border-white/[0.08] shadow-xl space-y-4">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[#FFB224]" />
              <h3 className="text-base font-bold text-white">Sinopsis & Keterangan Lengkap</h3>
            </div>

            {/* Overview / Storyline */}
            <div>
              <p className={`text-xs sm:text-sm text-white/80 leading-relaxed ${isOverviewExpanded ? '' : 'line-clamp-3'}`}>
                {title.overview || 'Sinopsis resmi untuk tayangan ini belum tersedia.'}
              </p>
              {title.overview && title.overview.length > 200 && (
                <button
                  onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                  className="text-xs font-bold text-[#FFB224] hover:underline mt-1.5 flex items-center gap-1 cursor-pointer"
                >
                  <span>{isOverviewExpanded ? 'Tampilkan Lebih Sedikit' : 'Selengkapnya'}</span>
                  {isOverviewExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Genres Tag Pills */}
            {title.genres && title.genres.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-xs text-white/50 mr-1">Genre:</span>
                {title.genres.map((g) => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[11px] font-medium border border-white/10"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Cast Members */}
            {title.cast && title.cast.length > 0 && (
              <div className="pt-2">
                <h4 className="text-xs font-bold text-white/60 mb-2.5">Pemeran Utama:</h4>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {title.cast.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 bg-white/[0.04] p-1.5 pr-3 rounded-full border border-white/10 shrink-0"
                    >
                      {c.profile ? (
                        <img src={c.profile} alt={c.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                          {c.name.slice(0, 1)}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-xs font-bold text-white truncate max-w-[100px]">{c.name}</p>
                        <p className="text-[10px] text-white/50 truncate max-w-[100px]">{c.character || 'Pemeran'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Rekomendasi Tayangan Serupa (More Like This) */}
        {title && title.similar && title.similar.length > 0 && (
          <div className="pt-4">
            <MediaRow
              title="Rekomendasi Tayangan Serupa"
              items={title.similar}
            />
          </div>
        )}
      </div>
      )}
    </div>
  );
};
