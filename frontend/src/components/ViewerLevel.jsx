import React, { useState, useEffect } from "react";
import axios from "axios";
import { Star, ChevronRight, Crown, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { API } from "@/config";

export const ViewerLevel = ({ token }) => {
  const [levelData, setLevelData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchLevel();
  }, [token]);

  const fetchLevel = async () => {
    try {
      const res = await axios.get(`${API}/viewer-level`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLevelData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading || !levelData) return null;

  const { current_level, next_level, episodes_watched, episodes_to_next, progress_percent, total_xp } = levelData;

  const getLevelColor = (levelName) => {
    switch (levelName) {
      case "Newcomer": return "from-gray-500 to-gray-600";
      case "Regular": return "from-blue-500 to-blue-600";
      case "Fan": return "from-orange-500 to-red-500";
      case "Superfan": return "from-purple-500 to-pink-500";
      case "Legend": return "from-yellow-400 to-yellow-600";
      default: return "from-gray-500 to-gray-600";
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getLevelColor(current_level.name)} flex items-center justify-center text-xl shadow-lg`}>
          {current_level.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">{current_level.name}</h3>
            {current_level.name === "Legend" && <Crown className="w-4 h-4 text-yellow-400" />}
          </div>
          <p className="text-xs text-gray-400">{episodes_watched} episodes watched</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-violet-400">{total_xp}</p>
          <p className="text-xs text-gray-400">XP</p>
        </div>
      </div>

      {/* Progress to next level */}
      {next_level && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Progress to {next_level.name}</span>
            <span className="text-violet-400">{episodes_to_next} episodes to go</span>
          </div>
          <div className="relative">
            <Progress value={progress_percent} className="h-3 bg-gray-700" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-800 border-2 border-violet-500 flex items-center justify-center text-xs">
              {next_level.icon}
            </div>
          </div>
        </div>
      )}

      {/* Level perks */}
      {current_level.perks?.length > 0 && (
        <div className="pt-3 border-t border-white/10">
          <p className="text-xs text-gray-400 mb-2">Your perks:</p>
          <div className="flex flex-wrap gap-2">
            {current_level.perks.map((perk) => (
              <span 
                key={perk}
                className="px-2 py-1 text-xs rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30"
              >
                {perk.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All levels preview */}
      <div className="mt-4 pt-3 border-t border-white/10">
        <p className="text-xs text-gray-400 mb-2">All levels:</p>
        <div className="flex items-center justify-between">
          {levelData.all_levels.map((level, i) => {
            const isCurrentOrPast = episodes_watched >= level.min_episodes;
            const isCurrent = level.name === current_level.name;
            
            return (
              <React.Fragment key={level.name}>
                <div 
                  className={`flex flex-col items-center ${
                    isCurrent ? "scale-110" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    isCurrentOrPast 
                      ? `bg-gradient-to-br ${getLevelColor(level.name)} shadow-lg` 
                      : "bg-gray-700 text-gray-500"
                  } ${isCurrent ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900" : ""}`}>
                    {level.icon}
                  </div>
                  <p className={`text-[10px] mt-1 ${isCurrentOrPast ? "text-white" : "text-gray-600"}`}>
                    {level.min_episodes}+
                  </p>
                </div>
                {i < levelData.all_levels.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 ${
                    episodes_watched >= levelData.all_levels[i + 1].min_episodes 
                      ? "bg-violet-500" 
                      : "bg-gray-700"
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default ViewerLevel;
