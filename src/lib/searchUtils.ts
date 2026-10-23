/**
 * Smart Search Engine Utilities for ZHAFX Streaming
 * Handles:
 * - Levenshtein & Damerau-Levenshtein typo distance
 * - String similarity & token matching
 * - Corpus dictionary of popular titles (Movies, Series, Anime)
 * - Typo detection & auto-suggestion ("Did you mean?")
 * - Instant alias / acronym resolution ("aot", "jjk", "op", "spiderman")
 * - Airing status resolution (Sedang Tayang, Selesai, Segera Hadir)
 * - Genre mapping (Indonesian <-> English)
 * - Relevance score calculation & multi-attribute sorting
 */

import { Title } from '../types';

// ============================================================================
// 1. String Cleaning & Distance Metrics
// ============================================================================

export function cleanText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ')   // replace non-alphanumeric with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Damerau-Levenshtein Distance between two strings
 * Handles insertions, deletions, substitutions, and adjacent transpositions
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Normalized similarity score between 0.0 (completely different) and 1.0 (identical)
 */
export function stringSimilarity(a: string, b: string): number {
  const s1 = cleanText(a);
  const s2 = cleanText(b);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = damerauLevenshteinDistance(s1, s2);
  return Math.max(0, 1 - distance / maxLen);
}

// ============================================================================
// 2. Comprehensive Catalog Dictionary & Instant Typo Map
// ============================================================================

export const COMMON_TYPO_MAP: Record<string, string> = {
  // Common typo misspellings
  fightclb: 'Fight Club',
  fightclub: 'Fight Club',
  avtar: 'Avatar',
  avatr: 'Avatar',
  avangers: 'Avengers',
  avenger: 'Avengers',
  'demon slyer': 'Demon Slayer',
  demonslayer: 'Demon Slayer',
  'on peace': 'One Piece',
  onepece: 'One Piece',
  onpiece: 'One Piece',
  spidrman: 'Spider-Man',
  spiderman: 'Spider-Man',
  spidermen: 'Spider-Man',
  naruo: 'Naruto',
  narutoo: 'Naruto',
  narutoos: 'Naruto',
  jujutso: 'Jujutsu Kaisen',
  jujutzu: 'Jujutsu Kaisen',
  'jujutsu kaysen': 'Jujutsu Kaisen',
  'attck on titan': 'Attack on Titan',
  'atack on titan': 'Attack on Titan',
  'attack on titn': 'Attack on Titan',
  'solo levelng': 'Solo Leveling',
  sololeveling: 'Solo Leveling',
  sololevel: 'Solo Leveling',
  chainsw: 'Chainsaw Man',
  chainsaw: 'Chainsaw Man',
  chainsawman: 'Chainsaw Man',
  interstelar: 'Interstellar',
  intrestellar: 'Interstellar',
  interstellar2: 'Interstellar',
  openeimer: 'Oppenheimer',
  oppenhiemer: 'Oppenheimer',
  oppenhaimer: 'Oppenheimer',
  'drgon ball': 'Dragon Ball',
  dragonball: 'Dragon Ball',
  dandadn: 'Dandadan',
  dandadaan: 'Dandadan',
  blech: 'Bleach',
  bleech: 'Bleach',
  'huter x hunter': 'Hunter x Hunter',
  hxh: 'Hunter x Hunter',
  frirn: 'Frieren',
  frieran: 'Frieren',
  kaiju8: 'Kaiju No. 8',
  'kaiju no 8': 'Kaiju No. 8',
  bluelock: 'Blue Lock',
  'blue lok': 'Blue Lock',
  'stranger thing': 'Stranger Things',
  strangerthing: 'Stranger Things',
  'breking bad': 'Breaking Bad',
  'braking bad': 'Breaking Bad',
  squidgame: 'Squid Game',
  squidgam: 'Squid Game',
  peakyblinders: 'Peaky Blinders',
  peakyblinder: 'Peaky Blinders',
  peaky: 'Peaky Blinders',
  gladiatr: 'Gladiator',
  gladiato: 'Gladiator',
  topgun: 'Top Gun',
  'top gun 2': 'Top Gun: Maverick',
  batmen: 'Batman',
  supermen: 'Superman',
  ironman: 'Iron Man',
  transformer: 'Transformers',
  jurassic: 'Jurassic Park',
  'jurassic world': 'Jurassic Park',
  wick: 'John Wick',
  johnwick: 'John Wick',
  matrix: 'The Matrix',
  thematrix: 'The Matrix',

  // Acronyms & Popular Japanese Aliases
  aot: 'Attack on Titan',
  jjk: 'Jujutsu Kaisen',
  op: 'One Piece',
  csm: 'Chainsaw Man',
  got: 'Game of Thrones',
  hotd: 'House of the Dragon',
  tlou: 'The Last of Us',
  dbz: 'Dragon Ball',
  mha: 'My Hero Academia',
  bnha: 'My Hero Academia',
  fmab: 'Fullmetal Alchemist',
  sao: 'Sword Art Online',
  opm: 'One Punch Man',
  tybw: 'Bleach',
  'kimetsu no yaiba': 'Demon Slayer',
  kimetsu: 'Demon Slayer',
  tanjiro: 'Demon Slayer',
  'shingeki no kyojin': 'Attack on Titan',
  'boku no hero': 'My Hero Academia',
  'boku no hero academia': 'My Hero Academia',
  'sousou no frieren': 'Frieren',
  'la casa de papel': 'Money Heist',
};

