import { HistoryItem, MyListItem, User } from '../types';

const SCHEMA_VERSION = 'v1';
const KEYS = {
  HISTORY: `zhafx_history_${SCHEMA_VERSION}`,
  MY_LIST: `zhafx_mylist_${SCHEMA_VERSION}`,
  SEARCH_HISTORY: `zhafx_search_history_${SCHEMA_VERSION}`,
  REPORTED_STREAMS: `zhafx_reported_${SCHEMA_VERSION}`,
  AI_CHAT_SESSION: `zhafx_chat_history_${SCHEMA_VERSION}`,
  USER: `zhafx_user_${SCHEMA_VERSION}`,
  TOKEN: `zhafx_token_${SCHEMA_VERSION}`,
  ACCOUNTS: `zhafx_accounts_${SCHEMA_VERSION}`,
};

// Safe wrapper for localStorage
export const storage = {
  // --- Watch History ---
  getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(KEYS.HISTORY);
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
      // Remove existing entry for the same media & season & episode if exists
      const filtered = current.filter(
        h => !(h.id === item.id && h.season === item.season && h.episode === item.episode)
      );
      const updated: HistoryItem = {
        ...item,
        updatedAt: Date.now(),
      };
      // Keep up to 50 items, latest first
      const next = [updated, ...filtered].slice(0, 50);
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(next));
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
      localStorage.setItem(KEYS.HISTORY, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[Storage] Failed to remove history item:', e);
    }
  },

  clearHistory(): void {
    try {
      localStorage.removeItem(KEYS.HISTORY);
    } catch (e) {
      console.warn('[Storage] Failed to clear history:', e);
    }
  },

  // --- My List (Watchlist) ---
  getMyList(): MyListItem[] {
    try {
      const data = localStorage.getItem(KEYS.MY_LIST);
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
      localStorage.setItem(KEYS.MY_LIST, JSON.stringify(next));
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
      localStorage.setItem(KEYS.MY_LIST, JSON.stringify(filtered));
    } catch (e) {
      console.warn('[Storage] Failed to remove item from my list:', e);
    }
  },

  clearMyList(): void {
    try {
      localStorage.removeItem(KEYS.MY_LIST);
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
      const parsed = JSON.parse(data) as User;
      // Safeguard: Do not load legacy owner account
      if (parsed?.email?.includes('zhafran') || parsed?.username?.includes('zhafran')) {
        localStorage.removeItem(KEYS.USER);
        localStorage.removeItem(KEYS.TOKEN);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  saveUser(user: User): void {
    try {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      window.dispatchEvent(new Event('zhafx_auth_change'));
    } catch (e) {
      console.warn('[Storage] Failed to save user:', e);
    }
  },

  removeUser(): void {
    try {
      localStorage.removeItem(KEYS.USER);
      window.dispatchEvent(new Event('zhafx_auth_change'));
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
    } catch (e) {
      console.warn('[Storage] Failed to remove token:', e);
    }
  },

  // --- Watch Progress ---
  getProgress(contentId: string, season?: number, episode?: number): any | null {
    try {
      const data = localStorage.getItem('zhafx_progress_v1');
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) return null;
      return parsed.find(
        (p: any) =>
          p.contentId === contentId &&
          (season === undefined || p.season === season) &&
          (episode === undefined || p.episode === episode)
      ) || null;
    } catch {
      return null;
    }
  },

  saveProgress(item: any): void {
    try {
      const data = localStorage.getItem('zhafx_progress_v1');
      const current = data ? JSON.parse(data) : [];
      const filtered = Array.isArray(current)
        ? current.filter(
            (p: any) =>
              !(
                p.contentId === item.contentId &&
                p.season === item.season &&
                p.episode === item.episode
              )
          )
        : [];
      const updated = {
        ...item,
        lastWatchedAt: Date.now(),
      };
      const next = [updated, ...filtered].slice(0, 100);
      localStorage.setItem('zhafx_progress_v1', JSON.stringify(next));

      // Asynchronously send to server if logged in
      const token = storage.getToken();
      if (token) {
        fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updated),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('[Storage] Failed to save watch progress:', e);
    }
  },
};

// Automatic one-time cleanup for any legacy accounts or owner data in client storage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('zhafx_accounts_v1');
    const existingUserData = localStorage.getItem(KEYS.USER);
    if (existingUserData && existingUserData.includes('zhafran')) {
      localStorage.removeItem(KEYS.USER);
      localStorage.removeItem(KEYS.TOKEN);
    }
  }
} catch {
  // silent
}
