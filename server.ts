import express, { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '1mb' }));

// --- Persistent Auth Database ---
const DATA_DIR = path.resolve(__dirname, 'data');
const AUTH_DB_PATH = path.resolve(DATA_DIR, 'auth_db.json');

interface StoredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  joinedAt: number;
}

interface StoredSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

interface AuthDb {
  users: StoredUser[];
  sessions: StoredSession[];
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

function initAuthDb(): AuthDb {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(AUTH_DB_PATH)) {
    const initialDb: AuthDb = {
      users: [],
      sessions: [],
    };

    fs.writeFileSync(AUTH_DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(AUTH_DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    const users: StoredUser[] = Array.isArray(parsed.users)
      ? parsed.users
      : [];
    const validUserIds = new Set(users.map((u) => u.id));
    const sessions: StoredSession[] = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter((s: StoredSession) => validUserIds.has(s.userId))
      : [];

    return {
      users,
      sessions,
    };
  } catch (e) {
    console.error('[Auth DB] Error reading database, recreating clean state:', e);
    const fallbackDb: AuthDb = { users: [], sessions: [] };
    fs.writeFileSync(AUTH_DB_PATH, JSON.stringify(fallbackDb, null, 2), 'utf-8');
    return fallbackDb;
  }
}

function readAuthDb(): AuthDb {
  return initAuthDb();
}

function writeAuthDb(db: AuthDb): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = `${AUTH_DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, AUTH_DB_PATH);
  } catch (e) {
    console.error('[Auth DB] Failed to save database:', e);
  }
}

// Clean up expired sessions periodically
setInterval(() => {
  try {
    const db = readAuthDb();
    const now = Date.now();
    const activeSessions = db.sessions.filter((s) => s.expiresAt > now);
    if (activeSessions.length !== db.sessions.length) {
      db.sessions = activeSessions;
      writeAuthDb(db);
    }
  } catch {
    // silent
  }
}, 10 * 60 * 1000);

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

// Initialize GoogleGenAI client (Server-side only)
const apiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// System instruction for Zhafx AI
const SYSTEM_INSTRUCTION = `Anda adalah asisten cerdas untuk "Zhafx", sebuah platform streaming film, serial TV, dan anime modern.
Karakteristik & Aturan Anda:
1. Selalu ramah, asyik, santun, dan komunikatif dalam Bahasa Indonesia yang baik dan luwes.
2. Fokus utama Anda adalah memberikan rekomendasi film, serial TV, dan anime, ulasan singkat, trivia menarik, perbandingan karya, serta panduan fitur Zhafx.
3. Tolak dengan sopan topik di luar dunia perfilman, serial, anime, hiburan, dan penggunaan Zhafx.
4. JANGAN pernah memberikan spoiler alur cerita atau akhir cerita kecuali pengguna secara eksplisit memintanya ("beri tahu spoiler", "siapa yang mati", dll.).
5. Jangan pernah mengklaim bahwa suatu judul pasti 100% tersedia di Zhafx sebelum pengguna mencarinya, sampaikan dengan kalimat seperti "Kamu bisa cek langsung di Zhafx...".
6. Rekomendasi Cerdas: Ketika Anda merekomendasikan judul-judul film, serial TV, atau anime spesifik (biasanya 1 sampai 5 judul), tambahkan blok terstruktur persis di paling akhir respons Anda dalam tag:
<picks>[{"title":"Nama Judul","type":"movie|tv|anime","year":"Tahun"}]</picks>
Pastikan format JSON di dalam tag <picks> valid tanpa markdown tambahan di dalam tag tersebut. Client Zhafx akan membaca tag ini untuk menampilkan kartu rekomendasi interaktif.`;

// Endpoint: AI Chat with streaming
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const currentKey = process.env.GEMINI_API_KEY || apiKey;
  if (!currentKey) {
    return res.status(403).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi pada server.',
      code: 'API_KEY_MISSING'
    });
  }

  const ai = new GoogleGenAI({
    apiKey: currentKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const { message, history, contextTitle } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  // Set SSE streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  let succeeded = false;

  for (const model of modelsToTry) {
    try {
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      // Include previous history if provided
      if (Array.isArray(history)) {
        for (const item of history.slice(-8)) {
          if (item && item.role && item.text) {
            contents.push({
              role: item.role === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }]
            });
          }
        }
      }

      // Prepend context if user asked from detail page
      let userPrompt = message;
      if (contextTitle) {
        userPrompt = `[Konteks Tayangan saat ini: ${contextTitle.title} (${contextTitle.year || 'N/A'}, Tipe: ${contextTitle.type || 'Media'}, Sinopsis: ${contextTitle.overview || 'Tidak ada'})]\n\nPertanyaan pengguna: ${message}`;
      }

      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.7,
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      succeeded = true;
      break;
    } catch (err: any) {
      console.warn(`[Gemini API] Failed with model ${model}:`, err?.message || err);
      // If error is 404 or unsupported model, loop will try fallback model
      if (model === modelsToTry[modelsToTry.length - 1]) {
        const status = err?.status || 500;
        let errorMessage = 'Gagal memproses jawaban AI. Silakan coba lagi sebentar lagi.';
        if (status === 429) errorMessage = 'Kuota AI saat ini sedang penuh (429). Tunggu beberapa saat.';
        else if (status === 403) errorMessage = 'Kunci API Gemini tidak valid atau izin ditolak (403).';

        res.write(`data: ${JSON.stringify({ error: errorMessage, code: status })}\n\n`);
        res.end();
      }
    }
  }
});

// Endpoint: Proxy to FrameX API (to prevent any CORS or network issues)
app.get('/api/proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const upstreamRes = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
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
// Authentication Endpoints (Server-Side)
// ==========================================

// Register Account
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, email, username, password } = req.body || {};

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';
    let cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';

    if (!cleanName) {
      return res.status(400).json({ success: false, error: 'Nama lengkap wajib diisi.' });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({ success: false, error: 'Nama lengkap minimal 2 karakter.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Format alamat email tidak valid.' });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Kata sandi minimal 6 karakter.' });
    }

    // Default username from email prefix if not supplied
    if (!cleanUsername) {
      cleanUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    }

    if (cleanUsername.length < 3) {
      cleanUsername = `user_${Math.random().toString(36).substring(2, 7)}`;
    }

    const db = readAuthDb();

    // Check email uniqueness
    const emailExists = db.users.some((u) => u.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      return res.status(409).json({
        success: false,
        error: 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.',
      });
    }

    // Check username uniqueness
    const usernameExists = db.users.some((u) => u.username.toLowerCase() === cleanUsername);
    if (usernameExists) {
      return res.status(409).json({
        success: false,
        error: 'Nama pengguna sudah digunakan. Silakan pilih nama pengguna lain.',
      });
    }

    // Create user with salted scrypt hash
    const newUser: StoredUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      passwordHash: hashPassword(cleanPassword),
      joinedAt: Date.now(),
    };

    // Create session (valid for 30 days)
    const token = crypto.randomBytes(32).toString('hex');
    const session: StoredSession = {
      token,
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    db.users.push(newUser);
    db.sessions.push(session);
    writeAuthDb(db);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        joinedAt: newUser.joinedAt,
      },
      message: 'Pendaftaran berhasil! Selamat datang di ZHAFX.',
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Terjadi kesalahan server saat memproses pendaftaran. Silakan coba lagi.',
    });
  }
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { login, email, username, password, rememberMe } = req.body || {};

    const rawLogin = login || email || username;
    const cleanLogin = typeof rawLogin === 'string' ? rawLogin.trim().toLowerCase() : '';
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanLogin && !cleanPassword) {
      return res.status(400).json({
        success: false,
        error: 'Email atau nama pengguna dan kata sandi wajib diisi.',
      });
    }

    if (!cleanLogin) {
      return res.status(400).json({
        success: false,
        error: 'Silakan masukkan alamat email atau nama pengguna Anda.',
      });
    }

    if (!cleanPassword) {
      return res.status(400).json({
        success: false,
        error: 'Silakan masukkan kata sandi Anda.',
      });
    }

    const db = readAuthDb();

    // Find by email OR username (case-insensitive)
    const user = db.users.find(
      (u) => u.email.toLowerCase() === cleanLogin || u.username.toLowerCase() === cleanLogin
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Akun dengan email atau nama pengguna tersebut tidak ditemukan.',
      });
    }

    const isPasswordValid = verifyPassword(cleanPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Kata sandi yang Anda masukkan salah. Silakan coba lagi.',
      });
    }

    // Session duration: 30 days if rememberMe, 24 hours otherwise
    const durationMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = crypto.randomBytes(32).toString('hex');
    const session: StoredSession = {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + durationMs,
    };

    db.sessions.push(session);
    writeAuthDb(db);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        joinedAt: user.joinedAt,
      },
      message: 'Berhasil masuk ke akun ZHAFX!',
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
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token autentikasi tidak valid.',
      });
    }

    const db = readAuthDb();
    const session = db.sessions.find((s) => s.token === token);

    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Sesi tidak valid atau telah berakhir.',
      });
    }

    if (session.expiresAt < Date.now()) {
      db.sessions = db.sessions.filter((s) => s.token !== token);
      writeAuthDb(db);
      return res.status(401).json({
        success: false,
        error: 'Sesi Anda telah kedaluwarsa. Silakan masuk kembali.',
      });
    }

    const user = db.users.find((u) => u.id === session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Pengguna akun tidak ditemukan.',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        joinedAt: user.joinedAt,
      },
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

// In-memory verification code store (valid for 15 minutes)
const emailVerificationStore = new Map<string, { code: string; expiresAt: number; name?: string }>();

// Send Verification Code (Gmail / Email)
app.post('/api/auth/send-verification-code', (req: Request, res: Response) => {
  try {
    const { email, name } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Alamat email wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Format email tidak valid.' });
    }

    // Generate secure 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    emailVerificationStore.set(cleanEmail, { code, expiresAt, name });

    console.log(`[Verification Code] Sent to ${cleanEmail}: ${code}`);

    return res.status(200).json({
      success: true,
      message: `Kode verifikasi 6-digit berhasil dikirim ke ${cleanEmail}`,
      code, // returned so client can show in realistic toast notification
      expiresAt,
    });
  } catch (err: any) {
    console.error('[Send Code Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal mengirim kode verifikasi.' });
  }
});

// Verify Code & Login / Register
app.post('/api/auth/verify-code', (req: Request, res: Response) => {
  try {
    const { email, code, name } = req.body || {};
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email dan kode verifikasi 6-digit wajib diisi.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const stored = emailVerificationStore.get(cleanEmail);
    if (!stored) {
      return res.status(400).json({
        success: false,
        error: 'Kode verifikasi tidak ditemukan atau telah kedaluwarsa. Silakan minta kode baru.',
      });
    }

    if (stored.expiresAt < Date.now()) {
      emailVerificationStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        error: 'Kode verifikasi telah kedaluwarsa (lebih dari 15 menit). Silakan minta kode baru.',
      });
    }

    if (stored.code !== cleanCode) {
      return res.status(400).json({
        success: false,
        error: 'Kode verifikasi salah. Silakan periksa kembali angka yang Anda masukkan.',
      });
    }

    // Code is valid! Consume it
    emailVerificationStore.delete(cleanEmail);

    const db = readAuthDb();
    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      // Auto-register user from email
      const defaultName = name?.trim() || stored.name?.trim() || cleanEmail.split('@')[0];
      const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let finalUsername = baseUsername || `user_${Date.now().toString(36)}`;

      if (db.users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${finalUsername}_${Math.floor(Math.random() * 900 + 100)}`;
      }

