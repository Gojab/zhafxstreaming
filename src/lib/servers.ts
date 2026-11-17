import type { MediaType, Provider } from '../types';

export interface ServerOption {
  id: string;
  name: string;
  tagline: string;
  type: 'movie_embed' | 'tv_embed' | 'anime_embed';
  provider: string;
  badge?: string;
  serverParam?: string;
}

export const FRAMEX_API_ORIGIN = 'https://api.framextv.cc';
export const FRAMEX_EMBED_ORIGIN = 'https://framextv.cc';

export const INVALID_OR_LEGACY_PROVIDERS = new Set([
  '',
  'auto',
  'direct_stream',
  'framex',
  'miner',
  'titan',
  'lavahound',
  'valkyrie',
  'headhunter',
  'druid',
  'royal_champion',
  'sparky',
  'dragon_rider',
  'barbarian_king',
  'electro_dragon',
  'minion_prince',
  'monk',
  'skeleton_king',
  'bandit',
  'archer_queen',
  'little_prince',
]);

export const ACTIVE_MOVIE_TV_PROVIDERS = [
  'giant',
  'bowler',
  'executioner',
  'root_rider',
  'hog_rider',
] as const;

export const ACTIVE_ANIME_SUB_PROVIDERS = [
  'grand_warden',
  'wizard',
  'valkyrie',
] as const;

export const ACTIVE_ANIME_DUB_PROVIDERS = [
  'grand_warden_dub',
  'wizard_dub',
  'valkyrie_dub',
] as const;

export const MOVIE_SERVERS: ServerOption[] = [
  {
    id: 'zhafx-movie',
    name: 'ZHAFX',
    tagline: 'Server Utama • Pemutaran Cepat & Stabil',
    type: 'movie_embed',
    provider: 'auto',
    badge: 'Utama',
  },
];

export const TV_SERVERS: ServerOption[] = [
  {
    id: 'zhafx-tv',
    name: 'ZHAFX',
    tagline: 'Server Utama • Serial TV Lengkap',
    type: 'tv_embed',
    provider: 'auto',
    badge: 'Utama',
  },
];

export const ANIME_SERVERS: ServerOption[] = [
  {
    id: 'zhafx-anime',
    name: 'ZHAFX',
    tagline: 'Server Utama • Anime 1080p Sub & Dub',
    type: 'anime_embed',
    provider: 'grand_warden',
    badge: 'Utama',
  },
];

export function getServersForMediaType(mediaType: MediaType): ServerOption[] {
  if (mediaType === 'anime') return ANIME_SERVERS;
  if (mediaType === 'tv') return TV_SERVERS;
  return MOVIE_SERVERS;
}

export function getPrimaryProviderFallback(type: MediaType): Provider[] {
  if (type === 'anime') {
    return [
      {
        id: 'grand_warden',
        name: 'ZHAFX',
        tagline: 'Server Utama • Anime 1080p Sub & Dub',
        category: 'anime',
        status: 'active',
      },
    ];
  }

  return [
    {
      id: 'giant',
      name: 'ZHAFX',
      tagline: type === 'tv' ? 'Server Utama • Serial TV Lengkap' : 'Server Utama • Pemutaran Cepat & Stabil',
      category: type,
      status: 'available',
    },
  ];
}

export function selectPrimaryUpstreamProvider(
  upstreamProviders: Array<{ id?: string; name?: string; tagline?: string; category?: string; status?: string; audio?: string }>,
  type: MediaType
): Provider[] {
  if (!Array.isArray(upstreamProviders) || upstreamProviders.length === 0) {
    return getPrimaryProviderFallback(type);
  }

  if (type === 'anime') {
    const activeSub = upstreamProviders.find(
      (p) =>
        p &&
        p.id &&
        (p.status === 'active' || p.status === 'available' || !p.status) &&
        (!p.audio || p.audio === 'sub' || p.audio === 'both') &&
        ACTIVE_ANIME_SUB_PROVIDERS.includes(p.id as (typeof ACTIVE_ANIME_SUB_PROVIDERS)[number])
    );
    const picked = activeSub || upstreamProviders.find((p) => p?.id && (p.status === 'active' || !p.status));
    if (!picked || !picked.id) {
      return getPrimaryProviderFallback('anime');
    }
    return [
      {
        id: picked.id,
        name: 'ZHAFX',
        tagline: picked.tagline || 'Server Utama • Anime 1080p Sub & Dub',
        category: 'anime',
        status: picked.status || 'active',
      },
    ];
  }

  const available = upstreamProviders.filter(
    (p) => p && p.id && (p.status === 'available' || p.status === 'active')
  );
  const preferred =
    ACTIVE_MOVIE_TV_PROVIDERS.map((id) => available.find((p) => p.id === id)).find(Boolean) ||
    available[0];

  if (!preferred || !preferred.id) {
    return getPrimaryProviderFallback(type);
  }

  return [
    {
      id: preferred.id,
      name: 'ZHAFX',
      tagline: preferred.tagline || 'Server Utama • Pemutaran Cepat & Stabil',
      category: type,
      status: preferred.status || 'available',
    },
  ];
}

