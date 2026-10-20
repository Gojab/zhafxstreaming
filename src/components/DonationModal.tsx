import React, { useEffect } from 'react';
import { X, Heart, ExternalLink, QrCode } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose }) => {
  const QR_IMAGE_PATH = '/assets/aistudio/image_99da0401.png';

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="donation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      {/* Semi-transparent Blurred Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Main Glass Modal Card */}
      <div className="relative w-full max-w-[360px] sm:max-w-[400px] max-h-[92vh] overflow-y-auto rounded-[28px] sm:rounded-[36px] liquid-glass-dense liquid-specular border border-white/20 shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 space-y-4 z-10 scrollbar-none text-white">
        
        {/* Header: Title, Icon & Close Button */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.12]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF5C6C]/25 to-[#FFA800]/25 border border-[#FF5C6C]/40 flex items-center justify-center text-[#FF5C6C] shadow-sm shrink-0">
              <Heart className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 id="donation-modal-title" className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Dukungan Zhafx</span>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-white/90 font-mono font-semibold">
                  Saweria
                </span>
              </h2>
              <p className="text-[11px] text-white/60">Dukung server streaming tetap aktif & gratis</p>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Pop Up Donasi"
            className="w-8 h-8 sm:w-9 sm:h-9 min-w-[36px] min-h-[36px] rounded-full liquid-glass flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer ios-spring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Subtext */}
        <p className="text-xs text-white/75 leading-relaxed text-center px-1">
          Zhafx berkomitmen menghadirkan film, serial, dan anime tanpa iklan mengganggu. Dukungan kamu sangat berarti untuk biaya server kami!
        </p>

        {/* QR Code Image Container */}
        <div className="relative w-full aspect-square max-w-[260px] sm:max-w-[280px] mx-auto rounded-2xl sm:rounded-3xl overflow-hidden bg-white p-2.5 shadow-2xl border-2 border-white/30 flex items-center justify-center">
          <img
            src={QR_IMAGE_PATH}
            alt="QR Donasi Saweria Zhafx"
            width={280}
            height={280}
            loading="eager"
            className="w-full h-full object-contain rounded-xl select-none"
          />
        </div>

        {/* Supported Payment Badges */}
        <div className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] border border-white/10 text-[10px] sm:text-[11px] font-medium text-white/85">
            <QrCode className="w-3.5 h-3.5 text-amber-400" />
            <span>Mendukung QRIS, GoPay, OVO, DANA, ShopeePay</span>
          </div>
          <p className="text-[10px] text-white/50">
            Scan QR langsung dari aplikasi e-wallet atau m-banking kamu
          </p>
        </div>

        {/* Action Buttons: Tutup & Link Saweria */}
        <div className="pt-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-full bg-white text-[#06070B] hover:bg-white/90 font-bold text-xs sm:text-sm shadow-[0_4px_20px_rgba(255,255,255,0.2)] ios-spring cursor-pointer min-h-[42px] flex items-center justify-center"
          >
            Tutup
          </button>

          <a
            href="https://saweria.co/widgets/qr?streamKey=d4891ff50a5afae98d96e8bc278f8344"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <span>Buka link Saweria di tab baru</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
