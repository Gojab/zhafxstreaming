export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const type = (req.query.type as string) || 'movie';
  const genre = req.query.genre as string;
  const year = req.query.year as string;
  const minRating = req.query.min_rating as string;
  const sort = req.query.sort as string;
  const page = (req.query.page as string) || '1';

  if (type === 'anime') {
    try {
      const q = new URLSearchParams();
      q.set('page', page);
      if (genre && genre !== 'all') q.set('genre', genre);
      if (year && year !== 'all') q.set('year', year);

      const animeRes = await fetch(`https://api.framextv.tech/anime/api/discover?${q.toString()}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://framextv.xyz/',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (animeRes.ok) {
        const animeData = await animeRes.json();
        const items = Array.isArray(animeData.results) ? animeData.results : [];
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return res.status(200).json({
          success: true,
          page: animeData.page || parseInt(page, 10),
          totalPages: animeData.totalPages || 50,
          totalResults: animeData.totalResults || items.length,
          results: items.map((a: any) => ({
            id: String(a.id),
            type: 'anime',
            title: a.title,
            poster: a.poster,
            backdrop: a.backdrop || a.poster,
            year: String(a.year || '2024'),
            rating: a.rating || '8.5',
            overview: a.synopsis || a.overview || 'Anime terpopuler di Zhafx.',
            genres: a.genres || ['Action', 'Fantasy'],
          })),
        });
      }
    } catch {}
  }

  const backends = ['https://api.framextv.xyz', 'https://api.framextv.tech', 'https://api.framextv.cc'];
  const q = new URLSearchParams();
  q.set('type', type);
  if (genre && genre !== 'all') q.set('genre', genre);
  if (year && year !== 'all') q.set('year', year);
  if (minRating) q.set('min_rating', minRating);
  if (sort) q.set('sort', sort);
  q.set('page', page);

  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/discover?${q.toString()}`, {
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
    error: 'Gagal memuat katalog film.',
    results: [],
  });
}
