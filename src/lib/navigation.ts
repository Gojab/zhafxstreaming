export type BottomNavTabId = 'home' | 'explore' | 'features' | 'search' | 'list';

export function getActiveBottomNavId(pathname: string): BottomNavTabId | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/') return 'home';
  if (clean.startsWith('/explore')) return 'explore';
  if (clean.startsWith('/search')) return 'search';
  if (clean === '/my-list' || clean === '/history') return 'list';
  return null;
}
