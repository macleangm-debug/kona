import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, Send, Users, Crown, Star, Clock, Loader2, 
  ChevronDown, X, Check, Filter, Zap, Calendar
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const NotificationsManagementTab = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [stats, setStats] = useState(null);
  const [triggers, setTriggers] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  
  // Form state for sending notification
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    type: "info",
    segment: "all",
    action_url: "",
    priority: "normal"
  });

  // User segments
  const segments = [
    { id: "all", label: "All Users", icon: Users, description: "Every registered user" },
    { id: "vip", label: "VIP Users", icon: Crown, description: "Users with VIP status" },
    { id: "creators", label: "Creators", icon: Star, description: "Approved creator accounts" },
    { id: "inactive", label: "Inactive Users", icon: Clock, description: "Users who haven't watched in 7+ days" },
    { id: "new", label: "New Users", icon: Zap, description: "Users who joined in last 7 days" },
    { id: "high_spenders", label: "High Spenders", icon: Crown, description: "Users who spent 100+ coins" }
  ];

  // Notification types
  const notificationTypes = [
    { id: "info", label: "Info", color: "bg-blue-500" },
    { id: "success", label: "Success", color: "bg-green-500" },
    { id: "warning", label: "Warning", color: "bg-yellow-500" },
    { id: "promo", label: "Promo", color: "bg-purple-500" },
    { id: "content", label: "New Content", color: "bg-pink-500" }
  ];

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch notification stats
      const statsRes = await axios.get(`${API}/notifications/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsRes.data);
      
      // Fetch triggers
      const triggersRes = await axios.get(`${API}/notifications/admin/triggers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Convert triggers object to array
      const triggersObj = triggersRes.data.triggers || {};
      const triggersArray = Object.entries(triggersObj).map(([key, value]) => ({
        id: key,
        ...value
      }));
      setTriggers(triggersArray);
      
      // Fetch recent notifications
      const recentRes = await axios.get(`${API}/notifications/admin/recent?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentNotifications(recentRes.data.notifications || []);
      
    } catch (e) {
      console.error("Error fetching notification data:", e);
    }
    setLoading(false);
  };

  const sendNotification = async () => {
    if (!notificationForm.title || !notificationForm.message) {
      toast.error("Title and message are required");
      return;
    }
    
    setSending(true);
    try {
      const res = await axios.post(`${API}/notifications/admin/broadcast`, {
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        segment: notificationForm.segment,
        action_url: notificationForm.action_url || null,
        priority: notificationForm.priority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Notification sent to ${res.data.recipients_count || 0} users`);
      setNotificationForm({
        title: "",
        message: "",
        type: "info",
        segment: "all",
        action_url: "",
        priority: "normal"
      });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send notification");
    }
    setSending(false);
  };

  const toggleTrigger = async (triggerId, enabled) => {
    try {
      await axios.put(`${API}/notifications/admin/triggers/${triggerId}`, {
        enabled: enabled,
        config: {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Trigger ${enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (e) {
      toast.error("Failed to update trigger");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Bell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sent</p>
              <p className="text-2xl font-bold">{stats?.total_sent?.toLocaleString() || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Check className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Read Rate</p>
              <p className="text-2xl font-bold">{stats?.read_rate || 0}%</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Triggers</p>
              <p className="text-2xl font-bold">{triggers.filter(t => t.enabled).length}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today</p>
              <p className="text-2xl font-bold">{stats?.today || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Notification Form */}
        <Card className="p-6 border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Send Notification
          </h3>
          
          <div className="space-y-4">
            {/* Segment Selection */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Target Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {segments.map(seg => (
                  <button
                    key={seg.id}
                    onClick={() => setNotificationForm({...notificationForm, segment: seg.id})}
                    className={`p-3 rounded-lg text-left transition-all ${
                      notificationForm.segment === seg.id 
                        ? 'bg-primary/20 border-primary border' 
                        : 'bg-white/5 border-white/10 border hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <seg.icon className="w-4 h-4" />
                      <span className="font-medium text-sm">{seg.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{seg.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Notification Type */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Type</label>
              <div className="flex flex-wrap gap-2">
                {notificationTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setNotificationForm({...notificationForm, type: type.id})}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      notificationForm.type === type.id 
                        ? `${type.color} text-white` 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Title */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Title</label>
              <Input
                value={notificationForm.title}
                onChange={(e) => setNotificationForm({...notificationForm, title: e.target.value})}
                placeholder="Notification title..."
                className="bg-white/5 border-white/10"
              />
            </div>
            
            {/* Message */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Message</label>
              <textarea
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({...notificationForm, message: e.target.value})}
                placeholder="Write your notification message..."
                rows={3}
                className="w-full p-3 rounded-lg bg-white/5 border border-white/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            {/* Action URL (optional) */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Action URL (optional)</label>
              <Input
                value={notificationForm.action_url}
                onChange={(e) => setNotificationForm({...notificationForm, action_url: e.target.value})}
                placeholder="/series/xyz or https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            
            {/* Priority */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Priority</label>
              <div className="flex gap-2">
                {['low', 'normal', 'high'].map(p => (
                  <button
                    key={p}
                    onClick={() => setNotificationForm({...notificationForm, priority: p})}
                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-all ${
                      notificationForm.priority === p 
                        ? 'bg-primary text-white' 
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={sendNotification} 
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Notification
            </Button>
          </div>
        </Card>

        {/* Automated Triggers */}
        <Card className="p-6 border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Automated Triggers
          </h3>
          
          <div className="space-y-3">
            {triggers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No triggers configured yet.
              </p>
            ) : (
              triggers.map(trigger => {
                // Format trigger name from id (e.g., "new_episode" -> "New Episode")
                const formatName = (id) => id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                
                return (
                  <div 
                    key={trigger.id} 
                    className={`p-4 rounded-lg border ${
                      trigger.enabled ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{formatName(trigger.id)}</h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {trigger.title_template || trigger.message_template || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs capitalize border-white/20 text-gray-300">
                            {trigger.priority || 'normal'} priority
                          </Badge>
                          {trigger.updated_at && (
                            <span className="text-xs text-gray-500">
                              Updated: {new Date(trigger.updated_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTrigger(trigger.id, !trigger.enabled)}
                        className={`p-2 rounded-full transition-all ${
                          trigger.enabled 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                            : 'bg-white/10 text-gray-400 hover:bg-white/20'
                        }`}
                      >
                        {trigger.enabled ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Built-in triggers info */}
            <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="font-medium text-blue-400 mb-2">Built-in Triggers</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Welcome notification on registration</li>
                <li>• Daily login rewards reminder</li>
                <li>• New episode from followed series</li>
                <li>• Coin balance low warning</li>
                <li>• VIP status upgrade celebration</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card className="p-6 border-white/10">
        <h3 className="text-lg font-semibold mb-4">Recent Broadcasts</h3>
        <div className="space-y-3">
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notifications sent yet.
            </p>
          ) : (
            recentNotifications.map(notif => (
              <div key={notif.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{notif.title}</h4>
                      <Badge variant="outline" className="text-xs capitalize">
                        {notif.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{notif.recipients_count?.toLocaleString() || 0} users</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default NotificationsManagementTab;
