import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Radio, Video, Users, Settings, Copy, Check,
  Eye, Gift, MessageCircle, Play, StopCircle,
  Clock, Wifi, WifiOff, Share2, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const GoLive = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [step, setStep] = useState("setup"); // setup, preview, live
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useState(null);
  const [series, setSeries] = useState([]);
  
  // Stream settings
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);
  const [allowTips, setAllowTips] = useState(true);
  const [recordStream, setRecordStream] = useState(true);
  
  // Live stats
  const [viewerCount, setViewerCount] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tips, setTips] = useState(0);
  
  // Copy state
  const [copiedRtmp, setCopiedRtmp] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  
  // Fetch creator's series
  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const response = await axios.get(`${API}/creator/series`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSeries(response.data || []);
      } catch (err) {
        console.error("Failed to fetch series:", err);
      }
    };
    
    if (token) {
      fetchSeries();
    }
  }, [token]);
  
  // Duration timer when live
  useEffect(() => {
    let timer;
    if (step === "live" && stream?.status === "live") {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, stream?.status]);
  
  // Poll for viewer count when live
  useEffect(() => {
    let poller;
    if (step === "live" && stream?.id) {
      poller = setInterval(async () => {
        try {
          const response = await axios.get(`${API}/livestream/${stream.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setViewerCount(response.data.viewer_count || 0);
          setTips(response.data.total_tips || 0);
        } catch (err) {
          console.error("Failed to fetch stream stats:", err);
        }
      }, 5000);
    }
    return () => clearInterval(poller);
  }, [step, stream?.id, token]);
  
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  const handleCreateStream = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your stream");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/livestream/create`, {
        title: title.trim(),
        description: description.trim() || null,
        series_id: selectedSeries || null,
        is_subscriber_only: isSubscriberOnly,
        allow_tips: allowTips,
        recording_enabled: recordStream
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStream(response.data.stream);
      setStep("preview");
      toast.success("Stream created! Set up your broadcast software.");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create stream");
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoLive = async () => {
    if (!stream?.id) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/livestream/${stream.id}/go-live`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStream({ ...stream, status: "live", playback_url: response.data.playback_url });
      setStep("live");
      toast.success("You're live! 🎬");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to go live");
    } finally {
      setLoading(false);
    }
  };
  
  const handleEndStream = async () => {
    if (!stream?.id) return;
    
    if (!confirm("Are you sure you want to end the stream?")) return;
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/livestream/${stream.id}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Stream ended!");
      navigate("/creator?tab=livestreams");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to end stream");
    } finally {
      setLoading(false);
    }
  };
  
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "rtmp") {
      setCopiedRtmp(true);
      setTimeout(() => setCopiedRtmp(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };
  
  // Setup Step
  if (step === "setup") {
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
          
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Radio className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold">Start a Live Stream</h2>
                <p className="text-sm text-muted-foreground">Connect with your audience in real-time</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Stream Title *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your stream about?"
                  className="bg-white/5 border-white/10"
                  maxLength={100}
                  data-testid="stream-title-input"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell viewers what to expect..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Save to Series (Optional)</label>
                <Select value={selectedSeries} onValueChange={setSelectedSeries}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Select a series" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No series</SelectItem>
                    {series.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Stream will be saved as a replay episode in this series
                </p>
              </div>
              
              <div className="border-t border-white/10 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Subscribers Only</p>
                    <p className="text-xs text-muted-foreground">Only subscribers can watch</p>
                  </div>
                  <Switch
                    checked={isSubscriberOnly}
                    onCheckedChange={setIsSubscriberOnly}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow Tips</p>
                    <p className="text-xs text-muted-foreground">Let viewers send coins during stream</p>
                  </div>
                  <Switch
                    checked={allowTips}
                    onCheckedChange={setAllowTips}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Record Stream</p>
                    <p className="text-xs text-muted-foreground">Save as VOD after stream ends</p>
                  </div>
                  <Switch
                    checked={recordStream}
                    onCheckedChange={setRecordStream}
                  />
                </div>
              </div>
              
              <Button
                onClick={handleCreateStream}
                disabled={loading || !title.trim()}
                className="w-full mt-4"
                data-testid="create-stream-btn"
              >
                {loading ? "Creating..." : "Create Stream"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }
  
  // Preview Step - Show broadcast credentials
  if (step === "preview") {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => setStep("setup")} className="p-2">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Broadcast Setup</h1>
          </div>
          
          <Card className="p-6 bg-white/5 border-white/10 mb-4">
            <h2 className="font-bold mb-4">Stream: {stream?.title}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">RTMP Server URL</label>
                <div className="flex gap-2">
                  <Input
                    value={stream?.rtmp_url || ""}
                    readOnly
                    className="bg-white/10 border-white/10 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(stream?.rtmp_url, "rtmp")}
                  >
                    {copiedRtmp ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Stream Key</label>
                <div className="flex gap-2">
                  <Input
                    value={stream?.stream_key || ""}
                    readOnly
                    type="password"
                    className="bg-white/10 border-white/10 font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(stream?.stream_key, "key")}
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-red-400 mt-1">⚠️ Keep this secret! Don't share with anyone.</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 bg-blue-500/10 border-blue-500/30 mb-4">
            <h3 className="font-bold text-blue-400 mb-2">How to broadcast:</h3>
            <ol className="text-sm space-y-2 text-gray-300">
              <li>1. Open OBS Studio, Streamlabs, or your streaming software</li>
              <li>2. Go to Settings → Stream</li>
              <li>3. Select "Custom" as the service</li>
              <li>4. Paste the RTMP URL and Stream Key</li>
              <li>5. Start streaming from your software</li>
              <li>6. Click "Go Live" below when ready</li>
            </ol>
          </Card>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep("setup")}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleGoLive}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700"
              data-testid="go-live-btn"
            >
              <Radio className="w-4 h-4 mr-2" />
              {loading ? "Starting..." : "Go Live"}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Live Step - Stream dashboard
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4">
        {/* Live header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full animate-pulse">
              <Radio className="w-4 h-4" />
              <span className="font-bold">LIVE</span>
            </div>
            <h1 className="text-xl font-bold">{stream?.title}</h1>
          </div>
          <Button
            onClick={handleEndStream}
            variant="destructive"
            disabled={loading}
            data-testid="end-stream-btn"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            End Stream
          </Button>
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-white/5 border-white/10 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold">{viewerCount}</p>
            <p className="text-xs text-muted-foreground">Viewers</p>
          </Card>
          
          <Card className="p-4 bg-white/5 border-white/10 text-center">
            <Clock className="w-6 h-6 mx-auto mb-2 text-green-400" />
            <p className="text-2xl font-bold">{formatDuration(duration)}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </Card>
          
          <Card className="p-4 bg-white/5 border-white/10 text-center">
            <Gift className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold">{tips}</p>
            <p className="text-xs text-muted-foreground">Coins Received</p>
          </Card>
          
          <Card className="p-4 bg-white/5 border-white/10 text-center">
            <Eye className="w-6 h-6 mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold">{stream?.peak_viewers || viewerCount}</p>
            <p className="text-xs text-muted-foreground">Peak Viewers</p>
          </Card>
        </div>
        
        {/* Stream preview and share */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="font-bold mb-3">Stream Preview</h3>
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-sm">Preview not available from dashboard</p>
            </div>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={() => window.open(`/live/${stream?.id}`, "_blank")}
            >
              <Eye className="w-4 h-4 mr-2" />
              Open Viewer Page
            </Button>
          </Card>
          
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="font-bold mb-3">Share Your Stream</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Stream Link</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={`${window.location.origin}/live/${stream?.id}`}
                    readOnly
                    className="bg-white/10 border-white/10 text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/live/${stream?.id}`);
                      toast.success("Link copied!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm live on Kona! ${stream?.title}`)}&url=${encodeURIComponent(`${window.location.origin}/live/${stream?.id}`)}`, "_blank");
                }}>
                  Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/live/${stream?.id}`)}`, "_blank");
                }}>
                  Facebook
                </Button>
                <Button variant="outline" size="sm" onClick={() => {
                  window.open(`https://wa.me/?text=${encodeURIComponent(`I'm live on Kona! Watch here: ${window.location.origin}/live/${stream?.id}`)}`, "_blank");
                }}>
                  WhatsApp
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GoLive;
