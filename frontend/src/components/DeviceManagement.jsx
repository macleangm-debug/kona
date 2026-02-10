import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Smartphone, Laptop, Tablet, Monitor, Globe, 
  LogOut, Loader2, AlertTriangle, CheckCircle, ChevronRight, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

const DeviceIcon = ({ type }) => {
  switch (type?.toLowerCase()) {
    case "mobile":
      return <Smartphone className="w-5 h-5" />;
    case "tablet":
      return <Tablet className="w-5 h-5" />;
    case "desktop":
      return <Monitor className="w-5 h-5" />;
    default:
      return <Globe className="w-5 h-5" />;
  }
};

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute
    if (diff < 60000) return "Just now";
    // Less than 1 hour
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    // Less than 24 hours
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    // Less than 7 days
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "Unknown";
  }
};

export const DeviceManagement = () => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [deviceLimit, setDeviceLimit] = useState(5);
  const [remainingSlots, setRemainingSlots] = useState(5);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [showLogoutAllDialog, setShowLogoutAllDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchSessions = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/auth/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(res.data.sessions || []);
      setDeviceLimit(res.data.device_limit || 5);
      setRemainingSlots(res.data.remaining_slots || 0);
      
      // Fetch upgrade options
      const limitRes = await axios.get(`${API}/auth/device-limit`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubscriptionTier(limitRes.data.subscription_tier || "free");
      setUpgradeOptions(limitRes.data.upgrade_options || []);
    } catch (e) {
      console.error("Failed to fetch sessions:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [token]);

  const logoutDevice = async (sessionId, deviceName) => {
    setLogoutLoading(sessionId);
    try {
      await axios.delete(`${API}/auth/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Logged out from ${deviceName || "device"}`);
      fetchSessions();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to logout device");
    }
    setLogoutLoading(null);
  };

  const logoutAllDevices = async () => {
    setLogoutAllLoading(true);
    try {
      const res = await axios.post(
        `${API}/auth/sessions/logout-all`,
        null,
        {
          params: { keep_current: true },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success(res.data.message);
      fetchSessions();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to logout all devices");
    }
    setLogoutAllLoading(false);
    setShowLogoutAllDialog(false);
  };

  const usagePercent = ((deviceLimit - remainingSlots) / deviceLimit) * 100;

  return (
    <>
      <div className="space-y-4">
        {/* Header with expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
          data-testid="device-management-toggle"
        >
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-cyan-400" />
            <div className="text-left">
              <p className="font-medium text-sm">Manage Devices</p>
              <p className="text-xs text-muted-foreground">
                {sessions.length} of {deviceLimit} devices active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={remainingSlots > 0 ? "outline" : "destructive"} className="text-xs">
              {remainingSlots} slots left
            </Badge>
            <ChevronRight className={`w-5 h-5 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {expanded && (
          <div className="pt-4 border-t border-white/10 space-y-4">
            {/* Usage Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Device usage</span>
                <span className={usagePercent >= 100 ? "text-red-400" : "text-green-400"}>
                  {sessions.length}/{deviceLimit}
                </span>
              </div>
              <Progress 
                value={usagePercent} 
                className={`h-2 ${usagePercent >= 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-cyan-500'}`}
              />
              {usagePercent >= 80 && usagePercent < 100 && (
                <p className="text-xs text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Approaching device limit
                </p>
              )}
              {usagePercent >= 100 && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Device limit reached - logout a device to login elsewhere
                </p>
              )}
            </div>

            {/* Device List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">
                No active sessions found
              </p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div 
                    key={session.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      session.is_current 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-secondary/30'
                    }`}
                    data-testid={`device-${session.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        session.is_current ? 'bg-primary/20 text-primary' : 'bg-white/10'
                      }`}>
                        <DeviceIcon type={session.device_type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">
                            {session.device_name || session.browser || "Unknown Device"}
                          </p>
                          {session.is_current && (
                            <Badge className="bg-primary/20 text-primary text-[10px] py-0">
                              This device
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{session.os}</span>
                          {session.location && (
                            <>
                              <span>•</span>
                              <span>{session.location}</span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Last active: {formatDate(session.last_active)}
                        </p>
                      </div>
                    </div>
                    
                    {!session.is_current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => logoutDevice(session.id, session.device_name)}
                        disabled={logoutLoading === session.id}
                        data-testid={`logout-device-${session.id}`}
                      >
                        {logoutLoading === session.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {sessions.length > 1 && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={fetchSessions}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setShowLogoutAllDialog(true)}
                >
                  <LogOut className="w-3 h-3 mr-1" />
                  Logout All Others
                </Button>
              </div>
            )}

            {/* Info */}
            <p className="text-[10px] text-muted-foreground text-center pt-2">
              VIP subscribers can have up to 10 devices
            </p>
          </div>
        )}
      </div>

      {/* Logout All Confirmation Dialog */}
      <AlertDialog open={showLogoutAllDialog} onOpenChange={setShowLogoutAllDialog}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Log out from all other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will end all sessions except your current device. 
              Anyone using your account on other devices will need to log in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={logoutAllDevices}
              disabled={logoutAllLoading}
            >
              {logoutAllLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Log Out All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DeviceManagement;
