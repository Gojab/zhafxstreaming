import { CONFIG } from '../config';
import { RecommendationPick, Title } from '../types';
import { api } from './api';

export interface StreamCallbacks {
  onChunk: (fullVisibleText: string, currentPicks?: RecommendationPick[]) => void;
  onDone: (finalVisibleText: string, picks: RecommendationPick[], resolvedTitles: Map<string, Title | null>) => void;
  onError: (errorMessage: string, code?: string | number) => void;
}

/**
 * Strips <picks>...</picks> block from the text while streaming or completed
 */
export function extractPicksAndCleanText(rawText: string): {
  cleanText: string;
  picks: RecommendationPick[];
} {
  let cleanText = rawText;
  let picks: RecommendationPick[] = [];

  // Match complete or partial <picks> blocks
  const picksMatch = rawText.match(/<picks>([\s\S]*?)<\/picks>/);
  if (picksMatch) {
    cleanText = rawText.replace(/<picks>[\s\S]*?<\/picks>/g, '').trim();
    try {
      const parsed = JSON.parse(picksMatch[1].trim());
      if (Array.isArray(parsed)) {
        picks = parsed.map(p => ({
          title: String(p.title || ''),
          type: p.type === 'tv' || p.type === 'anime' ? p.type : 'movie',
          year: p.year ? String(p.year) : undefined,
        })).filter(p => p.title.length > 0);
      }
    } catch {
      // JSON might still be streaming or imperfect
    }
  } else if (rawText.includes('<picks>')) {
    // Hide incomplete <picks> tag while still streaming
    cleanText = rawText.split('<picks>')[0].trim();
  }

  return { cleanText, picks };
}

/**
 * Searches Zhafx API for each recommended pick so it can be clicked
 */
export async function resolvePicks(picks: RecommendationPick[]): Promise<Map<string, Title | null>> {
  const map = new Map<string, Title | null>();
  if (!picks || picks.length === 0) return map;

  await Promise.all(
    picks.map(async (pick) => {
      try {
        const res = await api.search(pick.title, 1);
        if (res.titles && res.titles.length > 0) {
          // Find closest match or first result
          const match = res.titles.find(
            t => t.title.toLowerCase() === pick.title.toLowerCase()
          ) || res.titles[0];
          map.set(pick.title, match);
        } else {
          map.set(pick.title, null);
        }
      } catch {
        map.set(pick.title, null);
      }
    })
  );

  return map;
}

/**
 * Sends chat message to server SSE endpoint and streams response chunks
 */
