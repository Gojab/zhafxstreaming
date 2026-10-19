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
  ListOrdered,
  CheckCircle2,
  X,
  Tv,
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, MediaType, Episode } from '../types';
import { storage } from '../lib/storage';

export interface ServerOption {
  id: string;
  name: string;
  tagline: string;
  type: 'anime_embed' | 'tv_embed' | 'movie_embed';
  provider: string;
  serverParam?: string;
}

// 6 Dedicated FrameX servers for anime with verified upstream provider mapping
export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'server-1',
    name: 'Server 1 — FrameX Cloud Utama',
    tagline: 'Grand Warden • 1080p Ultra HD Fast Stream',
    type: 'anime_embed',
    provider: 'grand_warden',
  },
  {
    id: 'server-2',
    name: 'Server 2 — FrameX Wizard Dual Audio',
    tagline: 'Wizard • Dual Audio & Softsub Cepat',
    type: 'anime_embed',
    provider: 'wizard',
  },
  {
    id: 'server-3',
    name: 'Server 3 — FrameX TV & Anime Mirror',
    tagline: 'Super P.E.K.K.A • 1080p Ultra High Bitrate Multi-Source',
    type: 'anime_embed',
    provider: 'super_pekka',
  },
  {
    id: 'server-4',
    name: 'Server 4 — FrameX Valkyrie HD',
    tagline: 'Valkyrie • FlixCloud HD Fast CDN',
    type: 'anime_embed',
    provider: 'valkyrie',
  },
  {
    id: 'server-5',
    name: 'Server 5 — FrameX Universal Stream',
    tagline: 'Giant • Universal Multi-CDN Stream',
    type: 'anime_embed',
    provider: 'giant',
  },
  {
    id: 'server-6',
    name: 'Server 6 — FrameX Direct Path',
    tagline: 'Goblin • Direct Fast Auto Stream',
    type: 'anime_embed',
    provider: 'goblin',
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

  // Iframe loading and watchdog state
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [failoverNotice, setFailoverNotice] = useState<string | null>(null);
  const timeoutRef = useRef<any>(null);

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

  // Iframe loading management
  useEffect(() => {
    if (!isPlayable) {
      setIsIframeLoading(false);
      return;
    }

    setIsIframeLoading(true);
    setFailoverNotice(null);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Some embed providers never fire onError when their upstream is unavailable.
    // Use a bounded watchdog so the player can recover instead of remaining stuck.
    timeoutRef.current = window.setTimeout(() => {
      setIsIframeLoading(false);
      setFailoverNotice('Server pemutar tidak merespons. Mencoba server berikutnya...');
      setCurrentServerIndex((index) => (index + 1) % ANIME_SERVERS.length);
      setIframeKey((key) => key + 1);
    }, 15000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [id, episodeNum, seasonNum, currentServerIndex, iframeKey, isPlayable, animeAudio]);

  const handleIframeLoad = () => {
    setIsIframeLoading(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleIframeError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsIframeLoading(false);
    setFailoverNotice('Server pemutar gagal dimuat. Mencoba server berikutnya...');
    setCurrentServerIndex((index) => (index + 1) % ANIME_SERVERS.length);
    setIframeKey((key) => key + 1);
  };

  // Switch to next fallback server
  const handleNextServer = () => {
    const nextIdx = (currentServerIndex + 1) % ANIME_SERVERS.length;
    setCurrentServerIndex(nextIdx);
    setFailoverNotice(`Beralih ke ${ANIME_SERVERS[nextIdx].name}...`);
    setTimeout(() => setFailoverNotice(null), 3000);
    setIsIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  // Retry loading current server
  const handleRetry = () => {
    setIsIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  // Build clean FrameX Embed URL (HTTPS only, URL and URLSearchParams, no double encoding, no_ads=1)
  const buildEmbedUrl = (): string => {
    if (!isPlayable) return '';

    const cleanId = String(id).trim();
    const validEp = Math.max(1, episodeNum);
    const validSeason = Math.max(1, seasonNum);
    const activeServer = ANIME_SERVERS[currentServerIndex] || ANIME_SERVERS[0];

    // Determine sub/dub provider variant
    let targetProvider = activeServer.provider || 'grand_warden';
    if (animeAudio === 'dub') {
      if (targetProvider === 'grand_warden') targetProvider = 'grand_warden_dub';
      else if (targetProvider === 'wizard') targetProvider = 'wizard_dub';
      else if (targetProvider === 'valkyrie') targetProvider = 'valkyrie_dub';
      else if (targetProvider === 'goblin') targetProvider = 'goblin_dub';
    }

    if (mediaType === 'anime') {
      // Official FrameX Anime Embed
      // Path: /embed/anime/:id/:episode with full query params: ?id=&episode=&season=&type=anime&sub_type=&provider=&autoplay=1&muted=0&no_ads=1
      // Both path and query params provided for maximum compatibility across FrameX player versions
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
      // CRITICAL: no_ads=1 prevents FrameX from injecting the rogue popup ad script (im.frshery.com)
      url.searchParams.set('no_ads', '1');
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    if (mediaType === 'tv') {
      const baseUrl = `https://framextv.xyz/embed/tv/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validSeason))}/${encodeURIComponent(String(validEp))}`;
      const url = new URL(baseUrl);
      url.searchParams.set('id', cleanId);
      url.searchParams.set('season', String(validSeason));
      url.searchParams.set('episode', String(validEp));
      url.searchParams.set('type', 'tv');
      url.searchParams.set('autoplay', '1');
      url.searchParams.set('muted', '0');
      url.searchParams.set('no_ads', '1'); // CRITICAL: disables popup ads on TV series
      if (activeServer.provider) {
        url.searchParams.set('provider', activeServer.provider);
      }
      if (title?.title) {
        url.searchParams.set('title', title.title.trim());
      }
      return url.toString();
    }

    // movie
    const baseUrl = `https://framextv.xyz/embed/movie/${encodeURIComponent(cleanId)}`;
    const url = new URL(baseUrl);
    url.searchParams.set('id', cleanId);
    url.searchParams.set('type', 'movie');
    url.searchParams.set('autoplay', '1');
    url.searchParams.set('muted', '0');
    url.searchParams.set('no_ads', '1'); // CRITICAL: disables popup ads on Movies
    if (activeServer.provider) {
      url.searchParams.set('provider', activeServer.provider);
    }
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
                <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-white/80 font-medium truncate">
                  <span>{mediaType === 'anime' ? 'FrameX Anime Stream' : `Musim ${seasonNum}`}</span>
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
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1 ${
                  animeAudio === 'sub'
                    ? 'bg-white/20 border-white/40 text-white'
                    : 'bg-white/10 border-white/20 text-white/70'
                }`}
                title="Pilih Audio: Sub (Jepang) atau Dub (Inggris)"
              >
                <Volume2 className="w-3 h-3 text-white" />
                <span>{animeAudio === 'sub' ? 'SUB' : 'DUB'}</span>
              </button>
            )}

            {/* Dedicated "Ganti Server" Button (Requirement 3) */}
            <button
              onClick={handleNextServer}
              className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1.5 bg-[#FFB224]/20 hover:bg-[#FFB224]/30 border-[#FFB224]/50 text-[#FFB224] shrink-0"
              title="Ganti ke Server Cadangan Berikutnya"
            >
              <Server className="w-3 h-3" />
              <span>Ganti Server</span>
            </button>

            {/* Server Selector Dropdown */}
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full liquid-glass text-xs text-white">
              <select
                value={currentServerIndex}
                onChange={(e) => {
                  const idx = parseInt(e.target.value, 10);
                  setCurrentServerIndex(idx);
                  setIsIframeLoading(true);
                  setIframeKey((k) => k + 1);
                }}
                aria-label="Pilih server stream"
                className="bg-transparent text-[10px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[170px] truncate"
              >
                {ANIME_SERVERS.map((s, idx) => (
                  <option key={s.id} value={idx} className="bg-[#12141F] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

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
      <div className="relative flex-1 w-full h-screen bg-black flex items-center justify-center overflow-hidden">
        {/* Failover Toast Notice */}
        {failoverNotice && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full liquid-glass border border-amber-500/40 text-amber-300 text-[11px] sm:text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{failoverNotice}</span>
          </div>
        )}

        {/* Loading Overlay (Non-blocking backdrop spinner) */}
        {isIframeLoading && isPlayable && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070B]/80 backdrop-blur-sm space-y-3 pointer-events-none px-4 text-center">
            <div className="w-11 h-11 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/80 tracking-wider uppercase">
              Menghubungkan ke {ANIME_SERVERS[currentServerIndex].name}...
            </span>
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
                className="px-5 py-2.5 rounded-full bg-[#FFB224] text-black text-xs font-bold hover:bg-[#FFA500] cursor-pointer shadow-lg ios-spring"
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

        {/*
          Official FrameX Persistent Embed Iframe:
          - loading="eager" for immediate player boot
          - allowFullScreen and allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          - referrerPolicy="origin" for secure provider authentication
          - Stays persistently mounted so video decoding is never killed prematurely
        */}
        {isPlayable && (
          <iframe
            key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${currentServerIndex}-${iframeKey}-${animeAudio}`}
            src={embedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="origin"
            loading="eager"
            title={title?.title || 'Zhafx Stream Player'}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-0 absolute inset-0 z-10"
          />
        )}
      </div>
    </div>
  );
};
