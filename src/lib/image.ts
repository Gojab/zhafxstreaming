/**
 * Image helper utility for optimizing TMDB and external image sizes.
 * Posters: w342
 * Backdrops: w780
 * Thumbnails: w185
 */
export function optimizeTmdbImage(
  url: string | undefined | null,
  size: 'w185' | 'w342' | 'w780' | 'original' = 'w342'
): string {
  if (!url) return '';
  if (url.includes('image.tmdb.org/t/p/')) {
    return url.replace(/\/t\/p\/(original|w500|w780|w1280|w185|w342)\//, `/t/p/${size}/`);
  }
  return url;
}
