import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Trophy, Star, Eye, Film, Coins, Flame, Award, Crown,
  TrendingUp, Sparkles, Medal, Gem, Diamond, Rocket, 
  Check, Gift, PartyPopper, ChevronRight
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";
import confetti from "canvas-confetti";

// Icon mapping
const iconMap = {
  eye: Eye,
  star: Star,
  "trending-up": TrendingUp,
  flame: Flame,
  zap: Sparkles,
  crown: Crown,
  trophy: Trophy,
  play: Film,
  film: Film,
  video: Film,
  tv: Film,
  layers: Film,
  award: Award,
  sparkles: Sparkles,
  coins: Coins,
  wallet: Coins,
  banknote: Coins,
  "piggy-bank": Coins,
  gem: Gem,
  diamond: Diamond,
  bookmark: Award,
  library: Award,
  folder: Award,
  folders: Award,
  building: Award,
  castle: Crown,
  fire: Flame,
  "fire-extinguisher": Flame,
  rocket: Rocket,
  medal: Medal
};

// Color mapping
const colorMap = {
  gray: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  green: "bg-green-500/20 text-green-400 border-green-500/30",
  yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  orange: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  gold: "bg-yellow-400/20 text-yellow-300 border-yellow-400/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30"
};

export const CreatorMilestones = ({ token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState(null);
  const [newMilestones, setNewMilestones] = useState([]);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (e) {
      console.error("Error fetching milestones:", e);
    }
    setLoading(false);
  }, [token]);

  const checkNewMilestones = useCallback(async () => {
    try {
      const res = await axios.post(`${API}/creator/milestones/check`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.new_milestones?.length > 0) {
        setNewMilestones(res.data.new_milestones);
        // Trigger celebration for first new milestone
        celebrateMilestone(res.data.new_milestones[0]);
        
        if (res.data.bonus_coins_awarded > 0) {
          toast.success(`🎉 You earned ${res.data.bonus_coins_awarded} bonus coins!`);
        }
        
        // Refresh data
        fetchMilestones();
      }
    } catch (e) {
      console.error("Error checking milestones:", e);
    }
  }, [token, fetchMilestones]);

  useEffect(() => {
    fetchMilestones();
    // Check for new milestones on load
    checkNewMilestones();
  }, [fetchMilestones, checkNewMilestones]);

  const celebrateMilestone = (milestone) => {
    setCelebratingMilestone(milestone);
    setShowCelebration(true);
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const markCelebrated = async (milestoneId) => {
    try {
      await axios.post(`${API}/creator/milestones/${milestoneId}/celebrate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCelebration(false);
      setCelebratingMilestone(null);
      fetchMilestones();
    } catch (e) {
      console.error("Error marking milestone celebrated:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Trophy className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  const MilestoneIcon = ({ icon, color, size = "md" }) => {
    const Icon = iconMap[icon] || Trophy;
    const colorClass = colorMap[color] || colorMap.gray;
    const sizeClass = size === "lg" ? "w-16 h-16" : size === "md" ? "w-10 h-10" : "w-8 h-8";
    const iconSize = size === "lg" ? "w-8 h-8" : size === "md" ? "w-5 h-5" : "w-4 h-4";
    
    return (
      <div className={`${sizeClass} rounded-full ${colorClass} border flex items-center justify-center`}>
        <Icon className={iconSize} />
      </div>
    );
  };

  const ProgressBar = ({ progress }) => (
    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary rounded-full transition-all duration-500"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );

  // Uncelebrated milestones
  const uncelebratedMilestones = data?.milestones?.filter(m => !m.is_celebrated) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Achievements & Milestones
          </h2>
          <p className="text-sm text-muted-foreground">
            Track your creator journey and earn rewards
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={checkNewMilestones}>
          <Check className="w-4 h-4 mr-2" />
          Check Progress
        </Button>
      </div>

      {/* New Milestones Alert */}
      {uncelebratedMilestones.length > 0 && (
        <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/30 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-yellow-400">
                  🎉 New Achievement{uncelebratedMilestones.length > 1 ? 's' : ''} Unlocked!
                </p>
                <p className="text-sm text-muted-foreground">
                  You have {uncelebratedMilestones.length} uncelebrated milestone{uncelebratedMilestones.length > 1 ? 's' : ''}
                </p>
              </div>
              <Button 
                size="sm"
                onClick={() => celebrateMilestone(uncelebratedMilestones[0])}
              >
                Celebrate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.progress && Object.entries(data.progress).map(([type, progress]) => (
          <Card key={type} className="bg-card border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MilestoneIcon 
                    icon={type === "views" ? "eye" : type === "episodes" ? "film" : type === "earnings" ? "coins" : type === "series" ? "bookmark" : "flame"} 
                    color={progress.progress_percent >= 100 ? "gold" : "blue"}
                    size="sm"
                  />
                  <span className="font-medium capitalize">{type}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {progress.current.toLocaleString()} / {progress.next_threshold?.toLocaleString() || "∞"}
                </span>
              </div>
              <ProgressBar progress={progress.progress_percent} />
              <p className="text-xs text-muted-foreground mt-2">
                {progress.next_threshold 
                  ? `Next: ${progress.next_name} (${progress.progress_percent}%)`
                  : progress.next_name
                }
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achieved Milestones */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            Achieved Milestones ({data?.milestones?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.milestones?.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className={`p-3 rounded-lg border ${
                    milestone.is_celebrated 
                      ? "bg-white/5 border-white/10" 
                      : "bg-yellow-500/10 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/20"
                  } transition-colors`}
                  onClick={() => !milestone.is_celebrated && celebrateMilestone(milestone)}
                >
                  <div className="flex flex-col items-center text-center">
                    <MilestoneIcon 
                      icon={milestone.badge_icon} 
                      color={milestone.badge_color}
                      size="md"
                    />
                    <p className="font-medium mt-2 text-sm">{milestone.milestone_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {milestone.milestone_type}: {milestone.milestone_value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(milestone.achieved_at).toLocaleDateString()}
                    </p>
                    {!milestone.is_celebrated && (
                      <span className="text-xs text-yellow-400 mt-1">Click to celebrate!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No milestones achieved yet</p>
              <p className="text-sm">Keep creating content to unlock achievements!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {data?.stats && (
        <Card className="bg-card border-white/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{data.stats.total_views.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.total_episodes}</p>
                <p className="text-xs text-muted-foreground">Episodes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.total_earnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Coins Earned</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.stats.total_series}</p>
                <p className="text-xs text-muted-foreground">Series</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Celebration Dialog */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="max-w-sm bg-card border-white/10 text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-4">
              <MilestoneIcon 
                icon={celebratingMilestone?.badge_icon} 
                color={celebratingMilestone?.badge_color}
                size="lg"
              />
              <span className="text-2xl">🎉 Achievement Unlocked!</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-6">
            <h3 className="text-xl font-bold mb-2">{celebratingMilestone?.milestone_name}</h3>
            <p className="text-muted-foreground capitalize">
              Reached {celebratingMilestone?.milestone_value.toLocaleString()} {celebratingMilestone?.milestone_type}
            </p>
            
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20">
              <Gift className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <p className="text-sm">You've earned this badge and bonus rewards!</p>
            </div>
          </div>

          <Button 
            className="w-full"
            onClick={() => markCelebrated(celebratingMilestone?.id)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Celebrate & Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorMilestones;
