import { GoogleGenAI } from '@google/genai';

let cachedHomeData: any = null;
let cacheExpiry = 0;

async function translateSynopsis(text: string, title?: string): Promise<string> {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length < 5) return trimmed;

  // Tier 1: Gemini 3.8 Flash if key configured
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `Terjemahkan sinopsis tayangan "${title || ''}" berikut ke Bahasa Indonesia yang mengalir, alami, sinematik, dan menarik tanpa spoiler. HANYA berikan hasil terjemahannya saja:\n\n${trimmed}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: { temperature: 0.3 },
      });
      const translated = response.text?.trim();
      if (translated && translated.length > 5) {
        return translated;
      }
    } catch {
      // Fallback to Tier 2
    }
  }

  // Tier 2: MyMemory API
  try {
    const memoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 450))}&langpair=en|id`;
    const memRes = await fetch(memoryUrl, {
      signal: AbortSignal.timeout(3500),
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (memRes.ok) {
      const memData = await memRes.json();
      const translatedText = memData?.responseData?.translatedText;
      if (translatedText && typeof translatedText === 'string' && !translatedText.includes('QUERY LENGTH LIMIT')) {
        return translatedText;
      }
    }
  } catch {
    // Fallback
  }

  return trimmed;
}

async function fetchAnimeFallback(): Promise<{ popular: any[]; airing: any[] }> {
  try {
    const query = `query {
      popular: Page(page: 1, perPage: 16) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          averageScore
          seasonYear
          description
          genres
        }
      }
      airing: Page(page: 1, perPage: 16) {
        media(type: ANIME, status: RELEASING, sort: TRENDING_DESC) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          bannerImage
          averageScore
          seasonYear
          description
          genres
        }
      }
    }`;

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const mapAnime = (item: any) => ({
        id: String(item.id),
        type: 'anime',
        title: item.title?.english || item.title?.romaji || 'Anime',
        originalTitle: item.title?.native,
        poster: item.coverImage?.extraLarge || item.coverImage?.large,
        backdrop: item.bannerImage || item.coverImage?.extraLarge,
        year: String(item.seasonYear || '2025'),
        rating: item.averageScore ? (item.averageScore / 10).toFixed(1) : '8.5',
        overview: item.description ? item.description.replace(/<[^>]*>/g, '').trim() : 'Anime terpopuler di Zhafx.',
        genres: item.genres || ['Action', 'Fantasy'],
      });

      return {
        popular: (data.data?.popular?.media || []).map(mapAnime),
        airing: (data.data?.airing?.media || []).map(mapAnime),
      };
    }
  } catch {
    // Fallback empty
  }
  return { popular: [], airing: [] };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Return cached data if valid (TTL: 5 minutes)
  const now = Date.now();
  if (cachedHomeData && cacheExpiry > now) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(cachedHomeData);
  }

  const backends = ['https://api.framextv.xyz', 'https://api.framextv.tech'];
  let rawHomeData: any = null;

  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/home`, {
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
        if (data && (data.hero || data.rails)) {
          rawHomeData = data;
          break;
        }
      }
    } catch {
      // try next backend
    }
  }

  if (!rawHomeData) {
    if (cachedHomeData) {
      return res.status(200).json(cachedHomeData);
    }
    return res.status(502).json({ error: 'Gagal memuat katalog FrameX.' });
  }

  try {
    const rails = rawHomeData.rails || {};

    // Translate Hero Overview to Indonesian
    if (rawHomeData.hero && rawHomeData.hero.overview) {
      rawHomeData.hero.overview = await translateSynopsis(
        rawHomeData.hero.overview,
        rawHomeData.hero.title
      );
    }

    }

    // Populate Anime if FrameX upstream anime rails are empty
    const currentAnime = rails.popular_anime?.results || [];
    if (!Array.isArray(currentAnime) || currentAnime.length === 0) {
      const animeData = await fetchAnimeFallback();
      if (animeData.popular.length > 0) {
        rails.popular_anime = { success: true, results: animeData.popular };
      }
      if (animeData.airing.length > 0) {
        rails.airing_anime = { success: true, results: animeData.airing };
      }
    }

    cachedHomeData = rawHomeData;
    cacheExpiry = now + 5 * 60 * 1000;

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(rawHomeData);
  } catch (err: any) {
    console.warn('[Home Serverless Handler Warning]:', err?.message || err);
    return res.status(200).json(rawHomeData);
  }
}