export const POPULAR_TITLES_DICTIONARY: { title: string; type: 'movie' | 'tv' | 'anime'; aliases: string[] }[] = [
  // Anime
  { title: 'Demon Slayer: Kimetsu no Yaiba', type: 'anime', aliases: ['demon slayer', 'kimetsu no yaiba', 'tanjiro', 'kimetsu', 'demonslayer', 'nezuko'] },
  { title: 'One Piece', type: 'anime', aliases: ['one piece', 'luffy', 'mugiwara', 'op', 'onepece', 'on peace', 'zoro', 'sanji'] },
  { title: 'Naruto', type: 'anime', aliases: ['naruto', 'naruto shippuden', 'shippuden', 'boruto', 'hokage', 'narutoo', 'naruo', 'sasuke', 'kakashi'] },
  { title: 'Attack on Titan', type: 'anime', aliases: ['attack on titan', 'shingeki no kyojin', 'eren yeager', 'eren', 'aot', 'atack on titan', 'attck on titan', 'levi'] },
  { title: 'Jujutsu Kaisen', type: 'anime', aliases: ['jujutsu kaisen', 'jjk', 'gojo', 'sukuna', 'itadori', 'jujutsu', 'jujutso', 'jujutzu'] },
  { title: 'Solo Leveling', type: 'anime', aliases: ['solo leveling', 'sung jinwoo', 'arise', 'ore dake level up', 'sololeveling', 'solo levelng', 'sololevel'] },
  { title: 'Chainsaw Man', type: 'anime', aliases: ['chainsaw man', 'denji', 'makima', 'csm', 'chainsw', 'chainsawman', 'pochita'] },
  { title: 'Bleach', type: 'anime', aliases: ['bleach', 'thousand-year blood war', 'ichigo', 'tybw', 'blech', 'bleech', 'shinigami'] },
  { title: 'Dragon Ball', type: 'anime', aliases: ['dragon ball', 'dragon ball z', 'dragon ball super', 'goku', 'dbz', 'drgon ball', 'dragonball', 'vegeta'] },
  { title: 'Death Note', type: 'anime', aliases: ['death note', 'light yagami', 'kira', 'ryuk', 'l lawliet'] },
  { title: 'Dandadan', type: 'anime', aliases: ['dandadan', 'dandadn', 'momo ayase', 'okarun', 'turbo granny'] },
  { title: 'Kaiju No. 8', type: 'anime', aliases: ['kaiju no 8', 'kaiju no. 8', 'kafka hibino', 'kaiju8'] },
  { title: 'Blue Lock', type: 'anime', aliases: ['blue lock', 'bluelock', 'isagi yoichi', 'ego jinpachi'] },
  { title: 'Frieren: Beyond Journey\'s End', type: 'anime', aliases: ['frieren', 'sousou no frieren', 'frieren beyond journey', 'frirn', 'frieran'] },
  { title: 'My Hero Academia', type: 'anime', aliases: ['my hero academia', 'boku no hero academia', 'deku', 'mha', 'bnha', 'all might'] },
  { title: 'Hunter x Hunter', type: 'anime', aliases: ['hunter x hunter', 'gon', 'killua', 'hxh', 'huter x hunter', 'kurapika'] },
  { title: 'Spy x Family', type: 'anime', aliases: ['spy x family', 'anya', 'loid forger', 'spy family', 'yor forger'] },
  { title: 'Tokyo Ghoul', type: 'anime', aliases: ['tokyo ghoul', 'kaneki', 'ghoul', 'ken kaneki'] },
  { title: 'Fullmetal Alchemist: Brotherhood', type: 'anime', aliases: ['fullmetal alchemist', 'fmab', 'edward elric', 'alphonse elric'] },
  { title: 'Sword Art Online', type: 'anime', aliases: ['sword art online', 'sao', 'kirito', 'asuna'] },
  { title: 'Black Clover', type: 'anime', aliases: ['black clover', 'asta', 'yuno'] },
  { title: 'Tokyo Revengers', type: 'anime', aliases: ['tokyo revengers', 'takemichi', 'mikey', 'draken'] },
  { title: 'One Punch Man', type: 'anime', aliases: ['one punch man', 'saitama', 'opm', 'genos'] },
  { title: 'Vinland Saga', type: 'anime', aliases: ['vinland saga', 'thorfinn', 'askeladd'] },
  { title: 'Haikyuu', type: 'anime', aliases: ['haikyuu', 'hinata shoyo', 'kageyama', 'karasuno'] },

  // Movies
  { title: 'Fight Club', type: 'movie', aliases: ['fight club', 'fightclub', 'tyler durden', 'brad pitt', 'edward norton', 'fightclb'] },
  { title: 'The Shawshank Redemption', type: 'movie', aliases: ['shawshank', 'the shawshank redemption', 'andy dufresne', 'morgan freeman'] },
  { title: 'The Dark Knight', type: 'movie', aliases: ['the dark knight', 'dark knight', 'batman', 'joker', 'christian bale', 'batmen'] },
  { title: 'Inception', type: 'movie', aliases: ['inception', 'leonardo dicaprio', 'christopher nolan'] },
  { title: 'Interstellar', type: 'movie', aliases: ['interstellar', 'interstelar', 'intrestellar', 'cooper', 'nolan interstellar'] },
  { title: 'Avatar', type: 'movie', aliases: ['avatar', 'avatar 2', 'avatar the way of water', 'pandora', 'james cameron', 'avtar', 'avatr'] },
  { title: 'Spider-Man', type: 'movie', aliases: ['spider-man', 'spiderman', 'spidrman', 'spidermen', 'no way home', 'across the spider-verse', 'miles morales', 'peter parker'] },
  { title: 'Deadpool & Wolverine', type: 'movie', aliases: ['deadpool', 'deadpool 3', 'wolverine', 'ryan reynolds', 'deadpool and wolverine'] },
  { title: 'Dune: Part Two', type: 'movie', aliases: ['dune', 'dune part 2', 'paul atreides', 'timothee chalamet', 'dune 2'] },
  { title: 'Oppenheimer', type: 'movie', aliases: ['oppenheimer', 'robert oppenheimer', 'cillian murphy', 'openeimer', 'oppenhiemer', 'oppenhaimer'] },
  { title: 'Gladiator', type: 'movie', aliases: ['gladiator', 'gladiator 2', 'gladiator ii', 'maximus', 'gladiatr'] },
  { title: 'Top Gun: Maverick', type: 'movie', aliases: ['top gun', 'top gun maverick', 'maverick', 'tom cruise', 'topgun'] },
  { title: 'John Wick', type: 'movie', aliases: ['john wick', 'keanu reeves', 'baba yaga', 'johnwick', 'wick'] },
  { title: 'Avengers: Endgame', type: 'movie', aliases: ['avengers', 'endgame', 'infinity war', 'marvel', 'iron man', 'avangers', 'avenger'] },
  { title: 'The Matrix', type: 'movie', aliases: ['matrix', 'the matrix', 'neo', 'keanu matrix'] },
  { title: 'Titanic', type: 'movie', aliases: ['titanic', 'jack and rose', 'leonardo titanic'] },
  { title: 'Moana 2', type: 'movie', aliases: ['moana', 'moana 2', 'disney moana', 'maui'] },
  { title: 'Inside Out 2', type: 'movie', aliases: ['inside out', 'inside out 2', 'disney pixar', 'anxiety'] },
  { title: 'Kung Fu Panda 4', type: 'movie', aliases: ['kung fu panda', 'po', 'kungfu panda'] },

  // TV Shows
  { title: 'House of the Dragon', type: 'tv', aliases: ['house of the dragon', 'hotd', 'targaryen', 'dance of the dragons'] },
  { title: 'Game of Thrones', type: 'tv', aliases: ['game of thrones', 'got', 'westeros', 'daenerys', 'jon snow'] },
  { title: 'The Last of Us', type: 'tv', aliases: ['the last of us', 'tlou', 'joel and ellie', 'pedro pascal'] },
  { title: 'Fallout', type: 'tv', aliases: ['fallout', 'vault-tec', 'lucy maclean', 'ghoul'] },
  { title: 'Arcane', type: 'tv', aliases: ['arcane', 'league of legends', 'jinx', 'vi', 'piltover'] },
  { title: 'Stranger Things', type: 'tv', aliases: ['stranger things', 'eleven', 'upside down', 'hawkins', 'strangerthing'] },
  { title: 'Breaking Bad', type: 'tv', aliases: ['breaking bad', 'walter white', 'heisenberg', 'jesse pinkman', 'breking bad'] },
  { title: 'Squid Game', type: 'tv', aliases: ['squid game', 'squidgame', 'round six'] },
  { title: 'The Boys', type: 'tv', aliases: ['the boys', 'homelander', 'butcher', 'billy butcher'] },
  { title: 'Wednesday', type: 'tv', aliases: ['wednesday', 'addams family', 'jenna ortega'] },
  { title: 'Peaky Blinders', type: 'tv', aliases: ['peaky blinders', 'thomas shelby', 'peakyblinders'] },
  { title: 'Shogun', type: 'tv', aliases: ['shogun', 'shōgun', 'toranaga', 'japan'] },
];

