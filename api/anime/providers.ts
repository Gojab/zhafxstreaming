export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const backends = ['https://api.framextv.tech', 'https://api.framextv.xyz'];

  for (const backend of backends) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const upstreamRes = await fetch(`${backend}/anime/api/providers`, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
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

  // Fallback providers catalog
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
