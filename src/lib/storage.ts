import { HistoryItem, MyListItem, User, WatchProgress } from '../types';

const SCHEMA_VERSION = 'v1';
const KEYS = {
  HISTORY: `zhafx_history_${SCHEMA_VERSION}`,
  MY_LIST: `zhafx_mylist_${SCHEMA_VERSION}`,
  SEARCH_HISTORY: `zhafx_search_history_${SCHEMA_VERSION}`,
  REPORTED_STREAMS: `zhafx_reported_${SCHEMA_VERSION}`,
  AI_CHAT_SESSION: `zhafx_chat_history_${SCHEMA_VERSION}`,
  USER: `zhafx_user_${SCHEMA_VERSION}`,
  TOKEN: `zhafx_token_${SCHEMA_VERSION}`,
  PROGRESS: `zhafx_progress_${SCHEMA_VERSION}`,
};

// Helper: resolves user-isolated storage key
function getScopedKey(baseKey: string): string {
  try {
    const rawUser = localStorage.getItem(KEYS.USER);
    if (rawUser) {
      const user = JSON.parse(rawUser);
      if (user && user.id) {
        return `${baseKey}_usr_${user.id}`;
      }
    }
  } catch {
    // fallback
  }
  return `${baseKey}_guest`;
}

// Safe wrapper for localStorage
export const storage = {
  // --- Watch History (User-Isolated) ---
  getHistory(): HistoryItem[] {
    try {
      const scopedKey = getScopedKey(KEYS.HISTORY);
      let data = localStorage.getItem(scopedKey);

      // If scoped key is empty and user is logged in, check legacy unscoped key and migrate
      if (!data && scopedKey !== `${KEYS.HISTORY}_guest`) {
        const legacy = localStorage.getItem(KEYS.HISTORY) || localStorage.getItem(`${KEYS.HISTORY}_guest`);
        if (legacy) {
          try {
            const parsedLegacy = JSON.parse(legacy);
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
              localStorage.setItem(scopedKey, legacy);
              data = legacy;
            }
          } catch {
            // ignore
          }
        }
      }

      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[Storage] Failed to read history:', e);
      return [];
    }
  },

  saveHistory(item: Omit<HistoryItem, 'updatedAt'>): void {
    try {
      const current = storage.getHistory();
      const filtered = current.filter(
        h => !(h.id === item.id && h.season === item.season && h.episode === item.episode)
      );
      const updated: HistoryItem = {
        ...item,
        updatedAt: Date.now(),
      };
      const next = [updated, ...filtered].slice(0, 50);
      const scopedKey = getScopedKey(KEYS.HISTORY);
      localStorage.setItem(scopedKey, JSON.stringify(next));
      window.dispatchEvent(new Event('zhafx_storage_change'));
    } catch (e) {
      console.warn('[Storage] Failed to save history item:', e);
    }
  },

  removeHistoryItem(id: string, season?: number, episode?: number): void {
    try {
      const current = storage.getHistory();
      const filtered = current.filter(
        h => !(h.id === id && (season === undefined || h.season === season) && (episode === undefined || h.episode === episode))
      );
      const scopedKey = getScopedKey(KEYS.HISTORY);
      localStorage.setItem(scopedKey, JSON.stringify(filtered));
      window.dispatchEvent(new Event('zhafx_storage_change'));
    } catch (e) {
      console.warn('[Storage] Failed to remove history item:', e);
    }
  },

  clearHistory(): void {
    try {
      const scopedKey = getScopedKey(KEYS.HISTORY);
      localStorage.removeItem(scopedKey);
      window.dispatchEvent(new Event('zhafx_storage_change'));
    } catch (e) {
      console.warn('[Storage] Failed to clear history:', e);
    }
  },

  // --- My List / Favorites (User-Isolated) ---
  getMyList(): MyListItem[] {
    try {
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      let data = localStorage.getItem(scopedKey);

      // If scoped key is empty and user is logged in, check legacy unscoped key and migrate
      if (!data && scopedKey !== `${KEYS.MY_LIST}_guest`) {
        const legacy = localStorage.getItem(KEYS.MY_LIST) || localStorage.getItem(`${KEYS.MY_LIST}_guest`);
        if (legacy) {
          try {
            const parsedLegacy = JSON.parse(legacy);
            if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
              localStorage.setItem(scopedKey, legacy);
              data = legacy;
            }
          } catch {
            // ignore
          }
        }
      }

      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[Storage] Failed to read my list:', e);
      return [];
    }
  },

  isInMyList(id: string): boolean {
    try {
      const list = storage.getMyList();
      return list.some(item => item.id === id);
    } catch {
      return false;
    }
  },

  toggleMyList(item: Omit<MyListItem, 'addedAt'>): boolean {
    try {
      const current = storage.getMyList();
      const exists = current.some(i => i.id === item.id);
      let next: MyListItem[];
      let isAdded: boolean;

      if (exists) {
        next = current.filter(i => i.id !== item.id);
        isAdded = false;
      } else {
        const added: MyListItem = { ...item, addedAt: Date.now() };
        next = [added, ...current];
        isAdded = true;
      }
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      localStorage.setItem(scopedKey, JSON.stringify(next));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      return isAdded;
    } catch (e) {
      console.warn('[Storage] Failed to toggle my list:', e);
      return false;
    }
  },

  removeMyListItem(id: string): void {
    try {
      const current = storage.getMyList();
      const filtered = current.filter(i => i.id !== id);
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      localStorage.setItem(scopedKey, JSON.stringify(filtered));
      window.dispatchEvent(new Event('zhafx_storage_change'));
    } catch (e) {
      console.warn('[Storage] Failed to remove item from my list:', e);
    }
  },

  clearMyList(): void {
    try {
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      localStorage.removeItem(scopedKey);
      window.dispatchEvent(new Event('zhafx_storage_change'));
    } catch (e) {
      console.warn('[Storage] Failed to clear my list:', e);
    }
  },

  // --- Search History (Max 8) ---
  getSearchHistory(): string[] {
    try {
      const data = localStorage.getItem(KEYS.SEARCH_HISTORY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  addSearchHistory(query: string): void {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const current = storage.getSearchHistory().filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...current].slice(0, 8);
      localStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify(next));
    } catch (e) {
      console.warn('[Storage] Failed to save search history:', e);
    }
  },

  removeSearchHistory(query: string): void {
    try {
      const current = storage.getSearchHistory().filter(q => q.toLowerCase() !== query.toLowerCase());
      localStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify(current));
    } catch (e) {
      console.warn('[Storage] Failed to remove search history:', e);
    }
  },

  clearSearchHistory(): void {
    try {
      localStorage.removeItem(KEYS.SEARCH_HISTORY);
    } catch {
      // ignore
    }
  },

  // --- Reported Streams ---
  reportStream(id: string, detail?: string): void {
    try {
      const data = localStorage.getItem(KEYS.REPORTED_STREAMS);
      const current = data ? JSON.parse(data) : [];
      current.push({ id, detail, reportedAt: Date.now() });
      localStorage.setItem(KEYS.REPORTED_STREAMS, JSON.stringify(current));
    } catch {
      // ignore
    }
  },

  isStreamReported(id: string): boolean {
    try {
      const data = localStorage.getItem(KEYS.REPORTED_STREAMS);
      if (!data) return false;
      const current = JSON.parse(data);
      return Array.isArray(current) && current.some((r: any) => r.id === id);
    } catch {
      return false;
    }
  },

  // --- AI Chat in sessionStorage ---
  getChatSession(): any[] {
    try {
      const data = sessionStorage.getItem(KEYS.AI_CHAT_SESSION);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  saveChatSession(messages: any[]): void {
    try {
      sessionStorage.setItem(KEYS.AI_CHAT_SESSION, JSON.stringify(messages));
    } catch {
      // ignore
    }
  },

  clearChatSession(): void {
    try {
      sessionStorage.removeItem(KEYS.AI_CHAT_SESSION);
    } catch {
      // ignore
    }
  },

  // --- Active User Session ---
  getUser(): User | null {
    try {
      const data = localStorage.getItem(KEYS.USER);
      if (!data) return null;
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  },

  saveUser(user: User): void {
    try {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));

      // Auto-migrate guest history & myList into user-scoped keys
      const guestHistory = localStorage.getItem(`${KEYS.HISTORY}_guest`) || localStorage.getItem(KEYS.HISTORY);
      const userHistoryKey = `${KEYS.HISTORY}_usr_${user.id}`;
      if (guestHistory && !localStorage.getItem(userHistoryKey)) {
        localStorage.setItem(userHistoryKey, guestHistory);
      }

      const guestMyList = localStorage.getItem(`${KEYS.MY_LIST}_guest`) || localStorage.getItem(KEYS.MY_LIST);
      const userMyListKey = `${KEYS.MY_LIST}_usr_${user.id}`;
      if (guestMyList && !localStorage.getItem(userMyListKey)) {
        localStorage.setItem(userMyListKey, guestMyList);
      }

      window.dispatchEvent(new Event('zhafx_auth_change'));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));

      // Asynchronously sync continue watching progress from server
      const token = storage.getToken();
      if (token) {
        fetch('/api/progress?all=true', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.success && Array.isArray(data.progress)) {
              localStorage.setItem(`${KEYS.PROGRESS}_usr_${user.id}`, JSON.stringify(data.progress));
              window.dispatchEvent(new Event('zhafx_storage_change'));
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      console.warn('[Storage] Failed to save user:', e);
    }
  },

  removeUser(): void {
    try {
      localStorage.removeItem(KEYS.USER);
      localStorage.removeItem(KEYS.TOKEN);
      sessionStorage.removeItem(KEYS.USER);
      sessionStorage.removeItem(KEYS.TOKEN);
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        } catch {}
      }
      window.dispatchEvent(new Event('zhafx_auth_change'));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to remove user:', e);
    }
  },

  // --- Auth Token ---
  getToken(): string | null {
    try {
      return localStorage.getItem(KEYS.TOKEN);
    } catch {
      return null;
    }
  },

  saveToken(token: string): void {
    try {
      localStorage.setItem(KEYS.TOKEN, token);
    } catch (e) {
      console.warn('[Storage] Failed to save token:', e);
    }
  },

  removeToken(): void {
    try {
      localStorage.removeItem(KEYS.TOKEN);
      localStorage.removeItem(KEYS.USER);
      sessionStorage.removeItem(KEYS.TOKEN);
      sessionStorage.removeItem(KEYS.USER);
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          });
        } catch {}
      }
      window.dispatchEvent(new Event('zhafx_auth_change'));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to remove token:', e);
    }
  },

  clearAuth(): void {
    this.removeUser();
    this.removeToken();
  },

  // --- Watch Progress & Continue Watching (User-Scoped) ---
  getProgress(contentId: string, season?: number, episode?: number): WatchProgress | null {
    try {
      const scopedKey = getScopedKey(KEYS.PROGRESS);
      const data = localStorage.getItem(scopedKey) || localStorage.getItem('zhafx_progress_v1');
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return null;
      return (
        parsed.find(
          (p: WatchProgress) =>
            p.contentId === contentId &&
            (season === undefined || p.season === season) &&
            (episode === undefined || p.episode === episode)
        ) || null
      );
    } catch {
      return null;
    }
  },

  getAllProgress(): WatchProgress[] {
    try {
      const scopedKey = getScopedKey(KEYS.PROGRESS);
      const data = localStorage.getItem(scopedKey) || localStorage.getItem('zhafx_progress_v1');
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return [];
      return parsed.sort((a: WatchProgress, b: WatchProgress) => (b.lastWatchedAt || 0) - (a.lastWatchedAt || 0));
    } catch {
      return [];
    }
  },

  saveProgress(item: {
    contentId: string;
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
    progressPercentage?: number;
    completed?: boolean;
  }): void {
    try {
      if (!item.contentId) return;

      const duration = Math.max(0, item.duration || 0);
      const currentTime = Math.max(0, item.currentTime || 0);
      const progressPercentage =
        item.progressPercentage !== undefined
          ? item.progressPercentage
          : duration > 0
          ? Math.min(100, Math.round((currentTime / duration) * 100))
          : 0;

      const completed = item.completed ?? (progressPercentage >= 95);

      const scopedKey = getScopedKey(KEYS.PROGRESS);
      const data = localStorage.getItem(scopedKey) || localStorage.getItem('zhafx_progress_v1');
      const current: WatchProgress[] = data ? JSON.parse(data) : [];

      const filtered = Array.isArray(current)
        ? current.filter(
            (p: WatchProgress) =>
              !(
                p.contentId === item.contentId &&
                (item.season === undefined || p.season === item.season) &&
                (item.episode === undefined || p.episode === item.episode)
              )
          )
        : [];

      const updatedProgress: WatchProgress = {
        id: `${item.contentId}_s${item.season || 1}_e${item.episode || 1}`,
        contentId: item.contentId,
        mediaType: item.mediaType,
        title: item.title,
        poster: item.poster,
        backdrop: item.backdrop,
        year: item.year,
        season: item.season,
        episode: item.episode,
        episodeName: item.episodeName,
        currentTime,
        duration,
        progressPercentage,
        lastWatchedAt: Date.now(),
        completed,
      };

      const next = [updatedProgress, ...filtered].slice(0, 100);
      localStorage.setItem(scopedKey, JSON.stringify(next));

      // Synchronize with watch history item so history card also has live timestamp
      try {
        const historyList = storage.getHistory();
        const existingHistory = historyList.find(
          (h) =>
            h.id === item.contentId &&
            (item.season === undefined || h.season === item.season) &&
            (item.episode === undefined || h.episode === item.episode)
        );

        storage.saveHistory({
          id: item.contentId,
          type: item.mediaType,
          title: item.title,
          poster: item.poster,
          backdrop: item.backdrop,
          year: item.year,
          season: item.season,
          episode: item.episode,
          episodeName: item.episodeName || existingHistory?.episodeName,
          currentTime,
          duration,
          progressPercentage,
        });
      } catch {}

      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));

      // Asynchronously send to server if user is logged in
      const token = storage.getToken();
      if (token) {
        fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedProgress),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[Storage] Failed to save watch progress:', e);
    }
  },

  removeProgress(contentId: string, season?: number, episode?: number): void {
    try {
      const scopedKey = getScopedKey(KEYS.PROGRESS);
      const data = localStorage.getItem(scopedKey) || localStorage.getItem('zhafx_progress_v1');
      if (!data) return;
      const current: WatchProgress[] = JSON.parse(data);
      if (!Array.isArray(current)) return;

      const filtered = current.filter(
        (p) =>
          !(
            p.contentId === contentId &&
            (season === undefined || p.season === season) &&
            (episode === undefined || p.episode === episode)
          )
      );
      localStorage.setItem(scopedKey, JSON.stringify(filtered));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to remove watch progress:', e);
    }
  },

  clearProgress(): void {
    try {
      const scopedKey = getScopedKey(KEYS.PROGRESS);
      localStorage.removeItem(scopedKey);
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to clear watch progress:', e);
    }
  },
};
