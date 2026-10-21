let cachedHomeData: any = null;
let cacheExpiry = 0;

const MANUAL_SYNOPSES: Record<string, string> = {
  'clayface': 'Kisah kebangkitan Matt Hagen dari pemuda jalanan kota Gotham menjadi aktor terkemuka Hollywood yang terhenti secara tragis saat bos mafia lokal membuatnya cacat mengerikan. Ditinggalkan dan hancur, Matt mencari perawatan mutakhir yang secara ajaib memulihkan tubuhnya, namun merusak kesadarannya dan menyeretnya ke dalam spiral balas dendam mematikan.',
  'by any means': 'Di Mississippi era 1960-an, seorang agen FBI muda berkulit hitam terpaksa bekerja sama dengan pembunuh bayaran mafia yang terkenal kejam demi menyelidiki rentetan pembunuhan brutal bermotif hak-hak sipil.',
  'dune: part two': 'Paul Atreides bersatu dengan Chani dan kaum Fremen saat menempuh jalan balas dendam terhadap para konspirator yang menghancurkan keluarganya, seraya berusaha mencegah masa depan kelam yang hanya bisa ia ramalkan.',
  'dune': 'Paul Atreides, pemuda brilian yang lahir dengan takdir besar melampaui pemahamannya, harus melakukan perjalanan ke planet paling berbahaya di alam semesta demi memastikan masa depan keluarga dan rakyatnya.',
  'interstellar': 'Di masa depan ketika bumi dilanda krisis pangan parah, sekelompok penjelajah menempuh misi terjauh dalam sejarah melintasi lubang cacing antariksa demi mencari planet baru yang layak huni bagi kelangsungan umat manusia.',
  'oppenheimer': 'Kisah biopik dramatis seputar fisikawan teoretis J. Robert Oppenheimer yang memimpin Proyek Manhattan untuk menciptakan senjata nuklir pertama dalam sejarah peradaban manusia.',
  'shōgun': 'Ketika sebuah kapal misterius terdampar di pesisir feodal Jepang, sang navigator Inggris terjerumus ke dalam perang politik dan intrik perebutan kekuasaan para penguasa samurai.',
  'solo leveling': 'Di dunia di mana monster bermunculan melalui gerbang dimensi, Sung Jin-woo yang dikenal sebagai pemburu terlemah bangkit dari ambang maut dengan sistem misterius yang memungkinkannya meningkatkan kekuatan tanpa batas.',
  'attack on titan': 'Umat manusia yang terkurung di balik benteng raksasa berjuang mati-matian mempertahankan kelangsungan hidup dari ancaman monster raksasa pemakan manusia yang dikenal sebagai Titan.',
  'demon slayer': 'Setelah keluarganya dibantai oleh iblis dan adiknya berubah menjadi monster, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis demi membalaskan dendam dan menyembuhkan sang adik.',
  'top gun: maverick': 'Setelah puluhan tahun mengabdi sebagai penerbang ulung Angkatan Laut, Pete "Maverick" Mitchell ditugaskan melatih skuadron lulusan elit terbaik untuk menjalankan misi berisiko tinggi yang menuntut pengorbanan tertinggi.',
  'house of the dragon': 'Kisah epik wangsa Targaryen ratusan tahun sebelum peristiwa Game of Thrones, yang mencatat awal mula perang saudara paling berdarah dalam perebutan takhta Iron Throne di Westeros.',
  'the last of us': 'Dua puluh tahun setelah wabah jamur misterius memusnahkan peradaban, seorang penyintas tangguh bernama Joel disewa untuk menyelundupkan seorang gadis muda melintasi wilayah Amerika yang berbahaya.',
  'jujutsu kaisen': 'Yuji Itadori, siswa SMA dengan bakat fisik luar biasa, menelan artefak terkutuk dari Raja Kutukan dan bergabung dengan Akademi Jujutsu untuk membasmi roh-roh kutukan yang mengancam dunia manusia.',
  'avatar': 'Jake Sully dan Neytiri telah berkeluarga dan melakukan segalanya untuk tetap bersama. Namun saat ancaman lama kembali, mereka harus mengungsi dan menjelajahi wilayah klan laut Pandora.',
  'the dark knight': 'Ketika ancaman keji yang dikenal sebagai Joker menebar kekacauan di jalanan Gotham, Batman harus menghadapi salah satu ujian psikologis dan fisik terberat untuk menegakkan keadilan.',
  'spider-man': 'Miles Morales terlempar melintasi Multiverse, di mana ia bertemu dengan tim Spider-People yang bertugas melindungi keberadaan semesta dari ancaman besar yang tak terduga.',
  'deadpool': 'Wade Wilson yang lesu menghadapi krisis eksistensial terseret ke dalam petualangan lintas dimensi bersama Wolverine untuk menyelamatkan dunianya.',
  'gladiator': 'Bertahun-tahun setelah menyaksikan kematian pahlawan Maximus di tangan pamannya, Lucius harus memasuki Colosseum setelah rumahnya ditaklukkan oleh kaisar tirani yang memerintah Roma.',
  'fallout': 'Dua ratus tahun setelah kiamat nuklir, seorang penghuni bungker yang damai terpaksa keluar ke permukaan bumi yang liar, berbahaya, dan aneh untuk mencari ayahnya.',
  'arcane': 'Di tengah ketegangan antara kota utopia Piltover dan kota bawah tanah Zaun yang tertindas, dua saudara perempuan bertarung di pihak yang berseberangan dalam perang teknologi dan sihir.',
  'one piece': 'Monkey D. Luffy bersama kru Bajak Laut Topi Jerami mengarungi samudra Grand Line yang penuh bahaya untuk menemukan harta karun legendaris dan menjadi Raja Bajak Laut berikutnya.'
};

function getManualSynopsis(text: string, title?: string): string {
  if (title) {
    const cleanTitle = title.toLowerCase().trim();
    for (const [key, val] of Object.entries(MANUAL_SYNOPSES)) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        return val;
      }
    }
  }
  return text || 'Sinopsis tayangan ini tersedia di Zhafx Streaming.';
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

    // Manual Hero Overview translation to Indonesian
    if (rawHomeData.hero && rawHomeData.hero.overview) {
      rawHomeData.hero.overview = getManualSynopsis(
        rawHomeData.hero.overview,
        rawHomeData.hero.title
      );
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
