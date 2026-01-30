import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { 
  Trophy, Medal, Crown, Star, Users, ChevronLeft, 
  Loader2, Gift, Sparkles, Award, TrendingUp
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { KonaLoader } from "@/components/SplashScreen";

const RankBadge = ({ rank }) => {
  if (rank === 1) return <Crown className="w-6 h-6 text-yellow-400" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-300" />;
  if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
  return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-400">#{rank}</span>;
};

const LeaderboardRow = ({ user, rank, isCurrentUser }) => {
  const getBgClass = () => {
    if (isCurrentUser) return "bg-primary/20 border-primary/50";
    if (rank === 1) return "bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-500/30";
    if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-gray-300/10 border-gray-400/30";
    if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-orange-500/10 border-amber-600/30";
    return "bg-white/5 border-white/10";
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${getBgClass()} transition-all`}>
      <RankBadge rank={rank} />
      
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
        rank === 1 ? "bg-gradient-to-br from-yellow-400 to-amber-500" :
        rank === 2 ? "bg-gradient-to-br from-gray-300 to-gray-400" :
        rank === 3 ? "bg-gradient-to-br from-amber-500 to-orange-600" :
        "bg-gradient-to-br from-primary to-purple-600"
      }`}>
        {user.name?.charAt(0).toUpperCase() || "?"}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isCurrentUser ? "text-primary" : ""}`}>
          {user.name}
          {isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          <span>{user.referrals} referrals</span>
        </div>
      </div>
      
      {user.badge && (
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          user.badge === "gold" ? "bg-yellow-500/20 text-yellow-400" :
          user.badge === "silver" ? "bg-gray-400/20 text-gray-300" :
          user.badge === "bronze" ? "bg-amber-600/20 text-amber-500" :
          "bg-primary/20 text-primary"
        }`}>
          {user.badge === "gold" ? "🥇" : user.badge === "silver" ? "🥈" : user.badge === "bronze" ? "🥉" : "⭐"}
        </div>
      )}
    </div>
  );
};

const PrizeCard = ({ rank, prize, icon: Icon, color }) => (
  <div className={`p-4 rounded-xl border ${color} text-center`}>
    <Icon className="w-8 h-8 mx-auto mb-2" />
    <p className="text-sm font-medium mb-1">{rank}</p>
    <p className="text-xs text-gray-400">{prize}</p>
  </div>
);

export const LeaderboardPage = ({ onAuthClick }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("weekly");
  const [userRank, setUserRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, token]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/referral/leaderboard?period=${period}`);
      const data = res.data;
      
      // Add badges based on rank
      const withBadges = data.map((u, i) => ({
        ...u,
        badge: i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : i < 10 ? "star" : null
      }));
      
      setLeaderboard(withBadges);
      
      // Find current user's rank if logged in
      if (user && token) {
        const userIndex = data.findIndex(u => u.user_id === user.id);
        setUserRank(userIndex >= 0 ? userIndex + 1 : null);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-8 pt-20 lg:pt-24" data-testid="leaderboard-page">
      {/* Header */}
      <div className="px-4 lg:px-12 mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 lg:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
          {t("common.back")}
        </button>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold">{t("leaderboard.title")}</h1>
            <p className="text-sm text-gray-400">{t("leaderboard.subtitle")}</p>
          </div>
        </div>
        
        {/* User's Rank Card */}
        {user && (
          <Card className="p-4 bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t("leaderboard.yourRank")}</p>
                <p className="text-2xl font-bold">
                  {userRank ? `#${userRank}` : t("leaderboard.notRanked")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">{t("leaderboard.referrals")}</p>
                <p className="text-xl font-bold flex items-center gap-1 justify-end">
                  <Users className="w-4 h-4" />
                  {user.referral_count || 0}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Prize Cards */}
      <div className="px-4 lg:px-12 mb-6">
        <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-5 h-5 text-yellow-400" />
          {t("leaderboard.prizes")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <PrizeCard 
            rank="🥇 #1" 
            prize={`${t("leaderboard.goldBadge")} + 3-day ${t("leaderboard.vipTrial")}`}
            icon={Crown}
            color="bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/30 text-yellow-400"
          />
          <PrizeCard 
            rank="🥈 #2" 
            prize={`${t("leaderboard.silverBadge")} + 1-day ${t("leaderboard.vipTrial")}`}
            icon={Medal}
            color="bg-gradient-to-br from-gray-400/20 to-gray-300/10 border-gray-400/30 text-gray-300"
          />
          <PrizeCard 
            rank="🥉 #3" 
            prize={`${t("leaderboard.bronzeBadge")} + ${t("leaderboard.earlyAccess")}`}
            icon={Award}
            color="bg-gradient-to-br from-amber-600/20 to-orange-500/10 border-amber-600/30 text-amber-500"
          />
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          Top 10: {t("leaderboard.risingStar")} badge
        </p>
      </div>

      {/* Period Tabs */}
      <div className="px-4 lg:px-12 mb-4">
        <Tabs value={period} onValueChange={setPeriod} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-primary">
              {t("leaderboard.weekly")}
            </TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-primary">
              {t("leaderboard.monthly")}
            </TabsTrigger>
            <TabsTrigger value="all-time" className="data-[state=active]:bg-primary">
              {t("leaderboard.allTime")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Leaderboard List */}
      <div className="px-4 lg:px-12">
        <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          {t("leaderboard.topReferrers")}
        </h2>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <KonaLoader size={60} />
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="p-8 text-center bg-white/5 border-white/10">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">No referrals yet this {period.replace("-", " ")}</p>
            <p className="text-sm text-gray-500 mt-1">Be the first to invite friends!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((u, index) => (
              <LeaderboardRow 
                key={u.user_id || index}
                user={u}
                rank={index + 1}
                isCurrentUser={user?.id === u.user_id}
              />
            ))}
          </div>
        )}
      </div>

      {/* CTA for non-logged in users */}
      {!user && (
        <div className="px-4 lg:px-12 mt-8">
          <Card className="p-6 bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30 text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3 text-yellow-400" />
            <h3 className="font-semibold mb-2">Join the Competition!</h3>
            <p className="text-sm text-gray-400 mb-4">Sign in to start inviting friends and climb the leaderboard</p>
            <Button onClick={onAuthClick} className="rounded-full">
              {t("auth.signIn")}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
