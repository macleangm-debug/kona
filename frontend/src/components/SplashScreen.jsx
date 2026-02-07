import React, { useState, useEffect, useRef } from 'react';

// Signature sound - a "ta-dum" style audio (base64 encoded short sound)
const KONA_SOUND_URL = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNkEsIAAAAAAD/+9DEAAAIAANIAAAAQjCazSCgAABMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UMQXg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

export const SplashScreen = ({ onComplete, minDuration = 3500 }) => {
  const [phase, setPhase] = useState('initial'); // initial, logo-appear, text-appear, glow, fade-out
  const onCompleteRef = useRef(onComplete);
  const hasCompleted = useRef(false);
  const audioRef = useRef(null);

  // Keep the ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Play signature sound
  const playSound = () => {
    try {
      // Create a simple "ta-dum" sound using Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // First note (lower) - "ta"
      const osc1 = audioContext.createOscillator();
      const gain1 = audioContext.createGain();
      osc1.connect(gain1);
      gain1.connect(audioContext.destination);
      osc1.frequency.setValueAtTime(180, audioContext.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.4, audioContext.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      osc1.start(audioContext.currentTime);
      osc1.stop(audioContext.currentTime + 0.3);

      // Second note (higher) - "dum"
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.setValueAtTime(280, audioContext.currentTime + 0.15);
      osc2.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.6);
      gain2.gain.setValueAtTime(0, audioContext.currentTime);
      gain2.gain.setValueAtTime(0.5, audioContext.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.2);
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 1.2);

      // Add a subtle bass undertone
      const osc3 = audioContext.createOscillator();
      const gain3 = audioContext.createGain();
      osc3.connect(gain3);
      gain3.connect(audioContext.destination);
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(60, audioContext.currentTime + 0.15);
      gain3.gain.setValueAtTime(0, audioContext.currentTime);
      gain3.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
      osc3.start(audioContext.currentTime + 0.15);
      osc3.stop(audioContext.currentTime + 1.5);

    } catch (e) {
      console.log('Audio not supported');
    }
  };

  useEffect(() => {
    // Timeline:
    // 0ms: Initial state (black screen)
    // 300ms: Logo appears with scale animation
    // 800ms: Play signature sound
    // 1000ms: Text "KONA" appears
    // 1500ms: Glow effect intensifies
    // 2800ms: Start fade out
    // 3500ms: Complete

    const timeline = [
      { delay: 300, action: () => setPhase('logo-appear') },
      { delay: 800, action: () => playSound() },
      { delay: 1000, action: () => setPhase('text-appear') },
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
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 60%)'
        }}
      />

      {/* Animated Logo Container */}
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
            width="180" 
            height="180" 
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
              
              {/* Enhanced glow filter */}
              <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* Drop shadow with animation */}
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#8B5CF6" floodOpacity="0.9"/>
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
              filter="url(#glow)"
              strokeDasharray="320"
              className={`${phase === 'glow' ? 'animate-pulse' : ''}`}
              style={{
                strokeDashoffset: phase === 'initial' ? 320 : 0,
                transition: 'stroke-dashoffset 0.8s ease-out'
              }}
            />
            
            {/* Play triangle with pop animation */}
            <path 
              d="M38 30 L38 70 L72 50 Z" 
              fill="url(#splashGrad)"
              filter="url(#shadow)"
              className={`transition-all duration-500 ${
                phase === 'initial' || phase === 'logo-appear'
                  ? 'opacity-0 scale-50'
                  : 'opacity-100 scale-100'
              }`}
              style={{
                transformOrigin: '50px 50px',
                transform: phase === 'text-appear' || phase === 'glow' || phase === 'fade-out' 
                  ? 'scale(1)' 
                  : 'scale(0.5)'
              }}
            />
          </svg>

          {/* Pulse rings on glow phase */}
          {(phase === 'glow' || phase === 'fade-out') && (
            <>
              <div 
                className="absolute inset-0 rounded-2xl animate-ping"
                style={{
                  border: '2px solid rgba(139, 92, 246, 0.4)',
                  animationDuration: '1.5s'
                }}
              />
              <div 
                className="absolute inset-0 rounded-2xl animate-ping"
                style={{
                  border: '2px solid rgba(139, 92, 246, 0.2)',
                  animationDuration: '2s',
                  animationDelay: '0.5s'
                }}
              />
            </>
          )}
        </div>

        {/* KONA Text with letter-by-letter animation */}
        <div 
          className={`mt-8 overflow-hidden transition-all duration-700 ${
            phase === 'text-appear' || phase === 'glow' || phase === 'fade-out'
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            {['K', 'O', 'N', 'A'].map((letter, index) => (
              <span 
                key={letter}
                className="text-5xl font-black tracking-wider inline-block transition-all duration-500"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 50%, #EC4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: phase === 'glow' ? '0 0 40px rgba(139, 92, 246, 0.8)' : '0 0 20px rgba(139, 92, 246, 0.3)',
                  transform: (phase === 'text-appear' || phase === 'glow' || phase === 'fade-out')
                    ? 'translateY(0) scale(1)' 
                    : 'translateY(20px) scale(0.8)',
                  opacity: (phase === 'text-appear' || phase === 'glow' || phase === 'fade-out') ? 1 : 0,
                  transitionDelay: `${index * 80}ms`
                }}
              >
                {letter}
              </span>
            ))}
          </div>
          
          {/* Tagline */}
          <p 
            className={`text-center text-sm text-gray-500 mt-2 transition-all duration-700 ${
              phase === 'glow' || phase === 'fade-out'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            African Stories, Your Way
          </p>
        </div>

        {/* Particle effects during glow */}
        {(phase === 'glow' || phase === 'fade-out') && (
          <div className="absolute inset-0 pointer-events-none" style={{ width: 300, height: 300, left: -60, top: -60 }}>
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full"
                style={{
                  top: `${50 + 40 * Math.sin((i / 12) * Math.PI * 2)}%`,
                  left: `${50 + 40 * Math.cos((i / 12) * Math.PI * 2)}%`,
                  animation: `float ${1.5 + Math.random()}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                  opacity: 0.6
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cinematic loading bar */}
      <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48">
        <div className="h-1 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className="h-full rounded-full transition-all ease-out"
            style={{ 
              width: phase === 'initial' ? '0%' 
                : phase === 'logo-appear' ? '25%' 
                : phase === 'text-appear' ? '50%' 
                : phase === 'glow' ? '85%' 
                : '100%',
              background: 'linear-gradient(90deg, #8B5CF6, #A855F7, #EC4899)',
              transitionDuration: phase === 'initial' ? '0ms' : '800ms',
              boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
            }}
          />
        </div>
      </div>

      {/* Add keyframes for float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }
      `}</style>
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
