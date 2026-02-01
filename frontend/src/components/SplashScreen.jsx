import React, { useState, useEffect, useRef } from 'react';

export const SplashScreen = ({ onComplete, minDuration = 600 }) => {
  const [phase, setPhase] = useState('zoom-in'); // zoom-in, zoom-out
  const onCompleteRef = useRef(onComplete);
  const hasCompleted = useRef(false);

  // Keep the ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    // Ultra-fast splash - like Netflix
    // Phase 1: Quick zoom in (0-200ms)
    const timer1 = setTimeout(() => setPhase('zoom-out'), 200);
    // Phase 2: Quick fade out and complete (200-600ms)
    const timer2 = setTimeout(() => {
      if (!hasCompleted.current && onCompleteRef.current) {
        hasCompleted.current = true;
        onCompleteRef.current();
      }
    }, minDuration);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [minDuration]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-300 ${
        phase === 'zoom-out' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      data-testid="splash-screen"
    >
      {/* Animated Logo Container - Fast animation */}
      <div 
        className={`relative transition-all duration-300 ease-out ${
          phase === 'zoom-in' 
            ? 'scale-75 opacity-0' 
            : 'scale-100 opacity-100'
        }`}
      >
        {/* Main Logo SVG with animations */}
        <svg 
          width="200" 
          height="200" 
          viewBox="0 0 100 100" 
          className="relative z-10"
        >
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6">
                <animate 
                  attributeName="stop-color" 
                  values="#8B5CF6;#A855F7;#8B5CF6" 
                  dur="2s" 
                  repeatCount="indefinite" 
                />
              </stop>
              <stop offset="100%" stopColor="#A855F7">
                <animate 
                  attributeName="stop-color" 
                  values="#A855F7;#EC4899;#A855F7" 
                  dur="2s" 
                  repeatCount="indefinite" 
                />
              </stop>
            </linearGradient>
            
            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Drop shadow */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#8B5CF6" floodOpacity="0.8"/>
            </filter>
          </defs>
          
          {/* Animated outer ring */}
          <rect 
            x="10" y="10" 
            width="80" height="80" 
            rx="16" 
            fill="none" 
            stroke="url(#splashGrad)" 
            strokeWidth="4"
            filter="url(#glow)"
            className={phase === 'glow' ? 'animate-pulse' : ''}
          >
            <animate 
              attributeName="stroke-width" 
              values="4;6;4" 
              dur="1.5s" 
              repeatCount="indefinite" 
            />
          </rect>
          
          {/* Play triangle with entrance animation */}
          <path 
            d="M38 30 L38 70 L72 50 Z" 
            fill="url(#splashGrad)"
            filter="url(#shadow)"
          >
            <animate 
              attributeName="opacity" 
              values="0;1" 
              dur="0.5s" 
              fill="freeze" 
            />
            <animateTransform 
              attributeName="transform"
              type="scale"
              values="0.5;1.1;1"
              dur="0.8s"
              fill="freeze"
              additive="sum"
            />
          </path>
        </svg>

        {/* KONA Text - appears after logo */}
        <div 
          className={`absolute -bottom-16 left-1/2 -translate-x-1/2 transition-all duration-500 delay-300 ${
            phase === 'glow' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <span 
            className="text-4xl font-black tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 0 40px rgba(139, 92, 246, 0.5)'
            }}
          >
            KONA
          </span>
        </div>

        {/* Particle effects */}
        {phase === 'glow' && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-purple-400 rounded-full animate-ping"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.5s'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading bar at bottom */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-32">
        <div className="h-0.5 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-[2500ms] ease-out"
            style={{ width: phase === 'zoom-in' ? '0%' : phase === 'glow' ? '80%' : '100%' }}
          />
        </div>
      </div>
    </div>
  );
};

// Mini loading spinner with logo (for inline loading states)
export const KonaLoader = ({ size = 40, className = "", showText = false }) => (
  <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
    <div className="relative" style={{ width: size, height: size }}>
      {/* Animated ring */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100"
        className="absolute inset-0"
      >
        <defs>
          <linearGradient id="loaderGradRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect 
          x="10" y="10" 
          width="80" height="80" 
          rx="16" 
          fill="none" 
          stroke="url(#loaderGradRing)" 
          strokeWidth="4"
          strokeDasharray="240"
          strokeDashoffset="60"
          style={{ 
            transformOrigin: 'center',
            animation: 'spin 1.5s linear infinite'
          }}
        />
      </svg>
      
      {/* Static play icon with pulse */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100"
        className="absolute inset-0 animate-pulse"
      >
        <defs>
          <linearGradient id="loaderGradPlay" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <path d="M38 30 L38 70 L72 50 Z" fill="url(#loaderGradPlay)" />
      </svg>
    </div>
    {showText && (
      <span className="text-xs text-gray-400 animate-pulse">Loading...</span>
    )}
  </div>
);

// Full page loading state
export const PageLoader = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <KonaLoader size={60} />
    <p className="mt-4 text-sm text-gray-400 animate-pulse">{message}</p>
  </div>
);

// Inline content loader (for cards, sections)
export const ContentLoader = ({ className = "" }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <KonaLoader size={32} />
  </div>
);

export default SplashScreen;
