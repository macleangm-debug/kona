import React from "react";
import { Coins } from "lucide-react";

export const CoinBalance = ({ coins, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-secondary/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 hover:bg-secondary/80 transition-all"
    data-testid="coin-balance"
  >
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
      <Coins className="w-3 h-3 text-white" />
    </div>
    <span className="font-semibold text-sm">{coins || 0}</span>
  </button>
);

export default CoinBalance;
