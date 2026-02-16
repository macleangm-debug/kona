import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Bell, CheckCircle, XCircle, Coins, Trophy, TrendingUp, 
  MessageCircle, Info, Clock, Loader2, Check, Trash2, Film
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { API } from "@/config";
import { toast } from "sonner";

const ICON_MAP = {
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  "coins": Coins,
  "dollar-sign": Coins,
  "trophy": Trophy,
  "award": Trophy,
  "trending-up": TrendingUp,
  "message-circle": MessageCircle,
  "info": Info,
  "clock": Clock,
  "film": Film,
  "gift": Trophy,
  "users": Info,
  "alert-circle": XCircle
};

const COLOR_MAP = {
  green: "text-green-400 bg-green-500/10",
  red: "text-red-400 bg-red-500/10",
  yellow: "text-yellow-400 bg-yellow-500/10",
  blue: "text-blue-400 bg-blue-500/10",
  purple: "text-purple-400 bg-purple-500/10",
  orange: "text-orange-400 bg-orange-500/10",
  amber: "text-amber-400 bg-amber-500/10",
  violet: "text-violet-400 bg-violet-500/10",
  pink: "text-pink-400 bg-pink-500/10",
  gray: "text-gray-400 bg-gray-500/10"
};

export const CreatorNotifications = ({ token, onUnreadCountChange }) => {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      const res = await axios.get(
        `${API}/notifications/list?unread_only=${showUnreadOnly}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
      
      if (onUnreadCountChange) {
        onUnreadCountChange(res.data.unread_count || 0);
      }
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, showUnreadOnly]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(
        `${API}/notifications/mark-read/${notificationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (onUnreadCountChange) {
        onUnreadCountChange(Math.max(0, unreadCount - 1));
      }
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.post(
        `${API}/notifications/mark-all-read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
      
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(
        `${API}/notifications/${notificationId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (onUnreadCountChange) {
          onUnreadCountChange(Math.max(0, unreadCount - 1));
        }
      }
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const clearAll = async () => {
    try {
      await axios.delete(
        `${API}/notifications/clear-all`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setNotifications([]);
      setUnreadCount(0);
      
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
      
      toast.success("All notifications cleared");
    } catch (e) {
      toast.error("Failed to clear notifications");
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="creator-notifications">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={!showUnreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnreadOnly(false)}
          >
            All ({notifications.length})
          </Button>
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnreadOnly(true)}
          >
            <Bell className="w-4 h-4 mr-1" />
            Unread ({unreadCount})
          </Button>
        </div>
        
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-1" /> Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAll}>
              <Trash2 className="w-4 h-4 mr-1" /> Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {showUnreadOnly ? "You have no unread notifications" : "You have no notifications yet"}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => {
            const IconComponent = ICON_MAP[notification.icon] || Info;
            const colorClass = COLOR_MAP[notification.color] || COLOR_MAP.gray;
            
            return (
              <Card 
                key={notification.id}
                className={`p-4 transition-all ${
                  notification.read ? "opacity-60" : "border-l-4 border-l-primary"
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-3 h-3 mr-1" /> Mark Read
                        </Button>
                      )}
                      {notification.action_url && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-xs text-primary"
                          onClick={() => {
                            markAsRead(notification.id);
                            window.location.href = notification.action_url;
                          }}
                        >
                          View Details
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-red-400 ml-auto"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CreatorNotifications;
