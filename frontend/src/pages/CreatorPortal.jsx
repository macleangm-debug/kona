import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Clock, X, Plus, Film, Eye, Coins, BarChart3, Trophy, Loader2, TrendingUp, Crown, Star, DollarSign, Target, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const CreatorPortal = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [creatorStatus, setCreatorStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);

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

  useEffect(() => {
    fetchCreatorData();
  }, [token]);

  const fetchCreatorData = async () => {
    if (!token) return;
    try {
      const statusRes = await axios.get(`${API}/creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCreatorStatus(statusRes.data);

      if (statusRes.data.is_creator) {
        const [dashboardRes, seriesRes] = await Promise.all([
          axios.get(`${API}/creator/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/creator/series`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setDashboard(dashboardRes.data);
        setSeries(seriesRes.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

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
              <p className="text-sm text-muted-foreground">We're reviewing your application. You'll hear from us within 24-48 hours.</p>
            </Card>
          ) : creatorStatus?.status === "rejected" ? (
            <Card className="p-6 text-center">
              <X className="w-12 h-12 mx-auto mb-4 text-red-400" />
              <h2 className="font-heading text-xl font-bold mb-2">Application Not Approved</h2>
              <p className="text-sm text-muted-foreground mb-4">Unfortunately, your application wasn't approved at this time.</p>
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
                      <p className="font-semibold text-sm">60-70% Revenue Share</p>
                      <p className="text-xs text-muted-foreground">Earn from every episode view</p>
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
                      <p className="text-xs text-muted-foreground">Earn extra at 10K, 50K, 100K views</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tier System */}
              <Card className="p-4 mb-4">
                <h3 className="font-semibold mb-3">Creator Tiers</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                    <span className="text-sm">🆕 New Creator</span>
                    <span className="text-xs text-muted-foreground">60% share</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                    <span className="text-sm">✅ Verified (10K+ views)</span>
                    <span className="text-xs text-muted-foreground">65% share + Auto-publish</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-secondary/30">
                    <span className="text-sm">⭐ Partner (100K+ views)</span>
                    <span className="text-xs text-muted-foreground">70% share + Priority featuring</span>
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
          <Button size="sm" onClick={() => setShowCreateSeries(true)} data-testid="create-series-btn">
            <Plus className="w-4 h-4 mr-1" /> New Series
          </Button>
        </div>
      </div>

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
    </div>
  );
};

export default CreatorPortal;