/**
 * Finds if a user query matches a known typo, acronym, or fuzzy similarity.
 * Returns the best suggested title.
 */
export function findTypoSuggestion(query: string): { suggestedTitle: string; matchedItem?: typeof POPULAR_TITLES_DICTIONARY[0] } | null {
  const cleaned = cleanText(query);
  if (cleaned.length < 2) return null;

  // 1. Direct match in Common Typo Map
  if (COMMON_TYPO_MAP[cleaned]) {
    const canonical = COMMON_TYPO_MAP[cleaned];
    if (cleanText(canonical) !== cleaned) {
      const match = POPULAR_TITLES_DICTIONARY.find((item) => cleanText(item.title) === cleanText(canonical));
      return {
        suggestedTitle: canonical,
        matchedItem: match,
      };
    }
  }

  let bestMatch: typeof POPULAR_TITLES_DICTIONARY[0] | null = null;
  let highestScore = 0;
  let lowestDistance = 999;

  for (const item of POPULAR_TITLES_DICTIONARY) {
    const mainScore = stringSimilarity(cleaned, item.title);
    const mainDist = damerauLevenshteinDistance(cleaned, cleanText(item.title));

    if (mainScore > highestScore) {
      highestScore = mainScore;
      lowestDistance = mainDist;
      bestMatch = item;
    }

    for (const alias of item.aliases) {
      const aliasClean = cleanText(alias);
      if (aliasClean === cleaned) {
        if (cleanText(item.title) !== cleaned) {
          return {
            suggestedTitle: item.title,
            matchedItem: item,
          };
        }
      }

      const aliasScore = stringSimilarity(cleaned, aliasClean);
      const aliasDist = damerauLevenshteinDistance(cleaned, aliasClean);

      // Substring bonus
      const isSub = aliasClean.includes(cleaned) || cleaned.includes(aliasClean);
      const adjustedScore = isSub ? Math.max(aliasScore, 0.85) : aliasScore;

      if (adjustedScore > highestScore) {
        highestScore = adjustedScore;
        lowestDistance = aliasDist;
        bestMatch = item;
      }
    }
  }

  if (bestMatch) {
    const isExact = cleanText(bestMatch.title) === cleaned;
    if (isExact) return null;

    if (highestScore >= 0.60 || (lowestDistance <= 3 && cleaned.length >= 4)) {
      return {
        suggestedTitle: bestMatch.title,
        matchedItem: bestMatch,
      };
    }
  }

  return null;
}

