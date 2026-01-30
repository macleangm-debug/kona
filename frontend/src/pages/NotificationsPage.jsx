import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Bell, Check, CheckCheck, Trash2, ChevronLeft, 
  Settings, Filter, X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { KonaLoader } from "@/components/SplashScreen";
import { toast } from "sonner";

const NotificationItem = ({ notification, onMarkRead, onDelete, onClick }) => {
  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const colorClasses = {
    violet: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
    yellow: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
    orange: "from-orange-500/20 to-red-500/20 border-orange-500/30",
    amber: "from-amber-500/20 to-yellow-500/20 border-amber-500/30",
    green: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    blue: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
    pink: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  };

  return (
    <div 
      className={`relative p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
        notification.read 
          ? "bg-white/5 border-white/10 opacity-70" 
          : `bg-gradient-to-r ${colorClasses[notification.color] || colorClasses.blue}`
      }`}
      onClick={() => onClick(notification)}
    >
      {/* Unread indicator */}
      {!notification.read && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
          notification.read ? "bg-gray-700" : "bg-black/20"
        }`}>
          {notification.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-sm ${notification.read ? "text-gray-400" : "text-white"}`}>
              {notification.title}
            </h4>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {timeAgo(notification.created_at)}
            </span>
          </div>
          <p className={`text-xs mt-1 ${notification.read ? "text-gray-500" : "text-gray-300"}`}>
            {notification.message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
        {!notification.read && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check className="w-3 h-3 mr-1" />
            Mark Read
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};

const NotificationsPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState("all"); // all, unread

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/notifications/list`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { unread_only: filter === "unread" }
      });
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (notificationId) => {
    try {
      await axios.post(`${API}/notifications/mark-read/${notificationId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (e) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await axios.delete(`${API}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const deleted = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (deleted && !deleted.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      toast.success("Notification deleted");
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications?")) return;
    
    try {
      await axios.delete(`${API}/notifications/clear-all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (e) {
      toast.error("Failed to clear notifications");
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const seedSampleNotifications = async () => {
    try {
      await axios.post(`${API}/notifications/seed-sample`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sample notifications created");
      fetchNotifications();
    } catch (e) {
      toast.error("Failed to create samples");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24 pb-20 px-4 lg:px-12 flex flex-col items-center justify-center">
        <Bell className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-bold mb-2">Sign in to view notifications</h2>
        <p className="text-gray-400 text-sm mb-4">Stay updated on new episodes, rewards, and more</p>
        <Button onClick={onAuthClick} className="rounded-full">
          Sign In
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <KonaLoader size={60} />
        <p className="mt-4 text-sm text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-24 pb-20 lg:pb-8" data-testid="notifications-page">
      {/* Header */}
      <div className="px-4 lg:px-12 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-heading text-xl lg:text-2xl font-bold">Notifications</h1>
              <p className="text-xs text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="text-xs"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filter & Actions Bar */}
      <div className="px-4 lg:px-12 mb-4">
        <Card className="p-3 flex items-center justify-between gap-2 flex-wrap">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "ghost"}
              onClick={() => setFilter("all")}
              className="text-xs h-8 rounded-full"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === "unread" ? "default" : "ghost"}
              onClick={() => setFilter("unread")}
              className="text-xs h-8 rounded-full"
            >
              Unread ({unreadCount})
            </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllRead}
                className="text-xs h-8"
              >
                <CheckCheck className="w-3 h-3 mr-1" />
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearAll}
                className="text-xs h-8 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="px-4 lg:px-12">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
              <Bell className="w-10 h-10 text-gray-600" />
            </div>
            <h3 className="font-semibold text-lg mb-2">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {filter === "unread" 
                ? "You've read all your notifications!" 
                : "When you receive notifications, they'll appear here."}
            </p>
            
            {/* Dev button to seed sample notifications */}
            <Button
              variant="outline"
              size="sm"
              onClick={seedSampleNotifications}
              className="text-xs"
            >
              Load Sample Notifications
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
                onClick={handleNotificationClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
