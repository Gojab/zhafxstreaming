import React, { useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Sparkles, Bookmark, History, User as UserIcon } from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  onOpenAI: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAI }) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated } = useAuth();

  // Global hotkey "/" to focus search
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
    `text-xs sm:text-sm font-medium transition-all px-3 py-1.5 rounded-xl ${
      isActive
        ? 'text-white font-semibold bg-white/[0.08] border border-white/10'
        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090A0E]/85 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6 md:gap-8">
          <Logo size="md" />

          {/* Desktop Navigation Links */}
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

        {/* Right: Search, Tanya AI, and actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Trigger Button */}
          <button
            onClick={() => navigate('/search')}
            aria-label="Pencarian tayangan (tekan / untuk jalan pintas)"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111319] hover:bg-[#181A22] border border-white/[0.08] hover:border-white/20 text-zinc-400 hover:text-white text-xs transition-all cursor-pointer min-h-[38px]"
          >
            <Search className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Cari film, serial...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-md bg-black/40 border border-white/[0.08] text-[10px] text-zinc-400">
              /
            </kbd>
          </button>

          {/* Tanya AI Button */}
          <button
            onClick={onOpenAI}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#181A22] hover:bg-[#232632] border border-white/10 hover:border-white/25 text-zinc-200 hover:text-white font-medium text-xs transition-all duration-200 active:scale-95 cursor-pointer min-h-[38px]"
            title="Buka asisten rekomendasi AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
            <span>Tanya AI</span>
          </button>

          {/* User Account / Login Button */}
          <NavLink
            to="/login"
            className="inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[#111319] hover:bg-[#181A22] border border-white/[0.08] hover:border-white/20 text-xs font-medium text-zinc-200 hover:text-white transition-all cursor-pointer min-h-[38px]"
            title={isAuthenticated ? `Akun: ${user?.name}` : 'Masuk ke Zhafx'}
          >
            {isAuthenticated && user ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-zinc-700 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate text-white">{user.name}</span>
              </>
            ) : (
              <>
                <UserIcon className="w-4 h-4 text-zinc-400" />
                <span className="hidden sm:inline">Masuk</span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </header>
  );
};
