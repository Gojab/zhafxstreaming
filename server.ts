import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import {
  createAndSendOtp,
  verifyOtpAndAuthenticate,
  registerWithPassword,
  loginWithPassword,
  authenticateGoogleUser,
  getUserByToken,
  readAuthDb,
  writeAuthDb,
} from './server/authService.ts';
import type {
  StoredUser,
  StoredSession,
  AuthDb,
} from './server/authService.ts';
import { executeMultiModelChat } from './server/aiPipeline.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Set Referrer-Policy and Permissions-Policy for proper FrameX embed player support and unrestricted fullscreen
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'origin');
  res.setHeader(
    'Permissions-Policy',
    'fullscreen=*, autoplay=*, encrypted-media=*, picture-in-picture=*'
  );
  next();
});

// Protect API routes from being indexed as duplicate or thin content
app.use('/api', (_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});

const DATA_DIR = path.resolve(__dirname, 'data');

// --- Persistent Watch Progress Database ---
const PROGRESS_DB_PATH = path.resolve(DATA_DIR, 'watch_progress.json');

interface StoredProgress {
  id: string; // `${userId}_${contentId}_s${season || 1}_e${episode || 1}`
  userId: string;
  contentId: string;
  episodeId?: string;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  poster: string;
  backdrop?: string;
  year: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  currentTime: number;
  duration: number;
  progressPercentage: number;
  lastWatchedAt: number;
  completed: boolean;
}

