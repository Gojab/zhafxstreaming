import { authenticateGoogleUser } from './service';

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

  const { email, name, credential, code, redirectUri } = body || {};

  let verifiedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  let verifiedName = typeof name === 'string' ? name.trim() : '';

  // 1. If Google Authorization Code is provided, exchange for tokens using client secret
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID || '358715674309-hdh36g2l56bqv0rckcvcd4666kemh4sj.apps.googleusercontent.com';

  if (code && clientSecret) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri || 'postmessage',
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
              verifiedEmail = userData.email.toLowerCase();
              verifiedName = userData.name || verifiedEmail.split('@')[0];
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[Google Auth] Token exchange warning:', e?.message || e);
    }
  }

  // 2. If Google ID Token / Credential provided, verify with Google tokeninfo
  if (!verifiedEmail && credential && typeof credential === 'string') {
    try {
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (verifyRes.ok) {
        const payload = await verifyRes.json();
        if (payload.email) {
          verifiedEmail = payload.email.toLowerCase();
          verifiedName = payload.name || verifiedEmail.split('@')[0];
        }
      }
    } catch {
      // silent
    }
  }

  if (!verifiedEmail) {
    return res.status(400).json({ success: false, error: 'Email Google atau kredensial tidak valid.' });
  }

  const result = await authenticateGoogleUser({
    email: verifiedEmail,
    name: verifiedName,
  });

  return res.status(200).json({
    success: true,
    token: result.token,
    user: result.user,
    message: result.message,
  });
}
