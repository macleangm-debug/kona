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
      </div>
    </div>
  );
};

export default AdminDashboard;
