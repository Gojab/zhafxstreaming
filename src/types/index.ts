export type MediaType = 'movie' | 'tv' | 'anime';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  joinedAt: number;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  message?: string;
}

export interface Title {
  id: string;
  type: MediaType;
  title: string;
  originalTitle?: string;
  poster: string;
  backdrop?: string;
  year: string;
  rating: string;
  overview: string;
  genres: string[];
  runtime?: string | number;
  voteCount?: number;
  tagline?: string;
  status?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: Season[];
  episodes?: Episode[];
  similar?: Title[];
}

export interface Season {
  id?: number | string;
  number: number;
  name: string;
  overview?: string;
  poster?: string;
  episodeCount?: number;
  episodes?: Episode[];
}

export interface Episode {
  id?: number | string;
  number: number;
  seasonNumber?: number;
  name?: string;
  overview?: string;
  still?: string;
  airDate?: string;
}

export interface Provider {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
  status?: string;
}

export interface WatchProgressItem {
  id: string; // Unique ID: e.g. `${userId}_${contentId}_s${season || 1}_e${episode || 1}`
  userId: string;
  contentId: string;
  episodeId?: string;
  mediaType: MediaType;
  title: string;
  poster: string;
  backdrop?: string;
  year: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  progressPercentage: number; // 0 to 100
  lastWatchedAt: number; // epoch ms
  completed: boolean;
}

export interface HistoryItem {
  id: string;
  type: MediaType;
  title: string;
  poster: string;
  backdrop?: string;
  year: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  updatedAt: number;
  progressSeconds?: number;
  durationSeconds?: number;
  progressPercentage?: number;
}

export interface MyListItem {
  id: string;
  type: MediaType;
  title: string;
  poster: string;
  backdrop?: string;
  year: string;
  rating: string;
  addedAt: number;
}

export interface RecommendationPick {
  title: string;
  type?: 'movie' | 'tv' | 'anime';
  year?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  picks?: RecommendationPick[];
  isStreaming?: boolean;
  error?: string;
}
