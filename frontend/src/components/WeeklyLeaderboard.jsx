import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Trophy, Crown, Medal, Star, Clock, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API } from "@/config";
import { toast } from "sonner";

const RankIcon = ({ rank }) => {
  if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
  if (rank <= 3) return <Trophy className="w-5 h-5 text-amber-400" />;
  if (rank <= 10) return <Star className="w-5 h-5 text-violet-400" />;
  return <span className="text-gray-400 font-bold">#{rank}</span>;
};

const LeaderboardEntry = ({ entry, isCurrentUser }) => {
  return (
    <div 
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isCurrentUser 
          ? "bg-primary/20 border border-primary/50" 
          : entry.rank <= 3 
            ? "bg-yellow-500/10" 
            : "bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="w-8 h-8 flex items-center justify-center">
        <RankIcon rank={entry.rank} />
      </div>
      
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
        {entry.name?.charAt(0) || "?"}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">
            {entry.name || "Anonymous"}
            {isCurrentUser && <span className="text-xs text-primary ml-1">(You)</span>}
          </p>
          {entry.badge_icon && (
            <span className="text-sm">{entry.badge_icon}</span>
          )}
        </div>
        <p className="text-xs text-gray-400">{entry.weekly_episodes} episodes this week</p>
      </div>
      
      {entry.rank <= 3 && (
        <div className={`px-2 py-1 rounded-full text-xs font-bold ${
          entry.rank === 1 
            ? "bg-yellow-500/20 text-yellow-400" 
            : "bg-amber-500/20 text-amber-400"
        }`}>
          {entry.rank === 1 ? "CHAMPION" : `TOP ${entry.rank}`}
        </div>
      )}
    </div>
  );
};

export const WeeklyLeaderboard = ({ token, userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/leaderboard/weekly`, { headers });
      setData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border-indigo-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-indigo-500/20">
            <Trophy className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold">Weekly Watch Race</h3>
            <p className="text-xs text-gray-400">Top watchers this week</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{data.ends_in_days} days left</span>
        </div>
      </div>

      {/* Rewards info */}
      <div className="mb-4 p-3 rounded-lg bg-black/20">
        <p className="text-xs font-medium text-gray-300 mb-2">Weekly Rewards (No coins - Just glory!)</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {data.rewards.map((r) => (
            <div key={r.rank} className="p-2 rounded-lg bg-white/5">
              <p className="text-lg">{r.icon}</p>
              <p className="text-[10px] text-gray-400">{r.rank}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User's position */}
      {token && data.user_rank && (
        <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Your position</p>
              <p className="text-lg font-bold">#{data.user_rank}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Episodes this week</p>
              <p className="text-lg font-bold">{data.user_episodes}</p>
            </div>
          </div>
          {data.user_rank > 10 && (
            <p className="text-xs text-gray-400 mt-2">
              Watch {data.leaderboard[9]?.weekly_episodes - data.user_episodes + 1 || "more"} episodes to reach Top 10!
            </p>
          )}
        </div>
      )}

      {/* Leaderboard list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {data.leaderboard.length > 0 ? (
          data.leaderboard.slice(0, 10).map((entry) => (
            <LeaderboardEntry 
              key={entry.id || entry.rank}
              entry={entry}
              isCurrentUser={userId && entry.id === userId}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet this week</p>
            <p className="text-xs">Start watching to climb the ranks!</p>
          </div>
        )}
      </div>

      {/* CTA */}
      {!token && (
        <p className="text-xs text-center text-gray-400 mt-4">
          Sign in to see your ranking!
        </p>
      )}
    </Card>
  );
};

export default WeeklyLeaderboard;
