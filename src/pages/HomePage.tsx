import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Title } from '../types';
import { HeroBillboard } from '../components/HeroBillboard';
import { MediaRow } from '../components/MediaRow';
import { HeroSkeleton, MediaRowSkeleton, MediaCardSkeleton } from '../components/Skeleton';
import { SEOHead } from '../components/SEOHead';
import { AdSenseBanner } from '../components/AdSenseBanner';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useMyList } from '../hooks/useMyList';
import {
  IoReloadOutline as RotateCcw,
  IoWarningOutline as AlertTriangle,
} from 'react-icons/io5';

const DEFAULT_HOME_DATA = {
  hero: {
    id: '693134',
    type: 'movie' as const,
    title: 'Dune: Part Two',
    poster: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    year: '2024',
    rating: '8.2',
    overview: 'Paul Atreides bersatu dengan Chani dan kaum Fremen saat menempuh jalan balas dendam terhadap para konspirator yang menghancurkan keluarganya, seraya berusaha mencegah masa depan kelam yang hanya bisa ia ramalkan.',
    genres: ['Fiksi Ilmiah', 'Petualangan'],
  },
  trending: [
    {
      id: '157336',
      type: 'movie' as const,
      title: 'Interstellar',
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/rAiYTsqJiOqwOO0CrJwZ2SBAkX7.jpg',
      year: '2014',
      rating: '8.4',
      overview: 'Di masa depan ketika bumi dilanda krisis pangan parah, sekelompok penjelajah menempuh misi terjauh dalam sejarah melintasi lubang cacing antariksa demi mencari planet baru bagi umat manusia.',
      genres: ['Fiksi Ilmiah', 'Petualangan'],
    },
    {
      id: '872585',
      type: 'movie' as const,
      title: 'Oppenheimer',
      poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/fm6K9vY9wgfqAxqYrV929bitGFW.jpg',
      year: '2023',
      rating: '8.1',
      overview: 'Kisah biopik dramatis seputar fisikawan teoretis J. Robert Oppenheimer yang memimpin Proyek Manhattan untuk menciptakan senjata nuklir pertama dalam sejarah peradaban manusia.',
      genres: ['Drama', 'Sejarah'],
    },
    {
      id: '126308',
      type: 'tv' as const,
      title: 'Shōgun',
      poster: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WNzG1AgYT.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/5zmiBoMzeWKVyr6pvUjD5vNfcP0.jpg',
      year: '2024',
      rating: '8.5',
      overview: 'Ketika sebuah kapal misterius terdampar di pesisir feodal Jepang, sang navigator Inggris terjerumus ke dalam perang politik dan intrik perebutan kekuasaan para penguasa samurai.',
      genres: ['Drama', 'Perang'],
    },
    {
      id: '209867',
      type: 'anime' as const,
      title: 'Solo Leveling',
      poster: 'https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuPxJ8PGzp.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/9faGSFi5jam6pDWGNdcu8f8Liy5.jpg',
      year: '2024',
      rating: '8.6',
      overview: 'Di dunia di mana monster bermunculan melalui gerbang dimensi, Sung Jin-woo yang dikenal sebagai pemburu terlemah bangkit dari ambang maut dengan sistem misterius yang memungkinkannya naik level tanpa batas.',
      genres: ['Aksi', 'Fantasi'],
    },
    {
      id: '1429',
      type: 'anime' as const,
      title: 'Attack on Titan',
      poster: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/y4X1v8E0cZ3tD34cQfPsh4qgLlh.jpg',
      year: '2013',
      rating: '8.7',
      overview: 'Umat manusia yang terkurung di balik benteng raksasa berjuang mati-matian mempertahankan kelangsungan hidup dari ancaman monster raksasa pemakan manusia yang dikenal sebagai Titan.',
      genres: ['Animasi', 'Aksi', 'Misteri'],
    },
    {
      id: '85937',
      type: 'anime' as const,
      title: 'Demon Slayer: Kimetsu no Yaiba',
      poster: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/nTvM4mhqZlHIvUkI1gq29wmTm9.jpg',
      year: '2019',
      rating: '8.7',
      overview: 'Setelah keluarganya dibantai oleh iblis dan adiknya berubah menjadi monster, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis demi membalaskan dendam dan menyembuhkan sang adik.',
      genres: ['Animasi', 'Aksi', 'Fantasi'],
    },
    {
      id: '361743',
      type: 'movie' as const,
      title: 'Top Gun: Maverick',
      poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/AaV1YIdWKnjAIAOe8UUKBFm327v.jpg',
      year: '2022',
      rating: '8.2',
      overview: 'Setelah puluhan tahun mengabdi sebagai penerbang ulung Angkatan Laut, Pete "Maverick" Mitchell ditugaskan melatih skuadron lulusan elit terbaik untuk sebuah misi khusus yang mustahil.',
      genres: ['Aksi', 'Drama'],
    },
    {
      id: '94997',
      type: 'tv' as const,
      title: 'House of the Dragon',
      poster: 'https://image.tmdb.org/t/p/w500/1X4h40fcB4WWUmIBK0auT4zRBAV.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/etjA69oh0nil3HwhFuSV0v6avTI.jpg',
      year: '2022',
      rating: '8.4',
      overview: 'Kisah epik wangsa Targaryen ratusan tahun sebelum peristiwa Game of Thrones, yang mencatat awal mula perang saudara paling berdarah dalam perebutan takhta Iron Throne di Westeros.',
      genres: ['Fantasi', 'Drama'],
    },
  ],
  popularMovies: [
    {
      id: '76600',
      type: 'movie' as const,
      title: 'Avatar: The Way of Water',
      poster: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
      backdrop: 'https://image.tmdb.org/t/p/original/ovM06PdF36CpH2CUOverview924901.jpg',
      year: '2022',
      rating: '7.6',
      overview: 'Jake Sully dan Neytiri telah berkeluarga dan melakukan segalanya untuk tetap bersama. Namun saat ancaman lama kembali, mereka harus mengungsi dan menjelajahi wilayah klan laut Pandora.',
      genres: ['Fiksi Ilmiah', 'Petualangan'],
    },
    {
      id: '157336',
      type: 'movie' as const,
      title: 'Interstellar',
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      year: '2014',
      rating: '8.4',
      overview: 'Di masa depan ketika bumi dilanda krisis pangan parah, sekelompok penjelajah menempuh misi terjauh dalam sejarah melintasi lubang cacing antariksa demi mencari planet baru bagi umat manusia.',
      genres: ['Fiksi Ilmiah'],
    },
    {
      id: '872585',
      type: 'movie' as const,
      title: 'Oppenheimer',
      poster: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      year: '2023',
      rating: '8.1',
      overview: 'Kisah biopik dramatis seputar fisikawan teoretis J. Robert Oppenheimer yang memimpin Proyek Manhattan untuk menciptakan senjata nuklir pertama dalam sejarah peradaban manusia.',
      genres: ['Drama'],
    },
    {
      id: '361743',
      type: 'movie' as const,
      title: 'Top Gun: Maverick',
      poster: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg',
      year: '2022',
      rating: '8.2',
      overview: 'Setelah puluhan tahun mengabdi sebagai penerbang ulung Angkatan Laut, Pete "Maverick" Mitchell ditugaskan melatih skuadron lulusan elit terbaik untuk sebuah misi khusus yang mustahil.',
      genres: ['Aksi'],
    },
    {
      id: '155',
      type: 'movie' as const,
      title: 'The Dark Knight',
      poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      year: '2008',
      rating: '8.5',
      overview: 'Ketika ancaman keji yang dikenal sebagai Joker menebar kekacauan di jalanan Gotham, Batman harus menghadapi salah satu ujian psikologis dan fisik terberat untuk menegakkan keadilan.',
      genres: ['Aksi', 'Kriminal'],
    },
  ],
  popularTv: [
    {
      id: '126308',
      type: 'tv' as const,
      title: 'Shōgun',
      poster: 'https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WNzG1AgYT.jpg',
      year: '2024',
      rating: '8.5',
      overview: 'Ketika sebuah kapal misterius terdampar di pesisir feodal Jepang, sang navigator Inggris terjerumus ke dalam perang politik dan intrik perebutan kekuasaan para penguasa samurai.',
      genres: ['Drama', 'Perang'],
    },
    {
      id: '94997',
      type: 'tv' as const,
      title: 'House of the Dragon',
      poster: 'https://image.tmdb.org/t/p/w500/1X4h40fcB4WWUmIBK0auT4zRBAV.jpg',
      year: '2022',
      rating: '8.4',
      overview: 'Kisah epik wangsa Targaryen ratusan tahun sebelum peristiwa Game of Thrones, yang mencatat awal mula perang saudara paling berdarah dalam perebutan takhta Iron Throne di Westeros.',
      genres: ['Fantasi'],
    },
    {
      id: '100088',
      type: 'tv' as const,
      title: 'The Last of Us',
      poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2V7JMrqi.jpg',
      year: '2023',
      rating: '8.6',
      overview: 'Dua puluh tahun setelah wabah jamur misterius memusnahkan peradaban, seorang penyintas tangguh bernama Joel disewa untuk menyelundupkan seorang gadis muda melintasi wilayah Amerika yang berbahaya.',
      genres: ['Drama', 'Aksi'],
    },
  ],
  popularAnime: [
    {
      id: '209867',
      type: 'anime' as const,
      title: 'Solo Leveling',
      poster: 'https://image.tmdb.org/t/p/w500/geCRueV3ElhRTr0xtJuPxJ8PGzp.jpg',
      year: '2024',
      rating: '8.6',
      overview: 'Di dunia di mana monster bermunculan melalui gerbang dimensi, Sung Jin-woo yang dikenal sebagai pemburu terlemah bangkit dari ambang maut dengan sistem misterius yang memungkinkannya naik level tanpa batas.',
      genres: ['Aksi', 'Fantasi'],
    },
    {
      id: '1429',
      type: 'anime' as const,
      title: 'Attack on Titan',
      poster: 'https://image.tmdb.org/t/p/w500/hTP1DtLGFamjfu8WqjnuQdP1n4i.jpg',
      year: '2013',
      rating: '8.7',
      overview: 'Umat manusia yang terkurung di balik benteng raksasa berjuang mati-matian mempertahankan kelangsungan hidup dari ancaman monster raksasa pemakan manusia yang dikenal sebagai Titan.',
      genres: ['Animasi', 'Aksi'],
    },
    {
      id: '85937',
      type: 'anime' as const,
      title: 'Demon Slayer: Kimetsu no Yaiba',
      poster: 'https://image.tmdb.org/t/p/w500/xUfRZu2mi8jH6SzQEJGP6tjBuYj.jpg',
      year: '2019',
      rating: '8.7',
      overview: 'Setelah keluarganya dibantai oleh iblis dan adiknya berubah menjadi monster, Tanjiro Kamado menempuh perjalanan berbahaya menjadi pembasmi iblis demi membalaskan dendam dan menyembuhkan sang adik.',
      genres: ['Animasi', 'Aksi'],
    },
    {
      id: '95479',
      type: 'anime' as const,
      title: 'Jujutsu Kaisen',
      poster: 'https://image.tmdb.org/t/p/w500/hD8pZg03qG8bM2U12kE4yS6b91B.jpg',
      year: '2020',
      rating: '8.6',
      overview: 'Yuji Itadori, siswa SMA dengan bakat fisik luar biasa, menelan artefak terkutuk dari Raja Kutukan dan bergabung dengan Akademi Jujutsu untuk membasmi roh-roh kutukan yang mengancam dunia manusia.',
      genres: ['Animasi', 'Aksi', 'Supranatural'],
    },
  ],
  airingAnime: [],
  newReleases: [],
  actionMovies: [],
  scifiMovies: [],
  thrillerMovies: [],
  comedyMovies: [],
};

