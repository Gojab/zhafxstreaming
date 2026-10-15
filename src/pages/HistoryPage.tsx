import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { History, Trash2, Play, Compass, Clock } from 'lucide-react';
import { useWatchHistory } from '../hooks/useWatchHistory';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { history, removeHistory, clearHistory } = useWatchHistory();

  const formatDate = (timestamp: number) => {
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(timestamp));
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-6 min-h-[70vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2A3152]/70 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFB224] mb-1">
            <History className="w-4 h-4" />
            <span>Aktivitas Menonton</span>
          </div>
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-2xl sm:text-3xl font-bold text-[#F2F4FB] tracking-tight"
          >
            Riwayat Menonton
          </h1>
          <p className="text-xs sm:text-sm text-[#98A2C3] mt-1">
            Daftar tayangan yang pernah Anda putar di Zhafx, tersimpan aman di perangkat Anda.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#12162A] hover:bg-[#FF5C6C]/10 border border-[#2A3152] hover:border-[#FF5C6C]/50 text-xs font-medium text-[#98A2C3] hover:text-[#FF5C6C] transition-colors cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Bersihkan semua riwayat
          </button>
        )}
      </div>

      {/* History Items List */}
      {history.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#12162A] border border-[#2A3152] flex items-center justify-center text-[#98A2C3]">
            <Clock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-[#F2F4FB]">Belum Ada Riwayat Menonton</h2>
          <p className="text-xs text-[#98A2C3] max-w-sm leading-relaxed">
            Tayangan yang Anda tonton akan otomatis tersimpan di sini agar Anda bisa melanjutkan kapan saja.
          </p>
          <Link
            to="/explore/movie"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFB224] text-[#0A0C14] font-semibold text-xs transition-all shadow cursor-pointer mt-2"
          >
            <Compass className="w-4 h-4" />
            Mulai jelajahi tayangan
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {history.map((item) => {
            const startParam = item.progressSeconds && item.progressSeconds > 5 ? `?t=${Math.floor(item.progressSeconds)}` : '';
            const playPath =
              item.type === 'tv'
                ? `/watch/tv/${item.id}/${item.season || 1}/${item.episode || 1}${startParam}`
                : item.type === 'anime'
                ? `/watch/anime/${item.id}/1/${item.episode || 1}${startParam}`
                : `/watch/movie/${item.id}${startParam}`;

            const detailPath = `/detail/${item.type}/${item.id}`;
            const pct = item.progressPercentage || (item.progressSeconds && item.durationSeconds ? Math.round((item.progressSeconds / item.durationSeconds) * 100) : 0);

            return (
              <div
                key={`${item.id}-${item.season}-${item.episode}`}
                className="group flex gap-3.5 p-3 rounded-2xl bg-[#12162A] border border-[#2A3152] hover:border-[#FFB224]/50 transition-all shadow-md relative overflow-hidden"
              >
                {/* Poster Thumbnail */}
                <Link
                  to={playPath}
                  className="w-20 aspect-[2/3] rounded-xl overflow-hidden bg-[#0A0C14] shrink-0 border border-[#2A3152]/60 relative group/thumb block"
                >
                  <img
                    src={item.poster}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform group-hover/thumb:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                    <div className="w-7 h-7 rounded-full bg-[#FFB224] text-[#0A0C14] flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Thumbnail Progress Bar */}
                  {pct > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#1A2038]">
                      <div className="h-full bg-[#FFB224]" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <Link
                      to={detailPath}
                      className="text-xs sm:text-sm font-semibold text-[#F2F4FB] hover:text-[#FFB224] transition-colors line-clamp-1 block"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#98A2C3]">
                      <span>{item.year}</span>
                      <span>•</span>
                      <span className="capitalize">{item.type}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.episodeName && (
                        <span className="inline-block px-2 py-0.5 rounded-md bg-[#1A2038] border border-[#2A3152] text-[10px] text-[#FFB224] font-medium">
                          {item.episodeName}
                        </span>
                      )}
                      {pct > 0 && (
                        <span className="text-[10px] text-[#98A2C3]">
                          {pct}% selesai
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#98A2C3] pt-2 border-t border-[#2A3152]/40">
                    <span className="truncate">{formatDate(item.updatedAt)}</span>
                    <button
                      onClick={() => removeHistory(item.id, item.season, item.episode)}
                      title="Hapus dari riwayat"
                      className="p-1 rounded text-[#98A2C3] hover:text-[#FF5C6C] hover:bg-[#1A2038] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
