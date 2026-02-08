import React, { useState, useEffect, useRef } from 'react';

// Pre-splash screen - requires user interaction to enable sound
export const PreSplash = ({ onEnter }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-pointer"
      onClick={onEnter}
      data-testid="pre-splash"
    >
      {/* Ambient glow */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
        }}
      />

      {/* Logo */}
      <div 
        className={`relative transition-transform duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg width="120" height="120" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="preGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          <rect 
            x="10" y="10" 
            width="80" height="80" 
            rx="16" 
            fill="none" 
            stroke="url(#preGrad)" 
            strokeWidth="4"
          />
          <path d="M38 30 L38 70 L72 50 Z" fill="url(#preGrad)" />
        </svg>
      </div>

      {/* Enter button */}
      <button 
        className={`mt-8 px-8 py-3 rounded-full font-semibold text-white transition-all duration-300 ${
          isHovered 
            ? 'bg-primary scale-105 shadow-lg shadow-primary/50' 
            : 'bg-primary/80'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        ▶ Enter Kona
      </button>

      <p className="mt-4 text-sm text-gray-500">Click anywhere to continue</p>
      
      {/* Sound icon hint */}
      <div className="absolute bottom-8 flex items-center gap-2 text-xs text-gray-600">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
        <span>Best with sound</span>
      </div>
    </div>
  );
};

