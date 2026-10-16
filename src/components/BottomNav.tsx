import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Sparkles, Bookmark, User } from 'lucide-react';

interface BottomNavProps {
  onOpenAI: () => void;
  onOpenFeatures: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAI, onOpenFeatures }) => {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium transition-all ios-spring ${
      isActive
        ? 'text-white font-semibold bg-white/[0.16] shadow-sm'
        : 'text-white/60 hover:text-white active:scale-95'
    }`;

  return (
    <div className="md:hidden fixed bottom-4 sm:bottom-6 left-2 right-2 z-40 flex justify-center pointer-events-none">
      <nav
        aria-label="Navigasi Bawah Apple iOS"
        className="w-full max-w-[390px] h-14 rounded-full liquid-glass-dense liquid-specular shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex items-center justify-around px-2 pointer-events-auto border border-white/20"
      >
        <NavLink to="/" className={navItemClass}>
          <Home className="w-4 h-4 stroke-[1.8]" />
          <span>Beranda</span>
        </NavLink>

        <NavLink to="/explore/movie" className={navItemClass}>
          <Compass className="w-4 h-4 stroke-[1.8]" />
          <span>Jelajahi</span>
        </NavLink>

        {/* Center: Titik 3 dengan Logo X untuk Mengakses Semua Fitur */}
        <button
          type="button"
          onClick={onOpenFeatures}
          aria-label="Akses semua fitur (Titik 3 Logo X)"
          title="Semua Fitur Zhafx"
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-medium text-white active:scale-90 transition-transform ios-spring cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-white/[0.12] to-white/[0.22] border border-white/30 flex items-center justify-center shadow-lg text-[#FFB224]">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none" stroke="currentColor">
              <path d="M5 5L19 19M19 5L5 19" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="5" cy="5" r="1.8" fill="#FFB224" stroke="none" />
              <circle cx="12" cy="12" r="2" fill="#FFFFFF" stroke="none" />
              <circle cx="19" cy="19" r="1.8" fill="#FFB224" stroke="none" />
            </svg>
          </div>
          <span className="text-[10px] text-white/90 font-semibold">Fitur X</span>
        </button>

        {/* Tanya AI */}
        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Tanya AI"
          className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium text-white/80 active:scale-90 transition-transform ios-spring cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-white/[0.12] border border-white/20 flex items-center justify-center shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#FFB224]" />
          </div>
          <span>AI</span>
        </button>

        <NavLink to="/login" className={navItemClass}>
          <User className="w-4 h-4 stroke-[1.8]" />
          <span>Akun</span>
        </NavLink>
      </nav>
    </div>
  );
};
