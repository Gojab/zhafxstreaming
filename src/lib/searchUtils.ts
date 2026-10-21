/**
 * Smart Search Engine Utilities for ZHAFX Streaming
 * Handles:
 * - Levenshtein & Damerau-Levenshtein typo distance
 * - String similarity & token matching
 * - Corpus dictionary of popular titles (Movies, Series, Anime)
 * - Typo detection & auto-suggestion ("Did you mean?")
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
// 2. Comprehensive Catalog Dictionary for Typo Correction
// ============================================================================

export const POPULAR_TITLES_DICTIONARY: { title: string; type: 'movie' | 'tv' | 'anime'; aliases: string[] }[] = [
  // Anime
  { title: 'Demon Slayer: Kimetsu no Yaiba', type: 'anime', aliases: ['demon slayer', 'kimetsu no yaiba', 'tanjiro', 'kimetsu'] },
  { title: 'One Piece', type: 'anime', aliases: ['one piece', 'luffy', 'mugiwara', 'op'] },
  { title: 'Naruto', type: 'anime', aliases: ['naruto', 'naruto shippuden', 'shippuden', 'boruto', 'hokage'] },
  { title: 'Attack on Titan', type: 'anime', aliases: ['attack on titan', 'shingeki no kyojin', 'eren yeager', 'eren', 'aot'] },
  { title: 'Jujutsu Kaisen', type: 'anime', aliases: ['jujutsu kaisen', 'jjk', 'gojo', 'sukuna', 'itadori', 'jujutsu'] },
  { title: 'Solo Leveling', type: 'anime', aliases: ['solo leveling', 'sung jinwoo', 'arise', 'ore dake level up'] },
  { title: 'Chainsaw Man', type: 'anime', aliases: ['chainsaw man', 'denji', 'makima', 'csm'] },
  { title: 'Bleach', type: 'anime', aliases: ['bleach', 'thousand-year blood war', 'ichigo', 'tybw'] },
  { title: 'Dragon Ball', type: 'anime', aliases: ['dragon ball', 'dragon ball z', 'dragon ball super', 'goku', 'dbz'] },
  { title: 'Death Note', type: 'anime', aliases: ['death note', 'light yagami', 'kira', 'ryuk'] },
  { title: 'My Hero Academia', type: 'anime', aliases: ['my hero academia', 'boku no hero academia', 'deku', 'mha', 'bnha'] },
  { title: 'Hunter x Hunter', type: 'anime', aliases: ['hunter x hunter', 'gon', 'killua', 'hxh'] },
  { title: 'Frieren: Beyond Journey\'s End', type: 'anime', aliases: ['frieren', 'sousou no frieren', 'frieren beyond journey'] },
  { title: 'Spy x Family', type: 'anime', aliases: ['spy x family', 'anya', 'loid forger', 'spy family'] },
  { title: 'Tokyo Ghoul', type: 'anime', aliases: ['tokyo ghoul', 'kaneki', 'ghoul'] },
  { title: 'Fullmetal Alchemist: Brotherhood', type: 'anime', aliases: ['fullmetal alchemist', 'fmab', 'edward elric'] },
  { title: 'Sword Art Online', type: 'anime', aliases: ['sword art online', 'sao', 'kirito'] },
  { title: 'Black Clover', type: 'anime', aliases: ['black clover', 'asta'] },
  { title: 'Tokyo Revengers', type: 'anime', aliases: ['tokyo revengers', 'takemichi', 'mikey'] },
  { title: 'One Punch Man', type: 'anime', aliases: ['one punch man', 'saitama', 'opm'] },

  // Movies
  { title: 'Avatar', type: 'movie', aliases: ['avatar', 'avatar 2', 'avatar the way of water', 'pandora', 'james cameron'] },
  { title: 'Spider-Man', type: 'movie', aliases: ['spider-man', 'spiderman', 'no way home', 'across the spider-verse', 'into the spider-verse', 'peter parker', 'miles morales'] },
  { title: 'Deadpool & Wolverine', type: 'movie', aliases: ['deadpool', 'deadpool 3', 'wolverine', 'ryan reynolds'] },
  { title: 'The Dark Knight', type: 'movie', aliases: ['the dark knight', 'dark knight', 'batman', 'joker', 'christian bale'] },
  { title: 'Gladiator', type: 'movie', aliases: ['gladiator', 'gladiator 2', 'gladiator ii', 'maximus'] },
  { title: 'Top Gun: Maverick', type: 'movie', aliases: ['top gun', 'top gun maverick', 'maverick', 'tom cruise'] },
  { title: 'Oppenheimer', type: 'movie', aliases: ['oppenheimer', 'robert oppenheimer', 'cillian murphy', 'nolan'] },
  { title: 'Interstellar', type: 'movie', aliases: ['interstellar', 'cooper', 'christopher nolan'] },
  { title: 'Inception', type: 'movie', aliases: ['inception', 'leonardo dicaprio'] },
  { title: 'Avengers: Endgame', type: 'movie', aliases: ['avengers', 'endgame', 'infinity war', 'marvel', 'iron man'] },
  { title: 'Dune: Part Two', type: 'movie', aliases: ['dune', 'dune part 2', 'paul atreides', 'timothee chalamet'] },
  { title: 'John Wick', type: 'movie', aliases: ['john wick', 'keanu reeves', 'baba yaga'] },
  { title: 'Fast & Furious', type: 'movie', aliases: ['fast and furious', 'fast & furious', 'fast x', 'dom toretto'] },
  { title: 'Transformers', type: 'movie', aliases: ['transformers', 'optimus prime', 'bumblebee'] },
  { title: 'Jurassic Park', type: 'movie', aliases: ['jurassic world', 'jurassic park', 'dinosaur'] },
  { title: 'Godzilla x Kong', type: 'movie', aliases: ['godzilla', 'kong', 'monsterverse'] },
  { title: 'Inside Out 2', type: 'movie', aliases: ['inside out', 'inside out 2', 'disney pixar'] },
  { title: 'Moana 2', type: 'movie', aliases: ['moana', 'moana 2', 'disney'] },
  { title: 'Kung Fu Panda 4', type: 'movie', aliases: ['kung fu panda', 'po', 'dreamworks'] },
  { title: 'The Matrix', type: 'movie', aliases: ['matrix', 'the matrix', 'neo'] },
  { title: 'Titanic', type: 'movie', aliases: ['titanic', 'jack and rose'] },
  { title: 'The Lord of the Rings', type: 'movie', aliases: ['lord of the rings', 'lotr', 'frodo'] },
  { title: 'Harry Potter', type: 'movie', aliases: ['harry potter', 'hogwarts'] },

  // TV Shows
  { title: 'House of the Dragon', type: 'tv', aliases: ['house of the dragon', 'hotd', 'targaryen', 'game of thrones'] },
  { title: 'The Last of Us', type: 'tv', aliases: ['the last of us', 'tlou', 'joel and ellie', 'pedro pascal'] },
  { title: 'Fallout', type: 'tv', aliases: ['fallout', 'vault-tec', 'lucy maclean'] },
  { title: 'Arcane', type: 'tv', aliases: ['arcane', 'league of legends', 'jinx', 'vi'] },
  { title: 'Stranger Things', type: 'tv', aliases: ['stranger things', 'eleven', 'upside down', 'hawkins'] },
  { title: 'Wednesday', type: 'tv', aliases: ['wednesday', 'addams family', 'jenna ortega'] },
  { title: 'Breaking Bad', type: 'tv', aliases: ['breaking bad', 'walter white', 'heisenberg', 'jesse pinkman'] },
  { title: 'Squid Game', type: 'tv', aliases: ['squid game', 'round six'] },
  { title: 'Money Heist', type: 'tv', aliases: ['money heist', 'la casa de papel', 'el profesor'] },
  { title: 'Peaky Blinders', type: 'tv', aliases: ['peaky blinders', 'thomas shelby'] },
  { title: 'The Boys', type: 'tv', aliases: ['the boys', 'homelander', 'butcher'] },
  { title: 'Loki', type: 'tv', aliases: ['loki', 'tva', 'tom hiddleston'] },
  { title: 'Shogun', type: 'tv', aliases: ['shogun', 'toranaga', 'japan'] },
  { title: 'Game of Thrones', type: 'tv', aliases: ['game of thrones', 'got', 'westeros'] },
];

/**
 * Finds if a user query is a typo of a well-known title
 * Returns the best suggested title if confidence is high and distance is low
 */
