import express, { Request, Response } from 'express';
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
  StoredUser,
  StoredSession,
  AuthDb,
} from './server/authService';
import { executeMultiModelChat } from './server/aiPipeline';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

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
      { id: 'valkyrie', name: 'ZHAFX ENTITY 005', tagline: 'FlixCloud HD', audio: 'sub', category: 'anime' },
      { id: 'valkyrie_dub', name: 'ZHAFX ENTITY 006', tagline: 'FlixCloud HD Dub', audio: 'dub', category: 'anime' },
      { id: 'super_pekka', name: 'ZHAFX ENTITY 007', tagline: 'Direct Fast CDN', audio: 'sub', category: 'anime' },
      { id: 'dragon', name: 'ZHAFX ENTITY 008', tagline: 'VidNest Multi-Source', audio: 'sub', category: 'anime' },
      { id: 'archer', name: 'ZHAFX ENTITY 009', tagline: 'Multi-Audio', audio: 'sub', category: 'anime' },
      { id: 'giant', name: 'ZHAFX ENTITY 010', tagline: 'High Bitrate HD Stream', audio: 'sub', category: 'anime' },
    ],
  });
});

// Get Direct Anime Stream from FrameX API with server-side proxy transformation
app.get('/api/anime/stream', async (req: Request, res: Response) => {
  const id = req.query.id as string;
  const episode = req.query.episode ? String(req.query.episode) : '1';
  const provider = (req.query.provider as string) || '';
  const audio = (req.query.audio as string) || 'sub';

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID anime wajib diisi.' });
  }

  // Priority providers to attempt
  const priorityList = audio === 'dub'
    ? ['grand_warden_dub', 'wizard_dub', 'valkyrie_dub', 'archer_dub', 'dragon_dub']
    : ['grand_warden', 'wizard', 'valkyrie', 'super_pekka', 'dragon', 'archer', 'giant'];

  const providersToAttempt: string[] = [];
  if (provider && provider !== 'auto' && provider !== 'direct_stream') {
    providersToAttempt.push(provider);
  }
  for (const p of priorityList) {
    if (!providersToAttempt.includes(p)) {
      providersToAttempt.push(p);
    }
  }

  let finalData: any = null;
  let lastError: string = '';

  for (const p of providersToAttempt) {
    try {
      const q = new URLSearchParams();
      q.set('id', id);
      q.set('episode', episode);
      q.set('provider', p);
      q.set('audio', audio);

      const targetUrl = `https://api.framextv.tech/anime/api/stream?${q.toString()}`;
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.xyz/',
          'Origin': 'https://framextv.xyz',
          'Accept': 'application/json, text/plain, */*',
        },
      });

      if (!upstreamRes.ok) continue;

      const data = await upstreamRes.json();
      if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
        finalData = data;
        break;
      }
    } catch (err: any) {
      lastError = err?.message || 'Error fetching provider';
    }
  }

  if (!finalData) {
    return res.status(404).json({
      success: false,
      error: `Stream anime tidak tersedia untuk episode ${episode}. ${lastError}`.trim(),
    });
  }

  // Rewrite sources to proxy through /api/anime/proxy
  const rewrittenSources = finalData.sources.map((src: any) => {
    let rawUrl = src.url || '';
    let referer = src.headers?.Referer || src.headers?.referer || 'https://megaplay.buzz/';

    if (rawUrl.includes('/proxy?url=') || rawUrl.includes('url=')) {
      try {
        const parsedUrl = new URL(rawUrl.startsWith('http') ? rawUrl : `https://api.framextv.tech${rawUrl}`);
        const realTarget = parsedUrl.searchParams.get('url');
        const extractedRef = parsedUrl.searchParams.get('ref');
        if (realTarget) rawUrl = realTarget;
        if (extractedRef) referer = extractedRef;
      } catch {
        // use rawUrl
      }
    } else if (rawUrl.startsWith('/')) {
      rawUrl = `https://api.framextv.tech${rawUrl}`;
    }

    const proxiedUrl = `/api/anime/proxy?url=${encodeURIComponent(rawUrl)}&ref=${encodeURIComponent(referer)}`;

    return {
      ...src,
      url: proxiedUrl,
      rawUrl,
      headers: {
        Referer: referer,
        Origin: referer ? new URL(referer).origin : 'https://megaplay.buzz',
      },
    };
  });

  // Rewrite subtitles to proxy through /api/anime/subtitles with WebVTT auto-conversion
  const rewrittenSubtitles = Array.isArray(finalData.subtitles)
    ? finalData.subtitles.map((sub: any) => {
        let subUrl = sub.url || '';
        if (subUrl.includes('url=')) {
          try {
            const parsed = new URL(subUrl.startsWith('http') ? subUrl : `https://api.framextv.tech${subUrl}`);
            const real = parsed.searchParams.get('url');
            if (real) subUrl = real;
          } catch {
            // keep
          }
        } else if (subUrl.startsWith('/')) {
          subUrl = `https://api.framextv.tech${subUrl}`;
        }

        const proxiedSubUrl = `/api/anime/subtitles?url=${encodeURIComponent(subUrl)}&lang=${encodeURIComponent(sub.lang || '')}&label=${encodeURIComponent(sub.label || '')}`;

        return {
          ...sub,
          url: proxiedSubUrl,
          rawUrl: subUrl,
        };
      })
    : [];

  return res.status(200).json({
    success: true,
    provider: finalData.provider,
    server: finalData.server,
    audio: finalData.audio || audio,
    sources: rewrittenSources,
    subtitles: rewrittenSubtitles,
    meta: finalData.meta,
  });
});

