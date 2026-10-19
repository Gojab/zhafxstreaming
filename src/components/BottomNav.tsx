import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Compass, Sparkles, Bookmark, User as UserIcon } from 'lucide-react';
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
    `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ios-spring ${
      isActive
        ? 'text-white font-semibold bg-white/[0.16] shadow-sm'
        : 'text-white/60 hover:text-white active:scale-95'
    }`;

  return (
    <div className="md:hidden fixed bottom-3 sm:bottom-5 left-3 right-3 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Navigasi Bawah Apple iOS"
        className="w-full max-w-[400px] h-14 rounded-full liquid-glass-dense liquid-specular shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex items-center justify-around px-2 pointer-events-auto border border-white/20"
      >
        {/* 1. Beranda */}
        <NavLink to="/" className={navItemClass}>
          <Home className="w-4 h-4 stroke-[1.8]" />
          <span>Beranda</span>
        </NavLink>

        {/* 2. Jelajahi */}
        <NavLink to="/explore/movie" className={navItemClass}>
          <Compass className="w-4 h-4 stroke-[1.8]" />
          <span>Jelajahi</span>
        </NavLink>

        {/* 3. Center: Tombol X */}
        <button
          type="button"
          onClick={onOpenFeatures}
          aria-label="Fitur Utama X"
          title="X"
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium text-white active:scale-90 transition-transform ios-spring cursor-pointer"
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

        {/* 4. Daftar Saya */}
        <NavLink to="/my-list" className={navItemClass}>
          <Bookmark className="w-4 h-4 stroke-[1.8]" />
          <span>Daftar</span>
        </NavLink>

        {/* 5. Tanya AI */}
        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Buka Tanya Zhafx AI"
          className="flex flex-col items-center justify-center gap-0.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium text-white/80 active:scale-90 transition-transform ios-spring cursor-pointer"
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
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          )}
          <span>{user ? user.name?.split(' ')[0] : 'Masuk'}</span>
        </button>
      </nav>
    </div>
  );
};
