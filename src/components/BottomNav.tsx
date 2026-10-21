import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IoHomeOutline, IoVideocamOutline, IoBookmarkOutline, IoSparkles } from 'react-icons/io5';

interface BottomNavProps {
  onOpenAI: () => void;
  onOpenFeatures: () => void;
  onOpenAuth?: () => void;
}

interface BottomMenuItem {
  title: string;
  icon: React.ReactNode;
  id: string;
  action: () => void;
  isActive: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ onOpenAI, onOpenFeatures }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const menuItems: BottomMenuItem[] = [
    {
      title: 'BERANDA',
      icon: <IoHomeOutline className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110" />,
      id: 'home',
      action: () => navigate('/'),
      isActive: currentPath === '/',
    },
    {
      title: 'FILM',
      icon: <IoVideocamOutline className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110" />,
      id: 'movie',
      action: () => navigate('/explore/movie'),
      isActive: currentPath.startsWith('/explore'),
    },
    {
      title: 'FITUR X',
      icon: <span className="font-black text-sm text-white leading-none tracking-tighter">X</span>,
      id: 'features',
      action: onOpenFeatures,
      isActive: false,
    },
    {
      title: 'TANYA AI',
      icon: <IoSparkles className="w-4 h-4 text-white transition-transform duration-300 group-hover:scale-110" />,
      id: 'ai',
      action: onOpenAI,
      isActive: false,
    },
    {
      title: 'DAFTAR',
      icon: <IoBookmarkOutline className="w-5 h-5 text-white transition-transform duration-300 group-hover:scale-110" />,
      id: 'list',
      action: () => navigate('/my-list'),
      isActive: currentPath === '/my-list' || currentPath === '/history',
    },
  ];

  return (
    <div className="md:hidden fixed bottom-3 sm:bottom-5 left-2 right-2 xs:left-3 xs:right-3 z-40 flex justify-center pointer-events-none pb-[env(safe-area-inset-bottom)]">
      <nav
        aria-label="Navigasi Bawah Apple iOS Liquid Glass"
        className="w-auto max-w-[96vw] h-15 rounded-full liquid-glass-dense shadow-[0_16px_40px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1.5 xs:gap-2 p-1.5 pointer-events-auto border border-white/20 select-none backdrop-blur-2xl"
      >
        {menuItems.map(({ title, icon, id, action, isActive }) => {
          // Hanya expand menjadi teks saat di-hover; tampilan awal selalu menampilkan icon/logo
          const isItemExpanded = hoveredId === id;

          return (
            <button
              key={id}
              type="button"
              onClick={action}
              onMouseEnter={() => setHoveredId(id)}
              onMouseLeave={() => setHoveredId(null)}
              aria-label={title}
              className={`relative h-[44px] rounded-full flex items-center justify-center transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] group cursor-pointer overflow-visible select-none active:scale-95 ${
                isItemExpanded
                  ? 'w-[104px] xs:w-[114px] bg-white/[0.22] border-white/40 shadow-[0_6px_22px_rgba(0,0,0,0.45),inset_0_1.5px_2px_rgba(255,255,255,0.7)]'
                  : isActive
                  ? 'w-[44px] bg-white/[0.18] border-white/35 shadow-[0_0_16px_rgba(255,255,255,0.18),inset_0_1px_1.5px_rgba(255,255,255,0.6)]'
                  : 'w-[44px] bg-white/[0.06] hover:bg-white/[0.14] border-white/15 hover:border-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.3)]'
              } border`}
            >
              {/* Glass Frosted Rim */}
              <span className="absolute inset-0 rounded-full liquid-glass pointer-events-none opacity-50" />

              {/* Specular Top Edge Light Catch on Glass */}
              <span className="absolute inset-x-2 top-0.5 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full pointer-events-none" />

              {/* Frosted monochrome glass glow underneath (no rainbow) */}
              <span
                className={`absolute top-[4px] inset-x-1 h-full rounded-full bg-white/20 blur-[10px] -z-10 transition-opacity duration-300 pointer-events-none ${
                  isItemExpanded ? 'opacity-80' : isActive ? 'opacity-50' : 'opacity-0 group-hover:opacity-30'
                }`}
              />

              {/* Icon (Logo Home, Film, X, AI, Daftar) - always visible initially! */}
              <span
                className={`relative z-10 transition-all duration-250 flex items-center justify-center pointer-events-none ${
                  isItemExpanded ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                }`}
              >
                {icon}
              </span>

              {/* Active Indicator Micro-dot (visible only when active and not expanded) */}
              {isActive && !isItemExpanded && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,1)] pointer-events-none" />
              )}

              {/* Title - reveals only when hovered */}
              <span
                className={`absolute text-white uppercase tracking-wider text-[11px] font-bold transition-all duration-250 drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] whitespace-nowrap pointer-events-none ${
                  isItemExpanded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                }`}
              >
                {title}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