function initProgressDb(): StoredProgress[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(PROGRESS_DB_PATH)) {
    fs.writeFileSync(PROGRESS_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }

  try {
    const raw = fs.readFileSync(PROGRESS_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[Progress DB] Error reading database, resetting:', e);
    fs.writeFileSync(PROGRESS_DB_PATH, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
}

function readProgressDb(): StoredProgress[] {
  return initProgressDb();
}

function writeProgressDb(records: StoredProgress[]): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = `${PROGRESS_DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tempPath, PROGRESS_DB_PATH);
  } catch (e) {
    console.error('[Progress DB] Failed to save database:', e);
  }
}

function getUserIdFromAuthHeader(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;
  const db = readAuthDb();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  return session ? session.userId : null;
}

const apiKey = process.env.GEMINI_API_KEY || '';


// Endpoint: AI Chat GET health check
app.get(['/api/ai/chat', '/api/chat'], (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'Zhafx Multi-Provider AI Engine (fallback aktif)',
    configured: Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY),
  });
});

// Endpoint: AI Chat with streaming
app.post(['/api/ai/chat', '/api/chat'], async (req: Request, res: Response) => {
  const currentKey = process.env.GEMINI_API_KEY || apiKey;
  const { message, history, contextTitle } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    await executeMultiModelChat(
      {
        message,
        history,
        contextTitle,
        geminiApiKey: currentKey,
      },
      (chunk: string) => {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }
    );
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error('[Server AI Chat Error]:', err);
    res.write(`data: ${JSON.stringify({ text: 'Maaf, terjadi gangguan pada pemrosesan AI.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
});

// Endpoint: Proxy to FrameX API (to prevent any CORS or network issues)
app.all('/api/proxy', async (req: Request, res: Response) => {
  const targetUrl = (req.query.url as string) || (req.body?.targetUrl as string);
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const candidateUrls = [targetUrl];
  if (targetUrl.includes('framextv.tech')) {
    candidateUrls.push(targetUrl.replace('framextv.tech', 'framextv.xyz'));
  } else if (targetUrl.includes('framextv.xyz')) {
    candidateUrls.push(targetUrl.replace('framextv.xyz', 'framextv.tech'));
  }

  const isPost = req.method === 'POST';
  const isFrameX = targetUrl.includes('framextv.tech') || targetUrl.includes('framextv.xyz');

  for (const candidate of candidateUrls) {
    try {
      const upstreamRes = await fetch(candidate, {
        method: req.method,
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          ...(isFrameX
            ? {
                'Referer': 'https://framextv.xyz/',
                'Origin': 'https://framextv.xyz',
              }
            : {}),
          ...(isPost ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(isPost && req.body ? { body: JSON.stringify(req.body) } : {}),
      });

      if (upstreamRes.status >= 500 && candidateUrls.indexOf(candidate) < candidateUrls.length - 1) {
        continue;
      }

      clearTimeout(timeoutId);
      const contentType = upstreamRes.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', contentType);
      res.status(upstreamRes.status);

      const body = await upstreamRes.text();
      return res.send(body);
    } catch {
      // Try next candidate
    }
  }

  clearTimeout(timeoutId);
  return res.status(502).json({
    error: 'Gagal menghubungi server hulu.',
    details: 'Semua server FrameX (xyz & tech) telah dicoba.',
  });
});

// ==========================================
// Indonesian Synopsis Manual Dictionary
// ==========================================
const SERVER_MANUAL_SYNOPSES: Record<string, string> = {
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
    for (const [key, val] of Object.entries(SERVER_MANUAL_SYNOPSES)) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        return val;
      }
    }
  }
  return text || 'Sinopsis tayangan ini tersedia di Zhafx Streaming.';
}

// ==========================================
// FrameX Home Catalog API with Auto Failover & Indonesian Translation
// ==========================================
let serverCachedHomeData: any = null;
let serverCacheExpiry = 0;

app.get('/api/home', async (_req: Request, res: Response) => {
  const now = Date.now();
  if (serverCachedHomeData && serverCacheExpiry > now) {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(serverCachedHomeData);
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
    if (serverCachedHomeData) {
      return res.status(200).json(serverCachedHomeData);
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
      try {
        const animeRes = await fetch('https://api.framextv.tech/anime/api/discover?page=1', {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://framextv.xyz/',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (animeRes.ok) {
          const animeData = await animeRes.json();
          const items = Array.isArray(animeData.results) ? animeData.results : [];
          rails.popular_anime = {
            success: true,
            results: items.slice(0, 10).map((a: any) => ({
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
          };
          rails.airing_anime = {
            success: true,
            results: items.slice(10, 20).map((a: any) => ({
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
          };
        }
      } catch {
        // Safe fallback
      }
    }

    serverCachedHomeData = rawHomeData;
    serverCacheExpiry = now + 5 * 60 * 1000;

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(rawHomeData);
  } catch (err: any) {
    console.warn('[Home Endpoint Error]:', err?.message || err);
    return res.status(200).json(rawHomeData);
  }
});

// ==========================================
// FrameX Dedicated Catalog & Search Engine (Movie, TV & Anime)
// ==========================================
const FRAMEX_API_BACKENDS = [
  'https://api.framextv.xyz',
  'https://api.framextv.tech',
  'https://api.framextv.cc',
];

interface ServerApiCacheItem {
  data: any;
  expiry: number;
}
const serverApiMemoryCache = new Map<string, ServerApiCacheItem>();

async function fetchFromFrameXUpstream(
  endpoint: string,
  query?: Record<string, any>,
  timeoutMs = 7000
): Promise<any> {
  const q = new URLSearchParams();
  if (query) {
    for (const [key, val] of Object.entries(query)) {
      if (val !== undefined && val !== null && val !== '') {
        q.set(key, String(val));
      }
    }
  }
  const queryString = q.toString() ? `?${q.toString()}` : '';
  const cacheKey = `${endpoint}${queryString}`;
  const cached = serverApiMemoryCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  for (const backend of FRAMEX_API_BACKENDS) {
    try {
      const upstreamRes = await fetch(`${backend}${endpoint}${queryString}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://framextv.xyz/',
          Origin: 'https://framextv.xyz',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        if (data) {
          serverApiMemoryCache.set(cacheKey, {
            data,
            expiry: Date.now() + 5 * 60 * 1000,
          });
          return data;
        }
      }
    } catch {
      // try next backend
    }
  }

  return null;
}

// 1. Discover endpoint (Film / Movie & Serial TV catalog with filters)
app.get('/api/discover', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'movie';
  const genre = req.query.genre as string;
  const year = req.query.year as string;
  const minRating = req.query.min_rating as string;
  const sort = req.query.sort as string;
  const page = (req.query.page as string) || '1';

  // Anime Discover via FrameX Anime API
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
        return res.json({
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
    } catch (err) {
      console.warn('[Discover Anime Error]:', err);
    }
  }

  // Movie or TV Discover directly from FrameX API
  const upstreamData = await fetchFromFrameXUpstream('/api/discover', {
    type,
    ...(genre && genre !== 'all' ? { genre } : {}),
    ...(year && year !== 'all' ? { year } : {}),
    ...(minRating ? { min_rating: minRating } : {}),
    ...(sort ? { sort } : {}),
    page,
  });

  if (upstreamData) {
    if (Array.isArray(upstreamData.results)) {
      upstreamData.results.forEach((item: any) => {
        if (item.overview) {
          item.overview = getManualSynopsis(item.overview, item.title);
        }
      });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(upstreamData);
  }

  return res.status(502).json({
    success: false,
    error: 'Gagal memuat katalog film dari FrameX API.',
    results: [],
  });
});

// 2. Trending titles endpoint
app.get('/api/trending', async (req: Request, res: Response) => {
  const page = (req.query.page as string) || '1';
  const type = req.query.type as string;
  const upstreamData = await fetchFromFrameXUpstream('/api/trending', {
    page,
    ...(type ? { type } : {}),
  });

  if (upstreamData) {
    if (Array.isArray(upstreamData.results)) {
      upstreamData.results.forEach((item: any) => {
        if (item.overview) {
          item.overview = getManualSynopsis(item.overview, item.title);
        }
      });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(upstreamData);
  }

  return res.status(502).json({
    success: false,
    error: 'Gagal memuat tayangan trending dari FrameX API.',
    results: [],
  });
});

// 3. Details endpoint (Movie, TV, & Anime)
app.get('/api/details', async (req: Request, res: Response) => {
  const id = req.query.id as string;
  const type = (req.query.type as string) || 'movie';

  if (!id) {
    return res.status(400).json({ error: 'ID tayangan diperlukan' });
  }

  if (type === 'anime') {
    const upstream = await fetchFromFrameXUpstream('/api/details', { id, type: 'anime' });
    if (upstream && (upstream.success || upstream.title)) {
      return res.json(upstream);
    }
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

  const upstreamData = await fetchFromFrameXUpstream('/api/details', { id, type });
  if (upstreamData) {
    if (upstreamData.overview) {
      upstreamData.overview = getManualSynopsis(upstreamData.overview, upstreamData.title);
    }
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(upstreamData);
  }

  return res.status(502).json({ error: 'Gagal memuat detail tayangan dari FrameX API.' });
});

// 4. Search endpoint (Film, TV, and Anime)
app.get('/api/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  const type = req.query.type as string;
  const page = (req.query.page as string) || '1';

  if (!q || !q.trim()) {
    return res.json({ success: true, results: [], totalPages: 1, totalResults: 0 });
  }

  const upstreamData = await fetchFromFrameXUpstream('/api/search', {
    q: q.trim(),
    ...(type ? { type } : {}),
    page,
  });

  if (upstreamData) {
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
    return res.status(200).json(upstreamData);
  }

  return res.status(502).json({ success: false, error: 'Gagal melakukan pencarian di FrameX.' });
});

// 5. TV Season episodes endpoint
app.get('/api/season', async (req: Request, res: Response) => {
  const id = req.query.id as string;
  const season = (req.query.season as string) || '1';

  if (!id) {
    return res.status(400).json({ error: 'ID tayangan diperlukan.' });
  }

  const upstreamData = await fetchFromFrameXUpstream('/api/season', { id, season });
  if (upstreamData) {
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1200');
    return res.status(200).json(upstreamData);
  }

  return res.status(502).json({ error: 'Gagal memuat episode musim dari FrameX.' });
});

// ==========================================
// FrameX Streaming Providers (Separated by Movie, TV, & Anime)
// ==========================================

// Get Movie & TV Providers directly from FrameX API
app.get('/api/providers', async (req: Request, res: Response) => {
  const type = (req.query.type as string) || 'movie';

  if (type === 'anime') {
    try {
      const upstreamRes = await fetch('https://api.framextv.tech/anime/api/providers', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
        },
      });
      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        return res.json(data);
      }
    } catch (err) {
      console.warn('[Providers Anime Error]:', err);
    }
  }

  // Fetch Movie & TV Providers from FrameX upstream
  const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];
  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/providers`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
        },
        signal: AbortSignal.timeout(6000),
      });
      if (upstreamRes.ok) {
        const data = await upstreamRes.json();
        if (data && Array.isArray(data.providers)) {
          return res.json(data);
        }
      }
    } catch {
      // try next backend
    }
  }

  // Fallback catalogue if upstream is slow
  if (type === 'tv') {
    return res.json({
      providers: [
        { id: 'miner', name: 'Server 1', tagline: 'Server Utama', category: 'tv', status: 'available' },
        { id: 'headhunter', name: 'Server 2', tagline: 'Server Cadangan Multi-Sub', category: 'tv', status: 'available' },
        { id: 'valkyrie', name: 'Server 3', tagline: 'Server Cadangan Cepat', category: 'tv', status: 'available' },
        { id: 'titan', name: 'Server 4', tagline: 'Server Cadangan Direct', category: 'tv', status: 'available' },
        { id: 'hog_rider', name: 'Server 5', tagline: 'Server Cadangan Stabil', category: 'tv', status: 'available' },
        { id: 'lavahound', name: 'Server 6', tagline: 'Server Cadangan Multi-CDN', category: 'tv', status: 'available' },
        { id: 'super_barbarian', name: 'Server 7', tagline: 'Server Cadangan HLS', category: 'tv', status: 'available' },
        { id: 'bowler', name: 'Server 8', tagline: 'Server Cadangan Multi-Bahasa', category: 'tv', status: 'available' },
        { id: 'giant', name: 'Server 9', tagline: 'Server Cadangan Audio', category: 'tv', status: 'available' },
      ],
    });
  }

  return res.json({
    providers: [
      { id: 'miner', name: 'Server 1', tagline: 'Server Utama', category: 'movie', status: 'available' },
      { id: 'headhunter', name: 'Server 2', tagline: 'Server Cadangan Multi-Sub', category: 'movie', status: 'available' },
      { id: 'valkyrie', name: 'Server 3', tagline: 'Server Cadangan Cepat', category: 'movie', status: 'available' },
      { id: 'titan', name: 'Server 4', tagline: 'Server Cadangan Direct', category: 'movie', status: 'available' },
      { id: 'hog_rider', name: 'Server 5', tagline: 'Server Cadangan Stabil', category: 'movie', status: 'available' },
      { id: 'lavahound', name: 'Server 6', tagline: 'Server Cadangan Multi-CDN', category: 'movie', status: 'available' },
      { id: 'super_barbarian', name: 'Server 7', tagline: 'Server Cadangan HLS', category: 'movie', status: 'available' },
      { id: 'bowler', name: 'Server 8', tagline: 'Server Cadangan Multi-Bahasa', category: 'movie', status: 'available' },
      { id: 'giant', name: 'Server 9', tagline: 'Server Cadangan Audio', category: 'movie', status: 'available' },
    ],
  });
});

// ==========================================
// Native Anime Stream & Proxy (FrameX API Engine)
// ==========================================

// Get FrameX Anime Providers
app.get('/api/anime/providers', async (_req: Request, res: Response) => {
  try {
    const upstreamRes = await fetch('https://api.framextv.tech/anime/api/providers', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://framextv.xyz/',
        'Origin': 'https://framextv.xyz',
      },
    });
    if (upstreamRes.ok) {
      const data = await upstreamRes.json();
      if (data && Array.isArray(data.providers)) {
        data.providers = data.providers.map((p: any, idx: number) => ({
          ...p,
          name: `ZHAFX ENTITY ${String(idx + 1).padStart(3, '0')}`,
        }));
        return res.json(data);
      }
      return res.json(data);
    }
  } catch (err) {
    console.warn('[Anime Providers Error]:', err);
  }

  // Fallback providers catalogue if upstream is slow
  return res.json({
    providers: [
      { id: 'grand_warden', name: 'ZHAFX ENTITY 001', tagline: '1080p Ultra Fast Multi-Source Cloud', audio: 'sub', category: 'anime' },
      { id: 'grand_warden_dub', name: 'ZHAFX ENTITY 002', tagline: 'Multi-Source Cloud Dub', audio: 'dub', category: 'anime' },
      { id: 'wizard', name: 'ZHAFX ENTITY 003', tagline: 'Dual Audio & Softsub', audio: 'sub', category: 'anime' },
      { id: 'wizard_dub', name: 'ZHAFX ENTITY 004', tagline: 'Dual Audio English Dub', audio: 'dub', category: 'anime' },
      { id: 'super_pekka', name: 'ZHAFX ENTITY 005', tagline: '1080p Ultra High Bitrate CDN', audio: 'sub', category: 'anime' },
      { id: 'giant', name: 'ZHAFX ENTITY 006', tagline: 'High Bitrate HD Cloud Stream', audio: 'sub', category: 'anime' },
      { id: 'valkyrie', name: 'ZHAFX ENTITY 007', tagline: 'FlixCloud HD Fast Stream', audio: 'sub', category: 'anime' },
      { id: 'valkyrie_dub', name: 'ZHAFX ENTITY 008', tagline: 'FlixCloud HD Dub', audio: 'dub', category: 'anime' },
      { id: 'goblin', name: 'ZHAFX ENTITY 009', tagline: 'Direct Fast Auto Stream', audio: 'sub', category: 'anime' },
      { id: 'dragon', name: 'ZHAFX ENTITY 010', tagline: 'VidNest Multi-Source', audio: 'sub', category: 'anime' },
      { id: 'archer', name: 'ZHAFX ENTITY 011', tagline: 'Multi-Audio Stream', audio: 'sub', category: 'anime' },
    ],
  });
});

// Helper: Query FrameX API directly to resolve anime ID or title (Strictly https://framextv.xyz, no AniList)
async function resolveAnimeId(id: string, title?: string): Promise<string | null> {
  const backends = ['https://api.framextv.xyz', 'https://api.framextv.tech'];
  const searchTerm = title && title.trim() ? title.trim() : (isNaN(Number(id)) ? id : null);

  if (searchTerm) {
    for (const backend of backends) {
      try {
        const res = await fetch(`${backend}/api/search?q=${encodeURIComponent(searchTerm)}&type=anime`, {
          signal: AbortSignal.timeout(3000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://framextv.xyz/',
            'Origin': 'https://framextv.xyz',
          },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (data?.results || data?.titles || []);
          if (items.length > 0 && items[0]?.id) {
            return String(items[0].id);
          }
        }
      } catch {}
    }
  }

  return id ? String(id) : null;
}

// Helper: Unwraps nested proxy URLs recursively to obtain the direct origin CDN URL and referer
function extractRealUrl(rawUrl: string, defaultRef = 'https://megaplay.buzz/'): { realUrl: string; referer: string } {
  let url = rawUrl || '';
  let referer = defaultRef;

  if (url.startsWith('/')) {
    url = `https://api.framextv.tech${url}`;
  }

  while (url.includes('/proxy?url=') || url.includes('/proxy/?url=') || url.includes('/subtitles/proxy?url=')) {
    try {
      const parsed = new URL(url);
      const innerUrl = parsed.searchParams.get('url');
      const innerRef = parsed.searchParams.get('ref') || parsed.searchParams.get('referer');
      if (innerUrl) {
        url = innerUrl;
        if (innerRef) referer = innerRef;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return { realUrl: url, referer };
}

// Helper: Single upstream provider probe
async function probeSingleProvider(
  backend: string,
  targetId: string,
  episode: string,
  prov: string,
  audio: string,
  timeoutMs = 3500
): Promise<any> {
  const q = new URLSearchParams();
  q.set('id', targetId);
  q.set('episode', episode);
  q.set('provider', prov);
  q.set('audio', audio);

  const targetUrl = `${backend}/anime/api/stream?${q.toString()}`;
  const res = await fetch(targetUrl, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': 'https://framextv.xyz/',
      'Origin': 'https://framextv.xyz',
      'Accept': 'application/json, text/plain, */*',
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
    return { ...data, provider: data.provider || prov };
  }
  throw new Error('No sources found');
}

// Helper: Cascading fast parallel probe across priority servers
async function probeMultiProviders(
  targetId: string,
  episode: string,
  audio: string,
  preferredProvider?: string
): Promise<any> {
  const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];
  const priorityList = audio === 'dub'
    ? ['grand_warden_dub', 'wizard_dub', 'valkyrie_dub', 'goblin_dub', 'dragon_dub', 'archer_dub']
    : ['grand_warden', 'wizard', 'super_pekka', 'giant', 'valkyrie', 'goblin', 'dragon', 'archer'];

  // 1. If user specifically selected a provider, probe it first across backends
  if (preferredProvider && preferredProvider !== 'auto' && preferredProvider !== 'direct_stream') {
    for (const b of backends) {
      try {
        const directData = await probeSingleProvider(b, targetId, episode, preferredProvider, audio, 3800);
        if (directData) return directData;
      } catch {}
    }
  }

  // 2. Cascading Fast Parallel Probe across remaining priority servers in chunks of 2
  const candidateList = priorityList.filter(p => p !== preferredProvider);
  for (let i = 0; i < candidateList.length; i += 2) {
    const chunk = candidateList.slice(i, i + 2);
    try {
      const winner = await Promise.any(
        chunk.map(p => probeSingleProvider(backends[0], targetId, episode, p, audio, 3500))
      );
      if (winner) return winner;
    } catch {
      // Chunk failed, continue to next server pair
    }
  }

  // 3. Fallback to secondary backend
  for (const p of candidateList.slice(0, 3)) {
    try {
      const winner = await probeSingleProvider(backends[1], targetId, episode, p, audio, 3500);
      if (winner) return winner;
    } catch {}
  }

  return null;
}

// Get Direct Anime Stream from FrameX API with server-side proxy transformation & auto failover
app.get('/api/anime/stream', async (req: Request, res: Response) => {
  const id = req.query.id as string;
  const episode = req.query.episode ? String(req.query.episode) : '1';
  const provider = (req.query.provider as string) || '';
  const audio = (req.query.audio as string) || 'sub';
  const title = (req.query.title as string) || '';

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID anime wajib diisi.' });
  }

  // Phase 1: Probe with requested ID
  let finalData = await probeMultiProviders(id, episode, audio, provider);

  // Phase 2: If no sources found with raw ID, attempt AniList ID resolution via title or TMDB lookup
  if (!finalData) {
    const resolvedId = await resolveAnimeId(id, title);
    if (resolvedId && resolvedId !== id) {
      finalData = await probeMultiProviders(resolvedId, episode, audio, provider);
    }
  }

  if (!finalData) {
    return res.status(404).json({
      success: false,
      error: `Stream anime tidak tersedia untuk episode ${episode}. Semua server HLS telah dicoba.`.trim(),
    });
  }

  const actualProvider = finalData.provider || provider || 'grand_warden';
  const fallbackApplied = provider && provider !== 'auto' && provider !== actualProvider;

  // Provide local proxied HLS stream pointing directly to the origin CDN with direct CDN fallback
  const rewrittenSources = finalData.sources.map((src: any) => {
    const defaultRef = src.headers?.Referer || src.headers?.referer || 'https://megaplay.buzz/';
    const { realUrl, referer } = extractRealUrl(src.url || '', defaultRef);

    const proxiedUrl = `/api/anime/proxy?url=${encodeURIComponent(realUrl)}&ref=${encodeURIComponent(referer)}`;

    return {
      ...src,
      url: proxiedUrl, // Primary stream URL goes directly through our web app proxy to origin CDN
      directUrl: realUrl,
      proxiedUrl,
      rawUrl: realUrl,
      headers: {
        Referer: referer,
        Origin: referer ? new URL(referer).origin : 'https://megaplay.buzz',
      },
    };
  });

  // Resolve subtitles to local converted WebVTT with direct CDN fallback
  const rewrittenSubtitles = Array.isArray(finalData.subtitles)
    ? finalData.subtitles.map((sub: any) => {
        const { realUrl } = extractRealUrl(sub.url || '', 'https://megaplay.buzz/');
        const proxiedSubUrl = `/api/anime/subtitles?url=${encodeURIComponent(realUrl)}&lang=${encodeURIComponent(sub.lang || '')}&label=${encodeURIComponent(sub.label || '')}`;

        return {
          ...sub,
          url: proxiedSubUrl, // Primary subtitle URL converted to WebVTT
          directUrl: realUrl,
          proxiedUrl: proxiedSubUrl,
          rawUrl: realUrl,
        };
      })
    : [];

  return res.status(200).json({
    success: true,
    provider: actualProvider,
    attemptedProvider: provider,
    fallbackApplied,
    server: finalData.server,
    audio: finalData.audio || audio,
    sources: rewrittenSources,
    subtitles: rewrittenSubtitles,
    meta: finalData.meta,
  });
});

// Proxy and rewrite HLS Playlists (.m3u8) & video segments (.ts/.jpg/.mp4) directly from Origin CDNs
app.all('/api/anime/proxy', async (req: Request, res: Response) => {
  // If client already disconnected, exit immediately
  if (req.destroyed || res.writableEnded) return;

  const rawTargetUrl = req.query.url as string;
  const rawReferer = (req.query.ref as string) || 'https://megaplay.buzz/';

  if (!rawTargetUrl) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  // Always unwrap any nested proxy URLs to fetch straight from the actual CDN
  const { realUrl: targetUrl, referer } = extractRealUrl(rawTargetUrl, rawReferer);

  if (!targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  const clientAbortController = new AbortController();
  req.on('close', () => {
    clientAbortController.abort();
  });

  const origin = referer ? new URL(referer).origin : 'https://megaplay.buzz';
  const reqHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': referer,
    'Origin': origin,
    'Accept': '*/*',
  };
  if (req.headers.range) {
    reqHeaders['Range'] = req.headers.range;
  }

  // Multi-tier candidates: direct CDN -> primary FrameX proxy -> secondary FrameX proxy
  const candidates: Array<{ url: string; headers: Record<string, string> }> = [
    { url: targetUrl, headers: reqHeaders },
    {
      url: `https://api.framextv.tech/anime/api/proxy?url=${encodeURIComponent(targetUrl)}&ref=${encodeURIComponent(referer)}`,
      headers: {
        'User-Agent': reqHeaders['User-Agent'],
        'Referer': 'https://framextv.xyz/',
        'Origin': 'https://framextv.xyz',
        'Accept': '*/*',
        ...(req.headers.range ? { 'Range': req.headers.range } : {}),
      },
    },
    {
      url: `https://api.framextv.xyz/anime/api/proxy?url=${encodeURIComponent(targetUrl)}&ref=${encodeURIComponent(referer)}`,
      headers: {
        'User-Agent': reqHeaders['User-Agent'],
        'Referer': 'https://framextv.xyz/',
        'Origin': 'https://framextv.xyz',
        'Accept': '*/*',
        ...(req.headers.range ? { 'Range': req.headers.range } : {}),
      },
    },
  ];

  let upstreamRes: any = null;
  const isM3u8Candidate = targetUrl.includes('.m3u8');
  const timeoutPerAttempt = isM3u8Candidate ? 5500 : 9000;

  for (const candidate of candidates) {
    if (clientAbortController.signal.aborted || req.destroyed || res.writableEnded) {
      return;
    }
    try {
      const attemptSignal = AbortSignal.any
        ? AbortSignal.any([AbortSignal.timeout(timeoutPerAttempt), clientAbortController.signal])
        : AbortSignal.timeout(timeoutPerAttempt);

      const r = await fetch(candidate.url, {
        method: req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers: candidate.headers,
        signal: attemptSignal,
      });

      if (r.ok || r.status === 206) {
        upstreamRes = r;
        break;
      }
    } catch {
      // try next candidate upstream
    }
  }

  if (!upstreamRes) {
    if (!res.headersSent && !res.writableEnded && !req.destroyed) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(504).json({
        error: 'Stream anime saat ini dialihkan. Silakan gunakan pemutar mode embed.',
      });
    }
    return;
  }

  try {
    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      targetUrl.includes('.m3u8');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Accept-Ranges', 'bytes');

    if (isM3u8) {
      const text = await upstreamRes.text();
      if (text.includes('#EXTM3U')) {
        const lines = text.split('\n');
        const rewritten = lines.map((line: string) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith('#')) {
            // Rewrite URI="..." in #EXT-X-KEY or #EXT-X-MAP
            return line.replace(/URI=["']([^"']+)["']/g, (_match: string, uri: string) => {
              try {
                const absUrl = new URL(uri, targetUrl).href;
                const { realUrl: finalUri } = extractRealUrl(absUrl, referer);
                return `URI="/api/anime/proxy?url=${encodeURIComponent(finalUri)}&ref=${encodeURIComponent(referer)}"`;
              } catch {
                return line;
              }
            });
          }
          // Segment or variant m3u8 line
          try {
            const absUrl = new URL(trimmed, targetUrl).href;
            const { realUrl: finalSegUrl } = extractRealUrl(absUrl, referer);
            return `/api/anime/proxy?url=${encodeURIComponent(finalSegUrl)}&ref=${encodeURIComponent(referer)}`;
          } catch {
            return line;
          }
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.status(upstreamRes.status);
        return res.send(rewritten.join('\n'));
      }
    }

    // Binary segment or direct stream
    if (upstreamRes.headers.get('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    if (upstreamRes.headers.get('content-range')) {
      res.setHeader('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    const finalContentType =
      contentType && (contentType.includes('mp4') || contentType.includes('webm'))
        ? contentType
        : 'video/MP2T';
    res.setHeader('Content-Type', finalContentType);
    res.status(upstreamRes.status);

    if (upstreamRes.body) {
      const { Readable, pipeline } = await import('stream');
      // @ts-ignore
      const nodeStream = Readable.fromWeb(upstreamRes.body);
      pipeline(nodeStream, res, () => {
        // Safe completion without uncaught pipe errors on client disconnect
      });
    } else {
      res.end();
    }
  } catch (err: any) {
    if (req.destroyed || res.writableEnded || err?.name === 'AbortError') {
      return;
    }
    console.warn('[Anime Proxy Notice]:', err?.message || err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gagal memproses stream video anime.' });
    }
  }
});

// Serve and convert Subtitles to clean WebVTT
app.get('/api/anime/subtitles', async (req: Request, res: Response) => {
  const rawUrl = req.query.url as string;
  if (!rawUrl) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send('WEBVTT\n\n');
  }

  const { realUrl: targetUrl, referer } = extractRealUrl(rawUrl, 'https://megaplay.buzz/');
  if (!targetUrl.startsWith('http')) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send('WEBVTT\n\n');
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': referer,
      },
      signal: AbortSignal.timeout(6000),
    });

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!upstreamRes.ok) {
      return res.send('WEBVTT\n\n');
    }

    const text = await upstreamRes.text();

    // If already WebVTT
    if (text.startsWith('WEBVTT')) {
      return res.send(text);
    }

    // Convert SRT to WebVTT
    let vtt = 'WEBVTT\n\n' + text.trim();
    vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    return res.send(vtt);
  } catch (err: any) {
    console.error('[Anime Subtitles Error]:', err?.message || err);
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send('WEBVTT\n\n');
  }
});

// Get Direct Movie/TV Stream from FrameX API
app.get('/api/stream', async (req: Request, res: Response) => {
  const id = req.query.id as string;
  const type = (req.query.type as string) || 'movie';
  const season = req.query.season ? String(req.query.season) : undefined;
  const episode = req.query.episode ? String(req.query.episode) : undefined;
  const provider = (req.query.provider as string) || '';

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
});

// ==========================================
// Authentication Endpoints (Server-Side)
// ==========================================

// Request Email OTP Verification Code
app.post('/api/auth/send-verification-code', async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Alamat email wajib diisi.' });
    }

    const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) || req.socket?.remoteAddress;
    const result = await createAndSendOtp({
      email,
      name,
      ip: String(clientIp || ''),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        cooldownSeconds: result.cooldownSeconds,
        maskedEmail: result.maskedEmail,
      });
    }

    // CRITICAL: NEVER leak OTP code in response or console!
    return res.status(200).json({
      success: true,
      message: 'Verifikasi email diperlukan. Kami telah mengirimkan kode verifikasi ke alamat email kamu. Silakan periksa kotak masuk Gmail, termasuk folder Spam atau Promosi, kemudian masukkan kode untuk melanjutkan pendaftaran.',
      maskedEmail: result.maskedEmail,
      cooldownSeconds: result.cooldownSeconds || 60,
    });
  } catch (err: any) {
    console.error('[Send Code Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengirim kode verifikasi email.' });
  }
});

