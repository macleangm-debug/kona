import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { 
  Wand2, Sparkles, Image as ImageIcon, Loader2, Download, Trash2,
  RefreshCw, Check, X, ChevronRight, Palette, Film, Layers,
  Zap, Target, Clock, Eye, Copy, Plus, Grid, List
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const STYLES = [
  { id: "cinematic", label: "Cinematic", description: "Movie poster quality" },
  { id: "dramatic", label: "Dramatic", description: "High contrast & bold" },
  { id: "colorful", label: "Colorful", description: "Vibrant & eye-catching" },
  { id: "minimalist", label: "Minimalist", description: "Clean & elegant" },
  { id: "anime", label: "Anime", description: "Japanese animation style" }
];

const GENRES = [
  "romance", "drama", "action", "thriller", "comedy", "horror", "fantasy", "historical"
];

const SIZES = [
  { id: "1024x1024", label: "Square (1:1)", desc: "Social media" },
  { id: "1792x1024", label: "Landscape (16:9)", desc: "Web banners" },
  { id: "1024x1792", label: "Portrait (9:16)", desc: "Mobile/Stories" }
];

export const AIThumbnailGenerator = ({ token, series = [] }) => {
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const [viewMode, setViewMode] = useState("grid");
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  
  // Generation form state
  const [form, setForm] = useState({
    prompt: "",
    style: "cinematic",
    size: "1024x1024",
    preferred_provider: "openai",
    num_variations: 3
  });
  
  // Genre-based form
  const [genreForm, setGenreForm] = useState({
    genre: "drama",
    subject: "",
    series_id: ""
  });

  const fetchThumbnails = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ai-thumbnails/library?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setThumbnails(res.data.thumbnails || []);
    } catch (e) {
      console.error("Error fetching thumbnails:", e);
    }
  }, [token]);

  const fetchProviderStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/ai-thumbnails/providers/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviderStatus(res.data);
    } catch (e) {
      console.error("Error fetching provider status:", e);
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchThumbnails(), fetchProviderStatus()]);
      setLoading(false);
    };
    init();
  }, [fetchThumbnails, fetchProviderStatus]);

  const handleGenerate = async () => {
    if (!form.prompt || form.prompt.length < 10) {
      toast.error("Please enter a prompt (min 10 characters)");
      return;
    }
    
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai-thumbnails/generate`, {
        prompt: form.prompt,
        style: form.style,
        size: form.size,
        preferred_provider: form.preferred_provider,
        save_to_library: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Thumbnail generated using ${res.data.provider_used}!`);
      fetchThumbnails();
      setActiveTab("library");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Generation failed");
    }
    setGenerating(false);
  };

  const handleGenerateFromGenre = async () => {
    if (!genreForm.subject || genreForm.subject.length < 5) {
      toast.error("Please describe your subject (min 5 characters)");
      return;
    }
    
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai-thumbnails/generate-from-genre`, {
        genre: genreForm.genre,
        subject: genreForm.subject,
        series_id: genreForm.series_id || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${genreForm.genre} thumbnail created!`);
      fetchThumbnails();
      setActiveTab("library");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Generation failed");
    }
    setGenerating(false);
  };

  const handleGenerateVariations = async () => {
    if (!form.prompt || form.prompt.length < 10) {
      toast.error("Please enter a prompt (min 10 characters)");
      return;
    }
    
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai-thumbnails/generate-variations`, {
        prompt: form.prompt,
        num_variations: form.num_variations,
        style: form.style
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Generated ${res.data.total_generated} variations!`);
      fetchThumbnails();
      setActiveTab("library");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Generation failed");
    }
    setGenerating(false);
  };

  const handleDelete = async (thumbnailId) => {
    if (!confirm("Delete this thumbnail?")) return;
    
    try {
      await axios.delete(`${API}/ai-thumbnails/${thumbnailId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Thumbnail deleted");
      fetchThumbnails();
    } catch (e) {
      toast.error("Failed to delete thumbnail");
    }
  };

  const handleApply = async (targetType, targetId) => {
    if (!selectedThumbnail) return;
    
    try {
      await axios.post(`${API}/ai-thumbnails/${selectedThumbnail.id}/apply`, {
        thumbnail_id: selectedThumbnail.id,
        target_type: targetType,
        target_id: targetId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Thumbnail applied to ${targetType}!`);
      setShowApplyDialog(false);
      setSelectedThumbnail(null);
      fetchThumbnails();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to apply thumbnail");
    }
  };

  const openApplyDialog = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
    setShowApplyDialog(true);
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
            <Wand2 className="w-6 h-6 text-primary" />
            AI Thumbnail Generator
          </h2>
          <p className="text-sm text-muted-foreground">
            Create stunning thumbnails with AI • Multi-provider for reliability
          </p>
        </div>
        {providerStatus && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Providers:</span>
            <span className={`px-2 py-1 rounded-full ${providerStatus.providers?.openai?.available ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              OpenAI
            </span>
            <span className={`px-2 py-1 rounded-full ${providerStatus.providers?.gemini?.available ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              Gemini
            </span>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="genre">
            <Palette className="w-4 h-4 mr-2" />
            By Genre
          </TabsTrigger>
          <TabsTrigger value="library">
            <Layers className="w-4 h-4 mr-2" />
            Library ({thumbnails.length})
          </TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="generate" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generation Form */}
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Custom Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prompt */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Describe your thumbnail
                  </label>
                  <textarea
                    value={form.prompt}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    placeholder="A dramatic scene with two characters standing under moonlight, romantic tension, city skyline in background..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {form.prompt.length}/1000 characters
                  </p>
                </div>

                {/* Style Selection */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Style</label>
                  <div className="grid grid-cols-5 gap-2">
                    {STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setForm({ ...form, style: style.id })}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          form.style === style.id
                            ? "border-primary bg-primary/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <p className="text-xs font-medium">{style.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size Selection */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Size</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => setForm({ ...form, size: size.id })}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          form.size === size.id
                            ? "border-primary bg-primary/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <p className="text-xs font-medium">{size.label}</p>
                        <p className="text-[10px] text-muted-foreground">{size.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Provider Selection */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Preferred Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setForm({ ...form, preferred_provider: "openai" })}
                      className={`p-3 rounded-lg border transition-all ${
                        form.preferred_provider === "openai"
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <p className="font-medium">OpenAI GPT Image</p>
                      <p className="text-xs text-muted-foreground">Best quality</p>
                    </button>
                    <button
                      onClick={() => setForm({ ...form, preferred_provider: "gemini" })}
                      className={`p-3 rounded-lg border transition-all ${
                        form.preferred_provider === "gemini"
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <p className="font-medium">Gemini Nano Banana</p>
                      <p className="text-xs text-muted-foreground">Fast generation</p>
                    </button>
                  </div>
                </div>

                {/* Generate Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleGenerate}
                    disabled={generating || form.prompt.length < 10}
                  >
                    {generating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Single
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Variations Generator */}
            <Card className="bg-card border-white/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-400" />
                  Generate Variations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create multiple variations for A/B testing. Each variation will have a different composition.
                </p>

                {/* Number of Variations */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Number of Variations: {form.num_variations}
                  </label>
                  <Slider
                    value={[form.num_variations]}
                    onValueChange={([value]) => setForm({ ...form, num_variations: value })}
                    min={1}
                    max={5}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span>
                    <span>3 (Recommended)</span>
                    <span>5</span>
                  </div>
                </div>

                {/* Variation Types Preview */}
                <div className="p-3 rounded-lg bg-white/5">
                  <p className="text-xs text-muted-foreground mb-2">Variation types:</p>
                  <div className="flex flex-wrap gap-1">
                    {["Close-up", "Wide shot", "Character focus", "Action", "Mysterious"].slice(0, form.num_variations).map((v, i) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-primary/20 text-xs">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={handleGenerateVariations}
                  disabled={generating || form.prompt.length < 10}
                >
                  {generating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Layers className="w-4 h-4 mr-2" />
                  )}
                  Generate {form.num_variations} Variations
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Generation may take 30-60 seconds per image
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Genre Tab */}
        <TabsContent value="genre" className="mt-4">
          <Card className="bg-card border-white/10 max-w-xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Palette className="w-5 h-5 text-pink-400" />
                Generate by Genre
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a genre and describe your subject. We'll create an optimized prompt automatically.
              </p>

              {/* Genre Selection */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Genre</label>
                <div className="grid grid-cols-4 gap-2">
                  {GENRES.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setGenreForm({ ...genreForm, genre })}
                      className={`p-2 rounded-lg border text-center transition-all capitalize ${
                        genreForm.genre === genre
                          ? "border-primary bg-primary/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Subject Description
                </label>
                <textarea
                  value={genreForm.subject}
                  onChange={(e) => setGenreForm({ ...genreForm, subject: e.target.value })}
                  placeholder={`e.g., "a young woman discovering a hidden letter" or "two rivals meeting at sunset"`}
                  className="w-full h-20 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
                />
              </div>

              {/* Series Selection (Optional) */}
              {series.length > 0 && (
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">
                    Link to Series (optional)
                  </label>
                  <select
                    value={genreForm.series_id}
                    onChange={(e) => setGenreForm({ ...genreForm, series_id: e.target.value })}
                    className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
                  >
                    <option value="">No series</option>
                    {series.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <Button 
                className="w-full"
                onClick={handleGenerateFromGenre}
                disabled={generating || genreForm.subject.length < 5}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate {genreForm.genre.charAt(0).toUpperCase() + genreForm.genre.slice(1)} Thumbnail
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {thumbnails.length} thumbnails in your library
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("grid")}
                className={viewMode === "grid" ? "bg-white/10" : ""}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("list")}
                className={viewMode === "list" ? "bg-white/10" : ""}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {thumbnails.length > 0 ? (
            <div className={viewMode === "grid" 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" 
              : "space-y-3"
            }>
              {thumbnails.map((thumb) => (
                <Card 
                  key={thumb.id} 
                  className={`bg-card border-white/10 overflow-hidden ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                >
                  {/* Thumbnail Image */}
                  <div className={viewMode === "list" ? "w-32 h-20 flex-shrink-0" : "aspect-video"}>
                    <img
                      src={thumb.image_url}
                      alt="AI Thumbnail"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  
                  {/* Thumbnail Info */}
                  <CardContent className={`p-3 ${viewMode === "list" ? "flex-1 flex items-center justify-between" : ""}`}>
                    <div className={viewMode === "list" ? "flex-1" : ""}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          thumb.provider_used === "openai" 
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400"
                        }`}>
                          {thumb.provider_used}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {thumb.style}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {thumb.prompt?.substring(0, 60)}...
                      </p>
                      {thumb.applied_to && (
                        <p className="text-xs text-green-400 mt-1">
                          Applied to {thumb.applied_to.type}
                        </p>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className={`flex gap-1 ${viewMode === "list" ? "" : "mt-2"}`}>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openApplyDialog(thumb)}
                      >
                        <Target className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = thumb.image_url;
                          link.download = `thumbnail-${thumb.id}.png`;
                          link.click();
                        }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => handleDelete(thumb.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-12 text-center">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-medium mb-2">No Thumbnails Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate your first AI thumbnail to get started
                </p>
                <Button onClick={() => setActiveTab("generate")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Thumbnail
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Apply Thumbnail Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Apply Thumbnail
            </DialogTitle>
            <DialogDescription>
              Choose where to apply this AI-generated thumbnail
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Thumbnail Preview */}
            {selectedThumbnail && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <img
                  src={selectedThumbnail.image_url}
                  alt="Selected thumbnail"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Series Selection */}
            {series.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Apply to Series:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {series.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleApply("series", s.id)}
                      className="w-full p-3 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors flex items-center gap-3"
                    >
                      {s.thumbnail ? (
                        <img src={s.thumbnail} alt="" className="w-12 h-8 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-8 rounded bg-primary/20 flex items-center justify-center">
                          <Film className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.genre}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Film className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No series available. Create a series first to apply thumbnails.
                </p>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AIThumbnailGenerator;
