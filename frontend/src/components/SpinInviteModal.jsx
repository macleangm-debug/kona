import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, X, Sparkles, Coins, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const SpinInviteModal = ({ open, onOpenChange, spinsRemaining = 3, onSpinNow }) => {
  const navigate = useNavigate();
  
  const handleSpinNow = () => {
    onOpenChange(false);
    if (onSpinNow) {
      onSpinNow();
    } else {
      navigate("/rewards");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-gray-900 via-purple-900/50 to-gray-900 border-purple-500/30 max-w-sm p-0 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative p-6">
          {/* Close button */}
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
          
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl shadow-yellow-500/30 animate-bounce">
                <Gift className="w-10 h-10 text-white" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
          </div>
          
          {/* Title */}
          <DialogHeader className="text-center">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Free Coins Await!
            </DialogTitle>
          </DialogHeader>
          
          {/* Description */}
          <p className="text-center text-gray-300 mt-2 mb-4">
            Spin the lucky wheel and win up to <span className="text-yellow-400 font-bold">25 coins</span> instantly!
          </p>
          
          {/* Spins Available */}
          <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">Daily Spins</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-3 h-3 rounded-full ${
                      i < spinsRemaining 
                        ? 'bg-yellow-400 shadow shadow-yellow-400/50' 
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-yellow-400">
                  {spinsRemaining}/3
                </span>
              </div>
            </div>
          </div>
          
          {/* Prize Preview */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[1, 3, 10, 25].map((prize) => (
              <div 
                key={prize} 
                className="bg-white/5 rounded-lg p-2 text-center border border-white/10"
              >
                <Coins className="w-4 h-4 mx-auto text-yellow-400 mb-1" />
                <span className="text-xs font-medium">{prize}</span>
              </div>
            ))}
          </div>
          
          {/* CTA Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={handleSpinNow}
              disabled={spinsRemaining <= 0}
              className="w-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-bold py-6 text-lg shadow-lg shadow-yellow-500/30"
            >
              {spinsRemaining > 0 ? (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Spin Now - It's Free!
                </>
              ) : (
                "Come Back Tomorrow"
              )}
            </Button>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-full text-sm text-gray-500 hover:text-gray-400 py-2"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SpinInviteModal;
