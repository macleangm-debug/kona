import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Coins, TrendingUp, Users, Heart, Crown, Star,
  Loader2, Calendar, Clock, Trophy, Sparkles, Gift
} from "lucide-react";
import { API } from "@/config";

const TIER_ICONS = {
  small: Heart,
  medium: Sparkles,
  large: Star,
  super: Gift,
  mega: Crown
};

const TIER_COLORS = {
  small: "text-yellow-400",
  medium: "text-pink-400",
  large: "text-blue-400",
  super: "text-purple-400",
  mega: "text-orange-400"
};

export const TipDashboard = ({ token }) => {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/tips/creator/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (e) {
      console.error("Error fetching tip stats:", e);
    }
  }, [token]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Get current user's creator ID from auth
      const authRes = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const creatorId = authRes.data.id;
      
      const res = await axios.get(`${API}/tips/creator/${creatorId}/leaderboard`);
      setLeaderboard(res.data.leaderboard || []);
    } catch (e) {
      console.error("Error fetching leaderboard:", e);
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchLeaderboard()]);
      setLoading(false);
    };
    init();
  }, [fetchStats, fetchLeaderboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Coins className="w-6 h-6 text-yellow-400" />
          Tip Jar Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Track tips from your supporters
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <Coins className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <p className="text-3xl font-bold text-yellow-400">
              {stats?.total_coins_received?.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Total Coins</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <Heart className="w-8 h-8 mx-auto mb-2 text-pink-400" />
            <p className="text-3xl font-bold">{stats?.total_tips_received || 0}</p>
            <p className="text-xs text-muted-foreground">Total Tips</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <p className="text-3xl font-bold">{stats?.coins_this_month || 0}</p>
            <p className="text-xs text-muted-foreground">This Month</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-white/10">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <p className="text-3xl font-bold">{stats?.coins_today || 0}</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Top Supporters
          </TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="w-4 h-4 mr-2" />
            Recent Tips
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Period Stats */}
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Earnings Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm">Today</span>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{stats?.coins_today || 0} coins</p>
                    <p className="text-xs text-muted-foreground">{stats?.tips_today || 0} tips</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm">This Week</span>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{stats?.coins_this_week || 0} coins</p>
                    <p className="text-xs text-muted-foreground">{stats?.tips_this_week || 0} tips</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <span className="text-sm">This Month</span>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{stats?.coins_this_month || 0} coins</p>
                    <p className="text-xs text-muted-foreground">{stats?.tips_this_month || 0} tips</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-600/20">
                  <span className="text-sm font-medium">All Time</span>
                  <div className="text-right">
                    <p className="font-bold text-yellow-400">{stats?.total_coins_received || 0} coins</p>
                    <p className="text-xs text-muted-foreground">{stats?.total_tips_received || 0} tips</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Tipper */}
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                  Top Supporter
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.top_tipper ? (
                  <div className="text-center py-4">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-500/30 to-amber-600/30 flex items-center justify-center">
                      {stats.top_tipper.avatar ? (
                        <img 
                          src={stats.top_tipper.avatar} 
                          alt="" 
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Crown className="w-10 h-10 text-yellow-400" />
                      )}
                    </div>
                    <h3 className="text-lg font-bold">{stats.top_tipper.username}</h3>
                    <p className="text-3xl font-bold text-yellow-400 mt-2">
                      {stats.top_tipper.total_amount?.toLocaleString()} coins
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {stats.top_tipper.tip_count} tips sent
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No tips yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="mt-4">
          <Card className="bg-card border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                Top Supporters Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => (
                    <div 
                      key={entry.user_id}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        i === 0 ? "bg-gradient-to-r from-yellow-500/20 to-amber-600/20" :
                        i === 1 ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20" :
                        i === 2 ? "bg-gradient-to-r from-orange-600/20 to-orange-700/20" :
                        "bg-white/5"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? "bg-yellow-500 text-black" :
                        i === 1 ? "bg-gray-400 text-black" :
                        i === 2 ? "bg-orange-600 text-white" :
                        "bg-white/10"
                      }`}>
                        {entry.rank}
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                        {entry.avatar ? (
                          <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{entry.username}</p>
                        <p className="text-xs text-muted-foreground">{entry.tip_count} tips</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-yellow-400">{entry.total_amount?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">coins</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium mb-2">No Supporters Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Your top supporters will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Tips Tab */}
        <TabsContent value="recent" className="mt-4">
          <Card className="bg-card border-white/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Recent Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recent_tips?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_tips.map((tip) => {
                    const TierIcon = TIER_ICONS[tip.tier] || Heart;
                    return (
                      <div 
                        key={tip.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-white/5"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tip.tier === "mega" ? "bg-orange-500/20" :
                          tip.tier === "super" ? "bg-purple-500/20" :
                          tip.tier === "large" ? "bg-blue-500/20" :
                          tip.tier === "medium" ? "bg-pink-500/20" :
                          "bg-yellow-500/20"
                        }`}>
                          <TierIcon className={`w-5 h-5 ${TIER_COLORS[tip.tier]}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {tip.anonymous ? "Anonymous" : tip.tipper_name}
                          </p>
                          {tip.message && (
                            <p className="text-sm text-muted-foreground truncate">
                              "{tip.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {new Date(tip.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${TIER_COLORS[tip.tier]}`}>
                            +{tip.amount}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {tip.tier}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Coins className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="text-lg font-medium mb-2">No Tips Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Recent tips from your fans will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TipDashboard;
