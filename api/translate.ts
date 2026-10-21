import { GoogleGenAI } from '@google/genai';

const translationCache = new Map<string, string>();

async function translateSingleText(text: string): Promise<string> {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length < 3) return trimmed;

  if (translationCache.has(trimmed)) {
    return translationCache.get(trimmed)!;
  }

  // Tier 1: Google Gemini 3.8 Flash (if API key configured)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const prompt = `Terjemahkan sinopsis film/serial berikut ke Bahasa Indonesia yang alami, mengalir, sinematik, dan menarik tanpa spoiler. HANYA berikan teks hasil terjemahannya saja tanpa tanda petik atau pengantar tambahan:\n\n${trimmed}`;
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.3,
        },
      });

      const translated = response.text?.trim();
      if (translated && translated.length > 5) {
        translationCache.set(trimmed, translated);
        return translated;
      }
    } catch (err: any) {
      console.warn('[Translate Gemini Fallback Notice]:', err?.message || err);
    }
  }

  // Tier 2: MyMemory Translation API (Free, high reliability, no CAPTCHA)
  try {
    const memoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 500))}&langpair=en|id`;
    const memRes = await fetch(memoryUrl, {
      signal: AbortSignal.timeout(4500),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (memRes.ok) {
      const memData = await memRes.json();
      const translatedText = memData?.responseData?.translatedText;
      if (translatedText && typeof translatedText === 'string' && !translatedText.includes('QUERY LENGTH LIMIT')) {
        translationCache.set(trimmed, translatedText);
        return translatedText;
      }
    }
  } catch (err: any) {
    console.warn('[Translate MyMemory Notice]:', err?.message || err);
  }

  // Tier 3: Google GTX with clean headers
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(trimmed)}`;
    const gtxRes = await fetch(gtxUrl, {
      signal: AbortSignal.timeout(4000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    if (gtxRes.ok) {
      const data = await gtxRes.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0].map((item: any) => item[0] || '').join('').trim();
        if (translated) {
          translationCache.set(trimmed, translated);
          return translated;
        }
      }
    }
  } catch {
    // fallback
  }

  return trimmed;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const text = (req.query?.text as string) || req.body?.text;
  const texts = req.body?.texts;

  if (Array.isArray(texts)) {
    const results = await Promise.all(
      texts.map(async (t: string) => {
        if (!t || typeof t !== 'string') return '';
        return translateSingleText(t);
      })
    );
    return res.status(200).json({ success: true, results });
  }

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ success: false, error: 'Teks wajib diisi.' });
  }

  const translated = await translateSingleText(text);
  return res.status(200).json({ success: true, translated });
}
