import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IoCloseOutline as CloseIcon,
  IoHomeOutline as Home,
  IoFilmOutline as Film,
  IoTvOutline as Tv,
  IoSparkles as Sparkles,
  IoSearchOutline as Search,
  IoBookmarkOutline as Bookmark,
  IoTimeOutline as History,
  IoChevronForwardOutline as ChevronRight,
  IoVideocamOutline as Clapperboard,
  IoPersonOutline as UserIcon,
  IoLogOutOutline as LogOut,
  IoHeart as Heart,
} from 'react-icons/io5';
import { HomeSimpleIcon } from './icons/HomeSimpleIcon';
import { BotMessageSquareIcon } from './icons/BotMessageSquareIcon';
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

  // Close on Escape & freeze background scroll
  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.classList.add('modal-open');

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
      document.body.classList.remove('modal-open');
    };
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pusat Fitur Zhafx"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
    >
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Apple iOS 26 Liquid Glass Feature Sheet */}
      <div className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth rounded-[32px] sm:rounded-[36px] liquid-glass-dense border border-white/25 shadow-2xl p-5 sm:p-7 space-y-4 z-10 text-white">
        {/* Top Header: X & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Pusat Fitur</span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-mono font-semibold">
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
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="w-9 h-9 rounded-full object-cover border border-white/30 shrink-0"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white text-black font-bold text-sm flex items-center justify-center uppercase shadow-sm shrink-0">
                  {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block truncate">{user.name}</span>
                <span className="text-[10px] text-white/50 block truncate">{user.email}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  onClose();
                  window.dispatchEvent(new Event('open-zhafx-profile'));
                }}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Atur Profil</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                <span className="text-white">Keluar</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-[22px] bg-gradient-to-r from-white/[0.08] to-white/[0.03] border border-white/15 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md shrink-0">
                <UserIcon className="w-4 h-4 text-black" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">Login Akun</span>
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
              Login
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
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
              <HomeSimpleIcon size={18} />
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
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
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
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
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
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer border border-white/20"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
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
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
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
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
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
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
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
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer border border-white/20"
          >
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-colors">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Intro Epic</span>
              <span className="text-[10px] text-white/50">Putar animasi</span>
            </div>
          </button>

          {/* 9. Donasi Saweria QR */}
          <button
            onClick={() => {
              onClose();
              window.dispatchEvent(new Event('open-zhafx-donation'));
            }}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.14] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer border border-[#FF5C6C]/30 bg-[#FF5C6C]/10"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF5C6C]/25 flex items-center justify-center text-[#FF5C6C] group-hover:bg-[#FF5C6C] group-hover:text-white transition-colors">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Donasi QR</span>
              <span className="text-[10px] text-white/60">Saweria QRIS</span>
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
            className="w-full p-3.5 rounded-[22px] bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 flex items-center justify-between text-left transition-all ios-spring cursor-pointer shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shadow-md">
                <BotMessageSquareIcon size={20} className="text-black" />
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
