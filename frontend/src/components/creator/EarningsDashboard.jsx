import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, TrendingDown, Coins, Eye, Clock, 
  RefreshCw, Calendar, ChevronDown, ArrowUpRight,
  DollarSign, Activity
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

export const EarningsDashboard = ({ token }) => {
  const [data, setData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState("30d");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRealtime = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/earnings/realtime`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (e) {
      console.error("Error fetching realtime earnings:", e);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/earnings/history?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistoryData(res.data);
    } catch (e) {
      console.error("Error fetching earnings history:", e);
    }
  }, [token, period]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchRealtime(), fetchHistory()]);
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchRealtime(), fetchHistory()]);
      setLoading(false);
    };
    init();
  }, [fetchRealtime, fetchHistory]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchRealtime, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRealtime]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const StatCard = ({ title, value, subValue, icon: Icon, trend, color = "primary" }) => (
    <Card className="bg-card border-white/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subValue && (
              <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(trend)}% vs yesterday</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Calculate max earnings for chart scaling
  const maxEarnings = data?.hourly_chart ? Math.max(...data.hourly_chart.map(h => h.earnings), 1) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Earnings Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Real-time revenue tracking • Last updated: {data?.last_updated ? new Date(data.last_updated).toLocaleTimeString() : 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "border-green-500/50" : ""}
          >
            <Activity className={`w-4 h-4 mr-2 ${autoRefresh ? "text-green-400" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Today" 
          value={data?.today?.earnings || 0}
          subValue={`${data?.today?.views || 0} views`}
          icon={DollarSign}
          color="green"
        />
        <StatCard 
          title="This Week" 
          value={data?.this_week?.earnings || 0}
          subValue={`${data?.this_week?.views || 0} views`}
          icon={Calendar}
          color="blue"
        />
        <StatCard 
          title="This Month" 
          value={data?.this_month?.earnings || 0}
          subValue={`${data?.this_month?.views || 0} views`}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard 
          title="All Time" 
          value={data?.total?.earnings || 0}
          subValue={`${data?.total?.views || 0} total views`}
          icon={Coins}
          color="yellow"
        />
      </div>

      {/* Hourly Chart */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Today's Hourly Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-end gap-1">
            {data?.hourly_chart?.map((hour, i) => {
              const height = maxEarnings > 0 ? (hour.earnings / maxEarnings) * 100 : 0;
              const isCurrentHour = new Date().getHours() === hour.hour;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1"
                  title={`${hour.label}: ${hour.earnings} coins (${hour.views} views)`}
                >
                  <div
                    className={`w-full rounded-t transition-all duration-300 ${
                      isCurrentHour 
                        ? "bg-primary" 
                        : hour.earnings > 0 
                          ? "bg-primary/60" 
                          : "bg-white/10"
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {i % 4 === 0 && (
                    <span className="text-[10px] text-muted-foreground">{hour.label}</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Period Selector & History Chart */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Earnings History
            </CardTitle>
            <div className="flex items-center gap-2">
              {["7d", "30d", "90d", "1y"].map(p => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className="text-xs"
                >
                  {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p === "90d" ? "90 Days" : "1 Year"}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {historyData?.summary && (
            <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-white/5 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground">Period Total</p>
                <p className="text-lg font-bold">{historyData.summary.total_earnings.toLocaleString()} coins</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Daily Average</p>
                <p className="text-lg font-bold">{historyData.summary.average_daily_earnings.toLocaleString()} coins</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Day</p>
                <p className="text-lg font-bold">
                  {historyData.summary.best_day?.earnings?.toLocaleString() || 0} coins
                </p>
                <p className="text-xs text-muted-foreground">
                  {historyData.summary.best_day?._id || "N/A"}
                </p>
              </div>
            </div>
          )}
          
          {/* Simple line representation */}
          {historyData?.data && historyData.data.length > 0 && (
            <div className="h-32 flex items-end gap-px">
              {historyData.data.slice(-60).map((day, i) => {
                const maxDay = Math.max(...historyData.data.map(d => d.earnings), 1);
                const height = (day.earnings / maxDay) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors cursor-pointer"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day._id}: ${day.earnings} coins`}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-green-400" />
            Recent Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data?.recent_transactions?.length > 0 ? (
              data.recent_transactions.map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Coins className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.episode_title || "Episode View"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.episode_code} • {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-400">+{tx.creator_share} coins</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.coins_spent} total spent
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No recent transactions yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EarningsDashboard;
