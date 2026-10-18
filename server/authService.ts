import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Persistent Auth DB path
let memoryAuthDb: AuthDb | null = null;

function getDbPaths() {
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  const dataDir = isVercel ? path.resolve('/tmp') : path.resolve(process.cwd(), 'data');
  const dbPath = path.resolve(dataDir, 'auth_db.json');
  return { dataDir, dbPath };
}

export interface StoredUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash?: string;
  avatar?: string;
  isEmailVerified: boolean;
  joinedAt: number;
  googleId?: string;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface StoredOtp {
  email: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
  createdAt: number;
  ip?: string;
}

export interface AuthDb {
  users: StoredUser[];
  sessions: StoredSession[];
  otps: StoredOtp[];
}

export function initAuthDb(): AuthDb {
  if (memoryAuthDb) {
    return memoryAuthDb;
  }

  const { dataDir, dbPath } = getDbPaths();

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  if (!fs.existsSync(dbPath)) {
    const initialDb: AuthDb = {
      users: [],
      sessions: [],
      otps: [],
    };
    try {
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), 'utf-8');
    } catch {
      // ignore
    }
    memoryAuthDb = initialDb;
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw);
    const users: StoredUser[] = Array.isArray(parsed.users)
      ? parsed.users.map((u: any) => ({
          ...u,
          isEmailVerified: u.isEmailVerified !== undefined ? u.isEmailVerified : true,
        }))
      : [];
    const validUserIds = new Set(users.map((u) => u.id));
    const sessions: StoredSession[] = Array.isArray(parsed.sessions)
      ? parsed.sessions.filter((s: StoredSession) => validUserIds.has(s.userId))
      : [];
    const otps: StoredOtp[] = Array.isArray(parsed.otps) ? parsed.otps : [];

    memoryAuthDb = {
      users,
      sessions,
      otps,
    };
    return memoryAuthDb;
  } catch (e) {
    console.error('[Auth DB] Error reading database, recreating fallback state:', e);
    const fallbackDb: AuthDb = { users: [], sessions: [], otps: [] };
    memoryAuthDb = fallbackDb;
    try {
      fs.writeFileSync(dbPath, JSON.stringify(fallbackDb, null, 2), 'utf-8');
    } catch {
      // ignore
    }
    return fallbackDb;
  }
}

export function readAuthDb(): AuthDb {
  return initAuthDb();
}

export function writeAuthDb(db: AuthDb): void {
  memoryAuthDb = db;
  const { dataDir, dbPath } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tempPath = `${dbPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, dbPath);
  } catch (e) {
    try {
      const fallbackPath = path.resolve('/tmp', 'auth_db.json');
      fs.writeFileSync(fallbackPath, JSON.stringify(db, null, 2), 'utf-8');
    } catch {
      console.warn('[Auth DB] Kept state in memory cache.');
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
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

export function hashOtp(email: string, otp: string): string {
  return crypto
    .createHash('sha256')
    .update(`${email.trim().toLowerCase()}:${otp.trim()}:zhafx_salt_2026`)
    .digest('hex');
}

export function maskEmail(email: string): string {
  const [local, domain] = email.trim().toLowerCase().split('@');
  if (!domain) return email;
  if (local.length <= 3) {
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${local.slice(0, 4)}***@${domain}`;
}

