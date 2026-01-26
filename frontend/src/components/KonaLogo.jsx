import React from 'react';

// Kona Logo - Using the generated luxury image
export const KonaLogo2 = ({ size = 40, className = "" }) => (
  <img 
    src="/icons/icon-96x96.png" 
    alt="Kona" 
    width={size} 
    height={size}
    className={className}
    data-testid="kona-logo"
    style={{ objectFit: 'contain' }}
  />
);

// Kona Logo Full with Text - Luxury Style
export const KonaLogo2Full = ({ height = 40, className = "" }) => (
  <div className={`flex items-center gap-2 ${className}`} data-testid="kona-logo-full">
    <img 
      src="/icons/icon-96x96.png" 
      alt="Kona" 
      height={height} 
      width={height}
      style={{ objectFit: 'contain' }}
    />
    <span 
      style={{ 
        fontFamily: 'Georgia, serif',
        fontSize: height * 0.65,
        fontWeight: 600,
        color: 'white',
        letterSpacing: '2px',
        fontStyle: 'italic'
      }}
    >
      KONA
    </span>
  </div>
);

// Default export
export default KonaLogo2;
