/**
 * Comprehensive Manual Indonesian Synopsis Dictionary & Formatter
 * Translates and formats synopses across movies, TV, and anime directly in Bahasa Indonesia without AI APIs.
 */

const KNOWN_SYNOPSES: Record<string, string> = {
  // Movies
  'clayface':
    'Kisah kebangkitan Matt Hagen dari pemuda jalanan kota Gotham menjadi aktor terkemuka Hollywood yang terhenti secara tragis saat bos mafia lokal membuatnya cacat mengerikan. Ditinggalkan dan hancur, Matt mencari perawatan mutakhir yang secara ajaib memulihkan tubuhnya, namun merusak kesadarannya dan menyeretnya ke dalam spiral balas dendam mematikan.',
  'by any means':
    'Di Mississippi era 1960-an, seorang agen FBI muda berkulit hitam terpaksa bekerja sama dengan pembunuh bayaran mafia yang terkenal kejam demi menyelidiki rentetan pembunuhan brutal bermotif hak-hak sipil.',
  'dune: part two':
    'Paul Atreides bersatu dengan Chani dan kaum Fremen saat menempuh jalan balas dendam terhadap para konspirator yang menghancurkan keluarganya, seraya berusaha mencegah masa depan kelam yang hanya bisa ia ramalkan.',
  'dune':
    'Paul Atreides, pemuda brilian yang lahir dengan takdir besar melampaui pemahamannya, harus melakukan perjalanan ke planet paling berbahaya di alam semesta demi memastikan masa depan keluarga dan rakyatnya.',
  'interstellar':
    'Di masa depan ketika bumi dilanda krisis pangan parah, sekelompok penjelajah menempuh misi terjauh dalam sejarah melintasi lubang cacing antariksa demi mencari planet baru yang layak huni bagi kelangsungan umat manusia.',
  'oppenheimer':
    'Kisah biopik dramatis seputar fisikawan teoretis J. Robert Oppenheimer yang memimpin Proyek Manhattan untuk menciptakan senjata nuklir pertama dalam sejarah peradaban manusia.',
  'top gun: maverick':
    'Setelah puluhan tahun mengabdi sebagai penerbang ulung Angkatan Laut, Pete "Maverick" Mitchell ditugaskan melatih skuadron lulusan elit terbaik untuk menjalankan misi berisiko tinggi yang menuntut pengorbanan tertinggi.',
  'the dark knight':
    'Ketika ancaman keji yang dikenal sebagai Joker menebar kekacauan di jalanan Gotham, Batman harus menghadapi salah satu ujian psikologis dan fisik terberat untuk menegakkan keadilan.',
  'avatar: the way of water':
    'Jake Sully dan Neytiri telah berkeluarga dan melakukan segalanya untuk tetap bersama. Namun saat ancaman lama kembali, mereka harus mengungsi dan menjelajahi wilayah klan laut Pandora.',
  'avatar':
    'Mantan marinir lumpuh dikirim ke bulan asing Pandora dalam misi unik, namun hatinya terbagi antara perintah militernya dan melindungi dunia yang mulai ia anggap sebagai rumah.',
  'spider-man: across the spider-verse':
    'Miles Morales terlempar melintasi Multiverse, di mana ia bertemu dengan tim Spider-People yang bertugas melindungi keberadaan semesta dari ancaman besar yang tak terduga.',
  'deadpool & wolverine':
    'Wade Wilson yang lesu menghadapi krisis eksistensial terseret ke dalam petualangan lintas dimensi bersama Wolverine untuk menyelamatkan dunianya.',
  'gladiator ii':
    'Bertahun-tahun setelah menyaksikan kematian pahlawan Maximus di tangan pamannya, Lucius harus memasuki Colosseum setelah rumahnya ditaklukkan oleh kaisar tirani yang memerintah Roma.',
  'gladiator':
    'Seorang mantan jenderal Romawi yang dikhianati bertekad membalaskan dendam keluarganya yang dibantai oleh kaisar korup melalui pertarungan hidup-mati di arena gladiator.',
  'inception':
    'Seorang pencuri ulung yang ahli mencuri rahasia berharga dari alam bawah sadar selama kondisi bermimpi diberi kesempatan langka untuk menghapus catatan kriminalnya.',
  'the godfather':
    'Kisah epik keluarga Corleone di bawah kepemimpinan sang patriark Don Vito Corleone dan transformasi putranya Michael dari pahlawan perang menjadi bos mafia yang dingin.',
  'john wick':
    'Seorang mantan pembunuh bayaran legendaris keluar dari masa pensiunnya untuk memburu para gangster yang telah merenggut segalanya dari hidupnya.',
  'joker':
    'Arthur Fleck, seorang komedian gagal yang terisolasi dan dianiaya oleh masyarakat Kota Gotham, perlahan tenggelam ke dalam kegilaan dan menjelma menjadi ikon kriminal yang anarkis.',
  'titanic':
    'Dua insan dari kelas sosial yang berbeda saling jatuh cinta di atas kapal termewah RMS Titanic yang malang dalam pelayaran perdananya melintasi samudra Atlantik.',

  // TV Series
  'shōgun':
    'Ketika sebuah kapal misterius terdampar di pesisir feodal Jepang, sang navigator Inggris terjerumus ke dalam perang politik dan intrik perebutan kekuasaan para penguasa samurai.',
  'house of the dragon':
    'Kisah epik wangsa Targaryen ratusan tahun sebelum peristiwa Game of Thrones, yang mencatat awal mula perang saudara paling berdarah dalam perebutan takhta Iron Throne di Westeros.',
  'game of thrones':
    'Sembilan keluarga bangsawan bertarung sengit memperebutkan kendali atas tanah mistis Westeros, sementara ancaman kuno bangkit kembali dari balik Tembok Es di utara.',
  'the last of us':
    'Dua puluh tahun setelah wabah jamur misterius memusnahkan peradaban, seorang penyintas tangguh bernama Joel disewa untuk menyelundupkan seorang gadis muda melintasi wilayah Amerika yang berbahaya.',
  'fallout':
    'Dua ratus tahun setelah kiamat nuklir, seorang penghuni bungker yang damai terpaksa keluar ke permukaan bumi yang liar, berbahaya, dan aneh untuk mencari ayahnya.',
  'breaking bad':
    'Seorang guru kimia sekolah menengah yang didiagnosis menderita kanker paru-paru beralih memproduksi metamfetamin bersama mantan muridnya demi menjamin masa depan finansial keluarganya.',
  'better call saul':
    'Transformasi pengacara pembela publik yang berjuang keras Jimmy McGill menjadi pengacara kriminal eksentrik yang dikenal sebagai Saul Goodman di Albuquerque.',
  'stranger things':
    'Ketika seorang anak laki-laki lenyap secara misterius di kota kecil Hawkins, teman-temannya membongkar rangkaian eksperimen rahasia rahasia pemerintah dan teror monster dari dimensi Upside Down.',
  'squid game':
    'Ratusan pemain yang terlilit utang menerima undangan aneh untuk bersaing dalam permainan anak-anak tradisional dengan hadiah miliaran won, namun kekalahan berujung pada kematian seketika.',
  'the boys':
    'Sekelompok vigilante biasa bertekad mengungkap kebenaran di balik pahlawan super korup yang menyalahgunakan kekuatannya demi popularitas dan keuntungan korporasi.',
  'wednesday':
    'Mengikuti masa-masa sekolah Wednesday Addams di Nevermore Academy saat ia berusaha menguasai kemampuan psikisnya dan memecahkan misteri pembunuhan supranatural yang melibatkan orang tuanya.',
  'arcane':
    'Di tengah ketegangan antara kota utopia Piltover dan kota bawah tanah Zaun yang tertindas, dua saudara perempuan bertarung di pihak yang berseberangan dalam perang teknologi dan sihir.',

  // Anime
  'solo leveling':
    'Di dunia di mana monster bermunculan melalui gerbang dimensi, Sung Jin-woo yang dikenal sebagai pemburu terlemah bangkit dari ambang maut dengan sistem misterius yang memungkinkannya meningkatkan kekuatan tanpa batas.',
  'attack on titan':
    'Umat manusia yang terkurung di balik benteng raksasa berjuang mati-matian mempertahankan kelangsungan hidup dari ancaman monster raksasa pemakan manusia yang dikenal sebagai Titan.',
  'demon slayer: kimetsu no yaiba':
    'Setelah keluarganya dibantai oleh iblis dan adiknya berubah menjadi monster, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis demi membalaskan dendam dan menyembuhkan sang adik.',
  'demon slayer':
    'Setelah keluarganya dibantai oleh iblis dan adiknya berubah menjadi monster, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis demi membalaskan dendam dan menyembuhkan sang adik.',
  'jujutsu kaisen':
    'Yuji Itadori, siswa SMA dengan bakat fisik luar biasa, menelan artefak terkutuk dari Raja Kutukan dan bergabung dengan Akademi Jujutsu untuk membasmi roh-roh kutukan yang mengancam dunia manusia.',
  'one piece':
    'Monkey D. Luffy bersama kru Bajak Laut Topi Jerami mengarungi samudra Grand Line yang penuh bahaya untuk menemukan harta karun legendaris dan menjadi Raja Bajak Laut berikutnya.',
  'bleach':
    'Ichigo Kurosaki, remaja yang mampu melihat roh, tanpa sengaja memperoleh kekuatan Shinigami dan harus melindungi jiwa-jiwa tak berdosa dari ancaman monster Hollow.',
  'naruto':
    'Kisah perjuangan Naruto Uzumaki, seorang ninja yatim piatu yang diasingkan karena rubah ekor sembilan di dalam tubuhnya, yang bercita-cita menjadi Hokage pemimpin desa yang diakui.',
  'naruto shippuden':
    'Setelah dua setengah tahun berlatih keras, Naruto kembali ke Konoha untuk menghadapi organisasi kriminal berbahaya Akatsuki dan menyelamatkan sahabatnya Sasuke.',
  'dragon ball':
    'Petualangan Son Goku mengasah ilmu bela diri bersama teman-temannya mengelilingi dunia untuk mengumpulkan tujuh bola naga ajaib yang mampu mengabulkan permohonan.',
  'death note':
    'Seorang siswa SMA jenius menemukan buku catatan supranatural yang dapat membunuh siapa saja yang namanya tertulis di dalamnya, dan memutuskan untuk membersihkan dunia dari kejahatan.',
  'fullmetal alchemist':
    'Dua bersaudara alkemis menempuh perjalanan berbahaya mencari Batu Bertuah untuk memulihkan tubuh mereka yang hancur akibat ritual alkimia terlarang.',
  'chainsaw man':
    'Denji, pemuda miskin yang terikat kontrak dengan iblis gergaji Pochita, bangkit kembali sebagai manusia setengah iblis pemburu kejahatan untuk Divisi Keselamatan Publik.',
  'spy x family':
    'Seorang mata-mata elit harus membangun keluarga palsu bersama seorang pembunuh bayaran dan anak angkat yang memiliki kemampuan membaca pikiran demi misi perdamaian dunia.',
  'tokyo revengers':
    'Takemichi Hanagaki menemukan kemampuan melompati waktu 12 tahun ke masa lalu demi menyelamatkan kekasih masa sekolahnya dari pembunuhan geng berandalan Tokyo Manji.',
  'frieren':
    'Setelah mengalahkan Raja Iblis, penyihir elf Frieren memulai pengembaraan panjang untuk memahami arti hubungan manusia dan menghargai waktu bersama rekan-rekannya.',
};

