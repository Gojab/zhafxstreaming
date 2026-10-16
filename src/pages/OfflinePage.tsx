import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Download,
  Trash2,
  Play,
  HardDrive,
  WifiOff,
  Wifi,
  Compass,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useOfflineDownloads } from '../hooks/useOfflineDownloads';

export const OfflinePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    downloads,
    removeDownload,
    totalUsedMb,
    isForcedOffline,
    effectiveOffline,
    toggleForcedOffline,
  } = useOfflineDownloads();

  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const inProgressDownloads = downloads.filter((d) => d.status === 'downloading');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-20 sm:pt-24 pb-16 space-y-7 min-h-[75vh]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#FFB224] flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Penyimpanan Lokal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-[-0.03em]">
            Download & Mode Offline
          </h1>
          <p className="text-xs sm:text-sm text-white/55 max-w-xl leading-relaxed">
            Nonton film, serial TV, dan anime kapan saja tanpa perlu koneksi internet.
          </p>
        </div>

        {/* Storage stats & Toggle Offline pill */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="px-4 py-2 rounded-full liquid-glass text-xs text-white/70 flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-[#FFB224]" />
            <span>
              Terpakai: <strong className="text-white font-mono">{totalUsedMb} MB</strong>
            </span>
          </div>

          <button
            onClick={() => toggleForcedOffline()}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ios-spring cursor-pointer ${
              effectiveOffline
                ? 'bg-amber-400 text-black shadow-lg'
                : 'liquid-glass text-white/80 hover:text-white hover:bg-white/20'
            }`}
          >
            {effectiveOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Mode Offline Aktif</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulasi Offline</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* In-Progress Downloads */}
      {inProgressDownloads.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white/80 uppercase tracking-wider">
            Sedang Mengunduh ({inProgressDownloads.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {inProgressDownloads.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-[22px] liquid-glass border border-white/20 flex items-center gap-3.5"
              >
                <div className="w-12 h-16 rounded-[14px] bg-[#0E1017] overflow-hidden shrink-0">
                  {item.poster ? (
                    <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-bold">
                      ZH
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-white truncate">
                    <span className="truncate">{item.title}</span>
                    <span className="text-[#FFB224] font-mono ml-2">
                      {item.progressPercentage}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#FFB224] to-amber-300 transition-all duration-300"
                      style={{ width: `${item.progressPercentage}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/50 block">
                    Menyimpan cache offline • ~{item.sizeMb} MB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Downloads List */}
      {completedDownloads.length === 0 && inProgressDownloads.length === 0 ? (
        <div className="min-h-[45vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full liquid-glass liquid-specular flex items-center justify-center text-white/60 shadow-xl">
            <Download className="w-7 h-7 text-[#FFB224]" />
          </div>
          <h2 className="text-base font-bold text-white">Belum Ada Tayangan yang Didownload</h2>
          <p className="text-xs text-white/55 max-w-sm leading-relaxed">
            Tekan tombol <strong>Download Offline</strong> pada halaman detail tayangan apa saja untuk menyimpannya ke perangkat ini.
          </p>
          <Link
            to="/explore/movie"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-[#06070B] font-bold text-xs shadow-lg transition-all cursor-pointer mt-2 ios-spring"
          >
            <Compass className="w-4 h-4" />
            <span>Jelajahi Film & Serial</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedDownloads.map((item) => {
            const playPath =
              item.mediaType === 'tv'
                ? `/watch/tv/${item.contentId}/${item.season || 1}/${item.episode || 1}`
                : item.mediaType === 'anime'
                ? `/watch/anime/${item.contentId}/1/${item.episode || 1}`
                : `/watch/movie/${item.contentId}`;

            const detailPath = `/detail/${item.mediaType}/${item.contentId}`;

            return (
              <div
                key={item.id}
                className="group flex gap-3.5 p-3.5 rounded-[22px] bg-[#0E1017] border border-white/10 hover:border-white/20 transition-all duration-300 shadow-lg relative overflow-hidden"
              >
                {/* Poster Thumbnail */}
                <Link
                  to={playPath}
                  className="w-20 aspect-[2/3] rounded-[16px] overflow-hidden bg-[#06070B] shrink-0 border border-white/10 relative group/thumb flex items-center justify-center"
                >
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/30 font-bold text-sm">
                      ZH
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
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
                      <span>{item.year || '2026'}</span>
                      <span>•</span>
                      <span className="capitalize">{item.mediaType}</span>
                      <span>•</span>
                      <span className="font-mono text-[#FFB224]">{item.sizeMb} MB</span>
                    </div>
                    {item.episodeName && (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-[#FFB224] font-semibold">
                        {item.episodeName}
                      </span>
                    )}
                  </div>

                  {/* Actions: Putar Offline & Hapus */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                    <button
                      onClick={() => navigate(playPath)}
                      className="px-3 py-1.5 rounded-full bg-white text-black font-bold text-[11px] flex items-center gap-1.5 shadow-md ios-spring cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                      <span>Putar Offline</span>
                    </button>

                    <button
                      onClick={() => removeDownload(item.id)}
                      title="Hapus dari penyimpanan offline"
                      aria-label={`Hapus ${item.title}`}
                      className="w-7 h-7 rounded-full liquid-glass flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
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
