import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X as CloseIcon,
  Home,
  Film,
  Tv,
  Sparkles,
  Search,
  Bookmark,
  History,
  ChevronRight,
  Clapperboard,
  User as UserIcon,
  LogOut,
} from 'lucide-react';
import { Logo } from './Logo';
import { storage } from '../lib/storage';
import { User } from '../types';

interface QuickFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI: () => void;
  onOpenAuth: () => void;
}

export const QuickFeaturesModal: React.FC<QuickFeaturesModalProps> = ({
  isOpen,
  onClose,
  onOpenAI,
  onOpenAuth,
}) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => storage.getUser());

  useEffect(() => {
    const handleAuthChange = () => {
      setUser(storage.getUser());
    };
    window.addEventListener('zhafx_auth_change', handleAuthChange);
    return () => window.removeEventListener('zhafx_auth_change', handleAuthChange);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

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
    setUser(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Apple iOS 26 Liquid Glass Feature Sheet */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[32px] sm:rounded-[36px] liquid-glass-dense liquid-specular border border-white/25 shadow-2xl p-5 sm:p-7 space-y-4 z-10 scrollbar-none text-white">
        {/* Top Header: X & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Pusat Fitur</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FFB224]/20 text-[#FFB224] text-[10px] font-mono font-semibold">
                  ZHAFX
                </span>
              </h2>
              <p className="text-[11px] text-white/50">Akses cepat navigasi & katalog streaming</p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Tutup Menu"
            className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* User Account Bar */}
        {user ? (
          <div className="p-3.5 rounded-[22px] bg-white/[0.06] border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FFB224] to-amber-300 text-black font-bold text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{user.name}</span>
                <span className="text-[10px] text-white/50 block truncate">{user.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-[22px] bg-gradient-to-r from-white/[0.08] to-white/[0.03] border border-white/15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">Masuk dengan Akun Google</span>
                <span className="text-[10px] text-white/50 block truncate">
                  Sinkronisasi riwayat & favorit antar perangkat
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
              className="px-3.5 py-1.5 rounded-full bg-white hover:bg-zinc-200 text-black text-xs font-bold shrink-0 cursor-pointer shadow-sm ios-spring"
            >
              Masuk
            </button>
          </div>
        )}

        {/* Feature Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* 1. Beranda */}
          <button
            onClick={() => handleAction('/')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Beranda</span>
              <span className="text-[10px] text-white/50">Halaman utama</span>
            </div>
          </button>

          {/* 2. Jelajahi Film */}
          <button
            onClick={() => handleAction('/explore/movie')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Katalog Film</span>
              <span className="text-[10px] text-white/50">Box Office & Populer</span>
            </div>
          </button>

          {/* 3. Serial TV */}
          <button
            onClick={() => handleAction('/explore/tv')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Serial TV</span>
              <span className="text-[10px] text-white/50">Musim & episode</span>
            </div>
          </button>

          {/* 4. Anime */}
          <button
            onClick={() => handleAction('/explore/anime')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer border border-[#FFB224]/30"
          >
            <div className="w-8 h-8 rounded-full bg-[#FFB224]/20 flex items-center justify-center text-[#FFB224] group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Anime</span>
              <span className="text-[10px] text-white/50">Serial Jepang HD</span>
            </div>
          </button>

          {/* 5. Pencarian */}
          <button
            onClick={() => handleAction('/search')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Pencarian</span>
              <span className="text-[10px] text-white/50">Cari judul & genre</span>
            </div>
          </button>

          {/* 6. Daftar Saya */}
          <button
            onClick={() => handleAction('/my-list')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Daftar Saya</span>
              <span className="text-[10px] text-white/50">Koleksi favorit</span>
            </div>
          </button>

          {/* 7. Riwayat Tontonan */}
          <button
            onClick={() => handleAction('/history')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Riwayat</span>
              <span className="text-[10px] text-white/50">Daftar tontonan</span>
            </div>
          </button>

          {/* 8. Intro Sinematik Epic */}
          <button
            onClick={() => {
              onClose();
              window.dispatchEvent(new Event('play-zhafx-intro'));
            }}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer border border-[#FFB224]/30"
          >
            <div className="w-8 h-8 rounded-full bg-[#FFB224]/20 flex items-center justify-center text-[#FFB224] group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Intro Epic</span>
              <span className="text-[10px] text-white/50">Putar animasi</span>
            </div>
          </button>
        </div>

        {/* Bottom Action: Tanya Zhafx AI */}
        <div className="pt-2 border-t border-white/[0.12]">
          <button
            onClick={() => {
              onClose();
              onOpenAI();
            }}
            className="w-full p-3.5 rounded-[22px] bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/30 hover:border-amber-500/50 flex items-center justify-between text-left transition-all ios-spring cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FFB224] text-black flex items-center justify-center shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Tanya Zhafx AI</span>
                <span className="text-[10px] text-white/60">
                  Rekomendasi tayangan pintar sesuai seleramu
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </div>
  );
};
