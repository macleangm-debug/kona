import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Film, ChevronLeft, Loader2, Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const CreatorLoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password);
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
