import React from 'react';

// Logo Option 2: K + Play (Selected)
export const KonaLogo2 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    <path 
      d="M20 20 L20 80 M20 50 L50 20 M20 50 L50 80" 
      fill="none" 
      stroke="url(#grad2)" 
      strokeWidth="10" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="70" cy="50" r="18" fill="url(#grad2)" />
    <path d="M65 42 L65 58 L78 50 Z" fill="white" />
    <defs>
      <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

// Logo Option 2 Full with Text
export const KonaLogo2Full = ({ height = 40, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 180 50" 
    className={className}
    data-testid="kona-logo-full"
  >
    <path 
      d="M8 8 L8 42 M8 25 L28 8 M8 25 L28 42" 
      fill="none" 
      stroke="url(#grad2f)" 
      strokeWidth="6" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="42" cy="25" r="12" fill="url(#grad2f)" />
    <path d="M39 19 L39 31 L48 25 Z" fill="white" />
    <text 
      x="62" 
      y="35" 
      fontFamily="system-ui, -apple-system, sans-serif" 
      fontSize="30" 
      fontWeight="800" 
      fill="white"
      letterSpacing="2"
    >
      KONA
    </text>
    <defs>
      <linearGradient id="grad2f" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

// Default export
export default KonaLogo2;
