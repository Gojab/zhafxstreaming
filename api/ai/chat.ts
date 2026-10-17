import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = `Anda adalah asisten cerdas untuk "Zhafx", sebuah platform streaming film, serial TV, dan anime modern.
Karakteristik & Aturan Anda:
1. Selalu ramah, asyik, santun, dan komunikatif dalam Bahasa Indonesia yang baik dan luwes.
2. Fokus utama Anda adalah memberikan rekomendasi film, serial TV, dan anime, ulasan singkat, trivia menarik, perbandingan karya, serta panduan fitur Zhafx.
3. Tolak dengan sopan topik di luar dunia perfilman, serial, anime, hiburan, dan penggunaan Zhafx.
4. JANGAN pernah memberikan spoiler alur cerita atau akhir cerita kecuali pengguna secara eksplisit memintanya.
5. Jangan pernah mengklaim bahwa suatu judul pasti 100% tersedia di Zhafx sebelum pengguna mencarinya, sampaikan dengan kalimat seperti "Kamu bisa cek langsung di Zhafx...".
6. Rekomendasi Cerdas: Ketika Anda merekomendasikan judul-judul film, serial TV, atau anime spesifik (biasanya 1 sampai 5 judul), tambahkan blok terstruktur persis di paling akhir respons Anda dalam tag:
<picks>[{"title":"Nama Judul","type":"movie|tv|anime","year":"Tahun"}]</picks>
Pastikan format JSON di dalam tag <picks> valid tanpa markdown tambahan di dalam tag tersebut. Client Zhafx akan membaca tag ini untuk menampilkan kartu rekomendasi interaktif.`;

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(403).json({
      error: 'GEMINI_API_KEY belum dikonfigurasi pada environment variables Vercel.',
      code: 'API_KEY_MISSING'
    });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        // use as-is
      }
    }

    const { message, history, contextTitle } = body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'zhafx-streaming-vercel',
        },
      },
    });

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
    let contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item && item.role && item.text) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
          });
        }
      }
    }

    let userPrompt = message;
    if (contextTitle) {
      userPrompt = `[Konteks Tayangan saat ini: ${contextTitle.title} (${contextTitle.year || 'N/A'}, Tipe: ${contextTitle.type || 'Media'}, Sinopsis: ${contextTitle.overview || 'Tidak ada'})]\n\nPertanyaan pengguna: ${message}`;
    }

    contents.push({
      role: 'user',
      parts: [{ text: userPrompt }]
    });

    // Check if client accepts text/event-stream
    const acceptHeader = req.headers?.accept || '';
    const wantsStream = acceptHeader.includes('text/event-stream') || true;

    if (wantsStream && res.flushHeaders) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      for (const model of modelsToTry) {
        try {
          const responseStream = await ai.models.generateContentStream({
            model,
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.7,
            }
          });

          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              res.write(`data: ${JSON.stringify({ text })}\n\n`);
            }
          }

          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
          return;
        } catch (err: any) {
          console.warn(`[Vercel Gemini] Failed with ${model}:`, err?.message);
          if (model === modelsToTry[modelsToTry.length - 1]) {
            res.write(`data: ${JSON.stringify({ error: 'Gagal memproses jawaban AI. Silakan coba lagi sebentar lagi.', code: err?.status || 500 })}\n\n`);
            res.end();
            return;
          }
        }
      }
    } else {
      // Non-streaming fallback
      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.7,
            }
          });
          return res.status(200).json({ text: response.text });
        } catch (err) {
          if (model === modelsToTry[modelsToTry.length - 1]) {
            throw err;
          }
        }
      }
    }
  } catch (error: any) {
    console.error('[Vercel AI Chat Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Terjadi kesalahan saat memproses permintaan AI.',
    });
  }
}
