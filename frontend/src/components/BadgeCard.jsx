import React from "react";
import { 
  Flame, Star, Crown, Film, Diamond, Target, 
  Moon, Coins, RefreshCw, Sparkles, Lock, Check
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const iconMap = {
  flame: Flame,
  star: Star,
  crown: Crown,
  film: Film,
  diamond: Diamond,
  target: Target,
  moon: Moon,
  coins: Coins,
  refresh: RefreshCw,
  sparkles: Sparkles
};

export const BadgeCard = ({ 
  badge, 
  size = "md", 
  showProgress = true, 
  onClick,
  selected = false 
}) => {
  const Icon = iconMap[badge.icon] || Sparkles;
  const isEarned = badge.earned;
  
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20"
  };
  
  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9"
  };

  return (
    <div 
      onClick={onClick}
      className={`relative flex flex-col items-center p-3 rounded-xl transition-all ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      } ${
        selected ? "ring-2 ring-primary" : ""
      } ${
        isEarned 
          ? "bg-gradient-to-br from-white/10 to-white/5 border border-white/20" 
          : "bg-white/5 border border-white/10 opacity-60"
      }`}
      data-testid={`badge-${badge.id}`}
    >
      {/* Badge Icon */}
      <div 
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center ${
          isEarned 
            ? `bg-gradient-to-br ${badge.color}` 
            : "bg-gray-700"
        } shadow-lg ${isEarned ? `shadow-${badge.color?.split(" ")[0]?.replace("from-", "")}/30` : ""}`}
      >
        {isEarned ? (
          <Icon className={`${iconSizes[size]} text-white`} />
        ) : (
          <Lock className={`${iconSizes[size]} text-gray-500`} />
        )}
      </div>
      
      {/* Badge Name */}
      <p className={`mt-2 font-medium text-center ${size === "sm" ? "text-xs" : "text-sm"} ${
        isEarned ? "text-white" : "text-gray-500"
      }`}>
        {badge.name}
      </p>
      
      {/* Progress Bar (if not earned and showProgress) */}
      {!isEarned && showProgress && badge.progress_percent !== undefined && (
        <div className="w-full mt-2">
          <Progress value={badge.progress_percent} className="h-1" />
          <p className="text-[10px] text-gray-500 text-center mt-1">
            {badge.progress}/{badge.criteria?.target}
          </p>
        </div>
      )}
      
      {/* Earned Checkmark */}
      {isEarned && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      )}
      
      {/* Featured Star */}
      {badge.featured && (
        <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center">
          <Star className="w-3 h-3 text-white fill-white" />
        </div>
      )}
    </div>
  );
};

export const BadgeShowcase = ({ badges, maxDisplay = 3 }) => {
  const featuredBadges = badges.filter(b => b.featured && b.earned).slice(0, maxDisplay);
  
  if (featuredBadges.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {featuredBadges.map((badge) => {
        const Icon = iconMap[badge.icon] || Sparkles;
        return (
          <div 
            key={badge.id}
            className={`w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br ${badge.color} shadow-md`}
            title={badge.name}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
        );
      })}
    </div>
  );
};

export const BadgeToast = ({ badge }) => {
  const Icon = iconMap[badge.icon] || Sparkles;
  
  return (
    <div className="flex items-center gap-3">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br ${badge.color} shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="font-semibold">Badge Earned!</p>
        <p className="text-sm text-gray-400">{badge.name}</p>
        {badge.reward_coins > 0 && (
          <p className="text-xs text-yellow-400">+{badge.reward_coins} coins</p>
        )}
      </div>
    </div>
  );
};

export default BadgeCard;
