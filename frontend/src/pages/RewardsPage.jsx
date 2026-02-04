import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { 
  Gift, Coins, Trophy, Target, CheckCircle2, Lock,
  Loader2, Sparkles, Calendar, Users, Play, Star
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { WatchStreak } from "@/components/WatchStreak";
import { ViewerLevel } from "@/components/ViewerLevel";
import { DailyChallenges } from "@/components/DailyChallenges";
import { PurchasePrompt } from "@/components/PurchasePrompt";
import { MysteryBox } from "@/components/MysteryBox";
import { CharacterCards } from "@/components/CharacterCards";
import { WeeklyLeaderboard } from "@/components/WeeklyLeaderboard";
import { RewardClaimedModal } from "@/components/AnimatedModals";
import { ScratchCard } from "@/components/ScratchCard";
import { StreakShield } from "@/components/StreakShield";
import { PredictionStreak } from "@/components/PredictionGame";
import { EconomyWarnings } from "@/components/EconomyWarnings";

// Spin Wheel Component - Revenue optimized (max 5 coins)
const SpinWheel = ({ onSpin, canSpin, isSpinning, setIsSpinning, spinsRemaining = 0, maxSpins = 3 }) => {
  const prizes = [
    { label: "1", color: "#6366f1" },
    { label: "1", color: "#8b5cf6" },
    { label: "2", color: "#22c55e" },
    { label: "2", color: "#f59e0b" },
    { label: "3", color: "#3b82f6" },
    { label: "3", color: "#ef4444" },
    { label: "4", color: "#ec4899" },
    { label: "5", color: "#14b8a6" },
  ];
  
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSpin = () => {
    if (!canSpin || isSpinning || spinsRemaining <= 0 || isAnimating) return;
    
    // Start spinning animation
    setIsSpinning(true);
    setIsAnimating(true);
    
    // Random rotation (8-12 full spins + random position for dramatic effect)
    const spins = 8 + Math.random() * 4;
    const extraDegrees = Math.random() * 360;
    const newRotation = rotation + (spins * 360) + extraDegrees;
    
    // Small delay to ensure state is set before animation
    requestAnimationFrame(() => {
      setRotation(newRotation);
    });
    
    // Calculate prize after animation completes (5.2 seconds for settling)
    setTimeout(() => {
      const normalizedRotation = newRotation % 360;
      // SVG segments start from top (-90°), going clockwise
      // Segment 0 is at top, segment 1 is 45° clockwise, etc.
      // When wheel rotates R degrees clockwise, segment that was R degrees counter-clockwise is now at top
      // Formula: (8 - floor((R + 22.5) / 45)) % 8
      const prizeIndex = (8 - Math.floor((normalizedRotation + 22.5) / 45) % 8) % 8;
      setIsAnimating(false);
      onSpin(parseInt(prizes[prizeIndex].label));
    }, 5200);
  };

  return (
    <div className="relative w-72 h-72 mx-auto my-6">
      {/* Outer glow effect */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-300 ${isAnimating ? 'scale-105' : 'scale-100'}`}
        style={{ 
          boxShadow: isAnimating 
            ? '0 0 60px rgba(168, 85, 247, 0.6), 0 0 100px rgba(168, 85, 247, 0.3)' 
            : '0 0 30px rgba(168, 85, 247, 0.3)' 
        }} 
      />
      
      {/* Wheel container */}
      <div 
        className="w-full h-full rounded-full relative overflow-hidden border-4 border-yellow-400"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isAnimating 
            ? 'transform 5s cubic-bezier(0.2, 0.8, 0.3, 1)' 
            : 'none',
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
        }}
      >
        {/* SVG-based wheel for perfect segment rendering */}
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {prizes.map((prize, i) => {
            const startAngle = i * 45 - 90; // Start from top
            const endAngle = startAngle + 45;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            const midRad = ((startAngle + 22.5) * Math.PI) / 180;
            
            // Calculate path for pie segment
            const x1 = 100 + 100 * Math.cos(startRad);
            const y1 = 100 + 100 * Math.sin(startRad);
            const x2 = 100 + 100 * Math.cos(endRad);
            const y2 = 100 + 100 * Math.sin(endRad);
            
            // Calculate text position (60% from center)
            const textX = 100 + 60 * Math.cos(midRad);
            const textY = 100 + 60 * Math.sin(midRad);
            
            return (
              <g key={i}>
                <path
                  d={`M 100 100 L ${x1} ${y1} A 100 100 0 0 1 ${x2} ${y2} Z`}
                  fill={prize.color}
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="24"
                  fontWeight="bold"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                >
                  {prize.label}
                </text>
              </g>
            );
          })}
          {/* Center circle */}
          <circle cx="100" cy="100" r="20" fill="#1f2937" stroke="#fbbf24" strokeWidth="3" />
          <text x="100" y="100" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize="10" fontWeight="bold">
            SPIN
          </text>
        </svg>
      </div>
      
      {/* Center button */}
      <button
        onClick={handleSpin}
        disabled={!canSpin || isSpinning || spinsRemaining <= 0 || isAnimating}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full 
          ${canSpin && !isAnimating && spinsRemaining > 0
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 cursor-pointer hover:scale-110' 
            : 'bg-gray-600 cursor-not-allowed'
          } 
          flex items-center justify-center shadow-2xl transition-all duration-300 border-4 border-white/30`}
        style={{
          boxShadow: canSpin && !isAnimating && spinsRemaining > 0 
            ? '0 0 30px rgba(251, 191, 36, 0.6)' 
            : 'none'
        }}
      >
        <span className="text-white font-bold text-lg">
          {isAnimating ? '🎰' : spinsRemaining <= 0 ? '✗' : 'SPIN'}
        </span>
      </button>
      
      {/* Pointer arrow */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
        <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[28px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
      </div>
      
      {/* Spins remaining indicator */}
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
        {[...Array(maxSpins)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full transition-all ${
              i < spinsRemaining 
                ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' 
                : 'bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Mission Card Component
const MissionCard = ({ mission, onClaim, claiming }) => {
  const progress = Math.min((mission.current / mission.target) * 100, 100);
  const isComplete = mission.current >= mission.target;
  
  return (
    <Card className={`p-4 ${isComplete && !mission.claimed ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          mission.claimed ? 'bg-gray-600' : isComplete ? 'bg-green-500' : 'bg-primary/20'
        }`}>
          {mission.claimed ? (
            <CheckCircle2 className="w-5 h-5 text-gray-400" />
          ) : (
            <mission.icon className={`w-5 h-5 ${isComplete ? 'text-white' : 'text-primary'}`} />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className={`font-medium text-sm ${mission.claimed ? 'text-gray-500' : ''}`}>
              {mission.title}
            </h4>
            <span className={`text-sm font-bold flex items-center gap-1 ${mission.claimed ? 'text-gray-500' : 'text-yellow-400'}`}>
              <Coins className="w-3 h-3" />
              {mission.reward}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-2">{mission.description}</p>
          
          {!mission.claimed && (
            <>
              <Progress value={progress} className="h-1.5 mb-2" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{mission.current}/{mission.target}</span>
                {isComplete && (
                  <Button
                    size="sm"
                    onClick={() => onClaim(mission.id)}
                    disabled={claiming === mission.id}
                    className="h-7 text-xs bg-green-500 hover:bg-green-600"
                  >
                    {claiming === mission.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Claim'}
                  </Button>
                )}
              </div>
            </>
          )}
          
          {mission.claimed && (
            <span className="text-xs text-gray-500">Completed</span>
          )}
        </div>
      </div>
    </Card>
  );
};

export const RewardsPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyReward, setDailyReward] = useState({ canClaim: false, streak: 0 });
  const [spinData, setSpinData] = useState({ canSpin: false, spinsRemaining: 0, maxSpins: 3 });
  const [isSpinning, setIsSpinning] = useState(false);
  const [claimingMission, setClaimingMission] = useState(null);
  const [claimingDaily, setClaimingDaily] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [rewardModalData, setRewardModalData] = useState({ amount: 0, type: "Daily Reward" });

  // Mock missions data (in production, fetch from API)
  const [missions, setMissions] = useState([
    { id: 1, title: "Watch 3 Episodes", description: "Watch any 3 episodes today", icon: Play, reward: 15, current: 2, target: 3, claimed: false },
    { id: 2, title: "Daily Login", description: "Log in to the app", icon: Calendar, reward: 5, current: 1, target: 1, claimed: true },
    { id: 3, title: "Add to List", description: "Add 5 series to your list", icon: Star, reward: 5, current: 3, target: 5, claimed: false },
    { id: 4, title: "Refer a Friend", description: "Invite 1 friend to join", icon: Users, reward: 30, current: 0, target: 1, claimed: false },
    { id: 5, title: "First Purchase", description: "Buy your first coin pack", icon: Coins, reward: 50, current: 0, target: 1, claimed: false },
  ]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchRewardsData();
  }, [user, token]);

  const fetchRewardsData = async () => {
    try {
      // Check daily reward status
      const dailyRes = await axios.get(`${API}/rewards/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDailyReward({
        canClaim: dailyRes.data.can_claim,
        streak: dailyRes.data.streak || 1
      });

      // Check spin wheel status from backend
      try {
        const spinRes = await axios.get(`${API}/spin/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSpinData({
          canSpin: spinRes.data.can_spin,
          spinsRemaining: spinRes.data.spins_remaining,
          maxSpins: spinRes.data.max_spins,
          spinsUsed: spinRes.data.spins_used
        });
      } catch (e) {
        // Fallback
        setSpinData({
          canSpin: true,
          spinsRemaining: 3,
          maxSpins: 3,
          spinsUsed: 0
        });
      }

    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleClaimDaily = async () => {
    if (!token) { onAuthClick(); return; }
    setClaimingDaily(true);
    try {
      const res = await axios.post(`${API}/rewards/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      setDailyReward({ ...dailyReward, canClaim: false });
      // Show animated modal instead of toast
      setRewardModalData({ amount: res.data?.coins || 3, type: "Daily Reward" });
      setShowRewardModal(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim");
    }
    setClaimingDaily(false);
  };

  const handleSpin = async (prize) => {
    // Call backend to record spin and award coins
    try {
      const res = await axios.post(`${API}/spin`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsSpinning(false);
      // Show animated modal for spin win
      setRewardModalData({ amount: res.data.prize, type: "Lucky Spin" });
      setShowRewardModal(true);
      setSpinData(prev => ({
        ...prev,
        canSpin: res.data.spins_remaining > 0,
        spinsRemaining: res.data.spins_remaining
      }));
      await refreshUser();
    } catch (e) {
      setIsSpinning(false);
      toast.error(e.response?.data?.detail || "Spin failed");
      setSpinData(prev => ({ ...prev, canSpin: false, spinsRemaining: 0 }));
    }
  };

  const handleClaimMission = async (missionId) => {
    if (!token) { onAuthClick(); return; }
    setClaimingMission(missionId);
    
    // Mock claim - in production, call API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setMissions(missions.map(m => 
      m.id === missionId ? { ...m, claimed: true } : m
    ));
    
    const mission = missions.find(m => m.id === missionId);
    // Show animated modal for mission claim
    setRewardModalData({ amount: mission?.reward || 0, type: mission?.title || "Mission" });
    setShowRewardModal(true);
    refreshUser();
    setClaimingMission(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm bg-card/50 border-white/10">
          <Gift className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h2 className="font-heading text-2xl font-bold mb-2">Rewards Center</h2>
          <p className="text-gray-400 mb-6">Sign in to earn free coins every day!</p>
          <Button onClick={onAuthClick} className="w-full rounded-full">
            Sign In to Continue
          </Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const completedMissions = missions.filter(m => m.claimed).length;
  const totalMissions = missions.length;

  return (
    <div className="min-h-screen pb-20 lg:pb-8 pt-20 lg:pt-24" data-testid="rewards-page">
      {/* Header with Coin Balance */}
      <div className="px-4 lg:px-12 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Gift className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl lg:text-2xl font-bold">Rewards</h1>
              <p className="text-xs text-gray-400">Earn badges & coins</p>
            </div>
          </div>
          <Card className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Coins className="w-5 h-5 text-yellow-400" />
                  {user.coins}
                </p>
              </div>
              <Button onClick={() => navigate("/store")} size="sm" variant="outline" className="rounded-full border-yellow-500/50 text-xs">
                Buy
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="px-4 lg:px-12">
        {/* Economy Warnings - Shows diminishing returns, expiring coins, etc. */}
        <EconomyWarnings token={token} onPurchaseClick={() => navigate("/store")} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          
          {/* Left Column: Spin Wheel */}
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-heading text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                Lucky Spin
              </h2>
              <span className={`text-xs ${spinData.spinsRemaining > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                {spinData.spinsRemaining}/{spinData.maxSpins} left
              </span>
            </div>
            <SpinWheel 
              onSpin={handleSpin} 
              canSpin={spinData.canSpin} 
              isSpinning={isSpinning}
              setIsSpinning={setIsSpinning}
              spinsRemaining={spinData.spinsRemaining}
              maxSpins={spinData.maxSpins}
            />
          </Card>

          {/* Right Column: Daily Reward + Mystery Box + Streak */}
          <div className="space-y-4">
            {/* Daily Reward - Compact */}
            <Card className={`p-3 ${dailyReward.canClaim ? 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    dailyReward.canClaim ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' : 'bg-gray-700'
                  }`}>
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Daily Login</h3>
                    <p className="text-xs text-primary">🔥 {dailyReward.streak} day streak</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-yellow-400 flex items-center gap-1">
                    <Coins className="w-4 h-4" />3
                  </span>
                  <Button
                    onClick={handleClaimDaily}
                    disabled={!dailyReward.canClaim || claimingDaily}
                    size="sm"
                    className={`rounded-full text-xs ${dailyReward.canClaim ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}`}
                  >
                    {claimingDaily ? '...' : dailyReward.canClaim ? 'Claim' : '✓'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Mystery Box - Compact */}
            <MysteryBox token={token} onUpdate={refreshUser} />

            {/* Watch Streak - Compact */}
            <WatchStreak token={token} onUpdate={refreshUser} />
            
            {/* Streak Shield */}
            <StreakShield token={token} onUpdate={refreshUser} />
          </div>
        </div>

        {/* NEW: Scratch Card + Prediction Streak Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <ScratchCard token={token} onUpdate={refreshUser} />
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" />
              Prediction Stats
            </h3>
            <PredictionStreak token={token} />
            <p className="text-xs text-gray-400 mt-3">
              Make predictions before watching episodes to earn bonus coins!
            </p>
          </Card>
        </div>

        {/* Second Row: Challenges + Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <DailyChallenges token={token} onUpdate={refreshUser} />
          <WeeklyLeaderboard token={token} userId={user?.id} />
        </div>

        {/* Third Row: Cards + Level */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <CharacterCards token={token} />
          <ViewerLevel token={token} />
        </div>

        {/* Referral CTA - Full Width */}
        <Card className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Invite Friends, Earn More!</h3>
              <p className="text-xs text-gray-400">Get coins when friends make a purchase</p>
            </div>
            <Button onClick={() => navigate("/profile")} size="sm" variant="outline" className="rounded-full border-green-500/50 text-xs">
              Invite
            </Button>
          </div>
        </Card>

        {/* Purchase Prompt */}
        <PurchasePrompt token={token} userCoins={user?.coins} />
      </div>

      {/* Reward Claimed Modal */}
      <RewardClaimedModal
        open={showRewardModal}
        onOpenChange={setShowRewardModal}
        rewardAmount={rewardModalData.amount}
        rewardType={rewardModalData.type}
        onConfirm={() => setShowRewardModal(false)}
      />
    </div>
  );
};

export default RewardsPage;
