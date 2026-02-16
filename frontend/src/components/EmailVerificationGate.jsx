import React, { useState } from "react";
import axios from "axios";
import { 
  Mail, Shield, Lock, Gift, CheckCircle, 
  Loader2, ChevronRight, X 
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
import { useAuth } from "@/contexts/AuthContext";

/**
 * EmailVerificationGate - Wraps features that require email verification
 * 
 * Usage:
 * <EmailVerificationGate featureName="Scratch Card">
 *   <ScratchCard ... />
 * </EmailVerificationGate>
 * 
 * For unverified users: Shows a locked overlay with soft prompt
 * For verified users: Shows the children normally
 */
export const EmailVerificationGate = ({ 
  children, 
  featureName = "this feature",
  className = ""
}) => {
  const { user, token, refreshUser } = useAuth();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // If user is verified, render children normally
  if (user?.email_verified) {
    return <>{children}</>;
  }

  const sendVerificationCode = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/send-email-verification`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Verification code sent to your email!");
      setCodeSent(true);
      
      // In test mode, show the code in console for development
      if (res.data.test_mode && res.data.test_code) {
        console.log("[DEV] Test verification code:", res.data.test_code);
      }
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
      const res = await axios.post(`${API}/auth/verify-email?code=${code}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Email verified! +${res.data.coins_awarded} coins earned!`);
      setShowVerifyModal(false);
      setCode("");
      setCodeSent(false);
      
      if (refreshUser) await refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
    }
    setLoading(false);
  };

  const handleUnlock = () => {
    setShowVerifyModal(true);
  };

  const closeModal = () => {
    setShowVerifyModal(false);
    setCode("");
    setCodeSent(false);
  };

  return (
    <>
      {/* Wrapper with locked overlay */}
      <div className={`relative ${className}`}>
        {/* Render children but with overlay */}
        <div className="pointer-events-none opacity-50 blur-[1px]">
          {children}
        </div>
        
        {/* Locked overlay - soft prompt */}
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-black/50"
          onClick={handleUnlock}
          data-testid={`verification-gate-${featureName.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Lock className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              Verify Email to Unlock
            </p>
            <p className="text-xs text-gray-400 mb-3">
              {featureName}
            </p>
            <Button 
              size="sm" 
              className="bg-purple-500 hover:bg-purple-600 text-white"
              onClick={(e) => {
                e.stopPropagation();
                handleUnlock();
              }}
            >
              <Mail className="w-3 h-3 mr-1" />
              Verify Now
            </Button>
          </div>
        </div>
      </div>

      {/* Verification Modal - Soft prompt (can dismiss) */}
      <Dialog open={showVerifyModal} onOpenChange={closeModal}>
        <DialogContent className="sm:max-w-md bg-gray-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Unlock {featureName}
            </DialogTitle>
            <DialogDescription>
              {!codeSent 
                ? "Verify your email to access this feature and earn bonus coins!"
                : `Enter the code sent to ${user?.email}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!codeSent ? (
              <>
                {/* Email display */}
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <p className="text-sm text-white/80">{user?.email}</p>
                  </div>
                </div>
                
                {/* Bonus incentive */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <Gift className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-300">
                    Earn <strong>5 bonus coins</strong> when you verify!
                  </p>
                </div>

                <Button
                  className="w-full bg-purple-500 hover:bg-purple-600"
                  onClick={sendVerificationCode}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-2" />
                  )}
                  Send Verification Code
                </Button>
                
                {/* Skip option - soft prompt */}
                <button
                  onClick={closeModal}
                  className="w-full text-sm text-gray-500 hover:text-gray-400 py-2"
                >
                  Maybe Later
                </button>
              </>
            ) : (
              <>
                {/* Code input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Enter 6-digit code
                  </label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em] font-mono bg-gray-800 border-gray-700"
                    maxLength={6}
                    autoFocus
                    data-testid="verification-code-input"
                  />
                </div>

                <Button
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={verifyCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Verify & Unlock
                </Button>

                <button
                  onClick={sendVerificationCode}
                  disabled={loading}
                  className="w-full text-sm text-purple-400 hover:text-purple-300"
                >
                  Didn't receive code? Send again
                </button>
                
                {/* Back button */}
                <button
                  onClick={() => {
                    setCodeSent(false);
                    setCode("");
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-400"
                >
                  ← Back
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmailVerificationGate;
