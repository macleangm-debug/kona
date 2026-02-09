import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { 
  Building2, Mail, Lock, User, Phone, Globe, 
  Briefcase, ArrowRight, ChevronLeft, Loader2,
  BarChart3, Target, DollarSign, Megaphone, Shield, CheckCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/config";
import { toast } from "sonner";

const INDUSTRIES = [
  "Technology", "E-commerce", "Finance", "Healthcare", "Education",
  "Entertainment", "Food & Beverage", "Fashion", "Automotive", "Travel",
  "Real Estate", "Telecommunications", "Other"
];

export const BusinessAuthPage = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // login or register
  const [loading, setLoading] = useState(false);
  
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  
  const [registerForm, setRegisterForm] = useState({
    company_name: "",
    email: "",
    password: "",
    confirm_password: "",
    contact_name: "",
    phone: "",
    website: "",
    industry: ""
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/advertiser/login`, loginForm);
      localStorage.setItem("advertiser_token", res.data.token);
      localStorage.setItem("advertiser", JSON.stringify(res.data.advertiser));
      toast.success(`Welcome back, ${res.data.advertiser.company_name}!`);
      navigate("/business/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (registerForm.password !== registerForm.confirm_password) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (registerForm.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post(`${API}/advertiser/register`, {
        company_name: registerForm.company_name,
        email: registerForm.email,
        password: registerForm.password,
        contact_name: registerForm.contact_name,
        phone: registerForm.phone || null,
        website: registerForm.website || null,
        industry: registerForm.industry || null
      });
      
      localStorage.setItem("advertiser_token", res.data.token);
      localStorage.setItem("advertiser", JSON.stringify(res.data.advertiser));
      toast.success("Account created! Welcome to Kona Ads");
      navigate("/business/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Registration failed");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-heading font-bold text-xl">K<span className="text-primary">O</span>NA</span>
        </Link>
        <span className="text-sm text-white/60">Business Portal</span>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Benefits */}
          <div className="hidden lg:block">
            <h1 className="text-4xl font-heading font-bold text-white mb-6">
              Reach Millions of <span className="text-primary">African Viewers</span>
            </h1>
            <p className="text-lg text-white/70 mb-8">
              Advertise on Kona and connect with an engaged audience watching African stories.
            </p>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Precise Targeting</h3>
                  <p className="text-sm text-white/60">Reach viewers by genre, location, age, and interests</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Pay Per View</h3>
                  <p className="text-sm text-white/60">Only pay when viewers actually watch your ads</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Real-time Analytics</h3>
                  <p className="text-sm text-white/60">Track impressions, views, clicks, and conversions live</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Multiple Ad Formats</h3>
                  <p className="text-sm text-white/60">Pre-roll, mid-roll, Stories, sponsorships & more</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Auth Form */}
          <Card className="p-8 bg-black/40 backdrop-blur-lg border-white/10">
            {/* Tabs */}
            <div className="flex mb-8">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 pb-3 text-center font-medium transition-colors border-b-2 ${
                  mode === "login" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 pb-3 text-center font-medium transition-colors border-b-2 ${
                  mode === "register" 
                    ? "border-primary text-primary" 
                    : "border-transparent text-white/60 hover:text-white"
                }`}
              >
                Create Account
              </button>
            </div>

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      placeholder="your@company.com"
                      className="pl-10"
                      required
                      data-testid="business-login-email"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      data-testid="business-login-password"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={loading}
                  data-testid="business-login-submit"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Sign In <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Company Name *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <Input
                      value={registerForm.company_name}
                      onChange={(e) => setRegisterForm({...registerForm, company_name: e.target.value})}
                      placeholder="Your Company Ltd"
                      className="pl-10"
                      required
                      data-testid="business-register-company"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        type="email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        placeholder="you@company.com"
                        className="pl-10"
                        required
                        data-testid="business-register-email"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Contact Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        value={registerForm.contact_name}
                        onChange={(e) => setRegisterForm({...registerForm, contact_name: e.target.value})}
                        placeholder="John Doe"
                        className="pl-10"
                        required
                        data-testid="business-register-name"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        type="password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        placeholder="Min 8 characters"
                        className="pl-10"
                        required
                        data-testid="business-register-password"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Confirm *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        type="password"
                        value={registerForm.confirm_password}
                        onChange={(e) => setRegisterForm({...registerForm, confirm_password: e.target.value})}
                        placeholder="Confirm password"
                        className="pl-10"
                        required
                        data-testid="business-register-confirm"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        type="tel"
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                        placeholder="+254 700 000000"
                        className="pl-10"
                        data-testid="business-register-phone"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <Input
                        type="url"
                        value={registerForm.website}
                        onChange={(e) => setRegisterForm({...registerForm, website: e.target.value})}
                        placeholder="https://yoursite.com"
                        className="pl-10"
                        data-testid="business-register-website"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-white/70 mb-1 block">Industry</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <select
                      value={registerForm.industry}
                      onChange={(e) => setRegisterForm({...registerForm, industry: e.target.value})}
                      className="w-full h-10 pl-10 pr-4 rounded-lg bg-secondary/50 border border-white/10 text-white appearance-none"
                      data-testid="business-register-industry"
                    >
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(ind => (
                        <option key={ind} value={ind}>{ind}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12" 
                  disabled={loading}
                  data-testid="business-register-submit"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>Create Account <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
                
                <p className="text-xs text-center text-white/50">
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BusinessAuthPage;
