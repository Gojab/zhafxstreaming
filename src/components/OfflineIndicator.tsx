import React, { useState, useEffect } from 'react';
import { IoWifiOutline as WifiOff, IoReloadOutline as RefreshIcon, IoCheckmarkCircle as CheckCircle } from 'react-icons/io5';

export const OfflineIndicator: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      window.location.reload();
    } else {
      // Trigger subtle shake or reload attempt
      window.location.reload();
    }
  };

  return (
    <>
      {/* Offline Alert Modal / Overlay */}
      {isOffline && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm rounded-[28px] sm:rounded-[32px] liquid-glass-dense border border-white/20 shadow-2xl p-6 sm:p-7 text-center space-y-4 text-white">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-300 shadow-inner">
              <WifiOff className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Gak ada internet.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                Mending matiin HP, daripada bolak-balik nungguin kabar dari hts.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshIcon className="w-4 h-4" />
                <span>Coba Hubungkan Ulang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reconnected Toast */}
      {showReconnected && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/90 text-white text-xs font-semibold shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200"
        >
          <CheckCircle className="w-4 h-4 text-white" />
          <span>Koneksi internet terhubung kembali!</span>
        </aside>
      )}
    </>
  );
};
