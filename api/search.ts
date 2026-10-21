export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const q = req.query.q as string;
  const type = req.query.type as string;
  const page = (req.query.page as string) || '1';

  if (!q || !q.trim()) {
    return res.json({ success: true, results: [], totalPages: 1, totalResults: 0 });
  }

  const backends = ['https://api.framextv.cc', 'https://api.framextv.tech', 'https://api.framextv.xyz'];
  const searchParams = new URLSearchParams();
  searchParams.set('q', q.trim());
  if (type) searchParams.set('type', type);
  searchParams.set('page', page);

  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/search?${searchParams.toString()}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://framextv.cc/',
          Origin: 'https://framextv.cc',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        return res.status(200).json(data);
      }
    } catch {}
  }

  return res.status(502).json({ success: false, error: 'Gagal melakukan pencarian.' });
}
