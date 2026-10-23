/**
 * Enhanced Image helper utility for optimizing TMDB, Kitsu, and AniList image sizes and formats.
 *
 * Posters: w92, w154, w185, w300, w342, w500, w780
 * Backdrops: w300, w780, w1280
 */

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';

/**
 * Optimizes an image URL according to provider (TMDB, Kitsu, AniList).
 * Strips oversize resolutions and switches to bandwidth-optimized dimensions.
 */
export function optimizeTmdbImage(
  url: string | undefined | null,
  size: PosterSize | BackdropSize = 'w342'
): string {
  if (!url) return '';
  const trimmed = url.trim();

  // 1. TMDB Image resolution rewriting
  if (trimmed.includes('image.tmdb.org/t/p/')) {
    return trimmed.replace(
      /\/t\/p\/(original|w1280|w780|w500|w342|w300|w185|w154|w92)\//,
      `/t/p/${size}/`
    );
  }

  // 2. Kitsu Image resolution optimization (swap heavy original/large with medium/small)
  if (trimmed.includes('kitsu.io') || trimmed.includes('kitsu.app')) {
    if (size === 'w92' || size === 'w154') {
      return trimmed.replace(/\/(original|large|medium)\.(jpe?g|png|webp)/i, '/small.jpg');
    }
    if (size === 'w185' || size === 'w300' || size === 'w342') {
      return trimmed.replace(/\/(original|large)\.(jpe?g|png|webp)/i, '/medium.jpg');
    }
  }

  // 3. AniList anime poster resolution optimization (avoid downloading 4K extraLarge on mobile/cards)
  if (trimmed.includes('anilistcdn/media/anime/cover/')) {
    if (size === 'w92' || size === 'w154' || size === 'w185') {
      return trimmed.replace(/\/cover\/(extraLarge|large)\//, '/cover/medium/');
    }
    if (size === 'w300' || size === 'w342' || size === 'w500') {
      return trimmed.replace(/\/cover\/(extraLarge)\//, '/cover/large/');
    }
  }

  return trimmed;
}

/**
 * Returns a high-density, bandwidth-friendly srcset for TMDB & anime backdrops
 */
export function getTmdbBackdropSrcSet(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('image.tmdb.org/t/p/')) {
    return `${optimizeTmdbImage(url, 'w300')} 300w, ${optimizeTmdbImage(url, 'w780')} 780w, ${optimizeTmdbImage(url, 'w1280')} 1280w`;
  }
  return undefined;
}

/**
 * Returns a high-density, bandwidth-friendly srcset for TMDB & anime posters
 * (w154 for ultra-compact mobile, w185 for standard mobile card, w342 for desktop card, w500 for retina)
 */
export function getTmdbPosterSrcSet(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (url.includes('image.tmdb.org/t/p/')) {
    return `${optimizeTmdbImage(url, 'w154')} 154w, ${optimizeTmdbImage(url, 'w185')} 185w, ${optimizeTmdbImage(url, 'w342')} 342w, ${optimizeTmdbImage(url, 'w500')} 500w`;
  }
  if (url.includes('kitsu.io') || url.includes('kitsu.app')) {
    const small = optimizeTmdbImage(url, 'w154');
    const medium = optimizeTmdbImage(url, 'w342');
    return `${small} 180w, ${medium} 360w`;
  }
  return undefined;
}

// Backward-compatible alias
export const getPosterSrcSet = getTmdbPosterSrcSet;
export const getBackdropSrcSet = getTmdbBackdropSrcSet;
