import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  IoSearchOutline,
  IoSparkles,
  IoPersonOutline,
  IoLogOutOutline,
  IoBookmarkOutline,
  IoTimeOutline,
  IoChevronDownOutline,
  IoVideocamOutline,
  IoLogInOutline,
} from 'react-icons/io5';
import { Logo } from './Logo';
import { PillBase, NavItem } from '@/components/ui/3d-adaptive-navigation-bar';
import { ProfileModal } from './ProfileModal';
import { BotMessageSquareIcon } from './icons/BotMessageSquareIcon';
import { storage } from '../lib/storage';
import { supabase } from '../lib/supabase';
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
  const [hasScrolled, setHasScrolled] = useState(() => (typeof window !== 'undefined' ? window.scrollY > 25 : false));
  const [user, setUser] = useState<User | null>(() => storage.getUser());
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  // Global event listener to open Profile Modal from any component
  useEffect(() => {
    const handleOpenProfile = () => {
      setIsProfileModalOpen(true);
    };
    window.addEventListener('open-zhafx-profile', handleOpenProfile);
    return () => window.removeEventListener('open-zhafx-profile', handleOpenProfile);
  }, []);

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

  // Track scroll position: transparent when at the top ("mentok atas"), frosted glass when scrolled down
  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 25);
    };
    handleScroll();
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
    try {
      await supabase.auth.signOut();
    } catch {
      // silent
    }
    storage.clearAuth();
    setUser(null);
    setIsProfileMenuOpen(false);
  };

  return (
    <header className="fixed top-2.5 sm:top-4 left-2.5 right-2.5 sm:left-6 sm:right-6 max-w-7xl mx-auto z-40 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-auto">
      <div className={`w-full px-3 sm:px-6 h-14 sm:h-16 rounded-[24px] sm:rounded-full flex items-center justify-between gap-2 sm:gap-4 relative !overflow-visible transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        hasScrolled ? 'shadow-[0_16px_36px_rgba(0,0,0,0.55)]' : ''
      }`}>
        {/* Smooth Glass & Backdrop Filter Layer - Hardware accelerated opacity crossfade with deep blur */}
        <div
          className="absolute inset-0 rounded-[24px] sm:rounded-full pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] liquid-glass-dense border border-white/20 will-change-[opacity,backdrop-filter]"
          style={{
            opacity: hasScrolled ? 1 : 0,
            backdropFilter: hasScrolled ? 'blur(36px) saturate(200%)' : 'none',
            WebkitBackdropFilter: hasScrolled ? 'blur(36px) saturate(200%)' : 'none',
          }}
        />

        {/* Specular Diagonal Sheen Layer with Opacity Transition */}
        <div
          className="absolute inset-0 rounded-[24px] sm:rounded-full pointer-events-none transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            opacity: hasScrolled ? 1 : 0,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 35%, transparent 65%)',
          }}
        />

        {/* Left: Official ZHAFX Logo & Desktop 3D Adaptive Navigation Bar - Anchored Left */}
        <div className="relative z-10 flex items-center justify-start gap-2.5 sm:gap-3.5 shrink-0 origin-left">
          <div className={`transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${hasScrolled ? 'opacity-100' : 'opacity-85 hover:opacity-100'}`}>
            <Logo size="md" />
          </div>

          {/* 3D Adaptive Navigation Pill - Beranda anchored on left, opens towards right */}
          <div className="hidden md:flex items-center origin-left">
            <PillBase
              items={NAV_ITEMS}
              activeId={currentActiveId}
              onChange={(id) => navigate(id)}
              theme={hasScrolled ? 'glass' : 'transparent'}
              height={42}
              collapsedWidth={122}
              expandedWidth={550}
            />
          </div>
        </div>

        {/* Right Action Buttons with Transparent Top Bar State */}
        <div className="relative z-10 flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Glass Search Button */}
          <button
            onClick={() => navigate('/search')}
            aria-label="Pencarian tayangan"
            className={`group flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-h-[44px] min-w-[44px] ios-spring ${
              hasScrolled
                ? 'bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 hover:border-white/25 text-white/80 hover:text-white shadow-sm nav-shimmer'
                : 'bg-transparent hover:bg-white/10 border border-transparent hover:border-white/20 text-white/80 hover:text-white shadow-none'
            }`}
          >
            <IoSearchOutline className="w-4 h-4 text-white transition-transform duration-200 group-hover:scale-115 group-hover:-translate-y-0.5" />
            <span className="hidden sm:inline text-[12px] group-hover:text-white transition-colors">Cari</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 rounded-full bg-white/10 text-[9px] text-white/70 group-hover:bg-white/20 transition-colors">
              /
            </kbd>
          </button>

          {/* Logo X (Features Modal - desktop only, mobile has it in BottomNav) */}
          <button
            type="button"
            onClick={onOpenFeatures}
            aria-label="Fitur Utama X"
            title="Menu Fitur Zhafx X"
            className={`group btn-features-x hidden md:flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full font-black text-sm cursor-pointer min-h-[36px] min-w-[36px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              hasScrolled
                ? 'bg-white/[0.08] hover:bg-white/[0.18] border border-white/20 text-white shadow-md nav-shimmer'
                : 'bg-transparent hover:bg-white/10 border border-transparent hover:border-white/20 text-white/85 hover:text-white shadow-none'
            }`}
          >
            <span className="leading-none transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110 block">
              X
            </span>
          </button>

          {/* Tanya AI Glass Pill */}
          <button
            onClick={onOpenAI}
            className={`group btn-ai-sparkle hidden sm:inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-full font-medium text-xs cursor-pointer min-h-[44px] min-w-[44px] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              hasScrolled
                ? 'bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-white shadow-sm nav-shimmer'
                : 'bg-transparent hover:bg-white/10 border border-transparent hover:border-white/20 text-white/85 hover:text-white shadow-none'
            }`}
            title="Buka Tanya Zhafx AI"
          >
            <BotMessageSquareIcon size={17} className="text-amber-300 transition-transform duration-300 group-hover:scale-115" />
            <span className="text-[12px] group-hover:text-amber-100 transition-colors">Tanya AI</span>
          </button>

          {/* Login Button or User Profile Dropdown */}
          {user ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center justify-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-white text-xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-h-[44px] min-w-[44px] ios-spring ${
                  hasScrolled
                    ? 'liquid-glass hover:bg-white/[0.18] border border-white/20 hover:border-white/35 text-white shadow-sm nav-shimmer'
                    : 'bg-transparent hover:bg-white/10 border border-transparent hover:border-white/20 text-white/85 hover:text-white shadow-none backdrop-blur-none'
                }`}
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
                <IoChevronDownOutline className="w-3.5 h-3.5 text-white/60" />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-5 sm:mt-6 w-64 rounded-[26px] bg-[#0E1017]/95 backdrop-blur-2xl border border-white/25 shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 z-50 text-white animate-modal-card origin-top-right transform-gpu">
                  <div className="px-3.5 py-2.5 border-b border-white/15 mb-1.5 flex items-center gap-3">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-9 h-9 rounded-full object-cover border border-white/30 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white text-black font-bold text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-white/90 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* 1. Atur Profil Button */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setIsProfileModalOpen(true);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-white hover:bg-white/15 flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                  >
                    <IoPersonOutline className="w-4 h-4 text-white shrink-0" />
                    <span className="text-white">Atur Profil</span>
                  </button>

                  {/* 2. Daftar Saya Button */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/my-list');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-white hover:bg-white/15 flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                  >
                    <IoBookmarkOutline className="w-4 h-4 text-white shrink-0" />
                    <span className="text-white">Daftar Saya</span>
                  </button>

                  {/* 3. Riwayat Nonton Button */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/history');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-white hover:bg-white/15 flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                  >
                    <IoTimeOutline className="w-4 h-4 text-white shrink-0" />
                    <span className="text-white">Riwayat Nonton</span>
                  </button>

                  {/* 4. Putar Intro Sinematik Button */}
                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      window.dispatchEvent(new Event('play-zhafx-intro'));
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-white hover:bg-white/15 flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                  >
                    <IoVideocamOutline className="w-4 h-4 text-white shrink-0" />
                    <span className="text-white">Putar Intro Sinematik</span>
                  </button>

                  {/* 5. Keluar Button */}
                  <div className="pt-1.5 mt-1.5 border-t border-white/15">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2.5 rounded-xl text-left text-xs text-white hover:bg-white/15 flex items-center gap-2.5 cursor-pointer transition-colors font-medium"
                    >
                      <IoLogOutOutline className="w-4 h-4 text-white shrink-0" />
                      <span className="text-white">Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-h-[44px] min-w-[44px] ios-spring shrink-0 ${
                hasScrolled
                  ? 'bg-white hover:bg-zinc-100 text-[#06070B] shadow-md border border-transparent'
                  : 'bg-transparent hover:bg-white/15 border border-white/30 hover:border-white/60 text-white shadow-none backdrop-blur-none'
              }`}
              title="Login ke Akun"
            >
              <IoLogInOutline className={`w-4 h-4 transition-colors duration-500 ${hasScrolled ? 'text-black' : 'text-white'}`} />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Management Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onLogout={handleLogout}
        />
      )}
      </header>
  );
};
