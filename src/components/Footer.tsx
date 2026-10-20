import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Heart } from 'lucide-react';
import { Logo } from './Logo';
import { CONFIG } from '../config';

export const Footer: React.FC = () => {
  const handlePlayIntro = () => {
    window.dispatchEvent(new Event('play-zhafx-intro'));
  };

  return (
    <footer className="w-full border-t border-white/[0.08] mt-16 pb-28 md:pb-14 pt-12 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-sm">
            <Logo size="md" />
            <p className="text-xs text-zinc-300 leading-relaxed">
              Zhafx menyajikan katalog film, serial TV, dan anime terkini dengan pemutar interaktif dan rekomendasi cerdas AI.
            </p>
          </div>

          {/* Quick Links & Intro Replay Button (min 44x44px touch targets & 4.5:1 contrast) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-200">
            <Link to="/" className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center px-1">
              Beranda
            </Link>
            <Link to="/explore/movie" className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center px-1">
              Film
            </Link>
            <Link to="/explore/tv" className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center px-1">
              Serial TV
            </Link>
            <Link to="/explore/anime" className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center px-1">
              Anime
            </Link>
            <Link to="/history" className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center px-1">
              Riwayat
            </Link>
            <Link to="/my-list" className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center px-1">
              Daftar Saya
            </Link>
            {/* Tombol Donasi Saweria */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('open-zhafx-donation'))}
              aria-label="Buka QR Donasi Saweria"
              title="Donasi Saweria"
              className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5C6C]/15 hover:bg-[#FF5C6C]/25 border border-[#FF5C6C]/30 text-[#FF5C6C] text-xs font-semibold cursor-pointer ios-spring shadow-sm"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Donasi</span>
            </button>
            {/* Tombol Pemutar Intro Sinematik */}
            <button
              type="button"
              onClick={handlePlayIntro}
              aria-label="Putar Ulang Intro Sinematik ZHAFX"
              title="Putar Ulang Intro Sinematik"
              className="hover:text-white transition-colors min-h-[44px] min-w-[44px] inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold cursor-pointer ios-spring shadow-sm"
            >
              <Play className="w-3 h-3 fill-current ml-0.5" />
              <span>Putar Intro</span>
            </button>
          </div>
        </div>

        {/* Copyright notice section - Apple Liquid Glass Container with WCAG AA Contrast */}
        <div className="p-4 sm:p-5 rounded-[22px] liquid-glass liquid-specular text-xs text-zinc-300 space-y-1.5 shadow-sm">
          <span className="font-semibold text-white block">Pemberitahuan Hak Cipta:</span>
          <p className="leading-relaxed">
            {CONFIG.DISCLAIMER}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-300 border-t border-white/[0.08] pt-6 font-medium">
          <span>{CONFIG.COPYRIGHT}</span>
          <span className="text-zinc-200 font-semibold text-center sm:text-right">
            {CONFIG.TAGLINE_COPYRIGHT}
          </span>
        </div>
      </div>
    </footer>
  );
};
