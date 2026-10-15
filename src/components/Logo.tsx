import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'intro';
  asLink?: boolean;
  showIconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  asLink = true,
  showIconOnly = false,
}) => {
  // Sizing ratios matching the user's official outline logo
  const scale =
    size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : size === 'xl' ? 1.8 : size === 'intro' ? 2.4 : 1;
  const width = Math.round(showIconOnly ? 40 * scale : 160 * scale);
  const height = Math.round(showIconOnly ? 40 * scale : 50 * scale);

  const logoSvg = (
    <div className={`inline-flex items-center select-none group ${className}`}>
      {showIconOnly ? (
        /* Standalone Minimalist Arrow-X Icon Glyph */
        <svg
          width={width}
          height={height}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-opacity duration-200 group-hover:opacity-85 shrink-0"
          aria-hidden="true"
        >
          {/* Minimalist modern squircle container */}
          <rect
            x="4"
            y="4"
            width="152"
            height="152"
            rx="32"
            fill="#111319"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
          />

          <g
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinejoin="miter"
            strokeMiterlimit="4"
            strokeLinecap="square"
            fill="none"
          >
            {/* Falling top-left piece */}
            <path d="M 36 40 H 58 L 76 60 L 63 68 Z" />

            {/* Falling bottom-right piece */}
            <path d="M 94 98 L 107 90 L 126 132 H 104 Z" />

            {/* Continuous Rising Arrow Shaft & Head */}
            <path d="M 36 132 H 58 L 105 68 L 96 59 L 140 32 L 121 82 L 112 73 L 48 132 Z" />
          </g>
        </svg>
      ) : (
        /* Full Official Minimalist Outlined Wordmark "ZHAFX" directly from the user's photo */
        <svg
          width={width}
          height={height}
          viewBox="0 0 540 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-opacity duration-200 group-hover:opacity-90 shrink-0"
          aria-label="ZHAFX Logo"
        >
          {/* EXACT MINIMALIST OUTLINE LETTERING FROM PHOTO */}
          <g
            stroke="#FFFFFF"
            strokeWidth="3.8"
            strokeLinejoin="miter"
            strokeMiterlimit="4"
            strokeLinecap="square"
            fill="none"
          >
            {/* LETTER Z */}
            <path d="M 16 68 H 86 V 87 L 40 141 H 86 V 160 H 16 V 141 L 62 87 H 16 Z" />

            {/* LETTER H */}
            <path d="M 102 68 H 122 V 104 H 152 V 68 H 172 V 160 H 152 V 123 H 122 V 160 H 102 Z" />

            {/* LETTER A */}
            <path d="M 210 68 H 226 L 257 160 H 237 L 229 133 H 207 L 199 160 H 179 Z" />
            <path d="M 218 95 L 225 118 H 211 Z" />

            {/* LETTER F */}
            <path d="M 270 68 H 332 V 87 H 290 V 104 H 322 V 123 H 290 V 160 H 270 Z" />

            {/* LETTER X: Falling diagonal top-left segment */}
            <path d="M 346 68 H 366 L 382 86 L 371 94 Z" />

            {/* LETTER X: Falling diagonal bottom-right segment */}
            <path d="M 401 124 L 412 116 L 430 160 H 410 Z" />

            {/* LETTER X: Continuous rising Arrow Stem & Head */}
            <path d="M 346 160 H 366 L 420 92 L 410 82 L 458 46 L 440 98 L 430 88 L 360 160 Z" />
          </g>
        </svg>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        aria-label="Zhafx Beranda"
        className="flex items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg"
      >
        {logoSvg}
      </Link>
    );
  }

  return logoSvg;
};
