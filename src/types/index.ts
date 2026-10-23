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

export interface CastMember {
  id: string | number;
  name: string;
  character?: string;
  profile?: string;
  profilePath?: string;
  role?: string;
  voiceActor?: string;
  voiceActorImage?: string;
}

export interface VideoTrailer {
  id: string;
  key: string;
  name: string;
  site?: string;
  type?: string;
}

export interface StreamSource {
  url: string;
  directUrl?: string;
  proxiedUrl?: string;
  rawUrl?: string;
  quality?: string;
  type?: string;
  server?: string;
  audio?: string;
  headers?: Record<string, string>;
}

export interface SubtitleTrack {
  url: string;
  directUrl?: string;
  proxiedUrl?: string;
  rawUrl?: string;
  lang?: string;
  language?: string;
  label?: string;
}

export interface StreamData {
  success: boolean;
  provider: string;
  attemptedProvider?: string;
  fallbackApplied?: boolean;
  server?: string;
  audio?: 'sub' | 'dub';
  sources: StreamSource[];
  subtitles?: SubtitleTrack[];
  isDirect?: boolean;
  streamType?: string;
  embedUrl?: string;
  servers?: Array<{ name: string; url?: string; dataContent?: string; isDirect?: boolean }>;
  sourceEngine?: string;
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
  releaseDate?: string;
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: Season[];
  episodes?: Episode[];
  cast?: CastMember[];
  trailers?: VideoTrailer[];
  videos?: VideoTrailer[];
  similar?: Title[];
  season?: number;
  episode?: number;
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
  stillPath?: string;
  airDate?: string;
  voteAverage?: number;
  runtime?: number | string;
}

export interface Provider {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
  status?: string;
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
  currentTime?: number;
  duration?: number;
  progressPercentage?: number;
  updatedAt: number;
}

export interface WatchProgress {
  id?: string;
  userId?: string;
  contentId: string;
  mediaType: MediaType;
  title: string;
  poster: string;
  backdrop?: string;
  year: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  currentTime: number;
  duration: number;
  progressPercentage: number;
  lastWatchedAt: number;
  completed?: boolean;
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

export interface CommunityFriend {
  id: string;
  name: string;
  username: string;
  email?: string;
  avatar?: string;
  bio?: string;
  badge: string;
  isFollowing: boolean;
  isCurrentUser: boolean;
  followersCount: number;
  followingCount: number;
  watchTimeHours: number;
  completedCount: number;
  streakDays: number;
  rank: number;
  currentWatching?: {
    title: string;
    type: MediaType;
    poster: string;
    season?: number;
    episode?: number;
    percentage?: number;
  };
}

export interface FriendActivity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  action: 'watching' | 'completed' | 'rated' | 'added_list';
  mediaId: string;
  mediaTitle: string;
  mediaType: MediaType;
  poster: string;
  season?: number;
  episode?: number;
  rating?: number;
  percentage?: number;
  timestamp: number;
}

export interface TopWatchedRankingTitle {
  id: string;
  title: string;
  type: MediaType;
  poster: string;
  backdrop?: string;
  year: string;
  rating: string;
  genres: string[];
  viewsCount: number;
  liveWatchers: number;
  rank: number;
}

export interface TopWatcherUser {
  rank: number;
  userId: string;
  name: string;
  username: string;
  avatar?: string;
  badge: string;
  watchTimeHours: number;
  completedCount: number;
  streakDays: number;
  isFollowing: boolean;
  isCurrentUser: boolean;
}

export interface UserProfileDetail {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  badge: string;
  joinedAt: number;
  isFollowing: boolean;
  isCurrentUser: boolean;
  followersCount: number;
  followingCount: number;
  watchTimeHours: number;
  completedCount: number;
  streakDays: number;
  rank: number;
  currentWatching?: {
    title: string;
    type: MediaType;
    poster: string;
    season?: number;
    episode?: number;
    percentage?: number;
  };
  recentActivities: FriendActivity[];
}
