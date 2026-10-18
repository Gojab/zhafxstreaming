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

  const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];
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
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
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
