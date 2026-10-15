import { useState, useEffect, useCallback } from 'react';
import { storage } from '../lib/storage';
import { HistoryItem } from '../types';

export function useWatchHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const refresh = useCallback(() => {
    setHistory(storage.getHistory());
  }, []);

  useEffect(() => {
    refresh();
    const handleStorage = () => refresh();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  const addHistory = useCallback(
    (item: Omit<HistoryItem, 'updatedAt'>) => {
      storage.saveHistory(item);
      refresh();
    },
    [refresh]
  );

  const removeHistory = useCallback(
    (id: string, season?: number, episode?: number) => {
      storage.removeHistoryItem(id, season, episode);
      refresh();
    },
    [refresh]
  );

  const clearHistory = useCallback(() => {
    storage.clearHistory();
    refresh();
  }, [refresh]);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
    refresh,
  };
}
