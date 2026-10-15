import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Sparkles, History, Bookmark, User } from 'lucide-react';

interface BottomNavProps {
  onOpenAI: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAI }) => {
  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-1 w-full h-full py-1.5 text-[10px] font-medium transition-colors ${
      isActive ? 'text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
    }`;

  return (
    <nav
      aria-label="Navigasi Bawah Ponsel"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#090A0E]/95 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2 shadow-2xl"
    >
      <NavLink to="/" className={navItemClass}>
        <Home className="w-5 h-5" />
        <span>Beranda</span>
      </NavLink>

      <NavLink to="/explore/movie" className={navItemClass}>
        <Compass className="w-5 h-5" />
        <span>Jelajahi</span>
      </NavLink>

      {/* Center Tanya AI Button */}
      <button
        onClick={onOpenAI}
        className="flex flex-col items-center justify-center gap-1 w-full h-full py-1 text-[10px] font-medium text-zinc-300 active:scale-95 transition-transform"
      >
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-zinc-200" />
        </div>
        <span>Tanya AI</span>
      </button>

      <NavLink to="/history" className={navItemClass}>
        <History className="w-5 h-5" />
        <span>Riwayat</span>
      </NavLink>

      <NavLink to="/my-list" className={navItemClass}>
        <Bookmark className="w-5 h-5" />
        <span>Daftar</span>
      </NavLink>

      <NavLink to="/login" className={navItemClass}>
        <User className="w-5 h-5" />
        <span>Akun</span>
      </NavLink>
    </nav>
  );
};
