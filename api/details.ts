export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = req.query.id as string;
  const type = (req.query.type as string) || 'movie';

  if (!id) {
    return res.status(400).json({ error: 'ID tayangan diperlukan.' });
  }

  if (type === 'anime') {
    try {
      const aniQuery = `query ($id: Int) {
        Media(id: $id, type: ANIME) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          averageScore
          seasonYear
          description
          genres
          episodes
          status
        }
      }`;
      const aniRes = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aniQuery, variables: { id: parseInt(id, 10) } }),
        signal: AbortSignal.timeout(5000),
      });
      if (aniRes.ok) {
        const aniData = await aniRes.json();
        const m = aniData.data?.Media;
        if (m) {
          return res.json({
            success: true,
            id: String(m.id),
            type: 'anime',
            title: m.title?.english || m.title?.romaji || 'Anime',
            originalTitle: m.title?.native,
            poster: m.coverImage?.extraLarge || m.coverImage?.large,
            backdrop: m.bannerImage || m.coverImage?.extraLarge,
            year: String(m.seasonYear || '2025'),
            rating: m.averageScore ? (m.averageScore / 10).toFixed(1) : '8.5',
            overview: m.description ? m.description.replace(/<[^>]*>/g, '').trim() : '',
            genres: m.genres || ['Action', 'Fantasy'],
            numberOfEpisodes: m.episodes || 24,
            status: m.status,
          });
        }
      }
    } catch {}
  }

  const backends = ['https://api.framextv.xyz', 'https://api.framextv.tech', 'https://api.framextv.cc'];
  const q = new URLSearchParams();
  q.set('id', id);
  q.set('type', type);

  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/details?${q.toString()}`, {
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
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
        return res.status(200).json(data);
      }
    } catch {}
  }

  return res.status(502).json({ error: 'Gagal memuat detail tayangan.' });
}
