import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Bookmark,
  History,
  Sparkles,
  Home,
} from 'lucide-react';

interface BottomNavProps {
  onOpenAI: () => void;
  onOpenFeatures: () => void;
  onOpenAuth?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAI, onOpenFeatures }) => {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 px-2.5 xs:px-3 py-1.5 min-h-[44px] min-w-[48px] xs:min-w-[52px] shrink-0 rounded-full text-[10px] font-medium transition-all ios-spring whitespace-nowrap ${
      isActive
        ? 'text-white font-semibold bg-white/[0.18] shadow-sm'
        : 'text-zinc-200 hover:text-white active:scale-95'
    }`;

  return (
    <div className="md:hidden fixed bottom-3 sm:bottom-5 left-2 right-2 xs:left-3 xs:right-3 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Navigasi Bawah Apple iOS"
        className="w-auto max-w-[95vw] h-15 rounded-full liquid-glass-dense shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1 xs:gap-2 px-3 pointer-events-auto border border-white/20 select-none"
      >
        {/* 1. Daftar Saya */}
        <NavLink to="/my-list" className={navItemClass}>
          <Bookmark className="w-4 h-4 stroke-[1.8]" />
          <span>Daftar</span>
        </NavLink>

        {/* 2. Riwayat Nonton */}
        <NavLink to="/history" className={navItemClass}>
          <History className="w-4 h-4 stroke-[1.8]" />
          <span>Riwayat</span>
        </NavLink>

        {/* 3. Center: Tombol X Fitur Utama (Cuma X tanpa keterangan, di tengah) */}
        <button
          type="button"
          onClick={onOpenFeatures}
          aria-label="X"
          title="X"
          className="flex items-center justify-center p-1 min-h-[44px] min-w-[44px] shrink-0 active:scale-90 transition-transform ios-spring cursor-pointer mx-0.5"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-white/[0.22] to-white/[0.36] border border-white/40 flex items-center justify-center shadow-lg text-white font-black text-sm">
            <span className="leading-none">X</span>
          </div>
        </button>

        {/* 4. Tanya AI */}
        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Tanya AI"
          className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 min-h-[44px] min-w-[48px] shrink-0 rounded-full text-[10px] font-medium text-zinc-200 hover:text-white active:scale-90 transition-transform ios-spring cursor-pointer whitespace-nowrap"
        >
          <div className="w-6 h-6 rounded-full bg-white/[0.12] border border-white/20 flex items-center justify-center shadow-inner text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span>Tanya AI</span>
        </button>

        {/* 5. Home (menggantikan Masuk) */}
        <NavLink to="/" end className={navItemClass}>
          <Home className="w-4 h-4 stroke-[1.8]" />
          <span>Home</span>
        </NavLink>
      </nav>
    </div>
  );
};