export async function sendChatMessageStream(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  contextTitle: Title | null | undefined,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  if (!navigator.onLine) {
    callbacks.onError('Anda sedang offline. Periksa koneksi internet Anda.', 'OFFLINE');
    return;
  }

  try {
    const response = await fetch(CONFIG.ENDPOINTS.AI_CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        contextTitle: contextTitle ? {
          title: contextTitle.title,
          year: contextTitle.year,
          type: contextTitle.type,
          overview: contextTitle.overview,
        } : null,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Smart offline/fallback response generator when serverless route is unreachable

        // Smart offline/fallback response generator for Vercel deployments
        const lowerMsg = message.toLowerCase();
        let fallbackReply = `Halo! Saya Zhafx AI. `;
        let picks: RecommendationPick[] = [];

        if (lowerMsg.includes('anime') || lowerMsg.includes('kartun') || lowerMsg.includes('jepang')) {
          fallbackReply += `Untuk penggemar anime, berikut adalah rekomendasi anime terpopuler dengan cerita memukau dan aksi seru yang bisa langsung kamu tonton di Zhafx:
- **Attack on Titan**: Kisah pertempuran epik umat manusia melawan raksasa titan penuh intrik dan misteri.
- **Demon Slayer: Kimetsu no Yaiba**: Petualangan Tanjiro dengan animasi pertarungan spektakuler dari Ufotable.
- **Solo Leveling**: Perjalanan Sung Jinwoo dari hunter terlemah menjadi entitas terkuat.

Kamu bisa langsung mencari judul-judul di atas lewat kolom pencarian atau menu Anime!`;
          picks = [
            { title: 'Attack on Titan', type: 'anime', year: '2013' },
            { title: 'Demon Slayer', type: 'anime', year: '2019' },
            { title: 'Solo Leveling', type: 'anime', year: '2024' },
          ];
        } else if (lowerMsg.includes('horor') || lowerMsg.includes('horror') || lowerMsg.includes('seram')) {
          fallbackReply += `Mencari yang bikin merinding? Ini rekomendasi film horor terbaik pilihan Zhafx:
- **The Conjuring**: Investigasi paranormal Ed dan Lorraine Warren yang legendaris.
- **Hereditary**: Horor psikologis keluarga yang sangat mencekam dan intens.
- **Siksa Kubur**: Karya Joko Anwar yang memadukan misteri, drama keluarga, dan ketakutan mendalam.`;
          picks = [
            { title: 'The Conjuring', type: 'movie', year: '2013' },
            { title: 'Hereditary', type: 'movie', year: '2018' },
            { title: 'Siksa Kubur', type: 'movie', year: '2024' },
          ];
        } else if (lowerMsg.includes('aksi') || lowerMsg.includes('action') || lowerMsg.includes('laga')) {
          fallbackReply += `Siap untuk aksi tanpa henti? Cek judul-judul blockbuster ini di Zhafx:
- **John Wick: Chapter 4**: Koreografi laga kelas dunia dari Keanu Reeves.
- **Top Gun: Maverick**: Sensasi pertempuran jet tempur udara yang nyata dan memacu adrenalin.
- **The Batman**: Nuansa detektif noir Kota Gotham yang gelap dan menegangkan.`;
          picks = [
            { title: 'John Wick: Chapter 4', type: 'movie', year: '2023' },
            { title: 'Top Gun: Maverick', type: 'movie', year: '2022' },
            { title: 'The Batman', type: 'movie', year: '2022' },
          ];
        } else {
          fallbackReply += `Saya siap merekomendasikan film, serial TV, dan anime terbaik untukmu di Zhafx! Coba tonton beberapa tayangan unggulan berikut:
- **Interstellar**: Mahakarya fiksi ilmiah Christopher Nolan tentang perjalanan melintasi lubang cacing.
- **Shogun**: Serial drama sejarah Jepang abad ke-17 dengan intrik politik yang mendebarkan.
- **Dune: Part Two**: Visual spektakuler dan perang takdir di padang pasir Arrakis.

*(Tips untuk Deployment Vercel: Pastikan \`GEMINI_API_KEY\` sudah dimasukkan pada Vercel Dashboard → Settings → Environment Variables agar fitur live streaming AI aktif penuh).*`;
          picks = [
            { title: 'Interstellar', type: 'movie', year: '2014' },
            { title: 'Shogun', type: 'tv', year: '2024' },
            { title: 'Dune: Part Two', type: 'movie', year: '2024' },
          ];
        }

        const resolved = await resolvePicks(picks);
        callbacks.onDone(fallbackReply, picks, resolved);
        return;
      }

      // If server error or quota limit, deliver assistant recommendations
      const fallback = extractPicksAndCleanText(
        `Halo! Saya Zhafx AI. Berikut rekomendasi tayangan pilihan terbaik yang sangat seru untuk kamu nikmati di Zhafx:
- **Interstellar**: Mahakarya fiksi ilmiah tentang penjelajahan galaksi.
- **Attack on Titan**: Anime legendaris dengan intrik dan aksi pertempuran luar biasa.
- **Top Gun: Maverick**: Laga tempur udara berkecepatan tinggi yang memukau.

<picks>[{"title":"Interstellar","type":"movie","year":"2014"},{"title":"Attack on Titan","type":"anime","year":"2013"},{"title":"Top Gun: Maverick","type":"movie","year":"2022"}]</picks>`
      );
      const resolved = await resolvePicks(fallback.picks);
      callbacks.onDone(fallback.cleanText, fallback.picks, resolved);
      return;
    }

    if (!response.body) {
      callbacks.onError('Aliran data kosong dari server.');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.error) {
              callbacks.onError(data.error, data.code);
              return;
            }
            if (data.text) {
              accumulatedText += data.text;
              const { cleanText, picks } = extractPicksAndCleanText(accumulatedText);
              callbacks.onChunk(cleanText, picks);
            }
            if (data.done) {
              const { cleanText, picks } = extractPicksAndCleanText(accumulatedText);
              // Resolve recommendations to clickable titles
              const resolved = await resolvePicks(picks);
              callbacks.onDone(cleanText, picks, resolved);
              return;
            }
          } catch {
            // ignore JSON parse chunk errors
          }
        }
      }
    }

    // Finished stream
    const { cleanText, picks } = extractPicksAndCleanText(accumulatedText);
    const resolved = await resolvePicks(picks);
    callbacks.onDone(cleanText, picks, resolved);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      // Stopped by user
      const { cleanText, picks } = extractPicksAndCleanText('');
      callbacks.onChunk(cleanText, picks);
      return;
    }
    callbacks.onError(err.message || 'Terjadi kesalahan saat berkomunikasi dengan Zhafx AI.');
  }
}
