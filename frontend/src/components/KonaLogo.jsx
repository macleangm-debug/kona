import React from 'react';

// New Kona Logo - K with integrated play button
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
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    {/* K letter */}
    <path 
      d="M20 15 L20 85 M20 50 L45 15 M20 50 L45 85" 
      fill="none" 
      stroke="url(#konaGrad)" 
      strokeWidth="12" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Play button triangle */}
    <path 
      d="M50 35 L80 50 L50 65 Z" 
      fill="url(#konaGrad)"
    />
  </svg>
);

// New Kona Logo Full with Text
export const KonaLogo2Full = ({ height = 40, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 160 50" 
    className={className}
    data-testid="kona-logo-full"
  >
    <defs>
      <linearGradient id="konaGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
    {/* K letter */}
    <path 
      d="M8 8 L8 42 M8 25 L22 8 M8 25 L22 42" 
      fill="none" 
      stroke="url(#konaGradFull)" 
      strokeWidth="6" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Play button triangle */}
    <path 
      d="M24 18 L40 25 L24 32 Z" 
      fill="url(#konaGradFull)"
    />
    {/* KONA text */}
    <text 
      x="50" 
      y="35" 
      fontFamily="system-ui, -apple-system, sans-serif" 
      fontSize="28" 
      fontWeight="800" 
      fill="white"
      letterSpacing="1"
    >
      KONA
    </text>
  </svg>
);

// Default export
export default KonaLogo2;
