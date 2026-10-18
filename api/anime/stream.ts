export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const id = req.query?.id as string;
  const episode = req.query?.episode ? String(req.query.episode) : '1';
  const provider = (req.query?.provider as string) || '';
  const audio = (req.query?.audio as string) || 'sub';

  if (!id) {
    return res.status(400).json({ success: false, error: 'ID anime wajib diisi.' });
  }

  const priorityList =
    audio === 'dub'
      ? ['grand_warden_dub', 'wizard_dub', 'valkyrie_dub', 'archer_dub', 'dragon_dub']
      : ['grand_warden', 'wizard', 'valkyrie', 'super_pekka', 'dragon', 'archer', 'giant'];

  const providersToAttempt: string[] = [];
  if (provider && provider !== 'auto' && provider !== 'direct_stream') {
    providersToAttempt.push(provider);
  }
  for (const p of priorityList) {
    if (!providersToAttempt.includes(p)) {
      providersToAttempt.push(p);
    }
  }

  const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];
  let finalData: any = null;
  let lastError: string = '';

  for (const p of providersToAttempt) {
    for (const backend of backends) {
      try {
        const q = new URLSearchParams();
        q.set('id', id);
        q.set('episode', episode);
        q.set('provider', p);
        q.set('audio', audio);

        const targetUrl = `${backend}/anime/api/stream?${q.toString()}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7000);

        const upstreamRes = await fetch(targetUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://framextv.xyz/',
            'Origin': 'https://framextv.xyz',
            'Accept': 'application/json, text/plain, */*',
          },
        });
        clearTimeout(timeoutId);

        if (!upstreamRes.ok) continue;

        const data = await upstreamRes.json();
        if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
          finalData = data;
          break;
        }
      } catch (err: any) {
        lastError = err?.message || 'Error fetching provider';
      }
    }
    if (finalData) break;
  }

  if (!finalData) {
    return res.status(404).json({
      success: false,
      error: `Stream anime tidak tersedia untuk episode ${episode}. ${lastError}`.trim(),
    });
  }

  // Rewrite sources to proxy through /api/anime/proxy
  const rewrittenSources = finalData.sources.map((src: any) => {
    let rawUrl = src.url || '';
    let referer = src.headers?.Referer || src.headers?.referer || 'https://megaplay.buzz/';

    if (rawUrl.includes('/proxy?url=') || rawUrl.includes('url=')) {
      try {
        const parsedUrl = new URL(
          rawUrl.startsWith('http') ? rawUrl : `https://api.framextv.tech${rawUrl}`
        );
        const realTarget = parsedUrl.searchParams.get('url');
        const extractedRef = parsedUrl.searchParams.get('ref');
        if (realTarget) rawUrl = realTarget;
        if (extractedRef) referer = extractedRef;
      } catch {
        // use rawUrl
      }
    } else if (rawUrl.startsWith('/')) {
      rawUrl = `https://api.framextv.tech${rawUrl}`;
    }

    const proxiedUrl = `/api/anime/proxy?url=${encodeURIComponent(rawUrl)}&ref=${encodeURIComponent(referer)}`;

    return {
      ...src,
      url: proxiedUrl,
      rawUrl,
      headers: {
        Referer: referer,
        Origin: referer ? new URL(referer).origin : 'https://megaplay.buzz',
      },
    };
  });

  // Rewrite subtitles to proxy through /api/anime/subtitles with WebVTT auto-conversion
  const rewrittenSubtitles = Array.isArray(finalData.subtitles)
    ? finalData.subtitles.map((sub: any) => {
        let subUrl = sub.url || '';
        if (subUrl.includes('url=')) {
          try {
            const parsed = new URL(
              subUrl.startsWith('http') ? subUrl : `https://api.framextv.tech${subUrl}`
            );
            const real = parsed.searchParams.get('url');
            if (real) subUrl = real;
          } catch {
            // keep
          }
        } else if (subUrl.startsWith('/')) {
          subUrl = `https://api.framextv.tech${subUrl}`;
        }

        const proxiedSubUrl = `/api/anime/subtitles?url=${encodeURIComponent(subUrl)}&lang=${encodeURIComponent(
          sub.lang || ''
        )}&label=${encodeURIComponent(sub.label || '')}`;

        return {
          ...sub,
          url: proxiedSubUrl,
          rawUrl: subUrl,
        };
      })
    : [];

  return res.status(200).json({
    success: true,
    provider: finalData.provider,
    server: finalData.server,
    audio: finalData.audio || audio,
    sources: rewrittenSources,
    subtitles: rewrittenSubtitles,
    meta: finalData.meta,
  });
}
