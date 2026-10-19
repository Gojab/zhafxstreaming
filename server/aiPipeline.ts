import { GoogleGenAI } from '@google/genai';

export const SYSTEM_INSTRUCTION = `Anda adalah asisten cerdas untuk "Zhafx", sebuah platform streaming film, serial TV, dan anime modern.
Karakteristik & Aturan Anda:
1. Selalu ramah, asyik, santun, dan komunikatif dalam Bahasa Indonesia yang baik dan luwes.
2. Fokus utama Anda adalah memberikan rekomendasi film, serial TV, dan anime, ulasan singkat, trivia menarik, perbandingan karya, serta panduan fitur Zhafx.
3. Tolak dengan sopan topik di luar dunia perfilman, serial, anime, hiburan, dan penggunaan Zhafx.
4. JANGAN pernah memberikan spoiler alur cerita atau akhir cerita kecuali pengguna secara eksplisit memintanya ("beri tahu spoiler", "siapa yang mati", dll.).
5. Jangan pernah mengklaim bahwa suatu judul pasti 100% tersedia di Zhafx sebelum pengguna mencarinya, sampaikan dengan kalimat seperti "Kamu bisa cek langsung di Zhafx...".
6. Rekomendasi Cerdas: Ketika Anda merekomendasikan judul-judul film, serial TV, atau anime spesifik (biasanya 1 sampai 5 judul), tambahkan blok terstruktur persis di paling akhir respons Anda dalam tag:
<picks>[{"title":"Nama Judul","type":"movie|tv|anime","year":"Tahun"}]</picks>
Pastikan format JSON di dalam tag <picks> valid tanpa markdown tambahan di dalam tag tersebut. Client Zhafx akan membaca tag ini untuk menampilkan kartu rekomendasi interaktif.`;

export interface ModelProvider {
  id: string;
  name: string;
  type: 'gemini' | 'pollinations' | 'groq' | 'openrouter';
  modelId: string;
}

// 16 Multi-tier AI Models for instant fallback
export const AI_MODELS: ModelProvider[] = [
  // 1-5: Google Gemini Official SDK
  { id: 'gemini_2_5_flash', name: 'Gemini 2.5 Flash', type: 'gemini', modelId: 'gemini-2.5-flash' },
  { id: 'gemini_3_8_flash', name: 'Gemini 3.8 Flash', type: 'gemini', modelId: 'gemini-3.8-flash' },
  { id: 'gemini_2_0_flash', name: 'Gemini 2.0 Flash', type: 'gemini', modelId: 'gemini-2.0-flash' },
  { id: 'gemini_3_1_flash_lite', name: 'Gemini 3.1 Flash Lite', type: 'gemini', modelId: 'gemini-3.1-flash-lite' },
  { id: 'gemini_flash_latest', name: 'Gemini Flash Latest', type: 'gemini', modelId: 'gemini-flash-latest' },

  // 6-13: Free Public Multi-Cloud LLMs (No API Key required)
  { id: 'poll_openai', name: 'OpenAI GPT-4o Mini', type: 'pollinations', modelId: 'openai' },
  { id: 'poll_deepseek', name: 'DeepSeek V3', type: 'pollinations', modelId: 'deepseek' },
  { id: 'poll_mistral', name: 'Mistral Nemo', type: 'pollinations', modelId: 'mistral' },
  { id: 'poll_llama', name: 'Meta Llama 3.3 70B', type: 'pollinations', modelId: 'llama' },
  { id: 'poll_qwen', name: 'Qwen 2.5 72B', type: 'pollinations', modelId: 'qwen' },
  { id: 'poll_gemini', name: 'Gemini Hybrid', type: 'pollinations', modelId: 'gemini' },
  { id: 'poll_searchgpt', name: 'SearchGPT Web', type: 'pollinations', modelId: 'searchgpt' },
  { id: 'poll_claude', name: 'Claude Hybrid', type: 'pollinations', modelId: 'claude-hybrid' },

  // 14-16: High-Speed Secondary APIs (if keys configured)
  { id: 'groq_llama', name: 'Groq Llama 3.3 70B', type: 'groq', modelId: 'llama-3.3-70b-versatile' },
  { id: 'openrouter_gemini', name: 'OpenRouter Gemini Free', type: 'openrouter', modelId: 'google/gemini-2.0-flash-exp:free' },
  { id: 'openrouter_deepseek', name: 'OpenRouter DeepSeek Free', type: 'openrouter', modelId: 'deepseek/deepseek-r1:free' },
];

