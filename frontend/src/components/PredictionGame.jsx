import React, { useState, useEffect } from "react";
import axios from "axios";
import { Target, Flame, CheckCircle, XCircle, Loader2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API } from "@/config";
import { toast } from "sonner";

export const PredictionGame = ({ token, episodeId, episodeTitle, onUpdate }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(-1);
  const [submitting, setSubmitting] = useState(false);
  const [streakData, setStreakData] = useState(null);

  useEffect(() => {
    if (token && episodeId) {
      fetchPrediction();
      fetchStreak();
    }
  }, [token, episodeId]);

  const fetchPrediction = async () => {
    try {
      const res = await axios.get(`${API}/games/prediction/${episodeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrediction(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const fetchStreak = async () => {
    try {
      const res = await axios.get(`${API}/games/prediction/streak`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStreakData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async () => {
    if (selectedOption === -1) {
      toast.error("Select your prediction!");
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/games/prediction/submit`, {
        episode_id: episodeId,
        prediction_index: selectedOption
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Prediction submitted! Watch to see if you're right.");
      fetchPrediction();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        </div>
      </Card>
    );
  }

  if (!prediction) return null;

  // Already predicted - show status
  if (prediction.already_predicted) {
    return (
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-full bg-purple-500/20">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold">Your Prediction</h3>
            <p className="text-xs text-gray-400">{episodeTitle || "Episode"}</p>
          </div>
        </div>

        <div className={`p-4 rounded-lg ${
          prediction.waiting_for_result 
            ? "bg-yellow-500/20 border border-yellow-500/30" 
            : prediction.was_correct 
              ? "bg-green-500/20 border border-green-500/30"
              : "bg-red-500/20 border border-red-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">You predicted:</p>
              <p className="font-bold">{prediction.prediction_text}</p>
            </div>
            {!prediction.waiting_for_result && (
              <div className="text-right">
                {prediction.was_correct ? (
                  <>
                    <CheckCircle className="w-6 h-6 text-green-400 mb-1" />
                    <p className="text-green-400 font-bold">+{prediction.coins_earned}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-6 h-6 text-red-400 mb-1" />
                    <p className="text-red-400 text-xs">Not this time</p>
                  </>
                )}
              </div>
            )}
            {prediction.waiting_for_result && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                Waiting...
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // New prediction form
  return (
    <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-purple-500/20">
          <Target className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold">Predict What Happens!</h3>
          <p className="text-xs text-gray-400">Guess correctly to win coins</p>
        </div>
        {streakData?.current_streak > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">{streakData.current_streak}</span>
          </div>
        )}
      </div>

      {/* Streak bonus info */}
      {streakData?.next_bonus && (
        <div className="mb-4 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">
              <Flame className="w-3 h-3 inline mr-1 text-orange-400" />
              {streakData.next_bonus.needed} more correct for streak bonus
            </span>
            <span className="text-orange-400 font-bold">+{streakData.next_bonus.bonus} coins</span>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="mb-4">
        <p className="font-medium text-sm mb-3">{prediction.question}</p>
        <div className="space-y-2">
          {prediction.options.map((option, index) => (
            <button
              key={index}
              onClick={() => setSelectedOption(index)}
              className={`w-full p-3 rounded-lg text-left text-sm transition-all ${
                selectedOption === index
                  ? "bg-purple-500/30 border-2 border-purple-400"
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedOption === index 
                    ? "border-purple-400 bg-purple-400" 
                    : "border-gray-500"
                }`}>
                  {selectedOption === index && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Reward info */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
        <span>Correct prediction:</span>
        <span className="text-yellow-400 font-bold">+{prediction.reward_if_correct} coins</span>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleSubmit}
        disabled={submitting || selectedOption === -1}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Target className="w-4 h-4 mr-2" />
        )}
        Lock In Prediction
      </Button>
    </Card>
  );
};

// Compact version for listing
export const PredictionStreak = ({ token }) => {
  const [streakData, setStreakData] = useState(null);

  useEffect(() => {
    if (token) fetchStreak();
  }, [token]);

  const fetchStreak = async () => {
    try {
      const res = await axios.get(`${API}/games/prediction/streak`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStreakData(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  if (!streakData) return null;

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
      <Flame className="w-4 h-4 text-orange-400" />
      <div className="flex-1">
        <p className="text-xs text-gray-400">Prediction Streak</p>
        <p className="font-bold text-orange-400">{streakData.current_streak} correct</p>
      </div>
      {streakData.next_bonus && (
        <div className="text-right">
          <p className="text-[10px] text-gray-500">{streakData.next_bonus.needed} more</p>
          <p className="text-xs text-yellow-400">+{streakData.next_bonus.bonus}</p>
        </div>
      )}
    </div>
  );
};

export default PredictionGame;
