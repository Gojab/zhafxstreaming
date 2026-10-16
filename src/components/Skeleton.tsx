import React from 'react';

export const MediaCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 animate-pulse w-full">
      <div className="aspect-[2/3] w-full rounded-[20px] bg-white/[0.04] border border-white/[0.08] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-white/[0.06] to-transparent" />
      </div>
      <div className="h-4 w-3/4 rounded-full bg-white/[0.08]" />
      <div className="h-3 w-1/2 rounded-full bg-white/[0.04]" />
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="w-full h-[65vh] sm:h-[75vh] max-h-[720px] bg-white/[0.03] relative animate-pulse overflow-hidden mb-8 pt-16">
      <div className="absolute bottom-12 left-4 sm:left-8 max-w-xl space-y-4">
        <div className="h-5 w-28 rounded-full bg-white/[0.08]" />
        <div className="h-10 sm:h-14 w-3/4 rounded-2xl bg-white/[0.08]" />
        <div className="h-4 w-full rounded-full bg-white/[0.06]" />
        <div className="h-4 w-2/3 rounded-full bg-white/[0.06]" />
        <div className="flex gap-3 pt-3">
          <div className="h-12 w-32 rounded-full bg-white/[0.12]" />
          <div className="h-12 w-32 rounded-full bg-white/[0.08]" />
        </div>
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
