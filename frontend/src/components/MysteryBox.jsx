import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Gift, Sparkles, Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { API } from "@/config";
import { toast } from "sonner";

export const MysteryBox = ({ token, onUpdate }) => {
  const [boxData, setBoxData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/mystery-box/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBoxData(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token, fetchStatus]);

  const openBox = async () => {
    setOpening(true);
    try {
      const res = await axios.post(`${API}/mystery-box/open`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Show animation delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setReward(res.data.reward);
      setShowReward(true);
      fetchStatus();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to open box");
    }
    setOpening(false);
  };

  if (loading || !boxData) return null;

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 overflow-hidden relative">
        {/* Sparkle effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-2 left-4 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          <div className="absolute top-6 right-8 w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse delay-100" />
          <div className="absolute bottom-4 left-8 w-1 h-1 bg-purple-400 rounded-full animate-pulse delay-200" />
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-full ${boxData.has_pending_box ? 'bg-gradient-to-br from-yellow-400 to-orange-500 animate-bounce' : 'bg-purple-500/20'}`}>
            <Gift className={`w-6 h-6 ${boxData.has_pending_box ? 'text-white' : 'text-purple-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold">Mystery Box</h3>
            <p className="text-xs text-gray-400">Watch {boxData.trigger_every} episodes to unlock</p>
          </div>
          {boxData.has_pending_box && (
            <div className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold animate-pulse">
              READY!
            </div>
          )}
        </div>

        {/* Progress or Open Button */}
        {boxData.has_pending_box ? (
          <Button
            onClick={openBox}
            disabled={opening}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
          >
            {opening ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opening...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Open Mystery Box!
              </>
            )}
          </Button>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400">Progress to next box</span>
              <span className="text-purple-400">{boxData.episodes_to_next} episodes to go</span>
            </div>
            <Progress value={boxData.progress_to_next} className="h-2 bg-gray-700" />
          </div>
        )}

        {/* Stats */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>📦 {boxData.boxes_opened} boxes opened</span>
          <span>🎬 {boxData.episodes_watched} episodes watched</span>
        </div>
      </Card>

      {/* Reward Modal */}
      <Dialog open={showReward} onOpenChange={setShowReward}>
        <DialogContent className="bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500/50 text-center max-w-sm">
          <div className="py-6">
            <div className="text-6xl mb-4 animate-bounce">{reward?.icon}</div>
            <h3 className="text-xl font-bold mb-2">You Won!</h3>
            <p className="text-2xl font-bold text-yellow-400 mb-4">{reward?.label}</p>
            <p className="text-sm text-gray-300 mb-6">
              {reward?.type === "coins" && `+${reward?.value} coins added to your balance!`}
              {reward?.type === "badge" && "New badge added to your collection!"}
              {reward?.type === "frame" && "New profile frame unlocked!"}
              {reward?.type === "xp" && `+${reward?.value} XP earned!`}
            </p>
            <Button
              onClick={() => setShowReward(false)}
              className="bg-white text-black hover:bg-gray-200"
            >
              Awesome!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MysteryBox;
