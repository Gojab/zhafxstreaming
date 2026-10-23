import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import {
  createAndSendOtp,
  verifyOtpAndAuthenticate,
  registerWithPassword,
  loginWithPassword,
  authenticateGoogleUser,
  getUserByToken,
  readAuthDb,
  writeAuthDb,
  toggleFollowUser,
  getCommunityFriends,
  getUserPublicProfile,
  getCommunityActivities,
  addCommunityActivity,
  getTopWatchersLeaderboard,
  getTopWatchedTitlesCatalog,
  recordWatchProgressForUser,
} from './server/authService.ts';
import type {
  StoredUser,
  StoredSession,
  AuthDb,
  AuthComment,
  StoredFollow,
  StoredActivity,
} from './server/authService.ts';
import { executeMultiModelChat } from './server/aiPipeline.ts';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xjyzfunqiazlayivjsxj.supabase.co';
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_l3QQ3rkxCcKEcXfhDgEweA_Ar5lEZ6K';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAILS = [
  'zhafxadmin@gmail.com',
  'zhafranfaisal1@gmail.com',
  'zhafranfaisalbusiness@gmail.com',
  'zhafxteam@gmail.com',
  (process.env.ADMIN_EMAIL || '').toLowerCase(),
].filter(Boolean);

function checkIsAdmin(req: Request): boolean {
  // 1. Direct header verification (sent by authenticated admin client)
  const headerEmail = String(req.headers['x-user-email'] || '').trim().toLowerCase();
  if (headerEmail && ADMIN_EMAILS.includes(headerEmail)) {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      // 2. Check local session database
      const db = readAuthDb();
      const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
      if (session) {
        const user = db.users.find((u) => u.id === session.userId);
        if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
          return true;
        }
      }

      // 3. Check JWT payload (Supabase / Google OAuth)
      if (token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload) {
              const email = String(
                payload.email ||
                payload.user_metadata?.email ||
                payload.app_metadata?.email ||
                ''
              ).toLowerCase().trim();
              if (
                (email && ADMIN_EMAILS.includes(email)) ||
                payload.role === 'admin' ||
                payload.app_metadata?.role === 'admin' ||
                payload.user_metadata?.role === 'admin' ||
                payload.user_metadata?.isAdmin === true
              ) {
                return true;
              }
            }
          }
        } catch {}
      }
    }
  }

  // 4. Check via userId if available
  const userId = getUserIdFromAuthHeader(req);
  if (userId) {
    const db = readAuthDb();
    const user = db.users.find((u) => u.id === userId);
    if (user && user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return true;
    }
  }

  return false;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      const db = readAuthDb();
      const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
      if (session) return session.userId;

      // Decode Supabase / Google JWT tokens if present
      if (token.includes('.')) {
        try {
          const parts = token.split('.');
          if (parts.length >= 2) {
            const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
            const payload = JSON.parse(payloadStr);
            if (payload && (payload.sub || payload.email)) {
              return payload.sub || `usr_${payload.email}`;
            }
          }
        } catch {}
      }
    }
  }

  // Fallback to x-user-id header
  const headerUserId = String(req.headers['x-user-id'] || req.headers['x-client-user-id'] || '').trim();
  if (headerUserId) {
    return headerUserId;
  }

  // Fallback to x-user-email header if passed by active client session
  const headerEmail = String(req.headers['x-user-email'] || '').trim().toLowerCase();
  if (headerEmail) {
    const db = readAuthDb();
    const u = db.users.find((usr) => usr.email.toLowerCase() === headerEmail);
    if (u) return u.id;
    return `usr_${headerEmail}`;
  }

  if (req.body && req.body.userId) {
    return String(req.body.userId);
  }

  return null;
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
    candidateUrls.unshift(targetUrl.replace('framextv.tech', 'framextv.cc'));
    candidateUrls.push(targetUrl.replace('framextv.tech', 'framextv.xyz'));
  } else if (targetUrl.includes('framextv.xyz')) {
    candidateUrls.unshift(targetUrl.replace('framextv.xyz', 'framextv.cc'));
  }

  const isPost = req.method === 'POST';
  const isFrameX = targetUrl.includes('framextv.cc') || targetUrl.includes('framextv.xyz') || targetUrl.includes('framextv.tech');

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
                'Referer': 'https://framextv.cc/',
                'Origin': 'https://framextv.cc',
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
// Indonesian Synopsis Engine & Persistent Dictionary
// ==========================================
const SYNOPSIS_CACHE_PATH = path.resolve(DATA_DIR, 'synopsis_cache.json');
let serverSynopsisCache: Record<string, string> = {};

try {
  if (fs.existsSync(SYNOPSIS_CACHE_PATH)) {
    const raw = fs.readFileSync(SYNOPSIS_CACHE_PATH, 'utf-8');
    serverSynopsisCache = JSON.parse(raw);
  }
} catch (e) {
  console.warn('[Synopsis Cache] Failed to load:', e);
}

function saveSynopsisCache(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNOPSIS_CACHE_PATH, JSON.stringify(serverSynopsisCache, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Synopsis Cache] Failed to save:', e);
  }
}

