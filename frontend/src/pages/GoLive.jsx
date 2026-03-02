import React from "react";
import { useNavigate } from "react-router-dom";
import { Radio, ChevronLeft, Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const GoLive = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(-1)} className="p-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Go Live</h1>
        </div>

        {/* Coming Soon Card */}
        <Card className="p-8 bg-gradient-to-br from-red-500/10 via-purple-500/10 to-blue-500/10 border-white/10 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <Radio className="w-10 h-10 text-red-500" />
          </div>
          
          <div className="inline-block px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full mb-4">
            COMING SOON
          </div>
          
          <h2 className="text-2xl font-bold mb-3">Live Streaming</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect with your audience in real-time! Live streaming with chat, tips, and automatic VOD recording is coming to Kona.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-white/5 rounded-lg">
              <Radio className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Go Live Instantly</p>
              <p className="text-xs text-muted-foreground">Stream to your followers</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <Sparkles className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Receive Live Tips</p>
              <p className="text-xs text-muted-foreground">Earn coins during streams</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <Bell className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-sm font-medium">Notify Followers</p>
              <p className="text-xs text-muted-foreground">Auto-alert when you go live</p>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={() => navigate("/creator")}
            data-testid="back-to-portal-btn"
          >
            Back to Creator Portal
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default GoLive;
