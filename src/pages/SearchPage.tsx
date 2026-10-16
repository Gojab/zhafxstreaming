import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, X, History, Trash2, Film, Tv, Sparkles, AlertCircle } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../services/api';
import { Title } from '../types';
import { MediaCard } from '../components/MediaCard';
import { MediaCardSkeleton } from '../components/Skeleton';
import { storage } from '../lib/storage';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [input, setInput] = useState(initialQuery);
  const debouncedQuery = useDebounce(input, 400);

  const [results, setResults] = useState<Title[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => storage.getSearchHistory());

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount and "/" shortcut
  useEffect(() => {
    inputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update query params when typing
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setSearchParams({ q: debouncedQuery.trim() });
    } else {
      setSearchParams({});
    }
  }, [debouncedQuery, setSearchParams]);

  // Execute search
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api
      .search(trimmed, 1, controller.signal)
      .then((res) => {
        const seen = new Set<string>();
        const unique = res.titles.filter((t) => {
          const key = `${t.type}-${t.id}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setResults(unique);
        // Save to search history if there were results or valid term
        storage.addSearchHistory(trimmed);
        setSearchHistory(storage.getSearchHistory());
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
  }, [debouncedQuery]);

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

  // Group results by type
  const movies = results.filter((r) => r.type === 'movie');
  const tvShows = results.filter((r) => r.type === 'tv');
  const animes = results.filter((r) => r.type === 'anime');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-16 space-y-8 min-h-[75vh]">
      {/* Apple iOS 26 Liquid Glass Search Input Bar */}
      <div className="max-w-2xl mx-auto space-y-4">
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

        {/* Search History Glass Pills */}
        {!input && searchHistory.length > 0 && (
          <div className="space-y-2.5 pt-2">
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

      {/* Results Content States */}
      {/* 1. Loading State */}
      {isLoading && (
        <div className="space-y-6 pt-4">
          <div className="h-5 w-48 rounded-full bg-white/[0.08] animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

      {/* 3. Empty State (No Results Found) */}
      {!isLoading && !error && debouncedQuery.trim() && results.length === 0 && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/60 shadow-xl">
            <Search className="w-7 h-7 text-[#FFB224]" />
          </div>
          <h3 className="text-base font-bold text-white">
            Tidak Ditemukan Hasil untuk "{debouncedQuery}"
          </h3>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Periksa ejaan kata kunci, coba nama judul dalam Bahasa Inggris/Indonesia, atau gunakan asisten AI kami.
          </p>
        </div>
      )}

      {/* 4. Success State (Grouped Results with 20px Cards) */}
      {!isLoading && !error && results.length > 0 && (
        <div className="space-y-10 pt-2">
          {/* Movies Section */}
          {movies.length > 0 && (
            <div className="space-y-4">
              <div className="border-b border-white/[0.08] pb-2.5">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Film ({movies.length})
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
              <div className="border-b border-white/[0.08] pb-2.5">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Serial TV ({tvShows.length})
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
              <div className="border-b border-white/[0.08] pb-2.5">
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Anime ({animes.length})
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                {animes.map((item) => (
                  <MediaCard key={`anime-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