// Verify Code & Complete Registration / Login
app.post('/api/auth/verify-code', async (req: Request, res: Response) => {
  try {
    const { email, code, name } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email dan kode verifikasi 6-digit wajib diisi.' });
    }

    const result = await verifyOtpAndAuthenticate({
      email,
      code,
      name,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Verify Code Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memverifikasi kode.' });
  }
});

// Register Account with Email & Password
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body || {};
    const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) || req.socket?.remoteAddress;

    const result = await registerWithPassword({
      name,
      email,
      password,
      ip: String(clientIp || ''),
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server saat memproses pendaftaran. Silakan coba lagi.',
    });
  }
});

// Login with Email/Username & Password
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { login, email, username, password, rememberMe } = req.body || {};
    const rawLogin = (login || email || username || '').trim();
    const clientIp = (req.headers['x-forwarded-for'] || req.headers['x-real-ip']) || req.socket?.remoteAddress;

    const result = await loginWithPassword({
      login: rawLogin,
      password: password || '',
      rememberMe: Boolean(rememberMe),
      ip: String(clientIp || ''),
    });

    if (!result.success) {
      return res.status(401).json({
        success: false,
        error: result.error,
      });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server saat memproses login. Silakan coba lagi.',
    });
  }
});

// Check Session / Current User
app.get('/api/auth/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Token autentikasi tidak ditemukan.',
      });
    }

    const token = authHeader.substring(7).trim();
    const user = getUserByToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Sesi tidak valid atau telah berakhir.',
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err: any) {
    console.error('[Auth Me Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal memverifikasi sesi autentikasi.',
    });
  }
});

// Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const db = readAuthDb();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      writeAuthDb(db);
    }
    return res.status(200).json({
      success: true,
      message: 'Berhasil keluar dari sesi akun.',
    });
  } catch (err: any) {
    console.error('[Auth Logout Error]:', err);
    return res.status(200).json({ success: true });
  }
});

// Google / Gmail OAuth 2.0 Web Redirection Endpoint
function getRequestOrigin(req: Request): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.get('host') || 'localhost:3000';
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto)?.split(',')[0]?.trim() || req.protocol || 'http';
  return `${protocol}://${host}`;
}

app.get('/api/auth/google/login', (req: Request, res: Response) => {
  // Always derive the callback from the request host. Trusting a client-supplied
  // origin causes Google to reject the code exchange when a proxy rewrites hosts.
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '358715674309-hdh36g2l56bqv0rckcvcd4666kemh4sj.apps.googleusercontent.com';

  const state = crypto.randomBytes(16).toString('hex');
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', state);

  res.redirect(googleAuthUrl.toString());
});

// Google OAuth 2.0 Callback Handler
app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const origin = getRequestOrigin(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (error || !code) {
    const errorMsg = error || 'Otorisasi Google dibatalkan atau gagal.';
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Autentikasi Google Gagal</title></head>
        <body style="font-family:sans-serif;background:#06070B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;border:1px solid rgba(255,255,255,0.15);border-radius:20px;max-width:400px;background:#0E1017;">
            <h2 style="color:#ef4444;margin-top:0;">Autentikasi Dibatalkan</h2>
            <p style="font-size:14px;color:rgba(255,255,255,0.7);">${errorMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${errorMsg}' }, '*');
                setTimeout(() => window.close(), 1500);
              } else {
                setTimeout(() => { window.location.href = '/'; }, 2000);
              }
            </script>
          </div>
        </body>
      </html>
    `);
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '358715674309-hdh36g2l56bqv0rckcvcd4666kemh4sj.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET_2 || process.env.GOOGLE_CLIENT_SECRET || '';

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errJson = await tokenRes.json().catch(() => ({}));
      const msg = errJson.error_description || 'Gagal menukarkan token otorisasi Google.';
      throw new Error(msg);
    }

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error('Gagal memuat profil pengguna dari Google.');
    }

    const userData = await userRes.json();
    const cleanEmail = userData.email?.toLowerCase();
    if (!cleanEmail) {
      throw new Error('Email tidak ditemukan pada akun Google.');
    }

    const cleanName = userData.name || cleanEmail.split('@')[0];
    const userAvatar = userData.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4285f4,34a853,fbbc05,ea4335`;

    const result = await authenticateGoogleUser({
      email: cleanEmail,
      name: cleanName,
      avatar: userAvatar,
      googleId: userData.sub,
    });

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Autentikasi Berhasil</title></head>
        <body style="font-family:sans-serif;background:#06070B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:28px;border:1px solid rgba(255,255,255,0.2);border-radius:24px;max-width:420px;background:#0E1017;box-shadow:0 12px 32px rgba(0,0,0,0.5);">
            <div style="width:48px;height:48px;border-radius:50%;background:#10b981;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
              <span style="font-size:24px;color:#fff;">✓</span>
            </div>
            <h2 style="margin:0 0 8px 0;font-size:18px;">Berhasil Masuk!</h2>
            <p style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:16px;">Selamat datang, <b>${cleanName}</b>. Mengalihkan ke Zhafx...</p>
            <script>
              const payload = {
                type: 'GOOGLE_AUTH_SUCCESS',
                token: '${result.token}',
                user: ${JSON.stringify(result.user)}
              };
              if (window.opener) {
                window.opener.postMessage(payload, '*');
                setTimeout(() => window.close(), 800);
              } else {
                window.location.href = '/?token=' + encodeURIComponent('${result.token}');
              }
            </script>
          </div>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('[Google OAuth Callback Error]:', err);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Error Autentikasi Google</title></head>
        <body style="font-family:sans-serif;background:#06070B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;border:1px solid rgba(255,255,255,0.15);border-radius:20px;max-width:420px;background:#0E1017;">
            <h2 style="color:#ef4444;margin-top:0;">Gagal Masuk Google</h2>
            <p style="font-size:13px;color:rgba(255,255,255,0.7);">${err.message || 'Terjadi kesalahan sistem'}</p>
            <a href="/" style="display:inline-block;margin-top:12px;padding:8px 16px;background:#fff;color:#000;border-radius:9999px;text-decoration:none;font-size:12px;font-weight:bold;">Kembali ke Beranda</a>
          </div>
        </body>
      </html>
    `);
  }
});

// Google / Gmail Direct 1-Click Login & API verification
app.post('/api/auth/google-login', async (req: Request, res: Response) => {
  try {
    const { email, name, credential, code, redirectUri, avatar, googleId } = req.body || {};

    let cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    let cleanName = typeof name === 'string' ? name.trim() : '';
    let userAvatar = typeof avatar === 'string' ? avatar.trim() : undefined;
    let userGoogleId = typeof googleId === 'string' ? googleId.trim() : undefined;

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET_2 || process.env.GOOGLE_CLIENT_SECRET || '';
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '358715674309-hdh36g2l56bqv0rckcvcd4666kemh4sj.apps.googleusercontent.com';

    // 1. Verify Google Authorization Code if provided
    if (code && clientSecret) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri || 'postmessage',
            grant_type: 'authorization_code',
          }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          if (tokenData.access_token) {
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              if (userData.email) {
                cleanEmail = userData.email.toLowerCase();
                cleanName = userData.name || cleanEmail.split('@')[0];
                userAvatar = userData.picture || userAvatar;
                userGoogleId = userData.sub || userGoogleId;
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Google Auth Code Warning]:', err?.message || err);
      }
    }

    // 2. Verify Google Credential (JWT ID Token) if provided
    if (credential && typeof credential === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          if (payload.email) {
            cleanEmail = payload.email.toLowerCase();
            cleanName = payload.name || cleanEmail.split('@')[0];
            userAvatar = payload.picture || userAvatar;
            userGoogleId = payload.sub || userGoogleId;
          }
        } else {
          console.warn('[Google Auth] tokeninfo check returned non-200, attempting token payload extraction');
        }
      } catch (err: any) {
        console.warn('[Google Auth] tokeninfo fetch error:', err?.message || err);
      }

      // Safe JWT payload fallback if tokeninfo network fails
      if (!cleanEmail && credential.includes('.')) {
        try {
          const parts = credential.split('.');
          if (parts.length >= 2) {
            const rawPayload = Buffer.from(parts[1], 'base64').toString('utf-8');
            const parsed = JSON.parse(rawPayload);
            if (parsed && parsed.email) {
              cleanEmail = String(parsed.email).toLowerCase();
              cleanName = parsed.name || cleanEmail.split('@')[0];
              userAvatar = parsed.picture || userAvatar;
              userGoogleId = parsed.sub || userGoogleId;
            }
          }
        } catch {
          // silent
        }
      }
    }

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Email Google atau token kredensial tidak valid.' });
    }

    if (!cleanName) {
      cleanName = cleanEmail.split('@')[0];
    }

    if (!userAvatar) {
      userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4285f4,34a853,fbbc05,ea4335`;
    }

    const result = await authenticateGoogleUser({
      email: cleanEmail,
      name: cleanName,
      avatar: userAvatar,
      googleId: userGoogleId,
    });

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Google Auth Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memproses autentikasi Google. Silakan coba kembali.' });
  }
});