export async function sendTransactionalOtpEmail(params: {
  toEmail: string;
  name?: string;
  otpCode: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return {
      success: false,
      error:
        'Layanan pengiriman email belum dikonfigurasi (RESEND_API_KEY belum diatur pada environment variables server). Harap tambahkan RESEND_API_KEY di dashboard server Anda.',
    };
  }

  const fromEmail = process.env.EMAIL_FROM || 'ZhafxStreaming <onboarding@resend.dev>';
  const cleanEmail = params.toEmail.trim().toLowerCase();
  const userName = params.name ? params.name.trim() : 'Pengguna Zhafx';

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kode Verifikasi Email ZhafxStreaming</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #06070B;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #06070B;
      padding: 40px 16px;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background-color: #0E1017;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 28px;
      padding: 36px 28px;
      text-align: center;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #FFFFFF;
      margin-bottom: 20px;
    }
    .logo-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 12px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 10px 0;
      letter-spacing: -0.02em;
    }
    p {
      font-size: 13px;
      line-height: 1.6;
      color: rgba(255, 255, 255, 0.7);
      margin: 0 0 24px 0;
    }
    .otp-box {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.22);
      border-radius: 18px;
      padding: 20px;
      margin: 24px 0;
    }
    .otp-code {
      font-family: 'SF Mono', Monaco, Consolas, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #FFFFFF;
      display: inline-block;
      padding-left: 8px;
    }
    .expiry-note {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.45);
      margin-top: 10px;
    }
    .warning {
      background: rgba(255, 255, 255, 0.04);
      border-left: 3px solid #FFFFFF;
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.65);
      text-align: left;
      margin: 24px 0 10px 0;
      line-height: 1.5;
    }
    .footer {
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
      margin-top: 28px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">ZHAFX<span style="opacity: 0.5;">STREAMING</span></div>
      <div class="logo-badge">Verifikasi Keamanan Akun</div>
      <h1>Kode Verifikasi Email</h1>
      <p>Halo <strong>${userName}</strong>, gunakan kode verifikasi 6-digit di bawah ini untuk melanjutkan pendaftaran atau masuk ke ZhafxStreaming:</p>
      
      <div class="otp-box">
        <div class="otp-code">${params.otpCode}</div>
        <div class="expiry-note">Kode ini hanya berlaku selama <strong>5 menit</strong>.</div>
      </div>
      
      <div class="warning">
        <strong>Penting:</strong> Jangan pernah membagikan kode verifikasi ini kepada siapa pun. Pihak ZhafxStreaming tidak akan pernah meminta kode verifikasi Anda.
      </div>
      
      <div class="footer">
        Email ini dikirim secara otomatis. Jika Anda tidak merasa meminta kode ini, Anda dapat mengabaikan email ini dengan aman.<br><br>
        &copy; 2026 ZhafxStreaming. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [cleanEmail],
        subject: 'Kode Verifikasi Email ZhafxStreaming',
        html: htmlContent,
        text: `Kode verifikasi ZhafxStreaming Anda adalah: ${params.otpCode}. Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.`,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      const errMsg = errBody?.message || `Gagal mengirim email (HTTP ${res.status}).`;
      console.error('[Resend Error]:', errMsg);
      return {
        success: false,
        error: `Gagal mengirim email verifikasi via Resend: ${errMsg}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Resend Network Error]:', err);
    return {
      success: false,
      error: `Gagal menghubungi server layanan email: ${err?.message || 'Network error'}`,
    };
  }
}

export async function createAndSendOtp(params: {
  email: string;
  name?: string;
  ip?: string;
}): Promise<{
  success: boolean;
  error?: string;
  maskedEmail?: string;
  cooldownSeconds?: number;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }

  const db = readAuthDb();
  const now = Date.now();

  const existingOtp = db.otps.find((o) => o.email === cleanEmail && !o.used);
  if (existingOtp && now - existingOtp.createdAt < 60 * 1000) {
    const remainingSeconds = Math.ceil((60 * 1000 - (now - existingOtp.createdAt)) / 1000);
    return {
      success: false,
      error: `Harap tunggu ${remainingSeconds} detik sebelum meminta kode verifikasi baru.`,
      cooldownSeconds: remainingSeconds,
      maskedEmail: maskEmail(cleanEmail),
    };
  }

  const oneHourAgo = now - 60 * 60 * 1000;
  const recentCount = db.otps.filter((o) => o.email === cleanEmail && o.createdAt > oneHourAgo).length;
  if (recentCount >= 6) {
    return {
      success: false,
      error: 'Batas permintaan kode verifikasi tercapai (maksimal 5 kali per jam). Harap coba lagi nanti.',
    };
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpHash = hashOtp(cleanEmail, otpCode);
  const expiresAt = now + 5 * 60 * 1000;

  const emailResult = await sendTransactionalOtpEmail({
    toEmail: cleanEmail,
    name: params.name,
    otpCode,
  });

  if (!emailResult.success) {
    return {
      success: false,
      error: emailResult.error || 'Gagal mengirim email verifikasi.',
    };
  }

  db.otps = db.otps.filter((o) => o.email !== cleanEmail);

  db.otps.push({
    email: cleanEmail,
    otpHash,
    expiresAt,
    attempts: 0,
    used: false,
    createdAt: now,
    ip: params.ip,
  });

  writeAuthDb(db);

  return {
    success: true,
    maskedEmail: maskEmail(cleanEmail),
    cooldownSeconds: 60,
  };
}

export async function verifyOtpAndAuthenticate(params: {
  email: string;
  code: string;
  name?: string;
}): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: Omit<StoredUser, 'passwordHash'>;
  message?: string;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanCode = params.code.trim();

  if (!cleanEmail || !cleanCode || cleanCode.length !== 6) {
    return {
      success: false,
      error: 'Email dan kode verifikasi 6-digit wajib diisi dengan benar.',
    };
  }

  const db = readAuthDb();
  const now = Date.now();

  const otpRecord = db.otps.find((o) => o.email === cleanEmail && !o.used);
  if (!otpRecord) {
    return {
      success: false,
      error: 'Kode verifikasi tidak ditemukan atau telah kedaluwarsa. Silakan minta kode baru.',
    };
  }

  if (otpRecord.expiresAt < now) {
    otpRecord.used = true;
    writeAuthDb(db);
    return {
      success: false,
      error: 'Kode verifikasi telah kedaluwarsa (lebih dari 5 menit). Silakan minta kode baru.',
    };
  }

  if (otpRecord.attempts >= 5) {
    otpRecord.used = true;
    writeAuthDb(db);
    return {
      success: false,
      error: 'Batas maksimal 5 kali percobaan tercapai. Kode telah dibatalkan demi keamanan.',
    };
  }

  const expectedHash = hashOtp(cleanEmail, cleanCode);
  if (otpRecord.otpHash !== expectedHash) {
    otpRecord.attempts += 1;
    writeAuthDb(db);
    const remaining = 5 - otpRecord.attempts;
    return {
      success: false,
      error: `Kode verifikasi salah. Sisa kesempatan: ${remaining} kali.`,
    };
  }

  otpRecord.used = true;

  let user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  const displayName = params.name?.trim() || cleanEmail.split('@')[0];

  if (!user) {
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    let finalUsername = baseUsername || `user_${Date.now().toString(36)}`;
    if (db.users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
      finalUsername = `${finalUsername}_${Math.floor(Math.random() * 900 + 100)}`;
    }

    user = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: displayName,
      username: finalUsername,
      email: cleanEmail,
      isEmailVerified: true,
      joinedAt: now,
    };
    db.users.push(user);
  } else {
    user.isEmailVerified = true;
    if (params.name && params.name.trim().length > 1) {
      user.name = params.name.trim();
    }
  }

  const token = crypto.randomBytes(32).toString('hex');
  const session: StoredSession = {
    token,
    userId: user.id,
    createdAt: now,
    expiresAt: now + 30 * 24 * 60 * 60 * 1000,
  };
  db.sessions.push(session);

  writeAuthDb(db);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      joinedAt: user.joinedAt,
    },
    message: `Email berhasil diverifikasi! Selamat datang di ZhafxStreaming, ${user.name}.`,
  };
}

export async function registerWithPassword(params: {
  name?: string;
  email: string;
  password: string;
  ip?: string;
}): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: Omit<StoredUser, 'passwordHash'>;
  message?: string;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.name ? params.name.trim() : cleanEmail.split('@')[0];
  const cleanPassword = params.password;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Format alamat email tidak valid.' };
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    return { success: false, error: 'Kata sandi minimal 6 karakter.' };
  }

  const db = readAuthDb();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);

  if (existingUser) {
    return {
      success: false,
      error: 'Email ini sudah terdaftar. Silakan langsung masuk menggunakan kata sandi Anda.',
    };
  }

  const passwordHash = hashPassword(cleanPassword);
  const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  let finalUsername = baseUsername || `user_${Date.now().toString(36)}`;
  if (db.users.some((u) => u.username.toLowerCase() === finalUsername.toLowerCase())) {
    finalUsername = `${finalUsername}_${Math.floor(Math.random() * 900 + 100)}`;
  }

  const newUser: StoredUser = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    name: cleanName,
    username: finalUsername,
    email: cleanEmail,
    passwordHash,
    isEmailVerified: true,
    joinedAt: Date.now(),
  };
  db.users.push(newUser);

  // Generate instant session token
  const token = crypto.randomBytes(32).toString('hex');
  const session: StoredSession = {
    token,
    userId: newUser.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  db.sessions.push(session);

  writeAuthDb(db);

  return {
    success: true,
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      isEmailVerified: true,
      joinedAt: newUser.joinedAt,
    },
    message: `Pendaftaran berhasil! Selamat datang di Zhafx, ${newUser.name}.`,
  };
}

export async function loginWithPassword(params: {
  login: string;
  password: string;
  rememberMe?: boolean;
  ip?: string;
}): Promise<{
  success: boolean;
  error?: string;
  token?: string;
  user?: Omit<StoredUser, 'passwordHash'>;
  message?: string;
}> {
  const rawLogin = (params.login || '').trim().toLowerCase();
  const rawPassword = params.password || '';

  if (!rawLogin || !rawPassword) {
    return {
      success: false,
      error: 'Email atau nama pengguna dan kata sandi wajib diisi.',
    };
  }

  const db = readAuthDb();
  const user = db.users.find(
    (u) => u.email.toLowerCase() === rawLogin || u.username.toLowerCase() === rawLogin
  );

  if (!user || !user.passwordHash) {
    return {
      success: false,
      error: 'Akun dengan email atau nama pengguna tersebut tidak ditemukan.',
    };
  }

  const isValid = verifyPassword(rawPassword, user.passwordHash);
  if (!isValid) {
    return {
      success: false,
      error: 'Kata sandi yang Anda masukkan salah. Silakan coba lagi.',
    };
  }

  user.isEmailVerified = true;

  const durationMs = params.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const token = crypto.randomBytes(32).toString('hex');
  const session: StoredSession = {
    token,
    userId: user.id,
    createdAt: Date.now(),
    expiresAt: Date.now() + durationMs,
  };
  db.sessions.push(session);
  writeAuthDb(db);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      isEmailVerified: true,
      joinedAt: user.joinedAt,
    },
    message: `Berhasil masuk! Selamat datang kembali, ${user.name}.`,
  };
}

export async function authenticateGoogleUser(params: {
  email: string;
  name?: string;
  googleId?: string;
  avatar?: string;
}): Promise<{
  success: boolean;
  token: string;
  user: Omit<StoredUser, 'passwordHash'>;
  message: string;
}> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = (params.name && params.name.trim()) || cleanEmail.split('@')[0];

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
      avatar: params.avatar,
      isEmailVerified: true,
      joinedAt: Date.now(),
      googleId: params.googleId,
    };
    db.users.push(user);
  } else {
    user.isEmailVerified = true;
    if (params.name && params.name.trim().length > 1) {
      user.name = params.name.trim();
    }
    if (params.googleId && !user.googleId) {
      user.googleId = params.googleId;
    }
    if (params.avatar) {
      user.avatar = params.avatar;
    }
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

  return {
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      isEmailVerified: user.isEmailVerified,
      joinedAt: user.joinedAt,
    },
    message: `Berhasil masuk dengan akun Google: ${user.email}`,
  };
}

export function getUserByToken(token: string): Omit<StoredUser, 'passwordHash'> | null {
  if (!token) return null;
  const db = readAuthDb();
  const now = Date.now();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > now);
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId);
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    isEmailVerified: user.isEmailVerified,
    joinedAt: user.joinedAt,
  };
}
