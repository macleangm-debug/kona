import React, { useState, useEffect } from "react";
import axios from "axios";
import { Target, Coins, Users, ChevronRight, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { API } from "@/config";

export const TipGoalProgress = ({ 
  creatorId, 
  creatorName,
  token,
  compact = false,
  onContribute 
}) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeGoal, setActiveGoal] = useState(null);
  const [showContribute, setShowContribute] = useState(false);
  const [contributeAmount, setContributeAmount] = useState(50);
  const [contributing, setContributing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchGoals = async () => {
      if (!creatorId) return;
      try {
        const res = await axios.get(`${API}/tip-goals/creator/${creatorId}`);
        setGoals(res.data.goals || []);
        if (res.data.goals?.length > 0) {
          setActiveGoal(res.data.goals[0]);
        }
      } catch (e) {
        console.error("Error fetching tip goals:", e);
      }
      setLoading(false);
    };
    fetchGoals();
  }, [creatorId]);

  const handleContribute = async () => {
    if (!activeGoal || !token) return;
    
    setContributing(true);
    try {
      const res = await axios.post(
        `${API}/tip-goals/${activeGoal.id}/contribute?amount=${contributeAmount}&message=${encodeURIComponent(message)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update goal progress
      setActiveGoal(prev => ({
        ...prev,
        current_amount: res.data.new_total,
        progress_percent: res.data.progress_percent
      }));
      
      setShowContribute(false);
      setMessage("");
      
      if (onContribute) {
        onContribute(res.data);
      }
    } catch (e) {
      console.error("Contribution failed:", e);
    }
    setContributing(false);
  };

  if (loading || !activeGoal) return null;

  // Compact view for video player overlay
  if (compact) {
    return (
      <div 
        className="flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 cursor-pointer hover:bg-black/70 transition-colors"
        onClick={() => setShowContribute(true)}
        data-testid="tip-goal-compact"
      >
        <Target className="w-4 h-4 text-yellow-400" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/90 truncate max-w-[120px]">
              {activeGoal.title}
            </span>
            <span className="text-xs text-yellow-400 font-medium">
              {activeGoal.progress_percent.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={activeGoal.progress_percent} 
            className="h-1 w-24 bg-white/20" 
          />
        </div>
        <ChevronRight className="w-4 h-4 text-white/50" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-xl p-4 border border-white/10" data-testid="tip-goal-progress">
      {/* Goal Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <h4 className="text-white font-medium text-sm">{activeGoal.title}</h4>
            <p className="text-white/50 text-xs">by {creatorName}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          activeGoal.status === 'completed' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {activeGoal.status === 'completed' ? 'Completed' : 'Active'}
        </span>
      </div>

      {/* Description */}
      {activeGoal.description && (
        <p className="text-white/70 text-xs mb-3 line-clamp-2">
          {activeGoal.description}
        </p>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/70 mb-1">
          <span className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-yellow-400" />
            {activeGoal.current_amount.toLocaleString()} / {activeGoal.target_amount.toLocaleString()}
          </span>
          <span className="text-yellow-400 font-medium">
            {activeGoal.progress_percent.toFixed(1)}%
          </span>
        </div>
        <Progress 
          value={activeGoal.progress_percent} 
          className="h-2 bg-white/10" 
        />
      </div>

      {/* Contributors */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1 text-xs text-white/60">
          <Users className="w-3 h-3" />
          {activeGoal.contributor_count} supporters
        </div>
        {activeGoal.ends_at && (
          <span className="text-xs text-white/50">
            Ends {new Date(activeGoal.ends_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Contribute Section */}
      {activeGoal.status === 'active' && token && (
        showContribute ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {[25, 50, 100, 250].map(amt => (
                <button
                  key={amt}
                  onClick={() => setContributeAmount(amt)}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                    contributeAmount === amt
                      ? 'bg-yellow-500 text-black font-medium'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {amt}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add a message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowContribute(false)}
                className="flex-1 py-2 text-xs bg-white/10 text-white/70 rounded-lg hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleContribute}
                disabled={contributing}
                className="flex-1 py-2 text-xs bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-400 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {contributing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <Coins className="w-3 h-3" />
                    Contribute {contributeAmount}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowContribute(true)}
            className="w-full py-2 text-xs bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-medium rounded-lg hover:from-yellow-400 hover:to-amber-400 flex items-center justify-center gap-1"
          >
            <Coins className="w-3 h-3" />
            Support This Goal
          </button>
        )
      )}

      {/* Not logged in */}
      {!token && activeGoal.status === 'active' && (
        <p className="text-xs text-white/50 text-center">
          Sign in to support this goal
        </p>
      )}
    </div>
  );
};

export default TipGoalProgress;
