import React from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MilestoneAlert = ({ notification, open, onDismiss }) => {
  const navigate = useNavigate();

  if (!notification || !open) return null;

  const handleAction = () => {
    onDismiss();
    navigate('/profile');
  };

  const isClaimable = notification.notification_type === 'milestone_claimable';
  const bgClass = isClaimable 
    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50' 
    : 'bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/50';

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 animate-slide-down" data-testid="milestone-alert">
      <div className={`max-w-md mx-auto rounded-xl border p-4 shadow-lg backdrop-blur-sm ${bgClass}`}>
        <div className="flex items-start gap-3">
          <span className="text-3xl">{notification.milestone?.icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {isClaimable ? '🎉 Reward Ready!' : '🔥 Almost There!'}
            </p>
            <p className="text-sm text-white/80 mt-0.5">{notification.message}</p>
            {!isClaimable && (
              <p className="text-xs text-primary mt-1">
                +{notification.reward_coins} coins waiting for you!
              </p>
            )}
          </div>
          <button 
            onClick={onDismiss}
            className="p-1 hover:bg-white/10 rounded-full"
            data-testid="milestone-alert-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            className="flex-1 rounded-full text-xs"
          >
            Later
          </Button>
          <Button
            size="sm"
            onClick={handleAction}
            className={`flex-1 rounded-full text-xs ${isClaimable ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : ''}`}
            data-testid="milestone-alert-action"
          >
            {isClaimable ? 'Claim Now!' : 'Invite Friends'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneAlert;
