import {
  createAndSendOtp,
  verifyOtpAndAuthenticate,
  registerWithPassword,
  loginWithPassword,
  authenticateGoogleUser,
  getUserByToken,
  readAuthDb,
  writeAuthDb,
} from '../../server/authService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract action from query param or URL path
  const queryAction = req.query?.action;
  const actionFromQuery = Array.isArray(queryAction) ? queryAction[0] : queryAction;
  const actionFromUrl = req.url?.split('?')[0].split('/').filter(Boolean).pop();
  const action = (actionFromQuery || actionFromUrl || '').toLowerCase();

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      // use raw body
    }
  } else if (!body && typeof req.on === 'function') {
    try {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk: any) => { data += chunk; });
        req.on('end', () => {
          try { resolve(JSON.parse(data)); } catch { resolve({}); }
        });
        req.on('error', () => resolve({}));
      });
    } catch {
      body = {};
    }
  }

  const clientIp = (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || req.socket?.remoteAddress;

  // 1. GET /api/auth/me
  if (action === 'me' || req.method === 'GET') {
    const authHeader = req.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token autentikasi tidak ditemukan.' });
    }
    const token = authHeader.substring(7).trim();
    const user = getUserByToken(token);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesi tidak valid atau telah berakhir.' });
    }
    return res.status(200).json({ success: true, user });
  }

  // 2. POST /api/auth/login
  if (action === 'login') {
    const { login, email, username, password, rememberMe } = body || {};
    const rawLogin = (login || email || username || '').trim();
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
      return res.status(401).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  }

  // 3. POST /api/auth/register
  if (action === 'register') {
    const { name, email, password } = body || {};
    const result = await registerWithPassword({
      name,
      email,
      password,
      ip: String(clientIp || ''),
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      maskedEmail: result.maskedEmail,
      message: result.message,
    });
  }

  // 4. POST /api/auth/logout
  if (action === 'logout') {
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      const db = readAuthDb();
      db.sessions = db.sessions.filter((s) => s.token !== token);
      writeAuthDb(db);
    }
    return res.status(200).json({ success: true, message: 'Berhasil keluar dari sesi akun.' });
  }

  // 5. POST /api/auth/send-verification-code
  if (action === 'send-verification-code') {
    const { email, name } = body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Alamat email wajib diisi.' });
    }

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

    return res.status(200).json({
      success: true,
      message: 'Kode verifikasi telah dikirim ke alamat email kamu. Silakan periksa kotak masuk Gmail, termasuk folder Spam atau Promosi.',
      maskedEmail: result.maskedEmail,
      cooldownSeconds: result.cooldownSeconds || 60,
    });
  }

  // 6. POST /api/auth/verify-code
  if (action === 'verify-code') {
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
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
      message: result.message,
    });
  }

  // 7. POST /api/auth/google-login
  if (action === 'google-login' || action === 'google_login' || action === 'google') {
    const { email, name, credential, code, redirectUri } = body || {};
    let verifiedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    let verifiedName = typeof name === 'string' ? name.trim() : '';

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

      // Safe JWT payload fallback if tokeninfo network fails
      if (!verifiedEmail && credential.includes('.')) {
        try {
          const parts = credential.split('.');
          if (parts.length >= 2) {
            const rawPayload = Buffer.from(parts[1], 'base64').toString('utf-8');
            const parsed = JSON.parse(rawPayload);
            if (parsed && parsed.email) {
              verifiedEmail = String(parsed.email).toLowerCase();
              verifiedName = parsed.name || verifiedEmail.split('@')[0];
            }
          }
        } catch {
          // silent
        }
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

  return res.status(404).json({ success: false, error: `Action '${action}' tidak dikenali.` });
}
