import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { downloadEngine, DownloadTask } from '../services/downloadEngine';

interface DownloadContextType {
  downloads: DownloadTask[];
  activeCount: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  startDownload: (params: {
    contentId: string;
    mediaType: 'movie' | 'tv' | 'anime';
    title: string;
    poster?: string;
    year?: string;
    season?: number;
    episode?: number;
    episodeName?: string;
    audio?: 'sub' | 'dub';
  }) => Promise<string>;
  pauseDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  saveFile: (id: string) => void;
}

const DownloadContext = createContext<DownloadContextType | null>(null);

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloads, setDownloads] = useState<DownloadTask[]>(() => downloadEngine.getAllTasks());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = downloadEngine.subscribe((tasks) => {
      setDownloads([...tasks]);
    });
    return () => unsubscribe();
  }, []);

  const activeCount = downloads.filter(
    (d) => d.status === 'resolving' || d.status === 'downloading' || d.status === 'assembling'
  ).length;

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  // Global Shortcut: Press 'X' / 'x' to toggle Download Manager Drawer anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.key === 'x' || e.key === 'X') && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsDrawerOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startDownload = useCallback(
    async (params: {
      contentId: string;
      mediaType: 'movie' | 'tv' | 'anime';
      title: string;
      poster?: string;
      year?: string;
      season?: number;
      episode?: number;
      episodeName?: string;
      audio?: 'sub' | 'dub';
    }) => {
      const id = await downloadEngine.startDownload(params);
      // Auto open drawer so user sees immediate feedback, or they can toggle with X
      setIsDrawerOpen(true);
      return id;
    },
    []
  );

  const pauseDownload = useCallback((id: string) => {
    downloadEngine.pauseDownload(id);
  }, []);

  const cancelDownload = useCallback((id: string) => {
    downloadEngine.cancelDownload(id);
  }, []);

  const removeDownload = useCallback((id: string) => {
    downloadEngine.removeTask(id);
  }, []);

  const clearCompleted = useCallback(() => {
    downloadEngine.clearCompleted();
  }, []);

  const saveFile = useCallback((id: string) => {
    const task = downloadEngine.getTask(id);
    const blob = downloadEngine.getBlob(id);
    if (task && blob) {
      const url = task.blobUrl || URL.createObjectURL(blob);
      downloadEngine.triggerBrowserSave(url, task.filename);
    } else if (task?.directDownloadUrl) {
      window.location.href = task.directDownloadUrl;
    }
  }, []);

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        activeCount,
        isDrawerOpen,
        setIsDrawerOpen,
        openDrawer,
        closeDrawer,
        toggleDrawer,
        startDownload,
        pauseDownload,
        cancelDownload,
        removeDownload,
        clearCompleted,
        saveFile,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
};

export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error('useDownload must be used within a DownloadProvider');
  }
  return context;
};
