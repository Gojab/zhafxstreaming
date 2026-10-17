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

  const { email, name } = body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Email Google wajib diisi.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name && typeof name === 'string' && name.trim()) || cleanEmail.split('@')[0];
  const baseUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
  const username = baseUsername || `g_${Date.now().toString(36)}`;

  const user = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    name: cleanName,
    username,
    email: cleanEmail,
    joinedAt: Date.now(),
  };

  const token = crypto.randomBytes(32).toString('hex');

  return res.status(200).json({
    success: true,
    token,
    user,
    message: `Berhasil masuk dengan akun Google: ${user.email}`,
  });
}
