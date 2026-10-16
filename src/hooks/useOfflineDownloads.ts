import { useState, useEffect, useCallback } from 'react';
import { offlineStorage, OfflineDownload } from '../lib/offlineStorage';
import { MediaType } from '../types';

export function useOfflineDownloads() {
  const [downloads, setDownloads] = useState<OfflineDownload[]>(() => offlineStorage.getDownloads());
  const [isForcedOffline, setIsForcedOffline] = useState<boolean>(() => offlineStorage.isForcedOffline());
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleUpdate = () => {
      setDownloads(offlineStorage.getDownloads());
      setIsForcedOffline(offlineStorage.isForcedOffline());
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribe = offlineStorage.subscribe(handleUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const startDownload = useCallback(
    async (params: {
      contentId: string;
      mediaType: MediaType;
      title: string;
      poster?: string;
      backdrop?: string;
      year?: string;
      season?: number;
      episode?: number;
      episodeName?: string;
      overview?: string;
    }) => {
      return await offlineStorage.startDownload(params);
    },
    []
  );

  const removeDownload = useCallback((id: string) => {
    offlineStorage.removeDownload(id);
    setDownloads(offlineStorage.getDownloads());
  }, []);

  const isDownloaded = useCallback((contentId: string, season?: number, episode?: number) => {
    return offlineStorage.isDownloaded(contentId, season, episode);
  }, []);

  const toggleForcedOffline = useCallback((val?: boolean) => {
    const nextVal = val !== undefined ? val : !offlineStorage.isForcedOffline();
    offlineStorage.setForcedOffline(nextVal);
    setIsForcedOffline(nextVal);
  }, []);

  const totalUsedMb = offlineStorage.getTotalUsedStorageMb();
  const effectiveOffline = !isOnline || isForcedOffline;

  return {
    downloads,
    isDownloaded,
    startDownload,
    removeDownload,
    totalUsedMb,
    isForcedOffline,
    isOnline,
    effectiveOffline,
    toggleForcedOffline,
  };
}