const SERVER_MANUAL_SYNOPSES: Record<string, string> = {
  // Movies
  'fight club':
    'Seorang pekerja kantor penderita insomnia kronis yang jenuh dengan kehidupan konsumerisme bertemu dengan Tyler Durden, seorang penjual sabun eksentrik dengan filosofi hidup liar. Bersama-sama, mereka mendirikan klub petarung rahasia bawah tanah yang berkembang menjadi gerakan anarki bawah tanah di luar kendali.',
  'the shawshank redemption':
    'Andy Dufresne, seorang bankir sukses, dijatuhi hukuman penjara seumur hidup di Penjara Shawshank atas pembunuhan yang tidak ia lakukan. Selama dua dekade, ia menjalin persahabatan erat dengan Red dan diam-diam merancang jalan menuju kebebasan dan penebusan sejati.',
  'the godfather':
    'Kisah epik keluarga mafia Corleone di bawah kepemimpinan Don Vito Corleone, dan perjalanan putranya, Michael Corleone, dari seorang pahlawan perang yang enggan menjadi bos mafia yang kejam dan ditakuti.',
  'pulp fiction':
    'Rangkaian kisah kriminal yang saling bertaut di Los Angeles yang melibatkan dua pembunuh bayaran filosofis, istri bos mafia yang gemar berpesta, seorang petinju yang menolak mengalah, dan sepasang perampok restoran.',
  'the dark knight':
    'Ketika ancaman keji yang dikenal sebagai Joker menebar teror dan anarki di jalanan Gotham, Batman harus menghadapi salah satu ujian psikologis dan fisik terberat untuk menegakkan keadilan tanpa melanggar prinsip moralnya.',
  'inception':
    'Dom Cobb adalah seorang pencuri ulung yang ahli mengekstraksi rahasia berharga dari alam bawah sadar korban saat bermimpi. Ia ditawari misi terakhir yang hampir mustahil untuk menghapus masa lalunya: menanamkan sebuah ide ke dalam pikiran pewaris kerajaan bisnis.',
  'interstellar':
    'Di masa depan ketika bumi dilanda krisis pangan parah dan kepunahan mengancam, sekelompok penjelajah antariksa menempuh misi terjauh dalam sejarah melintasi lubang cacing di dekat Saturnus demi mencari planet baru yang layak huni bagi kelangsungan umat manusia.',
  'dune: part two':
    'Paul Atreides bersatu dengan Chani dan kaum Fremen saat menempuh jalan balas dendam terhadap para konspirator yang menghancurkan keluarganya, seraya berusaha mencegah masa depan kelam penuh perang suci yang hanya bisa ia ramalkan.',
  'dune':
    'Paul Atreides, pemuda brilian yang lahir dengan takdir besar melampaui pemahamannya, harus melakukan perjalanan ke planet Arrakis yang paling berbahaya dan penuh intrik demi memastikan kelangsungan masa depan keluarga dan rakyatnya.',
  'oppenheimer':
    'Kisah biopik dramatis seputar fisikawan teoretis J. Robert Oppenheimer yang memimpin Proyek Manhattan di Los Alamos untuk menciptakan senjata bom atom pertama dalam sejarah peradaban manusia, dan pergulatan batinnya pasca Perang Dunia II.',
  'gladiator ii':
    'Bertahun-tahun setelah menyaksikan kematian pahlawan Maximus di tangan pamannya, Lucius harus memasuki arena Colosseum setelah rumahnya ditaklukkan oleh kaisar tirani yang memerintah Roma dengan tangan besi.',
  'gladiator':
    'Seorang mantan jenderal Romawi yang dikhianati dan keluarganya dibantai bertekad membalaskan dendamnya kepada kaisar korup Commodus melalui pertarungan hidup-mati di gelanggang gladiator Colosseum.',
  'top gun: maverick':
    'Setelah lebih dari tiga puluh tahun mengabdi sebagai salah satu penerbang ulung Angkatan Laut, Pete "Maverick" Mitchell ditugaskan melatih detasemen lulusan TOPGUN untuk sebuah misi khusus berisiko tinggi yang menuntut pengorbanan tertinggi.',
  'avatar: the way of water':
    'Jake Sully dan Neytiri telah berkeluarga dan hidup damai di Pandora. Namun saat ancaman lama bangsa manusia kembali menyerang, mereka terpaksa mengungsi ke wilayah klan pesisir laut Metkayina untuk melindungi keluarga mereka.',
  'avatar':
    'Mantan marinir lumpuh, Jake Sully, dikirim ke bulan asing Pandora dalam misi unik mengendalikan tubuh Avatar. Namun hatinya terbelah antara menjalankan tugas militernya atau melindungi bangsa Na\'vi dan dunia yang mulai ia cintai.',
  'spider-man: across the spider-verse':
    'Miles Morales terlempar melintasi Multiverse, di mana ia bertemu dengan Spider-Society yang bertugas melindungi keberadaan realitas semesta, namun ia harus menentukan cara menyelamatkan orang yang paling ia cintai.',
  'spider-man: no way home':
    'Setelah identitas rahasianya terbongkar ke seluruh dunia, Peter Parker meminta bantuan Doctor Strange untuk membalikkan waktu, namun mantra yang salah justru membuka multiverse dan mengundang musuh-musuh legendaris dari semesta lain.',
  'spider-man':
    'Peter Parker, seorang remaja kutu buku yang pemalu, mendapatkan kekuatan super luar biasa setelah digigit laba-laba hasil rekayasa genetik dan belajar bahwa kekuatan besar membawa tanggung jawab yang besar pula.',
  'deadpool & wolverine':
    'Wade Wilson yang lesu menghadapi krisis eksistensial terseret oleh TVA ke dalam petualangan lintas dimensi bersama Wolverine dari linimasa lain untuk menyelamatkan alam semesta mereka.',
  'deadpool':
    'Wade Wilson, mantan anggota Pasukan Khusus yang kini menjadi tentara bayaran, menjalani eksperimen nakal yang memberinya kekuatan penyembuhan super dan selera humor yang gelap.',
  'john wick':
    'Seorang mantan pembunuh bayaran legendaris keluar dari masa pensiunnya yang tenang untuk membalaskan dendam kepada para gangster mafia Rusia yang telah merampas anjing peninggalan mendiang istrinya.',
  'joker':
    'Arthur Fleck, seorang komedian gagal yang terisolasi dan dianiaya oleh masyarakat Kota Gotham, perlahan tenggelam ke dalam kegilaan dan menjelma menjadi ikon kriminal anarkis berjuluk Joker.',
  'titanic':
    'Dua insan dari kelas sosial yang bertolak belakang, Jack dan Rose, saling jatuh cinta di atas kapal termewah RMS Titanic yang malang dalam pelayaran perdananya melintasi samudra Atlantik Utara.',
  'clayface':
    'Kisah kebangkitan Matt Hagen dari pemuda jalanan kota Gotham menjadi aktor terkemuka Hollywood yang terhenti secara tragis saat bos mafia lokal membuatnya cacat mengerikan. Ditinggalkan dan hancur, Matt mencari perawatan mutakhir yang secara ajaib memulihkan tubuhnya, namun merusak kesadarannya dan menyeretnya ke dalam spiral balas dendam mematikan.',
  'by any means':
    'Di Mississippi era 1960-an, seorang agen FBI muda berkulit hitam terpaksa bekerja sama dengan pembunuh bayaran mafia yang terkenal kejam demi menyelidiki rentetan pembunuhan brutal bermotif hak-hak sipil.',

  // TV Series
  'shōgun':
    'Ketika sebuah kapal misterius terdampar di pesisir feodal Jepang abad ke-17, sang navigator Inggris John Blackthorne terjerumus ke dalam intrik perang politik dan perebutan kekuasaan para penguasa samurai dipimpin Lord Toranaga.',
  'house of the dragon':
    'Kisah epik wangsa Targaryen ratusan tahun sebelum peristiwa Game of Thrones, yang mencatat awal mula perang saudara berdarah "Dance of the Dragons" dalam perebutan takhta Iron Throne di Westeros.',
  'game of thrones':
    'Sembilan keluarga bangsawan bertarung sengit memperebutkan kendali atas tanah mistis Westeros, sementara ancaman kuno makhluk es bangkit kembali dari balik Tembok Es raksasa di utara.',
  'the last of us':
    'Dua puluh tahun setelah wabah jamur misterius memusnahkan peradaban modern, seorang penyintas tangguh bernama Joel disewa untuk menyelundupkan Ellie, gadis muda yang kebal terhadap infeksi, melintasi wilayah Amerika yang berbahaya.',
  'fallout':
    'Dua ratus tahun setelah kiamat perang nuklir, seorang penghuni bungker Vault yang damai terpaksa keluar ke permukaan bumi Los Angeles yang liar, berbahaya, dan aneh demi mencari ayahnya yang diculik.',
  'breaking bad':
    'Seorang guru kimia sekolah menengah bernama Walter White yang didiagnosis menderita kanker paru-paru stadium akhir beralih memproduksi metamfetamin murni bersama mantan muridnya demi menjamin masa depan finansial keluarganya.',
  'stranger things':
    'Ketika seorang anak laki-laki lenyap secara misterius di kota kecil Hawkins, teman-temannya membongkar rangkaian eksperimen rahasia pemerintah, kekuatan telekinetik seorang gadis misterius, dan teror monster dari dimensi Upside Down.',
  'squid game':
    'Ratusan pemain yang terlilit utang finansial berat menerima undangan misterius untuk bersaing dalam permainan anak-anak tradisional dengan hadiah puluhan miliar won, namun setiap kekalahan berujung pada maut seketika.',
  'arcane':
    'Di tengah ketegangan yang kian memuncak antara kota utopia Piltover dan kota bawah tanah Zaun yang tertindas, dua saudara perempuan yatim piatu terjerumus ke pihak yang berseberangan dalam perang revolusi sihir dan teknologi Hextech.',

  // Anime
  'solo leveling':
    'Di dunia di mana monster bermunculan melalui gerbang dimensi, Sung Jin-woo yang dikenal sebagai pemburu terlemah rank-E bangkit dari ambang maut di sebuah dungeon ganda dengan sistem misterius yang memungkinkannya menaikkan level kekuatannya tanpa batas.',
  'attack on titan':
    'Umat manusia yang terkurung di balik tiga lapis benteng raksasa berjuang mati-matian mempertahankan kelangsungan hidup dari ancaman monster raksasa pemakan manusia yang dikenal sebagai Titan, dipimpin oleh Eren Yeager yang bersumpah membasmi semua Titan.',
  'demon slayer: kimetsu no yaiba':
    'Setelah keluarganya dibantai oleh iblis dan adiknya Nezuko berubah menjadi iblis, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis dari Korps Demon Slayer demi membalaskan dendam dan mengembalikan kemanusiaan sang adik.',
  'demon slayer':
    'Setelah keluarganya dibantai oleh iblis dan adiknya Nezuko berubah menjadi iblis, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis dari Korps Demon Slayer demi membalaskan dendam dan mengembalikan kemanusiaan sang adik.',
  'jujutsu kaisen':
    'Yuji Itadori, siswa SMA dengan bakat fisik luar biasa, menelan artefak terkutuk dari Raja Kutukan Sukuna demi menyelamatkan temannya, dan bergabung dengan Sekolah Jujutsu Tokyo untuk membasmi roh-roh kutukan yang mengancam dunia manusia.',
  'one piece':
    'Monkey D. Luffy bersama kru Bajak Laut Topi Jerami mengarungi samudra Grand Line yang penuh mara bahaya demi menemukan harta karun legendaris One Piece peninggalan Gol D. Roger dan menjadi Raja Bajak Laut berikutnya.',
  'bleach: thousand-year blood war':
    'Kedamaian Soul Society terguncang ketika kerajaan Quincy pimpinan Yhwach bangkit kembali setelah seribu tahun tidur panjang dan mendeklarasikan perang pembalasan total terhadap para Shinigami.',
  'bleach':
    'Ichigo Kurosaki, remaja yang mampu melihat arwah, tanpa sengaja memperoleh kekuatan Shinigami dari Rukia Kuchiki dan memikul tugas berat melindungi dunia manusia dari ancaman monster Hollow yang haus jiwa.',
  'naruto':
    'Kisah perjuangan Naruto Uzumaki, seorang ninja yatim piatu yang dijauhi oleh penduduk desa Konoha karena siluman rubah ekor sembilan yang tersegel di dalam tubuhnya, yang bertekad menjadi Hokage pemimpin desa yang diakui semua orang.',
  'naruto shippuden':
    'Setelah dua setengah tahun berlatih keras, Naruto kembali ke Konoha untuk menghadapi ancaman organisasi kriminal berbahaya Akatsuki dan berusaha membawa pulang sahabatnya Sasuke dari jalan kegelapan.',
  'dragon ball':
    'Petualangan Son Goku mengasah ilmu bela diri bersama teman-temannya mengelilingi dunia untuk mengumpulkan tujuh bola naga ajaib yang mampu memanggil naga Shenron untuk mengabulkan segala permohonan.',
  'death note':
    'Seorang siswa SMA jenius bernama Light Yagami menemukan buku catatan supranatural yang dapat membunuh siapa saja yang namanya tertulis di dalamnya, dan memutuskan untuk menghabisi para kriminal demi menciptakan dunia utopia baru tanpa kejahatan.',
  'chainsaw man':
    'Denji, pemuda miskin yang terikat kontrak dengan iblis gergaji peliharaannya Pochita, bangkit kembali sebagai manusia setengah iblis pemburu kejahatan berkepala gergaji untuk Divisi Keselamatan Publik.',
  'spy x family':
    'Seorang mata-mata elit bernama samaran Twilight harus membangun keluarga palsu bersama seorang pembunuh bayaran profesional dan anak angkat yatim piatu yang memiliki kemampuan membaca pikiran demi misi perdamaian dunia.',
  'frieren: beyond journey\'s end':
    'Setelah mengalahkan Raja Iblis bersama kelompok pahlawan, penyihir elf berumur panjang Frieren memulai pengembaraan baru untuk memahami arti waktu dan ikatan emosional manusia yang pernah diabaikannya.',
  'frieren':
    'Setelah mengalahkan Raja Iblis bersama kelompok pahlawan, penyihir elf berumur panjang Frieren memulai pengembaraan baru untuk memahami arti waktu dan ikatan emosional manusia yang pernah diabaikannya.',
  'dandadan':
    'Momo Ayase yang percaya pada hantu dan Okarun yang percaya pada alien saling bertaruh mengunjungi lokasi angker, yang membawa keduanya ke dalam pusaran pertempuran gaib konyol namun mematikan melawan roh penasaran dan makhluk luar angkasa.',
  'kaiju no. 8':
    'Kafka Hibino, pria paruh baya yang bertugas membersihkan bangkai monster kaiju, secara misterius bermutasi menjadi monster setengah manusia berkekuatan dahsyat bernomor sandi Kaiju No. 8 seraya berusaha memenuhi janjinya untuk masuk ke Pasukan Pertahanan Jepang.',
  'blue lock':
    'Setelah kekalahan tragis di Piala Dunia, Asosiasi Sepak Bola Jepang mengumpulkan 300 striker muda terbaik ke dalam fasilitas penjara modern Blue Lock untuk menciptakan striker paling egois dan mematikan di dunia.',
};

