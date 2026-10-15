import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      className="sticky top-16 z-50 w-full bg-[#FF5C6C] text-white px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center justify-between shadow-lg"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Koneksi internet terputus. Menampilkan konten lokal yang tersimpan.</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          Muat ulang
        </button>
      </div>
    </div>
  );
};
