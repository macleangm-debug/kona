import React from 'react';

// Logo Option 1: Corner bracket with play button
export const KonaLogo1 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    {/* Corner bracket */}
    <path 
      d="M15 15 L15 45 L45 45" 
      fill="none" 
      stroke="url(#gradient1)" 
      strokeWidth="8" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    {/* Play triangle */}
    <path 
      d="M50 35 L80 55 L50 75 Z" 
      fill="url(#gradient1)"
    />
    <defs>
      <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

// Logo Option 2: K shaped like a corner with play
export const KonaLogo2 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    {/* K as corner */}
    <path 
      d="M20 20 L20 80 M20 50 L50 20 M20 50 L50 80" 
      fill="none" 
      stroke="url(#gradient2)" 
      strokeWidth="10" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Play dot */}
    <circle cx="70" cy="50" r="18" fill="url(#gradient2)" />
    <path d="M65 42 L65 58 L78 50 Z" fill="white" />
    <defs>
      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
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
    {/* K as corner */}
    <path 
      d="M8 8 L8 42 M8 25 L28 8 M8 25 L28 42" 
      fill="none" 
      stroke="url(#gradient2full)" 
      strokeWidth="6" 
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Play circle */}
    <circle cx="42" cy="25" r="12" fill="url(#gradient2full)" />
    <path d="M39 19 L39 31 L48 25 Z" fill="white" />
    
    {/* KONA text */}
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
      <linearGradient id="gradient2full" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
); 
      strokeLinejoin="round"
    />
    {/* Play dot */}
    <circle cx="70" cy="50" r="18" fill="url(#gradient2)" />
    <path d="M65 42 L65 58 L78 50 Z" fill="white" />
    <defs>
      <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

// Logo Option 3: Rounded corner frame (like a video frame corner)
export const KonaLogo3 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    {/* Rounded corner frame */}
    <path 
      d="M10 40 L10 20 Q10 10 20 10 L40 10" 
      fill="none" 
      stroke="url(#gradient3)" 
      strokeWidth="8" 
      strokeLinecap="round"
    />
    <path 
      d="M60 90 L80 90 Q90 90 90 80 L90 60" 
      fill="none" 
      stroke="url(#gradient3)" 
      strokeWidth="8" 
      strokeLinecap="round"
    />
    {/* Center play */}
    <circle cx="50" cy="50" r="22" fill="url(#gradient3)" />
    <path d="M44 38 L44 62 L64 50 Z" fill="white" />
    <defs>
      <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="50%" stopColor="#A855F7" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

// Logo Option 4: Modern K with corner accent
export const KonaLogo4 = ({ size = 40, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    className={className}
    data-testid="kona-logo"
  >
    {/* Corner accent top-left */}
    <path 
      d="M8 30 L8 8 L30 8" 
      fill="none" 
      stroke="#EC4899" 
      strokeWidth="6" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    {/* Bold K */}
    <path 
      d="M30 85 L30 15 M30 50 L70 15 M30 50 L70 85" 
      fill="none" 
      stroke="url(#gradient4)" 
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#A855F7" />
      </linearGradient>
    </defs>
  </svg>
);

// Logo Option 5: Minimal corner + text mark
export const KonaLogoFull = ({ height = 40, className = "" }) => (
  <svg 
    height={height} 
    viewBox="0 0 160 50" 
    className={className}
    data-testid="kona-logo-full"
  >
    {/* Corner icon */}
    <path 
      d="M5 35 L5 15 Q5 5 15 5 L35 5" 
      fill="none" 
      stroke="url(#gradient5)" 
      strokeWidth="6" 
      strokeLinecap="round"
    />
    {/* Play button */}
    <circle cx="25" cy="30" r="12" fill="url(#gradient5)" />
    <path d="M22 24 L22 36 L32 30 Z" fill="white" />
    
    {/* KONA text */}
    <text 
      x="50" 
      y="38" 
      fontFamily="system-ui, -apple-system, sans-serif" 
      fontSize="32" 
      fontWeight="800" 
      fill="white"
      letterSpacing="2"
    >
      KONA
    </text>
    
    <defs>
      <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6" />
        <stop offset="100%" stopColor="#EC4899" />
      </linearGradient>
    </defs>
  </svg>
);

// Default export - the recommended logo
export default KonaLogo3;
