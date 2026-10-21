import React from 'react';
import { Link } from 'react-router-dom';
import { IoHomeOutline as Home, IoCompassOutline as Compass } from 'react-icons/io5';
import { Logo } from '../components/Logo';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center space-y-6 pt-24">
      <div className="mb-2">
        <Logo size="lg" asLink={false} />
      </div>
      <div className="space-y-2">
        <span className="text-6xl sm:text-8xl font-bold text-[#FFB224] tracking-tight block drop-shadow-lg">
          404
        </span>
        <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">
          Halaman Tidak Ditemukan
        </h1>
        <p className="text-xs sm:text-sm text-white/55 max-w-md leading-relaxed">
          Tautan yang Anda tuju mungkin salah, telah dipindahkan, atau tayangan tersebut sudah tidak tersedia di server.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#06070B] font-bold text-xs sm:text-sm shadow-xl transition-all ios-spring"
        >
          <Home className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
        <Link
          to="/explore/movie"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full liquid-glass liquid-specular text-white font-semibold text-xs sm:text-sm transition-all ios-spring"
        >
          <Compass className="w-4 h-4 text-[#FFB224]" />
          <span>Jelajahi Film</span>
        </Link>
      </div>
    </div>
  );
};
