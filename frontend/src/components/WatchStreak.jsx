import React, { useState, useEffect } from "react";
import axios from "axios";
import { Flame, Gift, Check, Lock, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { API } from "@/config";
import { toast } from "sonner";

export const WatchStreak = ({ token, onUpdate }) => {
  const [streakData, setStreakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (token) fetchStreakStatus();
  }, [token]);

  const fetchStreakStatus = async () => {
    try {
      const res = await axios.get(`${API}/streak/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStreakData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const claimReward = async (days) => {
    setClaiming(days);
    try {
      const res = await axios.post(`${API}/streak/claim/${days}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchStreakStatus();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim");
    }
    setClaiming(null);
  };

  if (loading || !streakData) return null;

  const { current_streak, next_milestone, claimable_rewards, all_milestones } = streakData;

  return (
    <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-orange-500/20">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-bold">Watch Streak</h3>
          <p className="text-xs text-gray-400">Watch daily to earn rewards</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-bold text-orange-400">{current_streak}</p>
          <p className="text-xs text-gray-400">days</p>
        </div>
      </div>

      {/* Progress to next milestone */}
      {next_milestone && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Next: {next_milestone.days}-day streak</span>
            <span className="text-orange-400">+{next_milestone.coins} coins</span>
          </div>
          <Progress 
            value={(current_streak / next_milestone.days) * 100} 
            className="h-2 bg-gray-700"
          />
          <p className="text-xs text-gray-500 mt-1">
            {next_milestone.days - current_streak} more days to go
          </p>
        </div>
      )}

      {/* Claimable rewards */}
      {claimable_rewards?.length > 0 && (
        <div className="space-y-2 mb-4">
          {claimable_rewards.map((reward) => (
            <div 
              key={reward.days}
              className="flex items-center justify-between p-2 rounded-lg bg-green-500/20 border border-green-500/30"
            >
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">{reward.days}-day reward</span>
              </div>
              <Button
                size="sm"
                onClick={() => claimReward(reward.days)}
                disabled={claiming === reward.days}
                className="bg-green-500 hover:bg-green-600 text-black font-bold text-xs"
              >
                {claiming === reward.days ? "..." : `+${reward.coins}`}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Milestone badges */}
      <div className="grid grid-cols-4 gap-2">
        {all_milestones.map((milestone) => {
          const isAchieved = current_streak >= milestone.days;
          const isClaimed = !claimable_rewards?.find(r => r.days === milestone.days) && isAchieved;
          
          return (
            <div 
              key={milestone.days}
              className={`p-2 rounded-lg text-center transition-all ${
                isAchieved 
                  ? isClaimed 
                    ? "bg-green-500/20 border border-green-500/30" 
                    : "bg-yellow-500/20 border border-yellow-500/30 animate-pulse"
                  : "bg-gray-800/50 border border-gray-700"
              }`}
            >
              <div className="text-lg mb-1">
                {isAchieved ? (isClaimed ? <Check className="w-4 h-4 mx-auto text-green-400" /> : "🎁") : <Lock className="w-4 h-4 mx-auto text-gray-500" />}
              </div>
              <p className={`text-xs font-bold ${isAchieved ? "text-white" : "text-gray-500"}`}>
                {milestone.days}d
              </p>
              <p className={`text-[10px] ${isAchieved ? "text-yellow-400" : "text-gray-600"}`}>
                +{milestone.coins}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WatchStreak;
