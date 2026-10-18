// In-memory fallback for Vercel Serverless environment
const inMemoryProgress: any[] = [];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers?.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : null;
  const userId = token ? `user_${token.slice(0, 10)}` : 'guest_user';

  if (req.method === 'GET') {
    const { contentId, season, episode } = req.query || {};
    let records = inMemoryProgress.filter((r) => r.userId === userId);

    if (contentId) {
      records = records.filter((r) => r.contentId === String(contentId));
      if (season !== undefined) records = records.filter((r) => r.season === Number(season));
      if (episode !== undefined) records = records.filter((r) => r.episode === Number(episode));
    } else {
      records = records.filter((r) => !r.completed && r.currentTime > 5);
    }

    records.sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);
    return res.status(200).json({ success: true, progress: records });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const {
      contentId,
      episodeId,
      mediaType,
      title,
      poster,
      backdrop,
      year,
      season,
      episode,
      episodeName,
      currentTime,
      duration,
      completed,
    } = body;

    if (!contentId) {
      return res.status(400).json({ success: false, error: 'contentId wajib disertakan.' });
    }

    const validDuration = Math.max(1, Math.round(Number(duration) || 1));
    const validCurrentTime = Math.max(0, Math.min(validDuration, Math.round(Number(currentTime) || 0)));
    const progressPercentage = Math.min(100, Math.max(0, Math.round((validCurrentTime / validDuration) * 100)));

    const sNum = season !== undefined ? Number(season) : undefined;
    const epNum = episode !== undefined ? Number(episode) : undefined;
    const recordId = `${userId}_${contentId}_s${sNum ?? 1}_e${epNum ?? 1}`;

    const newRecord = {
      id: recordId,
      userId,
      contentId: String(contentId),
      episodeId: episodeId || (sNum || epNum ? `s${sNum || 1}_e${epNum || 1}` : undefined),
      mediaType: mediaType === 'tv' || mediaType === 'anime' ? mediaType : 'movie',
      title: String(title || 'Tayangan'),
      poster: String(poster || ''),
      backdrop: backdrop ? String(backdrop) : undefined,
      year: String(year || ''),
      season: sNum,
      episode: epNum,
      episodeName: episodeName ? String(episodeName) : undefined,
      currentTime: validCurrentTime,
      duration: validDuration,
      progressPercentage,
      lastWatchedAt: Date.now(),
      completed: Boolean(completed || progressPercentage >= 95),
    };

    const existingIdx = inMemoryProgress.findIndex((r) => r.id === recordId);
    if (existingIdx >= 0) {
      inMemoryProgress[existingIdx] = newRecord;
    } else {
      inMemoryProgress.push(newRecord);
    }

    return res.status(200).json({ success: true, record: newRecord });
  }

  if (req.method === 'DELETE') {
    const { contentId } = req.query || {};
    const filtered = inMemoryProgress.filter((r) => !(r.userId === userId && r.contentId === String(contentId)));
    inMemoryProgress.length = 0;
    inMemoryProgress.push(...filtered);
    return res.status(200).json({ success: true, message: 'Item berhasil dihapus.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