// ============================================================================
// 3. Airing Status & Genre Resolution
// ============================================================================

export type AiringStatusKey = 'all' | 'airing' | 'completed' | 'upcoming';

export interface AiringStatusOption {
  key: AiringStatusKey;
  label: string;
}

export const AIRING_STATUS_OPTIONS: AiringStatusOption[] = [
  { key: 'all', label: 'Semua Status' },
  { key: 'airing', label: 'Sedang Tayang' },
  { key: 'completed', label: 'Selesai' },
  { key: 'upcoming', label: 'Segera Tayang' },
];

export function getStandardizedStatus(item: Title): AiringStatusKey {
  const rawStatus = (item.status || '').toUpperCase().trim();
  const currentYear = new Date().getFullYear();
  const itemYear = parseInt(item.year, 10);

  if (
    rawStatus === 'RELEASING' ||
    rawStatus === 'AIRING' ||
    rawStatus === 'RETURNING SERIES' ||
    rawStatus === 'IN PRODUCTION' ||
    rawStatus === 'PILOT'
  ) {
    return 'airing';
  }

  if (
    rawStatus === 'FINISHED' ||
    rawStatus === 'ENDED' ||
    rawStatus === 'CANCELED' ||
    rawStatus === 'CANCELLED' ||
    rawStatus === 'RELEASED'
  ) {
    return 'completed';
  }

  if (
    rawStatus === 'NOT_YET_RELEASED' ||
    rawStatus === 'UPCOMING' ||
    rawStatus === 'PLANNED'
  ) {
    return 'upcoming';
  }

  if (!isNaN(itemYear)) {
    if (itemYear > currentYear) return 'upcoming';
    if (item.type === 'tv' || item.type === 'anime') {
      if (itemYear === currentYear) return 'airing';
      return 'completed';
    }
    if (itemYear === currentYear) return 'airing';
    return 'completed';
  }

  return 'completed';
}

