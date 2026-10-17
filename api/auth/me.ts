export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Token autentikasi tidak ditemukan.' });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: 'usr_active',
      name: 'Pengguna Zhafx',
      email: 'user@zhafx.app',
      joinedAt: Date.now(),
    },
  });
}
