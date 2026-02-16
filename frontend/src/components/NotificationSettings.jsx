import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, Check, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import notificationService from "@/services/NotificationService";
import { toast } from "sonner";
import axios from "axios";
import { API } from "@/config";

export const NotificationSettings = () => {
  const { t } = useTranslation();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [settings, setSettings] = useState({
    new_episodes: true,
    daily_rewards: true,
    milestone_alerts: true,
    promotions: true
  });

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = async () => {
    const perm = notificationService.getPermissionStatus();
    setPermission(perm);
    
    if (perm === 'granted') {
      const subscribed = await notificationService.isSubscribed();
      setIsSubscribed(subscribed);
    }

    if (token) {
      try {
        const res = await axios.get(`${API}/notifications/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettings({
          new_episodes: res.data.new_episodes ?? true,
          daily_rewards: res.data.daily_rewards ?? true,
          milestone_alerts: res.data.milestone_alerts ?? true,
          promotions: res.data.promotions ?? true
        });
      } catch (e) {
        console.error(e);
      }
    }
    setLoading(false);
  };

  const handleEnableNotifications = async () => {
    setEnabling(true);
    try {
      const perm = await notificationService.requestPermission();
      setPermission(perm);

      if (perm === 'granted') {
        await notificationService.init();
        if (token) {
          await notificationService.subscribe(token);
        }
        setIsSubscribed(true);
        toast.success(t("notifications.enable") + " ✓");
        
        // Show welcome notification
        await notificationService.showLocalNotification("Kona Notifications", {
          body: "You'll now receive updates about new episodes and rewards!",
          tag: "welcome-notification"
        });
      } else if (perm === 'denied') {
        toast.error("Notifications blocked. Please enable in browser settings.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to enable notifications");
    }
    setEnabling(false);
  };

  const handleDisableNotifications = async () => {
    try {
      if (token) {
        await notificationService.unsubscribe(token);
      }
      setIsSubscribed(false);
      toast.success("Notifications disabled");
    } catch (error) {
      console.error(error);
    }
  };

  const updateSetting = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (token) {
      try {
        await axios.put(`${API}/notifications/settings`, newSettings, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error(e);
        // Revert on error
        setSettings(settings);
        toast.error("Failed to save setting");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const notificationOptions = [
    {
      key: "new_episodes",
      icon: "🎬",
      title: t("notifications.newEpisodes"),
      desc: t("notifications.newEpisodesDesc")
    },
    {
      key: "daily_rewards",
      icon: "🎁",
      title: t("notifications.dailyRewards"),
      desc: t("notifications.dailyRewardsDesc")
    },
    {
      key: "milestone_alerts",
      icon: "🏆",
      title: t("notifications.milestoneAlerts"),
      desc: t("notifications.milestoneAlertsDesc")
    },
    {
      key: "promotions",
      icon: "✨",
      title: t("notifications.promotions"),
      desc: t("notifications.promotionsDesc")
    }
  ];

  return (
    <div className="space-y-4" data-testid="notification-settings">
      {/* Permission Card */}
      {permission !== 'granted' && (
        <Card className="p-4 bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{t("notifications.enable")}</h3>
              <p className="text-sm text-gray-400 mt-1">
                {t("notifications.enableDescription")}
              </p>
              <Button 
                onClick={handleEnableNotifications}
                disabled={enabling || permission === 'denied'}
                className="mt-3 rounded-full"
                size="sm"
              >
                {enabling ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Bell className="w-4 h-4 mr-2" />
                )}
                {permission === 'denied' ? 'Blocked in Browser' : t("notifications.allow")}
              </Button>
              {permission === 'denied' && (
                <p className="text-xs text-red-400 mt-2">
                  Enable notifications in your browser settings to continue
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Subscribed Status */}
      {permission === 'granted' && (
        <Card className="p-4 bg-green-500/10 border-green-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="font-medium">Notifications Enabled</p>
                <p className="text-xs text-gray-400">You'll receive updates on this device</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisableNotifications}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <BellOff className="w-4 h-4 mr-1" />
              Disable
            </Button>
          </div>
        </Card>
      )}

      {/* Notification Type Settings */}
      {permission === 'granted' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400 px-1">Notification Types</h3>
          {notificationOptions.map((option) => (
            <Card key={option.key} className="p-3 bg-white/5 border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{option.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{option.title}</p>
                    <p className="text-xs text-gray-400">{option.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={settings[option.key]}
                  onCheckedChange={(checked) => updateSetting(option.key, checked)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Test Notification Button (Dev mode) */}
      {permission === 'granted' && process.env.NODE_ENV === 'development' && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => notificationService.showLocalNotification("Test Notification", {
            body: "This is a test notification from Kona!",
            tag: "test-notification"
          })}
          className="w-full"
        >
          Send Test Notification
        </Button>
      )}
    </div>
  );
};

export default NotificationSettings;
