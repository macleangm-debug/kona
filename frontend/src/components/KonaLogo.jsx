import React from 'react';

// Kona Logo - Just the play box (for icon use)
export const KonaLogo2 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    <defs>
      <linearGradient id="playBoxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    {/* Rounded box */}
    <rect x="10" y="10" width="80" height="80" rx="16" fill="none" stroke="url(#playBoxGrad)" strokeWidth="6" />
    {/* Play triangle */}
    <path d="M38 30 L38 70 L72 50 Z" fill="url(#playBoxGrad)" />
  </svg>
);

// Kona Logo Full - KONA text with O as play box (aligned)
export const KonaLogo2Full = ({ height = 32, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 120 36" 
    className={className}
    data-testid="kona-logo-full"
  >
    <defs>
      <linearGradient id="playBoxGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
    {/* K */}
    <text x="0" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="30" fontWeight="800" fill="white">K</text>
    {/* O as play box - vertically centered */}
    <g transform="translate(22, 4)">
      <rect x="0" y="0" width="24" height="24" rx="5" fill="none" stroke="url(#playBoxGradFull)" strokeWidth="2.5" />
      <path d="M8 6 L8 18 L18 12 Z" fill="url(#playBoxGradFull)" />
    </g>
    {/* NA */}
    <text x="50" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="30" fontWeight="800" fill="white">NA</text>
  </svg>
);

// Default export
export default KonaLogo2;
