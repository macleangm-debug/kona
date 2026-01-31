import React, { useState } from "react";
import { Gift, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const DailyRewardModal = ({ open, onClose, onClaim }) => {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    const success = await onClaim();
    if (success) {
      setClaimed(true);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] bg-card border-white/10" data-testid="daily-reward-modal">
        <DialogHeader>
          <DialogTitle className="sr-only">Daily Reward</DialogTitle>
          <DialogDescription className="sr-only">Claim your free coins</DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.5)]">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-heading text-2xl mb-2">Daily Reward!</h2>
          <p className="text-muted-foreground mb-6">Claim your free 3 coins today</p>
          
          {claimed ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span>Claimed!</span>
            </div>
          ) : (
            <Button 
              onClick={handleClaim}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-full px-8"
              disabled={loading}
              data-testid="claim-reward-btn"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Claim Reward"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyRewardModal;
