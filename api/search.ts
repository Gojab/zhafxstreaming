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

  const queryClean = q.trim();

  // Multi-backend endpoints with resilience (Strictly framextv.cc)
  const backends = ['https://api.framextv.cc'];
  const animeBackends = ['https://api.framextv.cc/anime'];

  // Common typo alias map for instant resolution
  const TYPO_MAP: Record<string, string> = {
    avtar: 'avatar',
    avatr: 'avatar',
    'demon slyer': 'demon slayer',
    demonslayer: 'demon slayer',
    'on peace': 'one piece',
    onepece: 'one piece',
    spidrman: 'spider-man',
    spiderman: 'spider-man',
    naruo: 'naruto',
    narutoo: 'naruto',
    jujutso: 'jujutsu kaisen',
    'jujutsu kaysen': 'jujutsu kaisen',
    'attck on titan': 'attack on titan',
    'atack on titan': 'attack on titan',
    'solo levelng': 'solo leveling',
    sololeveling: 'solo leveling',
    chainsw: 'chainsaw man',
    chainsaw: 'chainsaw man',
    interstelar: 'interstellar',
    intrestellar: 'interstellar',
    openeimer: 'oppenheimer',
    oppenhiemer: 'oppenheimer',
    'drgon ball': 'dragon ball',
    dragonball: 'dragon ball',
    'kimetsu no yaiba': 'demon slayer',
    'shingeki no kyojin': 'attack on titan',
  };

  async function executeSearch(targetQuery: string) {
    const movieTvParams = new URLSearchParams();
    movieTvParams.set('q', targetQuery);
    if (type && type !== 'all') movieTvParams.set('type', type);
    movieTvParams.set('page', page);

    const animeParams = new URLSearchParams();
    animeParams.set('q', targetQuery);
    animeParams.set('page', page);

    const tasks: Promise<any>[] = [];

    // 1. Fetch Movie/TV if applicable
    if (!type || type === 'all' || type === 'movie' || type === 'tv') {
      tasks.push(
        (async () => {
          for (const backend of backends) {
            try {
              const r = await fetch(`${backend}/api/search?${movieTvParams.toString()}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  Referer: 'https://framextv.cc/',
                  Accept: 'application/json',
                },
                signal: AbortSignal.timeout(5500),
              });
              if (r.ok) {
                const data = await r.json();
                return Array.isArray(data.results) ? data.results : [];
              }
            } catch {}
          }
          return [];
        })()
      );
    } else {
      tasks.push(Promise.resolve([]));
    }

    // 2. Fetch Anime if applicable
    if (!type || type === 'all' || type === 'anime') {
      tasks.push(
        (async () => {
          for (const ab of animeBackends) {
            try {
              const r = await fetch(`${ab}/api/search?${animeParams.toString()}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  Referer: 'https://framextv.cc/',
                  Accept: 'application/json',
                },
                signal: AbortSignal.timeout(5500),
              });
              if (r.ok) {
                const data = await r.json();
                const items = Array.isArray(data.results) ? data.results : [];
                return items.map((a: any) => ({
                  id: String(a.id),
                  type: 'anime',
                  title: a.title,
                  year: String(a.year || '2024'),
                  poster: a.poster,
                  backdrop: a.backdrop || a.poster,
                  rating: a.rating ? String(a.rating) : '8.5',
                  genres: Array.isArray(a.genres) ? a.genres : ['Anime'],
                  overview: a.synopsis || a.overview || 'Anime berkualitas tinggi di Zhafx.',
                  anilistId: a.anilistId || a.id,
                  status: a.status,
                }));
              }
            } catch {}
          }
          return [];
        })()
      );
    } else {
      tasks.push(Promise.resolve([]));
    }

    const [movieTvResults, animeResults] = await Promise.all(tasks);

    // Merge and deduplicate by `${type}-${id}` or title
    const seen = new Set<string>();
    const combined: any[] = [];

    // Prioritize exact type if requested
    const allItems = type === 'anime'
      ? [...animeResults, ...movieTvResults]
      : [...movieTvResults, ...animeResults];

    for (const item of allItems) {
      const key = `${item.type || 'movie'}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(item);
      }
    }

    return combined;
  }

  try {
    let results = await executeSearch(queryClean);
    let didYouMean: string | undefined;

    // Typo tolerance: If 0 results or query is a known typo, attempt recovery
    const lowerQ = queryClean.toLowerCase();
    const correctedTerm = TYPO_MAP[lowerQ];

    if (results.length === 0 && correctedTerm) {
      const recovered = await executeSearch(correctedTerm);
      if (recovered.length > 0) {
        results = recovered;
        didYouMean = correctedTerm.charAt(0).toUpperCase() + correctedTerm.slice(1);
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({
      success: true,
      page: parseInt(page, 10),
      totalPages: Math.max(1, Math.ceil(results.length / 20)),
      totalResults: results.length,
      results,
      didYouMean,
    });
  } catch {
    return res.status(502).json({ success: false, error: 'Gagal melakukan pencarian.' });
  }
}
