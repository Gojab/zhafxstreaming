export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl = req.query?.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    return res.send('WEBVTT\n\n');
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://framextv.xyz/',
      },
    });

    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');

    if (!upstreamRes.ok) {
      return res.send('WEBVTT\n\n');
    }

    const text = await upstreamRes.text();

    if (text.startsWith('WEBVTT')) {
      return res.send(text);
    }

    // Convert SRT to WebVTT
    let vtt = 'WEBVTT\n\n' + text.trim();
    vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    return res.send(vtt);
  } catch (err: any) {
    console.error('[Anime Subtitles Error]:', err?.message || err);
    res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
    return res.send('WEBVTT\n\n');
  }
}
