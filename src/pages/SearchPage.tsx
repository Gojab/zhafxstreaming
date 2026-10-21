import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  X,
  History,
  Film,
  Tv,
  Sparkles,
  AlertCircle,
  Filter,
  RotateCcw,
  ChevronDown,
  Clapperboard,
} from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../services/api';
import { Title, MediaType } from '../types';
import { MediaCard } from '../components/MediaCard';
import { MediaCardSkeleton } from '../components/Skeleton';
import { storage } from '../lib/storage';
import { CONFIG } from '../config';
import {
  findTypoSuggestion,
  matchesGenre,
  matchesYear,
  getStandardizedStatus,
  AIRING_STATUS_OPTIONS,
  AiringStatusKey,
  SMART_SORT_OPTIONS,
  SortKey,
  sortSearchResults,
} from '../lib/searchUtils';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search and filter parameters from URL
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as MediaType | 'all') || 'all';
  const initialGenre = searchParams.get('genre') || 'all';
  const initialYear = searchParams.get('year') || 'all';
  const initialStatus = (searchParams.get('status') as AiringStatusKey) || 'all';
  const initialSort = (searchParams.get('sort') as SortKey) || 'relevance';

  const [input, setInput] = useState(initialQuery);
  const debouncedQuery = useDebounce(input, 300);

  const [mediaType, setMediaType] = useState<MediaType | 'all'>(initialType);
  const [genre, setGenre] = useState<string>(initialGenre);
  const [year, setYear] = useState<string>(initialYear);
  const [status, setStatus] = useState<AiringStatusKey>(initialStatus);
  const [sort, setSort] = useState<SortKey>(initialSort);

  const [rawResults, setRawResults] = useState<Title[]>([]);
  const [apiDidYouMean, setApiDidYouMean] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => storage.getSearchHistory());

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount and "/" keyboard shortcut
  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize state back into URL query parameters
  useEffect(() => {
    const nextParams = new URLSearchParams();
    const cleanQ = debouncedQuery.trim();
    if (cleanQ) nextParams.set('q', cleanQ);
    if (mediaType !== 'all') nextParams.set('type', mediaType);
    if (genre !== 'all') nextParams.set('genre', genre);
    if (year !== 'all') nextParams.set('year', year);
    if (status !== 'all') nextParams.set('status', status);
    if (sort !== 'relevance') nextParams.set('sort', sort);

    setSearchParams(nextParams, { replace: true });
  }, [debouncedQuery, mediaType, genre, year, status, sort, setSearchParams]);

  // Execute Real-Time Search across movies, tv, and anime
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setRawResults([]);
      setApiDidYouMean(undefined);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api
      .search(trimmed, 1, controller.signal, mediaType === 'all' ? undefined : mediaType)
      .then((res) => {
        const seen = new Set<string>();
        const unique = res.titles.filter((t) => {
          const key = `${t.type}-${t.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setRawResults(unique);
        setApiDidYouMean(res.didYouMean);

        // Record successful non-empty search query into history
        if (unique.length > 0) {
          storage.addSearchHistory(trimmed);
          setSearchHistory(storage.getSearchHistory());
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Gagal mencari tayangan.');
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, mediaType]);

  // Typo tolerance suggestion resolution
  const typoSuggestion = useMemo(() => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Check API response first
    if (apiDidYouMean && apiDidYouMean.toLowerCase() !== trimmed.toLowerCase()) {
      return apiDidYouMean;
    }

    // Check client-side dictionary of top titles
    const clientMatch = findTypoSuggestion(trimmed);
    if (clientMatch && clientMatch.suggestedTitle.toLowerCase() !== trimmed.toLowerCase()) {
      return clientMatch.suggestedTitle;
    }

    return null;
  }, [input, apiDidYouMean]);

  // Unified available genres catalogue
  const availableGenres = useMemo(() => {
    return [
      { id: 'all', label: 'Semua Genre' },
      { id: '28', label: 'Aksi' },
      { id: '12', label: 'Petualangan' },
      { id: '16', label: 'Animasi' },
      { id: '35', label: 'Komedi' },
      { id: '80', label: 'Kriminal' },
      { id: '99', label: 'Dokumenter' },
      { id: '18', label: 'Drama' },
      { id: '10751', label: 'Keluarga' },
      { id: '14', label: 'Fantasi' },
      { id: '27', label: 'Horor' },
      { id: '9648', label: 'Misteri' },
      { id: '10749', label: 'Romantis' },
      { id: '878', label: 'Fiksi Ilmiah' },
      { id: '53', label: 'Cerita Seru (Thriller)' },
      { id: 'supernatural', label: 'Supernatural' },
    ];
  }, []);

  // Years catalogue
  const availableYears = useMemo(() => {
    const list = [
      { id: 'all', label: 'Semua Tahun' },
      { id: '2026', label: '2026' },
      { id: '2025', label: '2025' },
      { id: '2024', label: '2024' },
      { id: '2023', label: '2023' },
      { id: '2022', label: '2022' },
      { id: '2021', label: '2021' },
      { id: '2020', label: '2020' },
      { id: '2019', label: '2019' },
      { id: '2018', label: '2018' },
      { id: '2010s', label: 'Tahun 2010-an' },
      { id: '2000s', label: 'Tahun 2000-an' },
      { id: 'classic', label: 'Klasik (< 2000)' },
    ];
    return list;
  }, []);

  // Filter and Sort results in real-time
  const processedResults = useMemo(() => {
    let list = rawResults;

    // 1. Media Type Filter
    if (mediaType !== 'all') {
      list = list.filter((item) => item.type === mediaType);
    }

    // 2. Genre Filter
    if (genre !== 'all') {
      list = list.filter((item) => matchesGenre(item, genre));
    }

    // 3. Year Filter
    if (year !== 'all') {
      list = list.filter((item) => matchesYear(item, year));
    }

    // 4. Status Filter (Sedang Tayang, Selesai, Segera Tayang)
    if (status !== 'all') {
      list = list.filter((item) => getStandardizedStatus(item) === status);
    }

    // 5. Result Sorting (Relevance, Rating, Popularity, Year, A-Z)
    return sortSearchResults(list, sort, debouncedQuery);
  }, [rawResults, mediaType, genre, year, status, sort, debouncedQuery]);

  // Group filtered results by media type
  const movies = useMemo(() => processedResults.filter((r) => r.type === 'movie'), [processedResults]);
  const tvShows = useMemo(() => processedResults.filter((r) => r.type === 'tv'), [processedResults]);
  const animes = useMemo(() => processedResults.filter((r) => r.type === 'anime'), [processedResults]);

  const hasActiveFilters =
    mediaType !== 'all' ||
    genre !== 'all' ||
    year !== 'all' ||
    status !== 'all' ||
    sort !== 'relevance';

  const resetFilters = () => {
    setMediaType('all');
    setGenre('all');
    setYear('all');
    setStatus('all');
    setSort('relevance');
  };

  const handleSelectHistory = (term: string) => {
    setInput(term);
    inputRef.current?.focus();
  };

  const handleRemoveHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.removeSearchHistory(term);
    setSearchHistory(storage.getSearchHistory());
  };

  const handleClearHistory = () => {
    storage.clearSearchHistory();
    setSearchHistory([]);
  };

  const applyTypoCorrection = (corrected: string) => {
    setInput(corrected);
    inputRef.current?.focus();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-16 space-y-6 sm:space-y-8 min-h-[75vh]">
      {/* Apple iOS 26 Liquid Glass Search Input Bar */}
      <div className="max-w-2xl mx-auto space-y-3.5">
        <div className="relative">
          <div className="w-full h-14 rounded-full liquid-glass-dense liquid-specular flex items-center px-4 sm:px-5 border border-white/20 shadow-2xl focus-within:border-white/40 focus-within:bg-white/[0.12] transition-all">
            <Search className="w-5 h-5 text-[#FFB224] shrink-0 mr-3" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Cari film, serial TV, anime, atau aktor... (tekan /)"
              className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/40 focus:outline-none"
            />
            {input && (
              <button
                onClick={() => {
                  setInput('');
                  inputRef.current?.focus();
                }}
                aria-label="Hapus kata kunci pencarian"
                className="w-7 h-7 rounded-full liquid-glass flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 cursor-pointer ios-spring shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Typo Correction Pill ("Maksud Anda: ...?") */}
        {typoSuggestion && input.trim() && (
          <div className="flex items-center gap-2 px-1 pt-0.5 animate-in fade-in duration-200">
            <button
              onClick={() => applyTypoCorrection(typoSuggestion)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs text-amber-200 font-medium transition-all cursor-pointer ios-spring shadow-sm group"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FFB224] group-hover:scale-115 transition-transform" />
              <span>
                Maksud Anda: <span className="font-bold underline decoration-amber-400/60 underline-offset-2">{typoSuggestion}</span>?
              </span>
            </button>
          </div>
        )}

        {/* Search History Glass Pills */}
        {!input && searchHistory.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between text-xs text-white/50 px-1">
              <span className="flex items-center gap-1.5 font-medium">
                <History className="w-3.5 h-3.5 text-[#FFB224]" />
                Pencarian Terakhir
              </span>
              <button
                onClick={handleClearHistory}
                className="hover:text-red-400 transition-colors cursor-pointer"
              >
                Hapus semua
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectHistory(item)}
                  className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass liquid-specular text-xs text-white/80 hover:text-white hover:bg-white/[0.14] transition-all cursor-pointer ios-spring"
                >
                  <span>{item}</span>
                  <span
                    onClick={(e) => handleRemoveHistory(item, e)}
                    className="p-0.5 text-white/40 hover:text-red-400 rounded-full group-hover:opacity-100 opacity-60 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Apple Liquid Glass Smart Search Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 sm:p-3.5 rounded-[22px] sm:rounded-full liquid-glass liquid-specular border border-white/15 shadow-xl">
        {/* Media Type Segmented Pills */}
        <div className="inline-flex p-0.5 rounded-full bg-white/[0.06] border border-white/10 shrink-0">
          <button
            onClick={() => setMediaType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'all'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setMediaType('movie')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'movie'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Film
          </button>
          <button
            onClick={() => setMediaType('tv')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'tv'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Serial TV
          </button>
          <button
            onClick={() => setMediaType('anime')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              mediaType === 'anime'
                ? 'bg-white text-[#06070B] shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            Anime
          </button>
        </div>

        {/* Genre Selector Pill */}
        <div className="relative">
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            aria-label="Pilih genre tayangan"
            className="appearance-none px-3.5 py-1.5 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {availableGenres.map((g) => (
              <option key={g.id} value={g.id} className="bg-[#12141F] text-white">
                {g.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Year Selector Pill */}
        <div className="relative">
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Pilih tahun rilis"
            className="appearance-none px-3.5 py-1.5 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {availableYears.map((y) => (
              <option key={y.id} value={y.id} className="bg-[#12141F] text-white">
                {y.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Airing Status Selector Pill */}
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AiringStatusKey)}
            aria-label="Pilih status tayang"
            className="appearance-none px-3.5 py-1.5 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {AIRING_STATUS_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key} className="bg-[#12141F] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Sort Selector Pill */}
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Urutkan hasil pencarian"
            className="appearance-none px-3.5 py-1.5 pr-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-xs text-white font-medium focus:outline-none focus:border-white/35 cursor-pointer ios-spring shadow-inner"
          >
            {SMART_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#12141F] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-white/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Filter Button */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            aria-label="Atur ulang filter"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs text-red-300 font-medium transition-all cursor-pointer ios-spring ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Results Content States */}
      {/* 1. Loading State */}
      {isLoading && (
        <div className="space-y-6 pt-4">
          <div className="h-5 w-48 rounded-full bg-white/[0.08] animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <MediaCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* 2. Error State */}
      {error && !isLoading && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full liquid-glass liquid-specular text-[#FFB224] flex items-center justify-center mb-3 shadow-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">Gagal Menjalankan Pencarian</h3>
          <p className="text-xs text-white/60 max-w-sm mb-4 leading-relaxed">{error}</p>
          <button
            onClick={() => setInput(input)}
            className="px-6 py-2.5 rounded-full bg-white text-[#06070B] font-bold text-xs cursor-pointer shadow-lg ios-spring"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 3. Empty State (No Upstream Results Found) */}
      {!isLoading && !error && debouncedQuery.trim() && rawResults.length === 0 && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/60 shadow-xl">
            <Search className="w-7 h-7 text-[#FFB224]" />
          </div>
          <h3 className="text-base font-bold text-white">
            Tidak Ditemukan Hasil untuk "{debouncedQuery}"
          </h3>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Periksa ejaan kata kunci, coba nama judul alternatif dalam Bahasa Inggris/Indonesia/Jepang, atau periksa filter Anda.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.1] hover:bg-white/[0.18] border border-white/20 text-xs text-white font-medium cursor-pointer ios-spring"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Atur Ulang Filter</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Filter Empty State (Upstream results exist, but none match current filter criteria) */}
      {!isLoading && !error && rawResults.length > 0 && processedResults.length === 0 && (
        <div className="min-h-[35vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/60 shadow-xl">
            <Filter className="w-6 h-6 text-[#FFB224]" />
          </div>
          <h3 className="text-base font-bold text-white">
            Tidak Ada Tayangan yang Cocok dengan Filter
          </h3>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Ditemukan {rawResults.length} hasil untuk "{debouncedQuery}", namun tidak ada yang memenuhi kombinasi filter saat ini.
          </p>
          <button
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-[#06070B] font-bold text-xs cursor-pointer shadow-lg ios-spring"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Semua Hasil ({rawResults.length})</span>
          </button>
        </div>
      )}

      {/* 5. Success State */}
      {!isLoading && !error && processedResults.length > 0 && (
        <div className="space-y-10 pt-2">
          {/* Summary line */}
          <div className="flex items-center justify-between text-xs text-white/60 px-1 border-b border-white/[0.08] pb-2">
            <span>
              Menampilkan <span className="font-semibold text-white">{processedResults.length}</span> tayangan
              {hasActiveFilters && <span> (difilter dari {rawResults.length})</span>}
            </span>
          </div>

          {/* Grouped by category when mediaType is 'all' */}
          {mediaType === 'all' ? (
            <>
              {/* Movies Section */}
              {movies.length > 0 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-2.5 flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                      <Film className="w-4 h-4 text-[#FFB224]" />
                      <span>Film ({movies.length})</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {movies.map((item) => (
                      <MediaCard key={`movie-${item.id}`} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* TV Shows Section */}
              {tvShows.length > 0 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-2.5 flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                      <Tv className="w-4 h-4 text-[#FFB224]" />
                      <span>Serial TV ({tvShows.length})</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {tvShows.map((item) => (
                      <MediaCard key={`tv-${item.id}`} item={item} />
                    ))}
                  </div>
                </div>
              )}

              {/* Anime Section */}
              {animes.length > 0 && (
                <div className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-2.5 flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                      <Clapperboard className="w-4 h-4 text-[#FFB224]" />
                      <span>Anime ({animes.length})</span>
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                    {animes.map((item) => (
                      <MediaCard key={`anime-${item.id}`} item={item} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Single Category Grid when filtered to Movie, TV, or Anime */
            <div className="space-y-4">
              <div className="border-b border-white/[0.08] pb-2.5 flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  {mediaType === 'movie' ? (
                    <Film className="w-4 h-4 text-[#FFB224]" />
                  ) : mediaType === 'tv' ? (
                    <Tv className="w-4 h-4 text-[#FFB224]" />
                  ) : (
                    <Clapperboard className="w-4 h-4 text-[#FFB224]" />
                  )}
                  <span>
                    {mediaType === 'movie'
                      ? 'Film'
                      : mediaType === 'tv'
                      ? 'Serial TV'
                      : 'Anime'}{' '}
                    ({processedResults.length})
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {processedResults.map((item) => (
                  <MediaCard key={`${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