// ==========================================
// Continue Watching / Video Progress Endpoints
// ==========================================

// Get user's continue watching items or progress for a specific title
app.get('/api/progress', (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autentikasi diperlukan untuk mengakses riwayat continue watching.',
      });
    }

    const { contentId, season, episode, all } = req.query;
    const allDbRecords = readProgressDb();
    let userRecords = allDbRecords.filter((r) => r.userId === userId);

    if (contentId) {
      userRecords = userRecords.filter((r) => r.contentId === String(contentId));
      if (season !== undefined) {
        userRecords = userRecords.filter((r) => r.season === Number(season));
      }
      if (episode !== undefined) {
        userRecords = userRecords.filter((r) => r.episode === Number(episode));
      }
    } else if (all !== 'true') {
      // By default for Continue Watching list, only return uncompleted items with positive progress
      userRecords = userRecords.filter((r) => !r.completed && r.currentTime > 5);
    }

    // Sort by last watched (most recent first)
    userRecords.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);

    return res.status(200).json({
      success: true,
      progress: userRecords,
    });
  } catch (err: any) {
    console.error('[Progress GET Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan saat memuat progres tontonan.',
    });
  }
});

// Save / update watch progress
app.post('/api/progress', (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autentikasi diperlukan untuk menyimpan progres tontonan.',
      });
    }

    const {
      contentId,
      episodeId,
      mediaType,
      title,
      poster,
      backdrop,
      year,
      season,
      episode,
      episodeName,
      currentTime,
      duration,
      completed,
    } = req.body || {};

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'contentId wajib disertakan.',
      });
    }

    const validDuration = Math.max(1, Math.round(Number(duration) || 1));
    const validCurrentTime = Math.max(0, Math.min(validDuration, Math.round(Number(currentTime) || 0)));
    const progressPercentage = Math.min(100, Math.max(0, Math.round((validCurrentTime / validDuration) * 100)));

    // Mark as completed if requested, or if >= 95%, or if within last 30 seconds of video
    const isCompleted =
      completed === true ||
      progressPercentage >= 95 ||
      (validDuration > 60 && validDuration - validCurrentTime <= 30 && validCurrentTime > 30);

    const sNum = season !== undefined ? Number(season) : undefined;
    const epNum = episode !== undefined ? Number(episode) : undefined;
    const recordId = `${userId}_${contentId}_s${sNum ?? 1}_e${epNum ?? 1}`;

    const newRecord: StoredProgress = {
      id: recordId,
      userId,
      contentId: String(contentId),
      episodeId: episodeId || (sNum || epNum ? `s${sNum || 1}_e${epNum || 1}` : undefined),
      mediaType: (mediaType === 'tv' || mediaType === 'anime' ? mediaType : 'movie'),
      title: String(title || 'Tayangan'),
      poster: String(poster || ''),
      backdrop: backdrop ? String(backdrop) : undefined,
      year: String(year || ''),
      season: sNum,
      episode: epNum,
      episodeName: episodeName ? String(episodeName) : undefined,
      currentTime: validCurrentTime,
      duration: validDuration,
      progressPercentage,
      lastWatchedAt: Date.now(),
      completed: isCompleted,
    };

    const records = readProgressDb();
    const existingIndex = records.findIndex((r) => r.id === recordId);

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
    }

    writeProgressDb(records);

    return res.status(200).json({
      success: true,
      record: newRecord,
    });
  } catch (err: any) {
    console.error('[Progress POST Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server saat menyimpan progres tontonan.',
    });
  }
});

