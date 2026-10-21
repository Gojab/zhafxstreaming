/**
 * High-performance Indonesian Synopsis Translator & Cache
 * Automatically ensures all synopses across movies, TV, and anime are in Bahasa Indonesia.
 */

const KNOWN_SYNOPSES: Record<string, string> = {
  'dune: part two':
    'Paul Atreides bersatu dengan Chani dan kaum Fremen saat menempuh jalan balas dendam terhadap para konspirator yang menghancurkan keluarganya, seraya berusaha mencegah masa depan kelam yang hanya bisa ia ramalkan.',
  'dune':
    'Paul Atreides, pemuda brilian yang lahir dengan takdir besar melampaui pemahamannya, harus melakukan perjalanan ke planet paling berbahaya di alam semesta demi memastikan masa depan keluarga dan rakyatnya.',
  'interstellar':
    'Di masa depan ketika bumi dilanda krisis pangan parah, sekelompok penjelajah menempuh misi terjauh dalam sejarah melintasi lubang cacing antariksa demi mencari planet baru yang layak huni bagi kelangsungan umat manusia.',
  'oppenheimer':
    'Kisah biopik dramatis seputar fisikawan teoretis J. Robert Oppenheimer yang memimpin Proyek Manhattan untuk menciptakan senjata nuklir pertama dalam sejarah peradaban manusia.',
  'shōgun':
    'Ketika sebuah kapal misterius terdampar di pesisir feodal Jepang, sang navigator Inggris terjerumus ke dalam perang politik dan intrik perebutan kekuasaan para penguasa samurai.',
  'solo leveling':
    'Di dunia di mana monster bermunculan melalui gerbang dimensi, Sung Jin-woo yang dikenal sebagai pemburu terlemah bangkit dari ambang maut dengan sistem misterius yang memungkinkannya meningkatkan kekuatan tanpa batas.',
  'attack on titan':
    'Umat manusia yang terkurung di balik benteng raksasa berjuang mati-matian mempertahankan kelangsungan hidup dari ancaman monster raksasa pemakan manusia yang dikenal sebagai Titan.',
  'demon slayer: kimetsu no yaiba':
    'Setelah keluarganya dibantai oleh iblis dan adiknya berubah menjadi monster, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis demi membalaskan dendam dan menyembuhkan sang adik.',
  'top gun: maverick':
    'Setelah puluhan tahun mengabdi sebagai penerbang ulung Angkatan Laut, Pete "Maverick" Mitchell ditugaskan melatih skuadron lulusan elit terbaik untuk menjalankan misi berisiko tinggi yang menuntut pengorbanan tertinggi.',
  'house of the dragon':
    'Kisah epik wangsa Targaryen ratusan tahun sebelum peristiwa Game of Thrones, yang mencatat awal mula perang saudara paling berdarah dalam perebutan takhta Iron Throne di Westeros.',
  'the last of us':
    'Dua puluh tahun setelah wabah jamur misterius memusnahkan peradaban, seorang penyintas tangguh bernama Joel disewa untuk menyelundupkan seorang gadis muda melintasi wilayah Amerika yang berbahaya.',
  'jujutsu kaisen':
    'Yuji Itadori, siswa SMA dengan bakat fisik luar biasa, menelan artefak terkutuk dari Raja Kutukan dan bergabung dengan Akademi Jujutsu untuk membasmi roh-roh kutukan yang mengancam dunia manusia.',
  'avatar: the way of water':
    'Jake Sully dan Neytiri telah berkeluarga dan melakukan segalanya untuk tetap bersama. Namun saat ancaman lama kembali, mereka harus mengungsi dan menjelajahi wilayah klan laut Pandora.',
  'the dark knight':
    'Ketika ancaman keji yang dikenal sebagai Joker menebar kekacauan di jalanan Gotham, Batman harus menghadapi salah satu ujian psikologis dan fisik terberat untuk menegakkan keadilan.',
  'spider-man: across the spider-verse':
    'Miles Morales terlempar melintasi Multiverse, di mana ia bertemu dengan tim Spider-People yang bertugas melindungi keberadaan semesta dari ancaman besar yang tak terduga.',
  'deadpool & wolverine':
    'Wade Wilson yang lesu menghadapi krisis eksistensial terseret ke dalam petualangan lintas dimensi bersama Wolverine untuk menyelamatkan dunianya.',
  'gladiator ii':
    'Bertahun-tahun setelah menyaksikan kematian pahlawan Maximus di tangan pamannya, Lucius harus memasuki Colosseum setelah rumahnya ditaklukkan oleh kaisar tirani yang memerintah Roma.',
  'fallout':
    'Dua ratus tahun setelah kiamat nuklir, seorang penghuni bungker yang damai terpaksa keluar ke permukaan bumi yang liar, berbahaya, dan aneh untuk mencari ayahnya.',
  'arcane':
    'Di tengah ketegangan antara kota utopia Piltover dan kota bawah tanah Zaun yang tertindas, dua saudara perempuan bertarung di pihak yang berseberangan dalam perang teknologi dan sihir.',
  'one piece':
    'Monkey D. Luffy bersama kru Bajak Laut Topi Jerami mengarungi samudra Grand Line yang penuh bahaya untuk menemukan harta karun legendaris dan menjadi Raja Bajak Laut berikutnya.',
};

