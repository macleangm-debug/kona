import React, { useState, useEffect, useRef } from 'react';

// Cinematic Splash Screen - Premium Netflix/HBO style
export const SplashScreen = ({ onComplete, minDuration = 4000 }) => {
  const [phase, setPhase] = useState(0);
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const hasCompleted = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Epic Cinematic Sound - Deep impact with magical shimmer
  const playEpicSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Deep cinematic boom
      const boom = ctx.createOscillator();
      const boomGain = ctx.createGain();
      boom.connect(boomGain);
      boomGain.connect(ctx.destination);
      boom.type = 'sine';
      boom.frequency.setValueAtTime(55, ctx.currentTime);
      boom.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.8);
      boomGain.gain.setValueAtTime(0.7, ctx.currentTime);
      boomGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      boom.start(ctx.currentTime);
      boom.stop(ctx.currentTime + 1.5);

      // Sub bass rumble
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.type = 'sine';
      sub.frequency.setValueAtTime(35, ctx.currentTime);
      subGain.gain.setValueAtTime(0.5, ctx.currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 2);
      sub.start(ctx.currentTime);
      sub.stop(ctx.currentTime + 2);

      // Magical shimmer chimes (delayed)
      setTimeout(() => {
        const notes = [523, 784, 1047, 1318, 1568];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.06 + 1.2);
          osc.start(ctx.currentTime + i * 0.06);
          osc.stop(ctx.currentTime + i * 0.06 + 1.2);
        });
      }, 400);

      // Ethereal pad
      [130, 196, 261].forEach((freq, i) => {
        const pad = ctx.createOscillator();
        const padGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        pad.connect(filter);
        filter.connect(padGain);
        padGain.connect(ctx.destination);
        pad.type = 'sine';
        pad.frequency.setValueAtTime(freq, ctx.currentTime + 0.3);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        padGain.gain.setValueAtTime(0, ctx.currentTime);
        padGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.5);
        padGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3);
        pad.start(ctx.currentTime + 0.3);
        pad.stop(ctx.currentTime + 3);
      });

    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Particle animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 100;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2
      });
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.02;
        
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const currentOpacity = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139, 92, 246, ${currentOpacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    if (phase >= 1) {
      animate();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [phase]);

  // Animation timeline
  useEffect(() => {
    const timeline = [
      { delay: 100, action: () => setPhase(1) },      // Start particles
      { delay: 500, action: () => { setPhase(2); playEpicSound(); } },  // Logo zoom + sound
      { delay: 1200, action: () => setPhase(3) },     // Logo settle + glow
      { delay: 1800, action: () => setPhase(4) },     // Text reveal
      { delay: 2500, action: () => setPhase(5) },     // Tagline
      { delay: 3300, action: () => setPhase(6) },     // Fade out
      { delay: minDuration, action: () => {
        if (!hasCompleted.current && onCompleteRef.current) {
          hasCompleted.current = true;
          onCompleteRef.current();
        }
      }}
    ];

    const timers = timeline.map(({ delay, action }) => setTimeout(action, delay));
    return () => timers.forEach(clearTimeout);
  }, [minDuration]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#030014] overflow-hidden transition-opacity duration-1000 ${
        phase >= 6 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Particle canvas */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 transition-opacity duration-1000 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Radial gradient backdrop */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 40%)
          `
        }}
      />

      {/* Light rays */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `
            conic-gradient(from 0deg at 50% 50%, 
              transparent 0deg, 
              rgba(139, 92, 246, 0.03) 10deg, 
              transparent 20deg,
              transparent 40deg,
              rgba(139, 92, 246, 0.03) 50deg,
              transparent 60deg,
              transparent 80deg,
              rgba(139, 92, 246, 0.03) 90deg,
              transparent 100deg,
              transparent 120deg,
              rgba(139, 92, 246, 0.03) 130deg,
              transparent 140deg,
              transparent 160deg,
              rgba(139, 92, 246, 0.03) 170deg,
              transparent 180deg,
              transparent 200deg,
              rgba(139, 92, 246, 0.03) 210deg,
              transparent 220deg,
              transparent 240deg,
              rgba(139, 92, 246, 0.03) 250deg,
              transparent 260deg,
              transparent 280deg,
              rgba(139, 92, 246, 0.03) 290deg,
              transparent 300deg,
              transparent 320deg,
              rgba(139, 92, 246, 0.03) 330deg,
              transparent 340deg,
              transparent 360deg
            )
          `,
          animation: phase >= 3 ? 'slowRotate 20s linear infinite' : 'none'
        }}
      />

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          
          {/* Logo container with zoom effect */}
          <div 
            className="relative transition-all ease-out"
            style={{
              transform: phase < 2 ? 'scale(3) translateY(0)' 
                : phase === 2 ? 'scale(1.1) translateY(0)' 
                : 'scale(1) translateY(0)',
              opacity: phase < 2 ? 0 : 1,
              transitionDuration: phase === 2 ? '800ms' : '500ms',
              filter: phase >= 3 ? 'drop-shadow(0 0 60px rgba(139, 92, 246, 0.8))' : 'none'
            }}
          >
            {/* Outer glow ring */}
            <div 
              className={`absolute -inset-8 rounded-3xl transition-opacity duration-1000 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
                animation: phase >= 3 ? 'pulse 2s ease-in-out infinite' : 'none'
              }}
            />

            {/* Main logo */}
            <svg 
              width="200" 
              height="200" 
              viewBox="0 0 100 100"
              className="relative z-10"
            >
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8B5CF6" />
                  <stop offset="50%" stopColor="#A855F7" />
                  <stop offset="100%" stopColor="#C084FC" />
                </linearGradient>
                <filter id="logoGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              {/* Rounded square border */}
              <rect 
                x="8" y="8" 
                width="84" height="84" 
                rx="18" 
                fill="none" 
                stroke="url(#logoGrad)" 
                strokeWidth="5"
                filter={phase >= 3 ? "url(#logoGlow)" : "none"}
                style={{
                  strokeDasharray: 340,
                  strokeDashoffset: phase >= 2 ? 0 : 340,
                  transition: 'stroke-dashoffset 0.8s ease-out'
                }}
              />
              
              {/* Play triangle */}
              <path 
                d="M40 28 L40 72 L76 50 Z" 
                fill="url(#logoGrad)"
                filter={phase >= 3 ? "url(#logoGlow)" : "none"}
                style={{
                  opacity: phase >= 3 ? 1 : 0,
                  transform: phase >= 3 ? 'scale(1)' : 'scale(0.5)',
                  transformOrigin: '50px 50px',
                  transition: 'all 0.5s ease-out 0.3s'
                }}
              />
            </svg>
          </div>

          {/* KONA text with dramatic reveal */}
          <div 
            className="mt-8 overflow-hidden"
            style={{
              opacity: phase >= 4 ? 1 : 0,
              transform: phase >= 4 ? 'translateY(0)' : 'translateY(30px)',
              transition: 'all 0.8s ease-out'
            }}
          >
            <h1 
              className="text-7xl font-black tracking-[0.2em] relative"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 30%, #C084FC 60%, #E879F9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: phase >= 4 ? 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.5))' : 'none'
              }}
            >
              KONA
            </h1>
            
            {/* Underline accent */}
            <div 
              className="h-1 mx-auto mt-2 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #8B5CF6, #A855F7, #8B5CF6, transparent)',
                width: phase >= 4 ? '100%' : '0%',
                transition: 'width 0.6s ease-out 0.3s'
              }}
            />
          </div>

          {/* Tagline */}
          <p 
            className="mt-6 text-lg tracking-[0.3em] uppercase"
            style={{
              color: 'rgba(168, 85, 247, 0.8)',
              opacity: phase >= 5 ? 1 : 0,
              transform: phase >= 5 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.6s ease-out',
              textShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
            }}
          >
            African Stories, Your Way
          </p>
        </div>
      </div>

      {/* Bottom vignette */}
      <div 
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(3, 0, 20, 0.8) 0%, transparent 100%)'
        }}
      />

      {/* Cinematic bars (optional letterbox effect) */}
      <div className="absolute inset-x-0 top-0 h-12 bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-12 bg-black" />

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes slowRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Pre-splash for user interaction (enables sound)
export const PreSplash = ({ onEnter }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay for dramatic effect
    setTimeout(() => setIsReady(true), 300);
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-[#030014] flex items-center justify-center cursor-pointer overflow-hidden"
      onClick={onEnter}
    >
      {/* Subtle animated background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 100% at 50% 100%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)
          `
        }}
      />

      {/* Content */}
      <div 
        className={`flex flex-col items-center transition-all duration-1000 ${
          isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        {/* Mini logo */}
        <svg width="80" height="80" viewBox="0 0 100 100" className="mb-8">
          <defs>
            <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
          </defs>
          <rect x="10" y="10" width="80" height="80" rx="16" fill="none" stroke="url(#miniGrad)" strokeWidth="4" />
          <path d="M38 30 L38 70 L72 50 Z" fill="url(#miniGrad)" />
        </svg>

        {/* Play button */}
        <button 
          className="group relative px-10 py-4 rounded-full font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(168, 85, 247, 0.3) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.5)',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)'
          }}
        >
          <span className="relative z-10 flex items-center gap-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Enter Experience
          </span>
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5) 0%, rgba(168, 85, 247, 0.5) 100%)'
            }}
          />
        </button>

        {/* Hint */}
        <p className="mt-6 text-sm text-gray-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          Sound recommended
        </p>
      </div>

      {/* Animated corner accents */}
      <div className="absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-purple-500/20 rounded-tl-lg" />
      <div className="absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-purple-500/20 rounded-tr-lg" />
      <div className="absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-purple-500/20 rounded-bl-lg" />
      <div className="absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-purple-500/20 rounded-br-lg" />
    </div>
  );
};

// Combined component
export const SplashWithSound = ({ onComplete, minDuration = 4000 }) => {
  const [stage, setStage] = useState('pre'); // 'pre' | 'splash' | 'done'

  const handleEnter = () => setStage('splash');
  const handleComplete = () => {
    setStage('done');
    onComplete?.();
  };

  if (stage === 'pre') return <PreSplash onEnter={handleEnter} />;
  if (stage === 'splash') return <SplashScreen onComplete={handleComplete} minDuration={minDuration} />;
  return null;
};

// Loader components
export const KonaLoader = ({ size = 40, className = "" }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100" className="animate-spin" style={{ animationDuration: '1.5s' }}>
        <defs>
          <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
        </defs>
        <rect x="10" y="10" width="80" height="80" rx="16" fill="none" stroke="url(#spinGrad)" strokeWidth="4" strokeDasharray="240" strokeDashoffset="60" />
      </svg>
      <svg width={size} height={size} viewBox="0 0 100 100" className="absolute inset-0 animate-pulse">
        <path d="M38 30 L38 70 L72 50 Z" fill="#8B5CF6" />
      </svg>
    </div>
  </div>
);

export const PageLoader = ({ message = "Loading..." }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[#030014]">
    <KonaLoader size={60} />
    <p className="mt-4 text-sm text-gray-500 animate-pulse">{message}</p>
  </div>
);

export const ContentLoader = ({ className = "" }) => (
  <div className={`flex items-center justify-center p-8 ${className}`}>
    <KonaLoader size={32} />
  </div>
);

export default SplashScreen;
