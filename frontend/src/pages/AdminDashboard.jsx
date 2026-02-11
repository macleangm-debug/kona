import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, Users, Film, CreditCard, TrendingUp, 
  DollarSign, Eye, Crown, Check, X, Clock, Loader2,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  FileText, Server, Shield, Database, Calculator, Cpu, 
  HardDrive, Wifi, Globe, Zap, AlertTriangle, CheckCircle,
  Heart, Sparkles, Trash2, Play, Megaphone, Video, ExternalLink, Target,
  FlaskConical, Ticket
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { KonaLoader, PageLoader } from "@/components/SplashScreen";
import { ExchangeRateManager } from "@/components/admin/ExchangeRateManager";
import { ABTestingManager } from "@/components/admin/ABTestingManager";
import SupportTicketsModule from "@/components/admin/SupportTicketsModule";
import { API } from "@/config";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

// Chart colors
const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

// Markdown components for ReactMarkdown (extracted to avoid re-creation on each render)
const markdownComponents = {
  h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-white mt-6 mb-4" {...props} />,
  h2: ({ node, ...props }) => <h2 className="text-xl font-bold text-white mt-5 mb-3 border-b border-white/10 pb-2" {...props} />,
  h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />,
  p: ({ node, ...props }) => <p className="text-gray-300 mb-3" {...props} />,
  ul: ({ node, ...props }) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1" {...props} />,
  ol: ({ node, ...props }) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1" {...props} />,
  li: ({ node, ...props }) => <li className="text-gray-300" {...props} />,
  table: ({ node, ...props }) => <div className="overflow-x-auto mb-4"><table className="min-w-full border border-white/10" {...props} /></div>,
  thead: ({ node, ...props }) => <thead className="bg-white/5" {...props} />,
  th: ({ node, ...props }) => <th className="px-4 py-2 text-left text-sm font-semibold border border-white/10" {...props} />,
  td: ({ node, ...props }) => <td className="px-4 py-2 text-sm border border-white/10" {...props} />,
  code: ({ node, inline, ...props }) => 
    inline 
      ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 text-sm" {...props} />
      : <code className="block bg-black/30 p-4 rounded-lg overflow-x-auto text-sm text-green-300" {...props} />,
  pre: ({ node, ...props }) => <pre className="bg-black/30 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
  blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4" {...props} />,
  hr: ({ node, ...props }) => <hr className="border-white/10 my-6" {...props} />,
};

// Launch Checklist Items (mirrors the launch_checklist.md document)
const CHECKLIST_ITEMS = [
  { id: "technical-1", category: "Technical Infrastructure", label: "Domain configured & SSL certificates installed" },
  { id: "technical-2", category: "Technical Infrastructure", label: "CDN setup for global video delivery" },
  { id: "technical-3", category: "Technical Infrastructure", label: "Database backups automated" },
  { id: "technical-4", category: "Technical Infrastructure", label: "Error monitoring & alerting configured" },
  { id: "technical-5", category: "Technical Infrastructure", label: "Load testing completed (1000+ concurrent users)" },
  { id: "content-1", category: "Content Ready", label: "Minimum 10 complete series uploaded" },
  { id: "content-2", category: "Content Ready", label: "Episode thumbnails & metadata optimized" },
  { id: "content-3", category: "Content Ready", label: "Coming soon content queued (3+ series)" },
  { id: "content-4", category: "Content Ready", label: "Content moderation workflow tested" },
  { id: "payment-1", category: "Payment Systems", label: "Stripe integration tested (all regions)" },
  { id: "payment-2", category: "Payment Systems", label: "M-Pesa/Flutterwave integration tested (Africa)" },
  { id: "payment-3", category: "Payment Systems", label: "Coin purchase flows validated" },
  { id: "payment-4", category: "Payment Systems", label: "Subscription billing cycle confirmed" },
  { id: "legal-1", category: "Legal & Compliance", label: "Terms of Service published" },
  { id: "legal-2", category: "Legal & Compliance", label: "Privacy Policy published" },
  { id: "legal-3", category: "Legal & Compliance", label: "GDPR compliance verified" },
  { id: "legal-4", category: "Legal & Compliance", label: "Content licensing agreements signed" },
  { id: "marketing-1", category: "Marketing Ready", label: "App Store listing approved (if applicable)" },
  { id: "marketing-2", category: "Marketing Ready", label: "Social media accounts created" },
  { id: "marketing-3", category: "Marketing Ready", label: "Launch announcement prepared" },
  { id: "marketing-4", category: "Marketing Ready", label: "Referral system tested end-to-end" },
  { id: "support-1", category: "Support Ready", label: "Help/FAQ section published" },
  { id: "support-2", category: "Support Ready", label: "Support email configured" },
  { id: "support-3", category: "Support Ready", label: "Crisis response plan documented" },
];

