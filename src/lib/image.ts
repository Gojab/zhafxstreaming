/**
 * Image helper utility for optimizing TMDB and AniList image sizes.
 * Posters: w185, w300, w342, w500, w780
 * Backdrops: w300, w780, w1280
 */
export function optimizeTmdbImage(
  url: string | undefined | null,
  size: 'w185' | 'w300' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original' = 'w342'
): string {
  if (!url) return '';
  // TMDB image resolution rewriting
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/(original|w300|w500|w780|w1280|w185|w342)\//, `/t/p/${size}/`);
  }
  // AniList anime poster resolution optimization (avoid downloading 4K extraLarge on mobile/cards)
  if (url.includes('anilistcdn/media/anime/cover/')) {
    if (size === 'w185' || size === 'w300' || size === 'w342') {
      return url.replace(/\/cover\/(extraLarge)\//, '/cover/large/');
    }
  }
  return url;
}

export function getTmdbBackdropSrcSet(url: string | undefined | null): string | undefined {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return undefined;
  return `${optimizeTmdbImage(url, 'w300')} 300w, ${optimizeTmdbImage(url, 'w780')} 780w, ${optimizeTmdbImage(url, 'w1280')} 1280w`;
}

export function getTmdbPosterSrcSet(url: string | undefined | null): string | undefined {
  if (!url || !url.includes('image.tmdb.org/t/p/')) return undefined;
  return `${optimizeTmdbImage(url, 'w185')} 185w, ${optimizeTmdbImage(url, 'w342')} 342w, ${optimizeTmdbImage(url, 'w500')} 500w`;
}
