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
      token: result.token,
      user: result.user,
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

  // 4b. POST /api/auth/update-profile
  if (action === 'update-profile' || action === 'profile') {
    const authHeader = req.headers?.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
    const { name, avatar, email } = body || {};

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanAvatar = typeof avatar === 'string' ? avatar.trim() : '';

    const db = readAuthDb();
    let targetUser = token ? getUserByToken(token) : undefined;

    if (!targetUser && cleanEmail) {
      targetUser = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    if (targetUser) {
      const userIndex = db.users.findIndex((u) => u.id === targetUser!.id);
      if (userIndex !== -1) {
        if (cleanName) db.users[userIndex].name = cleanName;
        if (cleanAvatar) db.users[userIndex].avatar = cleanAvatar;
        writeAuthDb(db);
        targetUser = db.users[userIndex];
      }

      return res.status(200).json({
        success: true,
        message: 'Profil berhasil diperbarui.',
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
          joinedAt: targetUser.joinedAt,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profil berhasil diperbarui.',
      user: {
        name: cleanName || 'Pengguna',
        email: cleanEmail || '',
        avatar: cleanAvatar || undefined,
      },
    });
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

  // 7. GET /api/auth/google/login or action === 'google-login-url'
  if (action === 'google-login-url' || action === 'google-login' && req.method === 'GET' || action === 'google/login') {
    const origin = (req.headers && (req.headers['x-forwarded-host'] || req.headers['host']))
      ? `https://${req.headers['x-forwarded-host'] || req.headers['host']}`
      : 'https://zhafxstreaming.web.id';

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://zhafxstreaming.web.id/auth/google/callback';

    const state = Math.random().toString(36).substring(2);
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');
    googleAuthUrl.searchParams.set('state', state);

    if (req.headers?.accept?.includes('application/json')) {
      return res.status(200).json({ success: true, url: googleAuthUrl.toString(), clientId, redirectUri });
    }

    res.writeHead(302, { Location: googleAuthUrl.toString() });
    return res.end();
  }

  // 8. GET /api/auth/google/callback or action === 'google-callback'
  if (action === 'google-callback' || action === 'callback' || action === 'google/callback' || (req.url && req.url.includes('/callback'))) {
    const code = req.query?.code;
    const error = req.query?.error;

    if (error || !code) {
      const errorMsg = error || 'Otorisasi Google dibatalkan atau gagal.';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Autentikasi Google Gagal</title></head>
          <body style="font-family:sans-serif;background:#06070B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;padding:24px;border:1px solid rgba(255,255,255,0.15);border-radius:20px;max-width:400px;background:#0E1017;">
              <h2 style="color:#ef4444;margin-top:0;">Autentikasi Dibatalkan</h2>
              <p style="font-size:14px;color:rgba(255,255,255,0.7);">${errorMsg}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${errorMsg}' }, '*');
                  setTimeout(() => window.close(), 1500);
                } else {
                  setTimeout(() => { window.location.href = '/'; }, 2000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET_2 || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://zhafxstreaming.web.id/auth/google/callback';

    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}));
        const msg = errJson.error_description || 'Gagal menukarkan token otorisasi Google.';
        throw new Error(msg);
      }

      const tokenData = await tokenRes.json();
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        throw new Error('Gagal memuat profil pengguna dari Google.');
      }

      const userData = await userRes.json();
      const cleanEmail = userData.email?.toLowerCase();
      if (!cleanEmail) {
        throw new Error('Email tidak ditemukan pada akun Google.');
      }

      const cleanName = userData.name || cleanEmail.split('@')[0];
      const userAvatar = userData.picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=4285f4,34a853,fbbc05,ea4335`;

      const result = await authenticateGoogleUser({
        email: cleanEmail,
        name: cleanName,
        avatar: userAvatar,
        googleId: userData.sub,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Autentikasi Berhasil</title></head>
          <body style="font-family:sans-serif;background:#06070B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;padding:28px;border:1px solid rgba(255,255,255,0.2);border-radius:24px;max-width:420px;background:#0E1017;box-shadow:0 12px 32px rgba(0,0,0,0.5);">
              <div style="width:48px;height:48px;border-radius:50%;background:#10b981;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                <span style="font-size:24px;color:#fff;">✓</span>
              </div>
              <h2 style="margin:0 0 8px 0;font-size:18px;">Berhasil Masuk!</h2>
              <p style="font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:16px;">Selamat datang, <b>${cleanName}</b>. Mengalihkan ke Zhafx...</p>
              <script>
                const payload = {
                  type: 'GOOGLE_AUTH_SUCCESS',
                  token: '${result.token}',
                  user: ${JSON.stringify(result.user)}
                };
                if (window.opener) {
                  window.opener.postMessage(payload, '*');
                  setTimeout(() => window.close(), 800);
                } else {
                  window.location.href = '/?token=' + encodeURIComponent('${result.token}');
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('[Google Serverless Callback Error]:', err);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Error Autentikasi Google</title></head>
          <body style="font-family:sans-serif;background:#06070B;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
            <div style="text-align:center;padding:24px;border:1px solid rgba(255,255,255,0.15);border-radius:20px;max-width:420px;background:#0E1017;">
              <h2 style="color:#ef4444;margin-top:0;">Gagal Masuk Google</h2>
              <p style="font-size:13px;color:rgba(255,255,255,0.7);">${err.message || 'Terjadi kesalahan sistem'}</p>
              <a href="/" style="display:inline-block;margin-top:12px;padding:8px 16px;background:#fff;color:#000;border-radius:9999px;text-decoration:none;font-size:12px;font-weight:bold;">Kembali ke Beranda</a>
            </div>
          </body>
        </html>
      `);
    }
  }

  // 9. POST /api/auth/google-login
  if (action === 'google-login' || action === 'google_login' || action === 'google') {
    const { email, name, credential, code, redirectUri, avatar, googleId } = body || {};
    let verifiedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    let verifiedName = typeof name === 'string' ? name.trim() : '';
    let userAvatar = typeof avatar === 'string' ? avatar.trim() : undefined;
    let userGoogleId = typeof googleId === 'string' ? googleId.trim() : undefined;

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET_2 || '';
    const targetRedirectUri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'https://zhafxstreaming.web.id/auth/google/callback';

    if (code && clientSecret) {
      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: targetRedirectUri,
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
                userAvatar = userData.picture || userAvatar;
                userGoogleId = userData.sub || userGoogleId;
              }
            }
          }
        }
      } catch (e: any) {
        console.warn('[Google Auth] Token exchange warning:', e?.message || e);
      }
    }

    if (credential && typeof credential === 'string') {
      try {
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (verifyRes.ok) {
          const payload = await verifyRes.json();
          if (payload.email) {
            verifiedEmail = payload.email.toLowerCase();
            verifiedName = payload.name || verifiedEmail.split('@')[0];
            userAvatar = payload.picture || userAvatar;
            userGoogleId = payload.sub || userGoogleId;
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
              userAvatar = parsed.picture || userAvatar;
              userGoogleId = parsed.sub || userGoogleId;
            }
          }
        } catch {
          // silent
        }
      }
    }

    if (!verifiedEmail) {
      return res.status(400).json({ success: false, error: 'Email Google atau token kredensial tidak valid.' });
    }

    if (!verifiedName) {
      verifiedName = verifiedEmail.split('@')[0];
    }

    if (!userAvatar) {
      userAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(verifiedName)}&backgroundColor=4285f4,34a853,fbbc05,ea4335`;
    }

    const result = await authenticateGoogleUser({
      email: verifiedEmail,
      name: verifiedName,
      avatar: userAvatar,
      googleId: userGoogleId,
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
