import React from "react";
import { Eye, Coins, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

// Tier thresholds
const TIER_THRESHOLDS = {
  new: { min: 0, max: 50000, share: 30 },
  verified: { min: 50001, max: 500000, share: 40 },
  partner: { min: 500001, max: Infinity, share: 50 }
};

export const CreatorStats = ({ dashboard }) => {
  if (!dashboard) return null;

  const currentTier = dashboard.tier || "new";
  const tierInfo = TIER_THRESHOLDS[currentTier];
  const nextTier = currentTier === "new" ? "verified" : currentTier === "verified" ? "partner" : null;
  const nextTierInfo = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  
  const progressToNextTier = nextTierInfo 
    ? Math.min(100, ((dashboard.total_views - tierInfo.min) / (nextTierInfo.min - tierInfo.min)) * 100)
    : 100;

  return (
    <div className="space-y-4">
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border-yellow-500/30">
          <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
          <p className="font-heading text-2xl font-bold flex items-center gap-1">
            <Coins className="w-5 h-5 text-yellow-400" />
            {dashboard.total_earnings?.toLocaleString() || 0}
          </p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
          <p className="text-xs text-muted-foreground mb-1">Total Views</p>
          <p className="font-heading text-2xl font-bold flex items-center gap-1">
            <Eye className="w-5 h-5 text-blue-400" />
            {dashboard.total_views?.toLocaleString() || 0}
          </p>
        </Card>
      </div>

      {/* This Month Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="font-heading text-xl font-bold">{dashboard.this_month_earnings || 0} coins</p>
          <p className="text-xs text-muted-foreground">{dashboard.this_month_views || 0} views</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Pending Payout</p>
          <p className="font-heading text-xl font-bold text-green-400">{dashboard.pending_payout || 0}</p>
          <p className="text-xs text-muted-foreground">coins available</p>
        </Card>
      </div>

      {/* Tier Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">Your Creator Tier</span>
          </div>
          <span className="text-sm px-2 py-1 bg-primary/20 text-primary rounded-full">
            {dashboard.revenue_share * 100}% Revenue Share
          </span>
        </div>
        
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm capitalize font-medium">{currentTier} Creator</span>
            {nextTier && <span className="text-xs text-muted-foreground">→ {nextTier} Creator</span>}
          </div>
          {nextTier && (
            <>
              <Progress value={progressToNextTier} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {(nextTierInfo.min - dashboard.total_views).toLocaleString()} more views to unlock {nextTierInfo.share}% share
              </p>
            </>
          )}
          {!nextTier && (
            <p className="text-xs text-green-400">You've reached the highest tier!</p>
          )}
        </div>

        {/* Tier Breakdown */}
        <div className="flex gap-2 mt-4">
          {Object.entries(TIER_THRESHOLDS).map(([tier, info]) => (
            <div 
              key={tier}
              className={`flex-1 p-2 rounded-lg text-center text-xs ${
                currentTier === tier 
                  ? "bg-primary/20 border border-primary" 
                  : "bg-secondary/50"
              }`}
            >
              <p className="font-bold">{info.share}%</p>
              <p className="text-muted-foreground capitalize">{tier}</p>
              <p className="text-[10px] text-muted-foreground">
                {info.min === 0 ? "0+" : `${(info.min / 1000).toFixed(0)}K+`} views
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default CreatorStats;
