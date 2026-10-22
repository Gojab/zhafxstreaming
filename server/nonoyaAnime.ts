import * as cheerio from 'cheerio';

/**
 * Nonoya Anime Stream Engine
 * Ported from https://github.com/Argiiahm/nonoya-api
 * Specially designed for 100% Ad-Free, Anti-Popup Anime Playback in Zhafx
 */

const OTAKUDESU_BASE = 'https://otakudesu.blog/';
const ANOBOY_BASE = 'https://anoboy.be/';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// In-memory cache for fast repeat requests
const nonoyaMemoryCache = new Map<string, { data: any; expiry: number }>();

function getCache(key: string): any | null {
  const item = nonoyaMemoryCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
}

function setCache(key: string, data: any, ttlSec = 600) {
  nonoyaMemoryCache.set(key, {
    data,
    expiry: Date.now() + ttlSec * 1000,
  });
}

const extractSlug = (url: string): string => {
  if (!url) return '';
  try {
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
};

export interface NonoyaEpisodeStream {
  title: string;
  episodeNum: number;
  isDirect: boolean;
  directUrl?: string;
  streamType?: 'mp4' | 'hls' | 'embed';
  embedUrl?: string;
  backupEmbedUrls?: string[];
  servers: Array<{
    name: string;
    quality: string;
    isDefault?: boolean;
    directUrl?: string;
    embedUrl?: string;
    dataContent?: string;
  }>;
}

/**
 * Perform safe HTTP request with realistic browser headers
 */
async function fetchHtml(url: string, referer = OTAKUDESU_BASE, timeoutMs = 7000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': USER_AGENT,
        Referer: referer,
        Origin: referer ? new URL(referer).origin : 'https://otakudesu.blog',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'id,en-US;q=0.9,en;q=0.8',
      },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err: any) {
    console.warn(`[Nonoya API] fetchHtml failed for ${url}:`, err?.message || err);
  }
  return null;
}

/**
 * Search anime in Otakudesu
 */
export async function searchOtakudesu(keyword: string): Promise<Array<{ title: string; slug: string; url: string; thumb?: string }>> {
  const cacheKey = `otaku_search_${keyword.toLowerCase().trim()}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `${OTAKUDESU_BASE}?s=${encodeURIComponent(keyword)}&post_type=anime`;
  const html = await fetchHtml(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const results: Array<{ title: string; slug: string; url: string; thumb?: string }> = [];

  $('ul.chivsrc > li').each((_i, el) => {
    const a = $(el).find('h2 a');
    const href = a.attr('href') || '';
    const title = a.text().trim();
    const thumb = $(el).find('img').attr('src');
    if (href && title) {
      results.push({
        title,
        slug: extractSlug(href),
        url: href,
        thumb,
      });
    }
  });

  setCache(cacheKey, results, 300);
  return results;
}

/**
 * Fetch episode list from an Otakudesu anime page
 */
export async function getOtakudesuEpisodes(animeSlug: string): Promise<Array<{ title: string; slug: string; url: string }>> {
  const cacheKey = `otaku_eps_${animeSlug}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `${OTAKUDESU_BASE}anime/${animeSlug}/`;
  const html = await fetchHtml(url);
  if (!html) return [];

  const $ = cheerio.load(html);
  const episodes: Array<{ title: string; slug: string; url: string }> = [];

  // Match episode links
  $('a[href*="/episode/"]').each((_i, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).text().trim();
    if (href && title && !episodes.some((e) => e.url === href)) {
      episodes.push({
        title,
        slug: extractSlug(href),
        url: href,
      });
    }
  });

  setCache(cacheKey, episodes, 600);
  return episodes;
}

/**
 * Resolves Otakudesu mirror stream data-content into iframe URL
 */
