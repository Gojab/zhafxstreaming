import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';
import { Logo } from '../components/Logo';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-5">
      <div className="mb-2">
        <Logo size="lg" asLink={false} />
      </div>
      <div className="space-y-2">
        <span className="text-5xl sm:text-7xl font-bold font-heading text-[#FFB224] tracking-wider block">
          404
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-[#F2F4FB]">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-xs sm:text-sm text-[#98A2C3] max-w-md leading-relaxed">
          Tautan yang Anda tuju mungkin salah, telah dipindahkan, atau tayangan tersebut sudah tidak tersedia di server.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs sm:text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          Kembali ke beranda
        </Link>
        <Link
          to="/explore/movie"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#12162A] hover:bg-[#1A2038] border border-[#2A3152] text-[#F2F4FB] font-medium text-xs sm:text-sm transition-colors"
        >
          <Compass className="w-4 h-4" />
          Jelajahi film
        </Link>
      </div>
    </div>
  );
};
