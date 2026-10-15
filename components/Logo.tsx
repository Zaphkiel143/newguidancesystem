import React from "react";

// E-Gabay sprout mark (source: public/brand/egabay-mark-sprout.svg).
// "navy" for light backgrounds, "light" for the navy top bar.
const TONES = {
  navy: { tile: "#0b5793", stem: "#ffffff", leaf: "#ffd200" },
  light: { tile: "#ffffff", stem: "#0b5793", leaf: "#e3ae20" },
};

export const LogoMark: React.FC<{ size?: number; tone?: keyof typeof TONES; className?: string; title?: string }> = ({
  size = 36,
  tone = "navy",
  className,
  title = "E-Gabay",
}) => {
  const c = TONES[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" className={className} role="img" aria-label={title}>
      <rect width="128" height="128" rx="28" fill={c.tile} />
      <path d="M64 100V58" stroke={c.stem} strokeWidth="7" strokeLinecap="round" />
      <path d="M64 74c-18 0-29-12-29-28 16 0 29 11 29 28z" fill={c.stem} />
      <path d="M64 62c0-17 12-30 30-30 0 17-12 30-30 30z" fill={c.leaf} />
      <rect x="40" y="98" width="48" height="7" rx="3.5" fill={c.stem} />
    </svg>
  );
};
