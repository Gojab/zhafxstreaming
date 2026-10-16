import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { CONFIG } from '../config';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/[0.08] mt-16 pb-28 md:pb-14 pt-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-sm">
            <Logo size="md" />
            <p className="text-xs text-white/50 leading-relaxed">
              Zhafx menyajikan katalog film, serial TV, dan anime terkini dengan pemutar interaktif dan rekomendasi cerdas AI.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2.5 text-xs text-white/60">
            <Link to="/" className="hover:text-white transition-colors">
              Beranda
            </Link>
            <Link to="/explore/movie" className="hover:text-white transition-colors">
              Film
            </Link>
            <Link to="/explore/tv" className="hover:text-white transition-colors">
              Serial TV
            </Link>
            <Link to="/explore/anime" className="hover:text-white transition-colors">
              Anime
            </Link>
            <Link to="/history" className="hover:text-white transition-colors">
              Riwayat
            </Link>
            <Link to="/my-list" className="hover:text-white transition-colors">
              Daftar Saya
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Akun / Masuk
            </Link>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('play-zhafx-intro'))}
              className="hover:text-white transition-colors cursor-pointer text-left text-xs text-[#FFB224]"
              title="Putar animasi pembuka sinematik logo ZHAFX"
            >
              Putar Intro
            </button>
          </div>
        </div>

        {/* Copyright notice section - Apple Liquid Glass Container */}
        <div className="p-4 sm:p-5 rounded-[22px] liquid-glass liquid-specular text-xs text-white/50 space-y-1.5 shadow-sm">
          <span className="font-semibold text-white/80 block">Pemberitahuan Hak Cipta:</span>
          <p className="leading-relaxed">
            {CONFIG.DISCLAIMER}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-white/40 border-t border-white/[0.08] pt-6">
          <span>{CONFIG.COPYRIGHT}</span>
          <span className="text-white/60 font-medium text-center sm:text-right">
            {CONFIG.TAGLINE_COPYRIGHT}
          </span>
        </div>
      </div>
    </footer>
  );
};
