import React, { useState } from "react";
import { Lock, Coins, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const UnlockSheet = ({ open, onClose, episode, onUnlock, userCoins }) => {
  const [loading, setLoading] = useState(false);
  const canAfford = userCoins >= (episode?.coins_required || 0);

  const handleUnlock = async () => {
    setLoading(true);
    await onUnlock(episode.id);
    setLoading(false);
    onClose();
  };

  if (!episode) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="bg-card border-t border-white/10 rounded-t-3xl" data-testid="unlock-sheet">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">Unlock Episode</SheetTitle>
        </SheetHeader>
        <div className="py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
            <span className="text-lg">{episode.title}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1 text-yellow-400">
              <Coins className="w-5 h-5" />
              <span className="font-semibold">{episode.coins_required}</span>
            </div>
            <span className="text-muted-foreground">coins required</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your balance: <span className="text-yellow-400">{userCoins} coins</span>
          </p>
          {canAfford ? (
            <Button 
              onClick={handleUnlock}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-full px-8"
              disabled={loading}
              data-testid="unlock-confirm-btn"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Unlock Now"}
            </Button>
          ) : (
            <p className="text-red-400 text-sm">Not enough coins. Visit the store to get more!</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default UnlockSheet;
