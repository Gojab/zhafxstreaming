import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WifiOff, Download } from 'lucide-react';
import { useOfflineDownloads } from '../hooks/useOfflineDownloads';

export const OfflineBanner: React.FC = () => {
  const { effectiveOffline, downloads } = useOfflineDownloads();

  if (!effectiveOffline) return null;

  return (
    <div
      role="alert"
      className="fixed top-20 left-3 right-3 sm:left-6 sm:right-6 max-w-lg mx-auto z-50 pointer-events-none"
    >
      <div className="rounded-full liquid-glass-dense liquid-specular text-white px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 shadow-2xl border border-amber-500/40 pointer-events-auto">
        <div className="flex items-center gap-2 truncate">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">Mode Offline Aktif ({downloads.length} tayangan tersimpan)</span>
        </div>
        <Link
          to="/offline"
          className="px-3 py-1 rounded-full bg-[#FFB224] text-[#06070B] text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 ios-spring"
        >
          <Download className="w-3 h-3" />
          <span>Buka Offline</span>
        </Link>
      </div>
    </div>
  );
};
