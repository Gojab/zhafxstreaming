import React, { useState } from 'react';
import {
  Download,
  X as CloseIcon,
  Play,
  Pause,
  RotateCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Film,
  HardDrive,
  FileVideo,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useDownload } from '../context/DownloadContext';
import { DownloadTask } from '../services/downloadEngine';

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export const DownloadDrawer: React.FC = () => {
  const {
    downloads,
    activeCount,
    isDrawerOpen,
    closeDrawer,
    pauseDownload,
    cancelDownload,
    removeDownload,
    clearCompleted,
    saveFile,
  } = useDownload();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [offlinePreviewTask, setOfflinePreviewTask] = useState<DownloadTask | null>(null);

  if (!isDrawerOpen) {
    // If closed but downloads are active, show a floating mini-widget
    if (activeCount > 0) {
      const firstActive = downloads.find(
        (d) => d.status === 'downloading' || d.status === 'resolving' || d.status === 'assembling'
      );
      return (
        <div
          onClick={() => {
            const { openDrawer } = (window as any).__zhafx_download_ctx || {};
            if (openDrawer) openDrawer();
          }}
          className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 p-2.5 sm:px-4 sm:py-2.5 rounded-full liquid-glass-dense border border-amber-500/40 shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all text-xs font-semibold text-white animate-fade-in group select-none"
          title="Klik atau tekan tombol X untuk melihat progres unduhan"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping absolute" />
            <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xs">
              <Download className="w-3.5 h-3.5 animate-bounce" />
            </div>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-white truncate max-w-[150px]">{firstActive?.title || 'Mengunduh...'}</span>
            <span className="text-[10px] text-amber-300 font-mono">
              {firstActive?.progress || 0}% • {firstActive?.speed || '0 KB/s'}
            </span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded-md bg-white/20 text-white font-mono text-[10px] border border-white/20">
            X
          </kbd>
        </div>
      );
    }
    return null;
  }

  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'resolving' || d.status === 'assembling' || d.status === 'paused'
  );
  const completedDownloads = downloads.filter(
    (d) => d.status === 'completed' || d.status === 'error'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Main Apple iOS 26 Liquid Glass Feature Sheet */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-white/25 shadow-2xl z-10 text-white overflow-hidden">
        {/* Header Bar with Shortcut [X] Badge */}
        <div className="p-5 sm:p-6 pb-4 border-b border-white/[0.12] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFB224] to-amber-300 text-black flex items-center justify-center shadow-lg font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Pengelola & Progres Unduhan
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-amber-300 text-[10px] font-mono font-bold border border-amber-400/30 flex items-center gap-1">
                  <kbd className="font-sans">Shortcut:</kbd>
                  <span className="bg-amber-400 text-black px-1 rounded text-[9px]">X</span>
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Unduhan video riil untuk ditonton offline kapan saja
              </p>
            </div>
          </div>

          <button
            onClick={closeDrawer}
            aria-label="Tutup Pengelola Unduhan (X)"
            className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring"
            title="Tutup (Tekan X atau Esc)"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-white/[0.08] shrink-0 bg-black/20">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-white/[0.06] border border-white/10">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span>Sedang Berjalan</span>
              {activeDownloads.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'active' ? 'bg-amber-400 text-black' : 'bg-white/20 text-white'
                }`}>
                  {activeDownloads.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              <span>Riwayat & Selesai</span>
              {completedDownloads.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === 'completed' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'
                }`}>
                  {completedDownloads.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'completed' && completedDownloads.length > 0 && (
            <button
              onClick={clearCompleted}
              className="text-xs text-white/50 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bersihkan Riwayat</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeTab === 'active' ? (
            activeDownloads.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40">
                  <Download className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Tidak Ada Unduhan Aktif
                </h3>
                <p className="text-xs text-white/50 max-w-sm">
                  Pilih tayangan Film, Serial TV, atau Anime favoritmu lalu tekan tombol{' '}
                  <span className="text-amber-300 font-semibold">"Unduh Video"</span> untuk mulai mengunduh file secara offline.
                </p>
                <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-[11px] text-white/70 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Tekan tombol <strong>X</strong> di keyboard kapan saja untuk membuka menu ini.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {activeDownloads.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl sm:rounded-3xl bg-white/[0.06] border border-white/15 space-y-3 shadow-md hover:border-white/25 transition-all"
                  >
                    {/* Top Row: Thumbnail & Info */}
                    <div className="flex items-start gap-3">
                      {task.poster ? (
                        <img
                          src={task.poster}
                          alt={task.title}
                          className="w-12 h-16 rounded-xl object-cover border border-white/15 shrink-0 bg-[#0E1017]"
                        />
                      ) : (
                        <div className="w-12 h-16 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                          <Film className="w-5 h-5 text-white/40" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            {task.title}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                            task.status === 'downloading'
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                              : task.status === 'assembling'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : task.status === 'paused'
                              ? 'bg-zinc-700/50 text-zinc-300'
                              : 'bg-white/10 text-white/70'
                          }`}>
                            {task.status === 'resolving'
                              ? 'Menghubungkan...'
                              : task.status === 'downloading'
                              ? `${task.progress}%`
                              : task.status === 'assembling'
                              ? 'Menyatukan...'
                              : 'Dijeda'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-white/60">
                          {task.episode && (
                            <span className="font-semibold text-white/80">
                              {task.season ? `S${task.season} ` : ''}Ep {task.episode}
                              {task.episodeName ? ` — ${task.episodeName}` : ''}
                            </span>
                          )}
                          <span className="text-white/30">•</span>
                          <span className="font-mono text-white/70 truncate">{task.filename}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden relative">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            task.status === 'assembling'
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-400 animate-pulse'
                              : 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200'
                          }`}
                          style={{ width: `${Math.max(4, task.progress)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-white/60 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-semibold">{task.speed}</span>
                          <span>•</span>
                          <span>
                            {task.totalSegments
                              ? `${task.segmentsCompleted || 0} / ${task.totalSegments} segmen`
                              : `${formatBytes(task.downloadedBytes)} / ${formatBytes(task.totalBytes)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-white/70">
                          <Clock className="w-3 h-3" />
                          <span>ETA: {task.eta}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Pause, Cancel, Direct link */}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      {task.directDownloadUrl && (
                        <a
                          href={task.directDownloadUrl}
                          download={task.filename}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] text-white font-medium flex items-center gap-1 transition-all"
                          title="Unduh langsung via native browser manager"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Unduh via Browser</span>
                        </a>
                      )}

                      {task.status === 'downloading' && (
                        <button
                          onClick={() => pauseDownload(task.id)}
                          className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] text-white font-medium flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Pause className="w-3 h-3" />
                          <span>Jeda</span>
                        </button>
                      )}

                      <button
                        onClick={() => cancelDownload(task.id)}
                        className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-[11px] text-red-300 font-medium flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Batalkan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : completedDownloads.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/40">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Belum Ada Riwayat Unduhan
              </h3>
              <p className="text-xs text-white/50 max-w-sm">
                Berkas video yang berhasil diunduh akan tercatat di sini dan dapat disimpan kembali ke perangkat Anda kapan saja.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedDownloads.map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl sm:rounded-3xl bg-white/[0.06] border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-white/25 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {task.poster ? (
                      <img
                        src={task.poster}
                        alt={task.title}
                        className="w-11 h-15 rounded-xl object-cover border border-white/15 shrink-0 bg-[#0E1017]"
                      />
                    ) : (
                      <div className="w-11 h-15 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                        <FileVideo className="w-5 h-5 text-white/40" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {task.title}
                        </h4>
                        {task.status === 'completed' ? (
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Selesai
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-full bg-red-500/20 text-red-300 text-[10px] font-semibold border border-red-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Gagal
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-white/60">
                        {task.episode && (
                          <span>
                            {task.season ? `S${task.season} ` : ''}Ep {task.episode}
                          </span>
                        )}
                        <span className="text-white/30">•</span>
                        <span>{formatBytes(task.downloadedBytes || task.totalBytes)}</span>
                        {task.completedAt && (
                          <>
                            <span className="text-white/30">•</span>
                            <span>{new Date(task.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </>
                        )}
                      </div>

                      {task.error && (
                        <p className="text-[11px] text-red-400 leading-snug">{task.error}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {task.status === 'completed' && (
                      <>
                        <button
                          onClick={() => setOfflinePreviewTask(task)}
                          className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer"
                          title="Putar video offline langsung di browser"
                        >
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                          <span>Putar Offline</span>
                        </button>

                        <button
                          onClick={() => saveFile(task.id)}
                          className="px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                          title="Simpan file ke folder Unduhan perangkat"
                        >
                          <Download className="w-3 h-3" />
                          <span>Simpan File</span>
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => removeDownload(task.id)}
                      className="p-1.5 rounded-full text-white/40 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer"
                      title="Hapus dari riwayat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info & shortcut reminder */}
        <div className="p-3.5 sm:px-6 bg-black/40 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/50 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Format MP4 1080p kompatibel dengan semua pemutar media</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <span>Tekan</span>
            <kbd className="px-1.5 py-0.2 rounded bg-white/10 text-white font-mono font-bold text-[10px]">
              X
            </kbd>
            <span>untuk buka/tutup cepat</span>
          </div>
        </div>
      </div>

      {/* Offline Video Player Modal */}
      {offlinePreviewTask && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
            onClick={() => setOfflinePreviewTask(null)}
          />
          <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden bg-black border border-white/20 shadow-2xl z-10 flex flex-col">
            <div className="absolute top-3 left-4 z-20 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white truncate max-w-md">
                {offlinePreviewTask.title} (Pemutar Offline)
              </span>
            </div>

            <button
              onClick={() => setOfflinePreviewTask(null)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            {offlinePreviewTask.blobUrl ? (
              <video
                src={offlinePreviewTask.blobUrl}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400" />
                <p className="text-xs text-white/70">Berkas video perlu disimpan ulang.</p>
                <button
                  onClick={() => saveFile(offlinePreviewTask.id)}
                  className="px-4 py-2 rounded-full bg-amber-400 text-black text-xs font-bold"
                >
                  Simpan File ke Perangkat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
