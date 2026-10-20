import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Film,
  Tv,
  Clapperboard,
  Bookmark,
  History,
  Sparkles,
  User as UserIcon,
} from 'lucide-react';
import { storage } from '../lib/storage';
import { User } from '../types';

interface BottomNavProps {
  onOpenAI: () => void;
  onOpenFeatures: () => void;
  onOpenAuth: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAI, onOpenFeatures, onOpenAuth }) => {
  const [user, setUser] = useState<User | null>(() => storage.getUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(storage.getUser());
    };
    window.addEventListener('zhafx_auth_change', handleAuthChange);
    return () => window.removeEventListener('zhafx_auth_change', handleAuthChange);
  }, []);

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
        className="w-auto max-w-[95vw] h-15 rounded-full liquid-glass-dense liquid-specular shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex items-center gap-0.5 xs:gap-1 px-2.5 pointer-events-auto border border-white/20 overflow-x-auto scrollbar-none scroll-smooth touch-pan-x select-none"
      >
        {/* 1. Beranda */}
        <NavLink to="/" className={navItemClass}>
          <Home className="w-4 h-4 stroke-[1.8]" />
          <span>Beranda</span>
        </NavLink>

        {/* 2. Film */}
        <NavLink to="/explore/movie" className={navItemClass}>
          <Film className="w-4 h-4 stroke-[1.8]" />
          <span>Film</span>
        </NavLink>

        {/* 3. Serial TV */}
        <NavLink to="/explore/tv" className={navItemClass}>
          <Tv className="w-4 h-4 stroke-[1.8]" />
          <span>Serial TV</span>
        </NavLink>

        {/* 4. Anime */}
        <NavLink to="/explore/anime" className={navItemClass}>
          <Clapperboard className="w-4 h-4 stroke-[1.8]" />
          <span>Anime</span>
        </NavLink>

        {/* 5. Center: Tombol X Fitur Utama (min 44x44px) */}
        <button
          type="button"
          onClick={onOpenFeatures}
          aria-label="Fitur Utama X"
          title="X"
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-h-[44px] min-w-[44px] shrink-0 rounded-full text-[10px] font-medium text-white active:scale-90 transition-transform ios-spring cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-white/[0.14] to-white/[0.24] border border-white/30 flex items-center justify-center shadow-lg text-white">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none" stroke="currentColor">
              <path d="M5 5L19 19M19 5L5 19" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="5" cy="5" r="1.8" fill="#FFFFFF" stroke="none" />
              <circle cx="12" cy="12" r="2" fill="#FFFFFF" stroke="none" />
              <circle cx="19" cy="19" r="1.8" fill="#FFFFFF" stroke="none" />
            </svg>
          </div>
          <span className="text-[10px] text-white font-bold leading-none">X</span>
        </button>

        {/* 6. Daftar Saya */}
        <NavLink to="/my-list" className={navItemClass}>
          <Bookmark className="w-4 h-4 stroke-[1.8]" />
          <span>Daftar</span>
        </NavLink>

        {/* 7. Riwayat Nonton */}
        <NavLink to="/history" className={navItemClass}>
          <History className="w-4 h-4 stroke-[1.8]" />
          <span>Riwayat</span>
        </NavLink>

        {/* 8. Tanya AI (min 44x44px) */}
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

        {/* 9. Akun / Masuk (min 44x44px) */}
        <button
          type="button"
          onClick={user ? onOpenFeatures : onOpenAuth}
          aria-label={user ? 'Akun Saya' : 'Masuk Google'}
          className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 min-h-[44px] min-w-[48px] shrink-0 rounded-full text-[10px] font-medium text-zinc-200 hover:text-white active:scale-90 transition-transform ios-spring cursor-pointer whitespace-nowrap"
        >
          {user ? (
            user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-6 h-6 rounded-full object-cover border border-white/30 shadow-sm"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-white text-black font-bold text-[10px] flex items-center justify-center uppercase shadow-sm">
                {user.name?.charAt(0) || 'U'}
              </div>
            )
          ) : (
            <div className="w-6 h-6 rounded-full bg-white/[0.12] border border-white/20 flex items-center justify-center shadow-inner text-white">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
          )}
          <span>{user ? user.name?.split(' ')[0] : 'Masuk'}</span>
        </button>
      </nav>
    </div>
  );
};