function checkIsIndonesianText(text?: string): boolean {
  if (!text || text.length < 15) return false;
  const sample = ` ${text.toLowerCase()} `;
  const idWords = [
    ' yang ', ' dan ', ' di ', ' dari ', ' untuk ', ' pada ', ' dengan ',
    ' adalah ', ' sebuah ', ' seorang ', ' dalam ', ' saat ', ' oleh ',
    ' mereka ', ' ia ', ' dia ', ' kehidupan ', ' perjalanan ', ' dunia ',
    ' kisah ', ' melawan ', ' bersama ', ' setelah ', ' demi ', ' membalas ',
    ' tentang ', ' ketika ', ' harus ', ' karena ', ' menjadi '
  ];
  let idScore = 0;
  for (const w of idWords) {
    if (sample.includes(w)) idScore++;
  }
  return idScore >= 2;
}

function applySmartSynopsisRules(text: string): string {
  if (!text || text.length < 10) return text;
  let res = text
    .replace(/\bFollows the story of\b/gi, 'Mengikuti kisah')
    .replace(/\bFollows the adventures of\b/gi, 'Mengikuti petualangan')
    .replace(/\bIn a world where\b/gi, 'Di sebuah dunia di mana')
    .replace(/\bSet in a world\b/gi, 'Berlatar di sebuah dunia')
    .replace(/\bBased on the manga\b/gi, 'Diadaptasi dari manga')
    .replace(/\bBased on the true story of\b/gi, 'Berdasarkan kisah nyata')
    .replace(/\bAfter the events of\b/gi, 'Setelah peristiwa')
    .replace(/\bAfter the tragic death of\b/gi, 'Setelah kematian tragis dari')
    .replace(/\bA young boy\b/gi, 'seorang pemuda')
    .replace(/\bA young man\b/gi, 'seorang pemuda')
    .replace(/\bA young girl\b/gi, 'seorang gadis muda')
    .replace(/\bAn insomniac\b/gi, 'seorang penderita insomnia')
    .replace(/\bTogether with his friends\b/gi, 'bersama para sahabatnya')
    .replace(/\bTogether with her friends\b/gi, 'bersama teman-temannya')
    .replace(/\bMust fight against\b/gi, 'harus bertarung melawan')
    .replace(/\bMust face\b/gi, 'harus menghadapi')
    .replace(/\bIn order to save\b/gi, 'demi menyelamatkan')
    .replace(/\bIn order to protect\b/gi, 'demi melindungi')
    .replace(/\bStruggles to survive\b/gi, 'berjuang untuk bertahan hidup')
    .replace(/\bEmbarks on a journey\b/gi, 'memulai sebuah perjalanan')
    .replace(/\bEmbarks on a dangerous\b/gi, 'memulai petualangan berbahaya')
    .replace(/\bUncovers a dark secret\b/gi, 'mengungkap rahasia kelam')
    .replace(/\bCenturies after\b/gi, 'Berabad-abad setelah')
    .replace(/\bWhen a mysterious\b/gi, 'Ketika sebuah ancaman misterius')
    .replace(/\bwho embarks on\b/gi, 'yang memulai')
    .replace(/\bwho discovers that\b/gi, 'yang menemukan bahwa')
    .replace(/\bwho must\b/gi, 'yang harus')
    .replace(/\bfrom darkness\b/gi, 'dari kegelapan')
    .replace(/\bhis sister\b/gi, 'saudara perempuannya')
    .replace(/\bhis brother\b/gi, 'saudara laki-lakinya')
    .replace(/\bhis family\b/gi, 'keluarganya')
    .replace(/\bher family\b/gi, 'keluarganya')
    .replace(/\btheir world\b/gi, 'dunia mereka')
    .replace(/\btheir lives\b/gi, 'kehidupan mereka')
    .replace(/\bwhile trying to\b/gi, 'sembari berusaha untuk')
    .replace(/\bwhen he\b/gi, 'ketika ia')
    .replace(/\bwhen she\b/gi, 'ketika ia')
    .replace(/\bwhen they\b/gi, 'ketika mereka');

  res = res.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  return res;
}

function getManualSynopsis(text: string, title?: string): string {
  if (title) {
    const cleanTitle = title.toLowerCase().trim();
    if (serverSynopsisCache[cleanTitle]) {
      return serverSynopsisCache[cleanTitle];
    }
    for (const [key, val] of Object.entries(SERVER_MANUAL_SYNOPSES)) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        return val;
      }
    }
  }

  if (checkIsIndonesianText(text)) {
    return text;
  }

  if (text && text.length > 10) {
    return applySmartSynopsisRules(text);
  }

  return text || 'Sinopsis tayangan ini tersedia di Zhafx Streaming.';
}

function formatPosterUrl(raw?: string | null, size: 'w500' | 'w342' | 'original' = 'w500'): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }
  if (trimmed.startsWith('/')) {
    return `https://image.tmdb.org/t/p/${size}${trimmed}`;
  }
  return `https://image.tmdb.org/t/p/${size}/${trimmed}`;
}

