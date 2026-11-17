import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IoCompassOutline,
  IoCompass,
  IoSearchOutline,
  IoSearch,
  IoBookmarkOutline,
  IoBookmark,
} from 'react-icons/io5';
import { HomeSimpleIcon } from './icons/HomeSimpleIcon';
import { BottomNavTabId, getActiveBottomNavId } from '../lib/navigation';

interface BottomNavProps {
  onOpenFeatures: () => void;
  onOpenAuth?: () => void;
}

interface BottomMenuItem {
  id: BottomNavTabId;
  label: string;
  ariaLabel: string;
  icon: (active: boolean) => React.ReactNode;
  action: () => void;
  isCenterHub?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenFeatures }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeId = getActiveBottomNavId(location.pathname);

  const menuItems: BottomMenuItem[] = [
    {
      id: 'home',
      label: 'Beranda',
      ariaLabel: 'Beranda',
      icon: () => <HomeSimpleIcon size={20} />,
      action: () => navigate('/'),
    },
    {
      id: 'explore',
      label: 'Jelajahi',
      ariaLabel: 'Jelajahi Katalog',
      icon: (active) =>
        active ? <IoCompass className="w-5 h-5" /> : <IoCompassOutline className="w-5 h-5" />,
      action: () => navigate('/explore/movie'),
    },
    {
      id: 'features',
      label: 'Menu',
      ariaLabel: 'Menu Fitur Zhafx X',
      isCenterHub: true,
      icon: () => (
        <span className="w-7 h-7 rounded-full bg-white text-[#06070B] font-black text-[13px] tracking-tighter flex items-center justify-center shadow-[0_2px_10px_rgba(255,255,255,0.28)] transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
          X
        </span>
      ),
      action: onOpenFeatures,
    },
    {
      id: 'search',
      label: 'Cari',
      ariaLabel: 'Pencarian Tayangan',
      icon: (active) =>
        active ? <IoSearch className="w-5 h-5" /> : <IoSearchOutline className="w-5 h-5" />,
      action: () => navigate('/search'),
    },
    {
      id: 'list',
      label: 'Daftar',
      ariaLabel: 'Daftar Saya & Riwayat',
      icon: (active) =>
        active ? <IoBookmark className="w-5 h-5" /> : <IoBookmarkOutline className="w-5 h-5" />,
      action: () => navigate('/my-list'),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-[calc(0.65rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 flex justify-center pointer-events-none">
      <nav
        aria-label="Navigasi Bawah"
        className="pointer-events-auto relative w-full max-w-[430px] rounded-[26px] liquid-glass-dense border border-white/20 shadow-[0_18px_44px_rgba(0,0,0,0.75)] px-1.5 py-1.5 select-none overflow-hidden"
      >
        {/* Top Specular Glass Rim */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/55 to-transparent"
        />

        <div className="relative z-10 grid grid-cols-5 items-center gap-1">
          {menuItems.map(({ id, label, ariaLabel, icon, action, isCenterHub }) => {
            const isActive = activeId === id;

            return (
              <button
                key={id}
                type="button"
                onClick={action}
                aria-label={ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex flex-col items-center justify-center gap-0.5 h-[54px] px-1 py-1 rounded-[20px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer ios-spring ${
                  isCenterHub
                    ? 'border border-transparent text-white hover:bg-white/[0.08]'
                    : isActive
                    ? 'bg-white/[0.16] border border-white/25 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.35)]'
                    : 'border border-transparent text-white/65 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                {/* Active top rim glow */}
                {isActive && !isCenterHub && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-[1px] w-6 h-[2px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                  />
                )}

                <span
                  className={`h-7 flex items-center justify-center transition-transform duration-200 ${
                    isActive && !isCenterHub ? 'scale-105' : 'group-hover:scale-105'
                  }`}
                >
                  {icon(isActive)}
                </span>

                <span
                  className={`text-[10px] leading-none tracking-tight whitespace-nowrap ${
                    isActive || isCenterHub ? 'font-bold text-white' : 'font-medium text-white/70 group-hover:text-white'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
