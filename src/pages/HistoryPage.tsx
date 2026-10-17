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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-16 space-y-7 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#FFB224]">
            <span>Aktivitas Menonton</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-[-0.03em]">
            Riwayat Menonton
          </h1>
          <p className="text-xs sm:text-sm text-white/55 max-w-xl leading-relaxed">
            Daftar tayangan yang pernah Anda putar di Zhafx, tersimpan aman dan terintegrasi di akun Anda.
          </p>
        </div>

        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full liquid-glass liquid-specular text-xs font-semibold text-white/80 hover:text-red-400 hover:bg-white/[0.14] transition-all cursor-pointer shrink-0 self-start sm:self-auto ios-spring"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Bersihkan Riwayat</span>
          </button>
        )}
      </div>

      {/* History Items List */}
      {history.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/60 shadow-xl">
            <Clock className="w-7 h-7 text-[#FFB224]" />
          </div>
          <h2 className="text-base font-bold text-white">Belum Ada Riwayat Menonton</h2>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Tayangan yang Anda tonton akan otomatis tersimpan di sini agar Anda bisa melanjutkan kapan saja.
          </p>
          <Link
            to="/explore/movie"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#06070B] font-bold text-xs shadow-lg transition-all cursor-pointer mt-2 ios-spring"
          >
            <Compass className="w-4 h-4" />
            <span>Mulai Jelajahi Tayangan</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((item) => {
            const playPath =
              item.type === 'tv'
                ? `/watch/tv/${item.id}/${item.season || 1}/${item.episode || 1}`
                : item.type === 'anime'
                ? `/watch/anime/${item.id}/1/${item.episode || 1}`
                : `/watch/movie/${item.id}`;

            const detailPath = `/detail/${item.type}/${item.id}`;

            return (
              <div
                key={`${item.id}-${item.season}-${item.episode}`}
                className="group flex gap-3.5 p-3.5 rounded-[20px] bg-[#0E1017] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-lg hover:shadow-[0_16px_36px_rgba(0,0,0,0.65)] relative overflow-hidden"
              >
                {/* Poster Thumbnail (Full bleed with 16px corners) */}
                <Link
                  to={playPath}
                  className="w-20 aspect-[2/3] rounded-[16px] overflow-hidden bg-[#06070B] shrink-0 border border-white/10 relative group/thumb flex items-center justify-center"
                >
                  <div className="absolute inset-0 flex items-center justify-center text-white/30 font-bold text-sm tracking-wider select-none">
                    {item.title ? item.title.slice(0, 2).toUpperCase() : 'ZH'}
                  </div>
                  {item.poster && (
                    <img
                      src={item.poster}
                      alt={item.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105 relative z-0"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity z-10">
                    <div className="w-8 h-8 rounded-full liquid-glass-dense liquid-specular text-[#FFB224] flex items-center justify-center shadow-lg">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div className="space-y-1">
                    <Link
                      to={detailPath}
                      className="text-xs sm:text-sm font-semibold text-white/95 hover:text-[#FFB224] transition-colors line-clamp-1 block leading-snug"
                    >
                      {item.title}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                      <span>{item.year}</span>
                      <span>•</span>
                      <span className="capitalize">{item.type}</span>
                    </div>
                    {item.episodeName && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-[#FFB224] font-semibold">
                          {item.episodeName}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/50 pt-2 border-t border-white/[0.08]">
                    <span className="truncate">{formatDate(item.updatedAt)}</span>
                    <button
                      onClick={() => removeHistory(item.id, item.season, item.episode)}
                      title="Hapus dari riwayat"
                      aria-label={`Hapus ${item.title} dari riwayat`}
                      className="w-7 h-7 rounded-full liquid-glass flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-white/[0.14] transition-colors cursor-pointer ios-spring"
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