function formatBackdropUrl(raw?: string | null): string {
  return formatPosterUrl(raw, 'original');
}

const ANIME_TMDB_MAP: Record<string, string> = {
  '16498': '1429', // Attack on Titan
  'attack on titan': '1429',
  'solo leveling': '209867',
  'demon slayer': '85937',
  'demon slayer: kimetsu no yaiba': '85937',
  'jujutsu kaisen': '95479',
  'one piece': '37854',
  'naruto': '46260',
  'naruto shippuden': '46261',
  'death note': '13916',
  'chainsaw man': '114410',
  'vinland saga': '86588',
  'bleach': '30984',
};

function deduplicateTitles<T extends { id?: any; title?: string; type?: string; poster?: string; backdrop?: string; overview?: string }>(
  items: T[],
  seenKeys = new Set<string>()
): T[] {
  const result: T[] = [];
  for (const item of items) {
    if (!item) continue;
    const cleanId = String(item.id || '').trim();
    const cleanTitle = String(item.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const idKey = `${item.type || 'media'}-${cleanId}`;
    if ((cleanId && seenKeys.has(idKey)) || (cleanTitle && seenKeys.has(cleanTitle))) {
      continue;
    }
    if (cleanId) seenKeys.add(idKey);
    if (cleanTitle) seenKeys.add(cleanTitle);

    // Ensure absolute poster & backdrop URLs matching framextv.cc
    if (item.poster) item.poster = formatPosterUrl(item.poster, 'w500');
    if (item.backdrop) item.backdrop = formatBackdropUrl(item.backdrop);
    if (item.overview) item.overview = getManualSynopsis(item.overview, item.title);

    result.push(item);
  }
  return result;
}

// ==========================================
// FrameX Home Catalog API with Auto Failover & Indonesian Translation
// ==========================================
let serverCachedHomeData: any = null;
let serverCacheExpiry = 0;

app.get('/api/home', async (req: Request, res: Response) => {
  const now = Date.now();
  const forceRefresh = String(req.query.refresh || '') !== '';
  if (serverCachedHomeData && serverCacheExpiry > now && !forceRefresh) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json(serverCachedHomeData);
  }

  // Active FrameX backends (primary: https://api.framextv.cc)
  const backends = ['https://api.framextv.cc', 'https://api.framextv.xyz'];
  let rawHomeData: any = null;

  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/home?refresh=${Date.now()}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://framextv.cc/',
          Origin: 'https://framextv.cc',
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(4500),
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

    // Normalize Hero poster & backdrop and translate overview
    if (rawHomeData.hero) {
      if (rawHomeData.hero.poster) {
        rawHomeData.hero.poster = formatPosterUrl(rawHomeData.hero.poster, 'w500');
      }
      if (rawHomeData.hero.backdrop) {
        rawHomeData.hero.backdrop = formatBackdropUrl(rawHomeData.hero.backdrop);
      }
      if (rawHomeData.hero.overview) {
        rawHomeData.hero.overview = getManualSynopsis(
          rawHomeData.hero.overview,
          rawHomeData.hero.title
        );
      }
    }

    // Populate Anime if FrameX upstream anime rails are empty
    const currentAnime = Array.isArray(rails.popular_anime)
      ? rails.popular_anime
      : rails.popular_anime?.results || [];

    if (currentAnime.length === 0) {
      for (const animeHost of ['https://api.framextv.cc', 'https://api.framextv.xyz']) {
        try {
          const animeRes = await fetch(`${animeHost}/anime/api/discover?page=1`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
              Referer: 'https://framextv.cc/',
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(4500),
          });

          if (animeRes.ok) {
            const animeData = await animeRes.json();
            const items = Array.isArray(animeData.results) ? animeData.results : [];
            if (items.length > 0) {
              rails.popular_anime = {
                success: true,
                results: items.slice(0, 10).map((a: any) => ({
                  id: String(a.id),
                  type: 'anime',
                  title: a.title,
                  poster: formatPosterUrl(a.poster, 'w500'),
                  backdrop: formatBackdropUrl(a.backdrop || a.poster),
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
                  poster: formatPosterUrl(a.poster, 'w500'),
                  backdrop: formatBackdropUrl(a.backdrop || a.poster),
                  year: String(a.year || '2024'),
                  rating: a.rating || '8.5',
                  overview: a.synopsis || a.overview || 'Anime terpopuler di Zhafx.',
                  genres: a.genres || ['Action', 'Fantasy'],
                })),
              };
              break;
            }
          }
        } catch {
          // try next
        }
      }
    }

    // Deduplicate all rails and normalize poster URLs (Zero duplicates / tidak dobble)
    const heroKeys = new Set<string>();
    if (rawHomeData.hero?.id) {
      heroKeys.add(`${rawHomeData.hero.type || 'movie'}-${rawHomeData.hero.id}`);
      if (rawHomeData.hero.title) {
        heroKeys.add(rawHomeData.hero.title.toLowerCase().replace(/[^a-z0-9]/g, ''));
      }
    }

    for (const [key, railVal] of Object.entries(rails)) {
      const items = Array.isArray(railVal) ? railVal : (railVal as any)?.results || [];
      const deduplicated = deduplicateTitles(items, new Set(heroKeys));
      if (Array.isArray(railVal)) {
        rails[key] = deduplicated;
      } else if (railVal && typeof railVal === 'object') {
        (railVal as any).results = deduplicated;
      }
    }

    serverCachedHomeData = rawHomeData;
    serverCacheExpiry = now + 5 * 60 * 1000;

    res.setHeader('Cache-Control', 'no-store, max-age=0');
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
  'https://api.framextv.cc',
  'https://api.framextv.xyz',
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
          Referer: 'https://framextv.cc/',
          Origin: 'https://framextv.cc',
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
    for (const animeHost of ['https://api.framextv.cc', 'https://api.framextv.xyz']) {
      try {
        const q = new URLSearchParams();
        q.set('page', page);
        if (genre && genre !== 'all') q.set('genre', genre);
        if (year && year !== 'all') q.set('year', year);

        const animeRes = await fetch(`${animeHost}/anime/api/discover?${q.toString()}`, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            Referer: 'https://framextv.cc/',
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (animeRes.ok) {
          const animeData = await animeRes.json();
          const items = Array.isArray(animeData.results) ? animeData.results : [];
          const deduplicated = deduplicateTitles(
            items.map((a: any) => ({
              id: String(a.id),
              type: 'anime',
              title: a.title,
              poster: formatPosterUrl(a.poster, 'w500'),
              backdrop: formatBackdropUrl(a.backdrop || a.poster),
              year: String(a.year || '2024'),
              rating: a.rating || '8.5',
              overview: a.synopsis || a.overview || 'Anime terpopuler di Zhafx.',
              genres: a.genres || ['Action', 'Fantasy'],
            }))
          );
          res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
          return res.json({
            success: true,
            page: animeData.page || parseInt(page, 10),
            totalPages: animeData.totalPages || 50,
            totalResults: animeData.totalResults || deduplicated.length,
            results: deduplicated,
          });
        }
      } catch {
        // try next
      }
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
      upstreamData.results = deduplicateTitles(upstreamData.results);
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
      upstreamData.results = deduplicateTitles(upstreamData.results);
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

// 4. Search endpoint (Film, TV, and Anime) - Smart Multi-Source with Typo Tolerance
// ==========================================
// Typo & Fuzzy Matching Search Engine
// ==========================================
function calcDamerauDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) matrix[i] = [i];
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }
  return matrix[al][bl];
}

function calcSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const maxLen = Math.max(s1.length, s2.length);
  const dist = calcDamerauDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

