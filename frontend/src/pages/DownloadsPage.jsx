import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Download, Trash2, Smartphone, Laptop, Tablet, ChevronLeft, 
  Loader2, Crown, Clock, AlertTriangle, CheckCircle, X, HardDrive,
  Play, Pause, RefreshCw, Wifi, WifiOff
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/SplashScreen";
import { API } from "@/config";
import { toast } from "sonner";
import { offlineManager } from "@/services/offlineManager";

const DeviceIcon = ({ type }) => {
  switch (type) {
    case "mobile": return <Smartphone className="w-5 h-5" />;
    case "tablet": return <Tablet className="w-5 h-5" />;
    default: return <Laptop className="w-5 h-5" />;
  }
};

export const DownloadsPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [localDownloads, setLocalDownloads] = useState([]);
  const [storageInfo, setStorageInfo] = useState({ usageInMB: 0, quotaInMB: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [downloadProgress, setDownloadProgress] = useState({});

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    initializeDownloads();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [token]);

  const initializeDownloads = async () => {
    try {
      // Initialize offline manager
      await offlineManager.init();
      
      // Fetch server status and local downloads in parallel
      const [serverStatus, localDls, storage] = await Promise.all([
        fetchServerStatus(),
        offlineManager.getAllDownloads(),
        offlineManager.getStorageInfo()
      ]);
      
      setLocalDownloads(localDls);
      setStorageInfo(storage);
    } catch (e) {
      console.error("Failed to initialize:", e);
    }
    setLoading(false);
  };

  const fetchServerStatus = async () => {
    try {
      const res = await axios.get(`${API}/downloads/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
      return res.data;
    } catch (e) {
      console.error("Failed to fetch server status:", e);
      return null;
    }
  };

  const refreshLocalDownloads = async () => {
    const localDls = await offlineManager.getAllDownloads();
    const storage = await offlineManager.getStorageInfo();
    setLocalDownloads(localDls);
    setStorageInfo(storage);
  };

  const removeDevice = async (deviceId) => {
    setActionLoading(deviceId);
    try {
      await axios.delete(`${API}/downloads/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Device removed");
      fetchServerStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to remove device");
    }
    setActionLoading(null);
  };

  const removeServerDownload = async (downloadId) => {
    setActionLoading(downloadId);
    try {
      await axios.delete(`${API}/downloads/${downloadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Download removed from server");
      fetchServerStatus();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to remove download");
    }
    setActionLoading(null);
  };

  const removeLocalDownload = async (downloadId) => {
    setActionLoading(downloadId);
    try {
      await offlineManager.deleteDownload(downloadId);
      toast.success("Local download removed");
      refreshLocalDownloads();
    } catch (e) {
      toast.error("Failed to remove local download");
    }
    setActionLoading(null);
  };

  const playOfflineVideo = async (download) => {
    try {
      const videoUrl = await offlineManager.getOfflineVideoUrl(download.id);
      // Navigate to video player with offline URL
      navigate(`/watch/${download.seriesId}/${download.episodeId}?offline=true&url=${encodeURIComponent(videoUrl)}`);
    } catch (e) {
      toast.error(e.message || "Failed to play offline video");
    }
  };

  const getDaysRemaining = (expiresAt) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const days = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  };

  if (loading) {
    return <PageLoader message="Loading downloads..." />;
  }

  return (
    <div className="min-h-screen bg-background pb-20 pt-16" data-testid="downloads-page">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-heading text-xl font-bold">Downloads</h1>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Badge variant="outline" className="text-green-400 border-green-400/30">
                <Wifi className="w-3 h-3 mr-1" /> Online
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
                <WifiOff className="w-3 h-3 mr-1" /> Offline
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* VIP Status Banner */}
        {!status?.is_vip ? (
          <Card className="p-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-full">
                <Crown className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">VIP Feature</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Offline downloads are available exclusively for VIP subscribers.
                  Download episodes and watch anywhere, anytime!
                </p>
                <Button 
                  className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-black"
                  onClick={() => navigate("/subscription")}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to VIP
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="font-medium text-green-400">VIP Active</span>
              <span className="text-sm text-gray-400">
                - Expires {new Date(status.subscription_end).toLocaleDateString()}
              </span>
            </div>
          </Card>
        )}

        {/* Storage Usage */}
        <Card className="p-4 bg-white/5 border-white/10">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Local Storage
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Used</span>
              <span>{storageInfo.usageInMB} MB / {storageInfo.quotaInMB} MB</span>
            </div>
            <Progress 
              value={storageInfo.quotaInMB > 0 ? (storageInfo.usageInMB / storageInfo.quotaInMB) * 100 : 0} 
              className="h-2"
            />
          </div>
        </Card>

        {/* Download Limits Info */}
        {status?.is_vip && (
          <Card className="p-4 bg-white/5 border-white/10">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download Limits
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Devices</p>
                <p className="font-semibold">{status.devices.registered} / {status.devices.limit}</p>
              </div>
              <div>
                <p className="text-gray-400">Downloads/Device</p>
                <p className="font-semibold">{status.downloads.limit_per_device} max</p>
              </div>
              <div>
                <p className="text-gray-400">Expiry Period</p>
                <p className="font-semibold">{status.downloads.expiry_days} days</p>
              </div>
              <div>
                <p className="text-gray-400">Active Downloads</p>
                <p className="font-semibold">{status.downloads.active}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Local Downloads (Offline Available) */}
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Download className="w-4 h-4 text-green-400" />
              Offline Available
            </h3>
            <Button variant="ghost" size="sm" onClick={refreshLocalDownloads}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {localDownloads.length === 0 ? (
            <div className="text-center py-8">
              <Download className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-400">No offline downloads</p>
              <p className="text-sm text-gray-500 mt-1">
                Downloaded videos will appear here for offline viewing
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {localDownloads.map((download) => {
                const daysRemaining = download.expiresAt ? getDaysRemaining(download.expiresAt) : 30;
                const isExpiringSoon = daysRemaining <= 7;
                const progress = downloadProgress[download.id] || download.progress;

                return (
                  <div 
                    key={download.id}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      {download.thumbnail && (
                        <img 
                          src={download.thumbnail} 
                          alt="" 
                          className="w-16 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{download.episodeTitle}</p>
                        <p className="text-xs text-gray-400">{download.seriesTitle}</p>
                        
                        {download.status === 'downloading' && (
                          <div className="mt-2">
                            <Progress value={progress} className="h-1" />
                            <p className="text-xs text-gray-400 mt-1">{progress}% - {formatSize(download.downloadedSize)}</p>
                          </div>
                        )}
                        
                        {download.status === 'complete' && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-green-400 border-green-400/30 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" /> Ready
                            </Badge>
                            <span className="text-xs text-gray-500">{formatSize(download.size)}</span>
                          </div>
                        )}
                        
                        {download.status === 'failed' && (
                          <Badge variant="outline" className="text-red-400 border-red-400/30 text-xs mt-2">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Failed
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {download.status === 'complete' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => playOfflineVideo(download)}
                            className="text-green-400 hover:text-green-300"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLocalDownload(download.id)}
                          disabled={actionLoading === download.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          {actionLoading === download.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {download.status === 'complete' && download.expiresAt && (
                      <div className="mt-3 flex items-center gap-2">
                        <Clock className={`w-3 h-3 ${isExpiringSoon ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <span className={`text-xs ${isExpiringSoon ? 'text-yellow-400' : 'text-gray-400'}`}>
                          {daysRemaining} days remaining
                        </span>
                        <Progress 
                          value={(daysRemaining / 30) * 100} 
                          className="flex-1 h-1"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Registered Devices */}
        {status?.is_vip && (
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Registered Devices
              </h3>
              <Badge variant="outline">
                {status.devices.registered} / {status.devices.limit}
              </Badge>
            </div>

            {status.devices.list.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No devices registered yet. Download an episode to register this device.
              </p>
            ) : (
              <div className="space-y-3">
                {status.devices.list.map((device) => (
                  <div 
                    key={device.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/20 rounded-lg">
                        <DeviceIcon type={device.device_type} />
                      </div>
                      <div>
                        <p className="font-medium">{device.device_name}</p>
                        <p className="text-xs text-gray-400">
                          Last active: {new Date(device.last_active).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDevice(device.device_id)}
                      disabled={actionLoading === device.device_id}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      {actionLoading === device.device_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Server Downloads (for reference) */}
        {status?.is_vip && status.downloads.list.length > 0 && (
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Download className="w-4 h-4" />
                Server Downloads
              </h3>
              <Badge variant="outline">
                {status.downloads.active} episodes
              </Badge>
            </div>

            <div className="space-y-3">
              {status.downloads.list.map((download) => {
                const daysRemaining = getDaysRemaining(download.expires_at);
                const isExpiringSoon = daysRemaining <= 7;
                
                return (
                  <div 
                    key={download.id}
                    className="p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{download.episode_title}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Device: {download.device_name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeServerDownload(download.id)}
                        disabled={actionLoading === download.id}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        {actionLoading === download.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <Clock className={`w-3 h-3 ${isExpiringSoon ? 'text-yellow-400' : 'text-gray-400'}`} />
                      <span className={`text-xs ${isExpiringSoon ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {daysRemaining} days remaining
                      </span>
                      <Progress 
                        value={(daysRemaining / 30) * 100} 
                        className="flex-1 h-1"
                      />
                    </div>
                    
                    {isExpiringSoon && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-yellow-400">
                        <AlertTriangle className="w-3 h-3" />
                        Expiring soon!
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Info Cards */}
        <div className="grid gap-3">
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Download className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">How Downloads Work</p>
                <p className="text-xs text-gray-400 mt-1">
                  Downloaded episodes are stored locally using IndexedDB and Service Workers. 
                  They expire after 30 days or when your VIP subscription ends.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <WifiOff className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Offline Viewing</p>
                <p className="text-xs text-gray-400 mt-1">
                  Watch downloaded episodes even without internet connection. 
                  Perfect for commutes, flights, or areas with poor connectivity.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DownloadsPage;
