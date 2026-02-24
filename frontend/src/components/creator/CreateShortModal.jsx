import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Film, Play, Pause, Scissors, Clock, Download, Loader2,
  Smartphone, Square, MonitorPlay, Sparkles, Music, X, Check,
  Share2, Instagram, Youtube
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { API } from "@/config";
import { toast } from "sonner";

// Export format presets
const EXPORT_FORMATS = [
  { 
    id: "tiktok", 
    label: "TikTok", 
    icon: Smartphone, 
    aspect: "9:16", 
    maxDuration: 60,
    description: "Vertical short for TikTok/Reels"
  },
  { 
    id: "instagram", 
    label: "Instagram", 
    icon: Instagram, 
    aspect: "9:16", 
    maxDuration: 90,
    description: "Instagram Reels format"
  },
  { 
    id: "youtube", 
    label: "YouTube Shorts", 
    icon: Youtube, 
    aspect: "9:16", 
    maxDuration: 60,
    description: "YouTube Shorts vertical"
  },
  { 
    id: "square", 
    label: "Square", 
    icon: Square, 
    aspect: "1:1", 
    maxDuration: 60,
    description: "Instagram feed/Twitter"
  },
  { 
    id: "landscape", 
    label: "Landscape", 
    icon: MonitorPlay, 
    aspect: "16:9", 
    maxDuration: 120,
    description: "YouTube/standard video"
  }
];

export const CreateShortModal = ({ 
  open, 
  onOpenChange, 
  episode, 
  series,
  token 
}) => {
  const [step, setStep] = useState(1); // 1: Select clip, 2: Choose format, 3: Processing
  const [clipRange, setClipRange] = useState([0, 15]); // Start and end in seconds
  const [selectedFormat, setSelectedFormat] = useState("tiktok");
  const [title, setTitle] = useState("");
  const [processing, setProcessing] = useState(false);
  const [shortUrl, setShortUrl] = useState(null);
  
  // Reset when episode changes or modal opens
  useEffect(() => {
    if (open && episode) {
      setStep(1);
      setClipRange([0, Math.min(15, episode.duration || 60)]);
      setTitle(`${episode.title} - Short`);
      setShortUrl(null);
    }
  }, [open, episode]);

  const clipDuration = clipRange[1] - clipRange[0];
  const maxDuration = EXPORT_FORMATS.find(f => f.id === selectedFormat)?.maxDuration || 60;

  const handleCreateShort = async () => {
    if (clipDuration > maxDuration) {
      toast.error(`Maximum duration for ${selectedFormat} is ${maxDuration}s`);
      return;
    }
    if (clipDuration < 3) {
      toast.error("Clip must be at least 3 seconds");
      return;
    }

    setProcessing(true);
    setStep(3);

    try {
      // Create the short via API
      const res = await axios.post(`${API}/shorts/create`, {
        episode_id: episode.id,
        series_id: series?.id,
        title: title,
        start_time: clipRange[0],
        end_time: clipRange[1],
        format: selectedFormat,
        aspect_ratio: EXPORT_FORMATS.find(f => f.id === selectedFormat)?.aspect
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShortUrl(res.data.short_url || res.data.download_url);
      toast.success("Short created successfully!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create short");
      setStep(2); // Go back to format selection
    }
    setProcessing(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (shortUrl) {
      window.open(shortUrl, '_blank');
    }
  };

  if (!episode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Create Short from Episode
          </DialogTitle>
          <DialogDescription>
            {episode.title} • {series?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Step 1: Select Clip Range */}
          {step === 1 && (
            <>
              {/* Episode Preview */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                {episode.thumbnail ? (
                  <img 
                    src={episode.thumbnail} 
                    alt={episode.title}
                    className="w-full h-full object-cover opacity-60"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-white/80 text-sm mb-2">Selected Range</p>
                    <p className="text-white text-2xl font-bold">
                      {formatTime(clipRange[0])} - {formatTime(clipRange[1])}
                    </p>
                    <p className="text-primary text-sm mt-1">
                      Duration: {clipDuration.toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Range Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Select clip range</span>
                  <span className="text-primary font-medium">{clipDuration.toFixed(1)}s selected</span>
                </div>
                
                <div className="px-2">
                  <Slider
                    value={clipRange}
                    onValueChange={setClipRange}
                    min={0}
                    max={episode.duration || 300}
                    step={0.5}
                    className="py-4"
                  />
                </div>
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>{formatTime(episode.duration || 300)}</span>
                </div>

                {/* Quick Duration Presets */}
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map(dur => (
                    <Button
                      key={dur}
                      variant={clipDuration === dur ? "default" : "outline"}
                      size="sm"
                      onClick={() => setClipRange([clipRange[0], Math.min(clipRange[0] + dur, episode.duration || 300)])}
                      className="flex-1"
                    >
                      {dur}s
                    </Button>
                  ))}
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={() => setStep(2)}
                disabled={clipDuration < 3}
              >
                Continue to Format
                <Scissors className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}

          {/* Step 2: Choose Export Format */}
          {step === 2 && (
            <>
              {/* Title */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Short Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your short a title"
                  maxLength={100}
                />
              </div>

              {/* Format Selection */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Export Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {EXPORT_FORMATS.map(format => {
                    const Icon = format.icon;
                    const isOverDuration = clipDuration > format.maxDuration;
                    return (
                      <button
                        key={format.id}
                        onClick={() => !isOverDuration && setSelectedFormat(format.id)}
                        disabled={isOverDuration}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selectedFormat === format.id 
                            ? "border-primary bg-primary/10" 
                            : isOverDuration 
                              ? "border-white/5 opacity-50 cursor-not-allowed"
                              : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{format.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{format.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format.aspect} • Max {format.maxDuration}s
                        </p>
                        {isOverDuration && (
                          <p className="text-xs text-red-400 mt-1">Clip too long</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="p-3 rounded-lg bg-white/5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clip Duration</span>
                  <span>{clipDuration.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Range</span>
                  <span>{formatTime(clipRange[0])} - {formatTime(clipRange[1])}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="capitalize">{selectedFormat}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={handleCreateShort}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Short
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Processing / Complete */}
          {step === 3 && (
            <div className="py-8 text-center">
              {processing ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Creating Your Short...</h3>
                  <p className="text-sm text-muted-foreground">
                    This may take a moment. Please don't close this window.
                  </p>
                </>
              ) : shortUrl ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Short Created!</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your {selectedFormat} short is ready to download and share.
                  </p>
                  
                  <div className="space-y-2">
                    <Button className="w-full" onClick={handleDownload}>
                      <Download className="w-4 h-4 mr-2" />
                      Download Short
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => onOpenChange(false)}
                    >
                      Done
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Failed to Create Short</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Something went wrong. Please try again.
                  </p>
                  <Button onClick={() => setStep(2)}>Try Again</Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateShortModal;
