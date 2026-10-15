import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { CONFIG } from '../config';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#06080F] border-t border-white/[0.08] mt-16 pb-24 md:pb-12 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-sm">
            <Logo size="md" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              Zhafx menyajikan katalog film, serial TV, dan anime terkini dengan pemutar interaktif dan rekomendasi cerdas AI.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-400">
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
              className="hover:text-white transition-colors cursor-pointer text-left text-xs text-zinc-400"
              title="Putar animasi pembuka sinematik logo ZHAFX"
            >
              Putar Intro
            </button>
          </div>
        </div>

        {/* Copyright notice section */}
        <div className="p-4 rounded-xl bg-[#0C101B]/80 border border-white/[0.08] text-xs text-zinc-400 space-y-1">
          <span className="font-semibold text-zinc-200 block">Pemberitahuan Hak Cipta:</span>
          <p className="leading-relaxed">
            {CONFIG.DISCLAIMER}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 border-t border-white/[0.08] pt-6">
          <span>{CONFIG.COPYRIGHT}</span>
          <span className="text-zinc-400 font-medium text-center sm:text-right">
            {CONFIG.TAGLINE_COPYRIGHT}
          </span>
        </div>
      </div>
    </footer>
  );
};
