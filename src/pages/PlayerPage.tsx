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
} from 'lucide-react';
import { api } from '../services/api';
import { Title, Provider, MediaType } from '../types';
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
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setIsIframeLoading(true);
    setLoadTimeout(false);
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [id, mediaType, seasonNum, episodeNum, selectedServer, iframeKey]);

  // Track Fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Save history helper
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

  // Load details and providers
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
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.warn('[PlayerPage] Init fallback used:', err?.message || err);
        }
      }
    };

    fetchInitData();
    return () => controller.abort();
  }, [id, mediaType, seasonNum, episodeNum, recordHistory, searchParams]);

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

  const handleReload = () => {
    setIsIframeLoading(true);
    setIframeKey((k) => k + 1);
  };

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-sm text-white/50">ID tayangan tidak valid.</p>
      </div>
    );
  }

  // Construct embed URL
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
  });

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
    <div className="min-h-screen w-full bg-[#06070B] flex flex-col relative select-none overflow-hidden">
      {/* Sleek Top Navigation Header */}
      <header className="fixed top-2.5 sm:top-4 left-2.5 right-2.5 sm:left-6 sm:right-6 max-w-7xl mx-auto z-40 pointer-events-none">
        <div className="h-13 sm:h-15 px-3 sm:px-5 rounded-full liquid-glass-dense liquid-specular flex items-center justify-between gap-2.5 shadow-2xl pointer-events-auto border border-white/20">
          {/* Left: Back & Media Info */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
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
              <h1 className="text-xs sm:text-sm font-bold text-white truncate leading-tight">
                {title?.title || 'Memuat Pemutar...'}
              </h1>
              {(mediaType === 'tv' || mediaType === 'anime') && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#FFB224] font-medium truncate">
                  <span>{mediaType === 'anime' ? 'Anime' : `Musim ${seasonNum}`}</span>
                  <span>•</span>
                  <span>Episode {episodeNum}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls & Server Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Episode Quick Switcher for TV / Anime */}
            {(mediaType === 'tv' || mediaType === 'anime') && (
              <div className="flex items-center gap-1 bg-white/[0.06] border border-white/10 rounded-full p-0.5">
                <button
                  onClick={() => navigateEpisode(episodeNum - 1)}
                  disabled={!hasPrevEpisode}
                  title="Episode Sebelumnya"
                  aria-label="Episode Sebelumnya"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-25 disabled:pointer-events-none ios-spring cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsEpisodeDrawerOpen(!isEpisodeDrawerOpen)}
                  className="px-2.5 py-1 rounded-full bg-white/[0.12] hover:bg-white/[0.2] text-[11px] font-bold text-[#FFB224] flex items-center gap-1 cursor-pointer ios-spring"
                  title="Buka daftar episode"
                >
                  <ListOrdered className="w-3 h-3 text-[#FFB224]" />
                  <span>Ep {episodeNum}</span>
                </button>

                <button
                  onClick={() => navigateEpisode(episodeNum + 1)}
                  disabled={!hasNextEpisode}
                  title="Episode Berikutnya"
                  aria-label="Episode Berikutnya"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white disabled:opacity-25 disabled:pointer-events-none ios-spring cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Server Selector Dropdown */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full liquid-glass text-xs text-white">
              <Server className="w-3.5 h-3.5 text-[#FFB224] shrink-0" />
              <select
                value={selectedServer}
                onChange={(e) => {
                  setSelectedServer(e.target.value);
                  setIsIframeLoading(true);
                }}
                aria-label="Pilih server stream"
                className="bg-transparent text-[11px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[100px] sm:max-w-none truncate"
              >
                <option value="auto" className="bg-[#12141F] text-white">
                  {mediaType === 'anime' ? 'FrameX Otomatis (Rekomendasi)' : 'Server Otomatis'}
                </option>
                {providers.filter((p) => p.id !== 'auto').map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#12141F] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh / Reconnect Button */}
            <button
              onClick={handleReload}
              title="Muat ulang stream"
              aria-label="Muat ulang stream"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full liquid-glass hidden sm:flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Episode Selection Drawer Modal */}
      {isEpisodeDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setIsEpisodeDrawerOpen(false)}
          />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[32px] liquid-glass-dense liquid-specular p-5 sm:p-6 space-y-4 z-10 border border-white/20 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#FFB224]" />
                <h3 className="text-sm font-bold text-white">
                  Pilih Episode ({mediaType === 'anime' ? 'Anime' : `Musim ${seasonNum}`})
                </h3>
              </div>
              <button
                onClick={() => setIsEpisodeDrawerOpen(false)}
                className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white cursor-pointer ios-spring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1 max-h-[60vh] overflow-y-auto pr-1">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => {
                const isCurrent = ep === episodeNum;
                return (
                  <button
                    key={ep}
                    onClick={() => navigateEpisode(ep)}
                    className={`py-2.5 px-2 rounded-[16px] text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ios-spring ${
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
          </div>
        </div>
      )}

      {/* Edge-to-Edge Direct Video Viewport */}
      <div
        ref={playerContainerRef}
        className="relative flex-1 w-full h-screen bg-black flex items-center justify-center overflow-hidden"
      >
        {/* Loading Overlay */}
        {isIframeLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#06070B] space-y-3 pointer-events-none px-4 text-center">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/50 tracking-wider uppercase">
              Memuat Stream Pemutar Zhafx...
            </span>
            {loadTimeout && (
              <div className="pointer-events-auto pt-2 space-y-2 max-w-sm">
                <p className="text-xs text-white/60">
                  Stream membutuhkan waktu lebih lama. Coba beralih server di menu atas atau muat ulang pemutar.
                </p>
                <button
                  type="button"
                  onClick={handleReload}
                  className="px-4 py-1.5 rounded-full liquid-glass text-xs text-[#FFB224] font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Muat Ulang Stream
                </button>
              </div>
            )}
          </div>
        )}

        {/* Clean, Full-Viewport Video Stream Iframe (Strictly sandboxed without allow-popups so it never opens new tabs) */}
        <iframe
          ref={iframeRef}
          key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${selectedServer}-${iframeKey}`}
          src={embedUrl}
          title={title?.title || 'Zhafx Stream'}
          onLoad={() => setIsIframeLoading(false)}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-fullscreen allow-forms"
          loading="eager"
          className="w-full h-full border-0 absolute inset-0 pt-14 sm:pt-16"
        />
      </div>
    </div>
  );
};
