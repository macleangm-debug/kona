import React from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";

export const ComingSoonCard = ({ series, isReminded, onRemind, loading }) => {
  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };

  return (
    <div className="cursor-pointer group" data-testid={`coming-soon-${series.id}`}>
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
        <img 
          src={series.thumbnail} 
          alt={series.title}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Release date badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded">
          {series.release_date}
        </div>
        
        {/* Coming Soon badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] rounded">
          Coming Soon
        </div>
        
        {/* Remind Me Button */}
        <div className="absolute bottom-2 left-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemind(series.id);
            }}
            disabled={isReminded || loading}
            className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isReminded 
                ? "bg-green-500/90 text-white" 
                : "bg-white/90 text-black hover:bg-white"
            }`}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isReminded ? (
              <>
                <BellRing className="w-3 h-3" />
                Reminder Set
              </>
            ) : (
              <>
                <Bell className="w-3 h-3" />
                Remind Me
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Title & Info */}
      <h3 className="font-medium text-sm line-clamp-1 mb-0.5">{series.title}</h3>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{series.genre}</span>
        <span>•</span>
        <span>{formatCount(series.reserved_count)} Reserved</span>
      </div>
    </div>
  );
};

export default ComingSoonCard;
