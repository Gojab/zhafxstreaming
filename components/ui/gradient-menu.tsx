import React from 'react';
import { IoHomeOutline, IoVideocamOutline, IoCameraOutline, IoShareSocialOutline, IoHeartOutline } from 'react-icons/io5';

export interface GradientMenuItem {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  onClick?: () => void;
  isActive?: boolean;
}

const defaultMenuItems: GradientMenuItem[] = [
  { title: 'Home', icon: <IoHomeOutline />, gradientFrom: '#a955ff', gradientTo: '#ea51ff' },
  { title: 'Video', icon: <IoVideocamOutline />, gradientFrom: '#56CCF2', gradientTo: '#2F80ED' },
  { title: 'Photo', icon: <IoCameraOutline />, gradientFrom: '#FF9966', gradientTo: '#FF5E62' },
  { title: 'Share', icon: <IoShareSocialOutline />, gradientFrom: '#80FF72', gradientTo: '#7EE8FA' },
  { title: 'Tym', icon: <IoHeartOutline />, gradientFrom: '#ffa9c6', gradientTo: '#f434e2' },
];

export interface GradientMenuProps {
  items?: GradientMenuItem[];
  isGlass?: boolean;
  className?: string;
}

export default function GradientMenu({ items = defaultMenuItems, isGlass = false, className = '' }: GradientMenuProps) {
  return (
    <div className={`flex justify-center items-center ${className || 'min-h-screen bg-dark'}`}>
      <ul className="flex gap-4 sm:gap-6">
        {items.map(({ title, icon, gradientFrom, gradientTo, onClick, isActive }, idx) => (
          <li
            key={idx}
            onClick={onClick}
            style={
              (!isGlass && gradientFrom && gradientTo
                ? { '--gradient-from': gradientFrom, '--gradient-to': gradientTo }
                : {}) as React.CSSProperties
            }
            className={`relative w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full flex items-center justify-center transition-[width,transform,background-color,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:w-[150px] sm:hover:w-[180px] hover:shadow-none group cursor-pointer transform-gpu will-change-[width,transform] ${
              isGlass
                ? 'liquid-glass shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-white/20 hover:bg-white/[0.2] bg-white/[0.08]'
                : 'bg-white shadow-lg'
            }`}
          >
            {/* Background on hover / active */}
            <span
              className={`absolute inset-0 rounded-full transition-opacity duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[opacity] ${
                isGlass
                  ? 'bg-white/[0.15] opacity-0 group-hover:opacity-100'
                  : 'bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 group-hover:opacity-100'
              }`}
            />
            {/* Blur glow */}
            <span
              className={`absolute top-[10px] inset-x-0 h-full rounded-full blur-[15px] -z-10 transition-opacity duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] transform-gpu will-change-[opacity] ${
                isGlass
                  ? 'bg-white/20 opacity-0 group-hover:opacity-60'
                  : 'bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 group-hover:opacity-50'
              }`}
            />

            {/* Icon - visible initially, scales out on hover */}
            <span className="relative z-10 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] delay-0 group-hover:scale-0 transform-gpu will-change-transform">
              <span className={`text-2xl ${isGlass ? 'text-white' : 'text-gray-500'}`}>{icon}</span>
            </span>

            {/* Title - reveals on hover */}
            <span className="absolute text-white uppercase tracking-wide text-xs sm:text-sm font-semibold transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] delay-75 scale-0 group-hover:scale-100 transform-gpu will-change-transform">
              {title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
