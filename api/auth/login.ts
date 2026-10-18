import { loginWithPassword } from './service';

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

  const { login, email, username, password, rememberMe } = body || {};
  const rawLogin = (login || email || username || '').trim();
  const clientIp = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || req.socket?.remoteAddress;

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
}