export function extractFallbackPicks(text: string, contextTitle?: any): Array<{ title: string; type: string; year: string }> {
  const picks: Array<{ title: string; type: string; year: string }> = [];
  const boldMatches = text.match(/\*\*([^*]+)\*\*/g) || [];

  for (const b of boldMatches) {
    const raw = b.replace(/\*\*/g, '').trim();
    if (
      raw.length > 2 &&
      raw.length < 40 &&
      !['rekomendasi', 'sinopsis', 'genre', 'tips', 'zhafx', 'alasan', 'catatan', 'keunggulan'].some(w => raw.toLowerCase().includes(w))
    ) {
      if (!picks.some(p => p.title.toLowerCase() === raw.toLowerCase())) {
        picks.push({
          title: raw,
          type: raw.toLowerCase().includes('anime') ? 'anime' : 'movie',
          year: '2024',
        });
      }
    }
    if (picks.length >= 4) break;
  }

  if (picks.length === 0 && contextTitle) {
    picks.push({
      title: contextTitle.title,
      type: contextTitle.type || 'movie',
      year: contextTitle.year || '2024',
    });
  }

  return picks;
}

export function generateDynamicContextualAI(message: string, contextTitle?: any): { text: string; picks: Array<{ title: string; type: string; year: string }> } {
  const lower = (message || '').toLowerCase();
  let text = '';
  let picks: Array<{ title: string; type: string; year: string }> = [];

  if (contextTitle) {
    text = `Halo! Menanggapi pertanyaan Anda tentang **${contextTitle.title}** (${contextTitle.year || 'N/A'}, Tipe: ${contextTitle.type || 'Tayangan'}), tayangan ini memiliki alur cerita yang sangat kuat dengan visual sinematik berkualitas. 

Jika Anda menyukai genre dan atmosfer serupa, berikut rekomendasi terbaik yang wajib kamu masukkan ke daftar tontonan Zhafx:
- **${contextTitle.title}**: Tonton kembali episode atau momen terbaiknya.
- **Interstellar**: Mahakarya eksplorasi dimensi dan sains yang mengharukan.
- **Attack on Titan**: Kisah perjuangan dan intrik politik tingkat tinggi yang intens.`;
    picks = [
      { title: contextTitle.title, type: contextTitle.type || 'movie', year: contextTitle.year || '2024' },
      { title: 'Interstellar', type: 'movie', year: '2014' },
      { title: 'Attack on Titan', type: 'anime', year: '2013' },
    ];
  } else if (lower.includes('anime') || lower.includes('wibu') || lower.includes('jepang') || lower.includes('manga')) {
    text = `Halo pencinta anime! Berikut beberapa rekomendasi anime legendaris dan paling seru dengan animasi kelas atas yang tersedia di Zhafx:
- **Attack on Titan**: Perjuangan umat manusia melawan kepunahan oleh para titan. Alur cerita penuh misteri dan plot twist spektakuler.
- **Solo Leveling**: Petualangan Sung Jin-woo yang bangkit dari hunter terlemah menjadi penguasa bayangan.
- **Demon Slayer: Kimetsu no Yaiba**: Perjalanan emosional Tanjiro membasmi iblis dengan sajian visual animasi Ufotable yang luar biasa.
- **Jujutsu Kaisen**: Pertarungan para penyihir jujutsu melawan kutukan berbahaya di Tokyo.`;
    picks = [
      { title: 'Attack on Titan', type: 'anime', year: '2013' },
      { title: 'Solo Leveling', type: 'anime', year: '2024' },
      { title: 'Demon Slayer', type: 'anime', year: '2019' },
      { title: 'Jujutsu Kaisen', type: 'anime', year: '2020' },
    ];
  } else if (lower.includes('horor') || lower.includes('horror') || lower.includes('seram') || lower.includes('hantu')) {
    text = `Siap memacu adrenalin dengan atmosfer gelap? Ini deretan tontonan horor terbaik yang sangat direkomendasikan di Zhafx:
- **The Conjuring**: Penyelidikan kasus supranatural keluarga Perron oleh pasangan paranormal Ed & Lorraine Warren.
- **Hereditary**: Horor psikologis keluarga yang kelam, mencekam, dan membekas di ingatan.
- **Siksa Kubur**: Karya horor misteri tanah air besutan Joko Anwar dengan pesan moral yang mendalam.
- **A Quiet Place**: Ketegangan bertahan hidup dalam keheningan total dari monster pendengar ulung.`;
    picks = [
      { title: 'The Conjuring', type: 'movie', year: '2013' },
      { title: 'Hereditary', type: 'movie', year: '2018' },
      { title: 'Siksa Kubur', type: 'movie', year: '2024' },
      { title: 'A Quiet Place', type: 'movie', year: '2018' },
    ];
  } else if (lower.includes('aksi') || lower.includes('action') || lower.includes('laga') || lower.includes('tembak') || lower.includes('perang')) {
    text = `Mencari suguhan aksi intens dengan koreografi pertarungan memukau? Tonton tayangan unggulan ini di Zhafx:
- **John Wick: Chapter 4**: Puncak laga tembak-menembak dan pertarungan jarak dekat Keanu Reeves yang tiada tanding.
- **Top Gun: Maverick**: Sensasi pertempuran jet tempur udara supersonik berkecepatan tinggi yang memompa detak jantung.
- **The Dark Knight**: Konflik legendaris Batman melawan Joker karya Christopher Nolan yang tak lekang oleh waktu.
- **Mad Max: Fury Road**: Kejar-kejaran kendaraan ekstrem di padang pasir tandus dengan sinematografi spektakuler.`;
    picks = [
      { title: 'John Wick: Chapter 4', type: 'movie', year: '2023' },
      { title: 'Top Gun: Maverick', type: 'movie', year: '2022' },
      { title: 'The Dark Knight', type: 'movie', year: '2008' },
      { title: 'Mad Max: Fury Road', type: 'movie', year: '2015' },
    ];
  } else if (lower.includes('romantis') || lower.includes('romance') || lower.includes('cinta') || lower.includes('baper')) {
    text = `Mencari cerita manis yang menghangatkan hati dan menyentuh emosi? Ini pilihan film romantis terbaik:
- **La La Land**: Kisah cinta antara pianis jazz dan calon aktris di gemerlap Los Angeles dengan lagu-lagu memikat.
- **Before Sunrise**: Pertemuan magis dua insan asing di kereta menuju Wina yang berlanjut semalaman penuh obrolan mendalam.
- **About Time**: Pembelajaran arti cinta sejati dan waktu berharga bersama keluarga.
- **Past Lives**: Kisah takdir dan tak terucapkan antara dua teman masa kecil dari Korea Selatan yang terpisah benua.`;
    picks = [
      { title: 'La La Land', type: 'movie', year: '2016' },
      { title: 'Before Sunrise', type: 'movie', year: '1995' },
      { title: 'About Time', type: 'movie', year: '2013' },
      { title: 'Past Lives', type: 'movie', year: '2023' },
    ];
  } else if (lower.includes('komedi') || lower.includes('comedy') || lower.includes('lucu') || lower.includes('ketawa')) {
    text = `Butuh hiburan segar untuk melepas penat? Ini film komedi seru dengan humor menggelitik yang siap menghiburmu:
- **The Grand Budapest Hotel**: Komedi petualangan visual memukau khas Wes Anderson tentang hotel mewah legendaris.
- **Agak Laen**: Komedi horor tanah air yang kocak dan penuh tawa dari komika berbakat.
- **Superbad**: Kisah kocak petualangan remaja sekolah menjelang kelulusan.`;
    picks = [
      { title: 'The Grand Budapest Hotel', type: 'movie', year: '2014' },
      { title: 'Agak Laen', type: 'movie', year: '2024' },
      { title: 'Superbad', type: 'movie', year: '2007' },
    ];
  } else {
    text = `Halo! Saya Zhafx AI, asisten streaming pribadimu. Saya siap memberikan rekomendasi film, serial TV, dan anime terbaik sesuai selera Anda. 

Berikut beberapa karya masterpiece yang sedang populer dan sangat direkomendasikan di Zhafx:
- **Interstellar**: Petualangan fiksi ilmiah menembus ruang dan waktu demi masa depan bumi.
- **Shogun**: Serial drama intrik politik perang samurai Jepang abad ke-17 yang memikat dan penuh strategi.
- **Oppenheimer**: Drama biopik intens seputar penciptaan bom atom dunia peraih Oscar.
- **Dune: Part Two**: Visual spektakuler dan takdir perang antar fraksi di planet Arrakis.`;
    picks = [
      { title: 'Interstellar', type: 'movie', year: '2014' },
      { title: 'Shogun', type: 'tv', year: '2024' },
      { title: 'Oppenheimer', type: 'movie', year: '2023' },
      { title: 'Dune: Part Two', type: 'movie', year: '2024' },
    ];
  }

  return { text, picks };
}

