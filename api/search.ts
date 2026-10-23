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
    fightclb: 'Fight Club',
    fightclub: 'Fight Club',
    avtar: 'Avatar',
    avatr: 'Avatar',
    avangers: 'Avengers',
    avenger: 'Avengers',
    'demon slyer': 'Demon Slayer',
    demonslayer: 'Demon Slayer',
    'on peace': 'One Piece',
    onepece: 'One Piece',
    onpiece: 'One Piece',
    spidrman: 'Spider-Man',
    spiderman: 'Spider-Man',
    spidermen: 'Spider-Man',
    naruo: 'Naruto',
    narutoo: 'Naruto',
    narutoos: 'Naruto',
    jujutso: 'Jujutsu Kaisen',
    jujutzu: 'Jujutsu Kaisen',
    'jujutsu kaysen': 'Jujutsu Kaisen',
    'attck on titan': 'Attack on Titan',
    'atack on titan': 'Attack on Titan',
    'attack on titn': 'Attack on Titan',
    'solo levelng': 'Solo Leveling',
    sololeveling: 'Solo Leveling',
    sololevel: 'Solo Leveling',
    chainsw: 'Chainsaw Man',
    chainsaw: 'Chainsaw Man',
    chainsawman: 'Chainsaw Man',
    interstelar: 'Interstellar',
    intrestellar: 'Interstellar',
    openeimer: 'Oppenheimer',
    oppenhiemer: 'Oppenheimer',
    oppenhaimer: 'Oppenheimer',
    'drgon ball': 'Dragon Ball',
    dragonball: 'Dragon Ball',
    dandadn: 'Dandadan',
    dandadaan: 'Dandadan',
    blech: 'Bleach',
    bleech: 'Bleach',
    'huter x hunter': 'Hunter x Hunter',
    hxh: 'Hunter x Hunter',
    frirn: 'Frieren',
    frieran: 'Frieren',
    kaiju8: 'Kaiju No. 8',
    'kaiju no 8': 'Kaiju No. 8',
    bluelock: 'Blue Lock',
    'blue lok': 'Blue Lock',
    'stranger thing': 'Stranger Things',
    strangerthing: 'Stranger Things',
    breking bad: 'Breaking Bad',
    squidgame: 'Squid Game',
    peakyblinders: 'Peaky Blinders',
    gladiatr: 'Gladiator',
    topgun: 'Top Gun',
    'top gun 2': 'Top Gun: Maverick',
    batmen: 'Batman',
    supermen: 'Superman',
    ironman: 'Iron Man',
    wick: 'John Wick',
    johnwick: 'John Wick',
    matrix: 'The Matrix',

    // Acronyms
    aot: 'Attack on Titan',
    jjk: 'Jujutsu Kaisen',
    op: 'One Piece',
    csm: 'Chainsaw Man',
    got: 'Game of Thrones',
    hotd: 'House of the Dragon',
    tlou: 'The Last of Us',
    dbz: 'Dragon Ball',
    mha: 'My Hero Academia',
    bnha: 'My Hero Academia',
    fmab: 'Fullmetal Alchemist',
    sao: 'Sword Art Online',
    opm: 'One Punch Man',
    tybw: 'Bleach',
    'kimetsu no yaiba': 'Demon Slayer',
    kimetsu: 'Demon Slayer',
    tanjiro: 'Demon Slayer',
    'shingeki no kyojin': 'Attack on Titan',
    'boku no hero': 'My Hero Academia',
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
      autoCorrected: Boolean(didYouMean),
      originalQuery: queryClean,
    });
  } catch {
    return res.status(502).json({ success: false, error: 'Gagal melakukan pencarian.' });
  }
}
