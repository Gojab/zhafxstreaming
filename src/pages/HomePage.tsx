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
    setIsLoading(true);
    setError(null);
    try {
      const homeData = await api.getHome(signal);
      setData(homeData);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Gagal memuat katalog beranda.');
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
