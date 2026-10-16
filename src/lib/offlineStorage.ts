import { MediaType } from '../types';

export interface OfflineDownload {
  id: string;
  contentId: string;
  mediaType: MediaType;
  title: string;
  poster?: string;
  backdrop?: string;
  year?: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  sizeMb: number;
  downloadedAt: number;
  status: 'downloading' | 'completed' | 'failed';
  progressPercentage: number;
  localPlaybackAvailable: boolean;
  overview?: string;
}

const STORAGE_KEY = 'zhafx_offline_downloads';
const OFFLINE_MODE_FLAG = 'zhafx_forced_offline_mode';

class OfflineStorageManager {
  private listeners: Set<() => void> = new Set();

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[OfflineStorage] listener error:', err);
      }
    });
    window.dispatchEvent(new CustomEvent('zhafx-downloads-changed'));
  }

  public getDownloads(): OfflineDownload[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  public isDownloaded(contentId: string, season?: number, episode?: number): boolean {
    const id = this.generateId(contentId, season, episode);
    const downloads = this.getDownloads();
    return downloads.some((d) => d.id === id && d.status === 'completed');
  }

  public getDownload(contentId: string, season?: number, episode?: number): OfflineDownload | null {
    const id = this.generateId(contentId, season, episode);
    const downloads = this.getDownloads();
    return downloads.find((d) => d.id === id) || null;
  }

  public generateId(contentId: string, season?: number, episode?: number): string {
    if (season && episode) return `${contentId}-s${season}-e${episode}`;
    if (episode) return `${contentId}-e${episode}`;
    return contentId;
  }

  public startDownload(
    params: {
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
    },
    onProgress?: (pct: number) => void
  ): Promise<OfflineDownload> {
    const id = this.generateId(params.contentId, params.season, params.episode);
    const downloads = this.getDownloads();

    // Random realistic file size between 450 MB and 1200 MB
    const estimatedSize =
      params.mediaType === 'anime'
        ? Math.floor(250 + Math.random() * 150)
        : params.mediaType === 'tv'
        ? Math.floor(450 + Math.random() * 250)
        : Math.floor(950 + Math.random() * 600);

    const newDownload: OfflineDownload = {
      id,
      contentId: params.contentId,
      mediaType: params.mediaType,
      title: params.title,
      poster: params.poster,
      backdrop: params.backdrop,
      year: params.year,
      season: params.season,
      episode: params.episode,
      episodeName: params.episodeName,
      overview: params.overview,
      sizeMb: estimatedSize,
      downloadedAt: Date.now(),
      status: 'downloading',
      progressPercentage: 5,
      localPlaybackAvailable: true,
    };

    // Save initial state
    const filtered = downloads.filter((d) => d.id !== id);
    filtered.unshift(newDownload);
    this.saveDownloads(filtered);

    // Simulate multi-step realistic high-speed download
    return new Promise((resolve) => {
      let progress = 10;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 18) + 12;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);

          const currentList = this.getDownloads();
          const updated = currentList.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status: 'completed' as const,
                  progressPercentage: 100,
                  downloadedAt: Date.now(),
                }
              : d
          );
          this.saveDownloads(updated);
          newDownload.status = 'completed';
          newDownload.progressPercentage = 100;
          if (onProgress) onProgress(100);
          resolve(newDownload);
        } else {
          const currentList = this.getDownloads();
          const updated = currentList.map((d) =>
            d.id === id ? { ...d, progressPercentage: progress } : d
          );
          this.saveDownloads(updated);
          if (onProgress) onProgress(progress);
        }
      }, 350);
    });
  }

  public removeDownload(id: string): void {
    const downloads = this.getDownloads();
    const updated = downloads.filter((d) => d.id !== id);
    this.saveDownloads(updated);
  }

  public clearAllDownloads(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.notify();
  }

  public getTotalUsedStorageMb(): number {
    const downloads = this.getDownloads();
    return downloads.reduce((acc, d) => (d.status === 'completed' ? acc + d.sizeMb : acc), 0);
  }

  public isForcedOffline(): boolean {
    return localStorage.getItem(OFFLINE_MODE_FLAG) === 'true';
  }

  public setForcedOffline(enabled: boolean): void {
    localStorage.setItem(OFFLINE_MODE_FLAG, enabled ? 'true' : 'false');
    this.notify();
    window.dispatchEvent(new CustomEvent('zhafx-offline-toggle', { detail: { isOffline: enabled } }));
  }

  private saveDownloads(list: OfflineDownload[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      this.notify();
    } catch (err) {
      console.warn('[OfflineStorage] Storage full or error:', err);
    }
  }
}

export const offlineStorage = new OfflineStorageManager();
