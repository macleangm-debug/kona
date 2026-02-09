import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { Film, ChevronLeft, Loader2, Eye, EyeOff, Shield, CheckCircle, Mail } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const CreatorLoginPage = () => {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login"); // login or verify
  const [verificationCode, setVerificationCode] = useState("");
  const [testCode, setTestCode] = useState(null);
  const [userToken, setUserToken] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
      
      // Check if user needs email verification for creator portal
      if (!result.user.email_verified && !result.user.phone_verified) {
        setUserToken(result.token);
        toast.info("Please verify your email to access Creator Studio");
        
        // Send verification code
        try {
          const verifyRes = await axios.post(`${API}/auth/send-email-verification`, {}, {
            headers: { Authorization: `Bearer ${result.token}` }
          });
          if (verifyRes.data.test_code) {
            setTestCode(verifyRes.data.test_code);
          }
        } catch (err) {
          console.log("Verification send error:", err);
        }
        
        setMode("verify");
        setLoading(false);
        return;
      }
      
      // Check if user is a creator
      if (result.user.creator_id || result.user.is_creator) {
        toast.success("Welcome back, Creator!");
        navigate("/creator");
      } else {
        toast.info("You're not registered as a creator yet. Apply now!");
        navigate("/creator");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    }
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/verify-email?code=${verificationCode}`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      
      toast.success("Email verified! Welcome to Creator Studio");
      navigate("/creator");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
    }
    setLoading(false);
  };

  const resendCode = async () => {
    try {
      const res = await axios.post(`${API}/auth/send-email-verification`, {}, {
        headers: { Authorization: `Bearer ${userToken}` }
      });
      if (res.data.test_code) {
        setTestCode(res.data.test_code);
      }
      toast.success("Code sent!");
    } catch (err) {
      toast.error("Failed to resend code");
    }
  };

  // Verification Screen
  if (mode === "verify") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur border-white/10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verify Your Email</h1>
            <p className="text-white/60 mt-2">
              Creator accounts require email verification. Enter the code sent to your email.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.5em] font-mono bg-secondary/50 border-white/10"
              maxLength={6}
            />

            {testCode && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs text-yellow-400">
                  Test Mode - Use code: <span className="font-mono font-bold">{testCode}</span>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Verify & Continue
            </Button>

            <button type="button" onClick={resendCode} className="w-full text-sm text-green-400 hover:text-green-300">
              Resend code
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-white mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to Kona
        </button>

        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 flex items-center justify-center">
            <Film className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white">Creator Studio</h1>
          <p className="text-muted-foreground mt-2">Log in to manage your content</p>
        </div>

        {/* Login Form */}
        <Card className="p-6 bg-card/50 backdrop-blur border-white/10">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Email</label>
              <Input
                type="email"
                placeholder="creator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-secondary/50 border-white/10"
                required
                data-testid="creator-email-input"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-secondary/50 border-white/10 pr-12"
                  required
                  data-testid="creator-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-full text-lg font-semibold"
              disabled={loading}
              data-testid="creator-login-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Not a creator yet?</p>
            <Link to="/creator" className="text-green-400 hover:underline mt-1 inline-block">
              Apply to become a creator →
            </Link>
          </div>
        </Card>

        {/* Benefits */}
        <Card className="mt-6 p-4 bg-gradient-to-br from-green-500/10 to-emerald-600/10 border-green-500/20">
          <h3 className="font-semibold text-sm mb-2">Creator Benefits</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li>• 60-70% revenue share on all views</li>
            <li>• Real-time analytics dashboard</li>
            <li>• Upload unlimited episodes</li>
            <li>• Priority support & featuring</li>
          </ul>
        </Card>

        {/* Admin Link */}
        <div className="mt-6 text-center">
          <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-white">
            Admin? Log in here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CreatorLoginPage;
