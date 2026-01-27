import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Shield, ChevronLeft, Loader2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const AdminLoginPage = () => {
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
      // Check if user is an admin
      if (result.user.is_admin) {
        toast.success("Welcome back, Admin!");
        navigate("/admin");
      } else {
        toast.error("Access denied. Admin privileges required.");
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
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-muted-foreground mt-2">Restricted access - Admin only</p>
        </div>

        {/* Security Notice */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 mb-6">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-200">
            This area is restricted. Unauthorized access attempts are logged.
          </p>
        </div>

        {/* Login Form */}
        <Card className="p-6 bg-card/50 backdrop-blur border-white/10">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Admin Email</label>
              <Input
                type="email"
                placeholder="admin@kona.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-secondary/50 border-white/10"
                required
                data-testid="admin-email-input"
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
                  data-testid="admin-password-input"
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
              className="w-full h-12 bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 rounded-full text-lg font-semibold"
              disabled={loading}
              data-testid="admin-login-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In as Admin"}
            </Button>
          </form>
        </Card>

        {/* Access Info */}
        <Card className="mt-6 p-4 bg-card/30 border-white/5">
          <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Admin Capabilities</h3>
          <ul className="text-xs text-muted-foreground/70 space-y-1.5">
            <li>• View platform analytics & revenue</li>
            <li>• Manage users & creators</li>
            <li>• Review & approve content</li>
            <li>• Configure payment gateways</li>
          </ul>
        </Card>

        {/* Creator Link */}
        <div className="mt-6 text-center">
          <Link to="/creator/login" className="text-xs text-muted-foreground hover:text-white">
            Creator? Log in here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