const SERVER_SEARCH_TYPOS: Record<string, string> = {
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
  'breking bad': 'Breaking Bad',
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

const SERVER_POPULAR_TITLES = [
  'Fight Club',
  'The Shawshank Redemption',
  'The Godfather',
  'Pulp Fiction',
  'The Dark Knight',
  'Inception',
  'Interstellar',
  'Dune: Part Two',
  'Dune',
  'Oppenheimer',
  'Gladiator',
  'Top Gun: Maverick',
  'Avatar',
  'Spider-Man',
  'Deadpool & Wolverine',
  'John Wick',
  'Joker',
  'Titanic',
  'Avengers: Endgame',
  'The Matrix',
  'House of the Dragon',
  'Game of Thrones',
  'The Last of Us',
  'Fallout',
  'Arcane',
  'Stranger Things',
  'Breaking Bad',
  'Squid Game',
  'The Boys',
  'Wednesday',
  'Peaky Blinders',
  'Shogun',
  'Solo Leveling',
  'Attack on Titan',
  'Demon Slayer',
  'Jujutsu Kaisen',
  'One Piece',
  'Bleach',
  'Naruto',
  'Dragon Ball',
  'Death Note',
  'Chainsaw Man',
  'Spy x Family',
  'Frieren: Beyond Journey\'s End',
  'Dandadan',
  'Kaiju No. 8',
  'Blue Lock',
  'Haikyuu',
  'Hunter x Hunter',
  'My Hero Academia',
  'Vinland Saga',
];

function findServerFuzzySuggestion(raw: string): string | null {
  const clean = raw.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  if (clean.length < 2) return null;

  if (SERVER_SEARCH_TYPOS[clean]) {
    return SERVER_SEARCH_TYPOS[clean];
  }
  const cleanSpaced = raw.toLowerCase().trim();
  if (SERVER_SEARCH_TYPOS[cleanSpaced]) {
    return SERVER_SEARCH_TYPOS[cleanSpaced];
  }

  let bestTitle: string | null = null;
  let bestSim = 0;
  let lowestDist = 999;

  for (const title of SERVER_POPULAR_TITLES) {
    const sim = calcSimilarity(clean, title);
    const dist = calcDamerauDistance(clean, title.toLowerCase().replace(/[^a-z0-9]/g, ''));
    if (sim > bestSim) {
      bestSim = sim;
      lowestDist = dist;
      bestTitle = title;
    }
  }

  if (bestTitle && (bestSim >= 0.58 || (lowestDist <= 3 && clean.length >= 4))) {
    return bestTitle;
  }

  return null;
}

// 4. Search endpoint (Film, TV, and Anime) - High-resilience with instant typo auto-recovery
app.get('/api/search', async (req: Request, res: Response) => {
  const q = req.query.q as string;
  const type = req.query.type as string;
  const page = (req.query.page as string) || '1';

  if (!q || !q.trim()) {
    return res.json({ success: true, results: [], totalPages: 1, totalResults: 0 });
  }

  const queryClean = q.trim();

  async function executeSearch(targetQuery: string): Promise<any[]> {
    const tasks: Promise<any[]>[] = [];

    // 1. Fetch Movie/TV if requested or general search
    if (!type || type === 'all' || type === 'movie' || type === 'tv') {
      tasks.push(
        (async () => {
          try {
            const upstream = await fetchFromFrameXUpstream('/api/search', {
              q: targetQuery,
              ...(type && type !== 'all' ? { type } : {}),
              page,
            }, 4500);
            if (upstream && Array.isArray(upstream.results)) {
              return upstream.results;
            }
          } catch {}
          return [];
        })()
      );
    } else {
      tasks.push(Promise.resolve([]));
    }

    // 2. Fetch Anime if requested or general search
    if (!type || type === 'all' || type === 'anime') {
      tasks.push(
        (async () => {
          const animeHosts = [
            'https://api.framextv.cc/anime/api/search',
            'https://api.framextv.xyz/anime/api/search',
          ];
          for (const host of animeHosts) {
            try {
              const r = await fetch(`${host}?q=${encodeURIComponent(targetQuery)}&page=${page}`, {
                headers: {
                  'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                  Referer: 'https://framextv.cc/',
                  Accept: 'application/json',
                },
                signal: AbortSignal.timeout(3500),
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

    const [movieTvList, animeList] = await Promise.all(tasks);
    const ordered = type === 'anime' ? [...animeList, ...movieTvList] : [...movieTvList, ...animeList];
    return deduplicateTitles(ordered);
  }

  try {
    let results = await executeSearch(queryClean);
    let didYouMean: string | undefined;
    let autoCorrected = false;

    // Check if the returned results actually contain any title relevant to the query
    const cleanQ = queryClean.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hasMeaningfulMatch = results.some((r) => {
      const t = String(r.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return t.includes(cleanQ) || cleanQ.includes(t) || calcSimilarity(cleanQ, t) >= 0.55;
    });

    const knownTypo = findServerFuzzySuggestion(queryClean);
    const isDirectTypoMap = Boolean(SERVER_SEARCH_TYPOS[cleanQ] || SERVER_SEARCH_TYPOS[queryClean.toLowerCase().trim()]);

    // Typo recovery fallback: Trigger if 0 results, no meaningful title match, or explicitly known typo
    if (results.length === 0 || !hasMeaningfulMatch || isDirectTypoMap) {
      const suggested = knownTypo;
      if (suggested && suggested.toLowerCase() !== queryClean.toLowerCase()) {
        const recovered = await executeSearch(suggested);
        if (recovered.length > 0) {
          results = recovered;
          didYouMean = suggested;
          autoCorrected = true;
        }
      }
    }

    // Secondary fallback for multi-word phrases with common noise words ("nonton ... sub indo", "season 1", etc.)
    if (results.length === 0 && queryClean.includes(' ')) {
      const stripped = queryClean
        .replace(/\b(nonton|film|movie|serial|series|anime|sub\s*indo|subtitle\s*indonesia|season\s*\d+|eps\s*\d+|episode\s*\d+)\b/gi, '')
        .trim();
      if (stripped && stripped.length >= 3 && stripped.toLowerCase() !== queryClean.toLowerCase()) {
        const strippedResults = await executeSearch(stripped);
        if (strippedResults.length > 0) {
          results = strippedResults;
          didYouMean = stripped;
          autoCorrected = true;
        }
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
      autoCorrected,
      originalQuery: queryClean,
    });
  } catch (err: any) {
    return res.status(502).json({ success: false, error: 'Gagal melakukan pencarian di Zhafx.' });
  }
});

// Endpoint: AI-assisted or Rule-based Synopsis Translation
app.post('/api/translate/synopsis', async (req: Request, res: Response) => {
  const { text, title } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Teks sinopsis diperlukan.' });
  }

  const cleanTitle = String(title || '').toLowerCase().trim();

  // 1. Check in-memory / disk cache
  if (cleanTitle && serverSynopsisCache[cleanTitle]) {
    return res.json({ translation: serverSynopsisCache[cleanTitle], source: 'cache' });
  }

  // 2. Check curated manual dictionary
  if (cleanTitle) {
    for (const [key, val] of Object.entries(SERVER_MANUAL_SYNOPSES)) {
      if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
        serverSynopsisCache[cleanTitle] = val;
        saveSynopsisCache();
        return res.json({ translation: val, source: 'dictionary' });
      }
    }
  }

  // 3. If already Indonesian, return as-is
  if (checkIsIndonesianText(text)) {
    if (cleanTitle) {
      serverSynopsisCache[cleanTitle] = text;
      saveSynopsisCache();
    }
    return res.json({ translation: text, source: 'original' });
  }

  // 4. Try Gemini AI Translation if key exists
  const currentKey = process.env.GEMINI_API_KEY || apiKey;
  if (currentKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      const promptText = `Terjemahkan sinopsis film/serial ini ke dalam Bahasa Indonesia yang mengalir, sinematik, dramatis, dan memikat tanpa tanda petik pembuka/penutup:\n"${text}"`;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), 3500)
      );
      const aiRes: any = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
        }),
        timeoutPromise,
      ]);

      const translatedText = aiRes.text?.trim();
      if (translatedText && checkIsIndonesianText(translatedText)) {
        if (cleanTitle) {
          serverSynopsisCache[cleanTitle] = translatedText;
          saveSynopsisCache();
        }
        return res.json({ translation: translatedText, source: 'ai' });
      }
    } catch {
      // Fall through to smart rule translation
    }
  }

  // 5. Smart rule translation fallback
  const smart = applySmartSynopsisRules(text);
  if (cleanTitle) {
    serverSynopsisCache[cleanTitle] = smart;
    saveSynopsisCache();
  }
  return res.json({ translation: smart, source: 'rule' });
});

