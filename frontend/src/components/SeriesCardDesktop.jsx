import React from "react";
import { useNavigate } from "react-router-dom";
import { Star, Eye, Bookmark, BookmarkCheck, Play, Crown } from "lucide-react";

export const SeriesCardDesktop = ({ 
  series, 
  onClick, 
  badge, 
  inMyList = false, 
  onAddToList, 
  onRemoveFromList,
  size = "default" // "default", "large", "small"
}) => {
  const navigate = useNavigate();
  
  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views;
  };

  const handleListToggle = (e) => {
    e.stopPropagation();
    if (inMyList) {
      onRemoveFromList?.(series.id);
    } else {
      onAddToList?.(series.id);
    }
  };

  const handlePlay = (e) => {
    e.stopPropagation();
    navigate(`/watch/${series.id}-ep1`);
  };

  // Check if series is exclusive/premium
  const isExclusive = series.is_exclusive || series.custom_episode_price;

  const sizeClasses = {
    small: "w-[140px]",
    default: "w-[180px] lg:w-[200px]",
    large: "w-[220px] lg:w-[260px]"
  };

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer group flex-shrink-0 ${sizeClasses[size]}`}
      data-testid={`series-card-${series.id}`}
    >
      <div className="relative aspect-[2/3] rounded-lg lg:rounded-xl overflow-hidden mb-2 bg-gray-800">
        <img 
          src={series.thumbnail} 
          alt={series.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Gradient overlay - enhanced on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Exclusive Badge - Premium content indicator */}
        {isExclusive && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[10px] lg:text-xs font-bold uppercase shadow-lg">
            <Crown className="w-3 h-3" />
            <span>Exclusive</span>
          </div>
        )}
        
        {/* Badge - Hot/New/Top/Free (only show if not exclusive) */}
        {badge && !isExclusive && (
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] lg:text-xs font-bold uppercase ${
            badge === "hot" ? "bg-red-500" :
            badge === "new" ? "bg-green-500" :
            badge === "top" ? "bg-yellow-500 text-black" :
            badge === "vip" ? "bg-purple-500" :
            badge === "free" ? "bg-gradient-to-r from-green-400 to-emerald-500 text-black" :
            "bg-primary"
          }`}>
            {badge === "free" ? "FREE EP1" : badge}
          </div>
        )}
        
        {/* Episode count */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] lg:text-xs">
          {series.total_episodes} EP
        </div>
        
        {/* Hover overlay with play button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={handlePlay}
            className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transform scale-75 group-hover:scale-100 transition-transform duration-300"
            data-testid={`play-${series.id}`}
          >
            <Play className="w-6 h-6 lg:w-7 lg:h-7 text-black fill-black ml-1" />
          </button>
        </div>
        
        {/* Bottom info - visible on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          {/* Quick actions */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePlay}
                className="p-2 rounded-full bg-white text-black hover:bg-white/90 transition-colors"
              >
                <Play className="w-4 h-4 fill-black" />
              </button>
              {(onAddToList || onRemoveFromList) && (
                <button
                  onClick={handleListToggle}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {inMyList ? (
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span>{series.rating}</span>
            </div>
          </div>
          
          {/* Tags */}
          <div className="flex items-center gap-2 text-[10px] text-gray-300">
            {isExclusive ? (
              <span className="text-amber-400 font-medium">Premium</span>
            ) : (
              <span className="text-green-400 font-medium">Free EP1</span>
            )}
            <span>•</span>
            <span>{series.genre}</span>
          </div>
        </div>
        
        {/* View count - bottom left always visible */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/80 group-hover:opacity-0 transition-opacity">
          <Eye className="w-3 h-3" />
          <span>{formatViews(series.views)}</span>
        </div>
        
        {/* Rating - bottom right always visible */}
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px] group-hover:opacity-0 transition-opacity">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span>{series.rating}</span>
        </div>
      </div>
      
      {/* Title & Info */}
      <h3 className="font-medium text-sm lg:text-base line-clamp-1 mb-0.5 group-hover:text-primary transition-colors">
        {series.title}
      </h3>
      <div className="flex items-center gap-1.5 text-[11px] lg:text-xs text-gray-400">
        <span>{series.genre}</span>
        {isExclusive && (
          <span className="text-amber-400">• Premium</span>
        )}
      </div>
    </div>
  );
};

export default SeriesCardDesktop;