// Proxy and rewrite HLS Playlists (.m3u8) & video segments (.ts/.jpg/.mp4)
app.all('/api/anime/proxy', async (req: Request, res: Response) => {
  const targetUrl = (req.query.url as string);
  const referer = (req.query.ref as string) || 'https://megaplay.buzz/';

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  try {
    const origin = referer ? new URL(referer).origin : 'https://megaplay.buzz';
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer,
      'Origin': origin,
      'Accept': '*/*',
    };
    if (req.headers.range) {
      reqHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: reqHeaders,
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      targetUrl.includes('.m3u8');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (isM3u8) {
      const text = await upstreamRes.text();
      if (text.includes('#EXTM3U')) {
        const lines = text.split('\n');
        const rewritten = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith('#')) {
            // Rewrite URI="..." in #EXT-X-KEY or #EXT-X-MAP
            return line.replace(/URI=["']([^"']+)["']/g, (_match, uri) => {
              try {
                const absUrl = new URL(uri, targetUrl).href;
                return `URI="/api/anime/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(referer)}"`;
              } catch {
                return line;
              }
            });
          }
          // Segment or variant m3u8 line
          try {
            const absUrl = new URL(trimmed, targetUrl).href;
            return `/api/anime/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(referer)}`;
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
    const finalContentType = (contentType && (contentType.includes('mp4') || contentType.includes('webm')))
      ? contentType
      : 'video/MP2T';
    res.setHeader('Content-Type', finalContentType);
    res.status(upstreamRes.status);

    if (upstreamRes.body) {
      const { Readable } = await import('stream');
      // @ts-ignore
      Readable.fromWeb(upstreamRes.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[Anime Proxy Error]:', err?.message || err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gagal memuat stream video anime.' });
    }
  }
});

// Serve and convert Subtitles to clean WebVTT
app.get('/api/anime/subtitles', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send('WEBVTT\n\n');
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://framextv.xyz/',
      },
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
    // Replace 00:00:16,730 with 00:00:16.730
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
      requiresVerification: true,
      maskedEmail: result.maskedEmail,
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
      if (result.requiresVerification) {
        return res.status(403).json({
          success: false,
          requiresVerification: true,
          email: result.email,
          maskedEmail: result.maskedEmail,
          error: result.error,
        });
      }
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

// Google / Gmail Direct 1-Click Login
app.post('/api/auth/google-login', async (req: Request, res: Response) => {
  try {
    const { email, name, credential, code, redirectUri } = req.body || {};

    let cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    let cleanName = typeof name === 'string' ? name.trim() : '';

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '358715674309-hdh36g2l56bqv0rckcvcd4666kemh4sj.apps.googleusercontent.com';

    // Verify code with client secret if present
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
              }
            }
          }
        }
      } catch {
        // silent
      }
    }

    if (!cleanEmail && credential && typeof credential === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          if (payload.email) {
            cleanEmail = payload.email.toLowerCase();
            cleanName = payload.name || cleanEmail.split('@')[0];
          }
        }
      } catch {
        // silent
      }
    }

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Email Google wajib diisi.' });
    }

    const result = await authenticateGoogleUser({
      email: cleanEmail,
      name: cleanName,
    });

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Google Auth Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memproses autentikasi Google.' });
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
