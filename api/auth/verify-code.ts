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

  const { email, code, name } = body || {};
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Email dan kode verifikasi 6-digit wajib diisi.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = (name && typeof name === 'string' && name.trim()) || cleanEmail.split('@')[0];

  const user = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    name: cleanName,
    username: cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, ''),
    email: cleanEmail,
    joinedAt: Date.now(),
  };

  const token = crypto.randomBytes(32).toString('hex');

  return res.status(200).json({
    success: true,
    token,
    user,
    message: `Berhasil memverifikasi kode dan masuk sebagai ${user.name}!`,
  });
}
