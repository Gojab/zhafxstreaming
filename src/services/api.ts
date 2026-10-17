import { CONFIG } from '../config';
import { Title, Episode, Season, Provider, MediaType, StreamData } from '../types';

// In-memory TTL Cache
interface CacheEntry<T> {
  data: T;
  expiry: number;
}
const memoryCache = new Map<string, CacheEntry<any>>();

// Concurrent In-Flight Request Deduplication
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Normalizes raw upstream data safely into internal Title schema.
 * Resilient against missing, undefined, or malformed fields.
 */
export function normalize(raw: any, defaultType: MediaType = 'movie'): Title {
  if (!raw || typeof raw !== 'object') {
    return {
      id: String(Math.random()),
      type: defaultType,
      title: 'Judul Tidak Diketahui',
      poster: CONFIG.PLACEHOLDER_POSTER,
      backdrop: CONFIG.PLACEHOLDER_BACKDROP,
      year: new Date().getFullYear().toString(),
      rating: '0.0',
      overview: 'Informasi sinopsis belum tersedia.',
      genres: [],
    };
  }

  // Determine media type
  let detectedType: MediaType = defaultType;
  if (raw.type === 'tv' || raw.type === 'anime' || raw.type === 'movie') {
    detectedType = raw.type;
  } else if (raw.media_type === 'tv' || raw.numberOfSeasons || raw.seasons) {
    detectedType = 'tv';
  } else if (raw.anilistId || raw.animeId || raw.format === 'TV') {
    detectedType = 'anime';
  }

  // Title extraction
  const title =
    raw.title ||
    raw.name ||
    raw.originalTitle ||
    raw.original_name ||
    raw.original_title ||
    'Judul Tidak Diketahui';

  // Year extraction
  let year = '';
  if (raw.year) {
    year = String(raw.year);
  } else if (raw.releaseDate || raw.release_date) {
    year = String(raw.releaseDate || raw.release_date).slice(0, 4);
  } else if (raw.first_air_date) {
    year = String(raw.first_air_date).slice(0, 4);
  } else if (raw.startDate?.year) {
    year = String(raw.startDate.year);
  } else {
    year = '2026';
  }

  // Rating extraction
  let rating = '0.0';
  if (raw.rating !== undefined && raw.rating !== null && raw.rating !== '') {
    const parsed = parseFloat(String(raw.rating));
    rating = isNaN(parsed) ? '0.0' : parsed.toFixed(1);
  } else if (raw.vote_average !== undefined) {
    rating = Number(raw.vote_average).toFixed(1);
  } else if (raw.averageScore !== undefined) {
    rating = (Number(raw.averageScore) / 10).toFixed(1);
  }

  // Poster & Backdrop image urls
  const poster =
    raw.poster ||
    raw.image ||
    raw.poster_path ||
    raw.coverImage?.extraLarge ||
    raw.coverImage?.large ||
    CONFIG.PLACEHOLDER_POSTER;

  const backdrop =
    raw.backdrop ||
    raw.backdrop_path ||
    raw.bannerImage ||
    raw.image ||
    CONFIG.PLACEHOLDER_BACKDROP;

  // Genres
  let genres: string[] = [];
  if (Array.isArray(raw.genres)) {
    genres = raw.genres
      .map((g: any) => (typeof g === 'string' ? g : g?.name || ''))
      .filter(Boolean);
  }

  // Overview / Synopsis
  const overview =
    raw.overview ||
    raw.synopsis ||
    raw.description ||
    'Belum ada sinopsis untuk tayangan ini.';

  // Seasons & Episodes if available
  let seasons: Season[] | undefined;
  if (Array.isArray(raw.seasons)) {
    seasons = raw.seasons.map((s: any) => ({
      id: s.id,
      number: s.number ?? s.season_number ?? 1,
      name: s.name || `Musim ${s.number ?? s.season_number ?? 1}`,
      overview: s.overview || '',
      poster: s.poster || s.poster_path,
      episodeCount: s.episodeCount ?? s.episode_count ?? 1,
    }));
  }

  // Cast members
  let cast: any[] | undefined;
  if (Array.isArray(raw.cast)) {
    cast = raw.cast.map((c: any) => ({
      id: c.id || Math.random().toString(),
      name: c.name || 'Pemeran',
      character: c.character || '',
      profile: c.profile || c.profile_path || '',
      profilePath: c.profile_path || c.profile || '',
    }));
  }

  // Trailers & Videos
  const trailers = Array.isArray(raw.trailers)
    ? raw.trailers
    : Array.isArray(raw.videos)
    ? raw.videos
    : undefined;

  return {
    id: String(raw.id || raw.anilistId || raw.tmdbId || ''),
    type: detectedType,
    title,
    originalTitle: raw.originalTitle || raw.original_title || raw.original_name,
    poster,
    backdrop,
    year,
    rating,
    overview: typeof overview === 'string' ? overview.replace(/<[^>]*>/g, '').trim() : '',
    genres,
    runtime: raw.runtime || raw.duration,
    voteCount: raw.voteCount || raw.vote_count,
    tagline: raw.tagline,
    status: raw.status,
    releaseDate: raw.release_date || raw.releaseDate || raw.first_air_date,
    numberOfSeasons: raw.numberOfSeasons ?? raw.number_of_seasons,
    numberOfEpisodes: raw.numberOfEpisodes ?? raw.number_of_episodes,
    seasons,
    cast,
    trailers,
    videos: trailers,
  };
}

