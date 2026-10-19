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
        { id: 'miner', name: 'Miner XIX', tagline: 'Movy Multi-City TV Series 4K', category: 'tv', status: 'available' },
        { id: 'headhunter', name: 'Headhunter XXXI', tagline: 'VidLink TV Series Multi-Sub', category: 'tv', status: 'available' },
        { id: 'valkyrie', name: 'Valkyrie VI', tagline: '4K Ultra TV Multi-Server', category: 'tv', status: 'available' },
        { id: 'titan', name: 'Titan VII', tagline: 'Films365 Direct MP4 1080p Server', category: 'tv', status: 'available' },
        { id: 'hog_rider', name: 'Hog Rider XI', tagline: '4K TV Server', category: 'tv', status: 'available' },
        { id: 'lavahound', name: 'Lava Hound XII', tagline: '4K Fast TV Series Stream', category: 'tv', status: 'available' },
        { id: 'super_barbarian', name: 'Super Barbarian XVI', tagline: 'Direct Auto HLS TV Stream', category: 'tv', status: 'available' },
        { id: 'bowler', name: 'Bowler XVIII', tagline: 'Multi-Language TV Episodes', category: 'tv', status: 'available' },
        { id: 'giant', name: 'Giant XI', tagline: 'Multi-Audio TV Stream Cepat', category: 'tv', status: 'available' },
      ],
    });
  }

  return res.status(200).json({
    providers: [
      { id: 'miner', name: 'Miner XIX', tagline: 'Movy Multi-City 4K Server', category: 'movie', status: 'available' },
      { id: 'headhunter', name: 'Headhunter XXXI', tagline: 'VidLink Server Multi-Sub', category: 'movie', status: 'available' },
      { id: 'valkyrie', name: 'Valkyrie VI', tagline: '4K Ultra Multi-Server', category: 'movie', status: 'available' },
      { id: 'titan', name: 'Titan VII', tagline: 'Films365 Direct MP4 1080p Server', category: 'movie', status: 'available' },
      { id: 'hog_rider', name: 'Hog Rider XI', tagline: '4K Pilled Server', category: 'movie', status: 'available' },
      { id: 'lavahound', name: 'Lava Hound XII', tagline: '4K Fast Multi-Server Stream', category: 'movie', status: 'available' },
      { id: 'super_barbarian', name: 'Super Barbarian XVI', tagline: 'Direct Auto HLS Stream', category: 'movie', status: 'available' },
      { id: 'bowler', name: 'Bowler XVIII', tagline: 'Multi-Language', category: 'movie', status: 'available' },
      { id: 'giant', name: 'Giant XI', tagline: 'Multi-Audio Direct Stream', category: 'movie', status: 'available' },
    ],
  });
}