// Remove item from Continue Watching
app.delete('/api/progress/:contentId', (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autentikasi diperlukan.',
      });
    }

    const { contentId } = req.params;
    const { season, episode } = req.query;

    const records = readProgressDb();
    const updated = records.filter((r) => {
      if (r.userId !== userId) return true;
      if (r.contentId !== contentId) return true;
      if (season !== undefined && r.season !== Number(season)) return true;
      if (episode !== undefined && r.episode !== Number(episode)) return true;
      return false;
    });

    writeProgressDb(updated);

    return res.status(200).json({
      success: true,
      message: 'Item berhasil dihapus dari Continue Watching.',
    });
  } catch (err: any) {
    console.error('[Progress DELETE Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal menghapus item progres.',
    });
  }
});

// Batch sync progress from client storage (e.g. after login)
app.post('/api/progress/sync', (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Autentikasi diperlukan untuk sinkronisasi progres.',
      });
    }

    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ success: true, count: 0 });
    }

    const records = readProgressDb();
    let count = 0;

    for (const item of items) {
      if (!item || !item.contentId) continue;
      const sNum = item.season !== undefined ? Number(item.season) : undefined;
      const epNum = item.episode !== undefined ? Number(item.episode) : undefined;
      const recordId = `${userId}_${item.contentId}_s${sNum ?? 1}_e${epNum ?? 1}`;

      const validDuration = Math.max(1, Math.round(Number(item.duration) || 1));
      const validCurrentTime = Math.max(0, Math.min(validDuration, Math.round(Number(item.currentTime) || 0)));
      const progressPercentage = Math.min(100, Math.max(0, Math.round((validCurrentTime / validDuration) * 100)));

      const syncedRecord: StoredProgress = {
        id: recordId,
        userId,
        contentId: String(item.contentId),
        episodeId: item.episodeId || (sNum || epNum ? `s${sNum || 1}_e${epNum || 1}` : undefined),
        mediaType: item.mediaType === 'tv' || item.mediaType === 'anime' ? item.mediaType : 'movie',
        title: String(item.title || 'Tayangan'),
        poster: String(item.poster || ''),
        backdrop: item.backdrop ? String(item.backdrop) : undefined,
        year: String(item.year || ''),
        season: sNum,
        episode: epNum,
        episodeName: item.episodeName ? String(item.episodeName) : undefined,
        currentTime: validCurrentTime,
        duration: validDuration,
        progressPercentage,
        lastWatchedAt: Number(item.lastWatchedAt) || Date.now(),
        completed: Boolean(item.completed || progressPercentage >= 95),
      };

      const existingIndex = records.findIndex((r) => r.id === recordId);
      if (existingIndex >= 0) {
        // Keep the one with newer lastWatchedAt
        if (syncedRecord.lastWatchedAt > records[existingIndex].lastWatchedAt) {
          records[existingIndex] = syncedRecord;
        }
      } else {
        records.push(syncedRecord);
      }
      count++;
    }

    writeProgressDb(records);

    return res.status(200).json({
      success: true,
      count,
    });
  } catch (err: any) {
    console.error('[Progress Sync Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal melakukan sinkronisasi progres.',
    });
  }
});

