import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Users, Copy, Check, Send, Play, Pause, ChevronLeft, 
  Loader2, Share2, X, Crown, MessageCircle, Smile
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥", "💯", "🎉"];

export const WatchPartyPage = () => {
  const { partyCode } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessage, setChatMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const chatRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    
    if (partyCode) {
      joinParty();
    }
    
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [partyCode, token]);

  // Poll for updates
  useEffect(() => {
    if (party && party.status !== "ended") {
      pollRef.current = setInterval(fetchPartyInfo, 3000);
      return () => clearInterval(pollRef.current);
    }
  }, [party?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [party?.chat_messages]);

  const joinParty = async () => {
    try {
      const res = await axios.post(
        `${API}/watch-party/join`,
        { party_code: partyCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParty(res.data);
      toast.success(`Joined ${res.data.host_name}'s watch party!`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to join party");
      navigate("/");
    }
    setLoading(false);
  };

  const fetchPartyInfo = async () => {
    try {
      const res = await axios.get(
        `${API}/watch-party/${partyCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParty(res.data);
    } catch (e) {
      console.error("Failed to fetch party info");
    }
  };

  const copyPartyCode = () => {
    navigator.clipboard.writeText(partyCode);
    setCopied(true);
    toast.success("Party code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareParty = () => {
    const shareUrl = `${window.location.origin}/watch-party/${partyCode}`;
    const shareText = `🎬 Join my Watch Party on Kona!\n\nWatching: ${party?.series_title}\nEpisode: ${party?.episode_number}\n\nCode: ${partyCode}\n\n👉 ${shareUrl}`;
    
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    try {
      await axios.post(
        `${API}/watch-party/${partyCode}/chat?message=${encodeURIComponent(chatMessage)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setChatMessage("");
      fetchPartyInfo();
    } catch (e) {
      toast.error("Failed to send message");
    }
  };

  const sendReaction = async (reaction) => {
    try {
      const res = await axios.post(
        `${API}/watch-party/${partyCode}/reaction?reaction=${encodeURIComponent(reaction)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Show floating reaction
      const id = Date.now();
      setFloatingReactions(prev => [...prev, { id, reaction, user: user.name }]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== id));
      }, 2000);
      
      setShowReactions(false);
    } catch (e) {
      console.error("Failed to send reaction");
    }
  };

  const controlPlayback = async (action, timestamp = 0) => {
    if (party?.host_id !== user?.id) {
      toast.error("Only the host can control playback");
      return;
    }
    
    try {
      await axios.post(
        `${API}/watch-party/${partyCode}/sync?action=${action}&timestamp=${timestamp}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchPartyInfo();
    } catch (e) {
      toast.error("Failed to sync playback");
    }
  };

  const endParty = async () => {
    try {
      await axios.post(
        `${API}/watch-party/${partyCode}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Watch party ended");
      navigate("/");
    } catch (e) {
      toast.error("Failed to end party");
    }
  };

  const isHost = party?.host_id === user?.id;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p>Party not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="watch-party-page">
      {/* Floating Reactions */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map(r => (
          <div
            key={r.id}
            className="absolute animate-float-up text-4xl"
            style={{
              left: `${Math.random() * 80 + 10}%`,
              bottom: "20%"
            }}
          >
            {r.reaction}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold">Watch Party</span>
            <Badge variant="outline" className="ml-2">
              {party.participants?.length || 1} watching
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyPartyCode}
              className="border-white/20"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span className="ml-1 font-mono">{partyCode}</span>
            </Button>
            <Button variant="outline" size="icon" onClick={shareParty} className="border-white/20">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="pt-16 lg:flex lg:h-[calc(100vh-64px)]">
        {/* Video Area */}
        <div className="lg:flex-1 p-4">
          <Card className="bg-black rounded-xl overflow-hidden aspect-video relative">
            {/* Placeholder video area */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
              <div className="text-center">
                <p className="text-2xl font-bold mb-2">{party.series_title}</p>
                <p className="text-muted-foreground">Episode {party.episode_number}: {party.episode_title}</p>
                
                <div className="mt-6 flex items-center justify-center gap-4">
                  {isHost ? (
                    <>
                      <Button
                        size="lg"
                        onClick={() => controlPlayback(party.status === "playing" ? "pause" : "play")}
                        className="rounded-full"
                      >
                        {party.status === "playing" ? (
                          <><Pause className="w-5 h-5 mr-2" /> Pause</>
                        ) : (
                          <><Play className="w-5 h-5 mr-2" /> Play</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <Badge className="bg-primary/20 text-primary">
                      {party.status === "playing" ? "▶️ Playing" : "⏸️ Paused"}
                    </Badge>
                  )}
                </div>
                
                {isHost && (
                  <p className="text-xs text-muted-foreground mt-4">
                    You're the host. Control playback for everyone.
                  </p>
                )}
              </div>
            </div>
            
            {/* Playback status indicator */}
            <div className="absolute top-4 left-4">
              <Badge className={`${party.status === "playing" ? "bg-green-500" : "bg-yellow-500"} text-black`}>
                {party.status === "playing" ? "● LIVE" : "● PAUSED"}
              </Badge>
            </div>
          </Card>

          {/* Reaction Bar */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReactions(!showReactions)}
                className="border-white/20"
              >
                <Smile className="w-4 h-4 mr-2" />
                React
              </Button>
              
              {showReactions && (
                <div className="flex gap-1 animate-in slide-in-from-left">
                  {REACTIONS.map(r => (
                    <button
                      key={r}
                      onClick={() => sendReaction(r)}
                      className="text-2xl hover:scale-125 transition-transform"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {isHost && (
              <Button
                variant="outline"
                size="sm"
                onClick={endParty}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                End Party
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar - Participants & Chat */}
        <div className="lg:w-96 border-l border-white/10 flex flex-col h-[50vh] lg:h-full">
          {/* Participants */}
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Watching ({party.participants?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {party.participants?.map((p, i) => (
                <div 
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    p.is_host ? 'bg-primary/20 border border-primary/30' : 'bg-white/5'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    p.is_host ? 'bg-primary' : 'bg-white/20'
                  }`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{p.name}</span>
                  {p.is_host && <Crown className="w-3 h-3 text-yellow-400" />}
                </div>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat
              </h3>
            </div>
            
            <div 
              ref={chatRef}
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {party.chat_messages?.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">
                  No messages yet. Start chatting!
                </p>
              )}
              {party.chat_messages?.map((msg) => (
                <div 
                  key={msg.id}
                  className={`${msg.user_id === user?.id ? 'text-right' : ''}`}
                >
                  <div className={`inline-block max-w-[80%] ${
                    msg.user_id === user?.id 
                      ? 'bg-primary/20 rounded-l-xl rounded-tr-xl' 
                      : 'bg-white/5 rounded-r-xl rounded-tl-xl'
                  } p-3`}>
                    <p className="text-xs text-muted-foreground mb-1">{msg.user_name}</p>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-white/5 border-white/10"
                />
                <Button type="submit" size="icon">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default WatchPartyPage;
