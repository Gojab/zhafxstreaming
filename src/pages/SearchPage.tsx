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
        setResults(res.titles);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8 min-h-[75vh]">
      {/* Search Input Bar */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-[#FFB224] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik judul film, serial TV, anime, atau aktor... (tekan /)"
            className="w-full pl-12 pr-11 py-3.5 rounded-2xl bg-[#12162A] border border-[#2A3152] text-sm sm:text-base text-[#F2F4FB] placeholder-[#98A2C3] focus:outline-none focus:border-[#FFB224] focus:ring-1 focus:ring-[#FFB224] transition-all shadow-xl"
          />
          {input && (
            <button
              onClick={() => {
                setInput('');
                inputRef.current?.focus();
              }}
              aria-label="Hapus kata kunci pencarian"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#98A2C3] hover:text-[#F2F4FB] hover:bg-[#1A2038] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search History Chips */}
        {!input && searchHistory.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-[#98A2C3] px-1">
              <span className="flex items-center gap-1.5 font-medium">
                <History className="w-3.5 h-3.5 text-[#FFB224]" />
                Riwayat pencarian terakhir
              </span>
              <button
                onClick={handleClearHistory}
                className="hover:text-[#FF5C6C] transition-colors cursor-pointer"
              >
                Hapus semua
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectHistory(item)}
                  className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] text-xs text-[#F2F4FB] transition-all cursor-pointer"
                >
                  <span>{item}</span>
                  <span
                    onClick={(e) => handleRemoveHistory(item, e)}
                    className="p-0.5 text-[#98A2C3] hover:text-[#FF5C6C] rounded group-hover:opacity-100 opacity-60"
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
          <div className="h-5 w-48 rounded bg-[#12162A] animate-pulse" />
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
          <div className="w-12 h-12 rounded-2xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/30 text-[#FF5C6C] flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#F2F4FB] mb-1">Gagal Menjalankan Pencarian</h3>
          <p className="text-xs text-[#98A2C3] max-w-sm mb-4 leading-relaxed">{error}</p>
          <button
            onClick={() => setInput(input)}
            className="px-4 py-2 rounded-xl bg-[#FFB224] text-[#0A0C14] font-semibold text-xs cursor-pointer shadow"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 3. Empty State (No Results Found) */}
      {!isLoading && !error && debouncedQuery.trim() && results.length === 0 && (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#12162A] border border-[#2A3152] flex items-center justify-center text-[#98A2C3]">
            <Search className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#F2F4FB]">
            Tidak Ditemukan Hasil untuk "{debouncedQuery}"
          </h3>
          <p className="text-xs text-[#98A2C3] max-w-sm leading-relaxed">
            Periksa ejaan kata kunci, coba nama judul dalam Bahasa Inggris/Indonesia, atau tanyakan pada asisten AI kami.
          </p>
        </div>
      )}

      {/* 4. Success State (Grouped Results) */}
      {!isLoading && !error && results.length > 0 && (
        <div className="space-y-10 pt-2">
          {/* Movies Section */}
          {movies.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[#2A3152]/70 pb-2">
                <Film className="w-4 h-4 text-[#FFB224]" />
                <h2 className="text-sm sm:text-base font-semibold text-[#F2F4FB]">
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
              <div className="flex items-center gap-2 border-b border-[#2A3152]/70 pb-2">
                <Tv className="w-4 h-4 text-[#FFB224]" />
                <h2 className="text-sm sm:text-base font-semibold text-[#F2F4FB]">
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
              <div className="flex items-center gap-2 border-b border-[#2A3152]/70 pb-2">
                <Sparkles className="w-4 h-4 text-zinc-300" />
                <h2 className="text-sm sm:text-base font-semibold text-[#F2F4FB]">
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