export function getStatusBadgeLabel(status: AiringStatusKey): { text: string; color: string } {
  switch (status) {
    case 'airing':
      return { text: 'Sedang Tayang', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
    case 'upcoming':
      return { text: 'Segera Hadir', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
    case 'completed':
    default:
      return { text: 'Selesai', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
  }
}

// Indonesian <-> English Genre Mappings
const GENRE_MAP: Record<string, string[]> = {
  '28': ['Action', 'Aksi'],
  'action': ['Action', 'Aksi', '28'],
  'aksi': ['Action', 'Aksi', '28'],
  '12': ['Adventure', 'Petualangan'],
  '10759': ['Action & Adventure', 'Aksi & Petualangan'],
  'adventure': ['Adventure', 'Petualangan', '12'],
  'petualangan': ['Adventure', 'Petualangan', '12'],
  '16': ['Animation', 'Animasi', 'Anime'],
  'animation': ['Animation', 'Animasi', 'Anime', '16'],
  'animasi': ['Animation', 'Animasi', 'Anime', '16'],
  '35': ['Comedy', 'Komedi'],
  'comedy': ['Comedy', 'Komedi', '35'],
  'komedi': ['Comedy', 'Komedi', '35'],
  '80': ['Crime', 'Kriminal'],
  'crime': ['Crime', 'Kriminal', '80'],
  'kriminal': ['Crime', 'Kriminal', '80'],
  '99': ['Documentary', 'Dokumenter'],
  'documentary': ['Documentary', 'Dokumenter', '99'],
  'dokumenter': ['Documentary', 'Dokumenter', '99'],
  '18': ['Drama'],
  'drama': ['Drama', '18'],
  '10751': ['Family', 'Keluarga'],
  'family': ['Family', 'Keluarga', '10751'],
  'keluarga': ['Family', 'Keluarga', '10751'],
  '14': ['Fantasy', 'Fantasi'],
  'fantasy': ['Fantasy', 'Fantasi', '14'],
  'fantasi': ['Fantasy', 'Fantasi', '14'],
  '878': ['Science Fiction', 'Sci-Fi', 'Fiksi Ilmiah'],
  '10765': ['Sci-Fi & Fantasy', 'Fiksi Ilmiah & Fantasi'],
  'sci-fi': ['Science Fiction', 'Sci-Fi', 'Fiksi Ilmiah', '878'],
  'fiksi ilmiah': ['Science Fiction', 'Sci-Fi', 'Fiksi Ilmiah', '878'],
  '27': ['Horror', 'Horor'],
  'horror': ['Horror', 'Horor', '27'],
  'horor': ['Horror', 'Horor', '27'],
  '9648': ['Mystery', 'Misteri'],
  'mystery': ['Mystery', 'Misteri', '9648'],
  'misteri': ['Mystery', 'Misteri', '9648'],
  '10749': ['Romance', 'Romantis', 'Romansa'],
  'romance': ['Romance', 'Romantis', 'Romansa', '10749'],
  'romantis': ['Romance', 'Romantis', 'Romansa', '10749'],
  '53': ['Thriller', 'Cerita Seru'],
  'thriller': ['Thriller', 'Cerita Seru', '53'],
  'cerita seru': ['Thriller', 'Cerita Seru', '53'],
  'supernatural': ['Supernatural', 'Gaib'],
};

export function matchesGenre(item: Title, selectedGenre: string): boolean {
  if (!selectedGenre || selectedGenre === 'all') return true;
  const searchKey = selectedGenre.toLowerCase().trim();
  const synonyms = GENRE_MAP[searchKey] || [searchKey];
  const itemGenres = (item.genres || []).map((g) => g.toLowerCase());

  return synonyms.some((syn) =>
    itemGenres.some((ig) => ig.includes(syn.toLowerCase()) || syn.toLowerCase().includes(ig))
  );
}

export function matchesYear(item: Title, selectedYear: string): boolean {
  if (!selectedYear || selectedYear === 'all') return true;
  const itemYear = parseInt(item.year, 10);
  if (isNaN(itemYear)) return false;

  if (selectedYear === '2010s') {
    return itemYear >= 2010 && itemYear <= 2019;
  }
  if (selectedYear === '2000s') {
    return itemYear >= 2000 && itemYear <= 2009;
  }
  if (selectedYear === 'classic') {
    return itemYear < 2000;
  }

  const exactYear = parseInt(selectedYear, 10);
  if (!isNaN(exactYear)) {
    return itemYear === exactYear;
  }

  return true;
}

// ============================================================================
// 4. Relevance Scoring & Fuzzy Ranking
// ============================================================================

export function calculateRelevanceScore(item: Title, query: string): number {
  const cleanQ = cleanText(query);
  if (!cleanQ) return 0;

  const cleanTitle = cleanText(item.title);
  const cleanOrig = cleanText(item.originalTitle || '');
  const cleanOverview = cleanText(item.overview || '');

  let score = 0;

  if (cleanTitle === cleanQ || cleanOrig === cleanQ) {
    score += 180;
  } else if (cleanTitle.startsWith(cleanQ) || cleanOrig.startsWith(cleanQ)) {
    score += 120;
  } else if (
    new RegExp(`\\b${cleanQ}\\b`, 'i').test(cleanTitle) ||
    new RegExp(`\\b${cleanQ}\\b`, 'i').test(cleanOrig)
  ) {
    score += 90;
  } else if (cleanTitle.includes(cleanQ) || cleanOrig.includes(cleanQ)) {
    score += 70;
  } else {
    const titleSim = Math.max(
      stringSimilarity(cleanQ, cleanTitle),
      stringSimilarity(cleanQ, cleanOrig)
    );
    if (titleSim >= 0.55) {
      score += Math.round(titleSim * 80);
    }
  }

  // Multi-token overlap bonus
  const queryTokens = cleanQ.split(' ').filter(Boolean);
  const titleTokens = cleanTitle.split(' ').filter(Boolean);
  let matchedTokens = 0;
  for (const qt of queryTokens) {
    if (titleTokens.some((tt) => tt.includes(qt) || stringSimilarity(qt, tt) >= 0.70)) {
      matchedTokens++;
    }
  }
  if (queryTokens.length > 0) {
    score += (matchedTokens / queryTokens.length) * 50;
  }

  if (cleanOverview.includes(cleanQ)) {
    score += 20;
  }

  const ratingNum = parseFloat(item.rating) || 0;
  score += ratingNum * 2.0;

  return score;
}

// ============================================================================
// 5. Sorting Engine
// ============================================================================

export type SortKey =
  | 'relevance'
  | 'rating_desc'
  | 'popularity_desc'
  | 'year_desc'
  | 'year_asc'
  | 'title_asc';

export interface SortOption {
  value: SortKey;
  label: string;
}

export const SMART_SORT_OPTIONS: SortOption[] = [
  { value: 'relevance', label: 'Relevansi Terbaik' },
  { value: 'rating_desc', label: 'Rating Tertinggi' },
  { value: 'popularity_desc', label: 'Paling Populer' },
  { value: 'year_desc', label: 'Tahun Rilis (Terbaru)' },
  { value: 'year_asc', label: 'Tahun Rilis (Terlama)' },
  { value: 'title_asc', label: 'Abjad (A - Z)' },
];

export function sortSearchResults(titles: Title[], sortKey: SortKey, query: string): Title[] {
  const scored = titles.map((item) => ({
    item,
    score: calculateRelevanceScore(item, query),
  }));

  switch (sortKey) {
    case 'relevance':
      return scored.sort((a, b) => b.score - a.score).map((s) => s.item);

    case 'rating_desc':
      return [...titles].sort((a, b) => {
        const rA = parseFloat(a.rating) || 0;
        const rB = parseFloat(b.rating) || 0;
        return rB - rA;
      });

    case 'popularity_desc':
      return [...titles].sort((a, b) => {
        const vA = a.voteCount ?? (parseFloat(a.rating) * 10 || 0);
        const vB = b.voteCount ?? (parseFloat(b.rating) * 10 || 0);
        return vB - vA;
      });

    case 'year_desc':
      return [...titles].sort((a, b) => {
        const yA = parseInt(a.year, 10) || 0;
        const yB = parseInt(b.year, 10) || 0;
        return yB - yA;
      });

    case 'year_asc':
      return [...titles].sort((a, b) => {
        const yA = parseInt(a.year, 10) || 9999;
        const yB = parseInt(b.year, 10) || 9999;
        return yA - yB;
      });

    case 'title_asc':
      return [...titles].sort((a, b) => a.title.localeCompare(b.title, 'id'));

    default:
      return titles;
  }
}
