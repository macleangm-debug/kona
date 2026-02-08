import React, { useState, useEffect, useRef } from 'react';

// Cinematic Splash Screen - Premium Netflix/HBO style
export const SplashScreen = ({ onComplete, minDuration = 5000 }) => {
  const [phase, setPhase] = useState(0);
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const hasCompleted = useRef(false);
  const startTimeRef = useRef(Date.now());

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
        const chimeCtx = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523, 784, 1047, 1318, 1568];
        notes.forEach((freq, i) => {
          const osc = chimeCtx.createOscillator();
          const gain = chimeCtx.createGain();
          osc.connect(gain);
          gain.connect(chimeCtx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, chimeCtx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0, chimeCtx.currentTime);
          gain.gain.setValueAtTime(0.18, chimeCtx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, chimeCtx.currentTime + i * 0.08 + 1.5);
          osc.start(chimeCtx.currentTime + i * 0.08);
          osc.stop(chimeCtx.currentTime + i * 0.08 + 1.5);
        });
      }, 500);

      // Ethereal pad
      [130, 196, 261].forEach((freq) => {
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
        padGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.6);
        padGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 3.5);
        pad.start(ctx.currentTime + 0.3);
        pad.stop(ctx.currentTime + 3.5);
      });

    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // Particle animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || phase < 1) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 80;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
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

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [phase]);

  // Animation timeline - Extended for full cinematic effect
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    // Phase timeline:
    // 0: Initial black
    // 1: Particles start (200ms)
    // 2: Logo zooms in + sound (600ms)
    // 3: Logo settles + glow (1400ms)
    // 4: Text reveals (2200ms)
    // 5: Tagline appears (3000ms)
    // 6: Hold for impact (3800ms)
    // 7: Fade out (4500ms)
    
    const timeline = [
      { delay: 200, action: () => setPhase(1) },
      { delay: 600, action: () => { setPhase(2); playEpicSound(); } },
      { delay: 1400, action: () => setPhase(3) },
      { delay: 2200, action: () => setPhase(4) },
      { delay: 3000, action: () => setPhase(5) },
      { delay: 3800, action: () => setPhase(6) },
      { delay: 4500, action: () => setPhase(7) },
    ];

    const timers = timeline.map(({ delay, action }) => setTimeout(action, delay));
    
    // Completion timer - only complete after minimum duration AND all phases done
    const completionTimer = setTimeout(() => {
      if (!hasCompleted.current && onCompleteRef.current) {
        hasCompleted.current = true;
        onCompleteRef.current();
      }
    }, Math.max(minDuration, 5000));

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(completionTimer);
    };
  }, [minDuration]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#030014] overflow-hidden transition-opacity duration-1000 ${
        phase >= 7 ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ transitionDelay: phase >= 7 ? '0ms' : '0ms' }}
    >
      {/* Particle canvas */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 transition-opacity duration-1000 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Radial gradient backdrop */}
      <div 
        className={`absolute inset-0 transition-all duration-1500 ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 50%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 40%)
          `
        }}
      />

      {/* Animated light rays */}
      <div 
        className={`absolute inset-0 transition-opacity duration-1000 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: `
            conic-gradient(from 0deg at 50% 50%, 
              transparent 0deg, rgba(139, 92, 246, 0.04) 10deg, transparent 20deg,
              transparent 40deg, rgba(139, 92, 246, 0.04) 50deg, transparent 60deg,
              transparent 80deg, rgba(139, 92, 246, 0.04) 90deg, transparent 100deg,
              transparent 120deg, rgba(139, 92, 246, 0.04) 130deg, transparent 140deg,
              transparent 160deg, rgba(139, 92, 246, 0.04) 170deg, transparent 180deg,
              transparent 200deg, rgba(139, 92, 246, 0.04) 210deg, transparent 220deg,
              transparent 240deg, rgba(139, 92, 246, 0.04) 250deg, transparent 260deg,
              transparent 280deg, rgba(139, 92, 246, 0.04) 290deg, transparent 300deg,
              transparent 320deg, rgba(139, 92, 246, 0.04) 330deg, transparent 340deg,
              transparent 360deg
            )
          `,
          animation: 'slowRotate 25s linear infinite'
        }}
      />

      {/* Main content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center">
          
          {/* Logo container with zoom effect */}
          <div 
            className="relative"
            style={{
              transform: phase < 2 ? 'scale(4)' 
                : phase === 2 ? 'scale(1.15)' 
                : 'scale(1)',
              opacity: phase < 2 ? 0 : 1,
              transition: phase === 2 ? 'all 1s cubic-bezier(0.16, 1, 0.3, 1)' : 'all 0.6s ease-out',
              filter: phase >= 3 ? 'drop-shadow(0 0 80px rgba(139, 92, 246, 0.9))' : 'none'
            }}
          >
            {/* Outer glow ring */}
            <div 
              className={`absolute -inset-12 rounded-3xl transition-opacity duration-1000 ${phase >= 3 ? 'opacity-100' : 'opacity-0'}`}
              style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
                animation: phase >= 3 ? 'pulse 2.5s ease-in-out infinite' : 'none'
              }}
            />

            {/* Main logo */}
            <svg 
              width="220" 
              height="220" 
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
                  <feGaussianBlur stdDeviation="4" result="blur" />
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
                  transition: 'stroke-dashoffset 1s ease-out'
                }}
              />
              
              {/* Play triangle */}
              <path 
                d="M40 28 L40 72 L76 50 Z" 
                fill="url(#logoGrad)"
                filter={phase >= 3 ? "url(#logoGlow)" : "none"}
                style={{
                  opacity: phase >= 3 ? 1 : 0,
                  transform: phase >= 3 ? 'scale(1)' : 'scale(0.3)',
                  transformOrigin: '50px 50px',
                  transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s'
                }}
              />
            </svg>
          </div>

          {/* KONA text with dramatic reveal */}
          <div 
            className="mt-10 overflow-hidden"
            style={{
              opacity: phase >= 4 ? 1 : 0,
              transform: phase >= 4 ? 'translateY(0)' : 'translateY(40px)',
              transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <h1 
              className="text-8xl font-black tracking-[0.25em] relative"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A855F7 30%, #C084FC 60%, #E879F9 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: phase >= 4 ? 'drop-shadow(0 0 40px rgba(139, 92, 246, 0.6))' : 'none'
              }}
            >
              KONA
            </h1>
            
            {/* Animated underline */}
            <div 
              className="h-1 mx-auto mt-3 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, #8B5CF6, #A855F7, #C084FC, #A855F7, #8B5CF6, transparent)',
                width: phase >= 4 ? '100%' : '0%',
                opacity: phase >= 4 ? 1 : 0,
                transition: 'all 0.8s ease-out 0.4s'
              }}
            />
          </div>

          {/* Tagline */}
          <p 
            className="mt-8 text-xl tracking-[0.4em] uppercase font-light"
            style={{
              color: 'rgba(168, 85, 247, 0.9)',
              opacity: phase >= 5 ? 1 : 0,
              transform: phase >= 5 ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s ease-out',
              textShadow: '0 0 30px rgba(139, 92, 246, 0.4)'
            }}
          >
            African Stories, Your Way
          </p>
        </div>
      </div>

      {/* Bottom vignette */}
      <div 
        className="absolute inset-x-0 bottom-0 h-48 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(3, 0, 20, 0.9) 0%, transparent 100%)'
        }}
      />

      {/* Top vignette */}
      <div 
        className="absolute inset-x-0 top-0 h-32 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(3, 0, 20, 0.7) 0%, transparent 100%)'
        }}
      />

      {/* Cinematic letterbox bars */}
      <div className="absolute inset-x-0 top-0 h-14 bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-14 bg-black" />

      {/* Keyframe animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
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
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsReady(true), 200);
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
          background: `radial-gradient(ellipse 100% 100% at 50% 100%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)`
        }}
      />

      {/* Content */}
      <div 
        className={`flex flex-col items-center transition-all duration-1000 ${
          isReady ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Mini logo */}
        <div 
          className={`mb-10 transition-transform duration-500 ${isHovering ? 'scale-110' : 'scale-100'}`}
        >
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="miniGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#A855F7" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="80" height="80" rx="16" fill="none" stroke="url(#miniGrad)" strokeWidth="4" />
            <path d="M38 30 L38 70 L72 50 Z" fill="url(#miniGrad)" />
          </svg>
        </div>

        {/* Play button */}
        <button 
          className="group relative px-12 py-5 rounded-full font-semibold text-white text-lg overflow-hidden transition-all duration-300 hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4) 0%, rgba(168, 85, 247, 0.4) 100%)',
            border: '2px solid rgba(139, 92, 246, 0.6)',
            boxShadow: isHovering ? '0 0 60px rgba(139, 92, 246, 0.5)' : '0 0 30px rgba(139, 92, 246, 0.2)'
          }}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          <span className="relative z-10 flex items-center gap-4">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Enter Experience
          </span>
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.6) 0%, rgba(168, 85, 247, 0.6) 100%)'
            }}
          />
        </button>

        {/* Hint */}
        <p className="mt-8 text-sm text-gray-500 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
          Best with sound on
        </p>
      </div>

      {/* Corner accents */}
      <div className="absolute top-10 left-10 w-20 h-20 border-l-2 border-t-2 border-purple-500/30 rounded-tl-xl" />
      <div className="absolute top-10 right-10 w-20 h-20 border-r-2 border-t-2 border-purple-500/30 rounded-tr-xl" />
      <div className="absolute bottom-10 left-10 w-20 h-20 border-l-2 border-b-2 border-purple-500/30 rounded-bl-xl" />
      <div className="absolute bottom-10 right-10 w-20 h-20 border-r-2 border-b-2 border-purple-500/30 rounded-br-xl" />
    </div>
  );
};

// Combined component
export const SplashWithSound = ({ onComplete, minDuration = 5000 }) => {
  const [stage, setStage] = useState('pre'); // 'pre' | 'splash' | 'done'

  const handleEnter = () => {
    setStage('splash');
  };
  
  const handleComplete = () => {
    setStage('done');
    if (onComplete) {
      onComplete();
    }
  };

  if (stage === 'pre') {
    return <PreSplash onEnter={handleEnter} />;
  }
  
  if (stage === 'splash') {
    return <SplashScreen onComplete={handleComplete} minDuration={minDuration} />;
  }
  
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
