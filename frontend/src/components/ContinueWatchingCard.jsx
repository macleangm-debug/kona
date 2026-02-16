import React from "react";
import { Play } from "lucide-react";

export const ContinueWatchingCard = ({ series, episode, progress, onClick }) => (
  <div
    onClick={onClick}
    className="cursor-pointer group"
    data-testid={`continue-${series.id}`}
  >
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
      <img 
        src={series.thumbnail} 
        alt={series.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-5 h-5 text-black fill-black ml-0.5" />
        </div>
      </div>
      {/* Episode badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-[10px] font-medium">
        EP.{episode}
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
    <h3 className="font-medium text-sm line-clamp-1">{series.title}</h3>
    <p className="text-[11px] text-muted-foreground">{progress}% watched</p>
  </div>
);

export default ContinueWatchingCard;
