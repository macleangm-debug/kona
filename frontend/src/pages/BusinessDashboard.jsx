import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  Building2, BarChart3, DollarSign, Eye, MousePointer,
  TrendingUp, Plus, Settings, LogOut, ChevronRight,
  Play, Pause, Clock, CheckCircle, XCircle, AlertCircle,
  CreditCard, Target, Film, Megaphone, Users, Calendar,
  PieChart, Activity, Globe, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { API } from "@/config";
import { toast } from "sonner";

// Chart colors
const CHART_COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];
const STATUS_COLORS = {
  active: '#22c55e',
  paused: '#f59e0b', 
  pending_approval: '#3b82f6',
  completed: '#6b7280'
};

const TIER_COLORS = {
  basic: "bg-gray-500/20 text-gray-300",
  pro: "bg-blue-500/20 text-blue-400",
  premium: "bg-purple-500/20 text-purple-400",
  enterprise: "bg-yellow-500/20 text-yellow-400"
};

const STATUS_ICONS = {
  active: <Play className="w-4 h-4 text-green-400" />,
  paused: <Pause className="w-4 h-4 text-yellow-400" />,
  pending_approval: <Clock className="w-4 h-4 text-blue-400" />,
  completed: <CheckCircle className="w-4 h-4 text-gray-400" />,
  rejected: <XCircle className="w-4 h-4 text-red-400" />
};

