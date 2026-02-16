import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  TrendingUp, TrendingDown, Minus, Eye, Coins, Heart, Share2,
  Calendar, BarChart3, Clock, Users, Award, Loader2, Globe, 
  Smartphone, Monitor, Tablet, Activity, Target, Lightbulb, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { API } from "@/config";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";

const PERIODS = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom" }
];

export const CreatorAnalytics = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);

  const fetchAnalytics = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      let url = `${API}/creator/analytics?period=${period}`;
      if (period === "custom" && customStart && customEnd) {
        url += `&start_date=${customStart}&end_date=${customEnd}`;
      }
      
      const [analyticsRes, comparisonRes] = await Promise.all([
        axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
        period !== "custom" && period !== "all" 
          ? axios.get(`${API}/creator/analytics/compare?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve({ data: null })
      ]);
      
      setAnalytics(analyticsRes.data);
      setComparison(comparisonRes.data);
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setShowCustomDates(newPeriod === "custom");
  };

  const handleCustomSearch = () => {
    if (customStart && customEnd) {
      fetchAnalytics();
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num?.toString() || "0";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No analytics data available yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="creator-analytics">
      {/* Period Selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map(p => (
          <Button
            key={p.value}
            variant={period === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => handlePeriodChange(p.value)}
            data-testid={`period-${p.value}`}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      {showCustomDates && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-40"
                data-testid="custom-start-date"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-40"
                data-testid="custom-end-date"
              />
            </div>
            <Button onClick={handleCustomSearch} size="sm">
              Apply
            </Button>
          </div>
        </Card>
      )}

      {/* Summary Cards with Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
          <div className="flex items-center justify-between mb-1">
            <Eye className="w-5 h-5 text-blue-400" />
            {comparison?.growth && (
              <div className="flex items-center gap-1">
                {getTrendIcon(comparison.growth.views_trend)}
                <span className={`text-xs ${comparison.growth.views_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {comparison.growth.views_percent > 0 ? '+' : ''}{comparison.growth.views_percent}%
                </span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold">{formatNumber(analytics.summary.total_views)}</p>
          <p className="text-xs text-muted-foreground">Total Views</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
          <div className="flex items-center justify-between mb-1">
            <Coins className="w-5 h-5 text-yellow-400" />
            {comparison?.growth && (
              <div className="flex items-center gap-1">
                {getTrendIcon(comparison.growth.earnings_trend)}
                <span className={`text-xs ${comparison.growth.earnings_percent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {comparison.growth.earnings_percent > 0 ? '+' : ''}{comparison.growth.earnings_percent}%
                </span>
              </div>
            )}
          </div>
          <p className="text-2xl font-bold">{formatNumber(analytics.summary.total_earnings)}</p>
          <p className="text-xs text-muted-foreground">Earnings (coins)</p>
        </Card>

        <Card className="p-4">
          <Heart className="w-5 h-5 text-red-400 mb-1" />
          <p className="text-2xl font-bold">{formatNumber(analytics.summary.total_likes)}</p>
          <p className="text-xs text-muted-foreground">Total Likes</p>
        </Card>

        <Card className="p-4">
          <Share2 className="w-5 h-5 text-purple-400 mb-1" />
          <p className="text-2xl font-bold">{formatNumber(analytics.summary.total_shares)}</p>
          <p className="text-xs text-muted-foreground">Total Shares</p>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Avg Daily Views</span>
          </div>
          <p className="text-lg font-bold">{analytics.summary.avg_daily_views}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Avg Daily Earnings</span>
          </div>
          <p className="text-lg font-bold">{analytics.summary.avg_daily_earnings}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Unique Viewers</span>
          </div>
          <p className="text-lg font-bold">{formatNumber(analytics.metrics.unique_viewers)}</p>
        </Card>
        
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Engagement Rate</span>
          </div>
          <p className="text-lg font-bold">{analytics.summary.engagement_rate}%</p>
        </Card>
      </div>

      {/* Views Chart */}
      {analytics.charts.views.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4" /> Views Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.charts.views}>
                <defs>
                  <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666" 
                  tick={{ fill: '#999', fontSize: 10 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#3b82f6" 
                  fill="url(#viewsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Earnings Chart */}
      {analytics.charts.earnings.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-4 h-4 text-yellow-400" /> Earnings Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.charts.earnings}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666" 
                  tick={{ fill: '#999', fontSize: 10 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="earnings" 
                  stroke="#22c55e" 
                  fill="url(#earningsGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Top Episodes */}
      {analytics.top_episodes.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" /> Top Performing Episodes
          </h3>
          <div className="space-y-3">
            {analytics.top_episodes.slice(0, 5).map((ep, i) => (
              <div key={ep.episode_id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{ep.episode_code}</Badge>
                    <span className="text-sm font-medium truncate">{ep.title}</span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {ep.views}</span>
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {ep.earnings}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {ep.likes}</span>
                    <span className="flex items-center gap-1 text-green-400">{ep.engagement_rate}% eng.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Series Performance */}
      {analytics.series_performance.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Series Performance
          </h3>
          <div className="space-y-2">
            {analytics.series_performance.map((s) => (
              <div key={s.series_id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.total_episodes} episodes</p>
                </div>
                <div className="text-right">
                  <p className="text-sm flex items-center gap-1 justify-end">
                    <Eye className="w-3 h-3" /> {s.views}
                  </p>
                  <p className="text-xs text-yellow-400 flex items-center gap-1 justify-end">
                    <Coins className="w-3 h-3" /> {s.earnings}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Peak Performance */}
      {analytics.metrics.peak_day && (
        <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-sm text-muted-foreground">Best Day</p>
              <p className="font-bold">{new Date(analytics.metrics.peak_day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
              <p className="text-sm text-purple-400">{analytics.metrics.peak_views} views</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CreatorAnalytics;
