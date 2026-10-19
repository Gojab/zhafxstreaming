export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = req.query?.id as string;
  const type = (req.query?.type as string) || 'movie';
  const season = req.query?.season ? String(req.query.season) : undefined;
  const episode = req.query?.episode ? String(req.query.episode) : undefined;
  const provider = (req.query?.provider as string) || '';

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID tayangan wajib diisi.' });
  }

  const backends = ['https://api.framextv.xyz', 'https://api.framextv.tech'];
  const q = new URLSearchParams();
  q.set('id', id);
  q.set('type', type);
  if (season) q.set('season', season);
  if (episode) q.set('episode', episode);
  if (provider && provider !== 'auto') q.set('provider', provider);

  const fetchBackend = async (backend: string) => {
    const upstreamRes = await fetch(`${backend}/api/stream?${q.toString()}`, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://framextv.xyz/',
        'Origin': 'https://framextv.xyz',
        'Accept': 'application/json, text/plain, */*',
      },
    });
    if (!upstreamRes.ok) throw new Error(`HTTP ${upstreamRes.status}`);
    const data = await upstreamRes.json();
    if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
      return data;
    }
    throw new Error('No sources found');
  };

  try {
    const winnerData = await Promise.any(backends.map(b => fetchBackend(b)));
    if (winnerData) {
      return res.status(200).json(winnerData);
    }
  } catch {}

  return res.status(404).json({
    success: false,
    error: 'Stream tidak ditemukan dari API FrameX.',
  });
}
