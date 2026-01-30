import React, { useState, useEffect } from "react";
import axios from "axios";
import { Target, CheckCircle2, Star, Award, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { API } from "@/config";
import { toast } from "sonner";

export const DailyChallenges = ({ token, onUpdate }) => {
  const [challengeData, setChallengeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => {
    if (token) fetchChallenges();
  }, [token]);

  const fetchChallenges = async () => {
    try {
      const res = await axios.get(`${API}/challenges/daily`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChallengeData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const claimReward = async (challengeId) => {
    setClaiming(challengeId);
    try {
      const res = await axios.post(`${API}/challenges/claim/${challengeId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchChallenges();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim");
    }
    setClaiming(null);
  };

  if (loading) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </Card>
    );
  }

  if (!challengeData) return null;

  const { challenges, total_completed } = challengeData;

  const getRewardIcon = (rewardType) => {
    return <Award className="w-3 h-3 text-yellow-400" />;
  };

  const getRewardText = (challenge) => {
    // All rewards are badges now
    const badgeNames = {
      "daily_watcher": "Daily Watcher",
      "binge_starter": "Binge Starter",
      "explorer": "Explorer",
      "social_star": "Social Star"
    };
    return badgeNames[challenge.reward] || "Badge";
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-emerald-500/20">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold">Daily Challenges</h3>
            <p className="text-xs text-gray-400">Complete for XP & badges</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-400">{total_completed}/{challenges.length}</p>
          <p className="text-xs text-gray-400">done today</p>
        </div>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const progress = Math.min((challenge.progress / challenge.target) * 100, 100);
          
          return (
            <div 
              key={challenge.id}
              className={`p-3 rounded-lg border transition-all ${
                challenge.is_claimed 
                  ? "bg-gray-800/50 border-gray-700 opacity-60"
                  : challenge.is_complete
                    ? "bg-emerald-500/20 border-emerald-500/30"
                    : "bg-gray-800/30 border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2">
                  {challenge.is_claimed ? (
                    <CheckCircle2 className="w-5 h-5 text-gray-500 mt-0.5" />
                  ) : challenge.is_complete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-600 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium text-sm ${challenge.is_claimed ? "text-gray-500 line-through" : ""}`}>
                      {challenge.title}
                    </p>
                    <p className="text-xs text-gray-400">{challenge.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium">
                  {getRewardIcon(challenge.reward_type)}
                  <span className={challenge.is_claimed ? "text-gray-500" : "text-white"}>
                    {getRewardText(challenge)}
                  </span>
                </div>
              </div>

              {!challenge.is_claimed && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-400">{challenge.progress}/{challenge.target}</span>
                    {challenge.is_complete && !challenge.is_claimed && (
                      <Button
                        size="sm"
                        onClick={() => claimReward(challenge.id)}
                        disabled={claiming === challenge.id}
                        className="h-6 px-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                      >
                        {claiming === challenge.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Claim"}
                      </Button>
                    )}
                  </div>
                  <Progress value={progress} className="h-1.5 bg-gray-700" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All completed message */}
      {total_completed === challenges.length && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-center">
          <p className="text-sm font-medium text-emerald-400">🎉 All challenges complete!</p>
          <p className="text-xs text-gray-400">Come back tomorrow for new challenges</p>
        </div>
      )}
    </Card>
  );
};

export default DailyChallenges;
