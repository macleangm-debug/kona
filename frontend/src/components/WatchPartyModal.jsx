import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Users, Play, Loader2, Copy, Check, Share2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const WatchPartyModal = ({ 
  open, 
  onOpenChange, 
  seriesId, 
  episodeId, 
  seriesTitle,
  episodeNumber 
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [mode, setMode] = useState("choose"); // choose, create, join
  const [loading, setLoading] = useState(false);
  const [partyCode, setPartyCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);

  const createParty = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/watch-party/create`,
        { series_id: seriesId, episode_id: episodeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPartyCode(res.data.party_code);
      setMode("created");
      toast.success("Watch party created!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create party");
    }
    setLoading(false);
  };

  const joinParty = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a party code");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${API}/watch-party/join`,
        { party_code: joinCode.toUpperCase() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate(`/watch-party/${joinCode.toUpperCase()}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to join party");
    }
    setLoading(false);
  };

  const startWatching = () => {
    navigate(`/watch-party/${partyCode}`);
    onOpenChange(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(partyCode);
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareParty = () => {
    const shareUrl = `${window.location.origin}/watch-party/${partyCode}`;
    const shareText = `🎬 Join my Watch Party on Kona!\n\nWatching: ${seriesTitle}\nEpisode: ${episodeNumber}\n\nCode: ${partyCode}\n\n👉 ${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Join my Watch Party!",
        text: shareText,
        url: shareUrl
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Share link copied!");
    }
  };

  const resetModal = () => {
    setMode("choose");
    setPartyCode("");
    setJoinCode("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetModal();
    }}>
      <DialogContent className="bg-gray-900 border-white/10 max-w-md" data-testid="watch-party-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Watch Party
          </DialogTitle>
          <DialogDescription>
            Watch together with friends in real-time
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" && (
          <div className="space-y-4 pt-4">
            <Button
              onClick={() => setMode("create")}
              className="w-full h-16 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Play className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Start a Party</p>
                  <p className="text-xs opacity-80">Create a room and invite friends</p>
                </div>
              </div>
            </Button>
            
            <Button
              onClick={() => setMode("join")}
              variant="outline"
              className="w-full h-16 border-white/20 hover:bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Join a Party</p>
                  <p className="text-xs text-muted-foreground">Enter a party code</p>
                </div>
              </div>
            </Button>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-4 pt-4">
            <div className="p-4 rounded-xl bg-white/5 text-center">
              <p className="text-sm text-muted-foreground mb-2">Creating party for:</p>
              <p className="font-semibold">{seriesTitle}</p>
              <p className="text-sm text-muted-foreground">Episode {episodeNumber}</p>
            </div>
            
            <Button
              onClick={createParty}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Create Watch Party
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setMode("choose")}
              className="w-full"
            >
              Back
            </Button>
          </div>
        )}

        {mode === "created" && (
          <div className="space-y-4 pt-4">
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/30 text-center">
              <p className="text-sm text-muted-foreground mb-2">Your Party Code</p>
              <p className="text-4xl font-mono font-bold tracking-widest text-primary mb-4">
                {partyCode}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCode}
                  className="border-white/20"
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={shareParty}
                  className="border-white/20"
                >
                  <Share2 className="w-4 h-4 mr-1" />
                  Share
                </Button>
              </div>
            </div>
            
            <p className="text-sm text-center text-muted-foreground">
              Share this code with friends so they can join your party!
            </p>
            
            <Button
              onClick={startWatching}
              className="w-full bg-gradient-to-r from-primary to-purple-600"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Watching
            </Button>
          </div>
        )}

        {mode === "join" && (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Enter Party Code</label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="text-center text-2xl font-mono tracking-widest bg-white/5 border-white/10 h-14"
                maxLength={6}
              />
            </div>
            
            <Button
              onClick={joinParty}
              disabled={loading || joinCode.length < 6}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Join Party
            </Button>
            
            <Button
              variant="ghost"
              onClick={() => setMode("choose")}
              className="w-full"
            >
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WatchPartyModal;
