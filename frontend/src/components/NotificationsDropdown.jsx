import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Bell, Check, Trash2, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

const NotificationItem = ({ notification, onMarkRead, onDelete, onClick }) => {
  const timeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const colorClasses = {
    violet: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
    yellow: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30",
    green: "from-green-500/20 to-emerald-500/20 border-green-500/30",
    blue: "from-blue-500/20 to-indigo-500/20 border-blue-500/30",
    pink: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
  };

  return (
    <div 
      className={`relative p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
        notification.read 
          ? "bg-white/5 border-white/10 opacity-60" 
          : `bg-gradient-to-r ${colorClasses[notification.color] || colorClasses.blue}`
      }`}
      onClick={() => onClick(notification)}
    >
      {!notification.read && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
          notification.read ? "bg-gray-700" : "bg-black/20"
        }`}>
          {notification.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-xs ${notification.read ? "text-gray-400" : "text-white"}`}>
              {notification.title}
            </h4>
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              {timeAgo(notification.created_at)}
            </span>
          </div>
          <p className={`text-[11px] mt-0.5 line-clamp-2 ${notification.read ? "text-gray-500" : "text-gray-300"}`}>
            {notification.message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
        {!notification.read && (
          <button
            className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead(notification.id);
            }}
          >
            <Check className="w-3 h-3" />
            Read
          </button>
        )}
        <button
          className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 ml-auto"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const NotificationsDropdown = ({ open, onClose, onAuthClick }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await axios.get(`${API}/notifications/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data.notifications?.slice(0, 10) || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

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
      toast.success("All marked as read");
    } catch (e) {
      toast.error("Failed");
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
    } catch (e) {
      toast.error("Failed to delete");
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      handleMarkRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  };

  const seedSampleNotifications = async () => {
    try {
      await axios.post(`${API}/notifications/seed-sample`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sample notifications added");
      fetchNotifications();
    } catch (e) {
      toast.error("Failed");
    }
  };

  if (!token) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-[400px] bg-card border-white/10">
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Sign in to view notifications</h3>
            <p className="text-sm text-gray-400 mb-4">Stay updated on new episodes and rewards</p>
            <Button onClick={() => { onClose(); onAuthClick?.(); }} className="rounded-full">
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[450px] max-h-[80vh] p-0 bg-card border-white/10 overflow-hidden" data-testid="notifications-dropdown">
        <Card className="bg-transparent border-0">
          <DialogHeader className="p-4 pb-2 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                <DialogTitle className="text-lg">Notifications</DialogTitle>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary text-xs rounded-full">{unreadCount}</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400 mb-4">No notifications yet</p>
                <Button variant="outline" size="sm" onClick={seedSampleNotifications} className="text-xs">
                  Load Samples
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
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
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDropdown;