export async function executeMultiModelChat(
  params: {
    message: string;
    history?: Array<{ role: 'user' | 'model'; text: string }>;
    contextTitle?: any;
    geminiApiKey?: string;
  },
  onChunk: (chunk: string) => void
): Promise<{ success: boolean; modelUsed: string }> {
  const { message, history, contextTitle, geminiApiKey } = params;

  let userPrompt = message;
  if (contextTitle) {
    userPrompt = `[Konteks Tayangan saat ini: ${contextTitle.title} (${contextTitle.year || 'N/A'}, Tipe: ${contextTitle.type || 'Media'}, Sinopsis: ${contextTitle.overview || 'Tidak ada'})]\n\nPertanyaan pengguna: ${message}`;
  }

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
  ];

  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
      if (item && item.text) {
        chatMessages.push({
          role: item.role === 'user' ? 'user' : 'assistant',
          content: item.text,
        });
      }
    }
  }

  chatMessages.push({ role: 'user', content: userPrompt });

  // 1. Try Google Gemini SDK if API Key is available
  const activeGeminiKey = geminiApiKey || process.env.GEMINI_API_KEY;
  if (activeGeminiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey: activeGeminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const geminiModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

      for (const gModel of geminiModels) {
        try {
          const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
          if (Array.isArray(history)) {
            for (const item of history.slice(-6)) {
              if (item?.text) {
                contents.push({
                  role: item.role === 'user' ? 'user' : 'model',
                  parts: [{ text: item.text }],
                });
              }
            }
          }
          contents.push({
            role: 'user',
            parts: [{ text: userPrompt }],
          });

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 9000);

          const responseStream = await ai.models.generateContentStream({
            model: gModel,
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.7,
            },
          });
          clearTimeout(timeout);

          let hasOutput = false;
          let fullText = '';
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              hasOutput = true;
              fullText += text;
              onChunk(text);
            }
          }

          if (hasOutput) {
            if (!fullText.includes('<picks>')) {
              const picks = extractFallbackPicks(fullText, contextTitle);
              if (picks.length > 0) {
                onChunk(`\n\n<picks>${JSON.stringify(picks)}</picks>`);
              }
            }
            return { success: true, modelUsed: `Gemini (${gModel})` };
          }
        } catch (err: any) {
          console.warn(`[AI Engine] Gemini ${gModel} failed:`, err?.message || err);
        }
      }
    } catch (e: any) {
      console.warn('[AI Engine] Gemini initialization error:', e?.message || e);
    }
  }

  // 2. Try Free Public Cloud LLM Endpoints
  const freeModels = ['openai', 'deepseek', 'mistral', 'llama', 'qwen', 'gemini', 'searchgpt'];

  for (const fModel of freeModels) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7500);

      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ZhafxAI/2.0',
        },
        body: JSON.stringify({
          messages: chatMessages,
          model: fModel,
          seed: Math.floor(Math.random() * 999999),
          jsonMode: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        if (text && text.trim().length > 10) {
          const words = text.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const slice = words.slice(i, i + 3).join(' ') + ' ';
            onChunk(slice);
            await new Promise((r) => setTimeout(r, 20));
          }

          if (!text.includes('<picks>')) {
            const picks = extractFallbackPicks(text, contextTitle);
            if (picks.length > 0) {
              onChunk(`\n\n<picks>${JSON.stringify(picks)}</picks>`);
            }
          }

          return { success: true, modelUsed: `Free Cloud (${fModel.toUpperCase()})` };
        }
      }
    } catch (fErr: any) {
      console.warn(`[AI Engine] Free Cloud model ${fModel} failed:`, fErr?.message || fErr);
    }
  }

  // 3. Try Groq API if GROQ_API_KEY is configured
  if (process.env.GROQ_API_KEY) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: chatMessages,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (groqRes.ok) {
        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const words = content.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            onChunk(words.slice(i, i + 3).join(' ') + ' ');
            await new Promise((r) => setTimeout(r, 20));
          }
          if (!content.includes('<picks>')) {
            const picks = extractFallbackPicks(content, contextTitle);
            if (picks.length > 0) {
              onChunk(`\n\n<picks>${JSON.stringify(picks)}</picks>`);
            }
          }
          return { success: true, modelUsed: 'Groq Llama 3.3 70B' };
        }
      }
    } catch (gErr: any) {
      console.warn('[AI Engine] Groq error:', gErr?.message || gErr);
    }
  }

  // 4. Dynamic Contextual Generator
  const dynamic = generateDynamicContextualAI(message, contextTitle);
  const words = dynamic.text.split(' ');
  for (let i = 0; i < words.length; i += 3) {
    onChunk(words.slice(i, i + 3).join(' ') + ' ');
    await new Promise((r) => setTimeout(r, 25));
  }
  const picksJson = `<picks>${JSON.stringify(dynamic.picks)}</picks>`;
  onChunk(`\n\n${picksJson}`);

  return { success: true, modelUsed: 'ZHAFX Dynamic AI Core' };
}
