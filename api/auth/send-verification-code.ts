import { createAndSendOtp } from './service';

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
    return res.status(400).json({ success: false, error: 'Alamat email wajib diisi.' });
  }

  const clientIp = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || req.socket?.remoteAddress;

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
    message: `Kode verifikasi telah dikirim ke alamat email kamu. Silakan periksa kotak masuk Gmail, termasuk folder Spam atau Promosi.`,
    maskedEmail: result.maskedEmail,
    cooldownSeconds: result.cooldownSeconds || 60,
  });
}