// 5. TV Season episodes endpoint with guaranteed stills
app.get('/api/season', async (req: Request, res: Response) => {
  const rawId = String(req.query.id || '').trim();
  const season = (req.query.season as string) || '1';

  if (!rawId) {
    return res.status(400).json({ error: 'ID tayangan diperlukan.' });
  }

  // Resolve anime ID to TMDB TV ID if applicable (e.g. 16498 -> 1429 for Attack on Titan)
  const id = ANIME_TMDB_MAP[rawId.toLowerCase()] || rawId;

  const upstreamData = await fetchFromFrameXUpstream('/api/season', { id, season });
  if (upstreamData) {
    if (Array.isArray(upstreamData.episodes)) {
      upstreamData.episodes = upstreamData.episodes.map((ep: any) => {
        let stillImage = ep.still || ep.still_path || '';
        if (stillImage && !stillImage.startsWith('http')) {
          stillImage = `https://image.tmdb.org/t/p/w500${stillImage.startsWith('/') ? '' : '/'}${stillImage}`;
        }
        return {
          ...ep,
          still: stillImage,
          still_path: stillImage,
        };
      });
    }
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
  const backends = ['https://api.framextv.cc', 'https://api.framextv.xyz'];
  for (const backend of backends) {
    try {
      const upstreamRes = await fetch(`${backend}/api/providers`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.cc/',
          'Origin': 'https://framextv.cc',
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
// Comments & Ratings (Authenticated users) + Supabase Server Sync
// ==========================================
app.get('/api/comments', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const contentId = String(req.query.contentId || '').trim();
  if (!contentId) return res.status(400).json({ success: false, error: 'contentId wajib diisi.', comments: [] });

  const db = readAuthDb();
  const checkCommentAdmin = (c: any): boolean => {
    if (c.isAdmin === true || c.is_admin === true) return true;
    const authorUser = db.users.find((u) => u.id === c.userId || u.id === c.user_id);
    const authorEmail = (authorUser?.email || c.userEmail || '').toLowerCase().trim();
    if (authorEmail && ADMIN_EMAILS.includes(authorEmail)) return true;
    const name = String(c.userName || c.user_name || '').toLowerCase().trim();
    if (name.includes('admin') || name === 'zhafx' || name === 'zhafx team') return true;
    return false;
  };

  let supabaseComments: any[] = [];
  let fetchedFromSupabase = false;

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        supabaseComments = data.map((comment) => ({
          id: comment.id,
          contentId: comment.content_id,
          contentTitle: comment.content_title || comment.title || undefined,
          mediaType: comment.media_type,
          userId: comment.user_id,
          userName: comment.user_name,
          userEmail: comment.user_email || undefined,
          text: comment.text || undefined,
          rating: comment.rating || undefined,
          createdAt: new Date(comment.created_at).getTime(),
          isAdmin: checkCommentAdmin(comment),
        }));
        fetchedFromSupabase = true;
      }
    } catch {
      // Fallback gracefully
    }
  }

  const localComments = (db.comments || [])
    .filter((c) => c.contentId === contentId)
    .map((c) => ({
      ...c,
      isAdmin: checkCommentAdmin(c),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (fetchedFromSupabase && supabaseComments.length > 0) {
    const map = new Map<string, any>();
    supabaseComments.forEach((c) => map.set(c.id, c));
    localComments.forEach((c) => {
      if (!map.has(c.id)) map.set(c.id, c);
    });
    const combined = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return res.json({ success: true, comments: combined });
  }

  return res.json({ success: true, comments: localComments });
});

app.post('/api/comments', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const { contentId, mediaType, text, rating, userName: clientUserName, userEmail: clientEmail, title, contentTitle } = req.body || {};
  const cleanText = typeof text === 'string' ? text.trim().slice(0, 1000) : '';
  const numericRating = rating === undefined || rating === null || rating === '' ? undefined : Number(rating);
  if (!contentId || (!cleanText && numericRating === undefined)) {
    return res.status(400).json({ success: false, error: 'Komentar atau rating wajib diisi.' });
  }
  if (numericRating !== undefined && (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5)) {
    return res.status(400).json({ success: false, error: 'Rating harus antara 1 sampai 5.' });
  }

  const userId = getUserIdFromAuthHeader(req);
  if (!userId) return res.status(401).json({ success: false, error: 'Silakan login terlebih dahulu untuk memberikan komentar.' });

  const db = readAuthDb();
  const authorUser = db.users.find((u) => u.id === userId);
  const authorEmail = (authorUser?.email || clientEmail || String(req.headers['x-user-email'] || '')).toLowerCase().trim();
  const isAuthorAdmin = checkIsAdmin(req) || (authorEmail && ADMIN_EMAILS.includes(authorEmail));

  const newCommentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userName = typeof clientUserName === 'string' ? clientUserName.trim().slice(0, 120) || 'Pengguna' : 'Pengguna';
  const resolvedTitle = contentTitle || title || undefined;

  const newComment: AuthComment & { userEmail?: string; isAdmin?: boolean } = {
    id: newCommentId,
    contentId: String(contentId),
    contentTitle: resolvedTitle,
    mediaType: String(mediaType || 'movie'),
    userId,
    userName,
    userEmail: authorEmail || undefined,
    text: cleanText || undefined,
    rating: numericRating,
    createdAt: Date.now(),
    isAdmin: Boolean(isAuthorAdmin),
  };

  // Always save to local DB
  if (!db.comments) db.comments = [];
  db.comments.push(newComment);
  writeAuthDb(db);

  // Sync to Supabase
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('comments').insert({
        id: newCommentId,
        content_id: String(contentId),
        content_title: resolvedTitle || null,
        media_type: String(mediaType || 'movie'),
        user_id: userId,
        user_name: userName,
        user_email: authorEmail || null,
        text: cleanText || null,
        rating: numericRating ?? null,
      }).select().single();

      if (!error && data) {
        return res.status(201).json({
          success: true,
          comment: {
            id: data.id,
            contentId: data.content_id,
            contentTitle: data.content_title || resolvedTitle,
            mediaType: data.media_type,
            userId: data.user_id,
            userName: data.user_name,
            userEmail: data.user_email || authorEmail,
            text: data.text || undefined,
            rating: data.rating || undefined,
            createdAt: new Date(data.created_at).getTime(),
            isAdmin: Boolean(isAuthorAdmin),
          },
        });
      }
    } catch (sbErr) {
      console.warn('[Supabase Insert Comment Warning]:', sbErr);
    }
  }

  return res.status(201).json({ success: true, comment: newComment });
});

// Delete comment (Admin or comment author)
app.delete(['/api/comments/:id', '/api/admin/comments/:id'], async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const commentId = req.params.id;
  const userId = getUserIdFromAuthHeader(req);
  const isAdmin = checkIsAdmin(req);

  if (!userId && !isAdmin) {
    return res.status(401).json({ success: false, error: 'Autentikasi diperlukan.' });
  }

  const db = readAuthDb();
  if (db.comments) {
    const existing = db.comments.find((c) => c.id === commentId);
    if (existing && !isAdmin && existing.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Hanya dapat menghapus komentar milik sendiri.' });
    }
    db.comments = db.comments.filter((c) => c.id !== commentId);
    writeAuthDb(db);
  }

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('comments').delete().eq('id', commentId);
    } catch (sbErr) {
      console.warn('[Supabase Delete Comment Warning]:', sbErr);
    }
  }

  return res.json({ success: true, message: 'Komentar berhasil dihapus.' });
});

// ==========================================
// Admin Dedicated Endpoints (Database, Moderasi, Users)
// ==========================================
app.get('/api/admin/check', (req: Request, res: Response) => {
  const isAdmin = checkIsAdmin(req);
  return res.json({
    isAdmin,
    supabaseConfigured: true,
    supabaseUrl: SUPABASE_URL,
    projectRef: 'xjyzfunqiazlayivjsxj',
  });
});

app.get('/api/admin/stats', async (req: Request, res: Response) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Administrator.' });
  }

  const db = readAuthDb();
  let supabaseCommentsCount = 0;
  let supabaseConnected = false;

  if (supabaseAdmin) {
    try {
      const { count, error } = await supabaseAdmin.from('comments').select('*', { count: 'exact', head: true });
      if (!error) {
        supabaseCommentsCount = count || 0;
        supabaseConnected = true;
      }
    } catch {}
  }

  const totalComments = Math.max(supabaseCommentsCount, (db.comments || []).length);
  const totalUsers = db.users.length;
  const progressDb = readProgressDb();

  return res.json({
    success: true,
    totalComments,
    totalUsers,
    totalProgress: progressDb.length,
    supabase: {
      connected: supabaseConnected,
      url: SUPABASE_URL,
      project: 'xjyzfunqiazlayivjsxj',
    },
  });
});

