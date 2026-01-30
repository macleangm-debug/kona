import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Coins, Sparkles, ArrowRight, X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/config";
import axios from "axios";

export const PurchasePrompt = ({ token, userCoins, onClose }) => {
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState([]);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  const fetchPrompts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/purchase-prompt`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPrompts(res.data.prompts);
      if (res.data.prompts.length > 0) {
        setCurrentPrompt(res.data.prompts[0]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchPrompts();
    }
  }, [token, userCoins, fetchPrompts]);

  const handleDismiss = () => {
    setDismissed(true);
    if (onClose) onClose();
  };

  if (dismissed || !currentPrompt) return null;

  const getIcon = () => {
    switch (currentPrompt.type) {
      case "almost_there":
        return <Sparkles className="w-5 h-5 text-yellow-400" />;
      case "first_purchase":
        return <Gift className="w-5 h-5 text-green-400" />;
      default:
        return <Coins className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getBgClass = () => {
    switch (currentPrompt.type) {
      case "almost_there":
        return "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
      case "first_purchase":
        return "bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30";
      default:
        return "bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-violet-500/30";
    }
  };

  return (
    <div 
      className={`relative p-4 rounded-xl border ${getBgClass()} animate-pulse-slow`}
      data-testid="purchase-prompt"
    >
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-black/30">
          {getIcon()}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1">{currentPrompt.title}</h4>
          <p className="text-xs text-gray-300 mb-3">{currentPrompt.message}</p>
          <Button
            onClick={() => navigate("/store")}
            size="sm"
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
            data-testid="purchase-prompt-cta"
          >
            {currentPrompt.cta}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Floating "Almost There" Banner for episode pages
export const AlmostThereBanner = ({ coinsNeeded, episodeCost }) => {
  const navigate = useNavigate();
  
  if (!coinsNeeded || coinsNeeded <= 0) return null;
  
  return (
    <div 
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-yellow-400/50 animate-bounce-gentle"
      data-testid="almost-there-banner"
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-black/20 flex items-center justify-center">
          <Coins className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-black text-sm">Almost there!</p>
          <p className="text-black/80 text-xs">
            Just <span className="font-bold">{coinsNeeded} coins</span> to unlock
          </p>
        </div>
        <Button
          onClick={() => navigate("/store")}
          size="sm"
          className="bg-black text-white hover:bg-gray-800"
        >
          Get Coins
        </Button>
      </div>
    </div>
  );
};

export default PurchasePrompt;
