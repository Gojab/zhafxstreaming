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

function generateSmartFallback(message: string, contextTitle?: any) {
  const lower = (message || '').toLowerCase();
  let text = '';
  let picks: Array<{ title: string; type: string; year: string }> = [];

  if (contextTitle) {
    text = `Mengenai **${contextTitle.title}** (${contextTitle.year || 'N/A'}), tayangan ini memiliki alur cerita yang sangat menarik untuk dinikmati di Zhafx. `;
    if (contextTitle.type === 'anime') {
      text += `Untuk rekomendasi anime serupa dengan cerita mendalam dan aksi epik:`;
      picks = [
        { title: 'Attack on Titan', type: 'anime', year: '2013' },
        { title: 'Demon Slayer', type: 'anime', year: '2019' },
        { title: 'Solo Leveling', type: 'anime', year: '2024' },
      ];
    } else if (contextTitle.type === 'tv') {
      text += `Berikut beberapa serial pilihan dengan intrik cerita yang tak kalah seru:`;
      picks = [
        { title: 'Breaking Bad', type: 'tv', year: '2008' },
        { title: 'Stranger Things', type: 'tv', year: '2016' },
        { title: 'The Last of Us', type: 'tv', year: '2023' },
      ];
    } else {
      text += `Film-film pilihan dengan nuansa dan genre serupa yang bisa kamu tonton:`;
      picks = [
        { title: 'Interstellar', type: 'movie', year: '2014' },
        { title: 'Inception', type: 'movie', year: '2010' },
        { title: 'Dune: Part Two', type: 'movie', year: '2024' },
      ];
    }
  } else if (lower.includes('anime') || lower.includes('wibu') || lower.includes('kartun') || lower.includes('jepang')) {
    text = `Pencinta anime! Ini rekomendasi anime terbaik dan terpopuler dengan cerita seru dan pertarungan berkelas di Zhafx:
- **Attack on Titan**: Pertempuran hidup-mati manusia melawan titan pemangsa.
- **Solo Leveling**: Kebangkitan hunter terlemah menjadi penguasa bayangan abadi.
- **Demon Slayer: Kimetsu no Yaiba**: Perjalanan Tanjiro membasmi iblis dengan grafis spektakuler.`;
    picks = [
      { title: 'Attack on Titan', type: 'anime', year: '2013' },
      { title: 'Solo Leveling', type: 'anime', year: '2024' },
      { title: 'Demon Slayer', type: 'anime', year: '2019' },
    ];
  } else if (lower.includes('horor') || lower.includes('horror') || lower.includes('seram') || lower.includes('hantu')) {
    text = `Siap dibuat merinding? Rekomendasi film horor terbaik yang wajib kamu tonton:
- **The Conjuring**: Penyelidikan kasus paranormal pasangan Ed dan Lorraine Warren.
- **Hereditary**: Horor psikologis keluarga yang gelap dan penuh misteri.
- **Siksa Kubur**: Film misteri horor karya Joko Anwar yang menggugah pikiran.`;
    picks = [
      { title: 'The Conjuring', type: 'movie', year: '2013' },
      { title: 'Hereditary', type: 'movie', year: '2018' },
      { title: 'Siksa Kubur', type: 'movie', year: '2024' },
    ];
  } else if (lower.includes('aksi') || lower.includes('action') || lower.includes('laga') || lower.includes('perang')) {
    text = `Berikut rekomendasi film laga tanpa henti untuk memompa adrenalin:
- **John Wick: Chapter 4**: Koreografi aksi tembak-menembak paling memukau Keanu Reeves.
- **Top Gun: Maverick**: Sensasi pertempuran udara jet supersonik yang mendebarkan.
- **The Dark Knight**: Konflik moral dan laga legendaris Batman melawan Joker.`;
    picks = [
      { title: 'John Wick: Chapter 4', type: 'movie', year: '2023' },
      { title: 'Top Gun: Maverick', type: 'movie', year: '2022' },
      { title: 'The Dark Knight', type: 'movie', year: '2008' },
    ];
  } else if (lower.includes('romantis') || lower.includes('romance') || lower.includes('cinta')) {
    text = `Mencari kisah yang menyentuh hati? Rekomendasi film romantis pilihan:
- **La La Land**: Kisah impian dan cinta manis di gemerlap Los Angeles.
- **Before Sunrise**: Pertemuan tak terduga dua insan di kereta menuju Wina.
- **About Time**: Pelajaran hidup dan kehangatan cinta melalui perjalanan waktu.`;
    picks = [
      { title: 'La La Land', type: 'movie', year: '2016' },
      { title: 'Before Sunrise', type: 'movie', year: '1995' },
      { title: 'About Time', type: 'movie', year: '2013' },
    ];
  } else {
    text = `Halo! Saya Zhafx AI, asisten streaming pribadimu. Saya siap memberikan rekomendasi film, serial TV, dan anime terbaik. Berikut tayangan unggulan yang sedang populer:
- **Interstellar**: Petualangan fiksi ilmiah menembus ruang dan waktu demi masa depan bumi.
- **Shogun**: Intrik politik perang samurai Jepang abad ke-17 yang memikat.
- **Oppenheimer**: Drama biopik intens seputar penciptaan bom atom dunia.`;
    picks = [
      { title: 'Interstellar', type: 'movie', year: '2014' },
      { title: 'Shogun', type: 'tv', year: '2024' },
      { title: 'Oppenheimer', type: 'movie', year: '2023' },
    ];
  }

  return { text, picks };
}

export default async function handler(req: any, res: any) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check / GET support
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Zhafx AI Assistant API',
      configured: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  // Support SSE stream
  const acceptHeader = req.headers?.accept || '';
  const wantsStream = acceptHeader.includes('text/event-stream') || true;

  if (wantsStream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }
  }

  // If no Gemini API key configured on Vercel, deliver smart assistant fallback immediately
  if (!apiKey) {
    const fallback = generateSmartFallback(message, contextTitle);
    const words = fallback.text.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const slice = words.slice(i, i + 3).join(' ') + ' ';
      res.write(`data: ${JSON.stringify({ text: slice })}\n\n`);
      await new Promise((r) => setTimeout(r, 30));
    }
    const picksJson = `<picks>${JSON.stringify(fallback.picks)}</picks>`;
    res.write(`data: ${JSON.stringify({ text: `\n\n${picksJson}` })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return res.end();
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'zhafx-streaming-vercel',
        },
      },
    });

    // Valid Gemini models
    const modelsToTry = ['gemini-3.8-flash', 'gemini-flash-latest'];
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item && item.role && item.text) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
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
      parts: [{ text: userPrompt }],
    });

    let succeeded = false;

    for (const model of modelsToTry) {
      try {
        const responseStream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });

        for await (const chunk of responseStream) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        }

        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
        succeeded = true;
        break;
      } catch (err: any) {
        console.warn(`[Vercel Gemini] Failed with ${model}:`, err?.message || err);
      }
    }

    if (!succeeded) {
      const fallback = generateSmartFallback(message, contextTitle);
      const words = fallback.text.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const slice = words.slice(i, i + 3).join(' ') + ' ';
        res.write(`data: ${JSON.stringify({ text: slice })}\n\n`);
        await new Promise((r) => setTimeout(r, 30));
      }
      const picksJson = `<picks>${JSON.stringify(fallback.picks)}</picks>`;
      res.write(`data: ${JSON.stringify({ text: `\n\n${picksJson}` })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    console.error('[Vercel AI Chat Error]:', error);
    const fallback = generateSmartFallback(message, contextTitle);
    res.write(`data: ${JSON.stringify({ text: fallback.text })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  }
}