app.get('/api/admin/comments', async (req: Request, res: Response) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }

  const localDb = readAuthDb();
  let comments: any[] = [];
  const userMap = new Map<string, string>();

  if (supabaseAdmin) {
    try {
      // 1. Resolve user names from Supabase users table
      const { data: usersData } = await supabaseAdmin.from('users').select('id, name, email');
      if (usersData && Array.isArray(usersData)) {
        usersData.forEach((u) => {
          userMap.set(u.id, u.name || (u.email ? u.email.split('@')[0] : 'Pengguna'));
        });
      }

      // 2. Query comments from Supabase
      const { data, error } = await supabaseAdmin
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && Array.isArray(data)) {
        comments = data.map((c) => {
          const authorUser = (localDb.users || []).find((u) => u.id === c.user_id) || (localDb.users || []).find((u) => u.name === c.user_name);
          const authorEmail = c.user_email || authorUser?.email || '';
          const isCommentAdmin = Boolean(
            c.is_admin === true ||
            (authorEmail && ADMIN_EMAILS.includes(authorEmail.toLowerCase())) ||
            (c.user_name && String(c.user_name).toLowerCase().includes('admin'))
          );
          return {
            id: c.id,
            contentId: c.content_id || c.post_id || 'Umum',
            contentTitle: c.content_title || c.title || undefined,
            mediaType: c.media_type || 'movie',
            userId: c.user_id,
            userName: c.user_name || userMap.get(c.user_id) || 'Pengguna Terdaftar',
            userEmail: authorEmail || undefined,
            text: c.text || c.body || '(Tidak ada teks)',
            rating: c.rating ? Number(c.rating) : 5,
            createdAt: new Date(c.created_at).getTime(),
            source: 'supabase',
            isAdmin: isCommentAdmin,
          };
        });
      }
    } catch (err) {
      console.warn('[Admin Comments Supabase Error]:', err);
    }
  }

  const localComments = (localDb.comments || []).map((c: any) => {
    const authorUser = (localDb.users || []).find((u) => u.id === c.userId);
    const authorEmail = c.userEmail || authorUser?.email || '';
    const isCommentAdmin = Boolean(
      c.isAdmin === true ||
      (authorEmail && ADMIN_EMAILS.includes(authorEmail.toLowerCase())) ||
      (c.userName && String(c.userName).toLowerCase().includes('admin'))
    );
    return {
      ...c,
      userEmail: authorEmail || undefined,
      isAdmin: isCommentAdmin,
      source: 'local',
    };
  });

  const map = new Map<string, any>();
  // Supabase comments
  comments.forEach((c) => map.set(c.id, c));
  // Local comments
  localComments.forEach((c) => {
    if (!map.has(c.id)) {
      map.set(c.id, c);
    }
  });

  const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return res.json({ success: true, comments: merged, total: merged.length });
});

app.get('/api/admin/users', (req: Request, res: Response) => {
  if (!checkIsAdmin(req)) {
    return res.status(403).json({ error: 'Akses ditolak.' });
  }
  const db = readAuthDb();
  const users = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isEmailVerified: u.isEmailVerified,
    joinedAt: u.joinedAt,
    isAdmin: ADMIN_EMAILS.includes(u.email.toLowerCase()),
  }));
  return res.json({ success: true, users });
});

// ==========================================
// Supabase Notes API (Quickstart & Admin Notes)
// ==========================================
const DEFAULT_SAMPLE_NOTES = [
  { id: 1, title: 'Today I created a Supabase project.' },
  { id: 2, title: 'I added some data and queried it from Next.js.' },
  { id: 3, title: 'It was awesome!' },
];

let inMemoryNotes = [...DEFAULT_SAMPLE_NOTES];

app.get('/api/notes', async (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('notes').select('*').order('id', { ascending: true });
      if (!error && Array.isArray(data)) {
        return res.json({
          success: true,
          notes: data.length > 0 ? data : inMemoryNotes,
          source: 'supabase',
          tableCreated: true,
        });
      }
    } catch {}
  }

  return res.json({
    success: true,
    notes: inMemoryNotes,
    source: 'local_fallback',
    tableCreated: false,
    message: 'Tabel public.notes belum dibuat di Supabase SQL Editor.',
  });
});

app.post('/api/notes', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'Judul catatan tidak boleh kosong.' });
  }

  const cleanTitle = title.trim();
  let createdNote: any = null;

  if (supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.from('notes').insert({ title: cleanTitle }).select('*').single();
      if (!error && data) {
        createdNote = data;
        return res.status(201).json({ success: true, note: createdNote, source: 'supabase' });
      }
    } catch {}
  }

  createdNote = {
    id: inMemoryNotes.length > 0 ? Math.max(...inMemoryNotes.map((n) => Number(n.id) || 0)) + 1 : 1,
    title: cleanTitle,
  };
  inMemoryNotes.push(createdNote);

  return res.status(201).json({ success: true, note: createdNote, source: 'local' });
});

