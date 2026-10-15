import React from 'react';

// E-Gabay sprout mark (source: public/brand/egabay-mark-sprout.svg)
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 40, className }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" className={className} role="img" aria-label="E-Gabay">
    <rect width="128" height="128" rx="28" fill="#1d4ed8" />
    <path d="M64 100V58" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
    <path d="M64 74c-18 0-29-12-29-28 16 0 29 11 29 28z" fill="#fff" />
    <path d="M64 62c0-17 12-30 30-30 0 17-12 30-30 30z" fill="#fbbf24" />
    <rect x="40" y="98" width="48" height="7" rx="3.5" fill="#fff" />
  </svg>
);
