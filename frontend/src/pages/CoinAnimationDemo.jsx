import React, { useState } from 'react';
import { CoinAnimation, CoinBurst } from '@/components/CoinAnimation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Coins, Gift, ShoppingCart, Sparkles } from 'lucide-react';

export const CoinAnimationDemo = () => {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationVariant, setAnimationVariant] = useState('reward');
  const [amount, setAmount] = useState(50);
  const [showBurst, setShowBurst] = useState(false);
  const [burstPosition, setBurstPosition] = useState({ x: 0, y: 0 });

  const triggerAnimation = (variant, coins) => {
    setAnimationVariant(variant);
    setAmount(coins);
    setShowAnimation(true);
  };

  const handleBurst = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setBurstPosition({ 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    });
    setShowBurst(true);
    setTimeout(() => setShowBurst(false), 700);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Coin Animation Demo
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Click buttons to preview different coin animations
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reward Animation */}
          <Card className="p-6 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Reward Animation</h3>
                <p className="text-sm text-gray-400">Daily rewards, missions, spins</p>
              </div>
            </div>
            <Button 
              onClick={() => triggerAnimation('reward', 25)}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500"
              data-testid="demo-reward-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Claim 25 Coins
            </Button>
          </Card>

          {/* Top-up Animation */}
          <Card className="p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Top-up Animation</h3>
                <p className="text-sm text-gray-400">Coin purchases from store</p>
              </div>
            </div>
            <Button 
              onClick={() => triggerAnimation('topup', 500)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              data-testid="demo-topup-btn"
            >
              <Coins className="w-4 h-4 mr-2" />
              Buy 500 Coins
            </Button>
          </Card>

          {/* Burst Animation */}
          <Card className="p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Burst Animation</h3>
                <p className="text-sm text-gray-400">Inline micro-animation</p>
              </div>
            </div>
            <Button 
              onClick={handleBurst}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 relative overflow-visible"
              data-testid="demo-burst-btn"
            >
              <Coins className="w-4 h-4 mr-2" />
              Coin Burst
              <CoinBurst show={showBurst} x={burstPosition.x} y={burstPosition.y} />
            </Button>
          </Card>

          {/* Large Reward */}
          <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Big Win Animation</h3>
                <p className="text-sm text-gray-400">Large rewards, jackpots</p>
              </div>
            </div>
            <Button 
              onClick={() => triggerAnimation('burst', 1000)}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500"
              data-testid="demo-bigwin-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Win 1000 Coins!
            </Button>
          </Card>
        </div>

        {/* How to use */}
        <Card className="mt-8 p-6 bg-black/40 border-white/10">
          <h3 className="font-semibold text-white mb-4">Usage in Code</h3>
          <pre className="text-sm text-gray-400 bg-black/50 p-4 rounded-lg overflow-x-auto">
{`import { CoinAnimation } from '@/components/CoinAnimation';

// In your component:
const [showAnimation, setShowAnimation] = useState(false);

// Trigger after successful action:
setCoinAnimationAmount(100);
setShowCoinAnimation(true);

// Render:
<CoinAnimation
  show={showCoinAnimation}
  amount={coinAnimationAmount}
  variant="reward" // or "topup" or "burst"
  onComplete={() => setShowCoinAnimation(false)}
/>`}
          </pre>
        </Card>
      </div>

      {/* The actual animation overlay */}
      <CoinAnimation
        show={showAnimation}
        amount={amount}
        variant={animationVariant}
        onComplete={() => setShowAnimation(false)}
      />
    </div>
  );
};

export default CoinAnimationDemo;
