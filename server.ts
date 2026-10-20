import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
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

// Set Referrer-Policy to origin for proper FrameX embed player support
app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'origin');
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
    service: 'Zhafx Multi-Provider AI Engine (16 Models Active)',
    configured: Boolean(process.env.GEMINI_API_KEY),
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

  try {
    const isPost = req.method === 'POST';
    const isFrameX = targetUrl.includes('framextv.tech') || targetUrl.includes('framextv.xyz');
    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...(isFrameX ? {
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
        } : {}),
        ...(isPost ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(isPost && req.body ? { body: JSON.stringify(req.body) } : {}),
    });
    clearTimeout(timeoutId);

    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.status(upstreamRes.status);
    
    const body = await upstreamRes.text();
    res.send(body);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[API Proxy] Error fetching:', targetUrl, err?.message);
    res.status(502).json({
      error: 'Gagal menghubungi server hulu.',
      details: err?.name === 'AbortError' ? 'Koneksi timeout setelah 12 detik.' : (err?.message || 'Error jaringan')
    });
  }
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
        { id: 'miner', name: 'Miner XIX', tagline: 'Movy Multi-City TV Series 4K', category: 'tv', status: 'available' },
        { id: 'headhunter', name: 'Headhunter XXXI', tagline: 'VidLink TV Series Multi-Sub', category: 'tv', status: 'available' },
        { id: 'valkyrie', name: 'Valkyrie VI', tagline: '4K Ultra TV Multi-Server', category: 'tv', status: 'available' },
        { id: 'titan', name: 'Titan VII', tagline: 'Films365 Direct MP4 1080p Server', category: 'tv', status: 'available' },
        { id: 'hog_rider', name: 'Hog Rider XI', tagline: '4K TV Server', category: 'tv', status: 'available' },
        { id: 'lavahound', name: 'Lava Hound XII', tagline: '4K Fast TV Series Stream', category: 'tv', status: 'available' },
        { id: 'super_barbarian', name: 'Super Barbarian XVI', tagline: 'Direct Auto HLS TV Stream', category: 'tv', status: 'available' },
        { id: 'bowler', name: 'Bowler XVIII', tagline: 'Multi-Language TV Episodes', category: 'tv', status: 'available' },
        { id: 'giant', name: 'Giant XI', tagline: 'Multi-Audio TV Stream Cepat', category: 'tv', status: 'available' },
      ],
    });
  }

  return res.json({
    providers: [
      { id: 'miner', name: 'Miner XIX', tagline: 'Movy Multi-City 4K Server', category: 'movie', status: 'available' },
      { id: 'headhunter', name: 'Headhunter XXXI', tagline: 'VidLink Server Multi-Sub', category: 'movie', status: 'available' },
      { id: 'valkyrie', name: 'Valkyrie VI', tagline: '4K Ultra Multi-Server', category: 'movie', status: 'available' },
      { id: 'titan', name: 'Titan VII', tagline: 'Films365 Direct MP4 1080p Server', category: 'movie', status: 'available' },
      { id: 'hog_rider', name: 'Hog Rider XI', tagline: '4K Pilled Server', category: 'movie', status: 'available' },
      { id: 'lavahound', name: 'Lava Hound XII', tagline: '4K Fast Multi-Server Stream', category: 'movie', status: 'available' },
      { id: 'super_barbarian', name: 'Super Barbarian XVI', tagline: 'Direct Auto HLS Stream', category: 'movie', status: 'available' },
      { id: 'bowler', name: 'Bowler XVIII', tagline: 'Multi-Language', category: 'movie', status: 'available' },
      { id: 'giant', name: 'Giant XI', tagline: 'Multi-Audio Direct Stream', category: 'movie', status: 'available' },
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
app.get('/api/auth/google/login', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const defaultOrigin = `${protocol}://${host}`;
  const origin = (req.query.origin as string) || defaultOrigin;
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
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const origin = `${protocol}://${host}`;
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
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

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

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
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

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zhafx Server] Berjalan pada http://0.0.0.0:${PORT} (Mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('[Zhafx Server] Gagal memulai:', err);
});
