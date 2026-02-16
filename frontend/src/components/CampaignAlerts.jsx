import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Bell, BellRing, Check, CheckCheck, TrendingUp, 
  AlertTriangle, DollarSign, Eye, Target, X 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { API } from "@/config";
import { toast } from "sonner";

const getAlertIcon = (metric, alertType) => {
  if (alertType === "warning") return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  if (metric === "views") return <Eye className="w-4 h-4 text-green-400" />;
  if (metric === "impressions") return <Target className="w-4 h-4 text-blue-400" />;
  if (metric === "budget_percent") return <DollarSign className="w-4 h-4 text-purple-400" />;
  return <TrendingUp className="w-4 h-4 text-primary" />;
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export const CampaignAlerts = ({ token, isAdmin = false }) => {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchAlerts = async () => {
    try {
      const endpoint = isAdmin 
        ? `${API}/admin/ads/alerts` 
        : `${API}/advertiser/alerts`;
      
      const res = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAlerts(res.data.alerts || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchAlerts();
      // Poll for new alerts every 30 seconds
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [token, isAdmin]);

  const markAsRead = async (alertId) => {
    try {
      const endpoint = isAdmin 
        ? `${API}/admin/ads/alerts/${alertId}/read`
        : `${API}/advertiser/alerts/${alertId}/read`;
      
      await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, [isAdmin ? 'is_read_admin' : 'is_read_advertiser']: true }
          : a
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      toast.error("Failed to mark alert as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      const endpoint = isAdmin 
        ? `${API}/admin/ads/alerts/mark-all-read`
        : `${API}/advertiser/alerts/mark-all-read`;
      
      await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAlerts(prev => prev.map(a => ({
        ...a,
        [isAdmin ? 'is_read_admin' : 'is_read_advertiser']: true
      })));
      setUnreadCount(0);
      toast.success("All alerts marked as read");
    } catch (e) {
      toast.error("Failed to mark alerts as read");
    }
  };

  const isRead = (alert) => isAdmin ? alert.is_read_admin : alert.is_read_advertiser;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          data-testid="campaign-alerts-btn"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-yellow-400 animate-pulse" />
          ) : (
            <Bell className="w-5 h-5 text-white/60" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-gray-900 border-white/10" align="end">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-white">Campaign Alerts</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-white/60 hover:text-white"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-white/40">
              Loading...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-white/20" />
              <p className="text-white/40">No alerts yet</p>
              <p className="text-xs text-white/30 mt-1">
                You'll see notifications when campaigns hit milestones
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {alerts.slice(0, 20).map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 hover:bg-white/5 transition-colors ${
                    !isRead(alert) ? 'bg-primary/5' : ''
                  }`}
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      alert.alert_type === 'warning' 
                        ? 'bg-yellow-500/10' 
                        : 'bg-primary/10'
                    }`}>
                      {getAlertIcon(alert.metric, alert.alert_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!isRead(alert) ? 'text-white font-medium' : 'text-white/70'}`}>
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-white/40">
                          {formatTimeAgo(alert.created_at)}
                        </span>
                        {isAdmin && alert.advertiser && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {alert.advertiser.company_name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!isRead(alert) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(alert.id);
                        }}
                      >
                        <Check className="w-4 h-4 text-white/40 hover:text-green-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {alerts.length > 20 && (
          <div className="p-3 border-t border-white/10 text-center">
            <Button variant="ghost" size="sm" className="text-primary text-xs">
              View all {alerts.length} alerts
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default CampaignAlerts;