const memoryTranslationCache = new Map<string, string>();

/**
 * Checks whether the text already looks like Bahasa Indonesia
 */
function isIndonesian(text: string): boolean {
  if (!text || text.length < 15) return false;
  const sample = text.toLowerCase();

  const idWords = [
    ' yang ', ' dan ', ' di ', ' dari ', ' untuk ', ' pada ', ' dengan ',
    ' adalah ', ' sebuah ', ' seorang ', ' dalam ', ' saat ', ' oleh ',
    ' mereka ', ' ia ', ' dia ', ' kehidupan ', ' perjalanan ', ' dunia ',
    ' kisah ', ' melawan ', ' bersama ', ' setelah ', ' demi ', ' membalas '
  ];

  let idScore = 0;
  for (const w of idWords) {
    if (sample.includes(w)) idScore++;
  }

  return idScore >= 2;
}

/**
 * Translates any synopsis to Indonesian, using local verified dictionary first,
 * then in-memory cache, then the backend translate endpoint or Google GTX fallback.
 */
export async function translateToIndonesian(text: string, titleHint?: string): Promise<string> {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed === 'Belum ada sinopsis untuk tayangan ini.' || trimmed === 'Informasi sinopsis belum tersedia.') {
    return 'Sinopsis dalam Bahasa Indonesia sedang disiapkan.';
  }

  // 1. Check title dictionary
  if (titleHint) {
    const cleanHint = titleHint.toLowerCase().trim();
    for (const [key, val] of Object.entries(KNOWN_SYNOPSES)) {
      if (cleanHint.includes(key) || key.includes(cleanHint)) {
        return val;
      }
    }
  }

  // 2. Check if already Indonesian
  if (isIndonesian(trimmed)) {
    return trimmed;
  }

  // 3. Check memory cache
  if (memoryTranslationCache.has(trimmed)) {
    return memoryTranslationCache.get(trimmed)!;
  }

  // 4. Check sessionStorage cache
  try {
    const sessionKey = `zhafx_tr_${trimmed.slice(0, 32)}`;
    const saved = sessionStorage.getItem(sessionKey);
    if (saved) {
      memoryTranslationCache.set(trimmed, saved);
      return saved;
    }
  } catch {
    // sessionStorage not available
  }

  // 5. Query local backend /api/translate
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.translated) {
        memoryTranslationCache.set(trimmed, data.translated);
        try {
          const sessionKey = `zhafx_tr_${trimmed.slice(0, 32)}`;
          sessionStorage.setItem(sessionKey, data.translated);
        } catch {}
        return data.translated;
      }
    }
  } catch {
    // Fallback directly to Google Translate GTX
  }

  // 6. Direct client-side Google GTX fallback
  try {
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=id&dt=t&q=${encodeURIComponent(trimmed)}`;
    const gtxRes = await fetch(gtxUrl, { signal: AbortSignal.timeout(4000) });
    if (gtxRes.ok) {
      const gtxData = await gtxRes.json();
      if (Array.isArray(gtxData) && Array.isArray(gtxData[0])) {
        const translated = gtxData[0].map((c: any) => c[0] || '').join('').trim();
        if (translated) {
          memoryTranslationCache.set(trimmed, translated);
          return translated;
        }
      }
    }
  } catch {
    // ignore
  }

  return trimmed;
}