      user = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: defaultName,
        username: finalUsername,
        email: cleanEmail,
        passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')), // random salt
        joinedAt: Date.now(),
      };

      db.users.push(user);
    }

    // Create session (30 days)
    const token = crypto.randomBytes(32).toString('hex');
    const session: StoredSession = {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };

    db.sessions.push(session);
    writeAuthDb(db);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        joinedAt: user.joinedAt,
      },
      message: `Berhasil memverifikasi email dan masuk sebagai ${user.name}!`,
    });
  } catch (err: any) {
    console.error('[Verify Code Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memverifikasi kode.' });
  }
});

// Google / Gmail Direct 1-Click Login
app.post('/api/auth/google-login', (req: Request, res: Response) => {
  try {
    const { email, name } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email Google wajib diisi.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) || cleanEmail.split('@')[0];

    const db = readAuthDb();
    let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      let finalUsername = baseUsername || `g_${Date.now().toString(36)}`;
      if (db.users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
        finalUsername = `${finalUsername}_${Math.floor(Math.random() * 900 + 100)}`;
      }

      user = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: cleanName,
        username: finalUsername,
        email: cleanEmail,
        passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
        joinedAt: Date.now(),
      };
      db.users.push(user);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const session: StoredSession = {
      token,
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    };
    db.sessions.push(session);
    writeAuthDb(db);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        joinedAt: user.joinedAt,
      },
      message: `Berhasil masuk dengan akun Google: ${user.email}`,
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
