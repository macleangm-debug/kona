import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Clock, Crown, Users, Settings, Loader2, CheckCircle, 
  TrendingUp, Calendar, Coins, Shield, ChevronDown, ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/config";
import { toast } from "sonner";

const TIER_CONFIG = {
  basic: { 
    label: "Basic", 
    hours: 24, 
    color: "from-blue-500 to-cyan-500",
    icon: Clock,
    description: "1 day early access"
  },
  premium: { 
    label: "Premium", 
    hours: 48, 
    color: "from-purple-500 to-pink-500",
    icon: Crown,
    description: "2 days early access"
  },
  vip: { 
    label: "VIP", 
    hours: 72, 
    color: "from-yellow-500 to-orange-500",
    icon: Shield,
    description: "3 days early access"
  }
};

export const EarlyAccessSettings = ({ token, series = [] }) => {
  const [loading, setLoading] = useState(true);
  const [tiers, setTiers] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_tier: {} });
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [showConfigure, setShowConfigure] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [expandedSeries, setExpandedSeries] = useState([]);
  
  // Config form
  const [configForm, setConfigForm] = useState({
    early_access_tier: "none",
    early_access_hours: 24,
    early_access_price_coins: 100
  });

  const fetchData = async () => {
    try {
      const [tiersRes, subsRes] = await Promise.all([
        axios.get(`${API}/early-access/tiers`),
        axios.get(`${API}/early-access/creator/subscribers`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setTiers(tiersRes.data.tiers || []);
      setSubscribers(subsRes.data.subscribers || []);
      setStats({
        total: subsRes.data.total || 0,
        by_tier: subsRes.data.by_tier || {}
      });
    } catch (e) {
      console.error("Error fetching early access data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleConfigureSeries = async () => {
    if (!selectedSeries) return;
    
    setConfiguring(true);
    try {
      await axios.post(
        `${API}/early-access/series/${selectedSeries.id}/configure`,
        configForm,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success("Early access settings updated!");
      setShowConfigure(false);
      setSelectedSeries(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update settings");
    }
    setConfiguring(false);
  };

  const openConfigure = (s) => {
    setSelectedSeries(s);
    setConfigForm({
      early_access_tier: s.early_access_tier || "none",
      early_access_hours: s.early_access_hours || 24,
      early_access_price_coins: s.early_access_price_coins || 100
    });
    setShowConfigure(true);
  };

  const toggleSeriesExpand = (seriesId) => {
    setExpandedSeries(prev => 
      prev.includes(seriesId) 
        ? prev.filter(id => id !== seriesId)
        : [...prev, seriesId]
    );
  };

  // Calculate revenue from early access
  const totalRevenue = subscribers.reduce((sum, sub) => {
    const tier = tiers.find(t => t.tier === sub.tier);
    return sum + (tier?.price_per_month || 0);
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="early-access-settings">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Subscribers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.by_tier?.vip || 0}</p>
              <p className="text-xs text-muted-foreground">VIP Members</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Monthly Revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">70%</p>
              <p className="text-xs text-muted-foreground">Your Share</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tier Overview */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Early Access Tiers
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map(tier => {
            const config = TIER_CONFIG[tier.tier];
            if (!config) return null;
            const TierIcon = config.icon;
            const subCount = stats.by_tier?.[tier.tier] || 0;
            
            return (
              <div 
                key={tier.tier}
                className={`p-4 rounded-xl bg-gradient-to-br ${config.color} text-white`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TierIcon className="w-5 h-5" />
                  <span className="font-bold">{config.label}</span>
                </div>
                <p className="text-sm opacity-90 mb-3">{config.description}</p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs opacity-75">Price/month</p>
                    <p className="font-bold">{tier.price_per_month} coins</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-75">Subscribers</p>
                    <p className="font-bold">{subCount}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Series Configuration */}
      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Configure Series Early Access
        </h3>
        
        {series.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h4 className="font-semibold mb-2">No Series Yet</h4>
            <p className="text-sm text-muted-foreground">
              Create a series to configure early access settings
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {series.map(s => {
              const isExpanded = expandedSeries.includes(s.id);
              const hasEarlyAccess = s.early_access_enabled;
              
              return (
                <Card key={s.id} className="overflow-hidden">
                  <button
                    onClick={() => toggleSeriesExpand(s.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {s.thumbnail && (
                        <img 
                          src={s.thumbnail} 
                          alt={s.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="text-left">
                        <h4 className="font-medium">{s.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {s.total_episodes || 0} episodes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {hasEarlyAccess ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {s.early_access_hours}h early
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-500/20 text-gray-400">
                          Not configured
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/10 pt-4">
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium">
                            {hasEarlyAccess ? "Early Access Enabled" : "Standard Release"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Early Access Period</p>
                          <p className="font-medium">
                            {hasEarlyAccess ? `${s.early_access_hours} hours` : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Tier</p>
                          <p className="font-medium capitalize">
                            {s.early_access_tier || "None"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price</p>
                          <p className="font-medium">
                            {s.early_access_price_coins || 0} coins/month
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => openConfigure(s)}
                        className="w-full"
                        data-testid={`configure-${s.id}`}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure Early Access
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscribers List */}
      {subscribers.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Recent Subscribers
          </h3>
          <div className="space-y-3">
            {subscribers.slice(0, 10).map((sub, i) => {
              const tierConfig = TIER_CONFIG[sub.tier];
              return (
                <div 
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${tierConfig?.color || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                      <span className="text-white text-xs font-bold">
                        {sub.user_name?.charAt(0) || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sub.user_name || "User"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{sub.tier} tier</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Expires</p>
                    <p className="text-sm">
                      {new Date(sub.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Configure Dialog */}
      <Dialog open={showConfigure} onOpenChange={setShowConfigure}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Configure Early Access - {selectedSeries?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Access Tier</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setConfigForm({...configForm, early_access_tier: "none", early_access_hours: 0})}
                  className={`p-3 rounded-lg border text-sm transition-colors ${
                    configForm.early_access_tier === "none"
                      ? "border-primary bg-primary/20"
                      : "border-white/10 hover:border-white/30"
                  }`}
                >
                  <p className="font-medium">Disabled</p>
                  <p className="text-xs text-muted-foreground">Standard release</p>
                </button>
                {tiers.map(tier => {
                  const config = TIER_CONFIG[tier.tier];
                  if (!config) return null;
                  
                  return (
                    <button
                      key={tier.tier}
                      onClick={() => setConfigForm({
                        ...configForm, 
                        early_access_tier: tier.tier,
                        early_access_hours: tier.hours_early,
                        early_access_price_coins: tier.price_per_month
                      })}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        configForm.early_access_tier === tier.tier
                          ? "border-primary bg-primary/20"
                          : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {tier.hours_early}h early • {tier.price_per_month} coins
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {configForm.early_access_tier !== "none" && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">Custom Hours Early</label>
                  <input
                    type="number"
                    value={configForm.early_access_hours}
                    onChange={(e) => setConfigForm({
                      ...configForm, 
                      early_access_hours: parseInt(e.target.value) || 0
                    })}
                    min={1}
                    max={168}
                    className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max: 168 hours (1 week)</p>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground">Custom Price (coins/month)</label>
                  <input
                    type="number"
                    value={configForm.early_access_price_coins}
                    onChange={(e) => setConfigForm({
                      ...configForm, 
                      early_access_price_coins: parseInt(e.target.value) || 0
                    })}
                    min={10}
                    className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10"
                  />
                </div>
              </>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowConfigure(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={handleConfigureSeries}
                disabled={configuring}
              >
                {configuring ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EarlyAccessSettings;
