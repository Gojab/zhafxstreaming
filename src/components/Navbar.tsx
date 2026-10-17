import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { Logo } from './Logo';

interface NavbarProps {
  onOpenAI: () => void;
  onOpenFeatures: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAI, onOpenFeatures }) => {
  const navigate = useNavigate();
  const [hasScrolled, setHasScrolled] = useState(false);

  // Densify glass on scroll
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global "/" hotkey for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        navigate('/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const navLinkStyle = ({ isActive }: { isActive: boolean }) =>
    `text-xs sm:text-[13px] font-medium transition-all px-3.5 py-1.5 rounded-full ios-spring ${
      isActive
        ? 'text-white font-semibold liquid-glass-active shadow-sm'
        : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
    }`;

  return (
    <header className="fixed top-2.5 sm:top-4 left-3 right-3 sm:left-6 sm:right-6 max-w-7xl mx-auto z-40 transition-all duration-300">
      <div
        className={`w-full px-3.5 sm:px-6 h-14 sm:h-16 rounded-[26px] sm:rounded-full flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 ${
          hasScrolled
            ? 'liquid-glass-dense liquid-specular shadow-2xl'
            : 'liquid-glass liquid-specular shadow-lg'
        }`}
      >
        {/* Left: Official ZHAFX Logo & Navigation Links */}
        <div className="flex items-center gap-5 sm:gap-7">
          <Logo size="md" />

          {/* Desktop iOS Glass Navigation Pills */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Menu Utama">
            <NavLink to="/" className={navLinkStyle}>
              Beranda
            </NavLink>
            <NavLink to="/explore/movie" className={navLinkStyle}>
              Film
            </NavLink>
            <NavLink to="/explore/tv" className={navLinkStyle}>
              Serial TV
            </NavLink>
            <NavLink to="/explore/anime" className={navLinkStyle}>
              Anime
            </NavLink>
            <NavLink to="/my-list" className={navLinkStyle}>
              Daftar Saya
            </NavLink>
            <NavLink to="/history" className={navLinkStyle}>
              Riwayat
            </NavLink>
          </nav>
        </div>

        {/* Right: Search, Tanya AI, and Profile Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Glass Search Button */}
          <button
            onClick={() => navigate('/search')}
            aria-label="Pencarian tayangan"
            className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/70 hover:text-white text-xs transition-all cursor-pointer h-9 ios-spring"
          >
            <Search className="w-3.5 h-3.5 text-white/80" />
            <span className="hidden sm:inline text-[12px]">Cari...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] text-white/60">
              /
            </kbd>
          </button>

          {/* Titik 3 Logo X - Akses Menu X */}
          <button
            type="button"
            onClick={onOpenFeatures}
            aria-label="Menu X Zhafx"
            title="Akses Menu X Zhafx"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/20 text-white font-medium text-xs transition-all cursor-pointer h-9 ios-spring shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none" stroke="currentColor">
              <path d="M5 5L19 19M19 5L5 19" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="5" cy="5" r="1.8" fill="#FFB224" stroke="none" />
              <circle cx="12" cy="12" r="2" fill="#FFFFFF" stroke="none" />
              <circle cx="19" cy="19" r="1.8" fill="#FFB224" stroke="none" />
            </svg>
            <span className="text-[12px] text-[#FFB224] font-bold">X</span>
          </button>

          {/* Tanya AI Glass Pill */}
          <button
            onClick={onOpenAI}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-white font-medium text-xs transition-all cursor-pointer h-9 ios-spring shadow-sm"
            title="Buka Tanya Zhafx AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FFB224]" />
            <span className="hidden sm:inline text-[12px]">Tanya AI</span>
          </button>
        </div>
      </div>
    </header>
  );
};
