export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Range');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extract action from query or URL path
  const queryAction = req.query?.action;
  const actionFromQuery = Array.isArray(queryAction) ? queryAction[0] : queryAction;
  const actionFromUrl = req.url?.split('?')[0].split('/').filter(Boolean).pop();
  const action = (actionFromQuery || actionFromUrl || '').toLowerCase();

  // 1. GET /api/anime/providers
  if (action === 'providers') {
    const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];
    for (const backend of backends) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const upstreamRes = await fetch(`${backend}/anime/api/providers`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://framextv.xyz/',
            'Origin': 'https://framextv.xyz',
          },
        });
        clearTimeout(timeoutId);

        if (upstreamRes.ok) {
          const data = await upstreamRes.json();
          if (data && Array.isArray(data.providers)) {
            data.providers = data.providers.map((p: any, idx: number) => ({
              ...p,
              name: `ZHAFX ENTITY ${String(idx + 1).padStart(3, '0')}`,
            }));
            return res.status(200).json(data);
          }
          return res.status(200).json(data);
        }
      } catch {
        // try next backend
      }
    }

    return res.status(200).json({
      providers: [
        { id: 'grand_warden', name: 'ZHAFX ENTITY 001', tagline: '1080p Ultra Fast Multi-Source Cloud', audio: 'sub', category: 'anime' },
        { id: 'grand_warden_dub', name: 'ZHAFX ENTITY 002', tagline: 'Multi-Source Cloud Dub', audio: 'dub', category: 'anime' },
        { id: 'wizard', name: 'ZHAFX ENTITY 003', tagline: 'Dual Audio & Softsub', audio: 'sub', category: 'anime' },
        { id: 'wizard_dub', name: 'ZHAFX ENTITY 004', tagline: 'Dual Audio English Dub', audio: 'dub', category: 'anime' },
        { id: 'valkyrie', name: 'ZHAFX ENTITY 005', tagline: 'FlixCloud HD', audio: 'sub', category: 'anime' },
        { id: 'valkyrie_dub', name: 'ZHAFX ENTITY 006', tagline: 'FlixCloud HD Dub', audio: 'dub', category: 'anime' },
        { id: 'super_pekka', name: 'ZHAFX ENTITY 007', tagline: 'Direct Fast CDN', audio: 'sub', category: 'anime' },
        { id: 'dragon', name: 'ZHAFX ENTITY 008', tagline: 'VidNest Multi-Source', audio: 'sub', category: 'anime' },
        { id: 'archer', name: 'ZHAFX ENTITY 009', tagline: 'Multi-Audio', audio: 'sub', category: 'anime' },
        { id: 'giant', name: 'ZHAFX ENTITY 010', tagline: 'High Bitrate HD Stream', audio: 'sub', category: 'anime' },
      ],
    });
  }

  // 2. GET /api/anime/stream
  if (action === 'stream') {
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
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

    // Provide local proxied HLS stream (direct from FrameX API to our web app) with direct CDN fallback
    const rewrittenSources = finalData.sources.map((src: any) => {
      let rawUrl = src.url || '';
      const referer = src.headers?.Referer || src.headers?.referer || 'https://megaplay.buzz/';

      let directUrl = rawUrl;
      if (directUrl.startsWith('/')) {
        directUrl = `https://api.framextv.tech${directUrl}`;
      }

      const proxiedUrl = `/api/anime/proxy?url=${encodeURIComponent(directUrl)}&ref=${encodeURIComponent(referer)}`;

      return {
        ...src,
        url: proxiedUrl, // Primary stream URL goes directly through our web app proxy
        directUrl,
        proxiedUrl,
        rawUrl: directUrl,
        headers: {
          Referer: referer,
          Origin: referer ? new URL(referer).origin : 'https://megaplay.buzz',
        },
      };
    });

    // Resolve subtitles to local converted WebVTT with direct CDN fallback
    const rewrittenSubtitles = Array.isArray(finalData.subtitles)
      ? finalData.subtitles.map((sub: any) => {
          let subUrl = sub.url || '';
          if (subUrl.startsWith('/')) {
            subUrl = `https://api.framextv.tech${subUrl}`;
          }

          const proxiedSubUrl = `/api/anime/subtitles?url=${encodeURIComponent(subUrl)}&lang=${encodeURIComponent(sub.lang || '')}&label=${encodeURIComponent(sub.label || '')}`;

          return {
            ...sub,
            url: proxiedSubUrl, // Primary subtitle URL converted to WebVTT
            directUrl: subUrl,
            proxiedUrl: proxiedSubUrl,
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

  // 3. ALL /api/anime/proxy
  if (action === 'proxy') {
    const targetUrl = req.query?.url as string;
    const referer = (req.query?.ref as string) || 'https://megaplay.buzz/';

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'URL target tidak valid.' });
    }

    try {
      const origin = referer ? new URL(referer).origin : 'https://megaplay.buzz';
      const reqHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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
              return line.replace(/URI=["']([^"']+)["']/g, (_match, uri) => {
                try {
                  const absUrl = new URL(uri, targetUrl).href;
                  return `URI="/api/anime/proxy?url=${encodeURIComponent(absUrl)}&ref=${encodeURIComponent(referer)}"`;
                } catch {
                  return line;
                }
              });
            }
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

      if (upstreamRes.headers.get('content-length')) {
        res.setHeader('Content-Length', upstreamRes.headers.get('content-length')!);
      }
      if (upstreamRes.headers.get('content-range')) {
        res.setHeader('Content-Range', upstreamRes.headers.get('content-range')!);
      }
      const finalContentType = (contentType && (contentType.includes('mp4') || contentType.includes('webm')))
        ? contentType
        : 'video/MP2T';
      res.setHeader('Content-Type', finalContentType);
      res.status(upstreamRes.status);

      if (upstreamRes.body) {
        const { Readable } = await import('stream');
        // @ts-ignore
        Readable.fromWeb(upstreamRes.body).pipe(res);
      } else {
        res.end();
      }
      return;
    } catch (err: any) {
      if (!res.headersSent) {
        return res.status(502).json({ error: 'Gagal memuat stream video anime.' });
      }
      return;
    }
  }

  // 4. GET /api/anime/subtitles
  if (action === 'subtitles') {
    const targetUrl = req.query?.url as string;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      return res.send('WEBVTT\n\n');
    }

    try {
      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

      let vtt = 'WEBVTT\n\n' + text.trim();
      vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      return res.send(vtt);
    } catch {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      return res.send('WEBVTT\n\n');
    }
  }

  return res.status(404).json({ error: `Action '${action}' tidak ditemukan.` });
}
