import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Individual coin component
const Coin = ({ delay, startX, startY, endY, size, rotation }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{ 
        x: startX, 
        y: startY, 
        opacity: 0, 
        scale: 0,
        rotateY: 0 
      }}
      animate={{ 
        y: [startY, startY - 100, endY],
        opacity: [0, 1, 1, 0],
        scale: [0, 1.2, 1, 0.8],
        rotateY: [0, 360 * rotation, 720 * rotation],
      }}
      transition={{ 
        duration: 2,
        delay: delay,
        ease: [0.25, 0.46, 0.45, 0.94],
        times: [0, 0.3, 0.7, 1]
      }}
      style={{ 
        width: size, 
        height: size,
        left: '50%',
        transform: 'translateX(-50%)'
      }}
    >
      {/* 3D Coin */}
      <div 
        className="w-full h-full rounded-full relative"
        style={{
          background: 'linear-gradient(145deg, #ffd700, #ffb700, #ff9500)',
          boxShadow: `
            inset 0 2px 4px rgba(255,255,255,0.5),
            inset 0 -2px 4px rgba(0,0,0,0.2),
            0 4px 8px rgba(0,0,0,0.3),
            0 0 20px rgba(255,215,0,0.5)
          `,
          border: '2px solid #daa520'
        }}
      >
        {/* Coin inner design */}
        <div 
          className="absolute inset-2 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, #ffcc00, #ffa500)',
            border: '1px solid #b8860b'
          }}
        >
          <span 
            className="font-bold text-yellow-900"
            style={{ fontSize: size * 0.4 }}
          >
            K
          </span>
        </div>
        
        {/* Shine effect */}
        <div 
          className="absolute top-1 left-1 w-1/3 h-1/4 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.8), transparent)'
          }}
        />
      </div>
    </motion.div>
  );
};

// Sparkle particle
const Sparkle = ({ delay, x, y }) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ 
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
      }}
      transition={{ 
        duration: 0.6,
        delay: delay,
        ease: "easeOut"
      }}
      style={{ left: x, top: y }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path
          d="M10 0L12 8L20 10L12 12L10 20L8 12L0 10L8 8L10 0Z"
          fill="#FFD700"
          filter="drop-shadow(0 0 4px rgba(255, 215, 0, 0.8))"
        />
      </svg>
    </motion.div>
  );
};

// Number counter animation
const CoinCounter = ({ amount, show }) => {
  const [displayAmount, setDisplayAmount] = useState(0);
  
  useEffect(() => {
    if (show && amount > 0) {
      const duration = 1500;
      const steps = 30;
      const increment = amount / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= amount) {
          setDisplayAmount(amount);
          clearInterval(timer);
        } else {
          setDisplayAmount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [show, amount]);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.5 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="text-center"
    >
      <motion.div
        className="text-5xl md:text-7xl font-bold"
        style={{
          background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(255, 165, 0, 0.5))'
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.3, repeat: 3 }}
      >
        +{displayAmount}
      </motion.div>
      <motion.div 
        className="text-xl md:text-2xl text-yellow-400 mt-2 font-medium"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Coins Added!
      </motion.div>
    </motion.div>
  );
};

// Main Coin Animation Component
export const CoinAnimation = ({ 
  show, 
  amount = 100, 
  onComplete,
  variant = 'reward' // 'reward' | 'topup' | 'burst'
}) => {
  const [coins, setCoins] = useState([]);
  const [sparkles, setSparkles] = useState([]);
  
  const generateCoins = useCallback(() => {
    const coinCount = variant === 'burst' ? 20 : 12;
    const newCoins = [];
    const newSparkles = [];
    
    for (let i = 0; i < coinCount; i++) {
      newCoins.push({
        id: i,
        delay: i * 0.08,
        startX: (Math.random() - 0.5) * 200,
        startY: variant === 'topup' ? 100 : 0,
        endY: variant === 'topup' ? -50 : 150 + Math.random() * 100,
        size: 30 + Math.random() * 20,
        rotation: 1 + Math.random()
      });
    }
    
    // Generate sparkles
    for (let i = 0; i < 15; i++) {
      newSparkles.push({
        id: i,
        delay: 0.2 + i * 0.1,
        x: `${20 + Math.random() * 60}%`,
        y: `${20 + Math.random() * 60}%`
      });
    }
    
    setCoins(newCoins);
    setSparkles(newSparkles);
  }, [variant]);
  
  useEffect(() => {
    if (show) {
      generateCoins();
      
      // Call onComplete after animation
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, generateCoins, onComplete]);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onComplete}
          data-testid="coin-animation-overlay"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Radial glow */}
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)'
            }}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          {/* Coins container */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Animated coins */}
            {coins.map((coin) => (
              <Coin key={coin.id} {...coin} />
            ))}
            
            {/* Sparkles */}
            {sparkles.map((sparkle) => (
              <Sparkle key={sparkle.id} {...sparkle} />
            ))}
            
            {/* Amount display */}
            <CoinCounter amount={amount} show={show} />
          </div>
          
          {/* Tap to continue hint */}
          <motion.div
            className="absolute bottom-10 text-white/60 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            Tap to continue
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Compact coin burst for inline use (e.g., in cards, buttons)
export const CoinBurst = ({ show, x = 0, y = 0, count = 8 }) => {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        angle: (360 / count) * i,
        distance: 40 + Math.random() * 30,
        size: 12 + Math.random() * 8,
        delay: i * 0.03
      }));
      setParticles(newParticles);
    }
  }, [show, count]);
  
  return (
    <AnimatePresence>
      {show && (
        <div 
          className="absolute pointer-events-none"
          style={{ left: x, top: y }}
        >
          {particles.map((particle) => {
            const radians = (particle.angle * Math.PI) / 180;
            const endX = Math.cos(radians) * particle.distance;
            const endY = Math.sin(radians) * particle.distance;
            
            return (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  background: 'linear-gradient(145deg, #ffd700, #ff9500)',
                  boxShadow: '0 0 10px rgba(255,215,0,0.6)',
                  border: '1px solid #daa520'
                }}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 1, 
                  scale: 0 
                }}
                animate={{ 
                  x: endX,
                  y: endY,
                  opacity: [1, 1, 0],
                  scale: [0, 1.2, 0.5]
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.6,
                  delay: particle.delay,
                  ease: "easeOut"
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
};

// Hook to trigger coin animation
export const useCoinAnimation = () => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationProps, setAnimationProps] = useState({ amount: 0, variant: 'reward' });
  
  const triggerCoinAnimation = useCallback((amount, variant = 'reward') => {
    setAnimationProps({ amount, variant });
    setShowAnimation(true);
  }, []);
  
  const closeAnimation = useCallback(() => {
    setShowAnimation(false);
  }, []);
  
  return {
    showAnimation,
    animationProps,
    triggerCoinAnimation,
    closeAnimation,
    CoinAnimationComponent: () => (
      <CoinAnimation
        show={showAnimation}
        amount={animationProps.amount}
        variant={animationProps.variant}
        onComplete={closeAnimation}
      />
    )
  };
};

export default CoinAnimation;
