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
 * Tries multiple public AI cloud models directly if backend server is unreachable
 */
async function streamDirectCloudAIFallback(
  message: string,
  history: Array<{ role: 'user' | 'model'; text: string }>,
  contextTitle: Title | null | undefined,
  callbacks: StreamCallbacks,
  abortSignal?: AbortSignal
): Promise<boolean> {
  const models = ['deepseek', 'openai', 'llama'];
  const systemPrompt = `Anda adalah asisten cerdas untuk "Zhafx", platform streaming film, serial TV, dan anime. Berikan ulasan dan rekomendasi dalam Bahasa Indonesia yang santun, ramah, dan komunikatif tanpa spoiler. Di akhir respon selalu sertakan rekomendasi terstruktur persis dalam format: <picks>[{"title":"Judul","type":"movie|tv|anime","year":"2024"}]</picks>`;

  let userPrompt = message;
  if (contextTitle) {
    userPrompt = `[Konteks Tayangan saat ini: ${contextTitle.title} (${contextTitle.year || 'N/A'}, Tipe: ${contextTitle.type || 'Media'}, Sinopsis: ${contextTitle.overview || 'Tidak ada'})]\n\nPertanyaan pengguna: ${message}`;
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (Array.isArray(history)) {
    for (const h of history.slice(-4)) {
      if (h.text) {
        messages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.text,
        });
      }
    }
  }

  messages.push({ role: 'user', content: userPrompt });

  for (const m of models) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);

      const res = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          model: m,
          seed: Math.floor(Math.random() * 999999),
        }),
        signal: abortSignal || controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 10) {
          let accumulated = '';
          const words = text.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + ' ';
            accumulated += chunk;
            const { cleanText, picks } = extractPicksAndCleanText(accumulated);
            callbacks.onChunk(cleanText, picks);
            await new Promise((r) => setTimeout(r, 20));
          }

          let { cleanText, picks } = extractPicksAndCleanText(accumulated);
          if (picks.length === 0) {
            const boldMatches = accumulated.match(/\*\*([^*]+)\*\*/g) || [];
            for (const b of boldMatches) {
              const raw = b.replace(/\*\*/g, '').trim();
              if (raw.length > 2 && raw.length < 35 && !['zhafx', 'tips', 'genre', 'rekomendasi'].some(w => raw.toLowerCase().includes(w))) {
                picks.push({ title: raw, type: 'movie', year: '2024' });
              }
              if (picks.length >= 3) break;
            }
          }
          const resolved = await resolvePicks(picks);
          callbacks.onDone(cleanText, picks, resolved);
          return true;
        }
      }
    } catch {
      // try next model
    }
  }
  return false;
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
    callbacks.onError('Gak ada internet. Mending matiin HP, daripada bolak-balik nungguin kabar dari hts.', 'OFFLINE');
    return;
  }

  try {
    let response = await fetch(CONFIG.ENDPOINTS.AI_CHAT, {
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

    // If /api/ai/chat returned 404, try alternative /api/chat endpoint
    if (!response.ok && response.status === 404) {
      try {
        const altResponse = await fetch('/api/chat', {
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
        if (altResponse.ok) {
          response = altResponse;
        }
      } catch {
        // continue to cloud failover
      }
    }

    if (!response.ok) {
      // Try direct live AI cloud failover across 5 models
      const cloudSuccess = await streamDirectCloudAIFallback(message, history, contextTitle, callbacks, abortSignal);
      if (cloudSuccess) return;

      // Smart dynamic assistant fallback when completely offline or blocked
      const lowerMsg = message.toLowerCase();
      let fallbackReply = `Halo! Saya Zhafx AI. `;
      let picks: RecommendationPick[] = [];

      if (lowerMsg.includes('anime') || lowerMsg.includes('kartun') || lowerMsg.includes('jepang')) {
        fallbackReply += `Untuk penggemar anime, berikut adalah rekomendasi anime terpopuler dengan cerita memukau dan aksi seru di Zhafx:
- **Attack on Titan**: Kisah pertempuran epik umat manusia melawan raksasa titan penuh intrik dan misteri.
- **Demon Slayer: Kimetsu no Yaiba**: Petualangan Tanjiro dengan animasi pertarungan spektakuler dari Ufotable.
- **Solo Leveling**: Perjalanan Sung Jinwoo dari hunter terlemah menjadi entitas terkuat.`;
        picks = [
          { title: 'Attack on Titan', type: 'anime', year: '2013' },
          { title: 'Demon Slayer', type: 'anime', year: '2019' },
          { title: 'Solo Leveling', type: 'anime', year: '2024' },
        ];
      } else if (lowerMsg.includes('horor') || lowerMsg.includes('horror') || lowerMsg.includes('seram')) {
        fallbackReply += `Mencari yang bikin merinding? Ini rekomendasi film horor terbaik pilihan Zhafx:
- **The Conjuring**: Investigasi paranormal Ed dan Lorraine Warren yang legendaris.
- **Hereditary**: Horor psikologis keluarga yang sangat mencekam dan intens.
- **Siksa Kubur**: Karya Joko Anwar yang memadukan misteri dan ketakutan mendalam.`;
        picks = [
          { title: 'The Conjuring', type: 'movie', year: '2013' },
          { title: 'Hereditary', type: 'movie', year: '2018' },
          { title: 'Siksa Kubur', type: 'movie', year: '2024' },
        ];
      } else if (lowerMsg.includes('aksi') || lowerMsg.includes('action') || lowerMsg.includes('laga')) {
        fallbackReply += `Siap untuk aksi tanpa henti? Cek judul-judul blockbuster ini di Zhafx:
- **John Wick: Chapter 4**: Koreografi laga kelas dunia dari Keanu Reeves.
- **Top Gun: Maverick**: Sensasi pertempuran jet tempur udara yang nyata dan memacu adrenalin.
- **The Dark Knight**: Konflik moral dan laga legendaris Batman melawan Joker.`;
        picks = [
          { title: 'John Wick: Chapter 4', type: 'movie', year: '2023' },
          { title: 'Top Gun: Maverick', type: 'movie', year: '2022' },
          { title: 'The Dark Knight', type: 'movie', year: '2008' },
        ];
      } else {
        fallbackReply += `Saya siap merekomendasikan film, serial TV, dan anime terbaik untukmu di Zhafx:
- **Interstellar**: Mahakarya fiksi ilmiah tentang perjalanan melintasi lubang cacing.
- **Shogun**: Serial drama sejarah Jepang abad ke-17 dengan intrik politik yang mendebarkan.
- **Dune: Part Two**: Visual spektakuler dan perang takdir di padang pasir Arrakis.`;
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
      const { cleanText, picks } = extractPicksAndCleanText('');
      callbacks.onChunk(cleanText, picks);
      return;
    }
    // Attempt direct live cloud failover before throwing error
    const cloudSuccess = await streamDirectCloudAIFallback(message, history, contextTitle, callbacks, abortSignal);
    if (cloudSuccess) return;

    callbacks.onError(err.message || 'Terjadi kesalahan saat berkomunikasi dengan Zhafx AI.');
  }
}
