import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Film, Play, Pause, Plus, Trash2, Loader2, Clock, 
  Sparkles, Scissors, Music, Download, Eye, ChevronRight,
  Video, Wand2, RefreshCw, Check, X, GripVertical, FileVideo,
  Settings, Layers, Volume2, Image
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "gray", icon: Settings },
  processing: { label: "Processing", color: "blue", icon: Loader2 },
  ready: { label: "Ready", color: "green", icon: Check },
  failed: { label: "Failed", color: "red", icon: X }
};

export const TrailerCreator = ({ token }) => {
  const [trailers, setTrailers] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSceneDialog, setShowSceneDialog] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [detectedScenes, setDetectedScenes] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [musicLibrary, setMusicLibrary] = useState([]);
  
  const [createForm, setCreateForm] = useState({
    series_id: "",
    title: "Series Trailer",
    target_duration: 30,
    selection_method: "manual",
    include_title_card: true,
    include_end_card: true,
    background_music_id: null
  });

  const [sceneForm, setSceneForm] = useState({
    episode_id: "",
    start_time: 0,
    end_time: 5,
    label: ""
  });

  const fetchTrailers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/trailers/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrailers(res.data.trailers || []);
    } catch (e) {
      console.error("Error fetching trailers:", e);
    }
  }, [token]);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/series`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeries(res.data || []);
    } catch (e) {
      console.error("Error fetching series:", e);
    }
  }, [token]);

  const fetchMusicLibrary = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/trailers/music/library`);
      setMusicLibrary(res.data.tracks || []);
    } catch (e) {
      console.error("Error fetching music:", e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchTrailers(), fetchSeries(), fetchMusicLibrary()]);
      setLoading(false);
    };
    init();
  }, [fetchTrailers, fetchSeries, fetchMusicLibrary]);

  const handleCreate = async () => {
    if (!createForm.series_id) {
      toast.error("Please select a series");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/trailers/`, createForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Trailer project created!");
      setShowCreateDialog(false);
      fetchTrailers();
      
      // Open the new trailer for editing
      setSelectedTrailer(res.data.trailer);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create trailer");
    }
  };

  const handleDelete = async (trailerId) => {
    if (!confirm("Delete this trailer project?")) return;
    
    try {
      await axios.delete(`${API}/trailers/${trailerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Trailer deleted");
      fetchTrailers();
      if (selectedTrailer?.id === trailerId) {
        setSelectedTrailer(null);
      }
    } catch (e) {
      toast.error("Failed to delete trailer");
    }
  };

  const handleDetectScenes = async () => {
    if (!selectedTrailer) return;
    
    setDetecting(true);
    try {
      const res = await axios.post(`${API}/trailers/${selectedTrailer.id}/detect-scenes`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDetectedScenes(res.data.detected_scenes || []);
      toast.success(`Detected ${res.data.total_detected} exciting moments!`);
    } catch (e) {
      toast.error("Failed to detect scenes");
    }
    setDetecting(false);
  };

  const handleAddScene = async (scene) => {
    if (!selectedTrailer) return;
    
    try {
      await axios.post(`${API}/trailers/${selectedTrailer.id}/scenes`, {
        scenes: [scene]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Scene added!");
      
      // Refresh trailer data
      const res = await axios.get(`${API}/trailers/${selectedTrailer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTrailer(res.data);
      setShowSceneDialog(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add scene");
    }
  };

  const handleRemoveScene = async (sceneId) => {
    if (!selectedTrailer) return;
    
    try {
      await axios.delete(`${API}/trailers/${selectedTrailer.id}/scenes/${sceneId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh trailer data
      const res = await axios.get(`${API}/trailers/${selectedTrailer.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTrailer(res.data);
      toast.success("Scene removed");
    } catch (e) {
      toast.error("Failed to remove scene");
    }
  };

  const handleProcess = async () => {
    if (!selectedTrailer || !selectedTrailer.scenes?.length) {
      toast.error("Add scenes before processing");
      return;
    }
    
    setProcessing(true);
    try {
      await axios.post(`${API}/trailers/${selectedTrailer.id}/process`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Trailer processing started!");
      
      // Poll for status
      pollTrailerStatus(selectedTrailer.id);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to start processing");
      setProcessing(false);
    }
  };

  const pollTrailerStatus = async (trailerId) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/trailers/${trailerId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.status === "ready") {
          clearInterval(interval);
          setProcessing(false);
          toast.success("Trailer is ready!");
          fetchTrailers();
          setSelectedTrailer(prev => ({ ...prev, ...res.data }));
        } else if (res.data.status === "failed") {
          clearInterval(interval);
          setProcessing(false);
          toast.error("Trailer processing failed");
        }
      } catch (e) {
        clearInterval(interval);
        setProcessing(false);
      }
    }, 3000);
  };

  const handleExport = async (format) => {
    if (!selectedTrailer || selectedTrailer.status !== "ready") return;
    
    try {
      const res = await axios.post(`${API}/trailers/${selectedTrailer.id}/export`, {
        format
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Exported in ${format} format!`);
      
      // Refresh trailer to get export URLs
      fetchTrailers();
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const getSelectedSeries = () => {
    return series.find(s => s.id === (selectedTrailer?.series_id || createForm.series_id));
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Film className="w-6 h-6 text-primary" />
            Series Trailer Creator
          </h2>
          <p className="text-sm text-muted-foreground">
            Auto-compile highlights into promotional trailers
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Trailer
        </Button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Trailer List */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground">My Trailers</h3>
          
          {trailers.length > 0 ? (
            trailers.map((trailer) => {
              const config = STATUS_CONFIG[trailer.status] || STATUS_CONFIG.draft;
              const Icon = config.icon;
              return (
                <Card 
                  key={trailer.id} 
                  className={`bg-card border-white/10 cursor-pointer hover:border-primary/30 transition-colors ${
                    selectedTrailer?.id === trailer.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedTrailer(trailer)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Video className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{trailer.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {trailer.series_title}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs bg-${config.color}-500/20 text-${config.color}-400 flex items-center gap-1`}>
                        <Icon className={`w-3 h-3 ${trailer.status === "processing" ? "animate-spin" : ""}`} />
                        {config.label}
                      </span>
                    </div>
                    {trailer.status === "processing" && (
                      <div className="mt-2">
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${trailer.progress_percent || 0}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {trailer.progress_percent || 0}% complete
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-6 text-center">
                <Film className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No trailers yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Trailer Editor */}
        <div className="lg:col-span-2">
          {selectedTrailer ? (
            <Card className="bg-card border-white/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-primary" />
                    {selectedTrailer.title}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(selectedTrailer.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedTrailer.series_title} • Target: {selectedTrailer.target_duration}s
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview */}
                {selectedTrailer.status === "ready" && selectedTrailer.preview_url && (
                  <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                    <video 
                      src={`${API}${selectedTrailer.preview_url}`}
                      controls
                      className="w-full h-full"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                      {formatDuration(selectedTrailer.actual_duration || 0)}
                    </div>
                  </div>
                )}

                {/* Processing State */}
                {selectedTrailer.status === "processing" && (
                  <div className="aspect-video bg-black/50 rounded-lg flex flex-col items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                    <p className="text-lg font-medium">Processing Trailer...</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTrailer.progress_percent || 0}% complete
                    </p>
                  </div>
                )}

                {/* Draft/Edit State */}
                {selectedTrailer.status === "draft" && (
                  <>
                    {/* Scene Detection */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <Wand2 className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="font-medium">AI Scene Detection</p>
                          <p className="text-xs text-muted-foreground">
                            Automatically find exciting moments
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleDetectScenes}
                        disabled={detecting}
                      >
                        {detecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Detect Scenes
                      </Button>
                    </div>

                    {/* Detected Scenes */}
                    {detectedScenes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">AI Detected Scenes (click to add)</p>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                          {detectedScenes.map((scene, i) => (
                            <button
                              key={i}
                              onClick={() => handleAddScene(scene)}
                              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{scene.episode_title}</span>
                                <span className="text-xs text-yellow-400">
                                  {Math.round(scene.ai_score * 100)}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDuration(scene.start_time)} - {formatDuration(scene.end_time)}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Scenes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Selected Scenes ({selectedTrailer.scenes?.length || 0})
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSceneForm({
                              episode_id: "",
                              start_time: 0,
                              end_time: 5,
                              label: ""
                            });
                            setShowSceneDialog(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Manual
                        </Button>
                      </div>
                      
                      {selectedTrailer.scenes?.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTrailer.scenes.map((scene, i) => (
                            <div
                              key={scene.id || i}
                              className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-xs font-bold">
                                {i + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{scene.label || `Scene ${i + 1}`}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDuration(scene.start_time)} - {formatDuration(scene.end_time)}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-300"
                                onClick={() => handleRemoveScene(scene.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center rounded-lg bg-white/5">
                          <Layers className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            No scenes added yet. Use AI detection or add manually.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Title Card</span>
                        <Switch checked={selectedTrailer.include_title_card} disabled />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">End Card</span>
                        <Switch checked={selectedTrailer.include_end_card} disabled />
                      </div>
                    </div>

                    {/* Process Button */}
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleProcess}
                      disabled={!selectedTrailer.scenes?.length || processing}
                    >
                      {processing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Generate Trailer
                    </Button>
                  </>
                )}

                {/* Ready State - Export Options */}
                {selectedTrailer.status === "ready" && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Export Options</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={() => handleExport("mp4_1080p")}>
                        <Download className="w-4 h-4 mr-2" />
                        1080p HD
                      </Button>
                      <Button variant="outline" onClick={() => handleExport("mp4_720p")}>
                        <Download className="w-4 h-4 mr-2" />
                        720p
                      </Button>
                      <Button variant="outline" onClick={() => handleExport("vertical_9_16")}>
                        <Download className="w-4 h-4 mr-2" />
                        Vertical (9:16)
                      </Button>
                      <Button variant="outline" onClick={() => handleExport("square_1_1")}>
                        <Download className="w-4 h-4 mr-2" />
                        Square (1:1)
                      </Button>
                    </div>
                    
                    {/* Re-edit */}
                    <Button 
                      variant="ghost" 
                      className="w-full"
                      onClick={async () => {
                        try {
                          await axios.patch(`${API}/trailers/${selectedTrailer.id}`, {
                            status: "draft"
                          }, { headers: { Authorization: `Bearer ${token}` } });
                          
                          const res = await axios.get(`${API}/trailers/${selectedTrailer.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          setSelectedTrailer(res.data);
                        } catch (e) {
                          toast.error("Failed to reset trailer");
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Re-edit Trailer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center">
                <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">Select a Trailer</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose a trailer from the list or create a new one
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Trailer
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Trailer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-primary" />
              Create New Trailer
            </DialogTitle>
            <DialogDescription>
              Generate a promotional trailer for your series
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Series Selection */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Select Series</label>
              <select
                value={createForm.series_id}
                onChange={(e) => setCreateForm({ ...createForm, series_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
              >
                <option value="">Choose a series...</option>
                {series.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Trailer Title</label>
              <Input
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                placeholder="Official Trailer"
                className="bg-secondary/50 border-white/10"
              />
            </div>

            {/* Target Duration */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Target Duration: {createForm.target_duration}s
              </label>
              <Slider
                value={[createForm.target_duration]}
                onValueChange={([value]) => setCreateForm({ ...createForm, target_duration: value })}
                min={15}
                max={60}
                step={5}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15s</span>
                <span>30s (recommended)</span>
                <span>60s</span>
              </div>
            </div>

            {/* Selection Method */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Scene Selection</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, selection_method: "ai" })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    createForm.selection_method === "ai" 
                      ? "border-primary bg-primary/10" 
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <Wand2 className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">AI Auto-Select</p>
                  <p className="text-xs text-muted-foreground">Best moments detected</p>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, selection_method: "manual" })}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    createForm.selection_method === "manual" 
                      ? "border-primary bg-primary/10" 
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <Scissors className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">Manual Select</p>
                  <p className="text-xs text-muted-foreground">Pick your own clips</p>
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Include Title Card</span>
                </div>
                <Switch
                  checked={createForm.include_title_card}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, include_title_card: checked })}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <FileVideo className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Include End Card</span>
                </div>
                <Switch
                  checked={createForm.include_end_card}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, include_end_card: checked })}
                />
              </div>
            </div>

            {/* Background Music */}
            {musicLibrary.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  <Music className="w-4 h-4 inline mr-1" />
                  Background Music (optional)
                </label>
                <select
                  value={createForm.background_music_id || ""}
                  onChange={(e) => setCreateForm({ ...createForm, background_music_id: e.target.value || null })}
                  className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
                >
                  <option value="">No music</option>
                  {musicLibrary.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.title} ({track.genre}) - {track.duration}s
                      {track.is_premium && " (Premium)"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Create Trailer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Scene Dialog */}
      <Dialog open={showSceneDialog} onOpenChange={setShowSceneDialog}>
        <DialogContent className="max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              Add Scene Manually
            </DialogTitle>
            <DialogDescription>
              Select a clip from your episodes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Episode Selection */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Episode</label>
              <select
                value={sceneForm.episode_id}
                onChange={(e) => setSceneForm({ ...sceneForm, episode_id: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
              >
                <option value="">Select episode...</option>
                {getSelectedSeries()?.episodes?.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.episode_code}: {ep.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Start (seconds)</label>
                <Input
                  type="number"
                  value={sceneForm.start_time}
                  onChange={(e) => setSceneForm({ ...sceneForm, start_time: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.5"
                  className="bg-secondary/50 border-white/10"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">End (seconds)</label>
                <Input
                  type="number"
                  value={sceneForm.end_time}
                  onChange={(e) => setSceneForm({ ...sceneForm, end_time: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="0.5"
                  className="bg-secondary/50 border-white/10"
                />
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Label (optional)</label>
              <Input
                value={sceneForm.label}
                onChange={(e) => setSceneForm({ ...sceneForm, label: e.target.value })}
                placeholder="e.g., Epic fight scene"
                className="bg-secondary/50 border-white/10"
              />
            </div>

            {/* Duration Preview */}
            <div className="p-3 rounded-lg bg-white/5 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-sm">
                Clip Duration: <strong>{(sceneForm.end_time - sceneForm.start_time).toFixed(1)}s</strong>
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSceneDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => handleAddScene(sceneForm)}
                disabled={!sceneForm.episode_id || sceneForm.end_time <= sceneForm.start_time}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Scene
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrailerCreator;
