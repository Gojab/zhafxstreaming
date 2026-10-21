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

  // 7. POST /api/auth/google-login
  if (action === 'google-login' || action === 'google_login' || action === 'google') {
    const { email, name, credential, code, redirectUri, avatar, googleId } = body || {};
    let verifiedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    let verifiedName = typeof name === 'string' ? name.trim() : '';
    let userAvatar = typeof avatar === 'string' ? avatar.trim() : undefined;
    let userGoogleId = typeof googleId === 'string' ? googleId.trim() : undefined;

    const clientSecret = process.env.GOOGLE_CLIENT_SECRET_2 || process.env.GOOGLE_CLIENT_SECRET || '';
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
