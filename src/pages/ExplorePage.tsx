import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Title, MediaType } from '../types';
import { MediaCard } from '../components/MediaCard';
import { MediaCardSkeleton } from '../components/Skeleton';
import { SEOHead } from '../components/SEOHead';
import { CONFIG } from '../config';
import {
  IoFilterOutline as Filter,
  IoReloadOutline as RotateCcw,
  IoWarningOutline as AlertTriangle,
  IoChevronDownOutline as ChevronDown,
  IoCompassOutline as Compass,
} from 'react-icons/io5';

export const ExplorePage: React.FC = () => {
  const { type: typeParam } = useParams<{ type?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
          setTitles((prev) => {
            const seen = new Set(prev.map((t) => `${t.type}-${t.id}`));
            const uniqueNew = res.titles.filter((t) => !seen.has(`${t.type}-${t.id}`));
            return [...prev, ...uniqueNew];
          });
        } else {
          const seen = new Set<string>();
          const unique = res.titles.filter((t) => {
            const key = `${t.type}-${t.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setTitles(unique);
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

  const canonicalPath = typeParam ? `/explore/${typeParam}` : '/explore';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-16 space-y-7">
      <SEOHead
        title={pageTitle}
        canonicalPath={canonicalPath}
        description={`Katalog lengkap ${pageTitle.toLowerCase()} di Zhafx. Tonton film, serial TV, dan anime favorit dengan filter kategori, tahun, dan rekomendasi AI.`}
      />

      {/* Page Header with Apple iOS 26 Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/70">
            <span>Katalog Eksplorasi</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-[-0.03em]">
            {pageTitle}
          </h1>
          <p className="text-xs sm:text-sm text-white/55 max-w-xl leading-relaxed">
            Temukan ribuan judul film, serial, dan anime lengkap dengan filter kategori, tahun rilis, dan urutan popularitas.
          </p>
        </div>

        {/* Media Type Switcher: Apple iOS Floating Glass Segmented Pill */}
        <div className="inline-flex p-1 rounded-full liquid-glass liquid-specular shadow-lg shrink-0 self-start sm:self-auto">
          <button
            onClick={() => {
              navigate('/explore/movie');
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'movie'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Film
          </button>
          <button
            onClick={() => {
              navigate('/explore/tv');
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'tv'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Serial TV
          </button>
          <button
            onClick={() => {
              navigate('/explore/anime');
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'anime'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Anime
          </button>
        </div>
      </div>

      {/* Floating Apple Liquid Glass Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-[24px] sm:rounded-full liquid-glass liquid-specular shadow-xl">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-white/80 px-2 sm:px-3">
          <Filter className="w-3.5 h-3.5 text-white" />
          <span>Filter</span>
        </div>

        {/* Genre Selector Glass Pill */}
        <div className="relative">
          <select
            value={genre}
            onChange={(e) => updateFilter('genre', e.target.value)}
            aria-label="Pilih genre tayangan"
            className="appearance-none px-4 py-2 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {genresList.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#12141F] text-white">
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Year Selector Glass Pill */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => updateFilter('year', e.target.value)}
            aria-label="Pilih tahun rilis"
            className="appearance-none px-4 py-2 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {yearsList.map((y) => (
              <option key={y} value={y} className="bg-[#12141F] text-white">
                {y === 'all' ? 'Semua Tahun' : y}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort Selector Glass Pill */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            aria-label="Urutkan berdasarkan"
            className="appearance-none px-4 py-2 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {CONFIG.SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#12141F] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Filter Glass Pill */}
        {(genre !== 'all' || year !== 'all' || sort !== 'popularity.desc') && (
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs text-white/70 hover:text-white transition-all cursor-pointer ios-spring"
          >
            <RotateCcw className="w-3 h-3 text-white" />
            <span>Reset</span>
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
          <div className="w-14 h-14 rounded-full liquid-glass liquid-specular text-white flex items-center justify-center mb-3 shadow-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white mb-1">Gagal Memuat Katalog</h2>
          <p className="text-xs text-white/60 max-w-sm mb-4 leading-relaxed">{error}</p>
          <button
            onClick={() => loadData(1, false)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#06070B] font-bold text-xs shadow-lg transition-all cursor-pointer ios-spring"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Coba lagi
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {!isLoading && !error && titles.length === 0 && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white shadow-xl">
            <Compass className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-base font-bold text-white">Tidak Ada Tayangan yang Sesuai</h3>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Tidak ditemukan tayangan dengan kombinasi filter yang Anda pilih. Coba sesuaikan genre atau tahun rilis.
          </p>
          <button
            onClick={() => setSearchParams(new URLSearchParams())}
            className="px-5 py-2.5 rounded-full liquid-glass liquid-specular text-white text-xs font-semibold hover:bg-white/[0.14] transition-all cursor-pointer ios-spring"
          >
            Hapus semua filter
          </button>
        </div>
      )}

      {/* 4. Success State (Full-bleed 20px MediaCards) */}
      {!isLoading && !error && titles.length > 0 && (
        <div className="space-y-8 pt-2">
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {titles.map((item, index) => (
              <MediaCard key={`${item.id}-${index}`} item={item} />
            ))}
          </div>

          {/* Load More Button - Apple Liquid Glass Pill */}
          {page < totalPages && (
            <div className="flex justify-center pt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full liquid-glass liquid-specular text-sm font-semibold text-white hover:bg-white/[0.16] shadow-2xl transition-all cursor-pointer disabled:opacity-50 min-h-[46px] ios-spring"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
