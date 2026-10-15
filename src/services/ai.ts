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
      if (response.status === 429) {
        callbacks.onError('Batas kuota pertanyaan AI tercapai (429). Silakan tunggu 1 menit.', 429);
        return;
      }
      if (response.status === 403) {
        callbacks.onError('Kunci API Gemini tidak valid atau belum diatur (403).', 403);
        return;
      }
      callbacks.onError(`Gagal menghubungi Zhafx AI (HTTP ${response.status}).`, response.status);
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
