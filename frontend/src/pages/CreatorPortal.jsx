import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Star, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader, KonaLoader } from "@/components/SplashScreen";
import { API } from "@/config";
import { toast } from "sonner";
import { SeriesSubmissionForm } from "@/components/SeriesSubmissionForm";
import { CreatorAnalytics } from "@/components/CreatorAnalytics";
import { CreateSeriesDialog } from "@/components/creator/CreateSeriesDialog";
import {
  CreatorHeader,
  CreatorStats,
  CreatorSeriesList,
  CreatorPendingSubmissions,
  PayoutHistory,
  CreatorNotifications,
  CreatorDashboardOverview,
  EarningsDashboard,
  EpisodeScheduler,
  CreatorMilestones,
  MerchandiseManager,
  SponsorshipMarketplace,
  TrailerCreator,
  AIThumbnailGenerator,
  FanPollsQA,
  TipDashboard
} from "@/components/creator";

export const CreatorPortal = () => {
  const navigate = useNavigate();
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [creatorStatus, setCreatorStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [series, setSeries] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [showCreateSeries, setShowCreateSeries] = useState(false);
  const [showSubmitSeries, setShowSubmitSeries] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [creatingSeriesLoading, setCreatingSeriesLoading] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(false);

  // Application form state
  const [applyForm, setApplyForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
    content_type: "romance",
    expected_uploads_per_month: 4
  });

  const fetchCreatorData = async () => {
    if (!token) return;
    try {
      const statusRes = await axios.get(`${API}/creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCreatorStatus(statusRes.data);

      if (statusRes.data.is_creator) {
        const [dashboardRes, seriesRes, submissionsRes, unreadRes] = await Promise.all([
          axios.get(`${API}/creator/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/creator/series`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/creator/submissions`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
          axios.get(`${API}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { unread_count: 0 } }))
        ]);
        setDashboard(dashboardRes.data);
        setSeries(seriesRes.data);
        setSubmissions(submissionsRes.data);
        setUnreadNotifications(unreadRes.data.unread_count || 0);
      }
    } catch (e) {
      console.error("Error fetching creator data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCreatorData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Handle session timeout - if we have token but no user after 5 seconds, try to refresh or redirect
  useEffect(() => {
    const hasToken = token || localStorage.getItem("token");
    if (!user && hasToken && !authLoading) {
      const timeoutId = setTimeout(() => {
        // If still no user after 5 seconds, try refreshing or redirect to login
        if (refreshUser) {
          refreshUser().catch(() => {
            setSessionTimeout(true);
          });
        } else {
          setSessionTimeout(true);
        }
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [user, token, authLoading, refreshUser]);

  const handleApply = async () => {
    if (applyForm.bio.length < 20) {
      toast.error("Please write at least 20 characters in your bio");
      return;
    }
    
    try {
      await axios.post(`${API}/creator/apply`, applyForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application submitted! We'll review it soon.");
      setShowApplyForm(false);
      fetchCreatorData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Application failed");
    }
  };

  const handleCreateSeries = useCallback(async (formData) => {
    if (!formData.title || formData.title.length < 3) {
      toast.error("Please enter a series title (min 3 characters)");
      return;
    }
    if (!formData.description || formData.description.length < 20) {
      toast.error("Please enter a description (min 20 characters)");
      return;
    }
    
    setCreatingSeriesLoading(true);
    try {
      const res = await axios.post(`${API}/creator/series`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Series created! Now add episodes.");
      setShowCreateSeries(false);
      navigate(`/creator/series/${res.data.series_id}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create series");
    } finally {
      setCreatingSeriesLoading(false);
    }
  }, [token, navigate]);

  // Handle quick publish from series list
  const handlePublishSeries = useCallback(async (seriesId) => {
    try {
      const res = await axios.post(
        `${API}/creator/series/${seriesId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(res.data.message);
      fetchCreatorData(); // Refresh to update status
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to publish series");
    }
  }, [token]);

  // Wait for auth to load first
  if (authLoading) {
    return <PageLoader message="Loading..." />;
  }

  // Loading creator data while we have a user
  if (loading && user) {
    return <PageLoader message="Loading creator portal..." />;
  }

  // Check if we have a token but no user yet (still loading)
  const hasToken = token || localStorage.getItem("token");
  
  // Not logged in - only show if no token at all or session timed out
  if (!user && !hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
          <h2 className="font-heading text-xl font-bold mb-2">Sign In Required</h2>
          <p className="text-sm text-muted-foreground mb-4">Please sign in to access the Creator Portal</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </Card>
      </div>
    );
  }

  // Session timed out - show error and redirect option
  if (sessionTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
          <h2 className="font-heading text-xl font-bold mb-2">Session Issue</h2>
          <p className="text-sm text-muted-foreground mb-4">Unable to verify your session. Please sign in again.</p>
          <Button onClick={() => {
            localStorage.removeItem("token");
            navigate("/");
          }}>Return to Home</Button>
        </Card>
      </div>
    );
  }

  // Still loading user from token
  // If authLoading is false but we have token and no user, show verifying briefly
  // This handles the edge case where authLoading completes but user not yet set
  if (!user && hasToken) {
    return <PageLoader message="Verifying session..." />;
  }

  // Not a creator yet - show application
  if (!creatorStatus?.is_creator) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center mb-8">
            <Star className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="font-heading text-2xl font-bold mb-2">Become a Creator</h1>
            <p className="text-muted-foreground">
              Join Kona creator program and earn money from your content
            </p>
          </div>

          {creatorStatus?.application_status === "pending" ? (
            <Card className="p-6 text-center">
              <KonaLoader size={48} className="mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Application Under Review</h3>
              <p className="text-sm text-muted-foreground">
                We are reviewing your application. You will be notified once approved.
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-6 mb-4">
                <h3 className="font-semibold mb-4">Why Join?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">✅ Earn 30-50% of revenue from your content</li>
                  <li className="flex items-center gap-2">✅ Access to millions of viewers</li>
                  <li className="flex items-center gap-2">✅ Easy-to-use creator dashboard</li>
                  <li className="flex items-center gap-2">✅ Weekly payouts via M-Pesa, Bank, or PayPal</li>
                </ul>
              </Card>
              
              <Button className="w-full" onClick={() => setShowApplyForm(true)}>
                Apply Now
              </Button>
            </>
          )}
        </div>

        {/* Application Form Dialog */}
        <Dialog open={showApplyForm} onOpenChange={setShowApplyForm}>
          <DialogContent className="max-w-md">
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
                  placeholder="Tell us about your content and experience..."
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
              <Button onClick={handleApply} className="w-full">Submit Application</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Creator Dashboard
  return (
    <div className="min-h-screen pt-16 lg:pt-16" data-testid="creator-dashboard">
      <CreatorHeader
        dashboard={dashboard}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSubmitSeries={() => setShowSubmitSeries(true)}
        unreadNotifications={unreadNotifications}
      />

      {/* Main Content - with sidebar offset on desktop */}
      <main className="lg:ml-64 min-h-screen">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="font-heading text-2xl font-bold capitalize">{activeTab}</h2>
            <p className="text-sm text-muted-foreground">
              {activeTab === "dashboard" && "Overview of your creator account"}
              {activeTab === "earnings" && "Real-time revenue tracking and insights"}
              {activeTab === "analytics" && "Track your performance and growth"}
              {activeTab === "scheduler" && "Schedule episodes for timed release"}
              {activeTab === "milestones" && "Track achievements and earn rewards"}
              {activeTab === "merchandise" && "Sell physical and digital merchandise"}
              {activeTab === "sponsorships" && "Connect with brands for sponsorships"}
              {activeTab === "trailers" && "Create promotional trailers for your series"}
              {activeTab === "thumbnails" && "Generate AI-powered thumbnails for your content"}
              {activeTab === "polls" && "Engage fans with polls and answer their questions"}
              {activeTab === "payouts" && "Manage your earnings and payouts"}
              {activeTab === "notifications" && "Stay updated with your account activity"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              <p className="font-heading text-xl font-bold text-yellow-400">{dashboard?.total_earnings?.toLocaleString() || 0} coins</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Views</p>
              <p className="font-heading text-xl font-bold text-blue-400">{dashboard?.total_views?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 lg:p-8">
          {activeTab === "dashboard" && (
            <CreatorDashboardOverview
              dashboard={dashboard}
              series={series}
              submissions={submissions}
              onCreateSeries={() => setShowCreateSeries(true)}
              onPublish={handlePublishSeries}
              loading={loading}
            />
          )}

          {activeTab === "earnings" && (
            <div className="max-w-7xl">
              <EarningsDashboard token={token} />
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="max-w-7xl">
              <CreatorAnalytics token={token} />
            </div>
          )}

          {activeTab === "scheduler" && (
            <div className="max-w-7xl">
              <EpisodeScheduler 
                token={token} 
                episodes={series.flatMap(s => s.episodes || [])}
                onScheduleChange={fetchCreatorData}
              />
            </div>
          )}

          {activeTab === "milestones" && (
            <div className="max-w-7xl">
              <CreatorMilestones token={token} />
            </div>
          )}

          {activeTab === "merchandise" && (
            <div className="max-w-7xl">
              <MerchandiseManager token={token} />
            </div>
          )}

          {activeTab === "sponsorships" && (
            <div className="max-w-7xl">
              <SponsorshipMarketplace token={token} />
            </div>
          )}

          {activeTab === "trailers" && (
            <div className="max-w-7xl">
              <TrailerCreator token={token} />
            </div>
          )}

          {activeTab === "thumbnails" && (
            <div className="max-w-7xl">
              <AIThumbnailGenerator token={token} series={series} />
            </div>
          )}

          {activeTab === "polls" && (
            <div className="max-w-7xl">
              <FanPollsQA token={token} series={series} />
            </div>
          )}

          {activeTab === "payouts" && (
            <div className="max-w-7xl">
              <PayoutHistory token={token} />
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="max-w-4xl">
              <CreatorNotifications 
                token={token} 
                onUnreadCountChange={setUnreadNotifications}
              />
            </div>
          )}
        </div>
      </main>

      {/* Create Series Dialog - Optimized for performance */}
      <CreateSeriesDialog
        open={showCreateSeries}
        onOpenChange={setShowCreateSeries}
        onSubmit={handleCreateSeries}
        loading={creatingSeriesLoading}
      />

      {/* Series Submission Form */}
      <SeriesSubmissionForm
        open={showSubmitSeries}
        onOpenChange={setShowSubmitSeries}
        token={token}
        onSuccess={() => {
          fetchCreatorData();
          setShowSubmitSeries(false);
        }}
      />
    </div>
  );
};

export default CreatorPortal;
