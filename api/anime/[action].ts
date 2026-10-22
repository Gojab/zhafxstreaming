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
    return res.status(200).json({
      providers: [
        { id: 'grand_warden', name: 'Grand Warden XI', tagline: 'Multi-Source Cloud • 1080p Ultra Fast', audio: 'sub', category: 'anime', status: 'active' },
        { id: 'grand_warden_dub', name: 'Grand Warden XI (Dub)', tagline: 'Multi-Source Cloud Dub', audio: 'dub', category: 'anime', status: 'active' },
        { id: 'wizard', name: 'Wizard I', tagline: 'Dual Audio & Softsub • Ultra Fast', audio: 'sub', category: 'anime', status: 'active' },
        { id: 'wizard_dub', name: 'Wizard I (Dub)', tagline: 'Dual Audio & Softsub • Ultra Fast', audio: 'dub', category: 'anime', status: 'active' },
        { id: 'valkyrie', name: 'Valkyrie II', tagline: 'FlixCloud HD • Fast Stream', audio: 'sub', category: 'anime', status: 'active' },
        { id: 'valkyrie_dub', name: 'Valkyrie II (Dub)', tagline: 'FlixCloud Dub HD', audio: 'dub', category: 'anime', status: 'active' },
        { id: 'goblin', name: 'Goblin V', tagline: 'Direct Fast Auto Stream', audio: 'sub', category: 'anime', status: 'active' },
        { id: 'goblin_dub', name: 'Goblin V (Dub)', tagline: 'Direct Fast Auto Stream Dub', audio: 'dub', category: 'anime', status: 'active' },
        { id: 'giant', name: 'Giant IX', tagline: 'Ultra High Speed Cloud Server', audio: 'sub', category: 'anime', status: 'active' },
        { id: 'super_pekka', name: 'Super PEKKA X', tagline: '1080p Ultra High Bitrate', audio: 'sub', category: 'anime', status: 'active' },
      ],
    });
  }

  // Helper: Query FrameX API directly to resolve anime title or ID (Strictly https://framextv.cc, no AniList)
  const resolveAnimeId = async (targetId: string, searchTitle?: string): Promise<string | null> => {
    const searchKey = searchTitle || (isNaN(Number(targetId)) ? targetId : null);
    if (!searchKey) return targetId ? String(targetId) : null;
    const backends = ['https://api.framextv.cc'];
    for (const backend of backends) {
      try {
        const r = await fetch(`${backend}/api/search?q=${encodeURIComponent(searchKey)}&type=anime`, {
          signal: AbortSignal.timeout(3000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Referer': 'https://framextv.cc/',
            'Origin': 'https://framextv.cc',
          },
        });
        if (r.ok) {
          const d = await r.json();
          const items = Array.isArray(d) ? d : (d?.results || d?.titles || []);
          if (items.length > 0 && items[0]?.id) {
            return String(items[0].id);
          }
        }
      } catch {}
    }
    return targetId ? String(targetId) : null;
  };

  // Helper: Probe single upstream provider
  const probeSingleProvider = async (
    backend: string,
    targetId: string,
    episode: string,
    prov: string,
    audio: string,
    timeoutMs = 3500
  ): Promise<any> => {
    const q = new URLSearchParams();
    q.set('id', targetId);
    q.set('episode', episode);
    q.set('provider', prov);
    q.set('audio', audio);

    const targetUrl = `${backend}/anime/api/stream?${q.toString()}`;
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://framextv.cc/',
        'Origin': 'https://framextv.cc',
        'Accept': 'application/json, text/plain, */*',
      },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && data.success && Array.isArray(data.sources) && data.sources.length > 0) {
      return { ...data, provider: data.provider || prov };
    }
    throw new Error('No sources found');
  };

  // Helper: Cascading fast parallel probe across priority servers
  const probeMultiProviders = async (
    targetId: string,
    episode: string,
    audio: string,
    preferredProvider?: string
  ): Promise<any> => {
    const backends = ['https://api.framextv.cc'];
    const priorityList = audio === 'dub'
      ? ['grand_warden_dub', 'wizard_dub', 'valkyrie_dub', 'goblin_dub', 'dragon_dub', 'archer_dub']
      : ['grand_warden', 'wizard', 'super_pekka', 'giant', 'valkyrie', 'goblin', 'dragon', 'archer'];

    // 1. Try specifically selected provider first
    if (preferredProvider && preferredProvider !== 'auto' && preferredProvider !== 'direct_stream') {
      for (const b of backends) {
        try {
          const directData = await probeSingleProvider(b, targetId, episode, preferredProvider, audio, 3800);
          if (directData) return directData;
        } catch {}
      }
    }

    // 2. Cascading Fast Parallel Probe across candidate servers in chunks of 2
    const candidateList = priorityList.filter(p => p !== preferredProvider);
    for (let i = 0; i < candidateList.length; i += 2) {
      const chunk = candidateList.slice(i, i + 2);
      try {
        const winner = await Promise.any(
          chunk.map(p => probeSingleProvider(backends[0], targetId, episode, p, audio, 3500))
        );
        if (winner) return winner;
      } catch {
        // Chunk failed, continue to next pair
      }
    }

    // 3. Fallback to secondary backend
    for (const p of candidateList.slice(0, 3)) {
      try {
        const winner = await probeSingleProvider(backends[1], targetId, episode, p, audio, 3500);
        if (winner) return winner;
      } catch {}
    }

    return null;
  };

  // 2. GET /api/anime/stream
  if (action === 'stream') {
    const id = req.query?.id as string;
    const episode = req.query?.episode ? String(req.query.episode) : '1';
    const provider = (req.query?.provider as string) || '';
    const audio = (req.query?.audio as string) || 'sub';
    const title = (req.query?.title as string) || '';

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID anime wajib diisi.' });
    }

    const epNum = parseInt(episode, 10) || 1;

    // FrameX Multi-Provider Anime Stream Probe (Grand Warden, Wizard, Valkyrie, etc.)
    let finalData = await probeMultiProviders(id, episode, audio, provider);

    // Phase 3: If no sources found with raw ID, attempt AniList ID resolution via title or non-numeric ID
    if (!finalData) {
      const resolvedId = await resolveAnimeId(id, title);
      if (resolvedId && resolvedId !== id) {
        finalData = await probeMultiProviders(resolvedId, episode, audio, provider);
      }
    }

    if (!finalData) {
      return res.status(404).json({
        success: false,
        error: `Stream anime tidak tersedia untuk episode ${episode}. Semua server FrameX telah dicoba.`.trim(),
      });
    }

    const actualProvider = finalData.provider || provider || 'grand_warden';
    const fallbackApplied = provider && provider !== 'auto' && provider !== actualProvider;

    // Provide local proxied HLS stream (direct from FrameX API to our web app) with direct CDN fallback
    const rewrittenSources = finalData.sources.map((src: any) => {
      let rawUrl = src.url || '';
      const referer = src.headers?.Referer || src.headers?.referer || 'https://megaplay.buzz/';

      let directUrl = rawUrl;
      if (directUrl.startsWith('/')) {
        directUrl = `https://api.framextv.cc${directUrl}`;
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
            subUrl = `https://api.framextv.cc${subUrl}`;
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
    let referer = (req.query?.ref as string) || 'https://megaplay.buzz/';
    if (
      targetUrl &&
      (targetUrl.includes('odcloud') ||
        targetUrl.includes('desustream') ||
        targetUrl.includes('otakudesu') ||
        targetUrl.includes('anoboy'))
    ) {
      referer = 'https://otakudesu.blog/';
    }

    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'URL target tidak valid.' });
    }

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

    const candidates: Array<{ url: string; headers: Record<string, string> }> = [
      { url: targetUrl, headers: reqHeaders },
      {
        url: `https://api.framextv.cc/anime/api/proxy?url=${encodeURIComponent(targetUrl)}&ref=${encodeURIComponent(referer)}`,
        headers: {
          'User-Agent': reqHeaders['User-Agent'],
          'Referer': 'https://framextv.cc/',
          'Origin': 'https://framextv.cc',
          'Accept': '*/*',
          ...(req.headers?.range ? { 'Range': req.headers.range } : {}),
        },
      },
    ];

    let upstreamRes: any = null;
    const isM3u8Candidate = targetUrl.includes('.m3u8');
    const timeoutMs = isM3u8Candidate ? 5500 : 9000;

    for (const cand of candidates) {
      if (req.destroyed || res.writableEnded) return;
      try {
        const r = await fetch(cand.url, {
          method: req.method === 'HEAD' ? 'HEAD' : 'GET',
          headers: cand.headers,
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (r.ok || r.status === 206) {
          upstreamRes = r;
          break;
        }
      } catch {}
    }

    if (!upstreamRes) {
      if (!res.headersSent && !res.writableEnded) {
        return res.status(504).json({ error: 'Stream anime dialihkan ke pemutar embed.' });
      }
      return;
    }

    try {
      const contentType = upstreamRes.headers.get('content-type') || '';
      const isM3u8 =
        contentType.includes('mpegurl') ||
        contentType.includes('application/x-mpegurl') ||
        targetUrl.includes('.m3u8');

      if (isM3u8) {
        const text = await upstreamRes.text();
        if (text.includes('#EXTM3U')) {
          const lines = text.split('\n');
          const rewritten = lines.map((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return line;
            if (trimmed.startsWith('#')) {
              return line.replace(/URI=["']([^"']+)["']/g, (_match: string, uri: string) => {
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
        const { Readable, pipeline } = await import('stream');
        // @ts-ignore
        const nodeStream = Readable.fromWeb(upstreamRes.body);
        pipeline(nodeStream, res, () => {});
      } else {
        res.end();
      }
      return;
    } catch (err: any) {
      if (!res.headersSent && !res.writableEnded) {
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
          'Referer': 'https://framextv.cc/',
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
