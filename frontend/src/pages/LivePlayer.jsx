import React from "react";
import { useNavigate } from "react-router-dom";
import { Radio, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const LivePlayer = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 bg-white/5 border-white/10 text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
          <Radio className="w-10 h-10 text-red-500" />
        </div>
        
        <div className="inline-block px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full mb-4">
          COMING SOON
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-3">Live Streaming</h2>
        <p className="text-gray-400 mb-6">
          Live streaming is coming soon to Kona! Watch your favorite creators in real-time with live chat and tipping.
        </p>
        
        <Button onClick={() => navigate("/")} data-testid="back-home-btn">
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default LivePlayer;