export const BusinessDashboard = () => {
  const navigate = useNavigate();
  const [advertiser, setAdvertiser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("advertiser_token");

  useEffect(() => {
    if (!token) {
      navigate("/business/auth");
      return;
    }
    
    const storedAdvertiser = localStorage.getItem("advertiser");
    if (storedAdvertiser) {
      setAdvertiser(JSON.parse(storedAdvertiser));
    }
    
    fetchDashboardData();
  }, [token, navigate]);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, campaignsRes] = await Promise.all([
        axios.get(`${API}/advertiser/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/advertiser/campaigns`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setAnalytics(analyticsRes.data);
      setCampaigns(campaignsRes.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("advertiser_token");
        localStorage.removeItem("advertiser");
        navigate("/business/auth");
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("advertiser_token");
    localStorage.removeItem("advertiser");
    navigate("/business/auth");
    toast.success("Logged out successfully");
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-heading font-bold text-xl text-white">
              K<span className="text-primary">O</span>NA
            </Link>
            <span className="text-white/40">|</span>
            <span className="text-sm text-white/60">Business Portal</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge className={TIER_COLORS[advertiser?.tier || "basic"]}>
              {advertiser?.tier?.toUpperCase() || "BASIC"}
            </Badge>
            <div className="flex items-center gap-2 text-white">
              <Building2 className="w-5 h-5 text-primary" />
              <span className="font-medium">{advertiser?.company_name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome & Quick Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-heading font-bold text-white">
              Welcome back, {advertiser?.contact_name?.split(" ")[0]}!
            </h1>
            <p className="text-white/60">Manage your ad campaigns and track performance</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/business/billing")}>
              <CreditCard className="w-4 h-4 mr-2" />
              Add Funds (${analytics?.balance?.toFixed(2) || "0.00"})
            </Button>
            <Button onClick={() => navigate("/business/campaigns/new")}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 bg-black/40 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <Eye className="w-8 h-8 text-blue-400" />
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(analytics?.total_impressions || 0)}</p>
            <p className="text-sm text-white/60">Total Impressions</p>
          </Card>
          
          <Card className="p-6 bg-black/40 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <Play className="w-8 h-8 text-green-400" />
              <span className="text-xs text-green-400">{analytics?.overall_view_rate || 0}%</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(analytics?.total_views || 0)}</p>
            <p className="text-sm text-white/60">Completed Views</p>
          </Card>
          
          <Card className="p-6 bg-black/40 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <MousePointer className="w-8 h-8 text-purple-400" />
              <span className="text-xs text-purple-400">{analytics?.overall_ctr || 0}% CTR</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(analytics?.total_clicks || 0)}</p>
            <p className="text-sm text-white/60">Total Clicks</p>
          </Card>
          
          <Card className="p-6 bg-black/40 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="w-8 h-8 text-yellow-400" />
              <span className="text-xs text-white/40">${analytics?.avg_cost_per_view?.toFixed(3) || "0.00"}/view</span>
            </div>
            <p className="text-3xl font-bold text-white">${analytics?.total_spent?.toFixed(2) || "0.00"}</p>
            <p className="text-sm text-white/60">Total Spent</p>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Campaigns List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-white">Your Campaigns</h2>
              <Link to="/business/campaigns" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            
            {campaigns.length === 0 ? (
              <Card className="p-12 bg-black/40 border-white/10 text-center">
                <Megaphone className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-lg font-medium text-white mb-2">No campaigns yet</h3>
                <p className="text-white/60 mb-6">Create your first ad campaign to start reaching viewers</p>
                <Button onClick={() => navigate("/business/campaigns/new")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {campaigns.slice(0, 5).map((campaign) => (
                  <Card 
                    key={campaign.id}
                    className="p-4 bg-black/40 border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => navigate(`/business/campaigns/${campaign.id}`)}
                    data-testid={`campaign-${campaign.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {STATUS_ICONS[campaign.status]}
                        <div>
                          <h3 className="font-medium text-white">{campaign.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-white/50 mt-1">
                            <span className="capitalize">{campaign.campaign_type}</span>
                            <span>•</span>
                            <span>${campaign.budget} budget</span>
                            <span>•</span>
                            <span>{campaign.impressions} impressions</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={`text-xs ${
                          campaign.status === "active" ? "border-green-500/50 text-green-400" :
                          campaign.status === "pending_approval" ? "border-blue-500/50 text-blue-400" :
                          campaign.status === "paused" ? "border-yellow-500/50 text-yellow-400" :
                          "border-white/20 text-white/50"
                        }`}>
                          {campaign.status.replace("_", " ")}
                        </Badge>
                        <ChevronRight className="w-5 h-5 text-white/40" />
                      </div>
                    </div>
                    
                    {/* Progress bar for budget spent */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs text-white/50 mb-1">
                        <span>Budget Used</span>
                        <span>${campaign.spent?.toFixed(2)} / ${campaign.budget}</span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6 bg-black/40 border-white/10">
              <h3 className="font-medium text-white mb-4">Account Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Account Tier</span>
                  <Badge className={TIER_COLORS[advertiser?.tier || "basic"]}>
                    {advertiser?.tier?.toUpperCase() || "BASIC"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Balance</span>
                  <span className="text-white font-medium">${analytics?.balance?.toFixed(2) || "0.00"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Active Campaigns</span>
                  <span className="text-white font-medium">{analytics?.active_campaigns || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Total Campaigns</span>
                  <span className="text-white font-medium">{analytics?.total_campaigns || 0}</span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full mt-4"
                onClick={() => navigate("/business/pricing")}
              >
                Upgrade Plan
              </Button>
            </Card>

            {/* Ad Formats */}
            <Card className="p-6 bg-black/40 border-white/10">
              <h3 className="font-medium text-white mb-4">Available Ad Formats</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <Film className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-sm text-white">Pre-roll</p>
                    <p className="text-xs text-white/50">5-10s before video</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <Target className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-sm text-white">Mid-roll</p>
                    <p className="text-xs text-white/50">During video playback</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <Users className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-sm text-white">Story Ads</p>
                    <p className="text-xs text-white/50">Full-screen vertical</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <Megaphone className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-sm text-white">Sponsorship</p>
                    <p className="text-xs text-white/50">"Brought to you by..."</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Help */}
            <Card className="p-6 bg-gradient-to-br from-primary/20 to-purple-600/20 border-primary/30">
              <h3 className="font-medium text-white mb-2">Need Help?</h3>
              <p className="text-sm text-white/70 mb-4">
                Our team is here to help you create effective campaigns.
              </p>
              <Button variant="outline" className="w-full border-white/20">
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessDashboard;
