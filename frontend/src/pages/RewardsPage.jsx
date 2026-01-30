import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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

// Spin Wheel Component
const SpinWheel = ({ onSpin, canSpin, isSpinning, setIsSpinning, spinsRemaining = 0, maxSpins = 3 }) => {
  const prizes = [
    { label: "1", color: "#6366f1" },
    { label: "2", color: "#8b5cf6" },
    { label: "3", color: "#22c55e" },
    { label: "5", color: "#f59e0b" },
    { label: "8", color: "#3b82f6" },
    { label: "10", color: "#ef4444" },
    { label: "15", color: "#ec4899" },
    { label: "25", color: "#14b8a6" },
  ];
  
  const [rotation, setRotation] = useState(0);

  const handleSpin = () => {
    if (!canSpin || isSpinning || spinsRemaining <= 0) return;
    
    // Start spinning animation
    setIsSpinning(true);
    
    // Random rotation (4-6 full spins + random position)
    const spins = 4 + Math.random() * 2;
    const newRotation = rotation + (spins * 360) + Math.random() * 360;
    setRotation(newRotation);
    
    // Calculate prize after animation completes
    setTimeout(() => {
      const normalizedRotation = newRotation % 360;
      const prizeIndex = Math.floor((360 - normalizedRotation + 22.5) / 45) % 8;
      onSpin(parseInt(prizes[prizeIndex].label));
    }, 3500);
  };

  return (
    <div className="relative w-64 h-64 mx-auto my-4">
      {/* Outer glow */}
      <div className={`absolute inset-0 rounded-full ${isSpinning ? 'animate-pulse' : ''}`} 
           style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.4)' }} />
      
      {/* Wheel */}
      <div 
        className="w-full h-full rounded-full relative overflow-hidden shadow-2xl border-4 border-yellow-400"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isSpinning ? 'transform 3.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none'
        }}
      >
        {prizes.map((prize, i) => (
          <div
            key={i}
            className="absolute w-full h-full"
            style={{
              transform: `rotate(${i * 45}deg)`,
              clipPath: 'polygon(50% 50%, 50% 0%, 100% 0%, 100% 50%)',
              backgroundColor: prize.color
            }}
          >
            <span 
              className="absolute text-white font-bold text-lg"
              style={{
                top: '20%',
                left: '70%',
                transform: 'rotate(22.5deg)'
              }}
            >
              {prize.label}
            </span>
          </div>
        ))}
      </div>
      
      {/* Center button */}
      <button
        onClick={handleSpin}
        disabled={!canSpin || isSpinning || spinsRemaining <= 0}
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full 
          ${canSpin && !isSpinning && spinsRemaining > 0
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 cursor-pointer' 
            : 'bg-gray-600 cursor-not-allowed'
          } 
          flex items-center justify-center shadow-xl transition-all`}
      >
        <span className="text-white font-bold text-sm">
          {isSpinning ? '...' : spinsRemaining <= 0 ? '✗' : 'SPIN'}
        </span>
      </button>
      
      {/* Pointer */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-yellow-400" />
      
      {/* Spins remaining indicator */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
        {[...Array(maxSpins)].map((_, i) => (
          <div 
            key={i} 
            className={`w-3 h-3 rounded-full ${i < spinsRemaining ? 'bg-yellow-400' : 'bg-gray-600'}`}
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

  // Mock missions data (in production, fetch from API)
  const [missions, setMissions] = useState([
    { id: 1, title: "Watch 3 Episodes", description: "Watch any 3 episodes today", icon: Play, reward: 15, current: 2, target: 3, claimed: false },
    { id: 2, title: "Daily Login", description: "Log in to the app", icon: Calendar, reward: 5, current: 1, target: 1, claimed: true },
    { id: 3, title: "Add to List", description: "Add 5 series to your list", icon: Star, reward: 10, current: 3, target: 5, claimed: false },
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
      await axios.post(`${API}/rewards/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      setDailyReward({ ...dailyReward, canClaim: false });
      toast.success("🎉 You got 10 coins!");
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
      toast.success(`🎰 You won ${res.data.prize} coins!`);
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
    toast.success(`🎉 Claimed ${mission?.reward} coins!`);
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
      {/* Header */}
      <div className="px-4 lg:px-12 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">Rewards</h1>
            <p className="text-sm text-gray-400">Earn free coins daily</p>
          </div>
        </div>
        
        {/* Coin Balance */}
        <Card className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Your Balance</p>
              <p className="text-3xl font-bold flex items-center gap-2">
                <Coins className="w-7 h-7 text-yellow-400" />
                {user.coins}
              </p>
            </div>
            <Button onClick={() => navigate("/store")} variant="outline" className="rounded-full border-yellow-500/50">
              Get More
            </Button>
          </div>
        </Card>
      </div>

      {/* Daily Reward */}
      <div className="px-4 lg:px-12 mb-8">
        <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Daily Reward
        </h2>
        <Card className={`p-6 ${dailyReward.canClaim ? 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                dailyReward.canClaim 
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse' 
                  : 'bg-gray-700'
              }`}>
                <Gift className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Daily Login Bonus</h3>
                <p className="text-sm text-gray-400">
                  {dailyReward.canClaim ? 'Claim your free coins!' : 'Come back tomorrow'}
                </p>
                <p className="text-xs text-primary mt-1">🔥 {dailyReward.streak} day streak</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-400 flex items-center gap-1">
                <Coins className="w-5 h-5" />
                10
              </p>
              <Button
                onClick={handleClaimDaily}
                disabled={!dailyReward.canClaim || claimingDaily}
                className={`mt-2 rounded-full ${dailyReward.canClaim ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}`}
              >
                {claimingDaily ? <Loader2 className="w-4 h-4 animate-spin" /> : dailyReward.canClaim ? 'Claim!' : 'Claimed ✓'}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Spin Wheel */}
      <div className="px-4 lg:px-12 mb-8">
        <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          Lucky Spin
        </h2>
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-400 mb-1">Spin daily to win coins!</p>
            <p className={`text-xs ${spinData.spinsRemaining > 0 ? 'text-green-400' : 'text-gray-500'}`}>
              {spinData.spinsRemaining > 0 
                ? `✨ ${spinData.spinsRemaining}/${spinData.maxSpins} spins remaining` 
                : 'No spins left today'}
            </p>
          </div>
          <SpinWheel 
            onSpin={handleSpin} 
            canSpin={spinData.canSpin} 
            isSpinning={isSpinning}
            setIsSpinning={setIsSpinning}
            spinsRemaining={spinData.spinsRemaining}
            maxSpins={spinData.maxSpins}
          />
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400 mb-2">
              {isSpinning ? '🎰 Good luck!' : spinData.spinsRemaining > 0 ? 'Tap the wheel or button to spin!' : ''}
            </p>
          </div>
        </Card>
      </div>

      {/* Missions */}
      <div className="px-4 lg:px-12 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Daily Missions
          </h2>
          <span className="text-sm text-gray-400">{completedMissions}/{totalMissions} completed</span>
        </div>
        <div className="space-y-3">
          {missions.map(mission => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClaim={handleClaimMission}
              claiming={claimingMission}
            />
          ))}
        </div>
      </div>

      {/* Referral CTA */}
      <div className="px-4 lg:px-12">
        <Card className="p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Invite Friends, Earn More!</h3>
              <p className="text-sm text-gray-400">Get 20 coins for every friend who joins</p>
            </div>
            <Button onClick={() => navigate("/profile")} variant="outline" className="rounded-full border-green-500/50">
              Invite
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RewardsPage;