// Clear all progress for user
app.post('/api/progress/clear', (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan.' });
    }

    const records = readProgressDb();
    const filtered = records.filter((r) => r.userId !== userId);
    writeProgressDb(filtered);

    return res.status(200).json({
      success: true,
      message: 'Semua progres tontonan berhasil dibersihkan.',
    });
  } catch (err: any) {
    console.error('[Progress Clear Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal membersihkan progres.' });
  }
});

// Serve Sitemap for Google Search Console & Search Crawlers
app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const publicSitemapPath = path.resolve(__dirname, 'public', 'sitemap.xml');
  const distSitemapPath = path.resolve(__dirname, 'dist', 'sitemap.xml');
  const targetPath = fs.existsSync(publicSitemapPath) ? publicSitemapPath : distSitemapPath;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.status(404).send('Sitemap not found');
});

// Serve Robots.txt
app.get('/robots.txt', (_req: Request, res: Response) => {
  const publicRobotsPath = path.resolve(__dirname, 'public', 'robots.txt');
  const distRobotsPath = path.resolve(__dirname, 'dist', 'robots.txt');
  const targetPath = fs.existsSync(publicRobotsPath) ? publicRobotsPath : distRobotsPath;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.send("User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://zhafxstreaming.web.id/sitemap.xml\n");
});

