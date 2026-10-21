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
    const isFrameX = targetUrl.includes('framextv.tech') || targetUrl.includes('framextv.xyz');
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      ...(isFrameX ? {
        'Referer': 'https://framextv.xyz/',
        'Origin': 'https://framextv.xyz',
      } : {}),
      ...(isPost ? { 'Content-Type': 'application/json' } : {}),
    };

    const fetchOptions: RequestInit = {
      method: req.method,
      signal: controller.signal,
      headers,
      ...(isPost && req.body ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body) } : {}),
    };

    let upstreamRes = await fetch(targetUrl, fetchOptions);

    // FrameX may return 403 from one hostname while the alternate origin is healthy.
    if (!upstreamRes.ok && isFrameX && (upstreamRes.status === 403 || upstreamRes.status === 404)) {
      const alternateUrl = targetUrl.includes('api.framextv.tech')
        ? targetUrl.replace('api.framextv.tech', 'api.framextv.xyz')
        : targetUrl.replace('api.framextv.xyz', 'api.framextv.tech');
      upstreamRes = await fetch(alternateUrl, fetchOptions);
    }

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
