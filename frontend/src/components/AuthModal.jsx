import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { APP_CONFIG, API } from "@/config";
import { toast } from "sonner";
import axios from "axios";
import { LoginSuccessModal, SignupSuccessModal } from "@/components/AnimatedModals";

export const AuthModal = ({ open, onClose, initialReferralCode = "", forceSignUp = false }) => {
  const [isLogin, setIsLogin] = useState(initialReferralCode || forceSignUp ? false : true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [referralValid, setReferralValid] = useState(null);
  const [referralBonus, setReferralBonus] = useState(0);
  const [loading, setLoading] = useState(false);
  const { login, register, user } = useAuth();
  
  // Success modal states
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [signupBonusInfo, setSignupBonusInfo] = useState({ welcome: 0, referral: 0 });

  // Update referral code when initialReferralCode changes (from URL)
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
      setIsLogin(false); // Switch to signup mode
    }
  }, [initialReferralCode]);

  // Force signup mode when prop changes
  useEffect(() => {
    if (forceSignUp && open) {
      setIsLogin(false);
    }
  }, [forceSignUp, open]);

  // Validate referral code
  useEffect(() => {
    const validateCode = async () => {
      if (referralCode.length >= 6) {
        try {
          const res = await axios.get(`${API}/referral/validate/${referralCode}`);
          setReferralValid(res.data.valid);
          if (res.data.valid) {
            setReferralBonus(res.data.bonus_coins);
          }
        } catch (e) {
          setReferralValid(false);
        }
      } else {
        setReferralValid(null);
      }
    };
    if (!isLogin && referralCode) {
      validateCode();
    }
  }, [referralCode, isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        setShowLoginSuccess(true);
      } else {
        await register(email, password, name, referralValid ? referralCode : null);
        setSignupBonusInfo({
          welcome: APP_CONFIG.welcomeBonus,
          referral: referralValid ? APP_CONFIG.referralBonus : 0
        });
        setShowSignupSuccess(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  const handleSuccessClose = () => {
    setShowLoginSuccess(false);
    setShowSignupSuccess(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open && !showLoginSuccess && !showSignupSuccess} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] bg-card border-white/10" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">
            {isLogin ? "Welcome Back" : "Join Now"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isLogin ? "Sign in to continue watching" : "Create an account to start watching"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!isLogin && (
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary/50 border-white/10"
              data-testid="auth-name-input"
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-secondary/50 border-white/10"
            data-testid="auth-email-input"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-secondary/50 border-white/10"
            data-testid="auth-password-input"
          />
          {!isLogin && (
            <div className="relative">
              <Input
                placeholder="Referral code (optional)"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className={`bg-secondary/50 border-white/10 pr-10 ${referralValid === true ? "border-green-500" : referralValid === false ? "border-red-500" : ""}`}
                data-testid="auth-referral-input"
              />
              {referralValid === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="w-4 h-4 text-green-500" />
                </div>
              )}
              {referralValid === true && (
                <p className="text-xs text-green-400 mt-1">+{referralBonus} bonus coins!</p>
              )}
            </div>
          )}
          <Button 
            type="submit" 
            className="w-full bg-primary hover:bg-primary/90 rounded-full"
            disabled={loading}
            data-testid="auth-submit-btn"
          >
            {loading ? <Loader2 className="animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline"
            data-testid="auth-toggle-btn"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </DialogContent>
    </Dialog>

      {/* Login Success Modal */}
      <LoginSuccessModal
        open={showLoginSuccess}
        onOpenChange={setShowLoginSuccess}
        userName={user?.name || name}
        onConfirm={handleSuccessClose}
      />

      {/* Signup Success Modal */}
      <SignupSuccessModal
        open={showSignupSuccess}
        onOpenChange={setShowSignupSuccess}
        bonusCoins={signupBonusInfo.welcome}
        referralBonus={signupBonusInfo.referral}
        onConfirm={handleSuccessClose}
      />
    </>
  );
};

export default AuthModal;