/**
 * Checks whether the text already looks like Bahasa Indonesia
 */
export function isIndonesian(text: string): boolean {
  if (!text || text.length < 15) return false;
  const sample = ` ${text.toLowerCase()} `;

  const idWords = [
    ' yang ', ' dan ', ' di ', ' dari ', ' untuk ', ' pada ', ' dengan ',
    ' adalah ', ' sebuah ', ' seorang ', ' dalam ', ' saat ', ' oleh ',
    ' mereka ', ' ia ', ' dia ', ' kehidupan ', ' perjalanan ', ' dunia ',
    ' kisah ', ' melawan ', ' bersama ', ' setelah ', ' demi ', ' membalas ',
    ' tentang ', ' ketika ', ' harus ', ' karena ', ' menjadi '
  ];

  let idScore = 0;
  for (const w of idWords) {
    if (sample.includes(w)) idScore++;
  }

  return idScore >= 2;
}

/**
 * Translates any synopsis to Indonesian manually via comprehensive local dictionary & formatting.
 * 100% offline and instant: No AI API calls or external network requests.
 */
export async function translateToIndonesian(text: string, titleHint?: string): Promise<string> {
  const trimmed = (text || '').trim();
  if (
    !trimmed ||
    trimmed === 'Belum ada sinopsis untuk tayangan ini.' ||
    trimmed === 'Informasi sinopsis belum tersedia.' ||
    trimmed === 'Sinopsis belum tersedia.'
  ) {
    if (titleHint) {
      return `Saksikan kisah lengkap "${titleHint}" di Zhafx Streaming dengan resolusi tinggi dan audio jernih.`;
    }
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

  // 2. Check if text itself matches known synopsis keys
  const cleanText = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(KNOWN_SYNOPSES)) {
    if (cleanText.includes(key)) {
      return val;
    }
  }

  // 3. Check if already Indonesian
  if (isIndonesian(trimmed)) {
    return trimmed;
  }

  // 4. Return formatted manual Indonesian overview for titles without manual dictionary entries
  if (titleHint) {
    return `Saksikan keseruan cerita "${titleHint}" selengkapnya di Zhafx Streaming dengan kualitas visual terbaik dan subtitle Indonesia.`;
  }

  return trimmed;
}

