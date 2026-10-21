export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const type = (req.query?.type as string) || 'movie';

  if (type === 'anime') {
    try {
      const upstreamRes = await fetch('https://api.framextv.tech/anime/api/providers', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
        },
      });
      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        return res.status(200).json(data);
      }
    } catch (err) {
      console.warn('[Providers Anime Serverless Error]:', err);
    }
  }

  const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];
  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/providers`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
        },
        signal: AbortSignal.timeout(6000),
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
