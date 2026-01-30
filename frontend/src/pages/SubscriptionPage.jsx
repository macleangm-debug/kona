import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Crown, Check, Coins, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await axios.get(`${API}/subscriptions/plans`);
        setPlans(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async (planId) => {
    if (!token) {
      toast.error("Please sign in first");
      return;
    }
    setSubscribing(planId);
    try {
      const res = await axios.post(`${API}/subscriptions/subscribe`, 
        { plan_id: planId, origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      window.location.href = res.data.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to subscribe");
    }
    setSubscribing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 lg:px-12 pt-20 lg:pt-24 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold">Subscriptions</h1>
          <p className="text-xs text-muted-foreground">Get more coins monthly</p>
        </div>
      </div>

      {/* Current Subscription */}
      {user?.subscription && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-primary/20 to-purple-600/20 border-primary/30">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-5 h-5 text-yellow-400" />
            <span className="font-bold">Active Subscription</span>
          </div>
          <p className="text-sm text-muted-foreground">
            You're on the {user.subscription} plan. Enjoy your monthly coins!
          </p>
        </Card>
      )}

      {/* Plans */}
      <div className="space-y-4">
        {plans.map(plan => (
          <Card 
            key={plan.id} 
            className={`p-4 relative overflow-hidden ${
              plan.popular ? "border-primary bg-gradient-to-br from-primary/10 to-purple-600/10" : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-bl">
                POPULAR
              </div>
            )}
            
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-heading text-lg font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">${plan.price}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span className="font-bold">{plan.monthly_coins}</span>
                </div>
                <p className="text-xs text-muted-foreground">coins/month</p>
              </div>
            </div>

            <ul className="space-y-1.5 mb-4">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-400" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button 
              onClick={() => handleSubscribe(plan.id)}
              disabled={subscribing === plan.id || user?.subscription === plan.id}
              className={`w-full rounded-full ${
                plan.popular ? "bg-primary hover:bg-primary/90" : ""
              }`}
              variant={plan.popular ? "default" : "outline"}
            >
              {subscribing === plan.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : user?.subscription === plan.id ? (
                "Current Plan"
              ) : (
                "Subscribe"
              )}
            </Button>
          </Card>
        ))}
      </div>

      {/* Info */}
      <p className="text-xs text-center text-muted-foreground mt-6">
        Cancel anytime. Coins are credited on your billing date.
      </p>
    </div>
  );
};

export default SubscriptionPage;
