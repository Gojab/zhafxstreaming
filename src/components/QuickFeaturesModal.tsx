import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  X,
  Home,
  Film,
  Tv,
  Sparkles,
  Search,
  Bookmark,
  History,
  Download,
  Wifi,
  WifiOff,
  User,
  PlaySquare,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from './Logo';
import { useOfflineDownloads } from '../hooks/useOfflineDownloads';
import { useAuth } from '../hooks/useAuth';

interface QuickFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAI: () => void;
}

export const QuickFeaturesModal: React.FC<QuickFeaturesModalProps> = ({
  isOpen,
  onClose,
  onOpenAI,
}) => {
  const navigate = useNavigate();
  const { downloads, effectiveOffline, toggleForcedOffline, totalUsedMb } = useOfflineDownloads();
  const { user, isAuthenticated } = useAuth();

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Apple iOS 26 Liquid Glass Feature Sheet */}
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[32px] sm:rounded-[36px] liquid-glass-dense liquid-specular border border-white/25 shadow-2xl p-5 sm:p-7 space-y-6 z-10 scrollbar-none text-white">
        {/* Top Header: Signature X Logo & Close X Button */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Pusat Fitur Zhafx</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FFB224]/20 text-[#FFB224] text-[10px] font-mono font-semibold">
                  Hub
                </span>
              </h2>
              <p className="text-[11px] text-white/50">Akses cepat semua layanan & fitur streaming</p>
            </div>
          </div>

          {/* Close Button with X */}
          <button
            onClick={onClose}
            aria-label="Tutup Menu Fitur"
            className="w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Mode Offline Switch Card */}
        <div className="p-4 rounded-[22px] liquid-glass flex items-center justify-between gap-3 border border-white/15">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${
                effectiveOffline
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {effectiveOffline ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {effectiveOffline ? 'Mode Offline Aktif' : 'Terhubung Online'}
              </span>
              <span className="text-[11px] text-white/55">
                {downloads.length} tayangan tersimpan ({totalUsedMb} MB)
              </span>
            </div>
          </div>

          <button
            onClick={() => toggleForcedOffline()}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ios-spring cursor-pointer ${
              effectiveOffline
                ? 'bg-amber-400 text-black shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
            }`}
          >
            {effectiveOffline ? 'Matikan' : 'Aktifkan Offline'}
          </button>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {/* 1. Beranda */}
          <button
            onClick={() => handleAction('/')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
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
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Katalog Film</span>
              <span className="text-[10px] text-white/50">Box Office & Indie</span>
            </div>
          </button>

          {/* 3. Serial TV */}
          <button
            onClick={() => handleAction('/explore/tv')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Serial TV</span>
              <span className="text-[10px] text-white/50">Musim lengkap</span>
            </div>
          </button>

          {/* 4. Anime */}
          <button
            onClick={() => handleAction('/explore/anime')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Sparkles className="w-4 h-4 text-[#FFB224]" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Anime</span>
              <span className="text-[10px] text-white/50">Koleksi Jepang</span>
            </div>
          </button>

          {/* 5. Pencarian Canggih */}
          <button
            onClick={() => handleAction('/search')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Pencarian</span>
              <span className="text-[10px] text-white/50">Judul & genre</span>
            </div>
          </button>

          {/* 6. Mode Offline & Download Saya */}
          <button
            onClick={() => handleAction('/offline')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer border border-[#FFB224]/30"
          >
            <div className="w-8 h-8 rounded-full bg-[#FFB224]/20 flex items-center justify-center text-[#FFB224] group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block flex items-center gap-1">
                <span>Download</span>
                {downloads.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#FFB224] text-[#06070B] text-[9px] font-bold">
                    {downloads.length}
                  </span>
                )}
              </span>
              <span className="text-[10px] text-white/50">Mode Offline</span>
            </div>
          </button>

          {/* 7. Daftar Saya */}
          <button
            onClick={() => handleAction('/my-list')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <Bookmark className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Daftar Saya</span>
              <span className="text-[10px] text-white/50">Koleksi favorit</span>
            </div>
          </button>

          {/* 8. Riwayat Tontonan */}
          <button
            onClick={() => handleAction('/history')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Riwayat</span>
              <span className="text-[10px] text-white/50">Lanjut menonton</span>
            </div>
          </button>

          {/* 9. Akun & Profil */}
          <button
            onClick={() => handleAction('/login')}
            className="p-3.5 rounded-[20px] liquid-glass hover:bg-white/[0.12] transition-all flex flex-col items-start gap-2 text-left group ios-spring cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:bg-[#FFB224] group-hover:text-black transition-colors">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isAuthenticated ? 'Profil Saya' : 'Masuk Akun'}
              </span>
              <span className="text-[10px] text-white/50">
                {isAuthenticated ? user?.email || 'Aktif' : 'Gmail / Email'}
              </span>
            </div>
          </button>
        </div>

        {/* Bottom Actions: Tanya AI & Putar Intro */}
        <div className="space-y-2 pt-2 border-t border-white/[0.12]">
          {/* Tanya AI */}
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

          {/* Putar Intro Sinematik */}
          <button
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent('play-zhafx-intro'));
            }}
            className="w-full p-3.5 rounded-[22px] liquid-glass hover:bg-white/[0.12] flex items-center justify-between text-left transition-all ios-spring cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-[#FFB224]">
                <PlaySquare className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">Putar Intro Sinematik</span>
                <span className="text-[10px] text-white/50">Animasi pembuka pembiasan kaca ZHAFX</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
    </div>
  );
};
