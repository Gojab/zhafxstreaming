import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchProgressItem } from '../types';
import { storage } from '../lib/storage';
import { SaveProgressPayload } from '../services/progressApi';

export function useContinueWatching() {
  const [items, setItems] = useState<WatchProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSavingRef = useRef<boolean>(false);
  const itemsRef = useRef<WatchProgressItem[]>([]);
  itemsRef.current = items;

  // Load progress records from local storage
  const loadProgress = useCallback(() => {
    try {
      const guestItems = storage.getGuestProgress();
      setItems(guestItems.filter((item) => !item.completed && item.currentTime > 5));
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();

    const handleUpdate = () => {
      if (isSavingRef.current) return;
      loadProgress();
    };

    window.addEventListener('zhafx_progress_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('zhafx_progress_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadProgress]);

  /**
   * Save or update progress for a media or episode
   */
  const saveProgress = useCallback(
    async (payload: SaveProgressPayload): Promise<void> => {
      isSavingRef.current = true;
      try {
        const validDuration = Math.max(1, Math.round(payload.duration || 1));
        const validCurrent = Math.max(0, Math.min(validDuration, Math.round(payload.currentTime || 0)));
        const percentage = Math.min(100, Math.max(0, Math.round((validCurrent / validDuration) * 100)));
        const isCompleted =
          payload.completed === true ||
          percentage >= 95 ||
          (validDuration > 60 && validDuration - validCurrent <= 30 && validCurrent > 30);

        const sNum = payload.season !== undefined ? Number(payload.season) : undefined;
        const epNum = payload.episode !== undefined ? Number(payload.episode) : undefined;
        const progressRecordId = `watch_${payload.contentId}_s${sNum ?? 1}_e${epNum ?? 1}`;

        const progressItem: WatchProgressItem = {
          id: progressRecordId,
          userId: 'guest',
          contentId: payload.contentId,
          episodeId: payload.episodeId || (sNum || epNum ? `s${sNum || 1}_e${epNum || 1}` : undefined),
          mediaType: payload.mediaType,
          title: payload.title,
          poster: payload.poster,
          backdrop: payload.backdrop,
          year: payload.year,
          season: sNum,
          episode: epNum,
          episodeName: payload.episodeName,
          currentTime: validCurrent,
          duration: validDuration,
          progressPercentage: percentage,
          lastWatchedAt: Date.now(),
          completed: isCompleted,
        };

        // Also update watch history in storage
        storage.saveHistory({
          id: payload.contentId,
          type: payload.mediaType,
          title: payload.title,
          poster: payload.poster,
          backdrop: payload.backdrop,
          year: payload.year,
          season: sNum,
          episode: epNum,
          episodeName: payload.episodeName,
          progressSeconds: validCurrent,
          durationSeconds: validDuration,
          progressPercentage: percentage,
        });

        // Save to local progress storage
        storage.saveGuestProgress(progressItem);

        // Optimistic state update
        setItems((prev) => {
          const filtered = prev.filter(
            (p) => !(p.contentId === payload.contentId && p.season === sNum && p.episode === epNum)
          );
          if (isCompleted || validCurrent <= 5) {
            return filtered;
          }
          return [progressItem, ...filtered];
        });
      } finally {
        setTimeout(() => {
          isSavingRef.current = false;
        }, 100);
      }
    },
    []
  );

  /**
   * Delete item from Continue Watching list
   */
  const removeProgress = useCallback(
    async (contentId: string, season?: number, episode?: number): Promise<void> => {
      setItems((prev) =>
        prev.filter(
          (p) =>
            !(
              p.contentId === contentId &&
              (season === undefined || p.season === season) &&
              (episode === undefined || p.episode === episode)
            )
        )
      );

      storage.removeHistoryItem(contentId, season, episode);
      storage.removeGuestProgress(contentId, season, episode);
    },
    []
  );

  /**
   * Helper to retrieve progress for a specific content / episode
   */
  const getProgressForTitle = useCallback(
    (contentId: string, season?: number, episode?: number): WatchProgressItem | undefined => {
      const foundInState = itemsRef.current.find(
        (p) =>
          p.contentId === contentId &&
          (season === undefined || p.season === season) &&
          (episode === undefined || p.episode === episode)
      );
      if (foundInState) return foundInState;

      const guest = storage.getGuestProgress();
      return guest.find(
        (p) =>
          p.contentId === contentId &&
          (season === undefined || p.season === season) &&
          (episode === undefined || p.episode === episode)
      );
    },
    []
  );

  return {
    items,
    isLoading,
    saveProgress,
    removeProgress,
    getProgressForTitle,
    refetch: loadProgress,
  };
}