const HOME_CACHE_KEY = 'zhafx_home_cache_v1';

export interface HomeCatalogData {
  hero: Title | null;
  trending: Title[];
  popularMovies: Title[];
  popularTv: Title[];
  popularAnime: Title[];
  airingAnime: Title[];
  newReleases: Title[];
  actionMovies: Title[];
  scifiMovies: Title[];
  thrillerMovies: Title[];
  comedyMovies: Title[];
}

function getStoredHomeCache(): HomeCatalogData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.hero || (Array.isArray(parsed.trending) && parsed.trending.length > 0))) {
      return parsed;
    }
  } catch {
    // Ignore corrupt storage
  }
  return null;
}

export const HomePage: React.FC = () => {
  // 1. Synchronously restore cached catalog if available (Zero CLS & Zero flicker on revisit)
  const [cachedData] = useState<HomeCatalogData | null>(() => getStoredHomeCache());
  const [data, setData] = useState<HomeCatalogData | null>(cachedData);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedData);
  const [error, setError] = useState<string | null>(null);

  // Track if we mounted with a valid cached hero already showing on screen
  const isFromCacheRef = React.useRef<boolean>(Boolean(cachedData?.hero));

  const { history } = useWatchHistory();
  const { myList } = useMyList();

  const loadData = async (signal?: AbortSignal) => {
    setError(null);
    try {
      const homeData = await api.getHome(signal);
      if (homeData && (homeData.hero || homeData.trending?.length > 0)) {
        const heroId = homeData.hero?.id;
        const heroTitle = (homeData.hero?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        // Deduplicate and filter out redundant duplicates ("tidak dobble") or hero repeats
        const filterDuplicates = (items: Title[], existingKeys?: Set<string>) => {
          const seen = existingKeys || new Set<string>();
          return (items || []).filter((item) => {
            if (!item || !item.id) return false;
            const idKey = `${item.type || 'media'}-${item.id}`;
            const cleanTitle = (item.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seen.has(idKey) || (cleanTitle && seen.has(cleanTitle))) return false;
            // Prevent hero duplicate in immediate rows
            if (heroId && (item.id === heroId || idKey === `${homeData.hero?.type}-${heroId}`)) return false;
            if (heroTitle && cleanTitle === heroTitle) return false;
            seen.add(idKey);
            if (cleanTitle) seen.add(cleanTitle);
            return true;
          });
        };

        const trending = filterDuplicates(homeData.trending);
        const popularMovies = filterDuplicates(homeData.popularMovies);
        const popularTv = filterDuplicates(homeData.popularTv);
        const popularAnime = filterDuplicates(homeData.popularAnime);
        const airingAnime = filterDuplicates(homeData.airingAnime || []);

        const freshData: HomeCatalogData = {
          hero: homeData.hero,
          trending: trending.length > 0 ? trending : (cachedData?.trending || DEFAULT_HOME_DATA.trending),
          popularMovies: popularMovies.length > 0 ? popularMovies : (cachedData?.popularMovies || DEFAULT_HOME_DATA.popularMovies),
          popularTv: popularTv.length > 0 ? popularTv : (cachedData?.popularTv || DEFAULT_HOME_DATA.popularTv),
          popularAnime: popularAnime.length > 0 ? popularAnime : (cachedData?.popularAnime || DEFAULT_HOME_DATA.popularAnime),
          airingAnime,
          newReleases: filterDuplicates(homeData.newReleases || []),
          actionMovies: filterDuplicates(homeData.actionMovies || []),
          scifiMovies: filterDuplicates(homeData.scifiMovies || []),
          thrillerMovies: filterDuplicates(homeData.thrillerMovies || []),
          comedyMovies: filterDuplicates(homeData.comedyMovies || []),
        };

        // Silently update cache for the NEXT visit/reload
        try {
          localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(freshData));
        } catch {
          // ignore localStorage quota errors
        }

        // If a hero was already visible from cache, do not jarringly swap it out mid-view!
        // Keep the displayed hero slide stable while updating other rails.
        if (isFromCacheRef.current && cachedData?.hero) {
          setData((prev) => ({
            ...freshData,
            hero: prev?.hero || cachedData.hero,
          }));
        } else {
          // First visit (no cache): render the freshly loaded final data
          setData(freshData);
        }
      } else if (!data) {
        setData(DEFAULT_HOME_DATA);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        if (!data) {
          setData(DEFAULT_HOME_DATA);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

  // Format history / continue watching items into Title shape for row display
  const historyTitles: Title[] = history.map((h) => {
    let overviewText = 'Sedang ditonton';
    if (h.currentTime && h.currentTime > 5) {
      const min = Math.floor(h.currentTime / 60);
      const sec = Math.floor(h.currentTime % 60);
      const formattedTime = `${min}:${sec < 10 ? '0' : ''}${sec}`;
      if (h.episode) {
        overviewText = `Lanjutkan: ${h.episodeName || `Ep ${h.episode}`} • ${formattedTime}`;
      } else {
        overviewText = `Lanjutkan dari ${formattedTime}`;
      }
    } else if (h.episode) {
      overviewText = `Terakhir ditonton: Musim ${h.season || 1} Ep ${h.episode}`;
    }

    return {
      id: h.id,
      type: h.type,
      title: h.title,
      poster: h.poster,
      backdrop: h.backdrop,
      year: h.year,
      rating: '0.0',
      overview: overviewText,
      genres: [],
      season: h.season,
      episode: h.episode,
    };
  });

  // Format my list items into Title shape
  const myListTitles: Title[] = myList.map((m) => ({
    id: m.id,
    type: m.type,
    title: m.title,
    poster: m.poster,
    backdrop: m.backdrop,
    year: m.year,
    rating: m.rating,
    overview: '',
    genres: [],
  }));

  // Requirement 4: Compute final hero items once after final data is ready (no premature or unstable reshuffling)
  const heroItems = React.useMemo(() => {
    if (!data) return [];
    const list: Title[] = [];
    if (data.hero) {
      list.push(data.hero);
    }
    const heroId = data.hero?.id;
    const heroType = data.hero?.type;
    const heroTitle = (data.hero?.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    for (const t of data.trending) {
      if (!t || !t.id) continue;
      const isHero =
        (heroId && t.id === heroId && t.type === heroType) ||
        (heroTitle && (t.title || '').toLowerCase().replace(/[^a-z0-9]/g, '') === heroTitle);
      if (!isHero) {
        list.push(t);
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [data]);

  // 1. Loading State (Do not render hero slide before final list is ready; render matching HeroSkeleton)
  if (isLoading || !data || heroItems.length === 0) {
    return (
      <div className="pb-28 sm:pb-24 pt-[74px] sm:pt-24 md:pt-28">
        <SEOHead
          title=""
          canonicalPath="/"
          description="ZHAFX Streaming adalah platform nonton anime, film, dan serial TV gratis tanpa iklan, dilengkapi AI cerdas untuk membantu menemukan tontonan favorit dengan mudah, cepat, dan personal."
        />
        <HeroSkeleton />
        <div className="mt-4 sm:mt-10 space-y-7 sm:space-y-9">
          <MediaRowSkeleton />
          <MediaRowSkeleton />
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 pt-24 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF5C6C]/10 border border-[#FF5C6C]/30 text-[#FF5C6C] flex items-center justify-center mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-[#F2F4FB] mb-2">Gagal Menghubungkan ke Katalog Zhafx</h2>
        <p className="text-xs sm:text-sm text-[#98A2C3] max-w-md mb-6 leading-relaxed">
          {error}
        </p>
        <button
          onClick={() => loadData()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-sm transition-all cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          Coba lagi
        </button>
      </div>
    );
  }

  // 3. Empty State fallback
  if (!data || (!data.hero && data.trending.length === 0)) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 pt-24 text-center">
        <p className="text-sm text-[#98A2C3] mb-4">Belum ada tayangan yang tersedia saat ini.</p>
        <button
          onClick={() => loadData()}
          className="px-4 py-2 rounded-xl bg-[#12162A] text-[#F2F4FB] text-xs font-medium border border-[#2A3152]"
        >
          Muat ulang
        </button>
      </div>
    );
  }

  return (
    <div className="pb-28 sm:pb-24 pt-[74px] sm:pt-24 md:pt-28 relative shadow-[0_35px_80px_rgba(0,0,0,0.95)]">
      <SEOHead
        title=""
        canonicalPath="/"
        description="ZHAFX Streaming adalah platform nonton anime, film, dan serial TV gratis tanpa iklan, dilengkapi AI cerdas untuk membantu menemukan tontonan favorit dengan mudah, cepat, dan personal."
      />
      {/* Hero Billboard Carousel with smooth fade-in */}
      <div className="animate-in fade-in duration-700 ease-out will-change-[opacity]">
        <HeroBillboard items={heroItems} />
      </div>

      {/* Katalog Tayangan (Trending sekarang & Kategori) */}
      <div className="relative z-20 mt-4 sm:mt-10 space-y-7 sm:space-y-9 shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.95)]">
        {/* Continue Watching / Lanjutkan Menonton */}
      {historyTitles.length > 0 && (
        <MediaRow
          title="Lanjutkan Menonton"
          subtitle="Lanjutkan pemutaran tayangan terakhir Anda"
          items={historyTitles}
          viewAllLink="/history"
        />
      )}

      {/* Trending Now */}
      <MediaRow
        title="Trending sekarang"
        subtitle="Tayangan yang paling banyak ditonton minggu ini"
        items={data.trending}
        viewAllLink="/explore/movie?sort=popularity.desc"
      />

      {/* Popular Movies */}
      <MediaRow
        title="Film populer"
        subtitle="Film layar lebar pilihan terbaik"
        items={data.popularMovies}
        viewAllLink="/explore/movie"
      />

      {/* Popular TV Shows */}
      <MediaRow
        title="Serial TV terpopuler"
        subtitle="Musim lengkap dan episode terbaru"
        items={data.popularTv}
        viewAllLink="/explore/tv"
      />

      {/* Popular Anime */}
      <MediaRow
        title="Anime populer"
        subtitle="Serial animasi Jepang paling dinikmati"
        items={data.popularAnime}
        viewAllLink="/explore/anime"
      />

      {/* Airing Anime (Sedang Tayang) */}
      {data.airingAnime && data.airingAnime.length > 0 && (
        <MediaRow
          title="Anime sedang tayang"
          subtitle="Episode terbaru musim ini yang sedang on-going"
          items={data.airingAnime}
          viewAllLink="/explore/anime?sort=trending.desc"
        />
      )}

      {/* My List Row (if saved items exist) */}
      {myListTitles.length > 0 && (
        <MediaRow
          title="Daftar saya"
          subtitle="Tayangan yang sudah kamu simpan"
          items={myListTitles}
          viewAllLink="/my-list"
        />
      )}

      {/* New Releases & Action */}
      {data.newReleases.length > 0 && (
        <MediaRow
          title="Baru dirilis"
          items={data.newReleases}
          viewAllLink="/explore/movie?sort=primary_release_date.desc"
        />
      )}

      {data.actionMovies.length > 0 && (
        <MediaRow
          title="Film aksi & petualangan"
          items={data.actionMovies}
          viewAllLink="/explore/movie?genre=28"
        />
      )}

      {/* Thriller Movies */}
      {data.thrillerMovies && data.thrillerMovies.length > 0 && (
        <MediaRow
          title="Cerita seru & kriminal"
          subtitle="Ketegangan tinggi dan misteri penuh intrik"
          items={data.thrillerMovies}
          viewAllLink="/explore/movie?genre=53"
        />
      )}

      {data.scifiMovies.length > 0 && (
        <MediaRow
          title="Fiksi ilmiah & masa depan"
          items={data.scifiMovies}
          viewAllLink="/explore/movie?genre=878"
        />
      )}

      {/* Comedy Movies */}
      {data.comedyMovies && data.comedyMovies.length > 0 && (
        <MediaRow
          title="Film komedi segar"
          subtitle="Tawa dan hiburan menyenangkan pelepas penat"
          items={data.comedyMovies}
          viewAllLink="/explore/movie?genre=35"
        />
      )}
      </div>
      <AdSenseBanner />
    </div>
  );
};
