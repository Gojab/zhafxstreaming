const FRAMEX_ORIGIN = 'https://api.framextv.cc';
const ACTIVE_MOVIE_TV_PROVIDERS = ['giant', 'bowler', 'executioner', 'root_rider', 'hog_rider'];
const LEGACY_OR_DOWN_PROVIDERS = new Set([
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

function getPrimaryProvider(type: string) {
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
      category: type === 'tv' ? 'tv' : 'movie',
      status: 'available',
    },
  ];
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = (req.query?.action as string) || '';
  const isSeason = action === 'season' || Boolean(req.query?.is_season) || req.url?.includes('/season');
  const isProviders = action === 'providers' || Boolean(req.query?.is_providers) || req.url?.includes('/providers');

  const framexHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://framextv.cc/',
    Origin: 'https://framextv.cc',
    Accept: 'application/json, text/plain, */*',
  };

  // 1. Handle Providers Requests (single active primary server, no backup list)
  if (isProviders) {
    const type = (req.query?.type as string) || 'movie';
    const upstreamPath = type === 'anime' ? '/anime/api/providers' : '/api/providers';

    try {
      const upstreamRes = await fetch(`${FRAMEX_ORIGIN}${upstreamPath}`, {
        headers: framexHeaders,
        signal: AbortSignal.timeout(4500),
      });
      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        const rawList = Array.isArray(data?.providers) ? data.providers : [];
        if (type === 'anime') {
          const picked =
            rawList.find((p: any) => p?.id === 'grand_warden' && (p.status === 'active' || !p.status)) ||
            rawList.find((p: any) => p?.id && (p.status === 'active' || !p.status) && (!p.audio || p.audio === 'sub'));
          if (picked?.id) {
            return res.status(200).json({
              providers: [
                {
                  id: picked.id,
                  name: 'ZHAFX',
                  tagline: picked.tagline || 'Server Utama • Anime 1080p Sub & Dub',
                  category: 'anime',
                  status: picked.status || 'active',
                },
              ],
            });
          }
        } else {
          const available = rawList.filter((p: any) => p?.id && (p.status === 'available' || p.status === 'active'));
          const picked =
            ACTIVE_MOVIE_TV_PROVIDERS.map((id) => available.find((p: any) => p.id === id)).find(Boolean) ||
            available[0];
          if (picked?.id) {
            return res.status(200).json({
              providers: [
                {
                  id: picked.id,
                  name: 'ZHAFX',
                  tagline: picked.tagline || 'Server Utama • Pemutaran Cepat & Stabil',
                  category: type === 'tv' ? 'tv' : 'movie',
                  status: picked.status || 'available',
                },
              ],
            });
          }
        }
      }
    } catch {
      // Fall back to primary active server below
    }

    return res.status(200).json({ providers: getPrimaryProvider(type) });
  }

  // 2. Handle Season Episodes Requests
  if (isSeason) {
    const id = req.query.id as string;
    const season = (req.query.season as string) || '1';

    if (!id) {
      return res.status(400).json({ error: 'ID tayangan diperlukan.' });
    }

    const q = new URLSearchParams();
    q.set('id', id);
    q.set('season', season);

    try {
      const upstreamRes = await fetch(`${FRAMEX_ORIGIN}/api/season?${q.toString()}`, {
        headers: framexHeaders,
        signal: AbortSignal.timeout(6000),
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
        return res.status(200).json(data);
      }
    } catch {}

    return res.status(502).json({ error: 'Gagal memuat episode musim.' });
  }

  // 3. Handle Stream Requests
  const id = req.query?.id as string;
  const type = (req.query?.type as string) || 'movie';
  const season = req.query?.season ? String(req.query.season) : undefined;
  const episode = req.query?.episode ? String(req.query.episode) : undefined;
  const rawProvider = String(req.query?.provider || '').trim().toLowerCase();
  const normalizedProvider = LEGACY_OR_DOWN_PROVIDERS.has(rawProvider) ? undefined : rawProvider;

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID tayangan wajib diisi.' });
  }

  const candidateProviders: Array<string | undefined> = normalizedProvider
    ? [normalizedProvider, undefined, 'giant', 'bowler']
    : [undefined, 'giant', 'bowler'];

  const tried = new Set<string>();
  for (const cand of candidateProviders) {
    const key = cand ?? '__auto__';
    if (tried.has(key)) continue;
    tried.add(key);

    const q = new URLSearchParams();
    q.set('id', id);
    q.set('type', type);
    if (season) q.set('season', season);
    if (episode) q.set('episode', episode);
    if (cand) q.set('provider', cand);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);
    try {
      const upstreamRes = await fetch(`${FRAMEX_ORIGIN}/api/stream?${q.toString()}`, {
        signal: controller.signal,
        headers: framexHeaders,
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
          return res.status(200).json(data);
        }
      }
    } catch {
      // try next active primary candidate
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Stream tidak ditemukan dari API FrameX.',
  });
}
