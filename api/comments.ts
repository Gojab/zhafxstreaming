import crypto from 'crypto';
import { readAuthDb, writeAuthDb } from '../server/authService.ts';

// In-memory fallback for serverless environments
let inMemoryComments: any[] = [];

function getUserInfoFromAuth(authHeader: string | undefined): { userId: string; userName: string } | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token) return null;

  try {
    const db = readAuthDb();
    const session = (db.sessions || []).find((s: any) => s.token === token && s.expiresAt > Date.now());
    if (session) {
      const user = (db.users || []).find((u: any) => u.id === session.userId);
      return {
        userId: session.userId,
        userName: user?.name || user?.username || user?.email || 'Pengguna',
      };
    }
  } catch {}

  // Parse JWT token (Supabase or Google token)
  if (token.includes('.')) {
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf-8');
        const payload = JSON.parse(payloadStr);
        if (payload && (payload.sub || payload.email)) {
          const userId = payload.sub || `usr_${payload.email}`;
          const userName =
            payload.user_metadata?.name ||
            payload.user_metadata?.full_name ||
            payload.name ||
            (payload.email ? payload.email.split('@')[0] : 'Pengguna');
          return { userId, userName };
        }
      }
    } catch {}
  }

  return null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. GET /api/comments?contentId=...
  if (req.method === 'GET') {
    const contentId = String(req.query?.contentId || '').trim();
    if (!contentId) {
      return res.status(400).json({ success: false, error: 'contentId wajib diisi.', comments: [] });
    }

    try {
      const db = readAuthDb();
      const dbComments = Array.isArray(db.comments) ? db.comments : [];
      const allComments = [...inMemoryComments, ...dbComments];
      
      const filtered = allComments.filter((c: any) => String(c.contentId) === contentId);
      const uniqueComments = Array.from(new Map(filtered.map((c: any) => [c.id, c])).values());
      uniqueComments.sort((a: any, b: any) => b.createdAt - a.createdAt);

      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ success: true, comments: uniqueComments });
    } catch (err: any) {
      console.warn('[Serverless Comments GET Error]:', err);
      const filtered = inMemoryComments.filter((c: any) => String(c.contentId) === contentId);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ success: true, comments: filtered });
    }
  }

  // 2. POST /api/comments
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
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

    const { contentId, mediaType, text, rating, userName: clientUserName, userId: clientUserId } = body || {};
    const cleanText = typeof text === 'string' ? text.trim().slice(0, 1000) : '';
    const numericRating = rating === undefined || rating === null || rating === '' ? undefined : Number(rating);

    if (!contentId || (!cleanText && numericRating === undefined)) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ success: false, error: 'Komentar atau rating wajib diisi.' });
    }

    if (numericRating !== undefined && (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5)) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ success: false, error: 'Rating harus antara 1 sampai 5.' });
    }

    const authHeader = req.headers?.authorization;
    const authUser = getUserInfoFromAuth(authHeader);

    const userId = authUser?.userId || clientUserId || `usr_guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userName = authUser?.userName || (typeof clientUserName === 'string' && clientUserName.trim() ? clientUserName.trim().slice(0, 50) : 'Penonton');

    const comment = {
      id: crypto.randomUUID ? crypto.randomUUID() : `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      contentId: String(contentId),
      mediaType: String(mediaType || 'movie'),
      userId,
      userName,
      text: cleanText || undefined,
      rating: numericRating,
      createdAt: Date.now(),
      isVerified: Boolean(authUser),
    };

    inMemoryComments.unshift(comment);
    if (inMemoryComments.length > 2000) inMemoryComments.length = 2000;

    try {
      const db = readAuthDb();
      db.comments = [comment, ...(db.comments || [])].slice(0, 5000);
      writeAuthDb(db);
    } catch (err: any) {
      console.warn('[Serverless Comments Save Warning]:', err?.message);
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json({ success: true, comment });
  }

  // 3. DELETE /api/comments?id=...
  if (req.method === 'DELETE') {
    const commentId = String(req.query?.id || '').trim();
    if (!commentId) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ success: false, error: 'ID komentar wajib diberikan.' });
    }

    const authHeader = req.headers?.authorization;
    const authUser = getUserInfoFromAuth(authHeader);
    const clientUserId = String(req.query?.userId || '').trim();
    const currentUserId = authUser?.userId || clientUserId;

    try {
      const db = readAuthDb();
      const index = (db.comments || []).findIndex((c: any) => c.id === commentId);
      if (index !== -1) {
        const comment = db.comments[index];
        if (currentUserId && comment.userId && comment.userId !== currentUserId) {
          res.setHeader('Content-Type', 'application/json');
          return res.status(403).json({ success: false, error: 'Tidak memiliki izin untuk menghapus komentar ini.' });
        }
        db.comments.splice(index, 1);
        writeAuthDb(db);
      }
      inMemoryComments = inMemoryComments.filter((c) => c.id !== commentId);
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ success: true, message: 'Komentar berhasil dihapus.' });
    } catch (err: any) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({ success: false, error: err.message || 'Gagal menghapus komentar.' });
    }
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}
