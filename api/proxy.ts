export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = (req.query?.url as string) || (req.body?.targetUrl as string);
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const isPost = req.method === 'POST';
    const fetchOptions: RequestInit = {
      method: req.method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...(isPost ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(isPost && req.body ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body) } : {}),
    };

    const upstreamRes = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    const contentType = upstreamRes.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.status(upstreamRes.status);

    const body = await upstreamRes.text();
    return res.send(body);
  } catch (err: any) {
    clearTimeout(timeoutId);
    return res.status(502).json({
      error: 'Gagal menghubungi server hulu.',
      details: err?.name === 'AbortError' ? 'Koneksi timeout setelah 12 detik.' : (err?.message || 'Error jaringan'),
    });
  }
}
