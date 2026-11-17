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

  const framexHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Referer: 'https://framextv.cc/',
    Origin: 'https://framextv.cc',
    Accept: 'application/json',
  };

  if (type === 'anime') {
    // 1. Check FrameX official anime metadata endpoint first
    try {
      const fxAnimeRes = await fetch(
        `https://api.framextv.cc/anime/api/meta?id=${encodeURIComponent(id)}`,
        { headers: framexHeaders, signal: AbortSignal.timeout(5000) }
      );
      if (fxAnimeRes.ok) {
        const fxData = await fxAnimeRes.json();
        const item = fxData?.data || fxData?.anime || fxData;
        if (item && (item.title || item.name)) {
          res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
          return res.status(200).json({
            ...item,
            success: true,
            id: String(item.id || id),
            type: 'anime',
            title: item.title || item.name,
          });
        }
      }
    } catch {}

    // 2. Fallback to AniList GraphQL
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

  const q = new URLSearchParams();
  q.set('id', id);
  q.set('type', type);

  try {
    const upstreamRes = await fetch(`https://api.framextv.cc/api/details?${q.toString()}`, {
      headers: framexHeaders,
      signal: AbortSignal.timeout(5000),
    });

    if (upstreamRes.ok) {
      const data = await upstreamRes.json();
      if (type !== 'anime' || data?.type === 'anime') {
        res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
        return res.status(200).json(data);
      }
    }
  } catch {}

  return res.status(type === 'anime' ? 404 : 502).json({ error: 'Gagal memuat detail tayangan.' });
}
