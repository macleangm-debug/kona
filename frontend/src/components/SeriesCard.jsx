import React from "react";
import { Star, Eye, Bookmark, BookmarkCheck } from "lucide-react";

export const SeriesCard = ({ series, onClick, badge, showViews = true, inMyList = false, onAddToList, onRemoveFromList }) => {
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

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group"
      data-testid={`series-card-${series.id}`}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
        <img 
          src={series.thumbnail} 
          alt={series.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Badge - Hot/New/Top */}
        {badge && (
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            badge === "hot" ? "bg-red-500" :
            badge === "new" ? "bg-green-500" :
            badge === "top" ? "bg-yellow-500 text-black" :
            badge === "vip" ? "bg-purple-500" :
            "bg-primary"
          }`}>
            {badge}
          </div>
        )}
        
        {/* Episode count - top right */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px]">
          {series.total_episodes} EP
        </div>
        
        {/* Add to List Button */}
        {(onAddToList || onRemoveFromList) && (
          <button
            onClick={handleListToggle}
            className="absolute bottom-8 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            data-testid={`add-to-list-${series.id}`}
          >
            {inMyList ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        {/* View count */}
        {showViews && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/90">
            <Eye className="w-3 h-3" />
            <span>{formatViews(series.views)}</span>
          </div>
        )}
        
        {/* Rating */}
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px]">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span>{series.rating}</span>
        </div>
      </div>
      
      {/* Title & Info */}
      <h3 className="font-medium text-sm line-clamp-1 mb-0.5">{series.title}</h3>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground">{series.genre}</span>
        <span className="text-green-400 font-medium">• Free EP1</span>
      </div>
    </div>
  );
};

export default SeriesCard;
