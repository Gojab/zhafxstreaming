import React from 'react';

export const MediaCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 animate-pulse w-full">
      <div className="aspect-[2/3] w-full rounded-xl bg-[#12162A] border border-[#2A3152]/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-[#1A2038]/60 to-transparent" />
      </div>
      <div className="h-4 w-3/4 rounded bg-[#1A2038]" />
      <div className="h-3 w-1/2 rounded bg-[#12162A]" />
    </div>
  );
};

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="w-full h-[60vh] sm:h-[75vh] max-h-[720px] rounded-2xl bg-[#12162A] border border-[#2A3152]/50 relative animate-pulse overflow-hidden mb-8">
      <div className="absolute bottom-10 left-6 sm:left-12 max-w-xl space-y-4">
        <div className="h-4 w-32 rounded bg-[#1A2038]" />
        <div className="h-10 sm:h-14 w-3/4 rounded-lg bg-[#1A2038]" />
        <div className="h-4 w-full rounded bg-[#1A2038]" />
        <div className="h-4 w-2/3 rounded bg-[#1A2038]" />
        <div className="flex gap-3 pt-2">
          <div className="h-11 w-32 rounded-xl bg-[#1A2038]" />
          <div className="h-11 w-32 rounded-xl bg-[#1A2038]" />
        </div>
      </div>
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen animate-pulse space-y-8 pb-16">
      <div className="w-full h-[45vh] bg-[#12162A] border-b border-[#2A3152]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-32 relative z-10 flex flex-col md:flex-row gap-8">
        <div className="w-48 sm:w-64 aspect-[2/3] rounded-2xl bg-[#1A2038] shrink-0 border border-[#2A3152]" />
        <div className="flex-1 space-y-4 pt-8">
          <div className="h-8 w-2/3 rounded bg-[#1A2038]" />
          <div className="h-4 w-1/3 rounded bg-[#12162A]" />
          <div className="h-20 w-full rounded bg-[#12162A]" />
          <div className="flex gap-3 pt-4">
            <div className="h-12 w-36 rounded-xl bg-[#1A2038]" />
            <div className="h-12 w-36 rounded-xl bg-[#1A2038]" />
          </div>
        </div>
      </div>
    </div>
  );
};
