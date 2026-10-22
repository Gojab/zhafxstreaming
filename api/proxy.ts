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

  const isPost = req.method === 'POST';
  const isFrameX = targetUrl.includes('framextv.cc') || targetUrl.includes('framextv.tech') || targetUrl.includes('framextv.xyz');

  // Candidate URLs with auto-failover to .cc
  const candidateUrls = [targetUrl];
  if (targetUrl.includes('framextv.tech')) {
    candidateUrls.push(targetUrl.replace('framextv.tech', 'framextv.cc'));
  } else if (targetUrl.includes('framextv.xyz')) {
    candidateUrls.push(targetUrl.replace('framextv.xyz', 'framextv.cc'));
  }

  for (const candidate of candidateUrls) {
    try {
      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...(isFrameX
          ? {
              'Referer': 'https://framextv.cc/',
              'Origin': 'https://framextv.cc',
            }
          : {}),
        ...(isPost ? { 'Content-Type': 'application/json' } : {}),
      };

      const fetchOptions: RequestInit = {
        method: req.method,
        signal: controller.signal,
        headers,
        ...(isPost && req.body
          ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body) }
          : {}),
      };

      const upstreamRes = await fetch(candidate, fetchOptions);

      // If upstream is 502/503/504 and we have another candidate, try the next
      if (upstreamRes.status >= 500 && candidateUrls.indexOf(candidate) < candidateUrls.length - 1) {
        continue;
      }

      clearTimeout(timeoutId);
      const contentType = upstreamRes.headers.get('content-type') || 'application/json';
      res.setHeader('Content-Type', contentType);
      res.status(upstreamRes.status);

      const body = await upstreamRes.text();
      return res.send(body);
    } catch {
      // Try next candidate
    }
  }

  clearTimeout(timeoutId);
  return res.status(502).json({
    error: 'Gagal menghubungi server hulu.',
    details: 'Semua server FrameX (xyz & tech) telah dicoba.',
  });
}
