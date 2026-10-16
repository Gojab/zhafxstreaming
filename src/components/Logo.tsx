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
  // Proportional sizing matching the official solid typography
  const scale =
    size === 'sm' ? 0.75 : size === 'lg' ? 1.35 : size === 'xl' ? 1.8 : size === 'intro' ? 2.4 : 1;

  const width = Math.round(showIconOnly ? 40 * scale : 138 * scale);
  const height = Math.round(showIconOnly ? 40 * scale : 42 * scale);

  const logoSvg = (
    <div className={`inline-flex items-center select-none group ${className}`}>
      {showIconOnly ? (
        /* Standalone Minimalist Arrow-X Icon Glyph (Solid White) */
        <svg
          width={width}
          height={height}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-opacity duration-200 group-hover:opacity-90 shrink-0"
          aria-hidden="true"
        >
          {/* Subtle Squircle Background */}
          <rect
            x="4"
            y="4"
            width="152"
            height="152"
            rx="34"
            fill="#06070B"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.5"
          />

          {/* Solid White Signature Arrow-X Glyph */}
          <g fill="#FFFFFF">
            {/* Descending Stroke (\) */}
            <path d="M 9,52 H 37 L 127,142 H 99 Z" />

            {/* Rising Stroke & Arrowhead (/) */}
            <path d="M 13,142 H 41 L 128,55 L 140,67 L 151,18 L 102,29 L 114,41 Z" />
          </g>
        </svg>
      ) : (
        /* Full Official Solid Wordmark "ZHAFX" with Rising Arrow X directly from photo */
        <svg
          width={width}
          height={height}
          viewBox="0 0 530 155"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-opacity duration-200 group-hover:opacity-90 shrink-0"
          aria-label="ZHAFX Logo"
        >
          {/* SOLID WHITE BOLD GEOMETRIC LETTERFORMS FROM OFFICIAL PHOTO */}
          <g fill="#FFFFFF">
            {/* LETTER Z */}
            <path d="M 30,45 H 98 V 65 L 53,115 H 98 V 135 H 30 V 115 L 75,65 H 30 Z" />

            {/* LETTER H */}
            <path d="M 118,45 H 138 V 80 H 166 V 45 H 186 V 135 H 166 V 100 H 138 V 135 H 118 Z" />

            {/* LETTER A (Solid with triangular inner counter) */}
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 233,45 H 251 L 280,135 H 258 L 253,116 H 231 L 226,135 H 204 Z M 242,70 L 249,98 H 235 Z"
            />

            {/* LETTER F */}
            <path d="M 298,45 H 362 V 65 H 318 V 82 H 350 V 102 H 318 V 135 H 298 Z" />

            {/* LETTER X: Descending leg (\) */}
            <path d="M 376,45 H 404 L 494,135 H 466 Z" />

            {/* LETTER X: Rising leg extending into crisp arrowhead (/) */}
            <path d="M 380,135 H 408 L 495,48 L 507,60 L 518,11 L 469,22 L 481,34 Z" />
          </g>
        </svg>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link
        to="/"
        aria-label="ZHAFX Beranda"
        className="flex items-center focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-lg"
      >
        {logoSvg}
      </Link>
    );
  }

  return logoSvg;
};
