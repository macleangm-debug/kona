import React, { useState, useEffect } from "react";
import axios from "axios";
import { Shield, Coins, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/config";
import { toast } from "sonner";

export const StreakShield = ({ token, onUpdate }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/games/streak/shield/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleBuy = async () => {
    setBuying(true);
    try {
      const res = await axios.post(`${API}/games/streak/shield`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchStatus();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to buy shield");
    }
    setBuying(false);
  };

  if (loading || !status) return null;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg ${
      status.has_shield 
        ? "bg-green-500/20 border border-green-500/30" 
        : "bg-white/5 border border-white/10"
    }`}>
      <div className={`p-2 rounded-full ${status.has_shield ? "bg-green-500/20" : "bg-gray-700"}`}>
        <Shield className={`w-4 h-4 ${status.has_shield ? "text-green-400" : "text-gray-400"}`} />
      </div>
      
      <div className="flex-1">
        <p className="text-sm font-medium">Streak Shield</p>
        <p className="text-xs text-gray-400">
          {status.has_shield 
            ? "Protected for 1 missed day" 
            : "Protect your streak"}
        </p>
      </div>

      {status.has_shield ? (
        <div className="flex items-center gap-1 text-green-400 text-xs">
          <Check className="w-3 h-3" />
          <span>Active</span>
        </div>
      ) : (
        <Button
          size="sm"
          onClick={handleBuy}
          disabled={buying || !status.can_afford}
          variant={status.can_afford ? "default" : "outline"}
          className={status.can_afford ? "bg-gradient-to-r from-blue-500 to-purple-500" : ""}
        >
          {buying ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Coins className="w-3 h-3 mr-1" />
              {status.shield_cost}
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default StreakShield;
