export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const page = (req.query.page as string) || '1';
  const type = req.query.type as string;
  const backends = ['https://api.framextv.xyz', 'https://api.framextv.tech', 'https://api.framextv.cc'];
  const q = new URLSearchParams();
  q.set('page', page);
  if (type) q.set('type', type);

  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/trending?${q.toString()}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://framextv.xyz/',
          Origin: 'https://framextv.xyz',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json(data);
      }
    } catch {}
  }

  return res.status(502).json({
    success: false,
    error: 'Gagal memuat tayangan trending.',
    results: [],
  });
}
