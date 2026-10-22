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

  const backends = ['https://api.framextv.cc'];

  // 1. Handle Providers Requests
  if (isProviders) {
    const type = (req.query?.type as string) || 'movie';

    if (type === 'anime') {
      for (const backend of backends) {
        try {
          const upstreamRes = await fetch(`${backend}/anime/api/providers`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              'Referer': 'https://framextv.cc/',
              'Origin': 'https://framextv.cc',
            },
            signal: AbortSignal.timeout(4000),
          });
          if (upstreamRes.ok) {
            const data = await upstreamRes.json();
            return res.status(200).json(data);
          }
        } catch {}
      }

      return res.status(200).json({
        providers: [
          { id: 'grand_warden', name: 'Server 1 (Grand Warden)', tagline: 'Server Utama • Multi-Source Cloud 1080p', category: 'anime', status: 'available' },
          { id: 'wizard', name: 'Server 2 (Wizard)', tagline: 'Server Cadangan • Dual Audio & Softsub Cepat', category: 'anime', status: 'available' },
          { id: 'valkyrie', name: 'Server 3 (Valkyrie)', tagline: 'Server Cadangan • FlixCloud HD', category: 'anime', status: 'available' },
          { id: 'super_pekka', name: 'Server 4 (Super PEKKA)', tagline: 'Server Cadangan • Direct Fast CDN 1080p', category: 'anime', status: 'available' },
          { id: 'goblin', name: 'Server 5 (Goblin)', tagline: 'Server Cadangan • Direct Fast Auto Stream', category: 'anime', status: 'available' },
          { id: 'giant', name: 'Server 6 (Giant)', tagline: 'Server Cadangan • Ultra High Speed Server', category: 'anime', status: 'available' },
        ],
      });
    }

    for (const backend of backends) {
      try {
        const upstreamRes = await fetch(`${backend}/api/providers`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://framextv.cc/',
            'Origin': 'https://framextv.cc',
          },
          signal: AbortSignal.timeout(5000),
        });
        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          if (data && Array.isArray(data.providers)) {
            return res.status(200).json(data);
          }
        }
      } catch {
        // try next backend
      }
    }

    if (type === 'tv') {
      return res.status(200).json({
        providers: [
          { id: 'miner', name: 'Server 1', tagline: 'Server Utama', category: 'tv', status: 'available' },
          { id: 'headhunter', name: 'Server 2', tagline: 'Server Cadangan Multi-Sub', category: 'tv', status: 'available' },
          { id: 'valkyrie', name: 'Server 3', tagline: 'Server Cadangan Cepat', category: 'tv', status: 'available' },
          { id: 'titan', name: 'Server 4', tagline: 'Server Cadangan Direct', category: 'tv', status: 'available' },
          { id: 'hog_rider', name: 'Server 5', tagline: 'Server Cadangan Stabil', category: 'tv', status: 'available' },
          { id: 'lavahound', name: 'Server 6', tagline: 'Server Cadangan Multi-CDN', category: 'tv', status: 'available' },
          { id: 'super_barbarian', name: 'Server 7', tagline: 'Server Cadangan HLS', category: 'tv', status: 'available' },
          { id: 'bowler', name: 'Server 8', tagline: 'Server Cadangan Multi-Bahasa', category: 'tv', status: 'available' },
          { id: 'giant', name: 'Server 9', tagline: 'Server Cadangan Audio', category: 'tv', status: 'available' },
        ],
      });
    }

    return res.status(200).json({
      providers: [
        { id: 'miner', name: 'Server 1', tagline: 'Server Utama', category: 'movie', status: 'available' },
        { id: 'headhunter', name: 'Server 2', tagline: 'Server Cadangan Multi-Sub', category: 'movie', status: 'available' },
        { id: 'valkyrie', name: 'Server 3', tagline: 'Server Cadangan Cepat', category: 'movie', status: 'available' },
        { id: 'titan', name: 'Server 4', tagline: 'Server Cadangan Direct', category: 'movie', status: 'available' },
        { id: 'hog_rider', name: 'Server 5', tagline: 'Server Cadangan Stabil', category: 'movie', status: 'available' },
        { id: 'lavahound', name: 'Server 6', tagline: 'Server Cadangan Multi-CDN', category: 'movie', status: 'available' },
        { id: 'super_barbarian', name: 'Server 7', tagline: 'Server Cadangan HLS', category: 'movie', status: 'available' },
        { id: 'bowler', name: 'Server 8', tagline: 'Server Cadangan Multi-Bahasa', category: 'movie', status: 'available' },
        { id: 'giant', name: 'Server 9', tagline: 'Server Cadangan Audio', category: 'movie', status: 'available' },
      ],
    });
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

    for (const backend of backends) {
      try {
        const upstreamRes = await fetch(`${backend}/api/season?${q.toString()}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://framextv.cc/',
            Origin: 'https://framextv.cc',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
          return res.status(200).json(data);
        }
      } catch {}
    }

    return res.status(502).json({ error: 'Gagal memuat episode musim.' });
  }

  // 3. Handle Stream Requests
  const id = req.query?.id as string;
  const type = (req.query?.type as string) || 'movie';
  const season = req.query?.season ? String(req.query.season) : undefined;
  const episode = req.query?.episode ? String(req.query.episode) : undefined;
  const provider = (req.query?.provider as string) || '';

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID tayangan wajib diisi.' });
  }

  const q = new URLSearchParams();
  q.set('id', id);
  q.set('type', type);
  if (season) q.set('season', season);
  if (episode) q.set('episode', episode);
  if (provider && provider !== 'auto') q.set('provider', provider);

  for (const backend of backends) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const upstreamRes = await fetch(`${backend}/api/stream?${q.toString()}`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.cc/',
          'Origin': 'https://framextv.cc',
          'Accept': 'application/json, text/plain, */*',
        },
      });
      clearTimeout(timeoutId);

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
          return res.status(200).json(data);
        }
      }
    } catch {
      // try next backend
    }
  }

  return res.status(404).json({
    success: false,
    error: 'Stream tidak ditemukan dari API FrameX.',
  });
}