export async function resolveOtakudesuServer(dataContent: string): Promise<string | null> {
  const cacheKey = `otaku_server_${dataContent}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const decoded = JSON.parse(Buffer.from(dataContent, 'base64').toString('utf-8'));
    const urlAjax = `${OTAKUDESU_BASE}wp-admin/admin-ajax.php`;

    // 1. Fetch Nonce
    const nonceBody = new URLSearchParams({
      action: 'aa1208d27f29ca340c92c66d1926f13f',
    }).toString();

    const nonceRes = await fetch(urlAjax, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': USER_AGENT,
        Referer: OTAKUDESU_BASE,
      },
      body: nonceBody,
      signal: AbortSignal.timeout(5000),
    });

    if (!nonceRes.ok) return null;
    const nonceJson = await nonceRes.json();
    const nonce = nonceJson?.data;
    if (!nonce) return null;

    // 2. Fetch Player Embed HTML with Nonce
    const playerBody = new URLSearchParams({
      action: '2a3505c93b0035d3f455df82bf976b84',
      nonce,
      id: String(decoded.id),
      i: String(decoded.i),
      q: String(decoded.q),
    }).toString();

    const playerRes = await fetch(urlAjax, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': USER_AGENT,
        Referer: OTAKUDESU_BASE,
      },
      body: playerBody,
      signal: AbortSignal.timeout(5000),
    });

    if (!playerRes.ok) return null;
    const playerJson = await playerRes.json();
    if (!playerJson?.data) return null;

    const htmlIframe = Buffer.from(playerJson.data, 'base64').toString('utf-8');
    const $ = cheerio.load(htmlIframe);
    const iframeSrc = $('iframe').attr('src');
    if (iframeSrc) {
      setCache(cacheKey, iframeSrc, 1800);
      return iframeSrc;
    }
  } catch (err: any) {
    console.warn('[Nonoya API] resolveOtakudesuServer error:', err?.message || err);
  }

  return null;
}

/**
 * Inspect an embed URL to extract direct media link (e.g. mp4, m3u8)
 * Desustream / ODCloud parser allows direct playback with 0 ads!
 */
export async function extractDirectMedia(embedUrl: string): Promise<string | null> {
  if (!embedUrl || !embedUrl.startsWith('http')) return null;

  // Direct video file already
  if (/\.(mp4|m3u8|webm)(\?|$)/i.test(embedUrl)) {
    return embedUrl;
  }

  const cacheKey = `direct_media_${embedUrl}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const html = await fetchHtml(embedUrl, OTAKUDESU_BASE, 5000);
    if (!html) return null;

    // 1. Look for <video> or <source src="...">
    const $ = cheerio.load(html);
    const videoSrc = $('video source').attr('src') || $('video').attr('src');
    if (videoSrc && /^https?:\/\//i.test(videoSrc)) {
      setCache(cacheKey, videoSrc, 3600);
      return videoSrc;
    }

    // 2. Regex for CDN video links in DesuStream / ODStream HTML
    const mp4Match = html.match(/https?:\/\/[^\s"'<>]+\.(mp4|m3u8)[^\s"'<>]*/i);
    if (mp4Match) {
      const found = mp4Match[0].replace(/\\/g, '');
      setCache(cacheKey, found, 3600);
      return found;
    }

    // 3. Match source in script tags
    const scriptSrcMatch = html.match(/(?:file|sources?|src)\s*:\s*["'](https?:\/\/[^"']+\.(mp4|m3u8)[^"']*)["']/i);
    if (scriptSrcMatch) {
      const found = scriptSrcMatch[1].replace(/\\/g, '');
      setCache(cacheKey, found, 3600);
      return found;
    }
  } catch (e: any) {
    console.warn('[Nonoya API] extractDirectMedia error:', e?.message || e);
  }

  return null;
}

/**
 * Scrape episode stream details from Otakudesu
 */
export async function getOtakudesuStream(episodeSlug: string): Promise<NonoyaEpisodeStream | null> {
  const cacheKey = `otaku_stream_${episodeSlug}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const url = `${OTAKUDESU_BASE}episode/${episodeSlug}/`;
  const html = await fetchHtml(url);
  if (!html) return null;

  const $ = cheerio.load(html);
  const title = $('.venutama h1').text().trim() || episodeSlug.replace(/-/g, ' ');
  const defaultIframe = $('.responsive-embed-stream iframe').attr('src') || $('iframe').attr('src');

  // Extract episode number from slug or title
  const epMatch = episodeSlug.match(/episode-(\d+)/i) || title.match(/episode\s*(\d+)/i);
  const episodeNum = epMatch ? parseInt(epMatch[1], 10) : 1;

  const servers: NonoyaEpisodeStream['servers'] = [];

  // Parse mirror servers
  const qualityList = ['360p', '480p', '720p', '1080p'];
  $('.mirrorstream ul').each((_i, ul) => {
    const className = $(ul).attr('class') || '';
    const qMatch = qualityList.find((q) => className.includes(`m${q}`));
    const quality = qMatch || '720p';

    $(ul).find('li a').each((_j, a) => {
      const name = $(a).text().trim();
      const dataContent = $(a).attr('data-content');
      const isDefault = $(a).attr('data-default') === 'true';

      if (name && dataContent) {
        servers.push({
          name: `${name.toUpperCase()} (${quality})`,
          quality,
          isDefault,
          dataContent,
        });
      }
    });
  });

  // Check if defaultIframe contains direct media
  let directMediaUrl: string | null = null;
  if (defaultIframe) {
    directMediaUrl = await extractDirectMedia(defaultIframe);
  }

  // If no direct media yet, try resolving the first default mirror server
  if (!directMediaUrl && servers.length > 0) {
    const candidate = servers.find((s) => s.isDefault) || servers[0];
    if (candidate?.dataContent) {
      const resolvedEmbed = await resolveOtakudesuServer(candidate.dataContent);
      if (resolvedEmbed) {
        candidate.embedUrl = resolvedEmbed;
        directMediaUrl = await extractDirectMedia(resolvedEmbed);
        if (directMediaUrl) {
          candidate.directUrl = directMediaUrl;
        }
      }
    }
  }

  const streamInfo: NonoyaEpisodeStream = {
    title,
    episodeNum,
    isDirect: Boolean(directMediaUrl),
    directUrl: directMediaUrl || undefined,
    streamType: directMediaUrl?.includes('.m3u8') ? 'hls' : directMediaUrl ? 'mp4' : 'embed',
    embedUrl: defaultIframe || servers[0]?.embedUrl,
    servers,
  };

  setCache(cacheKey, streamInfo, 300);
  return streamInfo;
}

/**
 * Scrape Anoboy episode stream as secondary backup
 */
export async function getAnoboyStream(keyword: string, episodeNum = 1): Promise<NonoyaEpisodeStream | null> {
  const cacheKey = `anoboy_${keyword}_${episodeNum}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const searchUrl = `${ANOBOY_BASE}?s=${encodeURIComponent(keyword)}`;
    const searchHtml = await fetchHtml(searchUrl, ANOBOY_BASE, 5000);
    if (!searchHtml) return null;

    const $search = cheerio.load(searchHtml);
    const animeLinks: string[] = [];
    $search('a[href*="anoboy.be/"]').each((_i, a) => {
      const href = $search(a).attr('href') || '';
      if (href && !href.includes('/category/') && !href.includes('/tag/') && !animeLinks.includes(href)) {
        animeLinks.push(href);
      }
    });

    if (animeLinks.length === 0) return null;

    // Pick top matching link
    const targetLink = animeLinks[0];
    const animeHtml = await fetchHtml(targetLink, ANOBOY_BASE, 5000);
    if (!animeHtml) return null;

    const $anime = cheerio.load(animeHtml);
    let episodeHref: string | null = null;

    $anime('a').each((_i, a) => {
      const text = $anime(a).text().toLowerCase();
      const href = $anime(a).attr('href') || '';
      if (text.includes(`episode ${episodeNum}`) || text.includes(`ep ${episodeNum}`) || href.includes(`episode-${episodeNum}`)) {
        episodeHref = href;
      }
    });

    if (!episodeHref) {
      // Pick first episode link found
      const firstEp = $anime('a[href*="/episode/"], a[href*="episode-"]').attr('href');
      if (firstEp) episodeHref = firstEp;
    }

    if (!episodeHref) return null;

    const epHtml = await fetchHtml(episodeHref, ANOBOY_BASE, 5000);
    if (!epHtml) return null;

    const $ep = cheerio.load(epHtml);
    const iframeSrc =
      $ep('#mediaplayer iframe').attr('src') ||
      $ep('.player-area iframe').attr('src') ||
      $ep('#embed_holder iframe').attr('src') ||
      $ep('iframe').attr('src');

    if (!iframeSrc) return null;

    const directUrl = await extractDirectMedia(iframeSrc);
    const result: NonoyaEpisodeStream = {
      title: `${keyword} Episode ${episodeNum}`,
      episodeNum,
      isDirect: Boolean(directUrl),
      directUrl: directUrl || undefined,
      streamType: directUrl?.includes('.m3u8') ? 'hls' : directUrl ? 'mp4' : 'embed',
      embedUrl: iframeSrc,
      servers: [
        {
          name: 'Anoboy Stream Utama',
          quality: 'HD',
          isDefault: true,
          embedUrl: iframeSrc,
          directUrl: directUrl || undefined,
        },
      ],
    };

    setCache(cacheKey, result, 300);
    return result;
  } catch (err: any) {
    console.warn('[Nonoya Anoboy Stream Error]:', err?.message || err);
    return null;
  }
}

/**
 * Universal Anime Stream Resolver:
 * Finds anime across Otakudesu & Anoboy, resolves episode stream,
 * and extracts direct ad-free mp4/m3u8 media!
 */
export async function resolveNonoyaAnimeStream(params: {
  id: string;
  episode?: number;
  title?: string;
  provider?: string;
}): Promise<NonoyaEpisodeStream | null> {
  const { id, episode = 1, title, provider } = params;
  const searchTerm = title && title.trim() ? title.trim() : id.replace(/-/g, ' ');

  // 1. Try Otakudesu search
  try {
    const searchResults = await searchOtakudesu(searchTerm);
    if (searchResults.length > 0) {
      const bestMatch = searchResults[0];
      const episodes = await getOtakudesuEpisodes(bestMatch.slug);

      if (episodes.length > 0) {
        // Find matching episode (e.g. "Episode 1" or matches episode number)
        let targetEp = episodes.find((e) => {
          const numMatch = e.slug.match(/episode-(\d+)/i) || e.title.match(/episode\s*(\d+)/i);
          return numMatch && parseInt(numMatch[1], 10) === episode;
        });

        // Fallback: reverse order (Otakudesu lists latest first, so ep 1 might be at the end)
        if (!targetEp) {
          const reversed = [...episodes].reverse();
          targetEp = reversed[episode - 1] || episodes[0];
        }

        if (targetEp) {
          const stream = await getOtakudesuStream(targetEp.slug);
          if (stream) {
            // If user requested specific server, attempt to resolve it
            if (provider && provider.startsWith('nonoya_') && stream.servers.length > 0) {
              const matchedServer = stream.servers.find(
                (s) => s.name.toLowerCase().includes(provider.replace('nonoya_', ''))
              );
              if (matchedServer && matchedServer.dataContent) {
                const resEmbed = await resolveOtakudesuServer(matchedServer.dataContent);
                if (resEmbed) {
                  matchedServer.embedUrl = resEmbed;
                  const resDirect = await extractDirectMedia(resEmbed);
                  if (resDirect) {
                    matchedServer.directUrl = resDirect;
                    stream.directUrl = resDirect;
                    stream.isDirect = true;
                    stream.streamType = resDirect.includes('.m3u8') ? 'hls' : 'mp4';
                  }
                }
              }
            }
            return stream;
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[Nonoya Engine] Otakudesu resolution error:', err?.message || err);
  }

  // 2. Try Anoboy as secondary source
  try {
    const anoboyResult = await getAnoboyStream(searchTerm, episode);
    if (anoboyResult) {
      return anoboyResult;
    }
  } catch (err: any) {
    console.warn('[Nonoya Engine] Anoboy resolution error:', err?.message || err);
  }

  return null;
}