export function normalizeMovieTvStreamProvider(provider?: string | null): string | undefined {
  const clean = String(provider || '').trim().toLowerCase();
  if (!clean || INVALID_OR_LEGACY_PROVIDERS.has(clean)) {
    return undefined;
  }
  return clean;
}

export function resolveAnimeProvider(provider?: string | null, audio: 'sub' | 'dub' = 'sub'): string {
  const clean = String(provider || '').trim().toLowerCase();
  const base =
    !clean || clean === 'auto' || clean === 'direct_stream' || clean === 'framex' || clean === 'archer' || clean === 'archer_dub'
      ? 'grand_warden'
      : clean.replace(/_dub$/, '');

  if (audio === 'dub') {
    const dubId = `${base}_dub`;
    if ((ACTIVE_ANIME_DUB_PROVIDERS as readonly string[]).includes(dubId)) {
      return dubId;
    }
    return 'grand_warden_dub';
  }

  if ((ACTIVE_ANIME_SUB_PROVIDERS as readonly string[]).includes(base)) {
    return base;
  }
  return 'grand_warden';
}

export function getSafeOrigin(urlStr?: string | null, fallback = 'https://megaplay.buzz'): string {
  if (!urlStr || typeof urlStr !== 'string') return fallback;
  try {
    return new URL(urlStr).origin;
  } catch {
    return fallback;
  }
}

export function buildFrameXEmbedUrl(params: {
  type: MediaType;
  id: string;
  season?: number;
  episode?: number;
  provider?: string;
  autoplay?: boolean;
  muted?: boolean;
  title?: string;
  poster?: string;
  audio?: 'sub' | 'dub';
  resumeTimeSec?: number;
}): string {
  const cleanId = String(params.id || '').trim();
  if (!cleanId || cleanId === 'undefined' || cleanId === 'null') return '';

  const validEp = Math.max(1, Math.round(Number(params.episode) || 1));
  const validSeason = Math.max(1, Math.round(Number(params.season) || 1));
  const autoplay = params.autoplay !== false;
  const muted = Boolean(params.muted);
  const audio = params.audio === 'dub' ? 'dub' : 'sub';
  const resumeTimeSec = params.resumeTimeSec && params.resumeTimeSec > 5 ? Math.floor(params.resumeTimeSec) : 0;

  if (params.type === 'anime') {
    const targetProv = resolveAnimeProvider(params.provider, audio);
    const url = new URL(`${FRAMEX_EMBED_ORIGIN}/embed/anime`);
    url.searchParams.set('id', cleanId);
    url.searchParams.set('anilist_id', cleanId);
    url.searchParams.set('episode', String(validEp));
    url.searchParams.set('season', '1');
    url.searchParams.set('type', 'anime');
    url.searchParams.set('sub_type', audio);
    url.searchParams.set('audio', audio);
    url.searchParams.set('provider', targetProv);
    url.searchParams.set('autoplay', autoplay ? '1' : '0');
    url.searchParams.set('muted', muted ? '1' : '0');
    url.searchParams.set('no_ads', '1');
    url.searchParams.set('adblock', '1');
    url.searchParams.set('origin', 'internal');
    url.searchParams.set('playsinline', '1');
    url.searchParams.set('webkit-playsinline', '1');
    url.searchParams.set('preload', 'auto');
    if (resumeTimeSec > 0) {
      url.searchParams.set('start', String(resumeTimeSec));
      url.searchParams.set('time', String(resumeTimeSec));
      url.searchParams.set('t', String(resumeTimeSec));
    }
    if (params.title?.trim()) {
      url.searchParams.set('title', params.title.trim());
    }
    if (params.poster?.trim()) {
      url.searchParams.set('poster', params.poster.trim());
    }
    return url.toString();
  }

  const basePath =
    params.type === 'tv'
      ? `${FRAMEX_EMBED_ORIGIN}/embed/tv/${encodeURIComponent(cleanId)}/${encodeURIComponent(String(validSeason))}/${encodeURIComponent(String(validEp))}`
      : `${FRAMEX_EMBED_ORIGIN}/embed/movie/${encodeURIComponent(cleanId)}`;

  const url = new URL(basePath);
  url.searchParams.set('id', cleanId);
  if (params.type === 'tv') {
    url.searchParams.set('season', String(validSeason));
    url.searchParams.set('episode', String(validEp));
  }
  url.searchParams.set('type', params.type);

  const normalizedProvider = normalizeMovieTvStreamProvider(params.provider);
  if (normalizedProvider) {
    url.searchParams.set('provider', normalizedProvider);
  }

  url.searchParams.set('autoplay', autoplay ? '1' : '0');
  url.searchParams.set('muted', muted ? '1' : '0');
  url.searchParams.set('no_ads', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('webkit-playsinline', '1');
  url.searchParams.set('preload', 'auto');
  if (resumeTimeSec > 0) {
    url.searchParams.set('start', String(resumeTimeSec));
    url.searchParams.set('time', String(resumeTimeSec));
    url.searchParams.set('t', String(resumeTimeSec));
  }
  if (params.title?.trim()) {
    url.searchParams.set('title', params.title.trim());
  }
  if (params.poster?.trim()) {
    url.searchParams.set('poster', params.poster.trim());
  }
  return url.toString();
}
