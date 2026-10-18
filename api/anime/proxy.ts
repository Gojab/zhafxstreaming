import { Readable } from 'stream';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = (req.query?.url as string);
  const referer = (req.query?.ref as string) || 'https://megaplay.buzz/';

  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'URL target tidak valid.' });
  }

  try {
    const origin = referer ? new URL(referer).origin : 'https://megaplay.buzz';
    const reqHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': referer,
      'Origin': origin,
      'Accept': '*/*',
    };
    if (req.headers?.range) {
      reqHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: reqHeaders,
    });

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      targetUrl.includes('.m3u8');

    if (isM3u8) {
      const text = await upstreamRes.text();
      if (text.includes('#EXTM3U')) {
        const lines = text.split('\n');
        const rewritten = lines.map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith('#')) {
            // Rewrite URI="..." in #EXT-X-KEY or #EXT-X-MAP
            return line.replace(/URI=["']([^"']+)["']/g, (_match, uri) => {
              try {
                const absUrl = new URL(uri, targetUrl).href;
                return `URI="/api/anime/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(referer)}"`;
              } catch {
                return line;
              }
            });
          }
          // Segment or variant m3u8 line
          try {
            const absUrl = new URL(trimmed, targetUrl).href;
            return `/api/anime/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(referer)}`;
          } catch {
            return line;
          }
        });

        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.status(upstreamRes.status);
        return res.send(rewritten.join('\n'));
      }
    }

    // Binary segment or direct stream
    if (upstreamRes.headers.get('content-length')) {
      res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
    }
    if (upstreamRes.headers.get('content-range')) {
      res.setHeader('Content-Range', upstreamRes.headers.get('content-range')!);
    }
    if (upstreamRes.headers.get('accept-ranges')) {
      res.setHeader('Accept-Ranges', upstreamRes.headers.get('accept-ranges')!);
    }
    res.setHeader('Content-Type', contentType || 'video/MP2T');
    res.status(upstreamRes.status);

    if (upstreamRes.body) {
      if (typeof (Readable as any).fromWeb === 'function') {
        // @ts-ignore
        (Readable as any).fromWeb(upstreamRes.body).pipe(res);
      } else {
        const arrayBuffer = await upstreamRes.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
      }
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error('[Anime Proxy Error]:', err?.message || err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Gagal memuat stream video anime.' });
    }
  }
}