// Launch Checklist Tab Component
const LaunchChecklistTab = ({ token }) => {
  const [checklist, setChecklist] = useState({ completed_items: [] });
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  const fetchChecklist = async () => {
    try {
      const res = await axios.get(`${API}/admin/checklist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklist(res.data);
    } catch (e) {
      console.error("Failed to fetch checklist:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChecklist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggleItem = async (itemId) => {
    setToggling(itemId);
    try {
      const res = await axios.post(`${API}/admin/checklist/toggle?item_id=${itemId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChecklist(prev => ({ ...prev, completed_items: res.data.completed_items }));
      toast.success(`Item ${res.data.action}`);
    } catch (e) {
      toast.error("Failed to toggle item");
    }
    setToggling(null);
  };

  const completedCount = checklist.completed_items?.length || 0;
  const totalCount = CHECKLIST_ITEMS.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  // Group items by category
  const categories = [...new Set(CHECKLIST_ITEMS.map(item => item.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <KonaLoader size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="p-6 bg-gradient-to-br from-primary/20 to-purple-500/10 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Launch Readiness</h2>
            <p className="text-muted-foreground">Track your progress towards launch</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-primary">{progress}%</p>
            <p className="text-sm text-muted-foreground">{completedCount} of {totalCount} complete</p>
          </div>
        </div>
        <Progress value={progress} className="h-3" />
        
        {progress === 100 && (
          <div className="mt-4 p-3 bg-green-500/20 rounded-lg border border-green-500/30 flex items-center gap-3">
            <Check className="w-6 h-6 text-green-400" />
            <span className="font-medium text-green-400">🚀 Ready for Launch!</span>
          </div>
        )}
      </Card>

      {/* Category Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => {
          const categoryItems = CHECKLIST_ITEMS.filter(item => item.category === category);
          const categoryCompleted = categoryItems.filter(item => 
            checklist.completed_items?.includes(item.id)
          ).length;
          const categoryProgress = Math.round((categoryCompleted / categoryItems.length) * 100);
          
          return (
            <Card key={category} className="p-4 bg-white/5 border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">{category}</h3>
                <span className="text-xs text-muted-foreground">{categoryCompleted}/{categoryItems.length}</span>
              </div>
              <Progress value={categoryProgress} className="h-2" />
            </Card>
          );
        })}
      </div>

      {/* Checklist Items by Category */}
      {categories.map(category => (
        <Card key={category} className="p-6 bg-white/5 border-white/10">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            {category === "Technical Infrastructure" && <Server className="w-5 h-5 text-blue-400" />}
            {category === "Content Ready" && <Film className="w-5 h-5 text-purple-400" />}
            {category === "Payment Systems" && <DollarSign className="w-5 h-5 text-green-400" />}
            {category === "Legal & Compliance" && <Shield className="w-5 h-5 text-yellow-400" />}
            {category === "Marketing Ready" && <TrendingUp className="w-5 h-5 text-pink-400" />}
            {category === "Support Ready" && <Users className="w-5 h-5 text-cyan-400" />}
            {category}
          </h3>
          <div className="space-y-2">
            {CHECKLIST_ITEMS.filter(item => item.category === category).map(item => {
              const isCompleted = checklist.completed_items?.includes(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  disabled={toggling === item.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                    isCompleted 
                      ? 'bg-green-500/10 border border-green-500/30' 
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                  data-testid={`checklist-item-${item.id}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted ? 'bg-green-500' : 'border-2 border-gray-500'
                  }`}>
                    {toggling === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : isCompleted ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : null}
                  </div>
                  <span className={`flex-1 ${isCompleted ? 'text-green-400 line-through' : 'text-gray-300'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
};

// ============ SUBMISSIONS REVIEW TAB ============
const SubmissionsReviewTab = ({ token }) => {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("pending_review");
  
  // Review form state
  const [feedback, setFeedback] = useState("");
  const [scores, setScores] = useState({
    content_quality: 5,
    market_fit: 5,
    technical_quality: 5
  });

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/submissions?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmissions(res.data);
    } catch (e) {
      toast.error("Failed to fetch submissions");
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/submissions/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (e) {
      console.error("Failed to fetch stats");
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const startReview = async (submission) => {
    try {
      await axios.post(`${API}/admin/submissions/${submission.id}/start-review`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedSubmission({ ...submission, status: "under_review" });
    } catch (e) {
      // Already under review or processed
      setSelectedSubmission(submission);
    }
  };

  const submitReview = async (decision) => {
    if (!feedback.trim()) {
      toast.error("Please provide feedback");
      return;
    }
    
    setReviewing(true);
    try {
      await axios.post(
        `${API}/admin/submissions/${selectedSubmission.id}/review?decision=${decision}&feedback=${encodeURIComponent(feedback)}&content_quality_score=${scores.content_quality}&market_fit_score=${scores.market_fit}&technical_quality_score=${scores.technical_quality}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success(`Series ${decision === 'approved' ? 'approved' : 'rejected'}!`);
      setSelectedSubmission(null);
      setFeedback("");
      setScores({ content_quality: 5, market_fit: 5, technical_quality: 5 });
      fetchSubmissions();
      fetchStats();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit review");
    }
    setReviewing(false);
  };

  const totalScore = scores.content_quality + scores.market_fit + scores.technical_quality;

  // Detail View / Review Panel
  if (selectedSubmission) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedSubmission(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Submissions
        </button>

        {/* Series Info Header */}
        <Card className="p-6 bg-gradient-to-br from-primary/20 to-purple-500/10 border-primary/20">
          <div className="flex items-start justify-between">
            <div>
              <Badge className="mb-2">{selectedSubmission.genre}</Badge>
              <h2 className="text-2xl font-bold mb-1">{selectedSubmission.title}</h2>
              <p className="text-muted-foreground text-sm">
                by {selectedSubmission.creator_name} ({selectedSubmission.creator_email})
              </p>
            </div>
            <Badge variant={selectedSubmission.status === "pending_review" ? "secondary" : "default"}>
              {selectedSubmission.status === "pending_review" ? "Pending" : "Under Review"}
            </Badge>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pilot Video & Details */}
          <div className="space-y-4">
            {/* Pilot Video Player */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                Pilot Episode: {selectedSubmission.pilot_title}
              </h3>
              
              {selectedSubmission.pilot_video_url ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {selectedSubmission.pilot_video_url.includes("youtube") || 
                   selectedSubmission.pilot_video_url.includes("youtu.be") ? (
                    <iframe
                      src={selectedSubmission.pilot_video_url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                      className="w-full h-full"
                      allowFullScreen
                      title="Pilot Episode"
                    />
                  ) : selectedSubmission.pilot_video_url.includes("vimeo") ? (
                    <iframe
                      src={selectedSubmission.pilot_video_url.replace("vimeo.com", "player.vimeo.com/video")}
                      className="w-full h-full"
                      allowFullScreen
                      title="Pilot Episode"
                    />
                  ) : (
                    <video
                      src={selectedSubmission.pilot_video_url}
                      controls
                      className="w-full h-full"
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">No video URL provided</p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-3">
                {selectedSubmission.pilot_description}
              </p>
            </Card>

            {/* Series Details */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Series Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Audience</span>
                  <span>{selectedSubmission.target_audience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Content Rating</span>
                  <Badge variant="outline">{selectedSubmission.content_rating}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Language</span>
                  <span>{selectedSubmission.language?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Planned Seasons</span>
                  <span>{selectedSubmission.planned_seasons}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Episodes per Season</span>
                  <span>{selectedSubmission.episodes_per_season}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Release Schedule</span>
                  <span className="capitalize">{selectedSubmission.release_schedule}</span>
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{selectedSubmission.description}</p>
            </Card>

            {/* Unique Selling Point */}
            <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                Unique Selling Point
              </h3>
              <p className="text-sm">{selectedSubmission.unique_selling_point}</p>
            </Card>
          </div>

          {/* Right: Review Form */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Review Scores
              </h3>

              {/* Content Quality */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm">Content Quality</label>
                  <span className="text-sm font-bold text-primary">{scores.content_quality}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores.content_quality}
                  onChange={(e) => setScores(s => ({ ...s, content_quality: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">Video/audio quality, storytelling, production value</p>
              </div>

              {/* Market Fit */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm">Market Fit</label>
                  <span className="text-sm font-bold text-primary">{scores.market_fit}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores.market_fit}
                  onChange={(e) => setScores(s => ({ ...s, market_fit: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">Target audience appeal, genre demand, uniqueness</p>
              </div>

              {/* Technical Quality */}
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <label className="text-sm">Technical Quality</label>
                  <span className="text-sm font-bold text-primary">{scores.technical_quality}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={scores.technical_quality}
                  onChange={(e) => setScores(s => ({ ...s, technical_quality: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">Resolution, audio clarity, mobile compatibility</p>
              </div>

              {/* Total Score */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                <p className="text-sm text-muted-foreground">Total Score</p>
                <p className={`text-3xl font-bold ${totalScore >= 20 ? 'text-green-400' : totalScore >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {totalScore}/30
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalScore >= 20 ? 'Recommended for approval' : totalScore >= 15 ? 'Borderline - review carefully' : 'Below standards'}
                </p>
              </div>
            </Card>

            {/* Feedback */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Feedback for Creator</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Provide detailed feedback for the creator..."
                className="w-full h-32 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm resize-none focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This feedback will be sent to the creator
              </p>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => submitReview("rejected")}
                disabled={reviewing}
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                Reject
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => submitReview("approved")}
                disabled={reviewing}
              >
                {reviewing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Approve
              </Button>
            </div>

            {/* Quick Actions */}
            <Card className="p-3 bg-blue-500/10 border-blue-500/20">
              <p className="text-xs text-blue-400">
                <strong>Tip:</strong> Approved series will be published to the main content library with the pilot episode available for free viewing.
              </p>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{stats.pending_review}</p>
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{stats.under_review}</p>
                <p className="text-xs text-muted-foreground">Under Review</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-red-500/10 border-red-500/20">
            <div className="flex items-center gap-3">
              <X className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["pending_review", "under_review", "approved", "rejected", "all"].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === status 
                ? 'bg-primary text-white' 
                : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
            }`}
          >
            {status === "pending_review" ? "Pending" : 
             status === "under_review" ? "In Review" :
             status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <KonaLoader size={48} />
        </div>
      ) : submissions.length === 0 ? (
        <Card className="p-8 text-center">
          <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No submissions found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map(sub => (
            <Card 
              key={sub.id} 
              className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
              onClick={() => startReview(sub)}
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-20 h-28 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                  {sub.thumbnail_url ? (
                    <img src={sub.thumbnail_url} alt={sub.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{sub.title}</h3>
                    <Badge variant="outline" className="flex-shrink-0">{sub.genre}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    by {sub.creator_name} • Pilot: {sub.pilot_title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {sub.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>{sub.planned_seasons} season(s)</span>
                    <span>{sub.episodes_per_season} eps/season</span>
                    <span className="capitalize">{sub.release_schedule}</span>
                  </div>
                </div>

                {/* Status & Action */}
                <div className="text-right flex-shrink-0">
                  <Badge variant={
                    sub.status === "pending_review" ? "secondary" :
                    sub.status === "under_review" ? "default" :
                    sub.status === "approved" ? "default" : "destructive"
                  } className={sub.status === "approved" ? "bg-green-600" : ""}>
                    {sub.status === "pending_review" ? "Pending" :
                     sub.status === "under_review" ? "In Review" :
                     sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(sub.submitted_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};



// Investment Calculator Tab Component (Embedded)
const InvestmentCalculatorTab = ({ token }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [inputs, setInputs] = useState({
    current_users: 1000,
    target_users: 100000,
    monthly_growth_rate: 0.15,
    months_to_project: 24,
    initial_investment: 50000
  });

  const calculateProjections = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/investment/calculate`, inputs);
      setResult(res.data);
    } catch (e) {
      console.error("Failed to calculate:", e);
    }
    setLoading(false);
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          Investment Projection Parameters
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Current Users</label>
            <Input type="number" value={inputs.current_users} onChange={(e) => setInputs({...inputs, current_users: parseInt(e.target.value) || 0})} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Target Users</label>
            <Input type="number" value={inputs.target_users} onChange={(e) => setInputs({...inputs, target_users: parseInt(e.target.value) || 0})} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Initial Investment ($)</label>
            <Input type="number" value={inputs.initial_investment} onChange={(e) => setInputs({...inputs, initial_investment: parseInt(e.target.value) || 0})} className="bg-white/5 border-white/10" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Monthly Growth: {(inputs.monthly_growth_rate * 100).toFixed(0)}%</label>
            <Slider value={[inputs.monthly_growth_rate * 100]} max={50} min={5} step={1} onValueChange={([v]) => setInputs({...inputs, monthly_growth_rate: v / 100})} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Projection: {inputs.months_to_project} months</label>
            <Slider value={[inputs.months_to_project]} max={60} min={6} step={6} onValueChange={([v]) => setInputs({...inputs, months_to_project: v})} />
          </div>
          <div className="flex items-end">
            <Button onClick={calculateProjections} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
              Calculate
            </Button>
          </div>
        </div>
      </Card>

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
              <p className="text-xs text-muted-foreground">Final Users</p>
              <p className="text-2xl font-bold text-blue-400">{formatNumber(result.summary.final_users)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(result.summary.total_revenue)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
              <p className="text-xs text-muted-foreground">Net Profit</p>
              <p className={`text-2xl font-bold ${result.summary.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(result.summary.net_profit)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/20">
              <p className="text-xs text-muted-foreground">Break-Even</p>
              <p className="text-2xl font-bold text-yellow-400">{result.break_even_month ? `Month ${result.break_even_month}` : 'N/A'}</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-blue-400" />User Growth</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={result.projections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Area type="monotone" dataKey="users" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-green-400" />Revenue vs Costs</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.projections}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="month" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                    <Line type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="costs" stroke="#ef4444" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Key Metrics */}
          <Card className="p-6 bg-white/5 border-white/10">
            <h3 className="font-semibold mb-4">Key Unit Economics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">LTV</p><p className="text-lg font-bold text-green-400">{formatCurrency(result.key_metrics.lifetime_value)}</p></div>
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">CAC</p><p className="text-lg font-bold text-red-400">{formatCurrency(result.key_metrics.customer_acquisition_cost)}</p></div>
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">LTV:CAC</p><p className={`text-lg font-bold ${result.key_metrics.ltv_cac_ratio >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>{result.key_metrics.ltv_cac_ratio}x</p></div>
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">Churn</p><p className="text-lg font-bold text-yellow-400">{result.key_metrics.monthly_churn_rate}</p></div>
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">Margin</p><p className="text-lg font-bold text-blue-400">{result.key_metrics.gross_margin}</p></div>
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">ARPU</p><p className="text-lg font-bold text-purple-400">{formatCurrency(result.key_metrics.avg_revenue_per_user)}</p></div>
              <div className="p-3 bg-white/5 rounded-lg"><p className="text-xs text-muted-foreground">Payback</p><p className="text-lg font-bold text-cyan-400">{result.key_metrics.payback_period_months} mo</p></div>
            </div>
          </Card>

          {/* Recommendations */}
          <Card className="p-6 bg-white/5 border-white/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />Recommendations</h3>
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// Revenue Settings Tab Component - Manage expenses, creator tiers, payouts
const RevenueSettingsTab = ({ token }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calcGross, setCalcGross] = useState(100);
  const [calcViews, setCalcViews] = useState(50000);
  const [calcResult, setCalcResult] = useState(null);
  const [pendingPayouts, setPendingPayouts] = useState(null);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/revenue/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(res.data);
    } catch (e) {
      console.error(e);
      // Use defaults if not configured
      setSettings({
        expenses: { payment_gateway: 4, cdn_hosting: 8, content_moderation: 3, total: 15 },
        creator_tiers: [
          { name: "New Creator", min_views: 0, max_views: 10000, share: 65 },
          { name: "Rising Star", min_views: 10001, max_views: 100000, share: 68 },
          { name: "Verified Creator", min_views: 100001, max_views: 1000000, share: 70 },
          { name: "Premium Partner", min_views: 1000001, max_views: null, share: 75 }
        ],
        min_payout_threshold: 10,
        payout_cycle_days: 7
      });
    }
    setLoading(false);
  };

  const fetchPendingPayouts = async () => {
    try {
      const res = await axios.get(`${API}/revenue/payouts/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingPayouts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchPendingPayouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/revenue/settings`, {
        expenses: {
          payment_gateway: settings.expenses.payment_gateway,
          cdn_hosting: settings.expenses.cdn_hosting,
          content_moderation: settings.expenses.content_moderation
        },
        creator_tiers: settings.creator_tiers,
        min_payout_threshold: settings.min_payout_threshold,
        payout_cycle_days: settings.payout_cycle_days
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Revenue settings saved!");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    }
    setSaving(false);
  };

  const updateExpense = (field, value) => {
    const newExpenses = { ...settings.expenses, [field]: parseFloat(value) || 0 };
    newExpenses.total = newExpenses.payment_gateway + newExpenses.cdn_hosting + newExpenses.content_moderation;
    setSettings({ ...settings, expenses: newExpenses });
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...settings.creator_tiers];
    newTiers[index] = { ...newTiers[index], [field]: field === 'name' ? value : (parseFloat(value) || 0) };
    setSettings({ ...settings, creator_tiers: newTiers });
  };

  const calculateRevenue = async () => {
    try {
      const res = await axios.post(`${API}/revenue/calculate?gross_revenue=${calcGross}&total_views=${calcViews}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCalcResult(res.data);
    } catch (e) {
      toast.error("Calculation failed");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <KonaLoader size={48} />
      </div>
    );
  }

  const totalExpense = settings?.expenses?.total || 15;
  const platformShare = 100 - (settings?.creator_tiers?.[0]?.share || 65);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Distribution Settings</h2>
          <p className="text-gray-400">Configure expenses, creator shares, and payout rules</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving} className="bg-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save All Settings
        </Button>
      </div>

      {/* Revenue Flow Visualization */}
      <Card className="p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          Revenue Flow (Current Settings)
        </h3>
        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <div className="text-3xl font-bold text-white">100%</div>
            <div className="text-sm text-gray-400">Gross Revenue</div>
          </div>
          <div className="text-2xl text-gray-500">→</div>
          <div className="flex-1">
            <div className="text-3xl font-bold text-red-400">-{totalExpense}%</div>
            <div className="text-sm text-gray-400">System Expenses</div>
          </div>
          <div className="text-2xl text-gray-500">→</div>
          <div className="flex-1">
            <div className="text-3xl font-bold text-blue-400">{(100 - totalExpense).toFixed(0)}%</div>
            <div className="text-sm text-gray-400">Net Revenue</div>
          </div>
          <div className="text-2xl text-gray-500">→</div>
          <div className="flex-1">
            <div className="text-3xl font-bold text-green-400">{settings?.creator_tiers?.[0]?.share || 65}%</div>
            <div className="text-sm text-gray-400">Creator Share</div>
          </div>
          <div className="text-2xl text-gray-500">+</div>
          <div className="flex-1">
            <div className="text-3xl font-bold text-yellow-400">{platformShare}%</div>
            <div className="text-sm text-gray-400">Platform Share</div>
          </div>
        </div>
        <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-sm text-yellow-300">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            <strong>Note:</strong> Free coins and rewards do NOT count towards creator payouts. Only purchased coins generate revenue.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Settings */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-red-400" />
            System Expenses
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Payment Gateway Fees (%)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={settings?.expenses?.payment_gateway || 0}
                  onChange={(e) => updateExpense('payment_gateway', e.target.value)}
                  className="bg-white/5 border-white/20"
                />
                <span className="text-gray-400 text-sm w-40">Stripe, M-Pesa, etc.</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">CDN & Hosting (%)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={settings?.expenses?.cdn_hosting || 0}
                  onChange={(e) => updateExpense('cdn_hosting', e.target.value)}
                  className="bg-white/5 border-white/20"
                />
                <span className="text-gray-400 text-sm w-40">Video streaming costs</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Content Moderation (%)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="20"
                  value={settings?.expenses?.content_moderation || 0}
                  onChange={(e) => updateExpense('content_moderation', e.target.value)}
                  className="bg-white/5 border-white/20"
                />
                <span className="text-gray-400 text-sm w-40">Review & compliance</span>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total Expenses</span>
                <span className={`text-2xl font-bold ${totalExpense > 20 ? 'text-red-400' : 'text-green-400'}`}>
                  {totalExpense.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Creator Tiers */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            Creator Revenue Tiers
          </h3>
          <div className="space-y-3">
            {settings?.creator_tiers?.map((tier, index) => (
              <div key={index} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <Input
                    value={tier.name}
                    onChange={(e) => updateTier(index, 'name', e.target.value)}
                    className="bg-transparent border-none p-0 font-bold text-white w-40"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">Share:</span>
                    <Input
                      type="number"
                      min="50"
                      max="90"
                      value={tier.share}
                      onChange={(e) => updateTier(index, 'share', e.target.value)}
                      className="w-20 bg-white/10 border-white/20 text-center"
                    />
                    <span className="text-green-400 font-bold">%</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>Views:</span>
                  <Input
                    type="number"
                    value={tier.min_views}
                    onChange={(e) => updateTier(index, 'min_views', e.target.value)}
                    className="w-24 h-6 bg-white/5 border-white/10 text-xs"
                  />
                  <span>to</span>
                  <Input
                    type="number"
                    value={tier.max_views || ''}
                    placeholder="∞"
                    onChange={(e) => updateTier(index, 'max_views', e.target.value)}
                    className="w-24 h-6 bg-white/5 border-white/10 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Revenue Calculator */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          Revenue Calculator
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Gross Revenue ($)</label>
            <Input
              type="number"
              value={calcGross}
              onChange={(e) => setCalcGross(parseFloat(e.target.value) || 0)}
              className="bg-white/5 border-white/20"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Creator&apos;s Total Views</label>
            <Input
              type="number"
              value={calcViews}
              onChange={(e) => setCalcViews(parseInt(e.target.value) || 0)}
              className="bg-white/5 border-white/20"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={calculateRevenue} className="w-full bg-blue-600 hover:bg-blue-700">
              Calculate Split
            </Button>
          </div>
        </div>

        {calcResult && (
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-white">${calcResult.gross_revenue}</div>
                <div className="text-xs text-gray-400">Gross Revenue</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">-${calcResult.expenses.amount}</div>
                <div className="text-xs text-gray-400">Expenses ({calcResult.expenses.total_percent}%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">${calcResult.creator.amount}</div>
                <div className="text-xs text-gray-400">Creator ({calcResult.creator.tier} - {calcResult.creator.share_percent}%)</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-400">${calcResult.platform.amount}</div>
                <div className="text-xs text-gray-400">Platform ({calcResult.platform.share_percent}%)</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Pending Payouts */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-400" />
          Pending Creator Payouts
        </h3>
        {pendingPayouts?.pending_payouts?.length > 0 ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400 pb-2 border-b border-white/10">
              <span>Creator</span>
              <span>Pending Amount</span>
              <span>Status</span>
            </div>
            {pendingPayouts.pending_payouts.map((payout, i) => (
              <div key={i} className="flex justify-between items-center py-2">
                <div>
                  <div className="font-medium">{payout.name}</div>
                  <div className="text-xs text-gray-400">{payout.email}</div>
                </div>
                <div className="text-green-400 font-bold">${payout.pending_amount}</div>
                <Badge variant={payout.eligible ? "default" : "outline"}>
                  {payout.eligible ? "Ready" : `Min $${pendingPayouts.min_threshold}`}
                </Badge>
              </div>
            ))}
            <div className="pt-4 border-t border-white/10 flex justify-between">
              <span className="text-gray-400">Total Pending</span>
              <span className="text-xl font-bold text-green-400">${pendingPayouts.total_pending}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-400 text-center py-4">No pending payouts</p>
        )}
      </Card>

      {/* Payout Settings */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h3 className="font-bold mb-4">Payout Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Minimum Payout Threshold ($)</label>
            <Input
              type="number"
              value={settings?.min_payout_threshold || 10}
              onChange={(e) => setSettings({ ...settings, min_payout_threshold: parseFloat(e.target.value) || 0 })}
              className="bg-white/5 border-white/20"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Payout Cycle (Days)</label>
            <Input
              type="number"
              value={settings?.payout_cycle_days || 7}
              onChange={(e) => setSettings({ ...settings, payout_cycle_days: parseInt(e.target.value) || 7 })}
              className="bg-white/5 border-white/20"
            />
          </div>
        </div>
      </Card>
    </div>
  );
};

// Infrastructure Calculator Tab Component - 99% Uptime Affordable Approach
const InfrastructureCalculatorTab = ({ token }) => {
  const [totalUsers, setTotalUsers] = useState(10000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateInfrastructure = async () => {
    if (totalUsers < 100) {
      toast.error("Please enter at least 100 users");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API}/infrastructure/calculate`, {
        total_users: totalUsers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Transform snake_case to camelCase for frontend consistency
      const data = response.data;
      setResult({
        users: data.users,
        compute: {
          requestsPerSecond: data.compute.requests_per_second,
          recommendedInstances: data.compute.recommended_instances,
          serverType: data.compute.server_type,
          cost: data.compute.cost
        },
        database: {
          storageGB: data.database.storage_gb,
          connections: data.database.connections,
          type: data.database.type,
          cost: data.database.cost
        },
        cdn: {
          storageTB: data.cdn.storage_tb,
          bandwidthTB: data.cdn.bandwidth_tb,
          provider: data.cdn.provider,
          cost: data.cdn.cost
        },
        monitoring: {
          tools: data.monitoring.tools,
          cost: data.monitoring.cost
        },
        backup: {
          strategy: data.backup.strategy,
          cost: data.backup.cost
        },
        totalCost: {
          monthly: data.total_cost.monthly,
          yearly: data.total_cost.yearly,
          perUser: data.total_cost.per_user
        },
        uptimeComponents: data.uptime_components,
        affordableTips: data.affordable_tips
      });
      toast.success("Infrastructure calculated successfully!");
    } catch (err) {
      console.error("Infrastructure calculation error:", err);
      setError(err.response?.data?.detail || "Failed to calculate infrastructure");
      toast.error("Failed to calculate infrastructure");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-purple-500/10 border-blue-500/20">
        <h2 className="font-semibold text-xl mb-2 flex items-center gap-2">
          <Server className="w-6 h-6 text-blue-400" />
          Infrastructure Calculator for 99% Uptime
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your total user count to get an affordable infrastructure plan that ensures 99%+ uptime
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-2 block">Total Users</label>
            <Input 
              type="number" 
              value={totalUsers} 
              onChange={(e) => setTotalUsers(parseInt(e.target.value) || 0)} 
              className="bg-white/5 border-white/10 text-2xl h-14 font-bold"
              placeholder="Enter total users"
            />
          </div>
          <Button onClick={calculateInfrastructure} size="lg" className="h-14 px-8" disabled={loading}>
            {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Cpu className="w-5 h-5 mr-2" />}
            {loading ? "Calculating..." : "Calculate Infrastructure"}
          </Button>
        </div>
      </Card>

      {result && (
        <>
          {/* Cost Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
              <p className="text-xs text-muted-foreground">Monthly Cost</p>
              <p className="text-3xl font-bold text-green-400">{formatCurrency(result.totalCost.monthly)}</p>
              <p className="text-xs text-green-300 mt-1">Total infrastructure</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
              <p className="text-xs text-muted-foreground">Cost Per User</p>
              <p className="text-3xl font-bold text-blue-400">${result.totalCost.perUser.toFixed(3)}</p>
              <p className="text-xs text-blue-300 mt-1">Per user/month</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
              <p className="text-xs text-muted-foreground">Concurrent Users</p>
              <p className="text-3xl font-bold text-purple-400">{result.users.concurrent.toLocaleString()}</p>
              <p className="text-xs text-purple-300 mt-1">Peak capacity</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/20">
              <p className="text-xs text-muted-foreground">Video Streams</p>
              <p className="text-3xl font-bold text-yellow-400">{result.users.streaming.toLocaleString()}</p>
              <p className="text-xs text-yellow-300 mt-1">Simultaneous</p>
            </Card>
          </div>

          {/* Infrastructure Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Compute */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                Compute (Servers)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Recommendation</span><span className="font-medium">{result.compute.serverType.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><Badge variant="outline">{result.compute.serverType.provider}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Specs</span><span>{result.compute.serverType.specs}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Instances Needed</span><span className="font-bold">{result.compute.recommendedInstances}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Requests/sec Capacity</span><span>{result.compute.requestsPerSecond}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/10"><span className="font-medium">Monthly Cost</span><span className="font-bold text-green-400">{formatCurrency(result.compute.cost)}</span></div>
              </div>
            </Card>

            {/* Database */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Database
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Recommendation</span><span className="font-medium">{result.database.type.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><Badge variant="outline">{result.database.type.tier}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Storage Needed</span><span>{result.database.storageGB} GB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Connections</span><span>{result.database.connections}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/10"><span className="font-medium">Monthly Cost</span><span className="font-bold text-green-400">{formatCurrency(result.database.cost)}</span></div>
              </div>
            </Card>

            {/* CDN */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                CDN & Video Delivery
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><span className="font-medium">{result.cdn.provider.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Why</span><span className="text-sm text-right max-w-[200px]">{result.cdn.provider.reason}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Video Storage</span><span>{result.cdn.storageTB} TB</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bandwidth/Month</span><span>{result.cdn.bandwidthTB} TB</span></div>
                <div className="flex justify-between pt-2 border-t border-white/10"><span className="font-medium">Monthly Cost</span><span className="font-bold text-green-400">{formatCurrency(result.cdn.cost)}</span></div>
              </div>
            </Card>

            {/* Monitoring & Backup */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-400" />
                Monitoring & Backup
              </h3>
              <div className="space-y-3">
                <div><span className="text-muted-foreground">Monitoring Tools:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{result.monitoring.tools.map((t, i) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}</div>
                </div>
                <div className="flex justify-between"><span className="text-muted-foreground">Backup Strategy</span><span className="text-sm text-right max-w-[200px]">{result.backup.strategy}</span></div>
                <div className="flex justify-between pt-2 border-t border-white/10"><span className="font-medium">Combined Cost</span><span className="font-bold text-green-400">{formatCurrency(result.monitoring.cost + result.backup.cost)}</span></div>
              </div>
            </Card>
          </div>

          {/* 99% Uptime Components */}
          <Card className="p-6 bg-white/5 border-white/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-400" />
              99% Uptime Architecture Components
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.uptimeComponents.map((item, i) => (
                <div key={i} className="p-4 bg-white/5 rounded-lg">
                  <p className="font-medium text-sm">{item.component}</p>
                  <p className="text-xs text-primary mt-1">{item.solution}</p>
                  <p className="text-xs text-muted-foreground mt-2">{item.impact}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Affordable Tips */}
          <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Cost-Saving Tips (Affordable Approach)
            </h3>
            <div className="space-y-3">
              {result.affordableTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg">
                  <Badge variant="outline" className={`flex-shrink-0 ${tip.priority === 'HIGH' ? 'border-green-500 text-green-400' : 'border-yellow-500 text-yellow-400'}`}>
                    {tip.priority}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{tip.tip}</p>
                    <p className="text-xs text-green-400 mt-1">Savings: {tip.savings}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Summary */}
          <Card className="p-6 bg-gradient-to-br from-primary/20 to-purple-500/10 border-primary/20">
            <h3 className="font-semibold mb-4">Summary: Affordable 99% Uptime for {totalUsers.toLocaleString()} Users</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Monthly Budget Breakdown:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Servers (Hetzner)</span><span>{formatCurrency(result.compute.cost)}</span></div>
                  <div className="flex justify-between"><span>Database (MongoDB Atlas)</span><span>{formatCurrency(result.database.cost)}</span></div>
                  <div className="flex justify-between"><span>CDN (Bunny.net)</span><span>{formatCurrency(result.cdn.cost)}</span></div>
                  <div className="flex justify-between"><span>Monitoring & Backup</span><span>{formatCurrency(result.monitoring.cost + result.backup.cost)}</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t border-white/10"><span>Total Monthly</span><span className="text-green-400">{formatCurrency(result.totalCost.monthly)}</span></div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Key Points:</p>
                <ul className="text-sm space-y-1">
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />99% uptime achievable</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />Budget-friendly providers</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />Scalable architecture</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" />Auto-recovery systems</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

// Engagement Seeding Tab Component - Launch Traction
const EngagementSeedingTab = ({ token }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  
  // Seeding parameters
  const [likesRange, setLikesRange] = useState({ min: 500, max: 5000 });
  const [viewsRange, setViewsRange] = useState({ min: 1000, max: 50000 });
  const [seriesViewsRange, setSeriesViewsRange] = useState({ min: 5000, max: 250000 });
  const [ratingRange, setRatingRange] = useState({ min: 4.0, max: 4.9 });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/seed/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
    } catch (e) {
      console.error("Failed to fetch seed status:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const seedLikes = async () => {
    setSeeding(true);
    try {
      const res = await axios.post(
        `${API}/admin/seed/likes?min_likes=${likesRange.min}&max_likes=${likesRange.max}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(res.data.message);
      fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to seed likes");
    }
    setSeeding(false);
  };

  const seedViews = async () => {
    setSeeding(true);
    try {
      const res = await axios.post(
        `${API}/admin/seed/views?min_views=${viewsRange.min}&max_views=${viewsRange.max}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(res.data.message);
      fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to seed views");
    }
    setSeeding(false);
  };

  const seedSeriesStats = async () => {
    setSeeding(true);
    try {
      const res = await axios.post(
        `${API}/admin/seed/series-stats?min_views=${seriesViewsRange.min}&max_views=${seriesViewsRange.max}&min_rating=${ratingRange.min}&max_rating=${ratingRange.max}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(res.data.message);
      fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to seed series stats");
    }
    setSeeding(false);
  };

  const clearAllSeeds = async () => {
    if (!window.confirm("Are you sure you want to clear ALL seeded data? This will reset likes, views, and ratings to organic values only.")) {
      return;
    }
    setClearing(true);
    try {
      const res = await axios.delete(`${API}/admin/seed/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      fetchStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to clear seeds");
    }
    setClearing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <KonaLoader size={48} />
      </div>
    );
  }

  const episodesSeeded = status?.episodes?.with_base_likes > 0 || status?.episodes?.with_base_views > 0;
  const seriesSeeded = status?.series?.with_base_views > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-pink-500/20 to-purple-500/10 border-pink-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-pink-400" />
              Launch Engagement Seeding
            </h2>
            <p className="text-muted-foreground mt-1">
              Artificially boost likes, views, and ratings to create initial traction for platform launch
            </p>
          </div>
          <Badge variant="outline" className={episodesSeeded || seriesSeeded ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-gray-500/20 text-gray-400"}>
            {episodesSeeded || seriesSeeded ? "Seeding Active" : "Not Seeded"}
          </Badge>
        </div>
      </Card>

      {/* Current Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <Film className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-muted-foreground">Total Episodes</span>
          </div>
          <p className="text-2xl font-bold">{status?.episodes?.total || 0}</p>
        </Card>
        <Card className="p-4 bg-pink-500/10 border-pink-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-5 h-5 text-pink-400" />
            <span className="text-sm text-muted-foreground">With Base Likes</span>
          </div>
          <p className="text-2xl font-bold text-pink-400">{status?.episodes?.with_base_likes || 0}</p>
        </Card>
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Eye className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-muted-foreground">With Base Views</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{status?.episodes?.with_base_views || 0}</p>
        </Card>
        <Card className="p-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-3 mb-2">
            <Play className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-muted-foreground">Series with Stats</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{status?.series?.with_base_views || 0} / {status?.series?.total || 0}</p>
        </Card>
      </div>

      {/* Seeding Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seed Episode Likes */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Seed Episode Likes
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add base like counts to all episodes. These likes are added to real user likes in the UI.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Minimum Likes: {likesRange.min.toLocaleString()}
              </label>
              <Slider
                value={[likesRange.min]}
                min={100}
                max={5000}
                step={100}
                onValueChange={([v]) => setLikesRange(prev => ({ ...prev, min: v }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Maximum Likes: {likesRange.max.toLocaleString()}
              </label>
              <Slider
                value={[likesRange.max]}
                min={1000}
                max={20000}
                step={500}
                onValueChange={([v]) => setLikesRange(prev => ({ ...prev, max: v }))}
              />
            </div>
            
            <Button 
              onClick={seedLikes} 
              disabled={seeding}
              className="w-full bg-pink-600 hover:bg-pink-700"
              data-testid="seed-likes-btn"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Heart className="w-4 h-4 mr-2" />}
              Seed {status?.episodes?.total || 0} Episodes with Likes
            </Button>
          </div>
        </Card>

        {/* Seed Episode Views */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-400" />
            Seed Episode Views
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add base view counts to all episodes for social proof.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Minimum Views: {viewsRange.min.toLocaleString()}
              </label>
              <Slider
                value={[viewsRange.min]}
                min={500}
                max={25000}
                step={500}
                onValueChange={([v]) => setViewsRange(prev => ({ ...prev, min: v }))}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Maximum Views: {viewsRange.max.toLocaleString()}
              </label>
              <Slider
                value={[viewsRange.max]}
                min={5000}
                max={100000}
                step={1000}
                onValueChange={([v]) => setViewsRange(prev => ({ ...prev, max: v }))}
              />
            </div>
            
            <Button 
              onClick={seedViews} 
              disabled={seeding}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="seed-views-btn"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              Seed {status?.episodes?.total || 0} Episodes with Views
            </Button>
          </div>
        </Card>

        {/* Seed Series Stats */}
        <Card className="p-6 bg-white/5 border-white/10 lg:col-span-2">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Play className="w-5 h-5 text-purple-400" />
            Seed Series Stats (Views & Ratings)
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add base view counts and ratings to all series for credibility.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Min Series Views: {seriesViewsRange.min.toLocaleString()}
                </label>
                <Slider
                  value={[seriesViewsRange.min]}
                  min={1000}
                  max={100000}
                  step={1000}
                  onValueChange={([v]) => setSeriesViewsRange(prev => ({ ...prev, min: v }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Max Series Views: {seriesViewsRange.max.toLocaleString()}
                </label>
                <Slider
                  value={[seriesViewsRange.max]}
                  min={50000}
                  max={500000}
                  step={10000}
                  onValueChange={([v]) => setSeriesViewsRange(prev => ({ ...prev, max: v }))}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Min Rating: {ratingRange.min.toFixed(1)}
                </label>
                <Slider
                  value={[ratingRange.min * 10]}
                  min={30}
                  max={48}
                  step={1}
                  onValueChange={([v]) => setRatingRange(prev => ({ ...prev, min: v / 10 }))}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">
                  Max Rating: {ratingRange.max.toFixed(1)}
                </label>
                <Slider
                  value={[ratingRange.max * 10]}
                  min={35}
                  max={50}
                  step={1}
                  onValueChange={([v]) => setRatingRange(prev => ({ ...prev, max: v / 10 }))}
                />
              </div>
            </div>
          </div>
          
          <Button 
            onClick={seedSeriesStats} 
            disabled={seeding}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
            data-testid="seed-series-btn"
          >
            {seeding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Seed {status?.series?.total || 0} Series with Stats
          </Button>
        </Card>
      </div>

      {/* Clear All Seeds */}
      <Card className="p-6 bg-red-500/10 border-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Clear All Seeded Data
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Remove all seeded likes, views, and ratings. Only organic engagement will remain.
            </p>
          </div>
          <Button 
            variant="destructive" 
            onClick={clearAllSeeds}
            disabled={clearing}
            data-testid="clear-seeds-btn"
          >
            {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Clear All Seeds
          </Button>
        </div>
      </Card>

      {/* Info Note */}
      <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-400">Important Notes</p>
            <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside space-y-1">
              <li>Seeded numbers are added to real user engagement in the UI</li>
              <li>Each episode/series gets a random value within the specified range</li>
              <li>Re-seeding will update existing base values with new random numbers</li>
              <li>Clearing seeds does not affect real user likes/views</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============ ADS APPROVAL TAB ============
const AdsApprovalTab = ({ token }) => {
  const [pendingAds, setPendingAds] = useState([]);
  const [pendingCampaigns, setPendingCampaigns] = useState([]);
  const [adsStats, setAdsStats] = useState(null);
  const [campaignAlerts, setCampaignAlerts] = useState([]);
  const [alertsUnread, setAlertsUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [activeSection, setActiveSection] = useState("ads"); // "ads", "campaigns", or "alerts"

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adsRes, campaignsRes, statsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/admin/ads/pending`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/admin/campaigns/pending`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/admin/ads/stats`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/admin/ads/alerts`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setPendingAds(adsRes.data);
      setPendingCampaigns(campaignsRes.data);
      setAdsStats(statsRes.data);
      setCampaignAlerts(alertsRes.data.alerts || []);
      setAlertsUnread(alertsRes.data.unread_count || 0);
    } catch (e) {
      console.error("Failed to fetch ads data:", e);
      toast.error("Failed to load advertising data");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleApproveAd = async (adId) => {
    setProcessingId(adId);
    try {
      await axios.post(`${API}/admin/ads/${adId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ad approved successfully!");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to approve ad");
    }
    setProcessingId(null);
  };

  const handleRejectAd = async (adId) => {
    setProcessingId(adId);
    try {
      await axios.post(`${API}/admin/ads/${adId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ad rejected");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to reject ad");
    }
    setProcessingId(null);
  };

  const handleApproveCampaign = async (campaignId) => {
    setProcessingId(campaignId);
    try {
      await axios.post(`${API}/admin/campaigns/${campaignId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Campaign approved and activated!");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to approve campaign");
    }
    setProcessingId(null);
  };

  const handleRejectCampaign = async (campaignId) => {
    setProcessingId(campaignId);
    try {
      await axios.post(`${API}/admin/campaigns/${campaignId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Campaign rejected and budget refunded");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to reject campaign");
    }
    setProcessingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <KonaLoader size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {adsStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-yellow-500/10 border-yellow-500/20">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{adsStats.ads.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Ads</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-blue-500/10 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Megaphone className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{adsStats.campaigns.pending}</p>
                <p className="text-xs text-muted-foreground">Pending Campaigns</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-green-500/10 border-green-500/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{adsStats.campaigns.active}</p>
                <p className="text-xs text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-purple-500/10 border-purple-500/20">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">${adsStats.total_ad_revenue}</p>
                <p className="text-xs text-muted-foreground">Total Ad Revenue</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Section Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection("ads")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === "ads" 
              ? 'bg-primary text-white' 
              : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
          }`}
          data-testid="ads-section-btn"
        >
          <Video className="w-4 h-4" />
          Ad Creatives ({pendingAds.length})
        </button>
        <button
          onClick={() => setActiveSection("campaigns")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === "campaigns" 
              ? 'bg-primary text-white' 
              : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
          }`}
          data-testid="campaigns-section-btn"
        >
          <Megaphone className="w-4 h-4" />
          Campaigns ({pendingCampaigns.length})
        </button>
        <button
          onClick={() => setActiveSection("alerts")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeSection === "alerts" 
              ? 'bg-primary text-white' 
              : 'bg-white/5 hover:bg-white/10 text-muted-foreground'
          }`}
          data-testid="alerts-section-btn"
        >
          <AlertTriangle className="w-4 h-4" />
          Alerts {alertsUnread > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs">{alertsUnread}</span>}
        </button>
      </div>

      {/* Pending Ads Section */}
      {activeSection === "ads" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Pending Ad Creatives</h3>
          {pendingAds.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p className="text-muted-foreground">No pending ads to review</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingAds.map(ad => (
                <Card key={ad.id} className="p-4 bg-white/5 border-white/10" data-testid={`pending-ad-${ad.id}`}>
                  <div className="flex items-start gap-4">
                    {/* Ad Preview */}
                    <div className="w-32 h-20 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {ad.creative_type === "video" ? (
                        <video
                          src={ad.media_url}
                          className="w-full h-full object-cover"
                          muted
                          onMouseEnter={(e) => e.target.play()}
                          onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                        />
                      ) : (
                        <img src={ad.media_url} alt={ad.name} className="w-full h-full object-cover" />
                      )}
                    </div>

                    {/* Ad Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{ad.name}</h4>
                        <Badge variant="outline" className="flex-shrink-0">{ad.creative_type}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {ad.advertiser?.company_name} • {ad.campaign?.name}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Duration: {ad.duration}s</span>
                        <span>CTA: {ad.call_to_action}</span>
                        {ad.click_url && (
                          <a href={ad.click_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                            <ExternalLink className="w-3 h-3" />
                            Link
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectAd(ad.id)}
                        disabled={processingId === ad.id}
                        data-testid={`reject-ad-${ad.id}`}
                      >
                        {processingId === ad.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveAd(ad.id)}
                        disabled={processingId === ad.id}
                        data-testid={`approve-ad-${ad.id}`}
                      >
                        {processingId === ad.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Campaigns Section */}
      {activeSection === "campaigns" && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Pending Campaigns</h3>
          {pendingCampaigns.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <p className="text-muted-foreground">No pending campaigns to review</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingCampaigns.map(campaign => (
                <Card key={campaign.id} className="p-4 bg-white/5 border-white/10" data-testid={`pending-campaign-${campaign.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    {/* Campaign Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{campaign.name}</h4>
                        <Badge variant="outline">{campaign.campaign_type}</Badge>
                        <Badge className="bg-purple-500/20 text-purple-300">{campaign.tier}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {campaign.advertiser?.company_name} ({campaign.advertiser?.email})
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="font-semibold text-green-400">${campaign.budget}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground">Daily Budget</p>
                          <p className="font-semibold">${campaign.daily_budget?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground">Placements</p>
                          <p className="font-semibold">{campaign.ad_placements?.join(', ')}</p>
                        </div>
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-xs text-muted-foreground">Ads Uploaded</p>
                          <p className="font-semibold">{campaign.ads_count} creative(s)</p>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Start: {new Date(campaign.start_date).toLocaleDateString()} 
                        {campaign.end_date && ` → End: ${new Date(campaign.end_date).toLocaleDateString()}`}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleApproveCampaign(campaign.id)}
                        disabled={processingId === campaign.id}
                        data-testid={`approve-campaign-${campaign.id}`}
                      >
                        {processingId === campaign.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectCampaign(campaign.id)}
                        disabled={processingId === campaign.id}
                        data-testid={`reject-campaign-${campaign.id}`}
                      >
                        {processingId === campaign.id ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <X className="w-4 h-4 mr-2" />
                        )}
                        Reject
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaign Alerts Section */}
      {activeSection === "alerts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Campaign Performance Alerts</h3>
            {alertsUnread > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    await axios.post(`${API}/admin/ads/alerts/mark-all-read`, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    fetchData();
                    toast.success("All alerts marked as read");
                  } catch (e) {
                    toast.error("Failed to mark alerts as read");
                  }
                }}
              >
                Mark all as read
              </Button>
            )}
          </div>
          
          {campaignAlerts.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-muted-foreground">No campaign alerts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Alerts appear when campaigns reach view milestones or budget thresholds
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaignAlerts.map(alert => (
                <Card 
                  key={alert.id} 
                  className={`p-4 border-white/10 ${
                    !alert.is_read_admin 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-white/5'
                  }`}
                  data-testid={`admin-alert-${alert.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        alert.alert_type === 'warning' 
                          ? 'bg-yellow-500/20' 
                          : 'bg-green-500/20'
                      }`}>
                        {alert.alert_type === 'warning' ? (
                          <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        ) : alert.metric === 'views' ? (
                          <Eye className="w-5 h-5 text-green-400" />
                        ) : alert.metric === 'impressions' ? (
                          <Target className="w-5 h-5 text-blue-400" />
                        ) : (
                          <DollarSign className="w-5 h-5 text-purple-400" />
                        )}
                      </div>
                      <div>
                        <p className={`text-sm ${!alert.is_read_admin ? 'text-white font-medium' : 'text-white/80'}`}>
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                          {alert.advertiser && (
                            <Badge variant="outline" className="text-xs">
                              {alert.advertiser.company_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!alert.is_read_admin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            await axios.post(`${API}/admin/ads/alerts/${alert.id}/read`, {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            fetchData();
                          } catch (e) {
                            toast.error("Failed to mark as read");
                          }
                        }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> Approving a campaign activates it for ad serving. Rejecting a campaign automatically refunds the reserved budget to the advertiser's wallet.
        </p>
      </Card>
    </div>
  );
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState([]);
  const [userGrowthData, setUserGrowthData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [topContent, setTopContent] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [creatorApplications, setCreatorApplications] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [currentDoc, setCurrentDoc] = useState(null);
  const [docsList, setDocsList] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activeDocId, setActiveDocId] = useState("production_guide");

  // Document definitions with icons and categories
  const documentConfig = [
    { id: "production_guide", name: "Production Guide", icon: "🚀", category: "P0 - Launch Critical", color: "red" },
    { id: "launch_checklist", name: "Launch Checklist", icon: "✅", category: "P0 - Launch Critical", color: "red" },
    { id: "marketing_plan", name: "Marketing Plan", icon: "📈", category: "P0 - Launch Critical", color: "red" },
    { id: "monetization_strategy", name: "Monetization Strategy", icon: "💰", category: "P0 - Launch Critical", color: "red" },
    { id: "legal_compliance", name: "Legal & Compliance", icon: "⚖️", category: "P0 - Launch Critical", color: "red" },
    { id: "kpi_metrics", name: "KPI & Metrics", icon: "📊", category: "P1 - First Month", color: "yellow" },
    { id: "content_strategy", name: "Content Strategy", icon: "🎬", category: "P1 - First Month", color: "yellow" },
    { id: "support_playbook", name: "Support Playbook", icon: "🎧", category: "P1 - First Month", color: "yellow" },
    { id: "crisis_management", name: "Crisis Management", icon: "🚨", category: "P1 - First Month", color: "yellow" },
    { id: "growth_retention", name: "Growth & Retention", icon: "🌱", category: "P2 - Scale", color: "green" },
    { id: "localization_expansion", name: "Localization Guide", icon: "🌍", category: "P2 - Scale", color: "green" },
    { id: "creator_partnership", name: "Creator Partnership", icon: "🤝", category: "P2 - Scale", color: "green" },
    { id: "security_data_protection", name: "Security & Data", icon: "🔒", category: "P2 - Scale", color: "green" },
    // New Documents
    { id: "investor_pitch_deck", name: "Investor Pitch Deck", icon: "💼", category: "P0 - Launch Critical", color: "red" },
    { id: "financial_projections", name: "Financial Projections", icon: "📉", category: "P0 - Launch Critical", color: "red" },
    { id: "competitor_analysis", name: "Competitor Analysis", icon: "🎯", category: "P1 - First Month", color: "yellow" },
    { id: "api_documentation", name: "API Documentation", icon: "📡", category: "P1 - First Month", color: "yellow" },
    { id: "disaster_recovery", name: "Disaster Recovery", icon: "🛡️", category: "P1 - First Month", color: "yellow" },
    { id: "content_moderation", name: "Content Moderation", icon: "👁️", category: "P1 - First Month", color: "yellow" },
    { id: "creator_payout_schedule", name: "Creator Payouts", icon: "💳", category: "P2 - Scale", color: "green" },
  ];

  const fetchDashboardData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch all dashboard data in parallel
      const [statsRes, usersRes, seriesRes, transRes, creatorsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users?limit=10`, { headers }),
        axios.get(`${API}/admin/series`, { headers }),
        axios.get(`${API}/admin/transactions?limit=20`, { headers }),
        axios.get(`${API}/admin/creator-applications`, { headers }).catch(() => ({ data: { applications: [] } }))
      ]);
      
      setStats(statsRes.data);
      setRecentUsers(usersRes.data.users || []);
      setTopContent(seriesRes.data.slice(0, 10) || []);
      setCreatorApplications(creatorsRes.data.applications || []);
      
      // Generate mock chart data (in production, fetch from API)
      generateChartData(statsRes.data);
      
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
      toast.error("Failed to load dashboard");
    }
    setLoading(false);
  };

  const generateChartData = (stats) => {
    // Revenue data (last 7/30 days)
    const days = timeRange === "7d" ? 7 : 30;
    const revenue = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      revenue.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: Math.floor(Math.random() * 500) + 100,
        subscriptions: Math.floor(Math.random() * 200) + 50,
        coins: Math.floor(Math.random() * 300) + 100
      });
    }
    setRevenueData(revenue);

    // User growth data
    const userGrowth = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      userGrowth.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newUsers: Math.floor(Math.random() * 50) + 10,
        activeUsers: Math.floor(Math.random() * 200) + 50
      });
    }
    setUserGrowthData(userGrowth);

    // Genre distribution
    setGenreData([
      { name: 'Romance', value: 35, color: '#ec4899' },
      { name: 'Drama', value: 25, color: '#8b5cf6' },
      { name: 'Thriller', value: 15, color: '#ef4444' },
      { name: 'Action', value: 15, color: '#f59e0b' },
      { name: 'Fantasy', value: 10, color: '#3b82f6' }
    ]);
  };

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/admin/login");
      return;
    }
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, timeRange]);

  const handleApproveCreator = async (creatorId) => {
    try {
      await axios.post(`${API}/admin/creator-applications/${creatorId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Creator approved!");
      fetchDashboardData();
    } catch (e) {
      toast.error("Failed to approve creator");
    }
  };

  const handleRejectCreator = async (creatorId) => {
    try {
      await axios.post(`${API}/admin/creator-applications/${creatorId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Creator rejected");
      fetchDashboardData();
    } catch (e) {
      toast.error("Failed to reject creator");
    }
  };

  // Fetch docs when docs tab is selected (must be before early return)
  useEffect(() => {
    const fetchDocsData = async () => {
      if (!user?.is_super_admin || activeTab !== "docs") return;
      setDocsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [docRes, healthRes] = await Promise.all([
          axios.get(`${API}/admin/docs/${activeDocId}`, { headers }),
          axios.get(`${API}/admin/system/health`, { headers })
        ]);
        setCurrentDoc(docRes.data);
        setSystemHealth(healthRes.data);
      } catch (e) {
        console.error("Error fetching docs:", e);
      }
      setDocsLoading(false);
    };
    fetchDocsData();
  }, [activeTab, user?.is_super_admin, activeDocId, token]);

  if (loading) {
    return <PageLoader message="Loading admin dashboard..." />;
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "content", label: "Content", icon: Film },
    { id: "submissions", label: "Submissions", icon: FileText },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "creators", label: "Creators", icon: Crown },
    { id: "ads", label: "Ads Approval", icon: Megaphone },
    { id: "support", label: "Support Tickets", icon: Ticket },
    ...(user?.is_super_admin ? [
      { id: "checklist", label: "Launch Checklist", icon: Check },
      { id: "seeding", label: "Engagement Seeding", icon: Sparkles },
      { id: "revenue-settings", label: "Revenue Settings", icon: CreditCard },
      { id: "exchange-rates", label: "Exchange Rates", icon: Globe },
      { id: "ab-testing", label: "A/B Testing", icon: FlaskConical },
      { id: "investment", label: "Investment Calculator", icon: Calculator },
      { id: "infrastructure", label: "Infrastructure Calculator", icon: Server },
      { id: "docs", label: "Docs & System", icon: FileText }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white" data-testid="admin-dashboard">
      {/* Desktop Sidebar */}
      <aside className="hidden xl:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-gray-950 border-r border-white/10 z-50">
        <div className="p-6 border-b border-white/10">
          <h1 className="font-heading text-xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Kona Platform Management</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
              data-testid={`admin-tab-${tab.id}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
        
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => navigate("/")} 
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Kona
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="xl:ml-64">
        {/* Mobile Header */}
        <div className="xl:hidden sticky top-0 z-50 bg-gray-950/95 backdrop-blur-sm border-b border-white/10">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate("/")} 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold">Admin Dashboard</h1>
                  <p className="text-xs text-muted-foreground">Kona Platform Management</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="xl:hidden px-4 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-all ${
                  activeTab === tab.id 
                    ? "bg-primary text-white" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden xl:block border-b border-white/10 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold capitalize">
                {tabs.find(t => t.id === activeTab)?.label || activeTab}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === "overview" && "Platform analytics and key metrics"}
                {activeTab === "users" && "Manage user accounts and activity"}
                {activeTab === "content" && "Content management and moderation"}
                {activeTab === "submissions" && "Review creator submissions"}
                {activeTab === "revenue" && "Revenue tracking and reports"}
                {activeTab === "creators" && "Manage creator applications"}
                {activeTab === "ads" && "Review and approve advertiser ads and campaigns"}
                {activeTab === "checklist" && "Pre-launch verification checklist"}
                {activeTab === "seeding" && "Boost engagement for launch traction"}
                {activeTab === "revenue-settings" && "Configure revenue distribution"}
                {activeTab === "exchange-rates" && "Dynamic exchange rates and margin revenue"}
                {activeTab === "ab-testing" && "Test pricing styles to optimize conversions"}
                {activeTab === "investment" && "Financial projections and ROI"}
                {activeTab === "infrastructure" && "Server and hosting requirements"}
                {activeTab === "docs" && "Platform documentation and guides"}
              </p>
            </div>
            {stats && (
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="font-heading text-xl font-bold text-blue-400">{stats.total_users?.toLocaleString() || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="font-heading text-xl font-bold text-green-400">${stats.total_revenue?.toLocaleString() || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 xl:px-8 pb-8 pt-4 xl:pt-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-green-400 flex items-center">
                    <ArrowUpRight className="w-3 h-3" />+12%
                  </span>
                </div>
                <p className="text-2xl font-bold">{stats?.total_users?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-green-400" />
                  <span className="text-xs text-green-400 flex items-center">
                    <ArrowUpRight className="w-3 h-3" />+8%
                  </span>
                </div>
                <p className="text-2xl font-bold">${stats?.total_revenue?.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Film className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-2xl font-bold">{stats?.total_series || 0}</p>
                <p className="text-xs text-muted-foreground">Total Series</p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Crown className="w-5 h-5 text-yellow-400" />
                </div>
                <p className="text-2xl font-bold">{stats?.active_subscriptions || 0}</p>
                <p className="text-xs text-muted-foreground">VIP Subscribers</p>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Revenue Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4">Revenue Overview</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#22c55e" 
                      fill="url(#colorRevenue)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              {/* User Growth Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4">User Growth</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                    />
                    <Bar dataKey="newUsers" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activeUsers" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Genre Distribution & Top Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Genre Pie Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4">Content by Genre</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={genreData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {genreData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-4">
                  {genreData.map((item, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.name}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Top Content */}
              <Card className="p-6 bg-white/5 border-white/10 lg:col-span-2">
                <h3 className="font-semibold mb-4">Top Performing Content</h3>
                <div className="space-y-3">
                  {topContent.slice(0, 5).map((series, i) => (
                    <div key={series.id} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary w-6">{i + 1}</span>
                      <img src={series.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{series.title}</p>
                        <p className="text-xs text-muted-foreground">{series.genre}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{series.views?.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">views</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4">Recent Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-white/10">
                      <th className="pb-3">User</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Coins</th>
                      <th className="pb-3">Subscription</th>
                      <th className="pb-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/5">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">
                              {u.name?.charAt(0) || u.email?.charAt(0)}
                            </div>
                            <span className="font-medium text-sm">{u.name || "No name"}</span>
                          </div>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">{u.email}</td>
                        <td className="py-3 text-sm text-yellow-400">{u.coins}</td>
                        <td className="py-3">
                          <Badge variant={u.subscription ? "default" : "outline"} className="text-xs">
                            {u.subscription || "Free"}
                          </Badge>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === "content" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4">All Series ({topContent.length})</h3>
              <div className="grid gap-4">
                {topContent.map(series => (
                  <div key={series.id} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <img src={series.thumbnail} alt="" className="w-16 h-20 object-cover rounded" />
                    <div className="flex-1">
                      <h4 className="font-medium">{series.title}</h4>
                      <p className="text-sm text-muted-foreground">{series.genre} • {series.total_episodes} episodes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{series.views?.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">views</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-400">{series.rating}</p>
                      <p className="text-xs text-muted-foreground">rating</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === "submissions" && (
          <SubmissionsReviewTab token={token} />
        )}

        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className="space-y-6">
            {/* Revenue Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4 bg-white/5 border-white/10">
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-green-400">$127.50</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold text-green-400">$892.30</p>
              </Card>
              <Card className="p-4 bg-white/5 border-white/10">
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-green-400">${stats?.total_revenue?.toLocaleString() || 0}</p>
              </Card>
            </div>

            {/* Revenue Breakdown Chart */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4">Revenue Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Line type="monotone" dataKey="coins" name="Coin Sales" stroke="#f59e0b" strokeWidth={2} />
                  <Line type="monotone" dataKey="subscriptions" name="Subscriptions" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Creators Tab */}
        {activeTab === "creators" && (
          <div className="space-y-6">
            {/* Pending Applications */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4">Pending Creator Applications</h3>
              {creatorApplications.filter(c => c.status === "pending").length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending applications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {creatorApplications.filter(c => c.status === "pending").map(creator => (
                    <div key={creator.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <p className="font-medium">{creator.name}</p>
                        <p className="text-sm text-muted-foreground">{creator.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Content: {creator.content_type} • Applied: {new Date(creator.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleApproveCreator(creator.id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => handleRejectCreator(creator.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Approved Creators */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4">Approved Creators</h3>
              <div className="space-y-3">
                {creatorApplications.filter(c => c.status === "approved").map(creator => (
                  <div key={creator.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">{creator.name}</p>
                        <p className="text-xs text-muted-foreground">{creator.content_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-400">{creator.total_earnings || 0}</p>
                      <p className="text-xs text-muted-foreground">earnings</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Ads Approval Tab */}
        {activeTab === "ads" && (
          <AdsApprovalTab token={token} />
        )}

        {/* Support Tickets Tab */}
        {activeTab === "support" && (
          <SupportTicketsModule />
        )}

        {/* Launch Checklist Tab (Super Admin Only) */}
        {activeTab === "checklist" && user?.is_super_admin && (
          <LaunchChecklistTab token={token} />
        )}

        {/* Engagement Seeding Tab (Super Admin Only) */}
        {activeTab === "seeding" && user?.is_super_admin && (
          <EngagementSeedingTab token={token} />
        )}

        {/* Revenue Settings Tab (Super Admin Only) */}
        {activeTab === "revenue-settings" && user?.is_super_admin && (
          <RevenueSettingsTab token={token} />
        )}

        {/* Exchange Rates Tab (Super Admin Only) */}
        {activeTab === "exchange-rates" && user?.is_super_admin && (
          <ExchangeRateManager token={token} />
        )}

        {/* A/B Testing Tab (Super Admin Only) */}
        {activeTab === "ab-testing" && user?.is_super_admin && (
          <ABTestingManager token={token} />
        )}

        {/* Investment Calculator Tab (Super Admin Only) */}
        {activeTab === "investment" && user?.is_super_admin && (
          <InvestmentCalculatorTab token={token} />
        )}

        {/* Infrastructure Calculator Tab (Super Admin Only) */}
        {activeTab === "infrastructure" && user?.is_super_admin && (
          <InfrastructureCalculatorTab token={token} />
        )}

        {/* Docs & System Tab (Super Admin Only) */}
        {activeTab === "docs" && user?.is_super_admin && (
          <div className="space-y-6">
            {docsLoading && !currentDoc ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* System Health Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Database className="w-5 h-5 text-green-400" />
                      <span className="font-medium">Database</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                      {systemHealth?.database?.status || "unknown"}
                    </Badge>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Server className="w-5 h-5 text-blue-400" />
                      <span className="font-medium">Cache</span>
                    </div>
                    <Badge variant="outline" className={`${systemHealth?.cache === 'connected' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                      {systemHealth?.cache || "disabled"}
                    </Badge>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      <span className="font-medium">Rate Limiting</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                      {systemHealth?.scaling_features?.rate_limiting || "enabled"}
                    </Badge>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                      <span className="font-medium">DB Stats</span>
                    </div>
                    <span className="text-sm text-gray-300">
                      {systemHealth?.collections?.users?.toLocaleString() || 0} users
                    </span>
                  </Card>
                </div>

                {/* Document Navigation and Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Document List Sidebar */}
                  <Card className="p-4 bg-white/5 border-white/10 lg:col-span-1">
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-gray-400">Business Documents</h3>
                    
                    {/* P0 - Launch Critical */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span>
                        P0 - Launch Critical
                      </p>
                      <div className="space-y-1">
                        {documentConfig.filter(d => d.category.includes("P0")).map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setActiveDocId(doc.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                              activeDocId === doc.id 
                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                : 'hover:bg-white/5 text-gray-300'
                            }`}
                          >
                            <span>{doc.icon}</span>
                            <span className="truncate">{doc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* P1 - First Month */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-yellow-400 mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        P1 - First Month
                      </p>
                      <div className="space-y-1">
                        {documentConfig.filter(d => d.category.includes("P1")).map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setActiveDocId(doc.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                              activeDocId === doc.id 
                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                : 'hover:bg-white/5 text-gray-300'
                            }`}
                          >
                            <span>{doc.icon}</span>
                            <span className="truncate">{doc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* P2 - Scale */}
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        P2 - Scale to 10M
                      </p>
                      <div className="space-y-1">
                        {documentConfig.filter(d => d.category.includes("P2")).map(doc => (
                          <button
                            key={doc.id}
                            onClick={() => setActiveDocId(doc.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                              activeDocId === doc.id 
                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                : 'hover:bg-white/5 text-gray-300'
                            }`}
                          >
                            <span>{doc.icon}</span>
                            <span className="truncate">{doc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {/* Document Content */}
                  <Card className="p-6 bg-white/5 border-white/10 lg:col-span-3">
                    {docsLoading ? (
                      <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2 text-lg">
                            <span className="text-2xl">{currentDoc?.icon || "📄"}</span>
                            {currentDoc?.title || "Select a document"}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {currentDoc?.category} • Updated: {currentDoc?.last_updated ? new Date(currentDoc.last_updated).toLocaleDateString() : "N/A"}
                          </Badge>
                        </div>
                        <div className="prose prose-invert prose-sm max-w-none overflow-auto max-h-[600px] pr-4 markdown-content">
                          <ReactMarkdown components={markdownComponents}>
                            {currentDoc?.content || "Select a document from the sidebar to view its contents."}
                          </ReactMarkdown>
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
