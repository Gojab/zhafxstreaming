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
  Sparkles,
  Volume2,
  Play,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';
import { Title, Provider, MediaType, Episode, StreamData } from '../types';
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

  // Direct streaming vs Embed player mode for anime
  const [animePlayerMode, setAnimePlayerMode] = useState<'direct' | 'embed'>('direct');
  const [directStream, setDirectStream] = useState<StreamData | null>(null);
  const [isLoadingDirect, setIsLoadingDirect] = useState(false);
  const [directStreamError, setDirectStreamError] = useState<string | null>(null);

  // Episodes list with thumbnails for series drawer
  const [drawerEpisodes, setDrawerEpisodes] = useState<Episode[]>([]);

  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'thumbnails' | 'grid'>('thumbnails');
  const [iframeKey, setIframeKey] = useState(0);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    setIsIframeLoading(true);
    setLoadTimeout(false);
    const timer = setTimeout(() => {
      setLoadTimeout(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, [id, mediaType, seasonNum, episodeNum, selectedServer, animeAudio, iframeKey]);

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

        // Fetch episode list with thumbnails for series drawer (TV series & Anime)
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
          console.warn('[PlayerPage] Init fallback used:', err?.message || err);
        }
      }
    };

    fetchInitData();
    return () => controller.abort();
  }, [id, mediaType, seasonNum, episodeNum, recordHistory, searchParams]);

  // Load Direct Anime Stream directly from FrameX API
  useEffect(() => {
    if (mediaType === 'anime' && id) {
      setIsLoadingDirect(true);
      setDirectStreamError(null);
      const controller = new AbortController();

      const targetProvider = selectedServer === 'auto' ? undefined : selectedServer;

      api.getAnimeStream({
        id,
        episode: episodeNum,
        provider: targetProvider,
        audio: animeAudio,
        signal: controller.signal,
      }).then((data) => {
        if (data && data.sources.length > 0) {
          setDirectStream(data);
          setDirectStreamError(null);
        } else {
          setDirectStreamError('Stream tidak ditemukan untuk server ini. Coba pilih server lain.');
        }
      }).catch((err) => {
        if (!controller.signal.aborted) {
          setDirectStreamError(err?.message || 'Gagal memuat stream anime.');
        }
      }).finally(() => {
        setIsLoadingDirect(false);
      });

      return () => controller.abort();
    }
  }, [id, mediaType, episodeNum, selectedServer, animeAudio, iframeKey]);

  // Attach HLS stream to video element
  useEffect(() => {
    if (mediaType !== 'anime' || !directStream?.sources?.[0]?.url || !videoRef.current) {
      return;
    }

    const video = videoRef.current;
    const streamUrl = directStream.sources[0].url;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsIframeLoading(false);
        setIsLoadingDirect(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari / iOS HLS
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsIframeLoading(false);
        setIsLoadingDirect(false);
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [mediaType, directStream, episodeNum]);

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

  // Construct embed URL for Movie / TV
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
      <header className="fixed top-2 sm:top-4 left-2 right-2 sm:left-4 sm:right-4 max-w-7xl mx-auto z-40 pointer-events-none">
        <div className="min-h-12 sm:min-h-14 px-2.5 sm:px-4 py-1.5 rounded-[20px] sm:rounded-full liquid-glass-dense liquid-specular flex items-center justify-between gap-1.5 sm:gap-3 shadow-2xl pointer-events-auto border border-white/20 flex-wrap sm:flex-nowrap">
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
                  <span>{mediaType === 'anime' ? 'Anime HD' : `Musim ${seasonNum}`}</span>
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

            {/* Anime Player Mode: Direct vs Embed */}
            {mediaType === 'anime' && (
              <button
                onClick={() => {
                  const nextMode = animePlayerMode === 'direct' ? 'embed' : 'direct';
                  setAnimePlayerMode(nextMode);
                  setIsIframeLoading(true);
                  setDirectStreamError(null);
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold border transition-all cursor-pointer ios-spring flex items-center gap-1 ${
                  animePlayerMode === 'direct'
                    ? 'bg-amber-500/20 border-amber-500/50 text-[#FFB224]'
                    : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                }`}
                title={animePlayerMode === 'direct' ? 'Beralih ke Pemutar Embed FrameX' : 'Beralih ke Pemutar Langsung HLS'}
              >
                <Play className="w-3 h-3" />
                <span>{animePlayerMode === 'direct' ? 'Direct' : 'Embed'}</span>
              </button>
            )}

            {/* Server Selector Dropdown */}
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full liquid-glass text-xs text-white">
              <Server className="w-3 h-3 text-[#FFB224] shrink-0" />
              <select
                value={selectedServer}
                onChange={(e) => {
                  setSelectedServer(e.target.value);
                  setIsIframeLoading(true);
                }}
                aria-label="Pilih server stream"
                className="bg-transparent text-[10px] sm:text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[85px] sm:max-w-[130px] truncate"
              >
                <option value="auto" className="bg-[#12141F] text-white">
                  Server Otomatis
                </option>
                {providers.filter((p) => p.id !== 'auto' && p.id !== 'direct_stream').map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#12141F] text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reload Button */}
            <button
              onClick={handleReload}
              title="Muat ulang stream"
              aria-label="Muat ulang stream"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              aria-label={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full liquid-glass hidden sm:flex items-center justify-center text-white/80 hover:text-white hover:bg-white/[0.18] transition-all cursor-pointer ios-spring"
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
                    Pilih Episode ({mediaType === 'anime' ? 'Anime' : `Musim ${seasonNum}`})
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

      {/* Main Viewport: Video Stream */}
      <div
        ref={playerContainerRef}
        className="relative flex-1 w-full h-screen bg-black flex items-center justify-center overflow-hidden"
      >
        {/* Loading Overlay */}
        {(isIframeLoading || isLoadingDirect) && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#06070B] space-y-3 pointer-events-none px-4 text-center">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[#FFB224] rounded-full animate-spin" />
            <span className="text-xs font-mono text-white/50 tracking-wider uppercase">
              {mediaType === 'anime' ? 'Memuat Stream Anime HD...' : 'Memuat Stream Pemutar Zhafx...'}
            </span>
            {loadTimeout && !isLoadingDirect && (
              <div className="pointer-events-auto pt-2 space-y-2 max-w-sm">
                <p className="text-xs text-white/60">
                  Stream membutuhkan waktu lebih lama. Coba beralih server di menu atas atau muat ulang.
                </p>
                <button
                  type="button"
                  onClick={handleReload}
                  className="px-4 py-1.5 rounded-full liquid-glass text-xs text-white font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Muat Ulang
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error State for Anime Direct Stream */}
        {mediaType === 'anime' && animePlayerMode === 'direct' && directStreamError && !isLoadingDirect && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#06070B] p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Gagal Memutar Stream Langsung</h3>
            <p className="text-xs text-white/60 max-w-sm">
              Server stream langsung tidak merespons. Anda dapat beralih ke Pemutar Embed FrameX untuk memutar video tanpa gangguan.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => {
                  setAnimePlayerMode('embed');
                  setDirectStreamError(null);
                  setIsIframeLoading(true);
                }}
                className="px-5 py-2 rounded-full bg-[#FFB224] text-black text-xs font-bold hover:bg-[#FFA500] cursor-pointer shadow-lg"
              >
                Beralih ke Pemutar Embed (Rekomendasi)
              </button>
              <button
                onClick={handleReload}
                className="px-4 py-2 rounded-full liquid-glass text-white text-xs font-semibold hover:bg-white/10 cursor-pointer"
              >
                Coba Lagi (Direct Stream)
              </button>
            </div>
          </div>
        )}

        {/* Player Section:
            If Anime + animePlayerMode === 'direct' AND directStream is available: Native HLS Player
            Otherwise: Official Embed Player (FrameX Iframe for Anime, Movies, and TV)
        */}
        {mediaType === 'anime' && animePlayerMode === 'direct' && directStream?.sources?.[0]?.url ? (
          <div className="w-full h-full pt-14 sm:pt-16 flex items-center justify-center bg-black relative">
            <video
              ref={videoRef}
              key={`${id}-${episodeNum}-${directStream?.sources?.[0]?.url}`}
              controls
              autoPlay
              playsInline
              crossOrigin="anonymous"
              onLoadedData={() => {
                setIsIframeLoading(false);
                setIsLoadingDirect(false);
              }}
              className="w-full h-full max-h-screen object-contain"
            >
              {directStream?.subtitles?.map((sub, i) => (
                <track
                  key={`${i}-${sub.url}`}
                  kind="subtitles"
                  src={sub.url}
                  srcLang={sub.lang || 'id'}
                  label={sub.label || 'Bahasa'}
                  default={sub.lang === 'in' || sub.lang === 'id' || i === 0}
                />
              ))}
              Browser Anda tidak mendukung pemutar video HTML5.
            </video>
          </div>
        ) : (
          /* Official FrameX Embed Player (For Movie, TV, and Anime in embed mode or fallback) */
          <iframe
            ref={iframeRef}
            key={`${id}-${mediaType}-${seasonNum}-${episodeNum}-${selectedServer}-${animeAudio}-${iframeKey}`}
            src={embedUrl}
            title={title?.title || 'Zhafx Stream'}
            onLoad={() => setIsIframeLoading(false)}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
            loading="eager"
            className="w-full h-full border-0 absolute inset-0 pt-14 sm:pt-16"
          />
        )}
      </div>
    </div>
  );
};
