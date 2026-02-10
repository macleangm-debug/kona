import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Crown, Check, Star, Zap, Shield, Download, 
  Monitor, Loader2, ChevronLeft, Smartphone, 
  CreditCard, AlertCircle, CheckCircle, X, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/SplashScreen";
import { API } from "@/config";
import { toast } from "sonner";

const tierIcons = {
  free: Shield,
  basic: Star,
  premium: Zap,
  vip: Crown
};

const tierColors = {
  free: "text-gray-400",
  basic: "text-blue-400",
  premium: "text-purple-400",
  vip: "text-yellow-400"
};

const tierBgColors = {
  free: "bg-gray-500/10 border-gray-500/30",
  basic: "bg-blue-500/10 border-blue-500/30",
  premium: "bg-purple-500/10 border-purple-500/30",
  vip: "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
};

export const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [tiers, setTiers] = useState({});
  const [paymentProviders, setPaymentProviders] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const fetchData = async () => {
    try {
      // Get tiers with local pricing (always fetch, even when not logged in)
      const countryCode = user?.geo?.country_code || user?.country_code || "KE";
      const tiersRes = await axios.get(`${API}/subscriptions/tiers?country_code=${countryCode}`);
      setTiers(tiersRes.data.tiers);

      // Get payment providers
      const providersRes = await axios.get(`${API}/subscriptions/payment-providers/${countryCode}`);
      setPaymentProviders(providersRes.data.providers || []);
      
      if (providersRes.data.providers?.length > 0) {
        setSelectedProvider(providersRes.data.providers[0].id);
      }

      // Get user's subscription only if logged in
      if (token) {
        const subRes = await axios.get(`${API}/subscriptions/my-subscription`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSubscription(subRes.data);
      }
    } catch (e) {
      console.error("Failed to fetch subscription data:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [token, user]);

  // Poll for payment status
  useEffect(() => {
    if (!pendingPayment) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(
          `${API}/subscriptions/payment/${pendingPayment.payment_id}/status`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.payment_status === "completed") {
          clearInterval(interval);
          setPendingPayment(null);
          toast.success(res.data.message);
          if (refreshUser) refreshUser();
          fetchData();
        }
      } catch (e) {
        console.error("Payment check error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [pendingPayment, token]);

  const handleUpgrade = async () => {
    if (!selectedTier || !selectedProvider) {
      toast.error("Please select a plan and payment method");
      return;
    }

    const provider = paymentProviders.find(p => p.id === selectedProvider);
    if (provider?.type === "mobile_money" && !phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    setProcessingPayment(true);

    try {
      const res = await axios.post(
        `${API}/subscriptions/upgrade`,
        {
          tier: selectedTier.id,
          provider_id: selectedProvider,
          phone_number: phoneNumber || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status === "success") {
        setShowUpgradeModal(false);
        setPendingPayment(res.data.data);
        
        if (res.data.data.checkout_type === "stk_push") {
          toast.info(res.data.data.instructions);
        } else {
          window.open(res.data.data.checkout_url, "_blank");
        }
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to initiate payment");
    }
    setProcessingPayment(false);
  };

  const handleSimulatePayment = async () => {
    if (!pendingPayment) return;
    
    setCheckingPayment(true);
    try {
      const res = await axios.post(
        `${API}/subscriptions/payment/${pendingPayment.payment_id}/simulate-success`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.status === "success") {
        setPendingPayment(null);
        toast.success(res.data.message);
        if (refreshUser) refreshUser();
        fetchData();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to process payment");
    }
    setCheckingPayment(false);
  };

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of your billing period.")) {
      return;
    }

    try {
      const res = await axios.post(
        `${API}/subscriptions/cancel`,
        { reason: "User requested cancellation" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(res.data.message);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to cancel subscription");
    }
  };

  if (loading) {
    return <PageLoader message="Loading subscription..." />;
  }

  const currentTier = subscription?.current_tier || "free";
  const CurrentIcon = tierIcons[currentTier] || Shield;

  return (
    <div className="min-h-screen bg-background pb-20 pt-16 px-4" data-testid="subscription-page">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold">Subscription</h1>
        </div>

        {/* Login Prompt for non-authenticated users */}
        {!user && (
          <Card className="p-6 text-center">
            <Crown className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-xl font-bold mb-2">Unlock Premium Features</h2>
            <p className="text-muted-foreground mb-4">
              Sign in to upgrade your subscription and get more devices, better quality, and exclusive content.
            </p>
            <Button onClick={() => navigate("/")}>Sign In</Button>
          </Card>
        )}

        {/* All Plans - Show even when not logged in */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Choose Your Plan</h3>
          <div className="grid gap-4">
            {["free", "basic", "premium", "vip"].map((tierId) => {
              const tier = tiers[tierId];
              if (!tier) return null;
              
              const TierIcon = tierIcons[tierId];
              const isCurrentTier = user && currentTier === tierId;
              const canUpgrade = user && ["free", "basic", "premium", "vip"].indexOf(tierId) > 
                                 ["free", "basic", "premium", "vip"].indexOf(currentTier);

              return (
                <Card 
                  key={tierId}
                  className={`p-4 ${isCurrentTier ? tierBgColors[tierId] : 'bg-card'} ${
                    tierId === "vip" ? 'ring-1 ring-yellow-500/30' : ''
                  }`}
                  data-testid={`tier-card-${tierId}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-black/20 ${tierColors[tierId]}`}>
                        <TierIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{tier.name}</h4>
                          {isCurrentTier && (
                            <Badge variant="outline" className="text-xs">Current</Badge>
                          )}
                          {tierId === "vip" && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Popular</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tier.device_limit} devices - {tier.video_quality}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {tier.price_usd > 0 ? (
                        <>
                          <p className="font-bold">
                            ${tier.price_usd}
                            <span className="text-xs text-muted-foreground font-normal">/mo</span>
                          </p>
                          {tier.local_price && (
                            <p className="text-xs text-muted-foreground">
                              {tier.local_price.formatted}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="font-bold text-green-400">Free</p>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="mt-3 grid grid-cols-2 gap-1">
                    {tier.features?.slice(0, 4).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Upgrade Button */}
                  {!user && tierId !== "free" && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      variant={tierId === "vip" ? "default" : "outline"}
                      onClick={() => navigate("/")}
                    >
                      Sign in to upgrade
                    </Button>
                  )}
                  {canUpgrade && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      variant={tierId === "vip" ? "default" : "outline"}
                      onClick={() => {
                        setSelectedTier({ id: tierId, ...tier });
                        setShowUpgradeModal(true);
                      }}
                      data-testid={`upgrade-to-${tierId}-btn`}
                    >
                      Upgrade to {tier.name}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {user && (
          <>
            {/* Pending Payment Banner */}
            {pendingPayment && (
              <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-400">Payment Pending</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {pendingPayment.instructions || "Waiting for payment confirmation..."}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSimulatePayment}
                        disabled={checkingPayment}
                        className="border-yellow-500/50 text-yellow-400"
                      >
                        {checkingPayment ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Simulate Success (Demo)
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingPayment(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Current Plan */}
            <Card className={`p-6 ${tierBgColors[currentTier]}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full bg-black/20 ${tierColors[currentTier]}`}>
                    <CurrentIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{subscription?.tier_name || "Free"} Plan</h2>
                    <p className="text-sm text-muted-foreground">
                      {subscription?.is_paid ? "Active subscription" : "No active subscription"}
                    </p>
                  </div>
                </div>
                {subscription?.is_paid && (
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    Active
                  </Badge>
                )}
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                  <span>{subscription?.device_limit || 3} Devices</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4 text-green-400" />
                  <span>
                    {subscription?.benefits?.max_downloads === -1 
                      ? "Unlimited downloads" 
                      : `${subscription?.benefits?.max_downloads || 0} downloads`}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span>{subscription?.benefits?.video_quality || "720p"} quality</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {subscription?.benefits?.ad_free ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Ad-free</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-400" />
                      <span>With ads</span>
                    </>
                  )}
                </div>
              </div>

              {/* Subscription Details */}
              {subscription?.subscription && (
                <div className="text-xs text-muted-foreground border-t border-white/10 pt-3 mt-3">
                  <p>Renews: {new Date(subscription.subscription.expires_at).toLocaleDateString()}</p>
                  {subscription.subscription.status === "cancelled" && (
                    <p className="text-yellow-400 mt-1">
                      Cancelled - Access until {new Date(subscription.subscription.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                {subscription?.upgrade_options?.length > 0 && (
                  <Button 
                    onClick={() => {
                      setSelectedTier({ id: subscription.upgrade_options[0].tier, ...subscription.upgrade_options[0] });
                      setShowUpgradeModal(true);
                    }}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
                    data-testid="upgrade-btn"
                  >
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade
                  </Button>
                )}
                {subscription?.is_paid && subscription?.subscription?.status !== "cancelled" && (
                  <Button 
                    variant="outline" 
                    onClick={handleCancelSubscription}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>

            )}
          </>
        )}

        {/* Upgrade Modal */}
        <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
          <DialogContent className="bg-card border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                Upgrade to {selectedTier?.name}
              </DialogTitle>
              <DialogDescription>
                Get more devices, better quality, and exclusive features
              </DialogDescription>
            </DialogHeader>

            {selectedTier && (
              <div className="space-y-4">
                {/* Price Summary */}
                <div className="p-4 rounded-lg bg-white/5">
                  <div className="flex justify-between items-center">
                    <span>{selectedTier.name} Plan</span>
                    <span className="font-bold">
                      ${selectedTier.price_usd}/mo
                      {selectedTier.local_price && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({selectedTier.local_price.formatted})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger data-testid="payment-provider-select">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            {provider.type === "mobile_money" ? (
                              <Smartphone className="w-4 h-4" />
                            ) : (
                              <CreditCard className="w-4 h-4" />
                            )}
                            {provider.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone Number for Mobile Money */}
                {paymentProviders.find(p => p.id === selectedProvider)?.type === "mobile_money" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      type="tel"
                      placeholder="+254 7XX XXX XXX"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      data-testid="phone-number-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      You'll receive a payment prompt on this number
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 font-medium mb-2">What you'll get:</p>
                  <ul className="space-y-1">
                    {selectedTier.features?.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-green-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUpgradeModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpgrade}
                disabled={processingPayment}
                className="bg-gradient-to-r from-purple-600 to-pink-600"
                data-testid="confirm-upgrade-btn"
              >
                {processingPayment ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Crown className="w-4 h-4 mr-2" />
                )}
                {processingPayment ? "Processing..." : "Pay Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SubscriptionPage;
