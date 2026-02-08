import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, Clock, Film, Eye, Coins, Loader2, 
  Play, Edit, Plus, FileVideo, Upload, Trash2, 
  Languages, CheckCircle, AlertCircle, Image, Link, Video
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

// Supported subtitle languages
const SUBTITLE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "sw", name: "Swahili" },
  { code: "fr", name: "French" }
];

export const CreatorSeriesDetailPage = () => {
  const navigate = useNavigate();
  const { id: seriesId } = useParams();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  
  // Series editor state
  const [showSeriesEditor, setShowSeriesEditor] = useState(false);
  const [seriesForm, setSeriesForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    genre: ""
  });
  
  // Episode editor state
  const [showEpisodeEditor, setShowEpisodeEditor] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodeForm, setEpisodeForm] = useState({
    title: "",
    intro_duration: 30,
    is_free: false,
    coins_required: 5,
    thumbnail_url: "",
    video_url: ""
  });
  
  // Subtitle upload state
  const [subtitleUploading, setSubtitleUploading] = useState(false);
  const [episodeSubtitles, setEpisodeSubtitles] = useState({});
  const [selectedSubtitleLanguage, setSelectedSubtitleLanguage] = useState("en");
  const subtitleFileInputRef = useRef(null);
  
  // Video validation state
  const [videoValidation, setVideoValidation] = useState({
    isValidating: false,
    isVertical: null,
    dimensions: null,
    error: null
  });
  const videoValidationRef = useRef(null);

  // Validate video dimensions before upload
  const validateVideoDimensions = (file, isEpisode1 = false) => {
    return new Promise((resolve) => {
      setVideoValidation({ isValidating: true, isVertical: null, dimensions: null, error: null });
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const width = video.videoWidth;
        const height = video.videoHeight;
        const aspectRatio = width / height;
        const isVertical = aspectRatio < 1; // Height > Width = vertical
        
        const validation = {
          isValidating: false,
          isVertical,
          dimensions: { width, height, aspectRatio: aspectRatio.toFixed(2) },
          error: null
        };
        
        // If Episode 1 and not vertical, show warning
        if (isEpisode1 && !isVertical) {
          validation.error = `This video is horizontal (${width}x${height}). Episode 1 should be vertical (9:16) for the Stories feed. Vertical videos get 3x more engagement!`;
        }
        
        setVideoValidation(validation);
        resolve(validation);
      };
      
      video.onerror = () => {
        setVideoValidation({
          isValidating: false,
          isVertical: null,
          dimensions: null,
          error: 'Could not read video dimensions'
        });
        resolve({ isVertical: null, error: 'Could not read video' });
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle video file selection with validation
  const handleVideoFileSelect = async (e, isEpisode1 = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate dimensions
    const validation = await validateVideoDimensions(file, isEpisode1);
    
    // If Episode 1 and horizontal, show warning but allow continue
    if (isEpisode1 && validation.isVertical === false) {
      toast.warning(
        'Horizontal video detected! Episode 1 appears in the Stories feed and works best with vertical (9:16) format.',
        { duration: 6000 }
      );
    } else if (validation.isVertical === true) {
      toast.success('Perfect! Vertical video detected - ideal for Stories feed!');
    }
    
    return file;
  };

  const fetchSeriesDetail = async () => {
    if (!token || !seriesId) return;
    
    try {
      const res = await axios.get(`${API}/creator/series/${seriesId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeries(res.data);
      setEpisodes(res.data.episodes || []);
      
      // Fetch seasons
      try {
        const seasonsRes = await axios.get(`${API}/creator/series/${seriesId}/seasons`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSeasons(seasonsRes.data || []);
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
      }
    } catch (e) {
      console.error("Failed to fetch series:", e);
      toast.error("Failed to load series details");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeriesDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, seriesId]);

  const openSeriesEditor = () => {
    if (series) {
      setSeriesForm({
        title: series.title || "",
        description: series.description || "",
        thumbnail_url: series.thumbnail || "",
        genre: series.genre || ""
      });
      setShowSeriesEditor(true);
    }
  };

  const handleUpdateSeries = async () => {
    if (!series) return;
    
    try {
      const params = new URLSearchParams();
      if (seriesForm.title) params.append("title", seriesForm.title);
      if (seriesForm.description) params.append("description", seriesForm.description);
      if (seriesForm.thumbnail_url) params.append("thumbnail_url", seriesForm.thumbnail_url);
      if (seriesForm.genre) params.append("genre", seriesForm.genre);
      
      await axios.patch(`${API}/creator/series/${seriesId}?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Series updated!");
      setShowSeriesEditor(false);
      fetchSeriesDetail();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update series");
    }
  };

  const openEpisodeEditor = async (episode) => {
    setSelectedEpisode(episode);
    setEpisodeForm({
      title: episode.title || "",
      intro_duration: episode.intro_duration || 30,
      is_free: episode.is_free || false,
      coins_required: episode.coins_required || 5,
      thumbnail_url: episode.thumbnail || "",
      video_url: episode.video_url || ""
    });
    setEpisodeSubtitles(episode.subtitles || {});
    setSelectedSubtitleLanguage("en");
    setShowEpisodeEditor(true);
    
    // Fetch latest subtitles from backend
    try {
      const res = await axios.get(
        `${API}/creator/episodes/${episode.id}/subtitles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEpisodeSubtitles(res.data.subtitles || {});
    } catch (e) {
      console.error("Failed to fetch subtitles:", e);
    }
  };

  const handleUpdateEpisode = async () => {
    if (!selectedEpisode) return;
    
    try {
      const params = new URLSearchParams();
      if (episodeForm.title) params.append("title", episodeForm.title);
      params.append("intro_duration", episodeForm.intro_duration);
      params.append("is_free", episodeForm.is_free);
      if (!episodeForm.is_free) params.append("coins_required", episodeForm.coins_required);
      if (episodeForm.thumbnail_url) params.append("thumbnail_url", episodeForm.thumbnail_url);
      if (episodeForm.video_url) params.append("video_url", episodeForm.video_url);
      
      await axios.patch(`${API}/creator/episodes/${selectedEpisode.id}?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Episode updated!");
      setShowEpisodeEditor(false);
      setSelectedEpisode(null);
      fetchSeriesDetail();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update episode");
    }
  };

  // Handle subtitle file upload
  const handleSubtitleUpload = async (file) => {
    if (!selectedEpisode || !file) return;
    
    // Validate file type
    if (!file.name.endsWith('.vtt')) {
      toast.error("Please upload a .vtt file");
      return;
    }
    
    setSubtitleUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        
        // Convert the content to base64 data URL for storage
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        const subtitleDataUrl = `data:text/vtt;base64,${base64Content}`;
        
        try {
          await axios.post(
            `${API}/creator/episodes/${selectedEpisode.id}/subtitles`,
            { 
              episode_id: selectedEpisode.id,
              language: selectedSubtitleLanguage,
              subtitle_url: subtitleDataUrl
            },
            { headers: { Authorization: `Bearer ${token}` }}
          );
          
          setEpisodeSubtitles(prev => ({...prev, [selectedSubtitleLanguage]: subtitleDataUrl}));
          toast.success(`${SUBTITLE_LANGUAGES.find(l => l.code === selectedSubtitleLanguage)?.name || selectedSubtitleLanguage.toUpperCase()} subtitles uploaded!`);
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to save subtitles");
        }
        setSubtitleUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read subtitle file");
        setSubtitleUploading(false);
      };
      reader.readAsText(file);
    } catch (e) {
      toast.error("Failed to process subtitle file");
      setSubtitleUploading(false);
    }
    
    // Reset file input
    if (subtitleFileInputRef.current) {
      subtitleFileInputRef.current.value = "";
    }
  };

  // Handle subtitle removal
  const handleRemoveSubtitle = async (language) => {
    if (!selectedEpisode) return;
    
    try {
      await axios.delete(
        `${API}/creator/episodes/${selectedEpisode.id}/subtitles/${language}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setEpisodeSubtitles(prev => {
        const updated = {...prev};
        delete updated[language];
        return updated;
      });
      toast.success(`${SUBTITLE_LANGUAGES.find(l => l.code === language)?.name || language.toUpperCase()} subtitles removed`);
    } catch (e) {
      toast.error("Failed to remove subtitles");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="font-heading text-xl font-bold mb-2">Series Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">This series does not exist or you do not have access.</p>
          <Button onClick={() => navigate("/creator")} className="w-full">Back to Creator Portal</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 lg:pt-16" data-testid="creator-series-detail">
      {/* Desktop Sidebar - positioned below main header */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-72 bg-card border-r border-white/10 z-40">
        {/* Back Navigation */}
        <div className="p-4 border-b border-white/10">
          <button 
            onClick={() => navigate("/creator")} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Creator Portal
          </button>
        </div>

        {/* Series Info */}
        <div className="p-6 border-b border-white/10">
          <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-secondary/50 mb-4">
            {series.thumbnail ? (
              <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <h1 className="font-heading text-xl font-bold mb-1">{series.title}</h1>
          <p className="text-sm text-muted-foreground mb-3">{series.genre} • {series.total_episodes || episodes.length} episodes</p>
          <Badge 
            variant={series.status === "published" ? "default" : series.status === "approved" ? "outline" : "secondary"}
            className="mb-3"
          >
            {series.status === "pending_review" ? "Under Review" : series.status}
          </Badge>
          <p className="text-xs text-muted-foreground line-clamp-4">{series.description || "No description"}</p>
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" /> Views
            </span>
            <span className="font-bold">{series.total_views || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" /> Earnings
            </span>
            <span className="font-bold">{series.total_earnings || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400" /> Episodes
            </span>
            <span className="font-bold">{episodes.length}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 mt-auto space-y-2">
          <Button className="w-full" variant="outline" onClick={openSeriesEditor}>
            <Edit className="w-4 h-4 mr-2" /> Edit Series Info
          </Button>
          {(series.status === "approved" || series.status === "published") && (
            <Button className="w-full" data-testid="add-episode-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Episode
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate("/creator")} className="p-2 hover:bg-secondary rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-lg font-bold line-clamp-1">{series.title}</h1>
            <p className="text-xs text-muted-foreground">{series.genre} • {series.total_episodes} episodes</p>
          </div>
          <button 
            onClick={openSeriesEditor}
            className="p-2 hover:bg-secondary rounded-full"
            data-testid="edit-series-btn-mobile"
          >
            <Edit className="w-4 h-4" />
          </button>
          <Badge variant={series.status === "published" ? "default" : series.status === "approved" ? "outline" : "secondary"}>
            {series.status === "pending_review" ? "Review" : series.status}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-72">
        {/* Desktop Header */}
        <div className="hidden lg:block border-b border-white/10 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold">Episodes</h2>
              <p className="text-sm text-muted-foreground">Manage episodes for {series.title}</p>
            </div>
            {(series.status === "approved" || series.status === "published") && (
              <Button data-testid="add-episode-btn-desktop">
                <Plus className="w-4 h-4 mr-2" /> Add New Episode
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Series Info */}
        <div className="lg:hidden p-4">
          <Card className="p-4 mb-4 flex gap-4">
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-secondary/50 flex-shrink-0">
              {series.thumbnail ? (
                <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground line-clamp-3">{series.description || "No description"}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={openSeriesEditor}>
                <Edit className="w-3 h-3 mr-1" /> Edit
              </Button>
            </div>
          </Card>

          {/* Mobile Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
              <p className="text-xs text-muted-foreground mb-1">Total Views</p>
              <p className="font-heading text-xl font-bold flex items-center gap-1">
                <Eye className="w-4 h-4 text-blue-400" />
                {series.total_views || 0}
              </p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
              <p className="text-xs text-muted-foreground mb-1">Earnings</p>
              <p className="font-heading text-xl font-bold flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                {series.total_earnings || 0}
              </p>
            </Card>
          </div>
        </div>

        {/* Episodes Section */}
        <div className="p-4 lg:p-8">
          {/* Mobile Episodes Header */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Episodes ({episodes.length})</h3>
            {(series.status === "approved" || series.status === "published") && (
              <Button size="sm" variant="outline" data-testid="add-episode-btn-mobile">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            )}
          </div>

          {episodes.length === 0 ? (
            <Card className="p-12 text-center">
              <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-heading text-lg font-semibold mb-2">No Episodes Yet</h3>
              <p className="text-muted-foreground mb-4">
                {series.status === "pending_review" 
                  ? "Your series is under review. Once approved, you can add more episodes."
                  : "Start adding episodes to your series."}
              </p>
              {(series.status === "approved" || series.status === "published") && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add First Episode
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {episodes.map((ep) => (
                <Card 
                  key={ep.id} 
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer group"
                  onClick={() => openEpisodeEditor(ep)}
                  data-testid={`episode-${ep.id}`}
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {ep.thumbnail ? (
                        <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                      ) : (
                        <Play className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {ep.episode_code || `E${ep.episode_number}`}
                        </Badge>
                        {ep.is_free && (
                          <Badge className="text-[10px] bg-green-500/20 text-green-400">FREE</Badge>
                        )}
                        {ep.episode_number === 1 && (
                          <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                            📱 STORIES
                          </Badge>
                        )}
                        {ep.subtitles && Object.keys(ep.subtitles).length > 0 && (
                          <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                            CC ({Object.keys(ep.subtitles).length})
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-medium text-sm lg:text-base line-clamp-1 mb-1">{ep.title}</h4>
                      {ep.episode_number === 1 && (
                        <p className="text-[10px] text-purple-400 mb-1">
                          Vertical format (9:16) recommended for Stories feed
                        </p>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {ep.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" /> {ep.earnings || 0}
                        </span>
                        {!ep.is_free && (
                          <span>{ep.coins_required} coins</span>
                        )}
                      </div>
                    </div>
                    <button 
                      className="p-2 hover:bg-secondary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity self-start"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEpisodeEditor(ep);
                      }}
                      data-testid={`edit-episode-${ep.id}`}
                    >
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Episode Editor Dialog */}
      <Dialog open={showEpisodeEditor} onOpenChange={setShowEpisodeEditor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Episode</DialogTitle>
            <DialogDescription>
              Update episode settings including Skip Intro timing and subtitles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Episode Title</label>
              <Input 
                value={episodeForm.title}
                onChange={(e) => setEpisodeForm({...episodeForm, title: e.target.value})}
                placeholder="Episode title"
                data-testid="episode-title-input"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Intro Duration (seconds)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Set when the Skip Intro button should skip to
              </p>
              <div className="flex items-center gap-3">
                <Input 
                  type="number"
                  min={0}
                  max={120}
                  value={episodeForm.intro_duration}
                  onChange={(e) => setEpisodeForm({...episodeForm, intro_duration: parseInt(e.target.value) || 0})}
                  className="w-24"
                  data-testid="intro-duration-input"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[10, 15, 30, 45, 60].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setEpisodeForm({...episodeForm, intro_duration: sec})}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      episodeForm.intro_duration === sec 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-white/20 hover:border-primary'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-white/10">
              <div>
                <p className="text-sm font-medium">Free Episode</p>
                <p className="text-xs text-muted-foreground">No coins required</p>
              </div>
              <button
                onClick={() => setEpisodeForm({...episodeForm, is_free: !episodeForm.is_free})}
                className={`w-12 h-6 rounded-full transition-colors ${episodeForm.is_free ? 'bg-green-500' : 'bg-white/20'}`}
                data-testid="is-free-toggle"
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${episodeForm.is_free ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            {!episodeForm.is_free && (
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Coins Required
                </label>
                <Input 
                  type="number"
                  min={1}
                  max={50}
                  value={episodeForm.coins_required}
                  onChange={(e) => setEpisodeForm({...episodeForm, coins_required: parseInt(e.target.value) || 5})}
                  className="w-24"
                  data-testid="coins-required-input"
                />
              </div>
            )}
            
            {/* Thumbnail URL Section */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-purple-400" />
                Episode Thumbnail
              </label>
              <Input 
                value={episodeForm.thumbnail_url}
                onChange={(e) => setEpisodeForm({...episodeForm, thumbnail_url: e.target.value})}
                placeholder="https://example.com/thumbnail.jpg"
                data-testid="episode-thumbnail-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste image URL from Imgur, Cloudinary, or any image hosting service
              </p>
              {episodeForm.thumbnail_url && (
                <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden bg-secondary/50">
                  <img 
                    src={episodeForm.thumbnail_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
            
            {/* Video URL Section */}
            <div>
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Video className="w-4 h-4 text-green-400" />
                Video URL
                {selectedEpisode?.episode_number === 1 && (
                  <Badge className="text-[10px] bg-purple-500/20 text-purple-400 ml-2">
                    📱 Vertical (9:16) Required
                  </Badge>
                )}
              </label>
              <Input 
                value={episodeForm.video_url}
                onChange={(e) => setEpisodeForm({...episodeForm, video_url: e.target.value})}
                placeholder="https://example.com/video.mp4 or Bunny.net URL"
                data-testid="episode-video-input"
              />
              
              {/* Episode 1 vertical format guidance */}
              {selectedEpisode?.episode_number === 1 && (
                <div className="mt-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-purple-300 font-medium">Stories Feed Requirement</p>
                      <p className="text-xs text-purple-400/80 mt-1">
                        Episode 1 appears in the <strong>Stories feed</strong> (like TikTok/Reels). 
                        For best results, upload a <strong>vertical video (9:16 aspect ratio)</strong>.
                      </p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-green-400">✓ 1080x1920 (9:16)</span>
                        <span className="text-green-400">✓ 720x1280 (9:16)</span>
                        <span className="text-red-400/70">✗ 1920x1080 (16:9)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Video dimension validation feedback */}
              {videoValidation.dimensions && (
                <div className={`mt-2 p-2 rounded-lg border ${
                  videoValidation.isVertical 
                    ? 'bg-green-500/10 border-green-500/30' 
                    : selectedEpisode?.episode_number === 1 
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {videoValidation.isVertical ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className={`w-4 h-4 ${selectedEpisode?.episode_number === 1 ? 'text-yellow-400' : 'text-blue-400'}`} />
                    )}
                    <span className={`text-xs ${
                      videoValidation.isVertical ? 'text-green-400' : selectedEpisode?.episode_number === 1 ? 'text-yellow-400' : 'text-blue-400'
                    }`}>
                      {videoValidation.isVertical 
                        ? `✓ Vertical video (${videoValidation.dimensions.width}x${videoValidation.dimensions.height}) - Perfect for Stories!`
                        : `Horizontal video (${videoValidation.dimensions.width}x${videoValidation.dimensions.height})${selectedEpisode?.episode_number === 1 ? ' - Consider vertical for Stories feed' : ''}`
                      }
                    </span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-1">
                Direct video URL (MP4, HLS) or Bunny.net streaming URL
              </p>
              {selectedEpisode?.bunny_video_id && (
                <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                  <p className="text-xs text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Bunny.net Video ID: {selectedEpisode.bunny_video_id}
                  </p>
                </div>
              )}
            </div>
            
            {/* Subtitle Upload Section */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Languages className="w-4 h-4 text-blue-400" />
                Subtitles (Optional)
              </label>
              
              {/* Current Subtitles */}
              {Object.keys(episodeSubtitles).length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Uploaded subtitles:</p>
                  {Object.entries(episodeSubtitles).map(([lang, url]) => (
                    <div key={lang} className="flex items-center justify-between p-2 bg-green-500/10 rounded-md border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">
                          {SUBTITLE_LANGUAGES.find(l => l.code === lang)?.name || lang.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtitle(lang)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        data-testid={`remove-subtitle-${lang}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Upload New Subtitle */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={selectedSubtitleLanguage}
                    onChange={(e) => setSelectedSubtitleLanguage(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                    data-testid="subtitle-language-select"
                  >
                    {SUBTITLE_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} {episodeSubtitles[lang.code] ? '(Replace)' : ''}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg cursor-pointer transition-colors">
                    {subtitleUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-sm">Upload</span>
                    <input
                      ref={subtitleFileInputRef}
                      type="file"
                      accept=".vtt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleSubtitleUpload(e.target.files[0]);
                        }
                      }}
                      disabled={subtitleUploading}
                      data-testid="subtitle-file-input"
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload .vtt subtitle files. Adding subtitles increases your reach by 40%!
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleUpdateEpisode} 
              className="w-full"
              data-testid="save-episode-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Series Editor Dialog */}
      <Dialog open={showSeriesEditor} onOpenChange={setShowSeriesEditor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Series</DialogTitle>
            <DialogDescription>
              Update series information and thumbnail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Series Title</label>
              <Input 
                value={seriesForm.title}
                onChange={(e) => setSeriesForm({...seriesForm, title: e.target.value})}
                placeholder="Series title"
                data-testid="series-title-input"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea 
                className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none"
                rows={3}
                value={seriesForm.description}
                onChange={(e) => setSeriesForm({...seriesForm, description: e.target.value})}
                placeholder="Series description..."
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Genre</label>
              <select 
                className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                value={seriesForm.genre}
                onChange={(e) => setSeriesForm({...seriesForm, genre: e.target.value})}
              >
                <option value="Romance">Romance</option>
                <option value="Drama">Drama</option>
                <option value="Thriller">Thriller</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Action">Action</option>
                <option value="Comedy">Comedy</option>
              </select>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-purple-400" />
                Series Thumbnail
              </label>
              <Input 
                value={seriesForm.thumbnail_url}
                onChange={(e) => setSeriesForm({...seriesForm, thumbnail_url: e.target.value})}
                placeholder="https://example.com/thumbnail.jpg"
                data-testid="series-thumbnail-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste image URL from Imgur, Cloudinary, or any image hosting service
              </p>
              {seriesForm.thumbnail_url && (
                <div className="mt-2 relative w-24 h-32 rounded-lg overflow-hidden bg-secondary/50">
                  <img 
                    src={seriesForm.thumbnail_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
            
            <Button 
              onClick={handleUpdateSeries} 
              className="w-full"
              data-testid="save-series-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorSeriesDetailPage;
