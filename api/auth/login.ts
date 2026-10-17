import crypto from 'crypto';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // use as-is
    }
  }

  const { login, email, username, password } = body || {};
  const rawLogin = (login || email || username || '').trim();

  if (!rawLogin || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email/nama pengguna dan kata sandi wajib diisi.',
    });
  }

  const cleanName = rawLogin.includes('@') ? rawLogin.split('@')[0] : rawLogin;
  const user = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    name: cleanName,
    username: rawLogin.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    email: rawLogin.includes('@') ? rawLogin.toLowerCase() : `${rawLogin.toLowerCase()}@user.zhafx`,
    joinedAt: Date.now(),
  };

  const token = crypto.randomBytes(32).toString('hex');

  return res.status(200).json({
    success: true,
    token,
    user,
    message: 'Berhasil masuk ke akun ZHAFX!',
  });
}
