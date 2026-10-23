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
    <section
      aria-hidden="true"
      className="relative z-10 w-full overflow-hidden bg-transparent select-none mb-4 sm:mb-10 pt-16 sm:pt-20 lg:pt-24 pb-8 sm:pb-12 min-h-[580px] sm:min-h-[640px] lg:min-h-[680px] flex flex-col justify-center animate-pulse"
    >
      {/* Ambient Atmospheric Backdrop Placeholder */}
      <div className="absolute inset-0 z-0 bg-[#0c0e17]/60">
        <div className="absolute inset-x-0 top-0 h-32 sm:h-40 bg-gradient-to-b from-[#06070B] via-[#06070B]/70 to-transparent pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06070B] via-[#06070B]/60 to-transparent pointer-events-none z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#06070B]/85 via-[#06070B]/50 to-transparent lg:w-3/4 pointer-events-none z-[1]" />
        <div className="absolute inset-x-0 bottom-0 h-44 sm:h-56 bg-gradient-to-t from-[#06070B] via-[#06070B]/90 to-transparent pointer-events-none z-[2]" />
      </div>

      {/* Hero Showcase Skeleton matching HeroBillboard */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-8 lg:items-center">
          {/* Movie Details Column (Desktop: Left, Mobile: Below Cards) */}
          <div className="order-2 lg:order-1 lg:col-span-5 flex flex-col justify-center space-y-3 sm:space-y-4 pt-4 lg:pt-0">
            {/* Metadata Badges */}
            <div className="flex items-center gap-2">
              <div className="h-6 w-16 rounded-full bg-white/[0.08]" />
              <div className="h-6 w-14 rounded-full bg-white/[0.08]" />
              <div className="h-4 w-12 rounded-full bg-white/[0.04]" />
            </div>

            {/* Title */}
            <div className="h-9 sm:h-12 md:h-14 w-3/4 max-w-md rounded-2xl bg-white/[0.08]" />

            {/* Synopsis */}
            <div className="space-y-2 max-w-xl">
              <div className="h-3.5 w-full rounded-full bg-white/[0.05]" />
              <div className="h-3.5 w-5/6 rounded-full bg-white/[0.05]" />
              <div className="h-3.5 w-4/6 rounded-full bg-white/[0.05] hidden sm:block" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-3 flex-wrap">
              <div className="h-10 sm:h-12 w-28 sm:w-32 rounded-full bg-white/[0.15]" />
              <div className="h-10 sm:h-12 w-32 sm:w-36 rounded-full bg-white/[0.08]" />
              <div className="h-10 sm:h-12 w-20 sm:w-24 rounded-full bg-white/[0.06]" />
            </div>
          </div>

          {/* 3D Coverflow Cards Showcase Skeleton (Desktop: Right, Mobile: Top) */}
          <div className="order-1 lg:order-2 lg:col-span-7 flex items-center justify-center py-4 lg:py-0">
            <div className="relative flex items-center justify-center w-full h-[280px] xs:h-[320px] sm:h-[380px] lg:h-[420px]">
              {/* Left tilted card */}
              <div className="absolute left-[8%] sm:left-[14%] w-32 xs:w-36 sm:w-48 lg:w-56 aspect-[2/3] rounded-2xl bg-white/[0.03] border border-white/[0.06] -rotate-12 scale-90 opacity-40 blur-[1px] hidden xs:block" />
              {/* Center featured card */}
              <div className="relative z-10 w-40 xs:w-44 sm:w-56 lg:w-64 aspect-[2/3] rounded-2xl bg-white/[0.06] border border-white/[0.12] shadow-2xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-white/[0.08] to-transparent" />
              </div>
              {/* Right tilted card */}
              <div className="absolute right-[8%] sm:right-[14%] w-32 xs:w-36 sm:w-48 lg:w-56 aspect-[2/3] rounded-2xl bg-white/[0.03] border border-white/[0.06] rotate-12 scale-90 opacity-40 blur-[1px] hidden xs:block" />
            </div>
          </div>
        </div>
      </div>
    </section>
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
