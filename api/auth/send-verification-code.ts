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

  const { email } = body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Alamat email wajib diisi.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  return res.status(200).json({
    success: true,
    message: `Kode verifikasi 6-digit berhasil dibuat untuk ${cleanEmail}`,
    code,
    expiresAt: Date.now() + 15 * 60 * 1000,
  });
}
