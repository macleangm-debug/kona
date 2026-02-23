import React, { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Coins, Heart, Sparkles, Star, Zap, Crown,
  Send, Loader2, MessageSquare, Eye, EyeOff
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const TIER_CONFIG = {
  small: { 
    icon: Heart, 
    color: "from-yellow-500 to-amber-600", 
    label: "Small", 
    description: "Show appreciation"
  },
  medium: { 
    icon: Sparkles, 
    color: "from-pink-500 to-rose-600", 
    label: "Medium", 
    description: "Make them smile"
  },
  large: { 
    icon: Star, 
    color: "from-blue-500 to-cyan-600", 
    label: "Large", 
    description: "Stand out"
  },
  super: { 
    icon: Zap, 
    color: "from-purple-500 to-violet-600", 
    label: "Super", 
    description: "Super supporter"
  },
  mega: { 
    icon: Crown, 
    color: "from-orange-500 to-red-600", 
    label: "MEGA", 
    description: "Ultimate fan!"
  }
};

export const TipJarButton = ({ 
  creatorId, 
  creatorName,
  seriesId,
  episodeId,
  token,
  userBalance = 0,
  onTipSent,
  compact = false
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState(userBalance);

  useEffect(() => {
    setBalance(userBalance);
  }, [userBalance]);

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const res = await axios.get(`${API}/tips/tiers`);
        setTiers(res.data.tiers || []);
      } catch (e) {
        console.error("Error fetching tiers:", e);
      }
    };
    fetchTiers();
  }, []);

  const handleSendTip = async () => {
    if (!selectedTier || !token) return;
    
    const tierAmount = tiers.find(t => t.tier === selectedTier)?.amount || 0;
    if (balance < tierAmount) {
      toast.error("Insufficient coins!");
      return;
    }
    
    setSending(true);
    try {
      const res = await axios.post(`${API}/tips/send`, {
        creator_id: creatorId,
        series_id: seriesId,
        episode_id: episodeId,
        tier: selectedTier,
        message: message || null,
        anonymous
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(res.data.message);
      setBalance(res.data.new_balance);
      setShowDialog(false);
      setSelectedTier(null);
      setMessage("");
      setAnonymous(false);
      
      if (onTipSent) {
        onTipSent(res.data.tip);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send tip");
    }
    setSending(false);
  };

  const selectedTierData = tiers.find(t => t.tier === selectedTier);

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className={`${compact ? "h-8 px-3" : ""} bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700`}
        disabled={!token}
        data-testid="tip-jar-btn"
      >
        <Coins className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"} mr-1.5`} />
        {compact ? "Tip" : "Send Tip"}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              Tip {creatorName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Balance */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <span className="text-sm text-muted-foreground">Your Balance</span>
              <span className="flex items-center gap-1 font-bold text-yellow-400">
                <Coins className="w-4 h-4" />
                {balance.toLocaleString()}
              </span>
            </div>

            {/* Tier Selection */}
            <div className="grid grid-cols-5 gap-2">
              {tiers.map((tier) => {
                const config = TIER_CONFIG[tier.tier] || TIER_CONFIG.small;
                const Icon = config.icon;
                const canAfford = balance >= tier.amount;
                
                return (
                  <button
                    key={tier.tier}
                    onClick={() => canAfford && setSelectedTier(tier.tier)}
                    disabled={!canAfford}
                    className={`relative p-3 rounded-xl border-2 transition-all ${
                      selectedTier === tier.tier
                        ? `border-white bg-gradient-to-br ${config.color}`
                        : canAfford
                        ? "border-white/10 hover:border-white/30 bg-white/5"
                        : "border-white/5 bg-white/5 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-1 ${
                      selectedTier === tier.tier ? "text-white" : "text-muted-foreground"
                    }`} />
                    <p className={`text-xs font-bold ${
                      selectedTier === tier.tier ? "text-white" : ""
                    }`}>
                      {tier.amount}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Selected Tier Info */}
            {selectedTierData && (
              <div className={`p-4 rounded-xl bg-gradient-to-br ${TIER_CONFIG[selectedTier]?.color} text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{TIER_CONFIG[selectedTier]?.label} Tip</p>
                    <p className="text-sm opacity-90">
                      {TIER_CONFIG[selectedTier]?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{selectedTierData.amount}</p>
                    <p className="text-xs opacity-90">coins</p>
                  </div>
                </div>
                <p className="text-xs mt-2 opacity-75">
                  Effect: {selectedTierData.effect?.animation} animation
                </p>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Message (optional)
              </label>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice..."
                maxLength={200}
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-white/10"
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/200</p>
            </div>

            {/* Anonymous */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-2">
                {anonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span className="text-sm">Send anonymously</span>
              </div>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-4 h-4"
              />
            </div>

            {/* Send Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleSendTip}
              disabled={!selectedTier || sending}
            >
              {sending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {sending ? "Sending..." : `Send ${selectedTierData?.amount || 0} Coins`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TipJarButton;
