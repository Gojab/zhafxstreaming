/**
 * Zhafx Configuration
 * All API paths, embed origins, AI models, and field mappings are centralized here.
 */

export const CONFIG = {
  APP_NAME: 'Zhafx',
  APP_SLOGAN: 'Platform Streaming Film, Serial TV & Anime',
  
  // Primary upstream API base URL (empty string uses same-origin server proxy to eliminate CORS)
  API_BASE_URL: '',
  API_BASE_URL_FALLBACK: 'https://api.framextv.xyz',
  API_ANIME_BASE_URL: '/api/anime',
  API_ANIME_BASE_URL_FALLBACK: 'https://api.framextv.tech/anime',
  
  // Embed Player base URL (framextv.cc official active host)
  EMBED_BASE_URL: 'https://framextv.cc/embed',
  
  // Local Proxy Fallback
  PROXY_URL: '/api/proxy',

  // Google OAuth Client ID
  GOOGLE_CLIENT_ID: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '358715674309-hdh36g2l56bqv0rckcvcd4666kemh4sj.apps.googleusercontent.com',

  // AniList GraphQL API (100% free, CORS open, high-res posters & details)
  ANILIST_GRAPHQL_URL: 'https://graphql.anilist.co',

  // Gemini AI Models
  AI_MODEL: 'gemini-3.8-flash',
  AI_MODEL_FALLBACK: 'gemini-flash-latest',

  // API Endpoints
  ENDPOINTS: {
    HOME: '/api/home',
    TRENDING: '/api/trending',
    DISCOVER: '/api/discover',
    ANIME_DISCOVER: '/api/discover',
    SEARCH: '/api/search',
    DETAILS: '/api/details',
    SEASON: '/api/season',
    PROVIDERS: '/api/providers',
    META: '/api/meta',
    AI_CHAT: '/api/ai/chat',
  },

  // Cache & Network Policy
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes memory TTL
  REQUEST_TIMEOUT_MS: 12000,   // 12 seconds
  MAX_RETRIES: 2,              // 2 retries with exponential backoff

  // Default Fallback Posters / Images
  PLACEHOLDER_POSTER: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=500&q=80',
  PLACEHOLDER_BACKDROP: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1280&q=80',

  // Genres catalogue for Explore filters
  MOVIE_GENRES: [
    { id: 'all', label: 'Semua Genre' },
    { id: '28', label: 'Aksi' },
    { id: '12', label: 'Petualangan' },
    { id: '16', label: 'Animasi' },
    { id: '35', label: 'Komedi' },
    { id: '80', label: 'Kriminal' },
    { id: '99', label: 'Dokumenter' },
    { id: '18', label: 'Drama' },
    { id: '10751', label: 'Keluarga' },
    { id: '14', label: 'Fantasi' },
    { id: '27', label: 'Horor' },
    { id: '9648', label: 'Misteri' },
    { id: '10749', label: 'Romantis' },
    { id: '878', label: 'Fiksi Ilmiah' },
    { id: '53', label: 'Cerita Seru (Thriller)' },
  ],

  TV_GENRES: [
    { id: 'all', label: 'Semua Genre' },
    { id: '10759', label: 'Aksi & Petualangan' },
    { id: '16', label: 'Animasi' },
    { id: '35', label: 'Komedi' },
    { id: '80', label: 'Kriminal' },
    { id: '99', label: 'Dokumenter' },
    { id: '18', label: 'Drama' },
    { id: '10751', label: 'Keluarga' },
    { id: '10765', label: 'Fiksi Ilmiah & Fantasi' },
    { id: '9648', label: 'Misteri' },
  ],

  ANIME_GENRES: [
    { id: 'all', label: 'Semua Genre' },
    { id: 'Action', label: 'Aksi' },
    { id: 'Adventure', label: 'Petualangan' },
    { id: 'Comedy', label: 'Komedi' },
    { id: 'Drama', label: 'Drama' },
    { id: 'Fantasy', label: 'Fantasi' },
    { id: 'Horror', label: 'Horor' },
    { id: 'Mystery', label: 'Misteri' },
    { id: 'Romance', label: 'Romansa' },
    { id: 'Sci-Fi', label: 'Sci-Fi' },
    { id: 'Supernatural', label: 'Supernatural' },
  ],

  SORT_OPTIONS: [
    { value: 'popularity.desc', label: 'Paling Populer' },
    { value: 'vote_average.desc', label: 'Rating Tertinggi' },
    { value: 'primary_release_date.desc', label: 'Terbaru' },
    { value: 'title.asc', label: 'Abjad (A - Z)' },
  ],

  // Official Copyright Statements
  COPYRIGHT: '© 2026 ZHAFX. All Rights Reserved.',
  DISCLAIMER: 'All content, design, and materials on this website are protected by applicable copyright laws. Unauthorized copying, reproduction, distribution, or commercial use without prior permission is strictly prohibited.',
  TAGLINE_COPYRIGHT: '© 2026 ZHAFX. Built for Entertainment, Designed for You. All Rights Reserved.',
};
