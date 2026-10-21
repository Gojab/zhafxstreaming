import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, Sparkles, User as UserIcon, LogOut, Bookmark, History, ChevronDown, Clapperboard } from 'lucide-react';
import { Logo } from './Logo';
import { PillBase, NavItem } from '@/components/ui/3d-adaptive-navigation-bar';
import { storage } from '../lib/storage';
import { User } from '../types';

interface NavbarProps {
  onOpenAI: () => void;
  onOpenFeatures: () => void;
  onOpenAuth: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Beranda', id: '/' },
  { label: 'Film', id: '/explore/movie' },
  { label: 'Serial TV', id: '/explore/tv' },
  { label: 'Anime', id: '/explore/anime' },
  { label: 'Daftar Saya', id: '/my-list' },
  { label: 'Riwayat', id: '/history' },
];

export const Navbar: React.FC<NavbarProps> = ({ onOpenAI, onOpenFeatures, onOpenAuth }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [hasScrolled, setHasScrolled] = useState(false);
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Active item resolution for the 3D Adaptive Pill
  const currentActiveId =
    NAV_ITEMS.find((item) => item.id === currentPath)?.id ||
    (currentPath.startsWith('/explore/movie')
      ? '/explore/movie'
      : currentPath.startsWith('/explore/tv')
      ? '/explore/tv'
      : currentPath.startsWith('/explore/anime')
      ? '/explore/anime'
      : currentPath.startsWith('/detail') || currentPath.startsWith('/watch')
      ? currentPath.includes('/tv/')
        ? '/explore/tv'
        : currentPath.includes('/anime/')
        ? '/explore/anime'
        : '/explore/movie'
      : '/');

  // Sync auth state
  useEffect(() => {
    const handleAuthChange = () => {
      setUser(storage.getUser());
    };
    window.addEventListener('zhafx_auth_change', handleAuthChange);
    return () => window.removeEventListener('zhafx_auth_change', handleAuthChange);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${storage.getToken() || ''}`,
        },
      });
    } catch {
      // silent
    }
    storage.removeToken();
    storage.removeUser();
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="fixed top-2.5 sm:top-4 left-2.5 right-2.5 sm:left-6 sm:right-6 max-w-7xl mx-auto z-40 transition-all duration-300">
      <div
        className={`w-full px-3 sm:px-6 h-14 sm:h-16 rounded-[24px] sm:rounded-full flex items-center justify-between gap-2 sm:gap-4 transition-all duration-300 ${
          hasScrolled
            ? 'liquid-glass-dense liquid-specular shadow-2xl'
            : 'liquid-glass liquid-specular shadow-lg'
        }`}
      >
        {/* Left: Official ZHAFX Logo & Desktop 3D Adaptive Navigation Bar */}
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <Logo size="md" />

          {/* 3D Adaptive Navigation Pill - Hover expands with spring physics */}
          <div className="hidden md:flex items-center">
            <PillBase
              items={NAV_ITEMS}
              activeId={currentActiveId}
              onChange={(id) => navigate(id)}
              theme="glass"
              height={42}
              collapsedWidth={134}
              expandedWidth={560}
            />
          </div>
        </div>

        {/* Right Action Buttons with Specular Shimmer and Fluid Spring */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Glass Search Button with Unique Lens Float */}
          <button
            onClick={() => navigate('/search')}
            aria-label="Pencarian tayangan"
            className="group flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 hover:border-white/25 text-white/80 hover:text-white text-xs transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] ios-spring nav-shimmer shadow-sm"
          >
            <Search className="w-3.5 h-3.5 text-white transition-transform duration-200 group-hover:scale-115 group-hover:-translate-y-0.5" />
            <span className="hidden sm:inline text-[12px] group-hover:text-white transition-colors">Cari</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 rounded-full bg-white/10 text-[9px] text-white/70 group-hover:bg-white/20 transition-colors">
              /
            </kbd>
          </button>

          {/* Logo X (Features Modal - Unique Gyro Spin & Prismatic Glow) */}
          <button
            type="button"
            onClick={onOpenFeatures}
            aria-label="Fitur Utama X"
            title="Menu Fitur Zhafx X"
            className="group btn-features-x flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.18] border border-white/20 text-white font-black text-sm cursor-pointer min-h-[36px] min-w-[36px] shadow-md nav-shimmer"
          >
            <span className="leading-none transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 block">
              X
            </span>
          </button>

          {/* Tanya AI Glass Pill - Unique Amber Breathing Glow */}
          <button
            onClick={onOpenAI}
            className="group btn-ai-sparkle hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-white font-medium text-xs cursor-pointer min-h-[44px] min-w-[44px] shadow-sm nav-shimmer"
            title="Buka Tanya Zhafx AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-120" />
            <span className="text-[12px] group-hover:text-amber-100 transition-colors">Tanya AI</span>
          </button>


          {/* Gmail / Google Login Button or User Profile Dropdown */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center justify-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full liquid-glass hover:bg-white/[0.18] border border-white/20 hover:border-white/35 text-white text-xs transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] ios-spring nav-shimmer"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-white/30"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-white text-black font-bold text-[11px] flex items-center justify-center uppercase shadow-sm">
                    {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden md:inline font-semibold text-[12px] max-w-[90px] truncate">
                  {user.name?.split(' ')[0] || 'Akun'}
                </span>
                <ChevronDown className="w-3 h-3 text-white/60" />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-11 w-56 rounded-[22px] liquid-glass-dense liquid-specular border border-white/20 shadow-2xl p-2 z-50 text-white animate-in fade-in duration-150">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-white/50 truncate">{user.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/my-list');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-white" />
                    <span>Daftar Saya</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/history');
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-white" />
                    <span>Riwayat Nonton</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      window.dispatchEvent(new Event('play-zhafx-intro'));
                    }}
                    className="w-full px-3 py-2 rounded-xl text-left text-xs text-white/80 hover:text-white hover:bg-white/10 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Clapperboard className="w-3.5 h-3.5 text-white" />
                    <span>Putar Intro Sinematik</span>
                  </button>

                  <div className="pt-1 mt-1 border-t border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 rounded-xl text-left text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/20 flex items-center gap-2 cursor-pointer transition-colors font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-[#06070B] font-bold text-xs shadow-md transition-all cursor-pointer min-h-[44px] min-w-[44px] ios-spring shrink-0"
              title="Masuk dengan Google atau Email"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
