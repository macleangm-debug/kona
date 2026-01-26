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

// Kona Logo Full - KONA text with O as play box
export const KonaLogo2Full = ({ height = 32, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 140 40" 
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
    <text x="0" y="30" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="700" fill="white">K</text>
    {/* O as play box */}
    <rect x="28" y="6" width="28" height="28" rx="6" fill="none" stroke="url(#playBoxGradFull)" strokeWidth="3" />
    <path d="M37 14 L37 26 L49 20 Z" fill="url(#playBoxGradFull)" />
    {/* NA */}
    <text x="60" y="30" fontFamily="system-ui, -apple-system, sans-serif" fontSize="32" fontWeight="700" fill="white">NA</text>
  </svg>
);

// Default export
export default KonaLogo2;
