import { WatchProgressItem } from '../types';

export interface SaveProgressPayload {
  contentId: string;
  episodeId?: string;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  poster: string;
  backdrop?: string;
  year: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  currentTime: number;
  duration: number;
  completed?: boolean;
}

export const progressApi = {
  /**
   * Fetch continue watching items for authenticated user
   */
  async getProgress(
    token?: string | null,
    params?: {
      contentId?: string;
      season?: number;
      episode?: number;
      all?: boolean;
    }
  ): Promise<{ success: boolean; progress: WatchProgressItem[]; error?: string }> {
    if (!token) {
      return { success: false, progress: [], error: 'Token tidak tersedia' };
    }

    try {
      const query = new URLSearchParams();
      if (params?.contentId) query.set('contentId', params.contentId);
      if (params?.season !== undefined) query.set('season', String(params.season));
      if (params?.episode !== undefined) query.set('episode', String(params.episode));
      if (params?.all) query.set('all', 'true');

      const url = `/api/progress${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          progress: [],
          error: data.error || 'Gagal memuat riwayat progres.',
        };
      }

      const data = await res.json();
      return {
        success: true,
        progress: Array.isArray(data.progress) ? data.progress : [],
      };
    } catch (err: any) {
      console.warn('[progressApi.getProgress] Network Error:', err);
      return {
        success: false,
        progress: [],
        error: 'Tidak dapat menghubungi server progres tontonan.',
      };
    }
  },

  /**
   * Save or update progress
   */
  async saveProgress(
    token: string | null | undefined,
    payload: SaveProgressPayload
  ): Promise<{ success: boolean; record?: WatchProgressItem; error?: string }> {
    if (!token) {
      return { success: false, error: 'Token autentikasi tidak tersedia.' };
    }

    try {
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Gagal menyimpan progres pemutaran.',
        };
      }

      return {
        success: true,
        record: data.record,
      };
    } catch (err: any) {
      console.warn('[progressApi.saveProgress] Network Error:', err);
      return {
        success: false,
        error: 'Gagal terhubung ke server saat menyimpan progres.',
      };
    }
  },

  /**
   * Delete single item or series progress from Continue Watching
   */
  async deleteProgress(
    token: string | null | undefined,
    contentId: string,
    season?: number,
    episode?: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!token) {
      return { success: false, error: 'Token tidak tersedia.' };
    }

    try {
      const query = new URLSearchParams();
      if (season !== undefined) query.set('season', String(season));
      if (episode !== undefined) query.set('episode', String(episode));

      const url = `/api/progress/${encodeURIComponent(contentId)}${query.toString() ? `?${query.toString()}` : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          success: false,
          error: data.error || 'Gagal menghapus progres.',
        };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[progressApi.deleteProgress] Network Error:', err);
      return { success: false, error: 'Gagal menghubungi server.' };
    }
  },

  /**
   * Sync a batch of locally stored items (e.g. from guest state upon login)
   */
  async syncBatch(
    token: string,
    items: WatchProgressItem[]
  ): Promise<{ success: boolean; count?: number; error?: string }> {
    if (!token || items.length === 0) return { success: true, count: 0 };

    try {
      const res = await fetch('/api/progress/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => ({}));
      return {
        success: res.ok,
        count: data.count,
        error: data.error,
      };
    } catch (err: any) {
      console.warn('[progressApi.syncBatch] Error:', err);
      return { success: false, error: 'Sinkronisasi gagal.' };
    }
  },

  /**
   * Clear all progress records for current user
   */
  async clearAll(token: string): Promise<{ success: boolean; error?: string }> {
    if (!token) return { success: false, error: 'Token tidak tersedia.' };

    try {
      const res = await fetch('/api/progress/clear', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      return { success: res.ok };
    } catch (err: any) {
      return { success: false, error: 'Gagal membersihkan progres.' };
    }
  },
};
