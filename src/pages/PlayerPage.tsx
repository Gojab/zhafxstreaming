import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Server,
  RotateCw,
  Maximize,
  Minimize,
  Star,
  Bookmark,
  BookmarkCheck,
  Share2,
  Sparkles,
  Volume2,
  ShieldCheck,
  Film,
  Tv,
  Play,
  Info,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  ListOrdered,
  X,
  Download,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, MediaType, Episode } from '../types';
import { storage } from '../lib/storage';
import { useMyList } from '../hooks/useMyList';
import { useActiveMedia } from '../context/ActiveMediaContext';
import { useDownload } from '../context/DownloadContext';
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
// 2. Dedicated Servers Khusus SERIAL TV — FrameX API Engine (Dimulai dari Miner 4K)
// Mengikuti konfigurasi Film dengan Miner 4K di urutan pertama
// =========================================================================
export const TV_SERVERS: ServerOption[] = [
  {
    id: 'server-tv-1',
    name: 'Server TV 1 — Miner 4K',
    tagline: 'Movy Multi-City TV Series 4K Server • Ultra HD',
    type: 'tv_embed',
    provider: 'miner',
    badge: '4K ULTRA',
  },
  {
    id: 'server-tv-2',
    name: 'Server TV 2 — Headhunter HD',
    tagline: 'VidLink TV Series Multi-Sub & Episode Lengkap',
    type: 'tv_embed',
    provider: 'headhunter',
    badge: 'HD MULTI-SUB',
  },
  {
    id: 'server-tv-3',
    name: 'Server TV 3 — Valkyrie 4K Ultra',
    tagline: '4K Ultra Multi-Server Stabil & Cepat',
    type: 'tv_embed',
    provider: 'valkyrie',
    badge: 'ULTRA STABIL',
  },
  {
    id: 'server-tv-4',
    name: 'Server TV 4 — Titan Direct',
    tagline: 'Films365 Direct MP4 1080p Server',
    type: 'tv_embed',
    provider: 'titan',
    badge: 'DIRECT 1080P',
  },
  {
    id: 'server-tv-5',
    name: 'Server TV 5 — Hog Rider 4K',
    tagline: '4K TV Server Dedicated Cadangan',
    type: 'tv_embed',
    provider: 'hog_rider',
    badge: '4K FAST',
  },
  {
    id: 'server-tv-6',
    name: 'Server TV 6 — Lava Hound',
    tagline: '4K Fast TV Series Multi-Server Stream',
    type: 'tv_embed',
    provider: 'lavahound',
    badge: 'MULTI-CDN',
  },
  {
    id: 'server-tv-7',
    name: 'Server TV 7 — Super Barbarian',
    tagline: 'Direct Auto HLS TV Series Stream',
    type: 'tv_embed',
    provider: 'super_barbarian',
    badge: 'AUTO HLS',
  },
  {
    id: 'server-tv-8',
    name: 'Server TV 8 — Bowler Multi-Lang',
    tagline: 'Multi-Language TV Episodes & Softsub',
    type: 'tv_embed',
    provider: 'bowler',
    badge: 'MULTI-LANG',
  },
  {
    id: 'server-tv-9',
    name: 'Server TV 9 — Giant Multi-Audio',
    tagline: 'Multi-Audio TV Stream Cepat',
    type: 'tv_embed',
    provider: 'giant',
    badge: 'MULTI-AUDIO',
  },
];

