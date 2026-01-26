import React from 'react';

// Kona Logo - Luxury Elegant Cursive K
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
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="50%" stopColor="#E879F9" />
        <stop offset="100%" stopColor="#F472B6" />
      </linearGradient>
    </defs>
    {/* Elegant cursive K */}
    <path 
      d="M25 20 
         C25 20, 25 80, 25 80
         M25 50 
         Q40 50, 55 25
         Q60 18, 70 20
         M25 50
         Q45 50, 55 65
         Q65 80, 75 80" 
      fill="none" 
      stroke="url(#konaGrad)" 
      strokeWidth="6" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Kona Logo Full with Text - Luxury Style
export const KonaLogo2Full = ({ height = 40, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 160 50" 
    className={className}
    data-testid="kona-logo-full"
  >
    <defs>
      <linearGradient id="konaGradFull" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#C084FC" />
        <stop offset="50%" stopColor="#E879F9" />
        <stop offset="100%" stopColor="#F472B6" />
      </linearGradient>
    </defs>
    {/* Elegant cursive K */}
    <path 
      d="M12 8 
         C12 8, 12 42, 12 42
         M12 25 
         Q22 25, 30 10
         Q33 5, 38 8
         M12 25
         Q25 25, 32 35
         Q38 44, 42 42" 
      fill="none" 
      stroke="url(#konaGradFull)" 
      strokeWidth="4" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* KONA text - elegant font style */}
    <text 
      x="52" 
      y="34" 
      fontFamily="Georgia, serif" 
      fontSize="26" 
      fontWeight="600" 
      fill="white"
      letterSpacing="3"
      fontStyle="italic"
    >
      KONA
    </text>
  </svg>
);

// Default export
export default KonaLogo2;
