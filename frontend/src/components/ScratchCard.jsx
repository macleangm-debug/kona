import React, { useState, useEffect } from "react";
import axios from "axios";
import { Gift, Sparkles, Loader2, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { API } from "@/config";
import { toast } from "sonner";

export const ScratchCard = ({ token, onUpdate }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scratching, setScratching] = useState(false);
  const [result, setResult] = useState(null);
  const [revealedCells, setRevealedCells] = useState([]);

  useEffect(() => {
    if (token) fetchStatus();
  }, [token]);

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/games/scratch-card/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleScratch = async () => {
    setScratching(true);
    try {
      const res = await axios.post(`${API}/games/scratch-card/scratch`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(res.data);
      
      // Reveal cells one by one for effect
      const grid = res.data.grid;
      for (let i = 0; i < 9; i++) {
        setTimeout(() => {
          setRevealedCells(prev => [...prev, i]);
        }, i * 150);
      }
      
      // Show result after all cells revealed
      setTimeout(() => {
        if (res.data.is_jackpot) {
          toast.success(`🎰 JACKPOT! You won ${res.data.prize} coins!`);
        } else {
          toast.success(`You won ${res.data.prize} coins!`);
        }
        if (onUpdate) onUpdate();
        fetchStatus();
      }, 1500);
      
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to scratch");
      setScratching(false);
    }
  };

  const resetCard = () => {
    setResult(null);
    setRevealedCells([]);
    setScratching(false);
  };

  if (loading) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-full bg-yellow-500/20">
          <Gift className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <h3 className="font-bold">Daily Scratch Card</h3>
          <p className="text-xs text-gray-400">Watch 1 episode to unlock</p>
        </div>
      </div>

      {/* Scratch Card Grid */}
      <div className="relative">
        {!status?.can_scratch && !result && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
            <div className="text-center p-4">
              <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">
                {status?.already_scratched 
                  ? "Come back tomorrow!" 
                  : "Watch an episode to unlock"}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          {(result?.grid || Array(9).fill(null)).map((cell, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center text-2xl transition-all duration-300 ${
                revealedCells.includes(i)
                  ? result?.winning_indices?.includes(i)
                    ? "bg-yellow-500/30 border-2 border-yellow-400 scale-105"
                    : "bg-white/10 border border-white/20"
                  : "bg-gradient-to-br from-purple-600 to-violet-700 cursor-pointer hover:scale-105"
              }`}
            >
              {revealedCells.includes(i) && cell ? (
                <span className="animate-bounce-in">{cell.icon}</span>
              ) : (
                <Sparkles className="w-6 h-6 text-white/50" />
              )}
            </div>
          ))}
        </div>

        {/* Result */}
        {result && revealedCells.length === 9 && (
          <div className={`text-center p-3 rounded-lg mb-3 ${
            result.is_jackpot 
              ? "bg-yellow-500/30 border border-yellow-400" 
              : "bg-green-500/20 border border-green-500/30"
          }`}>
            <p className="font-bold text-lg">
              {result.is_jackpot ? "🎰 JACKPOT!" : "You Won!"}
            </p>
            <p className={`text-2xl font-bold ${result.is_jackpot ? "text-yellow-400" : "text-green-400"}`}>
              +{result.prize} Coins
            </p>
          </div>
        )}

        {/* Action Button */}
        {result ? (
          <Button onClick={resetCard} variant="outline" className="w-full">
            Done
          </Button>
        ) : (
          <Button 
            onClick={handleScratch} 
            disabled={!status?.can_scratch || scratching}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold"
          >
            {scratching ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Gift className="w-4 h-4 mr-2" />
            )}
            {scratching ? "Scratching..." : "Scratch Now!"}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ScratchCard;