// =========================================================================
// 3. Dedicated Servers Khusus ANIME — FrameX API Engine (100% Bebas Sandbox)
// =========================================================================
export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'server-anime-1',
    name: 'Server Anime 1 — Grand Warden',
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

  const seasonNum = parseInt(rawSeason || '1', 10);
  const episodeNum = parseInt(rawEpisode || '1', 10);

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

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [episodeViewMode, setEpisodeViewMode] = useState<'visual' | 'grid'>('visual');
  const [selectedSeason, setSelectedSeason] = useState<number>(seasonNum);
  const [episodesList, setEpisodesList] = useState<Episode[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);
  const [isTipDismissed, setIsTipDismissed] = useState(false);
  const [downloadToast, setDownloadToast] = useState(false);

  const { isSaved, toggle } = useMyList();
  const { setActiveMedia } = useActiveMedia();
  const { startDownload, toggleDrawer } = useDownload();
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const isNativeFsActive = useRef<boolean>(false);

  const handleDownloadCurrent = () => {
    if (!title || !id) return;
    startDownload({
      contentId: id,
      mediaType,
      title: title.title,
      poster: title.poster,
      year: title.year,
      season: mediaType === 'tv' ? seasonNum : undefined,
      episode: mediaType === 'tv' || mediaType === 'anime' ? episodeNum : undefined,
      episodeName: currentEpisodeObj?.name,
      audio: animeAudio,
    });
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3500);
  };

  const handleDownloadEpisode = (ep: number, epName?: string) => {
    if (!title || !id) return;
    startDownload({
      contentId: id,
      mediaType,
      title: title.title,
      poster: title.poster,
      year: title.year,
      season: mediaType === 'tv' ? seasonNum : undefined,
      episode: ep,
      episodeName: epName,
      audio: animeAudio,
    });
    setDownloadToast(true);
    setTimeout(() => setDownloadToast(false), 3500);
  };

  // Dynamic import of hls.js on demand
  const loadHls = async () => {
    const { default: Hls } = await import('hls.js');
    return Hls;
  };

  // Anti-popup guard
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

  // Resolve dedicated server list based on mediaType (Film / Serial TV / Anime)
  const activeServerList: ServerOption[] =
    mediaType === 'anime'
      ? ANIME_SERVERS
      : mediaType === 'tv'
      ? TV_SERVERS
      : MOVIE_SERVERS;

  const safeServerIndex = currentServerIndex < activeServerList.length ? currentServerIndex : 0;
  const activeServer = activeServerList[safeServerIndex] || activeServerList[0];

  // Reset server index if out of range when mediaType changes
  useEffect(() => {
    setCurrentServerIndex(0);
  }, [mediaType]);

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
    }, 4000);

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

      // Official FrameX Anime Embed (https://framextv.xyz/) - 100% Sandbox Free
      const baseUrl = `https://framextv.xyz/embed/anime/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validEp))}`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('season', '1');
      url.searchParams.set('type', 'anime');
      url.searchParams.set('sub_type', animeAudio);
      url.searchParams.set('audio', animeAudio);
      url.searchParams.set('provider', targetProvider);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1');
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    if (mediaType === 'tv') {
      // Official FrameX TV Series Embed (https://framextv.xyz/) - Dimulai dari Miner 4K
      const baseUrl = `https://framextv.xyz/embed/tv/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validSeason))}/${encodeURIComponent(String(validEp))}`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('season', String(validSeason));
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('type', 'tv');
      url.searchParams.set('provider', targetProvider);
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1'); // Disables popup ads on TV series
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    // Official FrameX Movie Embed (https://framextv.xyz/)
    const baseUrl = `https://framextv.xyz/embed/movie/${encodeURIComponent(cleanId)}`;
    const url = new URL(baseUrl);
    url.searchParams.set('id', cleanId);
    url.searchParams.set('type', 'movie');
    url.searchParams.set('provider', targetProvider);
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
    url.searchParams.set('no_ads', '1'); // Disables popup ads on Movies
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

    if (!isFullscreen) {
      // 1. Enter fullscreen (immediate responsive CSS layout + lock background scroll)
      setIsFullscreen(true);
      document.body.style.overflow = 'hidden';

      // 2. Attempt HTML5 native fullscreen if supported & permitted
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
          isNativeFsActive.current = true;
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
          isNativeFsActive.current = true;
        } else if (el.mozRequestFullScreen) {
          await el.mozRequestFullScreen();
          isNativeFsActive.current = true;
        } else if (el.msRequestFullscreen) {
          await el.msRequestFullscreen();
          isNativeFsActive.current = true;
        }
      } catch (err) {
        // Graceful fallback to pure CSS fullscreen
        console.warn('[Zhafx Player Fullscreen Fallback]:', err);
      }
    } else {
      // Exit fullscreen
      isNativeFsActive.current = false;
      setIsFullscreen(false);
      document.body.style.overflow = '';

      try {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
        }
      } catch (err) {
        console.warn('[Zhafx Player Exit Fullscreen Fallback]:', err);
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
    <div className="min-h-screen bg-[#06070B] text-white flex flex-col relative pb-20">
      {/* Dynamic SEO Meta */}
      {title && (
        <SEOHead
          title={`Nonton ${title.title} ${mediaType === 'tv' ? `Musim ${seasonNum} Ep ${episodeNum}` : mediaType === 'anime' ? `Episode ${episodeNum}` : ''}`}
          description={title.overview || `Streaming ${title.title} kualitas 4K Ultra HD di Zhafx.`}
          ogType="video.movie"
        />
      )}

      {/* Breadcrumb & Top Bar Above Player */}
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 pt-20 sm:pt-24 md:pt-28 pb-3 flex items-center justify-between gap-3 text-xs text-white/70">
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

          {/* Unduh Video Top Button */}
          {title && (
            <button
              type="button"
              onClick={handleDownloadCurrent}
              aria-label="Unduh Tayangan Ini"
              title="Unduh Tayangan Ini (Tekan X untuk cek progres)"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh</span>
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

      {/* Download Toast Notification */}
      {downloadToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 p-3.5 px-4 rounded-2xl bg-zinc-900/95 border border-amber-400/50 text-white text-xs font-medium shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold shrink-0">
            <Download className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <span className="font-bold text-amber-300 block">Unduhan Dimulai!</span>
            <span className="text-[11px] text-white/70">Tekan tombol <strong>X</strong> di keyboard untuk cek progres.</span>
          </div>
        </div>
      )}

      {/* =========================================================================
          THE PLAYER CONTAINER ("Kotak Sudut Tumpul", Tidak Langsung Fullscreen)
          ========================================================================= */}
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 mt-1 sm:mt-2 relative">
        {/* Soft Ambient Glow Behind the Player Box */}
        {title?.backdrop && !isFullscreen && (
          <div
            className="absolute -inset-4 sm:-inset-6 bg-cover bg-center rounded-[36px] blur-3xl opacity-20 -z-10 pointer-events-none transition-all duration-700"
            style={{ backgroundImage: `url(${title.backdrop})` }}
          />
        )}

        {/* Failover Toast Notice */}
        {failoverNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md pointer-events-none animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{failoverNotice}</span>
          </div>
        )}

        {/* Video Box with Rounded Corners (Kotak Sudut Tumpul, 16:9 Aspect Video) */}
        <div
          ref={playerContainerRef}
          className={`bg-black transition-all duration-300 ${
            isFullscreen
              ? 'fixed inset-0 z-[999999] w-full h-full m-0 p-0 rounded-none border-0'
              : 'relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 sm:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)]'
          }`}
        >
          {/* Iframe Pemutar Resmi FrameX (100% Bebas Sandbox & Fullscreen Delegated) */}
          {isPlayable ? (
            <iframe
              key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${safeServerIndex}-${iframeKey}-${animeAudio}`}
              src={embedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen={true}
              // @ts-ignore
              webkitallowfullscreen="true"
              // @ts-ignore
              mozallowfullscreen="true"
              allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *; accelerometer *; gyroscope *; clipboard-write *; web-share *"
              referrerPolicy="origin"
              loading="eager"
              title={title?.title || 'Zhafx Stream Player'}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 absolute inset-0 z-10 bg-black"
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

          {/* Loading Indicator Spinner */}
          {isIframeLoading && isPlayable && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070B]/85 backdrop-blur-sm space-y-3 pointer-events-none">
              <div className="w-10 h-10 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
              <span className="text-xs font-mono text-white/80 tracking-wider">
                Menghubungkan ke {activeServer.name}...
              </span>
            </div>
          )}

          {/* Quick Floating Fullscreen Button on Video Player Container (Bottom-Right, min 44x44px) */}
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

          {/* Fullscreen Close / Exit Button */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-40 pointer-events-auto">
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

                {mediaType === 'movie' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-[#FFB224] font-bold text-[10px] border border-amber-500/30">
                    FILM 4K
                  </span>
                )}
                {mediaType === 'tv' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] border border-emerald-500/30">
                    SERIAL TV HD
                  </span>
                )}
                {mediaType === 'anime' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold text-[10px] border border-violet-500/30">
                    ANIME HD
                  </span>
                )}

                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  100% Bebas Sandbox
                </span>

                {title?.genres && title.genres.length > 0 && (
                  <>
                    <span className="text-white/30 hidden sm:inline">•</span>
                    <span className="text-white/60 hidden sm:inline">{title.genres.slice(0, 3).join(' / ')}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions (Download, Save, Share, Refresh) */}
            <div className="flex items-center gap-2 self-start md:self-center shrink-0 flex-wrap">
              {title && (
                <button
                  onClick={handleDownloadCurrent}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-md"
                  title="Unduh video ke perangkat (Tekan X untuk cek progres)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Video</span>
                  <kbd className="px-1.5 py-0.2 rounded bg-black/15 text-black text-[9px] font-mono font-bold">
                    X
                  </kbd>
                </button>
              )}

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
                Pilihan Server Streaming (FrameX TV Engine):
              </span>

              {/* Anime Sub/Dub Selector */}
              {mediaType === 'anime' && (
                <div className="flex items-center p-0.5 rounded-full bg-white/10 border border-white/15 text-[11px]">
                  <button
                    onClick={() => setAnimeAudio('sub')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      animeAudio === 'sub' ? 'bg-[#FFB224] text-black' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    SUB (Jepang)
                  </button>
                  <button
                    onClick={() => setAnimeAudio('dub')}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                      animeAudio === 'dub' ? 'bg-[#FFB224] text-black' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    DUB (Inggris)
                  </button>
                </div>
              )}
            </div>

            {/* Horizontal Server Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
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
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? 'bg-[#FFB224] text-black shadow-lg scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15'
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

            {/* Episode Content */}
            {episodeViewMode === 'visual' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[460px] overflow-y-auto pr-1">
                {Array.from({ length: episodesList.length || totalEpisodes }, (_, i) => i + 1).map((ep) => {
                  const isCurrent = ep === episodeNum;
                  const matchingEp = episodesList.find((e) => e.number === ep);
                  const epThumb = matchingEp?.still || matchingEp?.stillPath || title?.backdrop || title?.poster;

                  return (
                    <button
                      key={ep}
                      onClick={() => navigateEpisode(ep)}
                      className={`flex items-start gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer group relative overflow-hidden ${
                        isCurrent
                          ? 'bg-[#FFB224]/15 border-[#FFB224] shadow-lg scale-[1.01]'
                          : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      {/* Thumbnail Container */}
                      <div className="w-24 sm:w-28 aspect-video rounded-xl overflow-hidden bg-black/40 shrink-0 relative">
                        {epThumb ? (
                          <img
                            src={epThumb}
                            alt={`Ep ${ep}`}
                            loading="lazy"
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
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadEpisode(ep, matchingEp?.name);
                              }}
                              className="p-1 rounded-md bg-white/10 hover:bg-amber-400 hover:text-black text-white/70 transition-all cursor-pointer"
                              title={`Unduh Episode ${ep} (Cek di Shortcut X)`}
                            >
                              <Download className="w-3 h-3" />
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FFB224] text-black text-[9px] font-extrabold uppercase shrink-0">
                                Sedang Diputar
                              </span>
                            )}
                          </div>
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
              /* Grid View (Quick Numbers) */
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-2 max-h-[300px] overflow-y-auto pr-1">
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
    </div>
  );
};
