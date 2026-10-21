import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Title } from '../types';
import { HeroBillboard } from '../components/HeroBillboard';
import { MediaRow } from '../components/MediaRow';
import { HeroSkeleton, MediaRowSkeleton, MediaCardSkeleton } from '../components/Skeleton';
import { SEOHead } from '../components/SEOHead';
import { DonationModal } from '../components/DonationModal';
import { useWatchHistory } from '../hooks/useWatchHistory';
import { useMyList } from '../hooks/useMyList';
import {
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

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
  newReleases: [],
  actionMovies: [],
  scifiMovies: [],
};

export const HomePage: React.FC = () => {
  const [data, setData] = useState<{
    hero: Title | null;
    trending: Title[];
    popularMovies: Title[];
    popularTv: Title[];
    popularAnime: Title[];
    newReleases: Title[];
    actionMovies: Title[];
    scifiMovies: Title[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDonationOpen, setIsDonationOpen] = useState(false);

  const { history } = useWatchHistory();
  const { myList } = useMyList();

  // One-time donation pop-up on the home page (Saweria QR)
  useEffect(() => {
    const hasSeenDonation = localStorage.getItem('zhafx_saweria_shown');
    if (!hasSeenDonation) {
      const timer = setTimeout(() => {
        setIsDonationOpen(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for manual trigger to reopen donation popup
  useEffect(() => {
    const handleOpenDonation = () => setIsDonationOpen(true);
    window.addEventListener('open-zhafx-donation', handleOpenDonation);
    return () => window.removeEventListener('open-zhafx-donation', handleOpenDonation);
  }, []);

  const handleCloseDonation = () => {
    setIsDonationOpen(false);
    localStorage.setItem('zhafx_saweria_shown', 'true');
  };

  const loadData = async (signal?: AbortSignal) => {
    setError(null);
    try {
      const homeData = await api.getHome(signal);
      if (homeData && (homeData.hero || homeData.trending?.length > 0)) {
        const heroId = homeData.hero?.id;
        const heroTitle = (homeData.hero?.title || '').toLowerCase();

        // Deduplicate and filter out redundant Dune duplicates or hero repeats from rows
        const filterDuneRombongan = (items: Title[]) => {
          const seen = new Set<string>();
          return (items || []).filter((item) => {
            if (!item || !item.id) return false;
            if (seen.has(item.id)) return false;
            // Prevent hero duplicate in immediate rows
            if (heroId && item.id === heroId) return false;
            // If hero is Dune, prevent other Dune variants from flooding the row
            if (heroTitle.includes('dune') && item.title.toLowerCase().includes('dune')) {
              return false;
            }
            seen.add(item.id);
            return true;
          });
        };

        const trending = filterDuneRombongan(homeData.trending);
        const popularMovies = filterDuneRombongan(homeData.popularMovies);
        const popularTv = filterDuneRombongan(homeData.popularTv);
        const popularAnime = filterDuneRombongan(homeData.popularAnime);

        setData({
          hero: homeData.hero,
          trending: trending.length > 0 ? trending : DEFAULT_HOME_DATA.trending,
          popularMovies: popularMovies.length > 0 ? popularMovies : DEFAULT_HOME_DATA.popularMovies,
          popularTv: popularTv.length > 0 ? popularTv : DEFAULT_HOME_DATA.popularTv,
          popularAnime: popularAnime.length > 0 ? popularAnime : DEFAULT_HOME_DATA.popularAnime,
          newReleases: filterDuneRombongan(homeData.newReleases || []),
          actionMovies: filterDuneRombongan(homeData.actionMovies || []),
          scifiMovies: filterDuneRombongan(homeData.scifiMovies || []),
        });
      } else {
        setData(DEFAULT_HOME_DATA);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setData(DEFAULT_HOME_DATA);
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

  // Format history items into Title shape for row display
  const historyTitles: Title[] = history.map((h) => ({
    id: h.id,
    type: h.type,
    title: h.title,
    poster: h.poster,
    backdrop: h.backdrop,
    year: h.year,
    rating: '0.0',
    overview: h.episode ? `Terakhir ditonton: Musim ${h.season || 1} Ep ${h.episode}` : 'Sedang ditonton',
    genres: [],
    season: h.season,
    episode: h.episode,
  }));

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

  // 1. Loading State (Structured identical to success state to prevent CLS)
  if (isLoading) {
    return (
      <div className="pb-28 sm:pb-24 pt-[74px] sm:pt-24 md:pt-28">
        <SEOHead
          title=""
          canonicalPath="/"
          description="Platform streaming film, serial TV, dan anime modern dengan rekomendasi bertenaga AI."
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

  // 4. Success State
  const heroItems = [
    ...(data.hero ? [data.hero] : []),
    ...data.trending
      .filter((t) => !data.hero || `${t.type}-${t.id}` !== `${data.hero.type}-${data.hero.id}`)
      .slice(0, 5),
  ];

  return (
    <div className="pb-28 sm:pb-24 pt-[74px] sm:pt-24 md:pt-28">
      <SEOHead
        title=""
        canonicalPath="/"
        description="Platform streaming film, serial TV, dan anime modern dengan rekomendasi bertenaga AI."
      />
      {/* Hero Billboard Carousel */}
      <HeroBillboard items={heroItems} />

      {/* Katalog Tayangan (Trending sekarang & Kategori) */}
      <div className="mt-4 sm:mt-10 space-y-7 sm:space-y-9">
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

      {data.scifiMovies.length > 0 && (
        <MediaRow
          title="Fiksi ilmiah & masa depan"
          items={data.scifiMovies}
          viewAllLink="/explore/movie?genre=878"
        />
      )}
      </div>

      {/* Once-per-visit Saweria QR Donation Popup */}
      <DonationModal isOpen={isDonationOpen} onClose={handleCloseDonation} />
    </div>
  );
};
