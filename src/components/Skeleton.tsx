import React from 'react';

export const MediaCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 animate-pulse w-full">
      <div className="aspect-[2/3] w-full rounded-[16px] sm:rounded-[20px] bg-white/[0.04] border border-white/[0.08] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.06] to-transparent" />
      </div>
      <div className="h-4 w-3/4 rounded-full bg-white/[0.08]" />
      <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="relative z-10 w-full h-[540px] xs:h-[580px] sm:h-[75vh] sm:min-h-[540px] sm:max-h-[780px] overflow-hidden bg-[#0c0e17] select-none mb-4 sm:mb-10 animate-pulse"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#06070B] via-[#06070B]/40 to-transparent" />
      <div className="relative z-10 h-full w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col justify-end pb-16 sm:pb-20 space-y-3 sm:space-y-4">
        {/* Badges */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 rounded-full bg-white/[0.08]" />
          <div className="h-6 w-14 rounded-full bg-white/[0.08]" />
          <div className="h-4 w-10 rounded-full bg-white/[0.04]" />
        </div>
        {/* Title */}
        <div className="h-8 sm:h-12 md:h-14 w-3/4 max-w-lg rounded-2xl bg-white/[0.08]" />
        {/* Synopsis */}
        <div className="space-y-1.5 max-w-xl">
          <div className="h-3.5 w-full rounded-full bg-white/[0.05]" />
          <div className="h-3.5 w-5/6 rounded-full bg-white/[0.05]" />
        </div>
        {/* Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 pt-2">
          <div className="h-10 sm:h-11 w-28 rounded-full bg-white/[0.15]" />
          <div className="h-10 sm:h-11 w-32 rounded-full bg-white/[0.08]" />
          <div className="h-10 sm:h-11 w-20 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
};

export const MediaRowSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="space-y-3 sm:space-y-4 px-4 sm:px-6 md:px-8 animate-pulse">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="h-5 sm:h-6 w-36 sm:w-48 rounded-full bg-white/[0.08]" />
          <div className="h-3 w-48 sm:w-64 rounded-full bg-white/[0.04]" />
        </div>
        <div className="h-7 sm:h-8 w-24 rounded-full bg-white/[0.06]" />
      </div>
      <div className="flex gap-3 sm:gap-5 overflow-hidden pb-3 sm:pb-4 pt-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 w-32 xs:w-36 sm:w-44 md:w-48 shrink-0">
            <div className="aspect-[2/3] w-full rounded-[16px] sm:rounded-[20px] bg-white/[0.04] border border-white/[0.08]" />
            <div className="h-3.5 w-3/4 rounded-full bg-white/[0.06]" />
            <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen animate-pulse space-y-8 pb-16">
      <div className="w-full h-[50vh] bg-white/[0.03]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-36 relative z-10 flex flex-col md:flex-row gap-8">
        <div className="w-48 sm:w-64 aspect-[2/3] rounded-[20px] bg-white/[0.06] shrink-0 border border-white/10" />
        <div className="flex-1 rounded-[32px] liquid-glass p-6 sm:p-8 space-y-4">
          <div className="h-8 w-2/3 rounded-full bg-white/[0.1]" />
          <div className="h-4 w-1/3 rounded-full bg-white/[0.06]" />
          <div className="h-20 w-full rounded-[18px] bg-white/[0.04]" />
          <div className="flex gap-3 pt-4">
            <div className="h-12 w-36 rounded-full bg-white/[0.12]" />
            <div className="h-12 w-36 rounded-full bg-white/[0.08]" />
          </div>
        </div>
      </div>
    </div>
  );
};
