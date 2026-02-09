import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Mail, Phone, Shield, X, CheckCircle, 
  Loader2, Gift, AlertTriangle, ChevronRight 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { API } from "@/config";
import { toast } from "sonner";

export const VerificationBanner = ({ user, token, onVerified }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [verifyType, setVerifyType] = useState("email"); // Email only for now
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Show banner only if user has unverified email
    // Phone verification disabled until SMS provider is integrated
    const hasUnverifiedEmail = user?.email && !user?.email_verified;
    const isVerified = user?.email_verified; // Only email verification counts for now
    
    // Check if user dismissed the banner this session
    const wasDismissed = sessionStorage.getItem('verification_dismissed');
    
    setShowBanner(hasUnverifiedEmail && !isVerified && !wasDismissed);
  }, [user]);

  const dismissBanner = () => {
    setDismissed(true);
    setShowBanner(false);
    sessionStorage.setItem('verification_dismissed', 'true');
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    
    try {
      // Email verification only for now
      await axios.post(`${API}/auth/send-email-verification`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Verification code sent to your email!");
      setCodeSent(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send verification code");
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = verifyType === "email" 
        ? `${API}/auth/verify-email?code=${code}`
        : `${API}/auth/verify-phone-code?code=${code}`;
      
      const res = await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${verifyType === "email" ? "Email" : "Phone"} verified! +${res.data.coins_awarded} coins!`);
      setShowModal(false);
      setShowBanner(false);
      setCode("");
      setCodeSent(false);
      
      // Callback to refresh user data
      if (onVerified) onVerified();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
    }
    setLoading(false);
  };

  if (!showBanner || dismissed) return null;

  const hasEmail = user?.email && !user?.email_verified;
  const hasPhone = user?.phone && !user?.phone_verified;

  return (
    <>
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Verify your account to unlock all features
                </p>
                <p className="text-xs text-white/60">
                  Earn <span className="text-yellow-400 font-semibold">5 bonus coins</span> when you verify!
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {hasEmail && (
                <Button
                  size="sm"
                  onClick={() => { setVerifyType("email"); setShowModal(true); }}
                  className="bg-purple-500 hover:bg-purple-600"
                  data-testid="verify-email-btn"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Verify Email
                </Button>
              )}
              {hasPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setVerifyType("phone"); setShowModal(true); }}
                  className="border-purple-500/50"
                  data-testid="verify-phone-btn"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Verify Phone
                </Button>
              )}
              <button
                onClick={dismissBanner}
                className="p-1 text-white/40 hover:text-white/60 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verifyType === "email" ? (
                <Mail className="w-5 h-5 text-purple-400" />
              ) : (
                <Phone className="w-5 h-5 text-purple-400" />
              )}
              Verify your {verifyType}
            </DialogTitle>
            <DialogDescription>
              {!codeSent 
                ? `We'll send a 6-digit code to your ${verifyType}.`
                : `Enter the code sent to ${verifyType === "email" ? user?.email : user?.phone}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!codeSent ? (
              <>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm text-white/80">
                    {verifyType === "email" ? user?.email : `+${user?.country_code || "254"} ${user?.phone}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Gift className="w-5 h-5 text-yellow-400" />
                  <p className="text-sm text-yellow-300">
                    You'll earn <strong>5 coins</strong> when verified!
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={() => sendVerificationCode(verifyType)}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  Send Verification Code
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Enter 6-digit code
                  </label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                    data-testid="verification-code-input"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Verify
                </Button>

                <button
                  onClick={() => sendVerificationCode(verifyType)}
                  disabled={loading}
                  className="w-full text-sm text-purple-400 hover:text-purple-300"
                >
                  Didn't receive code? Send again
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Feature Gate Component - shows prompt when user tries restricted action
export const FeatureGate = ({ 
  user, 
  token, 
  feature, // "payout", "referral", "change_password", "campaign", "add_funds"
  children,
  onVerified 
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const isVerified = user?.email_verified || user?.phone_verified;
  
  // Features that require verification
  const restrictedFeatures = {
    payout: "request payouts",
    referral: "claim referral rewards",
    change_password: "change your password",
    campaign: "create ad campaigns",
    add_funds: "add funds to your wallet"
  };

  const handleClick = (e) => {
    if (!isVerified && restrictedFeatures[feature]) {
      e.preventDefault();
      e.stopPropagation();
      setShowPrompt(true);
      toast.error(`Please verify your account to ${restrictedFeatures[feature]}`);
    }
  };

  if (isVerified) {
    return children;
  }

  return (
    <div onClick={handleClick}>
      {children}
      
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Verification Required
            </DialogTitle>
            <DialogDescription>
              You need to verify your email or phone to {restrictedFeatures[feature]}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 mb-4">
              <Gift className="w-5 h-5 text-yellow-400" />
              <p className="text-sm text-yellow-300">
                Bonus: Earn <strong>5 coins</strong> when you verify!
              </p>
            </div>

            <div className="flex gap-2">
              {user?.email && !user?.email_verified && (
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowPrompt(false);
                    // Trigger email verification flow
                    document.querySelector('[data-testid="verify-email-btn"]')?.click();
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Verify Email
                </Button>
              )}
              {user?.phone && !user?.phone_verified && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowPrompt(false);
                    document.querySelector('[data-testid="verify-phone-btn"]')?.click();
                  }}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Verify Phone
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VerificationBanner;