/**
 * Robust fetcher with:
 * - AbortController signal
 * - 12s timeout
 * - 2x retry with exponential backoff
 * - In-memory TTL caching (5 minutes)
 * - In-flight deduplication
 * - Automatic CORS/Proxy fallback
 */
async function fetchWithRetry<T>(
  url: string,
  options: {
    signal?: AbortSignal;
    ttlMs?: number;
    useProxyFallback?: boolean;
  } = {}
): Promise<T> {
  const { signal, ttlMs = CONFIG.CACHE_TTL_MS, useProxyFallback = true } = options;

  // 1. Check in-memory cache
  const cached = memoryCache.get(url);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  // 2. Check in-flight deduplication
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url)!;
  }

  const executeFetch = async (): Promise<T> => {
    let lastError: any = null;

    for (let attempt = 0; attempt <= CONFIG.MAX_RETRIES; attempt++) {
      if (signal?.aborted) {
        throw new DOMException('Permintaan dibatalkan.', 'AbortError');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);

      // Merge signals if parent signal provided
      const abortHandler = () => controller.abort();
      if (signal) {
        signal.addEventListener('abort', abortHandler);
      }

      try {
        let requestUrl = url;
        // If previous attempts failed due to CORS or network, use proxy
        if (attempt > 0 && useProxyFallback) {
          requestUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(url)}`;
        }

        const res = await fetch(requestUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', abortHandler);

        if (!res.ok) {
          throw new Error(`Server merespons dengan status HTTP ${res.status}`);
        }

        const text = await res.text();
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(
            text.startsWith('<') || text.toLowerCase().includes('the page')
              ? `Server merespons dengan halaman HTML (HTTP ${res.status}).`
              : 'Format respons bukan JSON yang valid.'
          );
        }

        // Save to cache
        memoryCache.set(url, {
          data,
          expiry: Date.now() + ttlMs,
        });

        return data;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', abortHandler);
        lastError = err;

        if (signal?.aborted || err.name === 'AbortError') {
          if (signal?.aborted) {
            throw new DOMException('Permintaan dibatalkan.', 'AbortError');
          }
          lastError = new Error('Waktu permintaan habis (timeout 12 detik).');
        }

        // Exponential backoff before retrying
        if (attempt < CONFIG.MAX_RETRIES && !signal?.aborted) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 350));
        }
      }
    }

    if (signal?.aborted) {
      throw new DOMException('Permintaan dibatalkan.', 'AbortError');
    }

    // Try server proxy once as ultimate fallback if not already tried
    if (useProxyFallback && !url.includes(CONFIG.PROXY_URL)) {
      try {
        const proxyUrl = `${CONFIG.PROXY_URL}?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          try {
            const text = await res.text();
            const data = JSON.parse(text);
            memoryCache.set(url, { data, expiry: Date.now() + ttlMs });
            return data;
          } catch {
            // ignore non-json response
          }
        }
      } catch {
        // ignore and throw last error
      }
    }

    throw new Error(
      lastError?.message || 'Gagal memuat data dari server Zhafx. Periksa koneksi internet Anda.'
    );
  };

  const promise = executeFetch().finally(() => {
    inFlightRequests.delete(url);
  });

  inFlightRequests.set(url, promise);
  return promise;
}

