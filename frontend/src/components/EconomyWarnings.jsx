import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Clock, TrendingDown, Coins, ShoppingCart, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API } from "@/config";

export const EconomyWarnings = ({ token, onPurchaseClick }) => {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState([]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/economy/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const dismissWarning = (type) => {
    setDismissed([...dismissed, type]);
  };

  if (!status) return null;

  const activeWarnings = (status.warnings || []).filter(
    w => !dismissed.includes(w.type)
  );

  // Add freeloader warning if applicable
  if (status.is_freeloader && status.reward_multiplier < 1 && !dismissed.includes("freeloader")) {
    activeWarnings.unshift({
      type: "freeloader",
      message: `Your rewards are at ${Math.round(status.reward_multiplier * 100)}% because you haven't made a purchase.`,
      severity: "warning"
    });
  }

  // Add premium games lock warning
  if (!status.can_access_premium_games && !dismissed.includes("premium_locked")) {
    activeWarnings.push({
      type: "premium_locked",
      message: "Unlock Scratch Card & Trivia games with your first purchase!",
      severity: "info"
    });
  }

  if (activeWarnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {activeWarnings.map((warning, index) => (
        <Card
          key={warning.type}
          className={`p-3 relative ${
            warning.severity === "warning"
              ? "bg-yellow-500/10 border-yellow-500/30"
              : warning.severity === "error"
              ? "bg-red-500/10 border-red-500/30"
              : "bg-blue-500/10 border-blue-500/30"
          }`}
        >
          <button
            onClick={() => dismissWarning(warning.type)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-3 h-3 text-gray-400" />
          </button>
          
          <div className="flex items-start gap-3 pr-6">
            <div className={`p-1.5 rounded-full ${
              warning.severity === "warning"
                ? "bg-yellow-500/20"
                : warning.severity === "error"
                ? "bg-red-500/20"
                : "bg-blue-500/20"
            }`}>
              {warning.type === "diminishing_returns" || warning.type === "freeloader" ? (
                <TrendingDown className={`w-4 h-4 ${
                  warning.severity === "warning" ? "text-yellow-400" : "text-red-400"
                }`} />
              ) : warning.type === "expiring_coins" ? (
                <Clock className="w-4 h-4 text-yellow-400" />
              ) : warning.type === "daily_cap" ? (
                <Coins className="w-4 h-4 text-blue-400" />
              ) : (
                <AlertTriangle className={`w-4 h-4 ${
                  warning.severity === "warning" ? "text-yellow-400" : "text-blue-400"
                }`} />
              )}
            </div>
            
            <div className="flex-1">
              <p className="text-sm">{warning.message}</p>
            </div>
            
            {onPurchaseClick && (
              <Button
                size="sm"
                onClick={onPurchaseClick}
                className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black text-xs"
              >
                <ShoppingCart className="w-3 h-3 mr-1" />
                Buy Coins
              </Button>
            )}
          </div>
        </Card>
      ))}
      
      {/* Daily coins remaining indicator */}
      {status.daily_free_coins_remaining < status.daily_free_coin_cap && (
        <div className="flex items-center justify-between text-xs text-gray-400 px-2">
          <span>Daily free coins:</span>
          <span className={status.daily_free_coins_remaining <= 3 ? "text-yellow-400" : ""}>
            {status.daily_free_coins_remaining}/{status.daily_free_coin_cap} remaining
          </span>
        </div>
      )}
    </div>
  );
};

export default EconomyWarnings;
