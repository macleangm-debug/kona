import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, Users, Film, CreditCard, TrendingUp, 
  DollarSign, Eye, Crown, Check, X, Clock, Loader2,
  BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  FileText, Server, Shield, Database
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

// Chart colors
const COLORS = ['#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'];

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

  useEffect(() => {
    fetchChecklist();
  }, [token]);

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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/admin/login");
      return;
    }
    fetchDashboardData();
  }, [user, navigate, timeRange]);

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "content", label: "Content", icon: Film },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "creators", label: "Creators", icon: Crown },
    ...(user?.is_super_admin ? [
      { id: "checklist", label: "Launch Checklist", icon: Check },
      { id: "investment", label: "Investment Calculator", icon: Calculator },
      { id: "infrastructure", label: "Infrastructure Calculator", icon: Server },
      { id: "docs", label: "Docs & System", icon: FileText }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white" data-testid="admin-dashboard">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-950/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
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

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
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
              data-testid={`admin-tab-${tab.id}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
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

        {/* Launch Checklist Tab (Super Admin Only) */}
        {activeTab === "checklist" && user?.is_super_admin && (
          <LaunchChecklistTab token={token} />
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
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-white mt-6 mb-4" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-xl font-bold text-white mt-5 mb-3 border-b border-white/10 pb-2" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-white mt-4 mb-2" {...props} />,
                              p: ({node, ...props}) => <p className="text-gray-300 mb-3" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="text-gray-300" {...props} />,
                              table: ({node, ...props}) => <div className="overflow-x-auto mb-4"><table className="min-w-full border border-white/10" {...props} /></div>,
                              thead: ({node, ...props}) => <thead className="bg-white/5" {...props} />,
                              th: ({node, ...props}) => <th className="px-4 py-2 text-left text-sm font-semibold border border-white/10" {...props} />,
                              td: ({node, ...props}) => <td className="px-4 py-2 text-sm border border-white/10" {...props} />,
                              code: ({node, inline, ...props}) => 
                                inline 
                                  ? <code className="bg-white/10 px-1.5 py-0.5 rounded text-purple-300 text-sm" {...props} />
                                  : <code className="block bg-black/30 p-4 rounded-lg overflow-x-auto text-sm text-green-300" {...props} />,
                              pre: ({node, ...props}) => <pre className="bg-black/30 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-400 my-4" {...props} />,
                              hr: ({node, ...props}) => <hr className="border-white/10 my-6" {...props} />,
                            }}
                          >
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
  );
};

export default AdminDashboard;
