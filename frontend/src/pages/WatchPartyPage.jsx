import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Users, Copy, Check, Send, Play, Pause, ChevronLeft, 
  Loader2, Share2, X, Crown, MessageCircle, Smile, Volume2, VolumeX,
  Maximize, SkipForward, SkipBack
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/SplashScreen";
import { API } from "@/config";
import { toast } from "sonner";

const REACTIONS = ["❤️", "😂", "😮", "😢", "👏", "🔥", "💯", "🎉"];
const SYNC_INTERVAL = 2000; // Sync every 2 seconds
const SYNC_THRESHOLD = 2; // Max seconds difference before forcing sync

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
  const videoRef = useRef(null);
  
  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    
    if (partyCode) {
      joinParty();
    }
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [partyCode, token]);

  // Poll for sync updates
  useEffect(() => {
    if (party && party.status !== "ended") {
      pollRef.current = setInterval(syncWithParty, SYNC_INTERVAL);
      return () => clearInterval(pollRef.current);
    }
  }, [party?.id]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [party?.chat_messages]);

  // Sync video playback with party state
  const syncWithParty = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API}/watch-party/${partyCode}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const partyData = res.data;
      setParty(partyData);
      
      // Only sync if not the host (host controls playback)
      if (partyData.host_id !== user?.id && videoRef.current) {
        const video = videoRef.current;
        const serverTime = partyData.current_time || 0;
        const localTime = video.currentTime;
        const timeDiff = Math.abs(localTime - serverTime);
        
        // Sync playback state
        if (partyData.status === "playing" && video.paused) {
          video.play().catch(console.error);
          setIsPlaying(true);
        } else if (partyData.status === "paused" && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        
        // Sync time if too far off
        if (timeDiff > SYNC_THRESHOLD) {
          video.currentTime = serverTime;
          setCurrentTime(serverTime);
        }
      }
    } catch (e) {
      console.error("Sync failed:", e);
    }
  }, [partyCode, token, user?.id]);

  const joinParty = async () => {
    try {
      const res = await axios.post(
        `${API}/watch-party/join`,
        { party_code: partyCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setParty(res.data);
      
      // Fetch episode video URL
      const episodeRes = await axios.get(
        `${API}/episodes/${res.data.episode_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVideoUrl(episodeRes.data.video_url || "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      
      toast.success(`Joined ${res.data.host_name}'s watch party!`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to join party");
      navigate("/");
    }
    setLoading(false);
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
      navigator.share({ title: "Join my Watch Party!", text: shareText, url: shareUrl });
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
      syncWithParty();
    } catch (e) {
      toast.error("Failed to send message");
    }
  };

  const sendReaction = async (reaction) => {
    try {
      await axios.post(
        `${API}/watch-party/${partyCode}/reaction?reaction=${encodeURIComponent(reaction)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const id = Date.now();
      setFloatingReactions(prev => [...prev, { id, reaction, user: user.name }]);
      setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2000);
      setShowReactions(false);
    } catch (e) {
      console.error("Failed to send reaction");
    }
  };

  // Host-only: Control playback and sync to all participants
  const controlPlayback = async (action, timestamp = null) => {
    if (party?.host_id !== user?.id) {
      toast.error("Only the host can control playback");
      return;
    }
    
    const video = videoRef.current;
    const time = timestamp !== null ? timestamp : (video?.currentTime || 0);
    
    try {
      await axios.post(
        `${API}/watch-party/${partyCode}/sync?action=${action}&timestamp=${time}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (action === "play" && video) {
        video.play().catch(console.error);
        setIsPlaying(true);
      } else if (action === "pause" && video) {
        video.pause();
        setIsPlaying(false);
      } else if (action === "seek" && video) {
        video.currentTime = time;
        setCurrentTime(time);
      }
      
      syncWithParty();
    } catch (e) {
      toast.error("Failed to sync playback");
    }
  };

  const handleVideoPlay = () => {
    if (isHost) {
      controlPlayback("play");
    }
  };

  const handleVideoPause = () => {
    if (isHost) {
      controlPlayback("pause");
    }
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      
      // Host broadcasts time periodically
      if (isHost && Math.abs(video.currentTime - lastSyncTime) > 5) {
        setLastSyncTime(video.currentTime);
        controlPlayback(isPlaying ? "play" : "pause", video.currentTime);
      }
    }
  };

  const handleSeek = (newTime) => {
    if (isHost && videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      controlPlayback("seek", newTime);
    }
  };

  const toggleFullscreen = () => {
    const videoContainer = document.querySelector('[data-video-container]');
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (videoContainer) {
      videoContainer.requestFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const endParty = async () => {
    try {
      await axios.post(`${API}/watch-party/${partyCode}/end`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Watch party ended");
      navigate("/");
    } catch (e) {
      toast.error("Failed to end party");
    }
  };

  const isHost = party?.host_id === user?.id;

  if (loading) {
    return <PageLoader message="Joining watch party..." />;
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
            style={{ left: `${Math.random() * 80 + 10}%`, bottom: "20%" }}
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
            <Badge variant="outline" className="ml-2">{party.participants?.length || 1} watching</Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyPartyCode} className="border-white/20">
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
          <Card 
            className="bg-black rounded-xl overflow-hidden aspect-video relative group"
            data-video-container
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* Actual Video Player */}
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
              onClick={() => isHost && controlPlayback(isPlaying ? "pause" : "play")}
              playsInline
            />
            
            {/* Video Controls Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Top Info */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <Badge className={`${party.status === "playing" ? "bg-green-500" : "bg-yellow-500"} text-black`}>
                  {party.status === "playing" ? "● LIVE" : "● PAUSED"}
                </Badge>
                <Badge variant="outline" className="bg-black/50">
                  {party.series_title} - Ep {party.episode_number}
                </Badge>
              </div>
              
              {/* Center Play Button */}
              {showControls && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="lg"
                    onClick={() => isHost && controlPlayback(isPlaying ? "pause" : "play")}
                    className={`w-16 h-16 rounded-full ${!isHost && 'opacity-50 cursor-not-allowed'}`}
                    disabled={!isHost}
                  >
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
                  </Button>
                </div>
              )}
              
              {/* Bottom Controls */}
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
                {/* Progress Bar */}
                <div 
                  className="h-1 bg-white/20 rounded-full cursor-pointer group/progress"
                  onClick={(e) => {
                    if (!isHost) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    handleSeek(percent * duration);
                  }}
                >
                  <div 
                    className="h-full bg-primary rounded-full relative"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100" />
                  </div>
                </div>
                
                {/* Controls Row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {isHost ? (
                      <>
                        <button onClick={() => handleSeek(Math.max(0, currentTime - 10))}>
                          <SkipBack className="w-5 h-5" />
                        </button>
                        <button onClick={() => controlPlayback(isPlaying ? "pause" : "play")}>
                          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                        </button>
                        <button onClick={() => handleSeek(Math.min(duration, currentTime + 10))}>
                          <SkipForward className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-gray-400">Host controls playback</span>
                    )}
                    <span className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24">
                      <button onClick={() => setIsMuted(!isMuted)}>
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        max={100}
                        step={1}
                        onValueChange={([v]) => {
                          setVolume(v / 100);
                          setIsMuted(v === 0);
                          if (videoRef.current) videoRef.current.volume = v / 100;
                        }}
                        className="w-16"
                      />
                    </div>
                    <button onClick={toggleFullscreen}>
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Non-host overlay message */}
            {!isHost && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <p className="text-lg font-medium">Waiting for host to start...</p>
                  <p className="text-sm text-gray-400 mt-1">Only {party.host_name} can control playback</p>
                </div>
              </div>
            )}
          </Card>

          {/* Reaction Bar */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowReactions(!showReactions)} className="border-white/20">
                <Smile className="w-4 h-4 mr-2" />React
              </Button>
              
              {showReactions && (
                <div className="flex gap-1 animate-in slide-in-from-left">
                  {REACTIONS.map(r => (
                    <button key={r} onClick={() => sendReaction(r)} className="text-2xl hover:scale-125 transition-transform">
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {isHost && (
              <Button variant="outline" size="sm" onClick={endParty} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
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
              <Users className="w-4 h-4" />Watching ({party.participants?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {party.participants?.map((p) => (
                <div 
                  key={p.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${p.is_host ? 'bg-primary/20 border border-primary/30' : 'bg-white/5'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${p.is_host ? 'bg-primary' : 'bg-white/20'}`}>
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
                <MessageCircle className="w-4 h-4" />Chat
              </h3>
            </div>
            
            <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {party.chat_messages?.length === 0 && (
                <p className="text-center text-muted-foreground text-sm">No messages yet. Start chatting!</p>
              )}
              {party.chat_messages?.map((msg) => (
                <div key={msg.id} className={msg.user_id === user?.id ? 'text-right' : ''}>
                  <div className={`inline-block max-w-[80%] ${msg.user_id === user?.id ? 'bg-primary/20 rounded-l-xl rounded-tr-xl' : 'bg-white/5 rounded-r-xl rounded-tl-xl'} p-3`}>
                    <p className="text-xs text-muted-foreground mb-1">{msg.user_name}</p>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-white/5 border-white/10" />
                <Button type="submit" size="icon"><Send className="w-4 h-4" /></Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
        }
        .animate-float-up { animation: float-up 2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default WatchPartyPage;
