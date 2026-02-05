import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Clock, X, Plus, Film, Eye, Coins, BarChart3, Trophy, Loader2, TrendingUp, Crown, Star, DollarSign, Target, ExternalLink, FileVideo, CheckCircle, AlertCircle, Upload, Trash2, Globe, Languages } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { SeriesSubmissionForm } from "@/components/SeriesSubmissionForm";

export const CreatorPortal = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [creatorStatus, setCreatorStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [series, setSeries] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [showSubmitSeries, setShowSubmitSeries] = useState(false);
  const [earnings, setEarnings] = useState(null);
  const [revenueTiers, setRevenueTiers] = useState(null);

  // Application form state
  const [applyForm, setApplyForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    content_type: "romance",
    expected_uploads_per_month: 4
  });

  // New series form state
  const [seriesForm, setSeriesForm] = useState({
    title: "",
    description: "",
    genre: "Romance"
  });

  // Episode edit state
  const [showEpisodeEditor, setShowEpisodeEditor] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodeForm, setEpisodeForm] = useState({
    title: "",
    intro_duration: 30,
    is_free: false,
    coins_required: 5
  });
  
  // Subtitle upload state
  const [subtitleUploading, setSubtitleUploading] = useState(false);
  const [episodeSubtitles, setEpisodeSubtitles] = useState({});
  const [selectedSubtitleLanguage, setSelectedSubtitleLanguage] = useState("en");
  const subtitleFileInputRef = useRef(null);

  // Supported subtitle languages
  const SUBTITLE_LANGUAGES = [
    { code: "en", name: "English" },
    { code: "sw", name: "Swahili" },
    { code: "fr", name: "French" }
  ];

  const fetchCreatorData = async () => {
    if (!token) return;
    try {
      const statusRes = await axios.get(`${API}/creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCreatorStatus(statusRes.data);

      if (statusRes.data.is_creator) {
        const [dashboardRes, seriesRes, submissionsRes] = await Promise.all([
          axios.get(`${API}/creator/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/creator/series`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/creator/submissions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ]);
        setDashboard(dashboardRes.data);
        setSeries(seriesRes.data);
        setSubmissions(submissionsRes.data);
        
        // Fetch earnings and tier info
        try {
          const [earningsRes, tiersRes] = await Promise.all([
            axios.get(`${API}/revenue/creator/${user?.id}/earnings`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/revenue/tiers`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setEarnings(earningsRes.data);
          setRevenueTiers(tiersRes.data);
        } catch (e) {
          console.error("Failed to fetch earnings:", e);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCreatorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleApply = async () => {
    try {
      await axios.post(`${API}/creator/apply`, applyForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application submitted! We'll review within 24-48 hours.");
      setShowApplyForm(false);
      fetchCreatorData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit application");
    }
  };

  const handleCreateSeries = async () => {
    try {
      await axios.post(`${API}/creator/series`, seriesForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Series created!");
      setShowCreateSeries(false);
      setSeriesForm({ title: "", description: "", genre: "Romance" });
      fetchCreatorData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create series");
    }
  };

  const openEpisodeEditor = async (episode) => {
    setSelectedEpisode(episode);
    setEpisodeForm({
      title: episode.title || "",
      intro_duration: episode.intro_duration || 30,
      is_free: episode.is_free || false,
      coins_required: episode.coins_required || 5
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
      
      await axios.patch(`${API}/creator/episodes/${selectedEpisode.id}?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Episode updated!");
      setShowEpisodeEditor(false);
      setSelectedEpisode(null);
      fetchCreatorData();
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
        // In production, this would be uploaded to a CDN
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
      toast.success(`${language.toUpperCase()} subtitles removed`);
    } catch (e) {
      toast.error("Failed to remove subtitles");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <Film className="w-12 h-12 mx-auto mb-4 text-primary" />
          <h2 className="font-heading text-xl font-bold mb-2">Creator Portal</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in to become a content creator</p>
          <Button onClick={() => navigate("/")} className="w-full">Go to Home</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not a creator yet - show apply form
  if (!creatorStatus?.is_creator) {
    return (
      <div className="min-h-screen pb-20">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-3 p-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading text-lg font-bold">Become a Creator</h1>
          </div>
        </div>

        <div className="p-4">
          {creatorStatus?.status === "pending" ? (
            <Card className="p-6 text-center" data-testid="creator-pending">
              <Clock className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <h2 className="font-heading text-xl font-bold mb-2">Application Pending</h2>
              <p className="text-sm text-muted-foreground">We are reviewing your application. You will hear from us within 24-48 hours.</p>
            </Card>
          ) : creatorStatus?.status === "rejected" ? (
            <Card className="p-6 text-center">
              <X className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h2 className="font-heading text-xl font-bold mb-2">Application Not Approved</h2>
              <p className="text-sm text-muted-foreground mb-4">Unfortunately, your application was not approved at this time.</p>
              <Button variant="outline" onClick={() => setShowApplyForm(true)}>Apply Again</Button>
            </Card>
          ) : (
            <>
              {/* Benefits */}
              <Card className="p-6 mb-4 bg-gradient-to-br from-primary/20 to-purple-600/20 border-primary/30">
                <h2 className="font-heading text-xl font-bold mb-4">Partner with Kona</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">30-50% Revenue Share</p>
                      <p className="text-xs text-muted-foreground">Of net revenue (after expenses)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Real-time Analytics</p>
                      <p className="text-xs text-muted-foreground">Track views, earnings & audience</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Milestone Bonuses</p>
                      <p className="text-xs text-muted-foreground">Earn extra at 50K, 500K, 1M views</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Revenue Model Explanation */}
              <Card className="p-4 mb-4 bg-white/5">
                <h3 className="font-semibold mb-2 text-sm">How Revenue Works</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  30% is deducted for platform expenses (hosting, payments, moderation). 
                  Your share is calculated from the remaining 70%.
                </p>
                <div className="text-xs text-muted-foreground">
                  Example: $100 revenue → $70 after expenses → You earn $21-$35
                </div>
              </Card>

              {/* Tier System */}
              <Card className="p-4 mb-4">
                <h3 className="font-semibold mb-3">Creator Tiers</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                    <span className="text-sm">🆕 New Creator</span>
                    <span className="text-xs text-muted-foreground">30% of net</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                    <span className="text-sm">✅ Verified (50K+ views)</span>
                    <span className="text-xs text-muted-foreground">40% of net + Auto-publish</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                    <span className="text-sm">⭐ Partner (500K+ views)</span>
                    <span className="text-xs text-muted-foreground">50% of net + Priority featuring</span>
                  </div>
                </div>
              </Card>

              <Button onClick={() => setShowApplyForm(true)} className="w-full h-12 text-base" data-testid="apply-creator-btn">
                Apply to Become a Creator
              </Button>
            </>
          )}
        </div>

        {/* Apply Form Dialog */}
        <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Creator Application</DialogTitle>
              <DialogDescription>Tell us about yourself and your content</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm text-muted-foreground">Name</label>
                <Input 
                  value={applyForm.name} 
                  onChange={(e) => setApplyForm({...applyForm, name: e.target.value})}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Email</label>
                <Input 
                  value={applyForm.email} 
                  onChange={(e) => setApplyForm({...applyForm, email: e.target.value})}
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Bio (min 20 characters)</label>
                <textarea 
                  className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none"
                  rows={3}
                  value={applyForm.bio}
                  onChange={(e) => setApplyForm({...applyForm, bio: e.target.value})}
                  placeholder="Tell us about yourself and your content style..."
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Content Type</label>
                <select 
                  className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                  value={applyForm.content_type}
                  onChange={(e) => setApplyForm({...applyForm, content_type: e.target.value})}
                >
                  <option value="romance">Romance</option>
                  <option value="drama">Drama</option>
                  <option value="thriller">Thriller</option>
                  <option value="fantasy">Fantasy</option>
                  <option value="action">Action</option>
                  <option value="comedy">Comedy</option>
                </select>
              </div>
              <Button 
                onClick={handleApply} 
                className="w-full"
                disabled={applyForm.bio.length < 20}
                data-testid="submit-application-btn"
              >
                Submit Application
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Creator Dashboard
  return (
    <div className="min-h-screen pb-20" data-testid="creator-dashboard">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading text-lg font-bold">Creator Studio</h1>
              <p className="text-xs text-muted-foreground">
                {dashboard?.tier === "partner" ? "⭐ Partner" : dashboard?.tier === "verified" ? "✅ Verified" : "🆕 New"} • {Math.round(dashboard?.revenue_share * 100)}% share
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowSubmitSeries(true)} data-testid="submit-series-btn">
            <Plus className="w-4 h-4 mr-1" /> Submit Series
          </Button>
        </div>
      </div>

      {/* Pending Submissions */}
      {submissions.filter(s => s.status !== 'approved').length > 0 && (
        <div className="px-4 mb-4">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Pending Submissions
          </h3>
          <div className="space-y-2">
            {submissions.filter(s => s.status !== 'approved').map(sub => (
              <Card key={sub.id} className="p-3 bg-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{sub.title}</p>
                    <p className="text-xs text-muted-foreground">{sub.genre} • S01E01: {sub.pilot_title}</p>
                  </div>
                  <Badge variant={
                    sub.status === 'pending_review' ? 'secondary' : 
                    sub.status === 'under_review' ? 'default' :
                    sub.status === 'rejected' ? 'destructive' : 'outline'
                  }>
                    {sub.status === 'pending_review' ? '⏳ Pending' : 
                     sub.status === 'under_review' ? '👀 Under Review' :
                     sub.status === 'rejected' ? '❌ Rejected' : sub.status}
                  </Badge>
                </div>
                {sub.feedback && sub.status === 'rejected' && (
                  <p className="text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded">
                    Feedback: {sub.feedback}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
            <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
            <p className="font-heading text-2xl font-bold flex items-center gap-1">
              <Coins className="w-5 h-5 text-yellow-400" />
              {dashboard?.total_earnings || 0}
            </p>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
            <p className="text-xs text-muted-foreground mb-1">Total Views</p>
            <p className="font-heading text-2xl font-bold flex items-center gap-1">
              <Eye className="w-5 h-5 text-blue-400" />
              {dashboard?.total_views || 0}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">This Month</p>
            <p className="font-heading text-xl font-bold">{dashboard?.this_month_earnings || 0} coins</p>
            <p className="text-xs text-muted-foreground">{dashboard?.this_month_views || 0} views</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Payout</p>
            <p className="font-heading text-xl font-bold text-green-400">{dashboard?.pending_payout || 0}</p>
            <p className="text-xs text-muted-foreground">coins available</p>
          </Card>
        </div>

        {/* Tier Progress Section */}
        {earnings?.tier && (
          <Card className="p-4 mb-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold">Your Creator Tier</h3>
              </div>
              <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                {earnings.tier.current.share}% Revenue Share
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{earnings.tier.current.name}</span>
                  {earnings.tier.next && (
                    <span className="text-gray-400">→ {earnings.tier.next.name}</span>
                  )}
                </div>
                {earnings.tier.next && (
                  <>
                    <Progress 
                      value={(earnings.stats.total_views / earnings.tier.next.min_views) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {earnings.tier.views_to_next.toLocaleString()} more views to unlock {earnings.tier.next.share}% share
                    </p>
                  </>
                )}
              </div>
            </div>
            
            {/* All Tiers */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {revenueTiers?.tiers?.map((tier, i) => (
                <div 
                  key={i} 
                  className={`p-2 rounded-lg ${
                    earnings.tier.current.name === tier.name 
                      ? 'bg-yellow-500/20 border border-yellow-500' 
                      : 'bg-white/5'
                  }`}
                >
                  <div className="font-bold text-sm">{tier.share}%</div>
                  <div className="text-gray-400 truncate">{tier.name}</div>
                  <div className="text-[10px] text-gray-500">{tier.min_views.toLocaleString()}+ views</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Revenue Calculator Card */}
        <Card className="p-4 mb-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h3 className="font-bold">Your Earnings Rate</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Gross Revenue</span>
              <span className="font-semibold">$100.00</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-red-500/10">
              <span className="text-red-400">Platform Expenses (30%)</span>
              <span className="font-semibold text-red-400">-$30.00</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-white/5">
              <span className="text-gray-400">Net Revenue</span>
              <span className="font-semibold">$70.00</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-green-500/10 border border-green-500/30">
              <span className="text-green-400">Your Share ({(dashboard?.revenue_share || 0.30) * 100}%)</span>
              <span className="font-bold text-green-400">${(70 * (dashboard?.revenue_share || 0.30)).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Only purchased coins generate revenue. Free rewards do not count.
          </p>
        </Card>

        {/* Creator Showcase Link */}
        <Card className="p-4 mb-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1">Share with Other Creators</h3>
              <p className="text-xs text-gray-400">Download promo materials to invite creators</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open('/creator-showcase.html', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        </Card>

        {/* Subtitle Template Download */}
        <Card className="p-4 mb-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold mb-1 flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-blue-400" />
                Subtitle Template
              </h3>
              <p className="text-xs text-gray-400">Download VTT template for adding subtitles</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.open(`${API}/creator/subtitle-template`, '_blank')}
              data-testid="download-subtitle-template"
            >
              Download .vtt
            </Button>
          </div>
          <p className="text-xs text-blue-400 mt-2">
            Tip: Adding subtitles (English, Swahili, French) increases your reach by 40%!
          </p>
        </Card>

        {/* My Series */}
        <h3 className="font-heading font-semibold mb-3">My Series ({series.length})</h3>
        {series.length === 0 ? (
          <Card className="p-8 text-center">
            <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No series yet. Create your first series!</p>
            <Button onClick={() => setShowCreateSeries(true)}>Create Series</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {series.map((s) => (
              <Card key={s.id} className="p-4" onClick={() => navigate(`/creator/series/${s.id}`)} data-testid={`series-${s.id}`}>
                <div className="flex gap-3">
                  <img src={s.thumbnail} alt={s.title} className="w-20 h-28 object-cover rounded-lg" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm line-clamp-1">{s.title}</h4>
                      <Badge variant={s.status === "published" ? "default" : s.status === "pending_review" ? "secondary" : "outline"} className="text-[10px]">
                        {s.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{s.genre} • {s.total_episodes} episodes</p>
                    <div className="flex gap-4 text-xs">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {s.total_views}</span>
                      <span className="flex items-center gap-1 text-yellow-400"><Coins className="w-3 h-3" /> {s.total_earnings}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Series Dialog */}
      <Dialog open={showCreateSeries} onOpenChange={setShowCreateSeries}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Series</DialogTitle>
            <DialogDescription>Start your new series</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Title</label>
              <Input 
                value={seriesForm.title}
                onChange={(e) => setSeriesForm({...seriesForm, title: e.target.value})}
                placeholder="My Amazing Series"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea 
                className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none"
                rows={3}
                value={seriesForm.description}
                onChange={(e) => setSeriesForm({...seriesForm, description: e.target.value})}
                placeholder="What's your series about? (min 20 characters)"
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
            <Button 
              onClick={handleCreateSeries} 
              className="w-full"
              disabled={seriesForm.title.length < 2 || seriesForm.description.length < 20}
              data-testid="submit-series-btn"
            >
              Create Series
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Episode Editor Dialog */}
      <Dialog open={showEpisodeEditor} onOpenChange={setShowEpisodeEditor}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Episode</DialogTitle>
            <DialogDescription>
              Update episode settings including Skip Intro timing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Episode Title</label>
              <Input 
                value={episodeForm.title}
                onChange={(e) => setEpisodeForm({...episodeForm, title: e.target.value})}
                placeholder="Episode title"
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
                />
              </div>
            )}
            
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

      {/* Series Submission Form */}
      <SeriesSubmissionForm
        open={showSubmitSeries}
        onClose={() => setShowSubmitSeries(false)}
        token={token}
        onSuccess={fetchCreatorData}
      />
    </div>
  );
};

export default CreatorPortal;