export const api = {
  /**
   * Home data containing hero, trending, popular movies, popular TV, anime, etc.
   */
  async getHome(signal?: AbortSignal): Promise<{
    hero: Title | null;
    trending: Title[];
    popularMovies: Title[];
    popularTv: Title[];
    popularAnime: Title[];
    newReleases: Title[];
    actionMovies: Title[];
    scifiMovies: Title[];
  }> {
    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.HOME}`;
    const data = await fetchWithRetry<any>(url, { signal });

    const rails = data.rails || {};
    const hero = data.hero ? normalize(data.hero, data.hero.type || 'movie') : null;

    const parseList = (list: any, defType: MediaType): Title[] => {
      const items = Array.isArray(list) ? list : list?.results || [];
      return items.map((item: any) => normalize(item, defType));
    };

    return {
      hero,
      trending: parseList(rails.trending_movies, 'movie'),
      popularMovies: parseList(rails.popular_movies, 'movie'),
      popularTv: parseList(rails.popular_tv, 'tv'),
      popularAnime: parseList(rails.popular_anime, 'anime'),
      newReleases: parseList(rails.new_releases, 'movie'),
      actionMovies: parseList(rails.action_movies, 'movie'),
      scifiMovies: parseList(rails.scifi_movies, 'movie'),
    };
  },

  /**
   * Trending titles (all or specific type)
   */
  async getTrending(page = 1, signal?: AbortSignal): Promise<{ titles: Title[]; totalPages: number }> {
    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.TRENDING}?page=${page}`;
    const data = await fetchWithRetry<any>(url, { signal });
    const results = data.results || [];
    return {
      titles: results.map((r: any) => normalize(r, r.type || 'movie')),
      totalPages: data.totalPages || 1,
    };
  },

  /**
   * Discover movies or TV shows with filters (genre, year, min rating, sort, page)
   */
  async discover(
    type: 'movie' | 'tv',
    params: {
      genre?: string;
      year?: number;
      minRating?: number;
      sort?: string;
      page?: number;
    } = {},
    signal?: AbortSignal
  ): Promise<{ titles: Title[]; page: number; totalPages: number; totalResults: number }> {
    const q = new URLSearchParams();
    q.set('type', type);
    if (params.genre && params.genre !== 'all') q.set('genre', params.genre);
    if (params.year) q.set('year', String(params.year));
    if (params.minRating) q.set('min_rating', String(params.minRating));
    if (params.sort) q.set('sort', params.sort);
    q.set('page', String(params.page || 1));

    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.DISCOVER}?${q.toString()}`;
    const data = await fetchWithRetry<any>(url, { signal });
    const results = data.results || [];
    return {
      titles: results.map((r: any) => normalize(r, type)),
      page: data.page || 1,
      totalPages: data.totalPages || 1,
      totalResults: data.totalResults || results.length,
    };
  },

  /**
   * Discover anime with filters (Primary: FrameX, Fallback: AniList GraphQL)
   */
  async discoverAnime(
    params: {
      genre?: string;
      year?: number;
      sort?: string;
      page?: number;
    } = {},
    signal?: AbortSignal
  ): Promise<{ titles: Title[]; page: number; totalPages: number; totalResults: number }> {
    const page = params.page || 1;
    const q = new URLSearchParams();
    if (params.genre && params.genre !== 'all') q.set('genre', params.genre);
    if (params.year) q.set('seasonYear', String(params.year));

    // Map TMDB sort strings to FrameX AniList format
    const sortMap: Record<string, string> = {
      'popularity.desc': 'POPULARITY_DESC',
      'vote_average.desc': 'SCORE_DESC',
      'primary_release_date.desc': 'START_DATE_DESC',
      'trending.desc': 'TRENDING_DESC',
      'title.asc': 'TITLE_ROMAJI',
    };
    const mappedSort = (params.sort && sortMap[params.sort]) || params.sort || 'POPULARITY_DESC';
    q.set('sort', mappedSort);
    q.set('page', String(page));
    q.set('perPage', '24');

    const url = `${CONFIG.API_ANIME_BASE_URL}${CONFIG.ENDPOINTS.ANIME_DISCOVER}?${q.toString()}`;

    try {
      const data = await fetchWithRetry<any>(url, { signal, useProxyFallback: true });
      const results = data.results || [];
      if (results.length > 0) {
        return {
          titles: results.map((r: any) => normalize(r, 'anime')),
          page: data.page || page,
          totalPages: data.totalPages || 1,
          totalResults: data.totalResults || results.length,
        };
      }
    } catch (primaryErr: any) {
      console.warn('[API] FrameX anime discover failed or blocked, falling back to AniList GraphQL:', primaryErr?.message);
    }

    // High-Res Resilient Fallback via AniList GraphQL API (Direct CORS allowed, 100% uptime)
    try {
      const anilistQuery = `query ($page: Int, $perPage: Int, $genre: String, $seasonYear: Int, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            lastPage
            currentPage
            hasNextPage
          }
          media(type: ANIME, genre: $genre, seasonYear: $seasonYear, sort: $sort) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            averageScore
            seasonYear
            startDate { year }
            genres
            description
            episodes
            status
          }
        }
      }`;

      const variables: Record<string, any> = {
        page,
        perPage: 24,
        sort: [mappedSort],
      };
      if (params.genre && params.genre !== 'all') {
        variables.genre = params.genre;
      }
      if (params.year) {
        variables.seasonYear = params.year;
      }

      const aniRes = await fetch(CONFIG.ANILIST_GRAPHQL_URL || 'https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: anilistQuery, variables }),
        signal,
      });

      if (aniRes.ok) {
        const aniData = await aniRes.json();
        const mediaList = aniData?.data?.Page?.media || [];
        const pageInfo = aniData?.data?.Page?.pageInfo;

        const titles: Title[] = mediaList.map((m: any) => ({
          id: String(m.id),
          type: 'anime',
          title: m.title?.english || m.title?.romaji || m.title?.native || 'Anime',
          originalTitle: m.title?.native || m.title?.romaji,
          poster: m.coverImage?.extraLarge || m.coverImage?.large || CONFIG.PLACEHOLDER_POSTER,
          backdrop: m.bannerImage || m.coverImage?.extraLarge || CONFIG.PLACEHOLDER_BACKDROP,
          year: String(m.startDate?.year || m.seasonYear || '2024'),
          rating: m.averageScore ? (m.averageScore / 10).toFixed(1) : '8.5',
          overview: m.description ? m.description.replace(/<[^>]*>/g, '').trim() : 'Informasi sinopsis belum tersedia.',
          genres: m.genres || ['Anime'],
          numberOfEpisodes: m.episodes || 24,
          status: m.status,
        }));

        return {
          titles,
          page: pageInfo?.currentPage || page,
          totalPages: pageInfo?.lastPage || 1,
          totalResults: pageInfo?.total || titles.length,
        };
      }
    } catch (fallbackErr: any) {
      console.error('[API] AniList GraphQL fallback error:', fallbackErr?.message);
    }

    // Return empty list instead of crashing UI with 403
    return {
      titles: [],
      page,
      totalPages: 1,
      totalResults: 0,
    };
  },

  /**
   * Global Search across movies, TV, and anime
   */
  async search(query: string, page = 1, signal?: AbortSignal): Promise<{ titles: Title[]; totalPages: number }> {
    const trimmed = query.trim();
    if (!trimmed) return { titles: [], totalPages: 0 };

    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SEARCH}?q=${encodeURIComponent(trimmed)}&page=${page}`;
    const data = await fetchWithRetry<any>(url, { signal, ttlMs: 2 * 60 * 1000 });
    const results = data.results || [];
    return {
      titles: results.map((r: any) => normalize(r, r.type || 'movie')),
      totalPages: data.totalPages || 1,
    };
  },

  /**
   * Get title detail by ID and type
   */
  /**
   * Get title detail by ID and type
   */
  async getDetails(id: string, type: MediaType = 'movie', signal?: AbortSignal): Promise<Title> {
    if (type === 'anime') {
      let animeCast: any[] = [];
      let animeEpisodesCount = 24;
      let aniMeta: any = null;

      // 1. Fetch official anime meta from FrameX anime backend
      try {
        const framexMetaUrl = `${CONFIG.API_ANIME_BASE_URL}${CONFIG.ENDPOINTS.META}?id=${encodeURIComponent(id)}`;
        const metaRes = await fetchWithRetry<any>(framexMetaUrl, { signal, ttlMs: 15 * 60 * 1000, useProxyFallback: true });
        if (metaRes && metaRes.meta) {
          aniMeta = metaRes.meta;
          if (typeof aniMeta.episodes === 'number') {
            animeEpisodesCount = aniMeta.episodes;
          }
        }
      } catch {
        // Fallback to GraphQL
      }

      // 2. Fetch characters & voice actors from AniList GraphQL
      try {
        const numericId = parseInt(id, 10);
        const query = isNaN(numericId)
          ? `query ($search: String) {
              Media(search: $search, type: ANIME) {
                id
                title { romaji english native }
                description
                episodes
                bannerImage
                coverImage { extraLarge large }
                averageScore
                startDate { year }
                genres
                status
                streamingEpisodes {
                  title
                  thumbnail
                  url
                  site
                }
                characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
                  edges {
                    role
                    node {
                      id
                      name { full native userPreferred }
                      image { medium large }
                    }
                    voiceActors(language: JAPANESE) {
                      name { full }
                      image { medium }
                    }
                  }
                }
              }
            }`
          : `query ($id: Int) {
              Media(id: $id, type: ANIME) {
                id
                title { romaji english native }
                description
                episodes
                bannerImage
                coverImage { extraLarge large }
                averageScore
                startDate { year }
                genres
                status
                streamingEpisodes {
                  title
                  thumbnail
                  url
                  site
                }
                characters(perPage: 12, sort: [ROLE, RELEVANCE]) {
                  edges {
                    role
                    node {
                      id
                      name { full native userPreferred }
                      image { medium large }
                    }
                    voiceActors(language: JAPANESE) {
                      name { full }
                      image { medium }
                    }
                  }
                }
              }
            }`;

        const variables = isNaN(numericId) ? { search: id } : { id: numericId };

        let aniData: any = null;
        try {
          const aniRes = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables }),
            signal,
          });
          if (aniRes.ok) {
            try {
              const text = await aniRes.text();
              aniData = JSON.parse(text);
            } catch {
              aniData = null;
            }
          }
        } catch {
          // If direct fetch blocked by browser adblock/CORS, use proxy
          try {
            const proxyRes = await fetch(`${CONFIG.PROXY_URL}?url=${encodeURIComponent('https://graphql.anilist.co')}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query, variables }),
              signal,
            });
            if (proxyRes.ok) {
              try {
                const text = await proxyRes.text();
                aniData = JSON.parse(text);
              } catch {
                aniData = null;
              }
            }
          } catch {
            // silent
          }
        }

        const media = aniData?.data?.Media;
        if (media) {
          const epCount = aniMeta?.episodes || media.episodes || animeEpisodesCount || 24;
          const animeTitle = media.title?.english || aniMeta?.title?.english || media.title?.romaji || media.title?.native || 'Anime';

          if (Array.isArray(media.characters?.edges)) {
            animeCast = media.characters.edges.map((edge: any) => ({
              id: edge.node?.id || Math.random().toString(),
              name: edge.node?.name?.full || edge.node?.name?.userPreferred || 'Karakter',
              character: edge.role === 'MAIN' ? 'Karakter Utama' : 'Pemeran Pendukung',
              profile: edge.node?.image?.large || edge.node?.image?.medium || '',
              profilePath: edge.node?.image?.large || edge.node?.image?.medium || '',
              role: edge.role,
              voiceActor: edge.voiceActors?.[0]?.name?.full,
              voiceActorImage: edge.voiceActors?.[0]?.image?.medium,
            }));
          }

          // Extract anime episode thumbnails
          let animeEpisodes: Episode[] = [];
          if (Array.isArray(media.streamingEpisodes) && media.streamingEpisodes.length > 0) {
            animeEpisodes = media.streamingEpisodes.map((se: any, idx: number) => ({
              id: `${id}-${idx + 1}`,
              number: idx + 1,
              seasonNumber: 1,
              name: se.title || `Episode ${idx + 1}`,
              still: se.thumbnail || media.bannerImage || media.coverImage?.extraLarge || '',
              stillPath: se.thumbnail || media.bannerImage || media.coverImage?.extraLarge || '',
            }));
          }

          return {
            id: String(media.id || id),
            type: 'anime',
            title: animeTitle,
            originalTitle: media.title?.native || media.title?.romaji,
            poster: media.coverImage?.extraLarge || media.coverImage?.large || aniMeta?.coverImage?.extraLarge || CONFIG.PLACEHOLDER_POSTER,
            backdrop: media.bannerImage || aniMeta?.bannerImage || media.coverImage?.extraLarge || CONFIG.PLACEHOLDER_BACKDROP,
            year: String(media.startDate?.year || aniMeta?.seasonYear || '2024'),
            rating: media.averageScore ? (media.averageScore / 10).toFixed(1) : (aniMeta?.averageScore ? (aniMeta.averageScore / 10).toFixed(1) : '8.5'),
            overview: media.description
              ? media.description.replace(/<[^>]*>/g, '').trim()
              : (aniMeta?.description ? aniMeta.description.replace(/<[^>]*>/g, '').trim() : 'Sinopsis belum tersedia.'),
            genres: media.genres || aniMeta?.genres || ['Action', 'Fantasy'],
            numberOfEpisodes: Math.max(animeEpisodes.length, epCount),
            status: media.status || aniMeta?.status,
            cast: animeCast,
            episodes: animeEpisodes.length > 0 ? animeEpisodes : undefined,
          };
        }
      } catch (aniErr) {
        console.warn('[API] AniList anime details warning:', aniErr);
      }

      // Safe fallback for anime if GraphQL fails
      return {
        id,
        type: 'anime',
        title: aniMeta?.title?.english || aniMeta?.title?.romaji || `Anime #${id}`,
        poster: aniMeta?.coverImage?.extraLarge || aniMeta?.coverImage?.large || CONFIG.PLACEHOLDER_POSTER,
        backdrop: aniMeta?.bannerImage || CONFIG.PLACEHOLDER_BACKDROP,
        year: String(aniMeta?.seasonYear || '2024'),
        rating: aniMeta?.averageScore ? (aniMeta.averageScore / 10).toFixed(1) : '8.5',
        overview: aniMeta?.description ? aniMeta.description.replace(/<[^>]*>/g, '').trim() : 'Tayangan anime berkualitas tinggi siap diputar di Zhafx.',
        genres: aniMeta?.genres || ['Action', 'Anime'],
        numberOfEpisodes: aniMeta?.episodes || 24,
        status: aniMeta?.status,
        cast: animeCast,
      };
    }

    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.DETAILS}?id=${encodeURIComponent(id)}&type=${type}`;
    const data = await fetchWithRetry<any>(url, { signal });
    const normalized = normalize(data, type);

    // If TV show, ensure seasons are properly populated with clean numbers
    if (data.seasons && Array.isArray(data.seasons) && data.seasons.length > 0) {
      normalized.seasons = data.seasons.map((s: any) => ({
        id: s.id,
        number: s.number ?? s.season_number ?? 1,
        name: s.name || `Musim ${s.number ?? s.season_number ?? 1}`,
        overview: s.overview || '',
        poster: s.poster || s.poster_path,
        episodeCount: s.episodeCount ?? s.episode_count ?? 1,
      }));
    } else if (type === 'tv') {
      const numSeasons = normalized.numberOfSeasons || 1;
      normalized.seasons = Array.from({ length: numSeasons }, (_, i) => ({
        number: i + 1,
        name: `Musim ${i + 1}`,
        episodeCount: 12,
      }));
    }

    // Cast members
    if (Array.isArray(data.cast) && data.cast.length > 0) {
      normalized.cast = data.cast.map((c: any) => ({
        id: c.id || Math.random().toString(),
        name: c.name || 'Aktor',
        character: c.character || '',
        profile: c.profile || c.profile_path || '',
        profilePath: c.profile_path || c.profile || '',
      }));
    }

    // Trailers & Video Clips
    const trailersList = Array.isArray(data.trailers)
      ? data.trailers
      : Array.isArray(data.videos)
      ? data.videos
      : [];
    if (trailersList.length > 0) {
      normalized.trailers = trailersList.map((t: any) => ({
        id: t.id || t.key || String(Math.random()),
        key: t.key || t.id,
        name: t.name || 'Trailer Resmi',
        site: t.site || 'YouTube',
        type: t.type || 'Trailer',
      }));
      normalized.videos = normalized.trailers;
    }

    // Similar recommendations
    if (Array.isArray(data.recommendations) || Array.isArray(data.similar)) {
      const sim = data.recommendations || data.similar;
      normalized.similar = sim.map((s: any) => normalize(s, type));
    }

    return normalized;
  },

  /**
   * Get Season episodes for TV series with thumbnail still images from FrameX TV API
   */
  async getSeasonEpisodes(id: string, seasonNumber = 1, signal?: AbortSignal): Promise<Episode[]> {
    const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SEASON}?id=${encodeURIComponent(id)}&season=${seasonNumber}`;
    const data = await fetchWithRetry<any>(url, { signal, ttlMs: 15 * 60 * 1000 });
    if (!data || !Array.isArray(data.episodes)) {
      return [];
    }
    return data.episodes.map((ep: any) => {
      let stillImage = ep.still || ep.still_path || '';
      if (stillImage && !stillImage.startsWith('http')) {
        stillImage = `https://image.tmdb.org/t/p/w500${stillImage.startsWith('/') ? '' : '/'}${stillImage}`;
      }
      return {
        id: ep.id || `${id}-${seasonNumber}-${ep.number ?? ep.episode_number ?? 1}`,
        number: ep.number ?? ep.episode_number ?? 1,
        seasonNumber: ep.season_number ?? seasonNumber,
        name: ep.name || `Episode ${ep.number ?? ep.episode_number ?? 1}`,
        overview: ep.overview || '',
        still: stillImage,
        stillPath: stillImage,
        airDate: ep.airDate || ep.air_date,
        voteAverage: ep.vote_average ? Number(ep.vote_average) : undefined,
        runtime: ep.runtime,
      };
    });
  },

  /**
   * Get Anime episodes with thumbnails
   */
  async getAnimeEpisodes(id: string, signal?: AbortSignal): Promise<Episode[]> {
    try {
      const details = await this.getDetails(id, 'anime', signal);
      if (details.episodes && details.episodes.length > 0) {
        return details.episodes;
      }
      const count = details.numberOfEpisodes || 24;
      return Array.from({ length: Math.min(count, 48) }, (_, i) => ({
        id: `${id}-${i + 1}`,
        number: i + 1,
        seasonNumber: 1,
        name: `Episode ${i + 1}`,
        still: details.backdrop || details.poster,
        stillPath: details.backdrop || details.poster,
      }));
    } catch {
      return Array.from({ length: 24 }, (_, i) => ({
        id: `${id}-${i + 1}`,
        number: i + 1,
        seasonNumber: 1,
        name: `Episode ${i + 1}`,
      }));
    }
  },

  /**
   * Get list of streaming providers (Miner, Headhunter, Valkyrie, etc.)
   */
  async getProviders(signal?: AbortSignal, type?: MediaType): Promise<Provider[]> {
    if (type === 'anime') {
      try {
        const url = `${CONFIG.API_ANIME_BASE_URL}${CONFIG.ENDPOINTS.PROVIDERS}`;
        const data = await fetchWithRetry<any>(url, { signal, ttlMs: 15 * 60 * 1000 });
        if (data && Array.isArray(data.providers) && data.providers.length > 0) {
          return [
            { id: 'auto', name: 'FrameX Otomatis (Rekomendasi)', tagline: 'Server Cepat & Multi-Sub' },
            { id: 'direct_stream', name: '⚡ Pemutar Langsung (Direct Stream HLS)', tagline: 'Bypass Iframe • Multi Subtitle Indo' },
            ...data.providers.map((p: any) => ({
              id: p.id,
              name: `FrameX - ${p.name || p.id}`,
              tagline: p.tagline || (p.audio === 'dub' ? 'Audio English Dub' : 'Server Cepat 1080p Softsub'),
              category: p.category || 'anime',
              status: p.status,
            })),
          ];
        }
      } catch {
        // Fallback to official FrameX anime providers
      }

      // Official FrameX Anime Servers
      return [
        { id: 'auto', name: 'FrameX Otomatis (Rekomendasi)', tagline: 'Server Cepat & Multi-Sub' },
        { id: 'direct_stream', name: '⚡ Pemutar Langsung (Direct Stream HLS)', tagline: 'Bypass Iframe • Multi Subtitle Indo' },
        { id: 'grand_warden', name: 'FrameX - Grand Warden XI', tagline: '1080p Ultra Fast Cloud' },
        { id: 'grand_warden_dub', name: 'FrameX - Grand Warden XI (Dub)', tagline: 'Multi-Source Cloud Dub' },
        { id: 'wizard', name: 'FrameX - Wizard I', tagline: 'Dual Audio & Softsub' },
        { id: 'wizard_dub', name: 'FrameX - Wizard I (Dub)', tagline: 'Dual Audio English Dub' },
        { id: 'valkyrie', name: 'FrameX - Valkyrie II', tagline: 'FlixCloud HD' },
        { id: 'archer', name: 'FrameX - Archer IV', tagline: 'Multi-Audio' },
        { id: 'goblin', name: 'FrameX - Goblin V', tagline: 'Direct Fast Auto Stream' },
        { id: 'dragon', name: 'FrameX - Dragon VIII', tagline: 'VidNest Multi-Source' },
      ];
    }

    try {
      const url = `${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.PROVIDERS}`;
      const data = await fetchWithRetry<any>(url, { signal, ttlMs: 15 * 60 * 1000 });
      return data.providers || [];
    } catch {
      // Default fallback providers list
      return [
        { id: 'miner', name: 'Miner XIX', tagline: 'Server Cepat 4K / 1080p' },
        { id: 'headhunter', name: 'Headhunter XXXI', tagline: 'VidLink Server Multi-Sub' },
        { id: 'valkyrie', name: 'Valkyrie VI', tagline: 'Multi-Server Stabil' },
        { id: 'super_barbarian', name: 'Super Barbarian', tagline: 'Direct Auto HLS' },
        { id: 'bowler', name: 'Bowler XVIII', tagline: 'Multi-Bahasa' },
      ];
    }
  },

  /**
   * Fetches direct anime stream and subtitles directly from FrameX API
   */
  async getAnimeStream(params: {
    id: string;
    episode?: number;
    provider?: string;
    audio?: 'sub' | 'dub';
    signal?: AbortSignal;
  }): Promise<StreamData | null> {
    const { id, episode = 1, provider, audio, signal } = params;
    const q = new URLSearchParams();
    q.set('id', String(id));
    q.set('episode', String(episode));
    if (provider && provider !== 'auto' && provider !== 'direct_stream') {
      q.set('provider', provider);
    }
    if (audio) {
      q.set('audio', audio);
    }

    const streamUrl = `${CONFIG.API_ANIME_BASE_URL}/api/stream?${q.toString()}`;
    try {
      const data = await fetchWithRetry<any>(streamUrl, { signal, ttlMs: 10 * 60 * 1000, useProxyFallback: true });
      if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
        // Normalize any relative proxy urls to absolute FrameX tech urls
        const sources = data.sources.map((s: any) => ({
          ...s,
          url: s.url?.startsWith('/anime')
            ? `https://api.framextv.tech${s.url}`
            : s.url?.startsWith('/')
            ? `https://api.framextv.tech/anime${s.url}`
            : s.url,
        }));

        let subtitles = Array.isArray(data.subtitles)
          ? data.subtitles.map((sub: any) => ({
              ...sub,
              url: sub.url?.startsWith('/anime')
                ? `https://api.framextv.tech${sub.url}`
                : sub.url?.startsWith('/')
                ? `https://api.framextv.tech/anime${sub.url}`
                : sub.url,
            }))
          : undefined;

        return {
          success: true,
          provider: data.provider || 'grand_warden',
          server: data.server,
          audio: data.audio || 'sub',
          sources,
          subtitles,
        };
      }
      return null;
    } catch (e: any) {
      console.warn('[API] getAnimeStream failed:', e?.message || e);
      return null;
    }
  },

  /**
   * Builds the official embed URL for the player
   */
  getEmbedUrl(params: {
    type: MediaType;
    id: string;
    season?: number;
    episode?: number;
    server?: string;
    autoplay?: boolean;
    muted?: boolean;
    title?: string;
    poster?: string;
    audio?: 'sub' | 'dub';
  }): string {
    const {
      type,
      id,
      season = 1,
      episode = 1,
      server,
      autoplay = true,
      muted = false,
      title,
      poster,
      audio = 'sub',
    } = params;

    // Official FrameX Anime embed player (https://framextv.xyz only)
    if (type === 'anime') {
      const ep = episode || 1;
      const cleanId = encodeURIComponent(id);

      const q = new URLSearchParams();
      // CRITICAL: backend=prod forces FrameX to target https://api.framextv.tech/anime
      q.set('backend', 'prod');
      q.set('id', String(id));
      q.set('episode', String(ep));
      q.set('season', String(season || 1));
      q.set('type', 'tv');
      q.set('sub_type', audio || 'sub');
      q.set('autoplay', autoplay ? '1' : '0');
      q.set('muted', muted ? '1' : '0');
      if (server && server !== 'auto' && server !== 'direct_stream' && server !== 'framex') {
        q.set('provider', server);
      }
      if (title) q.set('title', title);
      if (poster) q.set('poster', poster);

      // Dedicated FrameX Embed URL for anime: https://framextv.xyz/embed/anime/:id/:episode?...
      return `${CONFIG.EMBED_BASE_URL}/anime/${cleanId}/${ep}?${q.toString()}`;
    }

    let path = '';
    if (type === 'tv') {
      path = `${CONFIG.EMBED_BASE_URL}/tv/${encodeURIComponent(id)}/${season}/${episode}`;
    } else {
      path = `${CONFIG.EMBED_BASE_URL}/${encodeURIComponent(id)}`;
    }

    const query = new URLSearchParams();
    query.set('autoplay', autoplay ? '1' : '0');
    query.set('muted', muted ? '1' : '0');
    if (server && server !== 'auto' && server !== 'direct_stream') {
      query.set('server', server);
    }
    if (title) query.set('title', title);
    if (poster) query.set('poster', poster);

    return `${path}?${query.toString()}`;
  },
};