app.delete('/api/notes/:id', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  const id = req.params.id;

  if (supabaseAdmin) {
    try {
      await supabaseAdmin.from('notes').delete().eq('id', id);
    } catch {}
  }

  inMemoryNotes = inMemoryNotes.filter((n) => String(n.id) !== String(id));
  return res.json({ success: true, message: 'Catatan berhasil dihapus.' });
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

// Helper: Query FrameX API directly to resolve anime ID or title (Strictly https://framextv.cc, no AniList)
async function resolveAnimeId(id: string, title?: string): Promise<string | null> {
  const backends = ['https://api.framextv.cc', 'https://api.framextv.xyz'];
  const searchTerm = title && title.trim() ? title.trim() : (isNaN(Number(id)) ? id : null);

  if (searchTerm) {
    for (const backend of backends) {
      try {
        const res = await fetch(`${backend}/api/search?q=${encodeURIComponent(searchTerm)}&type=anime`, {
          signal: AbortSignal.timeout(3000),
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://framextv.cc/',
            'Origin': 'https://framextv.cc',
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
    url = `https://api.framextv.cc${url}`;
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
      'Referer': 'https://framextv.cc/',
      'Origin': 'https://framextv.cc',
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
  const backends = ['https://api.framextv.cc', 'https://api.framextv.xyz'];
  const priorityList = audio === 'dub'
    ? ['grand_warden_dub', 'goblin_dub', 'wizard_dub', 'valkyrie_dub', 'dragon_dub']
    : ['grand_warden', 'goblin', 'giant', 'wizard', 'super_pekka', 'valkyrie', 'dragon'];

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

  const backends = ['https://api.framextv.cc', 'https://api.framextv.xyz'];
  const q = new URLSearchParams();
  q.set('id', id);
  q.set('type', type);
  if (season) q.set('season', season);
  if (episode) q.set('episode', episode);
  if (provider && provider !== 'auto') q.set('provider', provider);

  for (const backend of backends) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const upstreamRes = await fetch(`${backend}/api/stream?${q.toString()}`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': 'https://framextv.cc/',
          'Origin': 'https://framextv.cc',
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

// Update Profile endpoint
app.post('/api/auth/update-profile', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const { name, avatar, email } = req.body || {};

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanAvatar = typeof avatar === 'string' ? avatar.trim() : '';

    const db = readAuthDb();
    let targetUser: StoredUser | undefined;

    if (token) {
      const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
      if (session) {
        targetUser = db.users.find((u) => u.id === session.userId);
      }
    }

    if (!targetUser && cleanEmail) {
      targetUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (targetUser) {
      if (cleanName) targetUser.name = cleanName;
      if (cleanAvatar) targetUser.avatar = cleanAvatar;
      writeAuthDb(db);

      return res.status(200).json({
        success: true,
        message: 'Profil berhasil diperbarui.',
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
          joinedAt: targetUser.joinedAt,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: {
        name: cleanName || 'Pengguna',
        email: cleanEmail || '',
        avatar: cleanAvatar || undefined,
      },
    });
  } catch (err: any) {
    console.error('[Auth Update Profile Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memperbarui profil akun.' });
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

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.VITE_GOOGLE_CLIENT_ID ||
  '358715674309-g142976e962nes0vo0kf3m1ida0jl7te.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET_2 ||
  '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'https://zhafxstreaming.web.id/auth/google/callback';

app.get(['/api/auth/google/login', '/auth/google/login', '/api/auth/google'], (req: Request, res: Response) => {
  const origin = getRequestOrigin(req);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || (origin.includes('zhafxstreaming.web.id') ? GOOGLE_REDIRECT_URI : `${origin}/auth/google/callback`);

  const state = crypto.randomBytes(16).toString('hex');
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', state);

  if (req.headers.accept?.includes('application/json') || req.query.format === 'json') {
    return res.status(200).json({ success: true, url: googleAuthUrl.toString(), clientId: GOOGLE_CLIENT_ID, redirectUri });
  }

  res.redirect(googleAuthUrl.toString());
});

// Google OAuth 2.0 Callback Handler (Supports /auth/google/callback, /api/auth/google/callback, /auth/callback)
app.get(['/auth/google/callback', '/api/auth/google/callback', '/auth/callback'], async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const origin = getRequestOrigin(req);
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || (origin.includes('zhafxstreaming.web.id') ? GOOGLE_REDIRECT_URI : `${origin}/auth/google/callback`);

  if (error || !code) {
    const errorMsg = error || 'Otorisasi Google dibatalkan atau gagal.';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
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

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
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
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
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

    const targetRedirectUri = redirectUri || GOOGLE_REDIRECT_URI;

    // 1. Verify Google Authorization Code if provided
    if (code && GOOGLE_CLIENT_SECRET) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: targetRedirectUri,
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

    // Sync into Community stats & activity feed
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';
      const u = token ? getUserByToken(token) : null;
      recordWatchProgressForUser({
        userId,
        userName: u?.name || (req.body && req.body.userName),
        userAvatar: u?.avatar,
        contentId: String(contentId),
        title: String(title || 'Tayangan'),
        mediaType: (mediaType === 'tv' || mediaType === 'anime' ? mediaType : 'movie'),
        durationSec: validDuration,
        currentSec: validCurrentTime,
        completed: isCompleted,
        poster: poster ? String(poster) : undefined,
        season: sNum,
        episode: epNum,
      });
    } catch {
      // non-blocking
    }

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

// ==========================================
// Community, Friends Follow & Rankings API Endpoints
// ==========================================

// 1. Get Community Users / Friends List
app.get('/api/community/friends', (req: Request, res: Response) => {
  try {
    const currentUserId = getUserIdFromAuthHeader(req) || undefined;
    const search = req.query.q as string | undefined;
    const friends = getCommunityFriends(currentUserId, search);
    return res.status(200).json({
      success: true,
      friends,
      total: friends.length,
    });
  } catch (err: any) {
    console.error('[Community Friends Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat daftar teman & pengguna komunitas.' });
  }
});

// 2. Follow / Unfollow Toggle
app.post('/api/community/follow', (req: Request, res: Response) => {
  try {
    const followerId = getUserIdFromAuthHeader(req);
    if (!followerId) {
      return res.status(401).json({ success: false, error: 'Silakan masuk akun terlebih dahulu untuk mengikuti teman.' });
    }

    const { targetUserId } = req.body || {};
    if (!targetUserId || typeof targetUserId !== 'string') {
      return res.status(400).json({ success: false, error: 'Target user ID tidak valid.' });
    }

    const result = toggleFollowUser(followerId, targetUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    // Add activity if followed
    if (result.isFollowing) {
      const u = getUserByToken(req.headers.authorization?.substring(7).trim() || '');
      const target = getUserPublicProfile(targetUserId);
      if (target) {
        addCommunityActivity({
          userId: followerId,
          userName: u?.name || 'Pengguna Zhafx',
          userAvatar: u?.avatar,
          action: 'watching',
          mediaId: target.id,
          mediaTitle: `Mulai mengikuti ${target.name}`,
          mediaType: 'movie',
          poster: target.avatar,
        });
      }
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Community Follow Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memproses follow/unfollow.' });
  }
});

// 3. Get Public Profile of any User / Friend
app.get('/api/community/profile/:userId', (req: Request, res: Response) => {
  try {
    const currentUserId = getUserIdFromAuthHeader(req) || undefined;
    const profile = getUserPublicProfile(req.params.userId, currentUserId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
    }
    return res.status(200).json({ success: true, profile });
  } catch (err: any) {
    console.error('[Community Profile Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat profil pengguna.' });
  }
});

// 4. Community Live Activities Feed
app.get('/api/community/activities', (req: Request, res: Response) => {
  try {
    const currentUserId = getUserIdFromAuthHeader(req) || undefined;
    const limit = Math.min(100, Math.max(10, parseInt(String(req.query.limit || '40'), 10)));
    const activities = getCommunityActivities(currentUserId, limit);
    return res.status(200).json({ success: true, activities });
  } catch (err: any) {
    console.error('[Community Activities Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat aktivitas komunitas.' });
  }
});

// 5. Post Custom Community Activity (e.g. from client rating or watch milestone)
app.post('/api/community/activity', (req: Request, res: Response) => {
  try {
    const userId = getUserIdFromAuthHeader(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Autentikasi diperlukan.' });
    }

    const { action, mediaId, mediaTitle, mediaType, poster, season, episode, rating, percentage } = req.body || {};
    if (!mediaId || !mediaTitle) {
      return res.status(400).json({ success: false, error: 'Data tayangan tidak lengkap.' });
    }

    const u = getUserByToken(req.headers.authorization?.substring(7).trim() || '');
    const newAct = addCommunityActivity({
      userId,
      userName: u?.name || 'Pengguna',
      userAvatar: u?.avatar,
      action: action || 'watching',
      mediaId: String(mediaId),
      mediaTitle: String(mediaTitle),
      mediaType: mediaType || 'movie',
      poster: String(poster || ''),
      season: season ? Number(season) : undefined,
      episode: episode ? Number(episode) : undefined,
      rating: rating ? Number(rating) : undefined,
      percentage: percentage ? Number(percentage) : undefined,
    });

    return res.status(200).json({ success: true, activity: newAct });
  } catch (err: any) {
    console.error('[Community Post Activity Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal mencatat aktivitas komunitas.' });
  }
});

// 6. Top Watchers Leaderboard Ranking
app.get('/api/rankings/top-watchers', (req: Request, res: Response) => {
  try {
    const currentUserId = getUserIdFromAuthHeader(req) || undefined;
    const period = String(req.query.period || 'all_time');
    const leaderboard = getTopWatchersLeaderboard(period, currentUserId);
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res.status(200).json({ success: true, ...leaderboard });
  } catch (err: any) {
    console.error('[Top Watchers Leaderboard Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat ranking penonton.' });
  }
});

// 7. Top Watched Titles Catalog Ranking
app.get('/api/rankings/top-watched', (req: Request, res: Response) => {
  try {
    const type = String(req.query.type || 'all');
    const period = String(req.query.period || 'all_time');
    const catalog = getTopWatchedTitlesCatalog(type, period);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ success: true, ...catalog });
  } catch (err: any) {
    console.error('[Top Watched Catalog Error]:', err);
    return res.status(500).json({ success: false, error: 'Gagal memuat ranking tayangan paling banyak ditonton.' });
  }
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

  // Serve static assets from public directly with efficient caching headers
  app.use(
    express.static(path.resolve(__dirname, 'public'), {
      maxAge: '30d',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        } else if (filePath.match(/\.(png|jpg|jpeg|webp|svg|ico|gif|woff2?|ttf|eot)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
        }
      },
    })
  );

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback handler for SPA client routing in development
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(indexPath)) return next();
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    // 1. Serve hashed Vite production bundles with 1-year immutable caching
    app.use(
      '/assets',
      express.static(path.resolve(__dirname, 'dist', 'assets'), {
        maxAge: '31536000',
        immutable: true,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
      })
    );

    // 2. Serve root dist directory
    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
          } else if (filePath.match(/\.(png|jpg|jpeg|webp|svg|ico|gif|woff2?)$/i)) {
            res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
          }
        },
      })
    );

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

      let pageTitle = 'ZHAFX Streaming Nonton Anime, Film & Serial TV Gratis dan Bebas Iklan';
      if (req.path.startsWith('/explore/anime')) {
        pageTitle = 'Jelajahi Anime — ZHAFX';
      } else if (req.path.startsWith('/explore/tv')) {
        pageTitle = 'Jelajahi Serial TV — ZHAFX';
      } else if (req.path.startsWith('/explore/movie')) {
        pageTitle = 'Jelajahi Film — ZHAFX';
      } else if (req.path.startsWith('/explore')) {
        pageTitle = 'Jelajahi Katalog Tayangan — ZHAFX';
      } else if (req.path.startsWith('/history')) {
        pageTitle = 'Riwayat Menonton — ZHAFX';
      } else if (req.path.startsWith('/my-list')) {
        pageTitle = 'Daftar Tontonan Saya — ZHAFX';
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
