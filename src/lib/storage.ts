import { HistoryItem, MyListItem, User, WatchProgress } from '../types';

const SCHEMA_VERSION = 'v2';
const KEYS = {
  HISTORY: `zhafx_history_${SCHEMA_VERSION}`,
  MY_LIST: `zhafx_mylist_${SCHEMA_VERSION}`,
  SEARCH_HISTORY: `zhafx_search_history_${SCHEMA_VERSION}`,
  REPORTED_STREAMS: `zhafx_reported_${SCHEMA_VERSION}`,
  AI_CHAT_SESSION: `zhafx_chat_history_${SCHEMA_VERSION}`,
  USER: `zhafx_user_${SCHEMA_VERSION}`,
  TOKEN: `zhafx_token_${SCHEMA_VERSION}`,
  PROGRESS: `zhafx_progress_${SCHEMA_VERSION}`,
  FOLLOWS: `zhafx_follows_${SCHEMA_VERSION}`,
};

// Helper: resolves user-isolated storage key strictly per account
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

// Safe wrapper for localStorage with strict multi-user isolation
export const storage = {
  // --- Watch History (Strictly User-Isolated, No Cross-Account Bleed) ---
  getHistory(): HistoryItem[] {
    try {
      const scopedKey = getScopedKey(KEYS.HISTORY);
      const data = localStorage.getItem(scopedKey);
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
      const scopedKey = getScopedKey(KEYS.HISTORY);
      const data = localStorage.getItem(scopedKey);
      const current: HistoryItem[] = data ? JSON.parse(data) : [];
      const filtered = Array.isArray(current)
        ? current.filter(
            (h) => !(h.id === item.id && (item.season === undefined || h.season === item.season) && (item.episode === undefined || h.episode === item.episode))
          )
        : [];
      const updated: HistoryItem = {
        ...item,
        updatedAt: Date.now(),
      };
      const next = [updated, ...filtered].slice(0, 60);
      localStorage.setItem(scopedKey, JSON.stringify(next));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to save history item:', e);
    }
  },

  removeHistoryItem(id: string, season?: number, episode?: number): void {
    try {
      const scopedKey = getScopedKey(KEYS.HISTORY);
      const data = localStorage.getItem(scopedKey);
      if (!data) return;
      const current: HistoryItem[] = JSON.parse(data);
      const filtered = Array.isArray(current)
        ? current.filter(
            (h) => !(h.id === id && (season === undefined || h.season === season) && (episode === undefined || h.episode === episode))
          )
        : [];
      localStorage.setItem(scopedKey, JSON.stringify(filtered));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to remove history item:', e);
    }
  },

  clearHistory(): void {
    try {
      const scopedKey = getScopedKey(KEYS.HISTORY);
      localStorage.removeItem(scopedKey);
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to clear history:', e);
    }
  },

  // --- My List / Favorites (Strictly User-Isolated) ---
  getMyList(): MyListItem[] {
    try {
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      const data = localStorage.getItem(scopedKey);
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
      return list.some((item) => item.id === id);
    } catch {
      return false;
    }
  },

  toggleMyList(item: Omit<MyListItem, 'addedAt'>): boolean {
    try {
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      const data = localStorage.getItem(scopedKey);
      const current: MyListItem[] = data ? JSON.parse(data) : [];
      const exists = Array.isArray(current) && current.some((i) => i.id === item.id);
      let next: MyListItem[];
      let isAdded: boolean;

      if (exists) {
        next = current.filter((i) => i.id !== item.id);
        isAdded = false;
      } else {
        const added: MyListItem = { ...item, addedAt: Date.now() };
        next = [added, ...(Array.isArray(current) ? current : [])];
        isAdded = true;
      }
      localStorage.setItem(scopedKey, JSON.stringify(next));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
      return isAdded;
    } catch (e) {
      console.warn('[Storage] Failed to toggle my list:', e);
      return false;
    }
  },

  removeMyListItem(id: string): void {
    try {
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      const data = localStorage.getItem(scopedKey);
      if (!data) return;
      const current: MyListItem[] = JSON.parse(data);
      const filtered = Array.isArray(current) ? current.filter((i) => i.id !== id) : [];
      localStorage.setItem(scopedKey, JSON.stringify(filtered));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to remove item from my list:', e);
    }
  },

  clearMyList(): void {
    try {
      const scopedKey = getScopedKey(KEYS.MY_LIST);
      localStorage.removeItem(scopedKey);
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[Storage] Failed to clear my list:', e);
    }
  },

  // --- Search History (Isolated per User) ---
  getSearchHistory(): string[] {
    try {
      const scopedKey = getScopedKey(KEYS.SEARCH_HISTORY);
      const data = localStorage.getItem(scopedKey);
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
      const scopedKey = getScopedKey(KEYS.SEARCH_HISTORY);
      const current = storage.getSearchHistory().filter((q) => q.toLowerCase() !== trimmed.toLowerCase());
      const next = [trimmed, ...current].slice(0, 8);
      localStorage.setItem(scopedKey, JSON.stringify(next));
    } catch (e) {
      console.warn('[Storage] Failed to save search history:', e);
    }
  },

  removeSearchHistory(query: string): void {
    try {
      const scopedKey = getScopedKey(KEYS.SEARCH_HISTORY);
      const current = storage.getSearchHistory().filter((q) => q.toLowerCase() !== query.toLowerCase());
      localStorage.setItem(scopedKey, JSON.stringify(current));
    } catch (e) {
      console.warn('[Storage] Failed to remove search history:', e);
    }
  },

  clearSearchHistory(): void {
    try {
      const scopedKey = getScopedKey(KEYS.SEARCH_HISTORY);
      localStorage.removeItem(scopedKey);
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
      // Clean up previous guest states so they never spill into the new user account
      localStorage.removeItem(`${KEYS.HISTORY}_guest`);
      localStorage.removeItem(`${KEYS.MY_LIST}_guest`);
      localStorage.removeItem(`${KEYS.PROGRESS}_guest`);

      localStorage.setItem(KEYS.USER, JSON.stringify(user));

      window.dispatchEvent(new Event('zhafx_auth_change'));
      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));

      // Asynchronously sync continue watching progress from server for THIS specific user
      const token = storage.getToken();
      if (token) {
        fetch('/api/progress?all=true', {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-user-email': user.email || '',
          },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.success && Array.isArray(data.progress)) {
              localStorage.setItem(`${KEYS.PROGRESS}_usr_${user.id}`, JSON.stringify(data.progress));
              window.dispatchEvent(new Event('zhafx_storage_change'));
              window.dispatchEvent(new Event('storage'));
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

      // Clean guest states on logout
      localStorage.removeItem(`${KEYS.HISTORY}_guest`);
      localStorage.removeItem(`${KEYS.MY_LIST}_guest`);
      localStorage.removeItem(`${KEYS.PROGRESS}_guest`);

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
    this.removeUser();
  },

  clearAuth(): void {
    this.removeUser();
  },

  // --- Watch Progress & Continue Watching (Strictly User-Scoped) ---
  getProgress(contentId: string, season?: number, episode?: number): WatchProgress | null {
    try {
      const scopedKey = getScopedKey(KEYS.PROGRESS);
      const data = localStorage.getItem(scopedKey);
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
      const data = localStorage.getItem(scopedKey);
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
      const data = localStorage.getItem(scopedKey);
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

      // Synchronize with user's own watch history
      try {
        storage.saveHistory({
          id: item.contentId,
          type: item.mediaType,
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
        });
      } catch {}

      window.dispatchEvent(new Event('zhafx_storage_change'));
      window.dispatchEvent(new Event('storage'));

      // Asynchronously send to server if user is logged in
      const token = storage.getToken();
      const currentUser = storage.getUser();
      if (token) {
        fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-user-email': currentUser?.email || '',
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
      const data = localStorage.getItem(scopedKey);
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

  // --- Followed Friends (User-Isolated) ---
  getFollowingIds(): string[] {
    try {
      const scopedKey = getScopedKey(KEYS.FOLLOWS);
      const data = localStorage.getItem(scopedKey);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  setFollowing(targetUserId: string, isFollowed: boolean): string[] {
    try {
      const scopedKey = getScopedKey(KEYS.FOLLOWS);
      const current = storage.getFollowingIds();
      let updated: string[];
      if (isFollowed) {
        updated = Array.from(new Set([...current, targetUserId]));
      } else {
        updated = current.filter((id) => id !== targetUserId);
      }
      localStorage.setItem(scopedKey, JSON.stringify(updated));
      window.dispatchEvent(new Event('zhafx_follow_change'));
      window.dispatchEvent(new Event('storage'));
      return updated;
    } catch (e) {
      console.warn('[Storage] Failed to set following:', e);
      return storage.getFollowingIds();
    }
  },

  isFollowing(targetUserId: string): boolean {
    const list = storage.getFollowingIds();
    return list.includes(targetUserId);
  },
};
