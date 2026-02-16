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
  const [audience, setAudience] = useState(null);
  const [realtime, setRealtime] = useState(null);
  const [contentAnalytics, setContentAnalytics] = useState(null);
  const [period, setPeriod] = useState("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];

  const fetchAnalytics = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      let url = `${API}/creator/analytics?period=${period}`;
      if (period === "custom" && customStart && customEnd) {
        url += `&start_date=${customStart}&end_date=${customEnd}`;
      }
      
      const [analyticsRes, comparisonRes, audienceRes, realtimeRes, contentRes] = await Promise.all([
        axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
        period !== "custom" && period !== "all" 
          ? axios.get(`${API}/creator/analytics/compare?period=${period}`, { headers: { Authorization: `Bearer ${token}` } })
          : Promise.resolve({ data: null }),
        axios.get(`${API}/creator/analytics/audience?period=${period}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`${API}/creator/analytics/realtime`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null })),
        axios.get(`${API}/creator/analytics/content?period=${period}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: null }))
      ]);
      
      setAnalytics(analyticsRes.data);
      setComparison(comparisonRes.data);
      setAudience(audienceRes.data);
      setRealtime(realtimeRes.data);
      setContentAnalytics(contentRes.data);
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
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
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
        <Button variant="outline" size="sm" onClick={fetchAnalytics} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
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

      {/* Real-time Stats Banner */}
      {realtime && (
        <Card className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-green-400 animate-pulse" />
            <span className="font-semibold text-green-400">Live Stats</span>
            <Badge variant="outline" className="text-[10px] text-green-400 border-green-400/30">
              Updated {new Date(realtime.timestamp).toLocaleTimeString()}
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-green-400">{realtime.live_stats.views_last_hour}</p>
              <p className="text-xs text-muted-foreground">Views (Last Hour)</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{realtime.live_stats.views_last_24h}</p>
              <p className="text-xs text-muted-foreground">Views (24h)</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{realtime.live_stats.active_viewers}</p>
              <p className="text-xs text-muted-foreground">Active Viewers</p>
            </div>
            {realtime.trending_now && (
              <div>
                <p className="text-sm font-medium truncate">{realtime.trending_now.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-yellow-400" /> Trending Now
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="audience" className="gap-2">
            <Users className="w-4 h-4" /> Audience
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-2">
            <Target className="w-4 h-4" /> Content
          </TabsTrigger>
          <TabsTrigger value="episodes" className="gap-2">
            <Award className="w-4 h-4" /> Episodes
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="space-y-6">
          {audience ? (
            <>
              {/* Geographic Distribution */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-4 h-4" /> Top Countries
                  </h3>
                  {audience.geographic.top_countries.length > 0 ? (
                    <div className="space-y-3">
                      {audience.geographic.top_countries.slice(0, 5).map((country, i) => (
                        <div key={country.code} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-sm font-bold">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{country.name}</span>
                              <span className="text-xs text-muted-foreground">{country.views} views</span>
                            </div>
                            <Progress 
                              value={(country.views / audience.geographic.top_countries[0].views) * 100} 
                              className="h-1.5"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No geographic data yet</p>
                  )}
                </Card>

                {/* Device Distribution */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4" /> Device Distribution
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(audience.devices).map(([device, data]) => ({
                            name: device.charAt(0).toUpperCase() + device.slice(1),
                            value: data.count,
                            percentage: data.percentage
                          })).filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {Object.entries(audience.devices).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center">
                      <Smartphone className="w-5 h-5 mx-auto text-purple-400 mb-1" />
                      <p className="text-lg font-bold">{audience.devices.mobile?.percentage || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Mobile</p>
                    </div>
                    <div className="text-center">
                      <Monitor className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                      <p className="text-lg font-bold">{audience.devices.desktop?.percentage || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Desktop</p>
                    </div>
                    <div className="text-center">
                      <Tablet className="w-5 h-5 mx-auto text-green-400 mb-1" />
                      <p className="text-lg font-bold">{audience.devices.tablet?.percentage || 0}%</p>
                      <p className="text-[10px] text-muted-foreground">Tablet</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Audience Segments */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Audience Segments
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-purple-500/10">
                    <p className="text-2xl font-bold text-purple-400">{audience.audience_segments.highly_engaged.count}</p>
                    <p className="text-xs text-muted-foreground">Highly Engaged</p>
                    <p className="text-[10px] text-purple-400/70">5+ episodes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-500/10">
                    <p className="text-2xl font-bold text-blue-400">{audience.audience_segments.moderately_engaged.count}</p>
                    <p className="text-xs text-muted-foreground">Moderate</p>
                    <p className="text-[10px] text-blue-400/70">2-4 episodes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-gray-500/10">
                    <p className="text-2xl font-bold">{audience.audience_segments.casual_viewers.count}</p>
                    <p className="text-xs text-muted-foreground">Casual</p>
                    <p className="text-[10px] text-muted-foreground/70">1 episode</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <p className="text-2xl font-bold text-green-400">{audience.retention.return_rate}%</p>
                    <p className="text-xs text-muted-foreground">Return Rate</p>
                    <p className="text-[10px] text-green-400/70">{audience.retention.returning_viewers} returning</p>
                  </div>
                </div>
              </Card>

              {/* Best Time to Post */}
              <Card className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-yellow-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Best Time to Post</p>
                    <p className="font-bold text-xl">{audience.watch_time.best_time_to_post}</p>
                    <p className="text-xs text-yellow-400/70">Based on your audience activity</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Audience data will appear as viewers watch your content</p>
            </Card>
          )}
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          {contentAnalytics ? (
            <>
              {/* Genre Performance */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4" /> Genre Performance
                </h3>
                {contentAnalytics.genre_performance.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contentAnalytics.genre_performance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="genre" stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="views" fill="#8b5cf6" name="Views" />
                        <Bar dataKey="earnings" fill="#22c55e" name="Earnings" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No genre data yet</p>
                )}
              </Card>

              {/* Episode Drop-off Analysis */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Episode Retention Analysis
                </h3>
                {contentAnalytics.episode_position_analysis.length > 0 ? (
                  <div className="space-y-2">
                    {contentAnalytics.episode_position_analysis.slice(0, 8).map((ep) => (
                      <div key={ep.episode_number} className="flex items-center gap-3">
                        <div className="w-12 text-xs text-muted-foreground">Ep {ep.episode_number}</div>
                        <div className="flex-1">
                          <Progress value={ep.retention_from_previous} className="h-2" />
                        </div>
                        <div className="w-20 text-right">
                          <span className={`text-xs ${ep.retention_from_previous >= 70 ? 'text-green-400' : ep.retention_from_previous >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {ep.retention_from_previous}% retention
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Upload more episodes to see retention data</p>
                )}
              </Card>

              {/* Insights */}
              <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" /> Insights & Recommendations
                </h3>
                <div className="space-y-3">
                  {contentAnalytics.insights.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                      <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center text-xs">
                        {i + 1}
                      </div>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Best Genre</p>
                    <p className="font-bold text-purple-400">{contentAnalytics.insights.best_performing_genre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Highest Drop-off</p>
                    <p className="font-bold text-red-400">Episode {contentAnalytics.insights.highest_drop_off}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Content analytics will appear as your content gets views</p>
            </Card>
          )}
        </TabsContent>

        {/* Episodes Tab */}
        <TabsContent value="episodes" className="space-y-6">
          {/* Top Episodes */}
          {analytics.top_episodes.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" /> Top Performing Episodes
              </h3>
              <div className="space-y-3">
                {analytics.top_episodes.slice(0, 10).map((ep, i) => (
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CreatorAnalytics;
