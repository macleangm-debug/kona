import React from "react";
import { useNavigate } from "react-router-dom";
import { X, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const PromoPopup = ({ promo, open, onClose }) => {
  const navigate = useNavigate();

  if (!promo || !open) return null;

  const handleWatch = () => {
    onClose();
    // Navigate to the series or first episode
    navigate(`/series/${promo.series_id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-[340px] bg-transparent border-0 overflow-hidden" data-testid="promo-popup">
        <DialogHeader className="sr-only">
          <DialogTitle>Featured Content</DialogTitle>
          <DialogDescription>Check out this featured series</DialogDescription>
        </DialogHeader>
        <div className="relative">
          {/* Promo Image */}
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={promo.promo_image} 
              alt={promo.subtitle}
              className="w-full h-full object-cover"
            />
            
            {/* Gradient overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
            
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors z-10"
              data-testid="promo-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Badge */}
            {promo.badge_text && (
              <div className="absolute top-3 left-3 px-3 py-1 bg-red-500 rounded-md text-xs font-bold uppercase tracking-wider">
                {promo.badge_text}
              </div>
            )}
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              {/* Title */}
              <div className="mb-2">
                <span className="text-sm font-medium text-primary tracking-widest">{promo.title}</span>
              </div>
              <h2 className="font-heading text-2xl font-bold mb-2 leading-tight">{promo.subtitle}</h2>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {promo.tags?.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              
              {/* Description */}
              {promo.description && (
                <p className="text-sm text-white/80 mb-4 line-clamp-2">{promo.description}</p>
              )}
              
              {/* Watch Button */}
              <Button 
                onClick={handleWatch}
                className="w-full bg-white text-black hover:bg-white/90 rounded-full font-semibold h-12 text-base"
                data-testid="promo-watch-btn"
              >
                <Play className="w-5 h-5 fill-black mr-2" />
                Watch Now
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoPopup;
