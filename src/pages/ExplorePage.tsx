import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Title, MediaType } from '../types';
import { MediaCard } from '../components/MediaCard';
import { MediaCardSkeleton } from '../components/Skeleton';
import { CONFIG } from '../config';
import { Filter, RotateCcw, AlertTriangle, ChevronDown, Compass } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const { type: typeParam } = useParams<{ type?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Validate type
  const mediaType: MediaType =
    typeParam === 'tv' || typeParam === 'anime' || typeParam === 'movie'
      ? typeParam
      : 'movie';

  // Extract query filters
  const genre = searchParams.get('genre') || 'all';
  const year = searchParams.get('year') || 'all';
  const sort = searchParams.get('sort') || 'popularity.desc';

  const [titles, setTitles] = useState<Title[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available genres catalogue
  const genresList =
    mediaType === 'anime'
      ? CONFIG.ANIME_GENRES
      : mediaType === 'tv'
      ? CONFIG.TV_GENRES
      : CONFIG.MOVIE_GENRES;

  // Years catalogue (1990 to 2026)
  const yearsList = ['all', ...Array.from({ length: 30 }, (_, i) => String(2026 - i))];

  // Title page heading
  const pageTitle =
    mediaType === 'anime'
      ? 'Jelajahi Anime'
      : mediaType === 'tv'
      ? 'Jelajahi Serial TV'
      : 'Jelajahi Film';

  const loadData = useCallback(
    async (currentPage = 1, append = false, signal?: AbortSignal) => {
      if (currentPage === 1) setIsLoading(true);
      else setIsLoadingMore(true);
      setError(null);

      try {
        const yearNum = year !== 'all' ? parseInt(year, 10) : undefined;
        let res: { titles: Title[]; page: number; totalPages: number };

        if (mediaType === 'anime') {
          res = await api.discoverAnime(
            {
              genre: genre !== 'all' ? genre : undefined,
              year: yearNum,
              sort,
              page: currentPage,
            },
            signal
          );
        } else {
          res = await api.discover(
            mediaType,
            {
              genre: genre !== 'all' ? genre : undefined,
              year: yearNum,
              sort,
              page: currentPage,
            },
            signal
          );
        }

        if (append) {
          setTitles((prev) => [...prev, ...res.titles]);
        } else {
          setTitles(res.titles);
        }
        setTotalPages(res.totalPages);
        setPage(currentPage);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Gagal memuat katalog.');
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [mediaType, genre, year, sort]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadData(1, false, controller.signal);
    return () => controller.abort();
  }, [loadData]);

  const updateFilter = (key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === 'all' || value === '') {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }
    setSearchParams(nextParams);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      loadData(page + 1, true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2A3152]/70 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFB224] mb-1">
            <Compass className="w-4 h-4" />
            <span>Katalog Eksplorasi</span>
          </div>
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-2xl sm:text-3xl font-bold text-[#F2F4FB] tracking-tight"
          >
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#98A2C3] mt-1">
            Temukan ribuan judul lengkap dengan filter genre, tahun rilis, dan urutan popularitas.
          </p>
        </div>

        {/* Media type switcher pills */}
        <div className="inline-flex p-1 rounded-xl bg-[#12162A] border border-[#2A3152] shrink-0">
          <button
            onClick={() => {
              setSearchParams(new URLSearchParams());
              window.location.hash = '#/explore/movie';
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mediaType === 'movie'
                ? 'bg-[#FFB224] text-[#0A0C14] font-semibold shadow'
                : 'text-[#98A2C3] hover:text-[#F2F4FB]'
            }`}
          >
            Film
          </button>
          <button
            onClick={() => {
              setSearchParams(new URLSearchParams());
              window.location.hash = '#/explore/tv';
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mediaType === 'tv'
                ? 'bg-[#FFB224] text-[#0A0C14] font-semibold shadow'
                : 'text-[#98A2C3] hover:text-[#F2F4FB]'
            }`}
          >
            Serial TV
          </button>
          <button
            onClick={() => {
              setSearchParams(new URLSearchParams());
              window.location.hash = '#/explore/anime';
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mediaType === 'anime'
                ? 'bg-[#FFB224] text-[#0A0C14] font-semibold shadow'
                : 'text-[#98A2C3] hover:text-[#F2F4FB]'
            }`}
          >
            Anime
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-2xl bg-[#12162A] border border-[#2A3152]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F2F4FB] mr-2">
          <Filter className="w-3.5 h-3.5 text-[#FFB224]" />
          <span>Filter:</span>
        </div>

        {/* Genre Selector */}
        <div className="relative">
          <select
            value={genre}
            onChange={(e) => updateFilter('genre', e.target.value)}
            className="appearance-none px-3.5 py-2 pr-8 rounded-xl bg-[#0A0C14] border border-[#2A3152] text-xs text-[#F2F4FB] font-medium focus:outline-none focus:border-[#FFB224] cursor-pointer"
          >
            {genresList.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#12162A] text-white">
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#98A2C3] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Year Selector */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => updateFilter('year', e.target.value)}
            className="appearance-none px-3.5 py-2 pr-8 rounded-xl bg-[#0A0C14] border border-[#2A3152] text-xs text-[#F2F4FB] font-medium focus:outline-none focus:border-[#FFB224] cursor-pointer"
          >
            {yearsList.map((y) => (
              <option key={y} value={y} className="bg-[#12162A] text-white">
                {y === 'all' ? 'Semua Tahun' : y}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#98A2C3] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort Selector */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="appearance-none px-3.5 py-2 pr-8 rounded-xl bg-[#0A0C14] border border-[#2A3152] text-xs text-[#F2F4FB] font-medium focus:outline-none focus:border-[#FFB224] cursor-pointer"
          >
            {CONFIG.SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#12162A] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#98A2C3] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Filter Button */}
        {(genre !== 'all' || year !== 'all' || sort !== 'popularity.desc') && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A2038] hover:bg-[#2A3152] text-xs text-[#98A2C3] hover:text-[#F2F4FB] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset filter
          </button>
        )}
      </div>

      {/* Content States */}
      {/* 1. Loading State */}
      {isLoading && (
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 pt-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <MediaCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 2. Error State */}
      {error && !isLoading && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/30 text-[#FF5C6C] flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#F2F4FB] mb-1">Gagal Memuat Katalog</h2>
          <p className="text-xs text-[#98A2C3] max-w-sm mb-4 leading-relaxed">{error}</p>
          <button
            onClick={() => loadData(1, false)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Coba lagi
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {!isLoading && !error && titles.length === 0 && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#12162A] border border-[#2A3152] flex items-center justify-center text-[#98A2C3]">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#F2F4FB]">Tidak Ada Tayangan yang Sesuai</h3>
          <p className="text-xs text-[#98A2C3] max-w-sm leading-relaxed">
            Tidak ditemukan tayangan dengan kombinasi filter yang Anda pilih. Coba sesuaikan genre atau tahun rilis.
          </p>
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="px-4 py-2 rounded-xl bg-[#1A2038] hover:bg-[#2A3152] text-[#F2F4FB] text-xs font-semibold border border-[#2A3152] transition-colors cursor-pointer"
          >
            Hapus semua filter
          </button>
        </div>
      )}

      {/* 4. Success State */}
      {!isLoading && !error && titles.length > 0 && (
        <div className="space-y-8 pt-2">
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {titles.map((item, index) => (
              <MediaCard key={`${item.id}-${index}`} item={item} />
            ))}
          </div>

          {/* Load More Button */}
          {page < totalPages && (
            <div className="flex justify-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] hover:border-[#FFB224]/50 text-sm font-semibold text-[#F2F4FB] hover:text-[#FFB224] transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#FFB224] border-t-transparent rounded-full animate-spin" />
                    <span>Memuat halaman berikutnya...</span>
                  </>
                ) : (
                  <span>Muat lebih banyak</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
