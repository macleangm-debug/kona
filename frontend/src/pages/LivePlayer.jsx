import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Hls from "hls.js";
import {
  ChevronLeft, Users, Heart, Send, Gift, Share2,
  Settings, Maximize2, Minimize2, Volume2, VolumeX,
  Radio, MessageCircle, X, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

// Tip amounts for quick selection
const TIP_AMOUNTS = [10, 50, 100, 500, 1000];

export const LivePlayer = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const chatContainerRef = useRef(null);
  const wsRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Tip state
  const [showTipSheet, setShowTipSheet] = useState(false);
  const [tipAmount, setTipAmount] = useState(50);
  const [tipMessage, setTipMessage] = useState("");
  const [isTipping, setIsTipping] = useState(false);
  
  // Fetch stream data
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const response = await axios.get(`${API}/livestream/${streamId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        setStream(response.data);
        setViewerCount(response.data.viewer_count || 0);
        
        if (response.data.status !== "live") {
          setError("This stream is not live");
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load stream");
      } finally {
        setLoading(false);
      }
    };
    
    fetchStream();
  }, [streamId, token]);
  
  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream?.playback_url) return;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10
      });
      hlsRef.current = hls;
      
      hls.loadSource(stream.playback_url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setIsPlaying(true);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          setError("Stream playback error");
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = stream.playback_url;
      video.play().catch(() => {});
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [stream?.playback_url]);
  
  // Join stream and setup WebSocket
  useEffect(() => {
    if (!stream || stream.status !== "live") return;
    
    // Join stream
    const joinStream = async () => {
      try {
        await axios.post(`${API}/livestream/${streamId}/join`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to join stream:", err);
      }
    };
    
    if (token) {
      joinStream();
    }
    
    // Fetch chat history
    const fetchChatHistory = async () => {
      try {
        const response = await axios.get(`${API}/livestream/${streamId}/chat/history?limit=50`);
        setMessages(response.data);
      } catch (err) {
        console.error("Failed to fetch chat:", err);
      }
    };
    fetchChatHistory();
    
    // Setup WebSocket for real-time chat
    const wsUrl = `${API.replace("http", "ws")}/livestream/${streamId}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log("WebSocket connected");
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "message") {
        setMessages(prev => [...prev, data]);
        // Auto-scroll chat
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      } else if (data.type === "tip") {
        // Show tip notification
        toast.success(`🎉 ${data.user} sent ${data.amount} coins!`);
        setMessages(prev => [...prev, {
          id: `tip-${Date.now()}`,
          type: "tip",
          username: data.user,
          amount: data.amount,
          message: data.message,
          created_at: data.timestamp
        }]);
      } else if (data.type === "viewer_count") {
        setViewerCount(data.count);
      }
    };
    
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
    
    // Leave stream on unmount
    return () => {
      if (token) {
        axios.post(`${API}/livestream/${streamId}/leave`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
      if (ws) {
        ws.close();
      }
    };
  }, [stream, streamId, token]);
  
  // Send chat message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !token || isSending) return;
    
    setIsSending(true);
    try {
      // Send via WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "message",
          user_id: user?.id,
          username: user?.username || "Anonymous",
          avatar_url: user?.avatar_url,
          message: newMessage.trim(),
          is_creator: user?.id === stream?.user_id
        }));
        setNewMessage("");
      } else {
        // Fallback to REST API
        await axios.post(`${API}/livestream/${streamId}/chat/send`, {
          message: newMessage.trim()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNewMessage("");
      }
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };
  
  // Send tip
  const handleSendTip = async () => {
    if (!token || isTipping) return;
    
    setIsTipping(true);
    try {
      await axios.post(`${API}/livestream/${streamId}/tip?amount=${tipAmount}`, {
        message: tipMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Sent ${tipAmount} coins to ${stream?.creator_name}!`);
      setShowTipSheet(false);
      setTipMessage("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send tip");
    } finally {
      setIsTipping(false);
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    const container = document.getElementById("live-player-container");
    if (!container) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      container.requestFullscreen();
      setIsFullscreen(true);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white">
        <Radio className="w-16 h-16 text-red-500" />
        <h2 className="text-xl font-bold">Stream Unavailable</h2>
        <p className="text-gray-400">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <div 
      id="live-player-container"
      className="min-h-screen bg-black flex flex-col lg:flex-row"
      data-testid="live-player"
    >
      {/* Video Section */}
      <div className="flex-1 relative">
        {/* Video */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
          muted={isMuted}
          onClick={toggleMute}
        />
        
        {/* Live badge */}
        <div className="absolute top-4 left-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-black/50 rounded-full backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full">
            <Radio className="w-3 h-3 animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1 bg-black/50 rounded-full backdrop-blur-sm">
            <Users className="w-3 h-3 text-white" />
            <span className="text-white text-xs">{viewerCount.toLocaleString()}</span>
          </div>
        </div>
        
        {/* Stream info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-3 mb-2">
            <img
              src={stream?.creator_avatar || "/default-avatar.png"}
              alt={stream?.creator_name}
              className="w-10 h-10 rounded-full border-2 border-red-500"
            />
            <div>
              <h2 className="text-white font-bold">{stream?.title}</h2>
              <p className="text-gray-300 text-sm">{stream?.creator_name}</p>
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-2 bg-white/20 rounded-full backdrop-blur-sm"
                data-testid="mute-btn"
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5 text-white" />
                ) : (
                  <Volume2 className="w-5 h-5 text-white" />
                )}
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white/20 rounded-full backdrop-blur-sm"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5 text-white" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {stream?.allow_tips && token && (
                <Button
                  onClick={() => setShowTipSheet(true)}
                  className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black"
                  data-testid="tip-btn"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  Tip
                </Button>
              )}
              <button
                onClick={() => setShowChat(!showChat)}
                className="lg:hidden p-2 bg-white/20 rounded-full backdrop-blur-sm"
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Section */}
      <div className={`${showChat ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[350px] bg-gray-900 border-l border-white/10`}>
        {/* Chat header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-white font-bold">Live Chat</h3>
          <button
            onClick={() => setShowChat(false)}
            className="lg:hidden p-1"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        {/* Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`${msg.type === 'tip' ? 'bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2' : ''}`}>
              {msg.type === 'tip' ? (
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-500 font-bold">{msg.username}</span>
                  <span className="text-white">sent {msg.amount} coins</span>
                  {msg.message && <span className="text-gray-400">- {msg.message}</span>}
                </div>
              ) : (
                <div className="flex gap-2">
                  <img
                    src={msg.avatar_url || "/default-avatar.png"}
                    alt={msg.username}
                    className="w-6 h-6 rounded-full flex-shrink-0"
                  />
                  <div>
                    <span className={`font-medium text-sm ${msg.is_creator ? 'text-yellow-500' : 'text-primary'}`}>
                      {msg.username}
                      {msg.is_creator && <span className="ml-1 text-[10px] bg-yellow-500 text-black px-1 rounded">HOST</span>}
                    </span>
                    <p className="text-white text-sm">{msg.message}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Chat input */}
        {token ? (
          <div className="p-4 border-t border-white/10">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Say something..."
                className="flex-1 bg-white/10 border-white/20"
                maxLength={500}
                data-testid="chat-input"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!newMessage.trim() || isSending}
                data-testid="send-chat-btn"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        ) : (
          <div className="p-4 border-t border-white/10 text-center">
            <p className="text-gray-400 text-sm mb-2">Sign in to chat</p>
            <Button onClick={() => navigate("/login")} variant="outline" size="sm">
              Sign In
            </Button>
          </div>
        )}
      </div>
      
      {/* Tip Sheet */}
      <Sheet open={showTipSheet} onOpenChange={setShowTipSheet}>
        <SheetContent side="bottom" className="bg-gray-900 border-white/10">
          <SheetHeader>
            <SheetTitle className="text-white">Send a Tip</SheetTitle>
          </SheetHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {TIP_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={tipAmount === amount ? "default" : "outline"}
                  onClick={() => setTipAmount(amount)}
                  className="flex-1 min-w-[60px]"
                >
                  <Coins className="w-4 h-4 mr-1" />
                  {amount}
                </Button>
              ))}
            </div>
            
            <Input
              value={tipMessage}
              onChange={(e) => setTipMessage(e.target.value)}
              placeholder="Add a message (optional)"
              className="bg-white/10 border-white/20"
              maxLength={100}
            />
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Your balance:</span>
              <span className="text-white font-bold">{user?.coins || 0} coins</span>
            </div>
            
            <Button
              onClick={handleSendTip}
              disabled={isTipping || (user?.coins || 0) < tipAmount}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black"
            >
              {isTipping ? "Sending..." : `Send ${tipAmount} Coins`}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default LivePlayer;