export function findTypoSuggestion(query: string): { suggestedTitle: string; matchedItem?: typeof POPULAR_TITLES_DICTIONARY[0] } | null {
  const cleaned = cleanText(query);
  if (cleaned.length < 3) return null;

  let bestMatch: typeof POPULAR_TITLES_DICTIONARY[0] | null = null;
  let highestScore = 0;
  let lowestDistance = 999;

  for (const item of POPULAR_TITLES_DICTIONARY) {
    // Check main title
    const mainScore = stringSimilarity(cleaned, item.title);
    const mainDist = damerauLevenshteinDistance(cleaned, cleanText(item.title));

    if (mainScore > highestScore) {
      highestScore = mainScore;
      lowestDistance = mainDist;
      bestMatch = item;
    }

    // Check aliases
    for (const alias of item.aliases) {
      const aliasScore = stringSimilarity(cleaned, alias);
      const aliasDist = damerauLevenshteinDistance(cleaned, cleanText(alias));

      // Partial token match bonus
      const isSub = alias.includes(cleaned) || cleaned.includes(alias);
      const adjustedScore = isSub ? Math.max(aliasScore, 0.8) : aliasScore;

      if (adjustedScore > highestScore) {
        highestScore = adjustedScore;
        lowestDistance = aliasDist;
        bestMatch = item;
      }
    }
  }

  // Acceptance criteria for typo suggestion:
  // - Cleaned query doesn't already perfectly match the suggested title
  // - High similarity (>= 0.68) OR small edit distance (<= 2 for words >= 5 letters)
  if (bestMatch) {
    const isExact = cleanText(bestMatch.title) === cleaned;
    if (isExact) return null; // already exact, no typo

    if (highestScore >= 0.68 || (lowestDistance <= 2 && cleaned.length >= 4)) {
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

/**
 * Standardizes raw status from TMDB or AniList into our 3 core statuses:
 * 'airing' (Sedang Tayang), 'completed' (Selesai), 'upcoming' (Segera Tayang)
 */
export function getStandardizedStatus(item: Title): AiringStatusKey {
  const rawStatus = (item.status || '').toUpperCase().trim();
  const currentYear = new Date().getFullYear();
  const itemYear = parseInt(item.year, 10);

  // 1. Explicit status strings
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
    // If it's a movie released long ago, it's completed
    return 'completed';
  }

  if (
    rawStatus === 'NOT_YET_RELEASED' ||
    rawStatus === 'UPCOMING' ||
    rawStatus === 'PLANNED'
  ) {
    return 'upcoming';
  }

  // 2. Year-based heuristic fallback
  if (!isNaN(itemYear)) {
    if (itemYear > currentYear) return 'upcoming';
    if (item.type === 'tv' || item.type === 'anime') {
      if (itemYear === currentYear) return 'airing';
      return 'completed';
    }
    // Movie released in current year
    if (itemYear === currentYear) return 'airing';
    return 'completed';
  }

  return 'completed';
}

/**
 * Friendly Indonesian badge label for the item status
 */
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
  // Action
  '28': ['Action', 'Aksi'],
  'action': ['Action', 'Aksi', '28'],
  'aksi': ['Action', 'Aksi', '28'],

  // Adventure
  '12': ['Adventure', 'Petualangan'],
  '10759': ['Action & Adventure', 'Aksi & Petualangan'],
  'adventure': ['Adventure', 'Petualangan', '12'],
  'petualangan': ['Adventure', 'Petualangan', '12'],

  // Animation
  '16': ['Animation', 'Animasi', 'Anime'],
  'animation': ['Animation', 'Animasi', 'Anime', '16'],
  'animasi': ['Animation', 'Animasi', 'Anime', '16'],

  // Comedy
  '35': ['Comedy', 'Komedi'],
  'comedy': ['Comedy', 'Komedi', '35'],
  'komedi': ['Comedy', 'Komedi', '35'],

  // Crime
  '80': ['Crime', 'Kriminal'],
  'crime': ['Crime', 'Kriminal', '80'],
  'kriminal': ['Crime', 'Kriminal', '80'],

  // Documentary
  '99': ['Documentary', 'Dokumenter'],
  'documentary': ['Documentary', 'Dokumenter', '99'],
  'dokumenter': ['Documentary', 'Dokumenter', '99'],

  // Drama
  '18': ['Drama'],
  'drama': ['Drama', '18'],

  // Family
  '10751': ['Family', 'Keluarga'],
  'family': ['Family', 'Keluarga', '10751'],
  'keluarga': ['Family', 'Keluarga', '10751'],

  // Fantasy / Sci-Fi
  '14': ['Fantasy', 'Fantasi'],
  'fantasy': ['Fantasy', 'Fantasi', '14'],
  'fantasi': ['Fantasy', 'Fantasi', '14'],
  '878': ['Science Fiction', 'Sci-Fi', 'Fiksi Ilmiah'],
  '10765': ['Sci-Fi & Fantasy', 'Fiksi Ilmiah & Fantasi'],
  'sci-fi': ['Science Fiction', 'Sci-Fi', 'Fiksi Ilmiah', '878'],
  'fiksi ilmiah': ['Science Fiction', 'Sci-Fi', 'Fiksi Ilmiah', '878'],

  // Horror
  '27': ['Horror', 'Horor'],
  'horror': ['Horror', 'Horor', '27'],
  'horor': ['Horror', 'Horor', '27'],

  // Mystery
  '9648': ['Mystery', 'Misteri'],
  'mystery': ['Mystery', 'Misteri', '9648'],
  'misteri': ['Mystery', 'Misteri', '9648'],

  // Romance
  '10749': ['Romance', 'Romantis', 'Romansa'],
  'romance': ['Romance', 'Romantis', 'Romansa', '10749'],
  'romantis': ['Romance', 'Romantis', 'Romansa', '10749'],

  // Thriller
  '53': ['Thriller', 'Cerita Seru'],
  'thriller': ['Thriller', 'Cerita Seru', '53'],
  'cerita seru': ['Thriller', 'Cerita Seru', '53'],

  // Supernatural
  'supernatural': ['Supernatural', 'Gaib'],
};

/**
 * Checks if a Title matches the selected genre key
 */
export function matchesGenre(item: Title, selectedGenre: string): boolean {
  if (!selectedGenre || selectedGenre === 'all') return true;

  const searchKey = selectedGenre.toLowerCase().trim();
  const synonyms = GENRE_MAP[searchKey] || [searchKey];
  const itemGenres = (item.genres || []).map((g) => g.toLowerCase());

  return synonyms.some((syn) =>
    itemGenres.some((ig) => ig.includes(syn.toLowerCase()) || syn.toLowerCase().includes(ig))
  );
}

/**
 * Checks if a Title matches the selected year filter
 */
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

/**
 * Calculates a match score for a Title given a query string.
 * Higher score = more relevant.
 */
export function calculateRelevanceScore(item: Title, query: string): number {
  const cleanQ = cleanText(query);
  if (!cleanQ) return 0;

  const cleanTitle = cleanText(item.title);
  const cleanOrig = cleanText(item.originalTitle || '');
  const cleanOverview = cleanText(item.overview || '');

  let score = 0;

  // 1. Exact title match
  if (cleanTitle === cleanQ || cleanOrig === cleanQ) {
    score += 150;
  }
  // 2. Starts with query
  else if (cleanTitle.startsWith(cleanQ) || cleanOrig.startsWith(cleanQ)) {
    score += 100;
  }
  // 3. Contains as whole word
  else if (
    new RegExp(`\\b${cleanQ}\\b`, 'i').test(cleanTitle) ||
    new RegExp(`\\b${cleanQ}\\b`, 'i').test(cleanOrig)
  ) {
    score += 80;
  }
  // 4. Contains substring in title
  else if (cleanTitle.includes(cleanQ) || cleanOrig.includes(cleanQ)) {
    score += 60;
  }
  // 5. Typo tolerance: Damerau-Levenshtein similarity
  else {
    const titleSim = Math.max(
      stringSimilarity(cleanQ, cleanTitle),
      stringSimilarity(cleanQ, cleanOrig)
    );
    if (titleSim >= 0.65) {
      score += Math.round(titleSim * 70);
    }
  }

  // 6. Token overlap bonus (handles multi-word queries like "demon slayer kimetsu")
  const queryTokens = cleanQ.split(' ').filter(Boolean);
  const titleTokens = cleanTitle.split(' ').filter(Boolean);
  let matchedTokens = 0;
  for (const qt of queryTokens) {
    if (titleTokens.some((tt) => tt.includes(qt) || stringSimilarity(qt, tt) >= 0.75)) {
      matchedTokens++;
    }
  }
  if (queryTokens.length > 0) {
    score += (matchedTokens / queryTokens.length) * 40;
  }

  // 7. Overview match bonus
  if (cleanOverview.includes(cleanQ)) {
    score += 20;
  }

  // 8. Quality weighting: Add fractional points based on rating & vote count
  const ratingNum = parseFloat(item.rating) || 0;
  score += ratingNum * 1.5;

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

/**
 * Sorts titles array based on the selected SortKey
 */
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
