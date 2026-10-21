export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const text = (req.query?.text as string) || req.body?.text;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'Teks wajib diisi.' });
  }

  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return res.status(200).json({ success: true, translated: trimmed });
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(trimmed)}`;
    const upstreamRes = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (upstreamRes.ok) {
      const data = await upstreamRes.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: any) => item[0] || '').join('').trim();
        if (translated) {
          return res.status(200).json({ success: true, translated });
        }
      }
    }
  } catch (err: any) {
    console.warn('[Translate Serverless Error]:', err?.message || err);
  }

  return res.status(200).json({ success: true, translated: trimmed });
}
