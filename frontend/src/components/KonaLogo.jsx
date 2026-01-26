import React from 'react';

// Kona Logo - Cinema/Film Reel Style K
export const KonaLogo2 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    <defs>
      <linearGradient id="konaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    {/* Film reel circle */}
    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#konaGrad)" strokeWidth="4" />
    {/* Inner circle */}
    <circle cx="50" cy="50" r="28" fill="url(#konaGrad)" opacity="0.2" />
    {/* K letter */}
    <path 
      d="M35 25 L35 75 M35 50 L55 25 M35 50 L55 75" 
      fill="none" 
      stroke="url(#konaGrad)" 
      strokeWidth="8" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Play triangle */}
    <path 
      d="M58 42 L72 50 L58 58 Z" 
      fill="url(#konaGrad)"
    />
    {/* Film sprocket holes */}
    <circle cx="50" cy="12" r="4" fill="url(#konaGrad)" />
    <circle cx="50" cy="88" r="4" fill="url(#konaGrad)" />
    <circle cx="12" cy="50" r="4" fill="url(#konaGrad)" />
    <circle cx="88" cy="50" r="4" fill="url(#konaGrad)" />
  </svg>
);

// Kona Logo Full with Text - Cinema Style
export const KonaLogo2Full = ({ height = 40, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 170 50" 
    className={className}
    data-testid="kona-logo-full"
  >
    <defs>
      <linearGradient id="konaGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    {/* Film reel circle */}
    <circle cx="25" cy="25" r="21" fill="none" stroke="url(#konaGradFull)" strokeWidth="2.5" />
    {/* Inner circle */}
    <circle cx="25" cy="25" r="14" fill="url(#konaGradFull)" opacity="0.2" />
    {/* K letter */}
    <path 
      d="M17 12 L17 38 M17 25 L28 12 M17 25 L28 38" 
      fill="none" 
      stroke="url(#konaGradFull)" 
      strokeWidth="4" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Play triangle */}
    <path 
      d="M29 21 L37 25 L29 29 Z" 
      fill="url(#konaGradFull)"
    />
    {/* Film sprocket holes */}
    <circle cx="25" cy="6" r="2" fill="url(#konaGradFull)" />
    <circle cx="25" cy="44" r="2" fill="url(#konaGradFull)" />
    <circle cx="6" cy="25" r="2" fill="url(#konaGradFull)" />
    <circle cx="44" cy="25" r="2" fill="url(#konaGradFull)" />
    {/* KONA text */}
    <text 
      x="55" 
      y="33" 
      fontFamily="system-ui, -apple-system, sans-serif" 
      fontSize="26" 
      fontWeight="800" 
      fill="white"
      letterSpacing="2"
    >
      KONA
    </text>
  </svg>
);

// Default export
export default KonaLogo2;