// Main splash screen with Magic Chime sound
export const SplashScreen = ({ onComplete, minDuration = 3500 }) => {
  const [phase, setPhase] = useState('initial');
  const onCompleteRef = useRef(onComplete);
  const hasCompleted = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Magic Chime Sound
  const playMagicChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523, 659, 784, 1047, 1318]; // C5, E5, G5, C6, E6
      
      notes.forEach((freq, i) => {
        // Main tone
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 1.5);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 1.5);

        // Shimmer harmonic
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.connect(shimmerGain);
        shimmerGain.connect(ctx.destination);
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(freq * 2, ctx.currentTime + i * 0.1);
        shimmerGain.gain.setValueAtTime(0, ctx.currentTime);
        shimmerGain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.1);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.8);
        shimmer.start(ctx.currentTime + i * 0.1);
        shimmer.stop(ctx.currentTime + i * 0.1 + 0.8);
      });

      // Subtle bass foundation
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.connect(bassGain);
      bassGain.connect(ctx.destination);
      bass.type = 'sine';
      bass.frequency.setValueAtTime(130, ctx.currentTime + 0.2);
      bassGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.2);
      bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
      bass.start(ctx.currentTime + 0.2);
      bass.stop(ctx.currentTime + 2);

    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  };

  useEffect(() => {
    // Timeline with Magic Chime at logo reveal
    const timeline = [
      { delay: 300, action: () => setPhase('logo-appear') },
      { delay: 600, action: () => playMagicChime() }, // Play Magic Chime
      { delay: 900, action: () => setPhase('text-appear') },
      { delay: 1500, action: () => setPhase('glow') },
      { delay: 2800, action: () => setPhase('fade-out') },
      { delay: minDuration, action: () => {
        if (!hasCompleted.current && onCompleteRef.current) {
          hasCompleted.current = true;
          onCompleteRef.current();
        }
      }}
    ];

    const timers = timeline.map(({ delay, action }) => 
      setTimeout(action, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, [minDuration]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity duration-700 ${
        phase === 'fade-out' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      data-testid="splash-screen"
    >
      {/* Background ambient glow */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${
          phase === 'glow' ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.2) 0%, transparent 60%)'
        }}
      />

      {/* Sparkle particles during glow */}
      {(phase === 'glow' || phase === 'fade-out') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-300 rounded-full animate-ping"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
                animationDuration: `${1 + Math.random()}s`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: 0.6
              }}
            />
          ))}
        </div>
      )}

      {/* Logo Container */}
      <div className="relative flex flex-col items-center">
        {/* Main Logo SVG */}
        <div 
          className={`relative transition-all duration-700 ease-out ${
            phase === 'initial' 
              ? 'scale-50 opacity-0' 
              : phase === 'logo-appear'
              ? 'scale-110 opacity-100'
              : 'scale-100 opacity-100'
          }`}
        >
          <svg 
            width="160" 
            height="160" 
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
              
              <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="8" floodColor="#8B5CF6" floodOpacity="0.8"/>
              </filter>
            </defs>
            
            {/* Outer ring with draw animation */}
            <rect 
              x="10" y="10" 
              width="80" height="80" 
              rx="16" 
              fill="none" 
              stroke="url(#splashGrad)" 
              strokeWidth="4"
              filter={phase === 'glow' ? "url(#glow)" : "none"}
              strokeDasharray="320"
              style={{
                strokeDashoffset: phase === 'initial' ? 320 : 0,
                transition: 'stroke-dashoffset 0.6s ease-out'
              }}
            />
            
            {/* Play triangle */}
            <path 
              d="M38 30 L38 70 L72 50 Z" 
              fill="url(#splashGrad)"
              filter={phase === 'glow' ? "url(#shadow)" : "none"}
              style={{
                transformOrigin: '50px 50px',
                transform: (phase === 'text-appear' || phase === 'glow' || phase === 'fade-out') 
                  ? 'scale(1)' 
                  : 'scale(0)',
                opacity: (phase === 'text-appear' || phase === 'glow' || phase === 'fade-out') ? 1 : 0,
                transition: 'transform 0.4s ease-out, opacity 0.4s ease-out'
              }}
            />
          </svg>

          {/* Pulse rings */}
          {(phase === 'glow' || phase === 'fade-out') && (
            <>
              <div 
                className="absolute inset-0 rounded-2xl animate-ping opacity-30"
                style={{ border: '2px solid rgba(139, 92, 246, 0.5)', animationDuration: '1.5s' }}
              />
            </>
          )}
        </div>

        {/* KONA Text */}
        <div 
          className={`mt-6 overflow-hidden transition-all duration-700 ${
            phase === 'text-appear' || phase === 'glow' || phase === 'fade-out'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="flex items-center justify-center">
            {['K', 'O', 'N', 'A'].map((letter, index) => (
              <span 
                key={letter}
                className="text-5xl font-black tracking-wider inline-block"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: phase === 'glow' ? '0 0 40px rgba(139, 92, 246, 0.6)' : 'none',
                  transform: (phase === 'text-appear' || phase === 'glow' || phase === 'fade-out')
                    ? 'translateY(0) scale(1)' 
                    : 'translateY(20px) scale(0.8)',
                  opacity: (phase === 'text-appear' || phase === 'glow' || phase === 'fade-out') ? 1 : 0,
                  transition: `transform 0.5s ease-out ${index * 0.08}s, opacity 0.5s ease-out ${index * 0.08}s`
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          
          {/* Tagline */}
          <p 
            className={`text-center text-sm text-gray-500 mt-3 transition-all duration-700 ${
              phase === 'glow' || phase === 'fade-out'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            African Stories, Your Way
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40">
        <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full"
            style={{ 
              width: phase === 'initial' ? '0%' 
                : phase === 'logo-appear' ? '20%' 
                : phase === 'text-appear' ? '50%' 
                : phase === 'glow' ? '80%' 
                : '100%',
              background: 'linear-gradient(90deg, #8B5CF6, #A855F7, #EC4899)',
              transition: 'width 0.6s ease-out',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Combined splash with pre-splash for sound
export const SplashWithSound = ({ onComplete, minDuration = 3500 }) => {
  const [showPreSplash, setShowPreSplash] = useState(true);
  const [showSplash, setShowSplash] = useState(false);

  const handleEnter = () => {
    setShowPreSplash(false);
    setShowSplash(true);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
    onComplete?.();
  };

  if (showPreSplash) {
    return <PreSplash onEnter={handleEnter} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} minDuration={minDuration} />;
  }

  return null;
};

// Mini loading spinner
export const KonaLoader = ({ size = 40, className = "", showText = false }) => (
  <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
    <div className="relative" style={{ width: size, height: size }}>
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
    <style>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export const PageLoader = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background">
    <KonaLoader size={60} />
    <p className="mt-4 text-sm text-gray-400 animate-pulse">{message}</p>
  </div>
);

export const ContentLoader = ({ className = "" }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <KonaLoader size={32} />
  </div>
);

export default SplashScreen;
