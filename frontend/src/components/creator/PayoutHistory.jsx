import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  History, Coins, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronRight, Loader2, DollarSign, Wallet, Filter, Settings, 
  Zap, ToggleLeft, ToggleRight, Bell, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/config";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Pending" },
  processing: { icon: Loader2, color: "text-blue-400", bg: "bg-blue-500/10", label: "Processing" },
  completed: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Failed" }
};

const PAYOUT_METHODS = [
  { id: "mpesa", label: "M-Pesa", icon: "📱" },
  { id: "bank", label: "Bank Transfer", icon: "🏦" },
  { id: "paypal", label: "PayPal", icon: "💳" }
];

export const PayoutHistory = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeView, setActiveView] = useState("history");
  const [requestForm, setRequestForm] = useState({
    amount: "",
    payout_method: "mpesa",
    payout_details: ""
  });
  const [requesting, setRequesting] = useState(false);
  
  // Auto-payout settings state
  const [autoSettings, setAutoSettings] = useState(null);
  const [autoSettingsLoading, setAutoSettingsLoading] = useState(false);
  const [savingAutoSettings, setSavingAutoSettings] = useState(false);
  const [editAutoSettings, setEditAutoSettings] = useState({
    status: "disabled",
    threshold_coins: 5000,
    payout_method: "mobile_money",
    country_code: "KE",
    payout_details: {}
  });

  const fetchPayouts = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      let url = `${API}/creator/payouts`;
      if (statusFilter) url += `?status=${statusFilter}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPayouts(res.data.payouts || []);
      setSummary(res.data.summary || null);
    } catch (e) {
      console.error("Failed to fetch payouts:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayouts();
    fetchAutoSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);
  
  const fetchAutoSettings = async () => {
    if (!token) return;
    setAutoSettingsLoading(true);
    try {
      const res = await axios.get(`${API}/payouts/auto/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAutoSettings(res.data);
      setEditAutoSettings({
        status: res.data.status || "disabled",
        threshold_coins: res.data.threshold_coins || 5000,
        payout_method: res.data.payout_method || "mobile_money",
        country_code: res.data.country_code || "KE",
        payout_details: res.data.payout_details || {}
      });
    } catch (e) {
      console.error("Failed to fetch auto-payout settings:", e);
    }
    setAutoSettingsLoading(false);
  };
  
  const handleSaveAutoSettings = async () => {
    setSavingAutoSettings(true);
    try {
      await axios.put(
        `${API}/payouts/auto/settings`,
        editAutoSettings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Auto-payout settings saved!");
      fetchAutoSettings();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save settings");
    }
    setSavingAutoSettings(false);
  };
  
  const handleToggleAutoPayout = async () => {
    const newStatus = editAutoSettings.status === "enabled" ? "disabled" : "enabled";
    setEditAutoSettings({ ...editAutoSettings, status: newStatus });
    
    try {
      await axios.put(
        `${API}/payouts/auto/settings`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(newStatus === "enabled" ? "Auto-payout enabled!" : "Auto-payout disabled");
      fetchAutoSettings();
    } catch (e) {
      toast.error("Failed to update auto-payout status");
      setEditAutoSettings({ ...editAutoSettings, status: editAutoSettings.status });
    }
  };

  const handleRequestPayout = async () => {
    if (!requestForm.amount || parseFloat(requestForm.amount) < 100) {
      toast.error("Minimum payout is 100 coins");
      return;
    }
    
    if (!requestForm.payout_details) {
      toast.error("Please enter your payout details");
      return;
    }
    
    setRequesting(true);
    
    try {
      await axios.post(
        `${API}/creator/payout/request`,
        {
          amount: parseFloat(requestForm.amount),
          payout_method: requestForm.payout_method,
          payout_details: requestForm.payout_details
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Payout request submitted!");
      setShowRequestDialog(false);
      setRequestForm({ amount: "", payout_method: "mpesa", payout_details: "" });
      fetchPayouts();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to request payout");
    }
    
    setRequesting(false);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payout-history">
      {/* Tabs: History / Auto-Payout Settings */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" />
            Payout History
          </TabsTrigger>
          <TabsTrigger value="automation" className="gap-2" data-testid="auto-payout-tab">
            <Zap className="w-4 h-4" />
            Auto-Payout
          </TabsTrigger>
        </TabsList>
        
        {/* Payout History Tab */}
        <TabsContent value="history" className="mt-6">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <Card className="p-4 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
                <Wallet className="w-5 h-5 text-green-400 mb-1" />
                <p className="text-2xl font-bold">{summary.available_balance}</p>
                <p className="text-xs text-muted-foreground">Available Balance</p>
              </Card>
              <Card className="p-4">
                <CheckCircle className="w-5 h-5 text-green-400 mb-1" />
                <p className="text-2xl font-bold">{summary.total_completed}</p>
                <p className="text-xs text-muted-foreground">Total Paid Out</p>
              </Card>
              <Card className="p-4">
                <Clock className="w-5 h-5 text-yellow-400 mb-1" />
                <p className="text-2xl font-bold">{summary.total_pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </Card>
              <Card className="p-4">
                <DollarSign className="w-5 h-5 text-blue-400 mb-1" />
                <p className="text-2xl font-bold">{summary.total_requested}</p>
                <p className="text-xs text-muted-foreground">Total Requested</p>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(null)}
              >
                All
              </Button>
              {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="gap-1"
                >
                  <config.icon className={`w-3 h-3 ${statusFilter === status ? "" : config.color}`} />
                  {config.label}
                </Button>
              ))}
            </div>
            
            <Button onClick={() => setShowRequestDialog(true)} data-testid="request-payout-btn">
              <Coins className="w-4 h-4 mr-1" /> Request Payout
            </Button>
          </div>

          {/* Payout List */}
          {payouts.length === 0 ? (
            <Card className="p-8 text-center">
              <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No Payouts Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {summary?.available_balance > 100 
                  ? "You have coins available! Request your first payout."
                  : "Earn more coins to request your first payout (min 100 coins)."}
              </p>
              {summary?.available_balance >= 100 && (
                <Button onClick={() => setShowRequestDialog(true)}>
                  Request Payout
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {payouts.map(payout => {
                const config = STATUS_CONFIG[payout.status] || STATUS_CONFIG.pending;
                const StatusIcon = config.icon;
                const method = PAYOUT_METHODS.find(m => m.id === payout.payout_method);
                
                return (
                  <Card 
                    key={payout.id}
                    className={`p-4 ${config.bg} border-white/10`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                          {method?.icon || "💰"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">{payout.amount} coins</p>
                            <Badge variant="outline" className={`${config.color} border-current`}>
                              <StatusIcon className={`w-3 h-3 mr-1 ${payout.status === 'processing' ? 'animate-spin' : ''}`} />
                              {config.label}
                            </Badge>
                            {payout.is_auto && (
                              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                                <Zap className="w-3 h-3 mr-1" />
                                Auto
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {method?.label || payout.payout_method} • {payout.payout_details}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Requested: {formatDate(payout.created_at)}
                            {payout.processed_at && ` • Processed: ${formatDate(payout.processed_at)}`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Auto-Payout Settings Tab */}
        <TabsContent value="automation" className="mt-6" data-testid="auto-payout-settings">
          {autoSettingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Auto-Payout Status Card */}
              <Card className={`p-6 ${editAutoSettings.status === "enabled" ? "bg-gradient-to-br from-purple-500/20 to-indigo-600/20 border-purple-500/30" : ""}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${editAutoSettings.status === "enabled" ? "bg-purple-500/20" : "bg-white/10"}`}>
                      <Zap className={`w-6 h-6 ${editAutoSettings.status === "enabled" ? "text-purple-400" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Auto-Payout</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatically receive payouts when your balance reaches the threshold
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={editAutoSettings.status === "enabled" ? "default" : "outline"}
                    onClick={handleToggleAutoPayout}
                    className="gap-2"
                    data-testid="toggle-auto-payout"
                  >
                    {editAutoSettings.status === "enabled" ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        Enabled
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        Disabled
                      </>
                    )}
                  </Button>
                </div>
                
                {autoSettings && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-white/10">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Balance</p>
                      <p className="font-bold text-lg">{autoSettings.current_balance?.toLocaleString() || 0} coins</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Threshold</p>
                      <p className="font-bold text-lg">{autoSettings.threshold_coins?.toLocaleString() || 5000} coins</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <div className="mt-1">
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                            style={{ width: `${Math.min(100, ((autoSettings.current_balance || 0) / (autoSettings.threshold_coins || 5000)) * 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(((autoSettings.current_balance || 0) / (autoSettings.threshold_coins || 5000)) * 100)}%
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge className={autoSettings.balance_meets_threshold ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                        {autoSettings.balance_meets_threshold ? "Ready for payout" : "Below threshold"}
                      </Badge>
                    </div>
                  </div>
                )}
              </Card>
              
              {/* Settings Form */}
              <Card className="p-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Auto-Payout Settings
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Payout Threshold (coins)</label>
                    <p className="text-xs text-muted-foreground mb-2">Minimum balance required to trigger auto-payout</p>
                    <Input
                      type="number"
                      min={500}
                      step={500}
                      value={editAutoSettings.threshold_coins}
                      onChange={(e) => setEditAutoSettings({...editAutoSettings, threshold_coins: parseInt(e.target.value) || 5000})}
                      className="max-w-xs"
                      data-testid="threshold-input"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground">Payout Method</label>
                    <div className="grid grid-cols-3 gap-3 mt-2 max-w-md">
                      {PAYOUT_METHODS.map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setEditAutoSettings({...editAutoSettings, payout_method: method.id === "mpesa" ? "mobile_money" : method.id})}
                          className={`p-4 rounded-lg border text-center transition-colors ${
                            (editAutoSettings.payout_method === "mobile_money" && method.id === "mpesa") ||
                            editAutoSettings.payout_method === method.id
                              ? "bg-primary/20 border-primary" 
                              : "border-white/10 hover:border-white/30"
                          }`}
                          data-testid={`auto-method-${method.id}`}
                        >
                          <span className="text-2xl">{method.icon}</span>
                          <p className="text-sm mt-1">{method.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-muted-foreground">
                      {editAutoSettings.payout_method === "mobile_money" ? "M-Pesa Number" :
                       editAutoSettings.payout_method === "bank" ? "Bank Account Number" :
                       "PayPal Email"}
                    </label>
                    <Input
                      value={editAutoSettings.payout_details?.phone_number || editAutoSettings.payout_details?.account_number || editAutoSettings.payout_details?.email || ""}
                      onChange={(e) => {
                        const key = editAutoSettings.payout_method === "mobile_money" ? "phone_number" :
                                   editAutoSettings.payout_method === "bank" ? "account_number" : "email";
                        setEditAutoSettings({
                          ...editAutoSettings,
                          payout_details: { ...editAutoSettings.payout_details, [key]: e.target.value }
                        });
                      }}
                      placeholder={
                        editAutoSettings.payout_method === "mobile_money" ? "+254712345678" :
                        editAutoSettings.payout_method === "bank" ? "Account number" :
                        "email@example.com"
                      }
                      className="max-w-md"
                      data-testid="auto-payout-details-input"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={handleSaveAutoSettings}
                      disabled={savingAutoSettings}
                      className="gap-2"
                      data-testid="save-auto-settings-btn"
                    >
                      {savingAutoSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </div>
              </Card>
              
              {/* Info Card */}
              <Card className="p-4 bg-blue-500/10 border-blue-500/30">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">How Auto-Payout Works</h4>
                    <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                      <li>• When your balance reaches the threshold, a payout is automatically initiated</li>
                      <li>• Payouts are checked every 24 hours</li>
                      <li>• You'll receive a notification when an auto-payout is triggered</li>
                      <li>• You can pause or disable auto-payouts at any time</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Request Payout Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Available balance: {summary?.available_balance || 0} coins
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Amount (min 100)</label>
              <Input
                type="number"
                min={100}
                max={summary?.available_balance || 0}
                value={requestForm.amount}
                onChange={(e) => setRequestForm({...requestForm, amount: e.target.value})}
                placeholder="Enter amount"
                data-testid="payout-amount-input"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Payout Method</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {PAYOUT_METHODS.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setRequestForm({...requestForm, payout_method: method.id})}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      requestForm.payout_method === method.id 
                        ? "bg-primary/20 border-primary" 
                        : "border-white/10 hover:border-white/30"
                    }`}
                    data-testid={`payout-method-${method.id}`}
                  >
                    <span className="text-xl">{method.icon}</span>
                    <p className="text-xs mt-1">{method.label}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">
                {requestForm.payout_method === "mpesa" ? "M-Pesa Number" :
                 requestForm.payout_method === "bank" ? "Bank Account Details" :
                 "PayPal Email"}
              </label>
              <Input
                value={requestForm.payout_details}
                onChange={(e) => setRequestForm({...requestForm, payout_details: e.target.value})}
                placeholder={
                  requestForm.payout_method === "mpesa" ? "+254..." :
                  requestForm.payout_method === "bank" ? "Account number, Bank name" :
                  "email@example.com"
                }
                data-testid="payout-details-input"
              />
            </div>
            
            <Button 
              onClick={handleRequestPayout} 
              className="w-full"
              disabled={requesting}
              data-testid="submit-payout-btn"
            >
              {requesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Coins className="w-4 h-4 mr-2" />
              )}
              Request Payout
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutHistory;