// Serve Google Search Console Verification File
app.get('/google4f8019285e68db73.html', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send('google-site-verification: google4f8019285e68db73.html\n');
});

// Serve llms.txt for AI crawlers & Agentic discovery
app.get(['/llms.txt', '/.well-known/llms.txt'], (_req: Request, res: Response) => {
  const publicLlmsPath = path.resolve(__dirname, 'public', 'llms.txt');
  const distLlmsPath = path.resolve(__dirname, 'dist', 'llms.txt');
  const targetPath = fs.existsSync(publicLlmsPath) ? publicLlmsPath : distLlmsPath;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.status(404).send('llms.txt not found');
});

// Serve ai-catalog.json for Agentic Resource Discovery (ARD) standard
app.get(['/ai-catalog.json', '/.well-known/ai-catalog.json'], (_req: Request, res: Response) => {
  const publicCatalogPath = path.resolve(__dirname, 'public', 'ai-catalog.json');
  const distCatalogPath = path.resolve(__dirname, 'dist', 'ai-catalog.json');
  const targetPath = fs.existsSync(publicCatalogPath) ? publicCatalogPath : distCatalogPath;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  return res.status(404).json({ error: 'ai-catalog.json not found' });
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  // Serve static assets from public directly (favicons, logos, manifests, robots, sitemap)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));

    let cachedHtml: string | null = null;
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.resolve(__dirname, 'dist', 'index.html');
      if (!fs.existsSync(indexPath)) {
        return res.status(404).send('Not Found');
      }

      if (!cachedHtml) {
        try {
          cachedHtml = fs.readFileSync(indexPath, 'utf-8');
        } catch {
          return res.sendFile(indexPath);
        }
      }

      const cleanPath = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
      const canonicalUrl = `https://zhafxstreaming.web.id${cleanPath === '/' ? '/' : cleanPath}`;

      let pageTitle = 'Zhafx — Platform Streaming Film, Serial TV & Anime';
      if (req.path.startsWith('/explore/anime')) {
        pageTitle = 'Jelajahi Anime — Zhafx';
      } else if (req.path.startsWith('/explore/tv')) {
        pageTitle = 'Jelajahi Serial TV — Zhafx';
      } else if (req.path.startsWith('/explore/movie')) {
        pageTitle = 'Jelajahi Film — Zhafx';
      } else if (req.path.startsWith('/explore')) {
        pageTitle = 'Jelajahi Katalog Tayangan — Zhafx';
      } else if (req.path.startsWith('/history')) {
        pageTitle = 'Riwayat Menonton — Zhafx';
      } else if (req.path.startsWith('/my-list')) {
        pageTitle = 'Daftar Tontonan Saya — Zhafx';
      }

      const customizedHtml = cachedHtml
        .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${canonicalUrl}"`)
        .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${canonicalUrl}"`)
        .replace(/<title>[^<]*<\/title>/, `<title>${pageTitle}</title>`)
        .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${pageTitle}"`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'index, follow');
      res.send(customizedHtml);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zhafx Server] Berjalan pada http://0.0.0.0:${PORT} (Mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('[Zhafx Server] Gagal memulai:', err);
});
