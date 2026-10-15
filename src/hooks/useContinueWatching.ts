import { useState, useEffect, useCallback, useRef } from 'react';
import { WatchProgressItem } from '../types';
import { storage } from '../lib/storage';
import { progressApi, SaveProgressPayload } from '../services/progressApi';
import { useAuth } from './useAuth';

export function useContinueWatching() {
  const { user } = useAuth();
  const [items, setItems] = useState<WatchProgressItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSyncingRef = useRef<boolean>(false);

  // Load progress records based on auth status
  const loadProgress = useCallback(async () => {
    const token = storage.getToken();

    if (user && token) {
      // Authenticated user: load from local cache first for instant rendering
      const cached = storage.getCachedUserProgress(user.id);
      if (cached.length > 0) {
        setItems(cached.filter((item) => !item.completed && item.currentTime > 5));
      }

      // Check if there are any guest items to migrate
      const guestItems = storage.getGuestProgress();
      if (guestItems.length > 0 && !isSyncingRef.current) {
        isSyncingRef.current = true;
        try {
          await progressApi.syncBatch(token, guestItems);
          storage.clearGuestProgress();
        } catch (e) {
          console.warn('[useContinueWatching] Failed to migrate guest progress:', e);
        } finally {
          isSyncingRef.current = false;
        }
      }

      // Fetch fresh records from server
      try {
        const res = await progressApi.getProgress(token, { all: false });
        if (res.success && Array.isArray(res.progress)) {
          setItems(res.progress);
          storage.setCachedUserProgress(user.id, res.progress);
        }
      } catch (err) {
        console.warn('[useContinueWatching] Failed to fetch server progress:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Guest: load from guest storage
      const guestItems = storage.getGuestProgress();
      setItems(guestItems.filter((item) => !item.completed && item.currentTime > 5));
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgress();

    const handleUpdate = () => {
      loadProgress();
    };

    window.addEventListener('zhafx_progress_updated', handleUpdate);
    window.addEventListener('zhafx_auth_change', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('zhafx_progress_updated', handleUpdate);
      window.removeEventListener('zhafx_auth_change', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [loadProgress]);

  /**
   * Save or update progress for a media or episode
   */
  const saveProgress = useCallback(
    async (payload: SaveProgressPayload): Promise<void> => {
      const token = storage.getToken();
      const validDuration = Math.max(1, Math.round(payload.duration || 1));
      const validCurrent = Math.max(0, Math.min(validDuration, Math.round(payload.currentTime || 0)));
      const percentage = Math.min(100, Math.max(0, Math.round((validCurrent / validDuration) * 100)));
      const isCompleted =
        payload.completed === true ||
        percentage >= 95 ||
        (validDuration > 60 && validDuration - validCurrent <= 30 && validCurrent > 30);

      const sNum = payload.season !== undefined ? Number(payload.season) : undefined;
      const epNum = payload.episode !== undefined ? Number(payload.episode) : undefined;
      const progressRecordId = user
        ? `${user.id}_${payload.contentId}_s${sNum ?? 1}_e${epNum ?? 1}`
        : `guest_${payload.contentId}_s${sNum ?? 1}_e${epNum ?? 1}`;

      const progressItem: WatchProgressItem = {
        id: progressRecordId,
        userId: user ? user.id : 'guest',
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

      if (user && token) {
        // Save to backend database
        try {
          await progressApi.saveProgress(token, {
            ...payload,
            currentTime: validCurrent,
            duration: validDuration,
            completed: isCompleted,
          });
          // Update user local cache
          const currentCached = storage.getCachedUserProgress(user.id);
          const updatedCache = [
            progressItem,
            ...currentCached.filter(
              (p) => !(p.contentId === payload.contentId && p.season === sNum && p.episode === epNum)
            ),
          ];
          storage.setCachedUserProgress(user.id, updatedCache);
        } catch (e) {
          console.warn('[useContinueWatching] Failed to save progress to server:', e);
        }
      } else {
        // Save to guest storage
        storage.saveGuestProgress(progressItem);
      }
    },
    [user]
  );

  /**
   * Delete item from Continue Watching list
   */
  const removeProgress = useCallback(
    async (contentId: string, season?: number, episode?: number): Promise<void> => {
      const token = storage.getToken();

      // Optimistic UI update
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

      // Remove from history storage as well
      storage.removeHistoryItem(contentId, season, episode);

      if (user && token) {
        try {
          await progressApi.deleteProgress(token, contentId, season, episode);
          const cached = storage.getCachedUserProgress(user.id);
          const updated = cached.filter(
            (p) =>
              !(
                p.contentId === contentId &&
                (season === undefined || p.season === season) &&
                (episode === undefined || p.episode === episode)
              )
          );
          storage.setCachedUserProgress(user.id, updated);
        } catch (err) {
          console.warn('[useContinueWatching] Failed to delete on server:', err);
        }
      } else {
        storage.removeGuestProgress(contentId, season, episode);
      }
    },
    [user]
  );

  /**
   * Helper to retrieve progress for a specific content / episode
   */
  const getProgressForTitle = useCallback(
    (contentId: string, season?: number, episode?: number): WatchProgressItem | undefined => {
      // 1. Check in state
      const foundInState = items.find(
        (p) =>
          p.contentId === contentId &&
          (season === undefined || p.season === season) &&
          (episode === undefined || p.episode === episode)
      );
      if (foundInState) return foundInState;

      // 2. Check in user cache or guest storage
      if (user) {
        const cached = storage.getCachedUserProgress(user.id);
        return cached.find(
          (p) =>
            p.contentId === contentId &&
            (season === undefined || p.season === season) &&
            (episode === undefined || p.episode === episode)
        );
      } else {
        const guest = storage.getGuestProgress();
        return guest.find(
          (p) =>
            p.contentId === contentId &&
            (season === undefined || p.season === season) &&
            (episode === undefined || p.episode === episode)
        );
      }
    },
    [items, user]
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
