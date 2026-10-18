import { verifyOtpAndAuthenticate } from './service';

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
}
