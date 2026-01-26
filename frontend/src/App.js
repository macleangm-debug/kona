import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Home, Play, ShoppingCart, User, Gift, Lock, Coins, Star, Eye, Clock, ChevronLeft, X, Check, Loader2, Share2, Users, Copy, Trophy, Bell, BellRing, Search, Plus, Minus, Heart, Crown, Settings, BarChart3, Film, UserCog, CreditCard, Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { KonaLogo2Full } from "@/components/KonaLogo";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// App Configuration - Easy to change product name
const APP_CONFIG = {
  name: "Kona",
  tagline: "Your corner for the best mini-series",
  welcomeBonus: 50,
  referralBonus: 30,
  referrerReward: 20,
  dailyReward: 10
};

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        } catch (e) {
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, name, referralCode = null) => {
    const res = await axios.post(`${API}/auth/register`, { 
      email, 
      password, 
      name,
      referral_code: referralCode 
    });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Auth Modal
const AuthModal = ({ open, onClose, initialReferralCode = "" }) => {
  const [isLogin, setIsLogin] = useState(initialReferralCode ? false : true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  const [referralValid, setReferralValid] = useState(null);
  const [referralBonus, setReferralBonus] = useState(0);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  // Update referral code when initialReferralCode changes (from URL)
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
      setIsLogin(false); // Switch to signup mode
    }
  }, [initialReferralCode]);

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
        toast.success("Welcome back!");
      } else {
        await register(email, password, name, referralValid ? referralCode : null);
        const bonusMsg = referralValid ? ` Plus ${APP_CONFIG.referralBonus} bonus coins from referral!` : "";
        toast.success(`Account created! You got ${APP_CONFIG.welcomeBonus} welcome coins!${bonusMsg}`);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
  );
};

// Daily Reward Modal
const DailyRewardModal = ({ open, onClose, onClaim }) => {
  const [loading, setLoading] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClaim = async () => {
    setLoading(true);
    const success = await onClaim();
    if (success) {
      setClaimed(true);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[340px] bg-card border-white/10" data-testid="daily-reward-modal">
        <DialogHeader>
          <DialogTitle className="sr-only">Daily Reward</DialogTitle>
          <DialogDescription className="sr-only">Claim your free coins</DialogDescription>
        </DialogHeader>
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.5)]">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-heading text-2xl mb-2">Daily Reward!</h2>
          <p className="text-muted-foreground mb-6">Claim your free 10 coins today</p>
          
          {claimed ? (
            <div className="flex items-center justify-center gap-2 text-green-400">
              <Check className="w-5 h-5" />
              <span>Claimed!</span>
            </div>
          ) : (
            <Button 
              onClick={handleClaim}
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-full px-8"
              disabled={loading}
              data-testid="claim-reward-btn"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Claim Reward"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Unlock Sheet
const UnlockSheet = ({ open, onClose, episode, onUnlock, userCoins }) => {
  const [loading, setLoading] = useState(false);
  const canAfford = userCoins >= (episode?.coins_required || 0);

  const handleUnlock = async () => {
    setLoading(true);
    await onUnlock(episode.id);
    setLoading(false);
    onClose();
  };

  if (!episode) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="bg-card border-t border-white/10 rounded-t-3xl" data-testid="unlock-sheet">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">Unlock Episode</SheetTitle>
        </SheetHeader>
        <div className="py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock className="w-6 h-6 text-muted-foreground" />
            <span className="text-lg">{episode.title}</span>
          </div>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1 text-yellow-400">
              <Coins className="w-5 h-5" />
              <span className="font-semibold">{episode.coins_required}</span>
            </div>
            <span className="text-muted-foreground">coins required</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Your balance: <span className="text-yellow-400">{userCoins} coins</span>
          </p>
          {canAfford ? (
            <Button 
              onClick={handleUnlock}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-full px-8"
              disabled={loading}
              data-testid="unlock-confirm-btn"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Unlock Now"}
            </Button>
          ) : (
            <p className="text-red-400 text-sm">Not enough coins. Visit the store to get more!</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Bottom Navigation
const BottomNav = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Hide bottom nav on video player page
  if (location.pathname.startsWith("/watch")) {
    return null;
  }
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: ShoppingCart, label: "Store", path: "/store" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const handleNav = (path) => {
    if ((path === "/store" || path === "/profile") && !user) {
      onAuthClick();
    } else {
      navigate(path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50 max-w-md mx-auto" data-testid="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => handleNav(item.path)}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${isActive ? "text-primary" : "text-muted-foreground hover:text-white"}`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

// Coin Balance Display
const CoinBalance = ({ coins, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 bg-secondary/50 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 hover:bg-secondary/80 transition-all"
    data-testid="coin-balance"
  >
    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
      <Coins className="w-3 h-3 text-white" />
    </div>
    <span className="font-semibold text-sm">{coins || 0}</span>
  </button>
);

// Series Card - Industry Standard (Grid style with badges)
const SeriesCard = ({ series, onClick, badge, showViews = true, inMyList = false, onAddToList, onRemoveFromList }) => {
  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views;
  };

  const handleListToggle = (e) => {
    e.stopPropagation();
    if (inMyList) {
      onRemoveFromList?.(series.id);
    } else {
      onAddToList?.(series.id);
    }
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group"
      data-testid={`series-card-${series.id}`}
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
        <img 
          src={series.thumbnail} 
          alt={series.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Badge - Hot/New/Top */}
        {badge && (
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
            badge === "hot" ? "bg-red-500" :
            badge === "new" ? "bg-green-500" :
            badge === "top" ? "bg-yellow-500 text-black" :
            badge === "vip" ? "bg-purple-500" :
            "bg-primary"
          }`}>
            {badge}
          </div>
        )}
        
        {/* Episode count - top right */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px]">
          {series.total_episodes} EP
        </div>
        
        {/* Add to List Button */}
        {(onAddToList || onRemoveFromList) && (
          <button
            onClick={handleListToggle}
            className="absolute bottom-8 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            data-testid={`add-to-list-${series.id}`}
          >
            {inMyList ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        {/* View count */}
        {showViews && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[10px] text-white/90">
            <Eye className="w-3 h-3" />
            <span>{formatViews(series.views)}</span>
          </div>
        )}
        
        {/* Rating */}
        <div className="absolute bottom-2 right-2 flex items-center gap-0.5 text-[10px]">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span>{series.rating}</span>
        </div>
      </div>
      
      {/* Title & Info */}
      <h3 className="font-medium text-sm line-clamp-1 mb-0.5">{series.title}</h3>
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground">{series.genre}</span>
        <span className="text-green-400 font-medium">• Free EP1</span>
      </div>
    </div>
  );
};

// Continue Watching Card - Same size as other thumbnails
const ContinueWatchingCard = ({ series, episode, progress, onClick }) => (
  <div
    onClick={onClick}
    className="cursor-pointer group"
    data-testid={`continue-${series.id}`}
  >
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
      <img 
        src={series.thumbnail} 
        alt={series.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-5 h-5 text-black fill-black ml-0.5" />
        </div>
      </div>
      {/* Episode badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-primary text-[10px] font-medium">
        EP.{episode}
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </div>
    <h3 className="font-medium text-sm line-clamp-1">{series.title}</h3>
    <p className="text-[11px] text-muted-foreground">{progress}% watched</p>
  </div>
);

// Coming Soon Card
const ComingSoonCard = ({ series, isReminded, onRemind, loading }) => {
  const formatCount = (count) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };

  return (
    <div className="cursor-pointer group" data-testid={`coming-soon-${series.id}`}>
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2">
        <img 
          src={series.thumbnail} 
          alt={series.title}
          className="w-full h-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Release date badge */}
        <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded">
          {series.release_date}
        </div>
        
        {/* Coming Soon badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-[10px] rounded">
          Coming Soon
        </div>
        
        {/* Remind Me Button */}
        <div className="absolute bottom-2 left-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemind(series.id);
            }}
            disabled={isReminded || loading}
            className={`w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              isReminded 
                ? "bg-green-500/90 text-white" 
                : "bg-white/90 text-black hover:bg-white"
            }`}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : isReminded ? (
              <>
                <BellRing className="w-3 h-3" />
                Reminder Set
              </>
            ) : (
              <>
                <Bell className="w-3 h-3" />
                Remind Me
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Title & Info */}
      <h3 className="font-medium text-sm line-clamp-1 mb-0.5">{series.title}</h3>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{series.genre}</span>
        <span>•</span>
        <span>{formatCount(series.reserved_count)} Reserved</span>
      </div>
    </div>
  );
};

// Reminder Success Modal with Push Notification Request
const ReminderSuccessModal = ({ open, onClose }) => {
  const [permissionState, setPermissionState] = useState('default'); // 'default', 'granted', 'denied', 'unsupported'
  const [loading, setLoading] = useState(false);

  const requestNotificationPermission = async () => {
    setLoading(true);
    
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      setLoading(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      
      if (permission === 'granted') {
        // Show a test notification
        new Notification('Kona', {
          body: 'You\'ll be notified when new episodes drop!',
          icon: '/favicon.ico'
        });
        toast.success('Notifications enabled!');
        setTimeout(onClose, 1500);
      }
    } catch (error) {
      console.error('Notification permission error:', error);
      setPermissionState('denied');
    }
    setLoading(false);
  };

  const openSettings = () => {
    // Guide user to enable notifications
    toast.info('Go to your browser settings to enable notifications for this site');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[300px] bg-card border-white/10 text-center" data-testid="reminder-success-modal">
        <DialogHeader>
          <DialogTitle className="sr-only">Reminder Set</DialogTitle>
          <DialogDescription className="sr-only">Enable notifications</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {permissionState === 'granted' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <BellRing className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Notifications Enabled!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We'll notify you when this series is released
              </p>
            </>
          ) : permissionState === 'denied' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Notifications Blocked</h2>
              <p className="text-sm text-muted-foreground mb-4">
                To receive alerts, please enable notifications in your browser settings:
              </p>
              <div className="text-left text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3 mb-4">
                <p className="font-medium text-white mb-2">How to enable:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the lock/info icon in your browser's address bar</li>
                  <li>Find "Notifications" setting</li>
                  <li>Change to "Allow"</li>
                  <li>Refresh this page</li>
                </ol>
              </div>
              <Button 
                onClick={openSettings}
                className="w-full bg-primary hover:bg-primary/90 rounded-full"
              >
                Got It
              </Button>
            </>
          ) : permissionState === 'unsupported' ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                <Bell className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Not Supported</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your browser doesn't support push notifications. Try using Chrome or Safari.
              </p>
              <Button 
                onClick={onClose}
                variant="outline"
                className="w-full rounded-full"
              >
                Close
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-heading text-xl mb-2">Reserved successfully!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enable notifications to get alerted when the drama is released
              </p>
              <Button 
                onClick={requestNotificationPermission}
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 rounded-full"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Turn On'}
              </Button>
              <button 
                onClick={onClose}
                className="mt-3 text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Install App Banner Component
const InstallAppBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('kona-install-dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (dismissed || isStandalone) {
      return;
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // For non-iOS, listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Show iOS instructions after a delay
    if (iOS) {
      setTimeout(() => setShowBanner(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('Installing Kona...');
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('kona-install-dismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-4" data-testid="install-banner">
      <div className="bg-gradient-to-r from-primary/90 to-purple-600/90 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/10">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-black">K</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-bold text-sm mb-0.5">Install Kona App</h3>
            {isIOS ? (
              <p className="text-xs text-white/80 leading-relaxed">
                Tap <span className="inline-flex items-center"><svg className="w-4 h-4 mx-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H8l4-7v4h3l-4 7z"/></svg></span> then "Add to Home Screen"
              </p>
            ) : (
              <p className="text-xs text-white/80">Get push notifications & quick access</p>
            )}
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-white/10 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
        {!isIOS && (
          <Button 
            onClick={handleInstall}
            className="w-full mt-3 bg-white text-primary hover:bg-white/90 rounded-full font-semibold"
            size="sm"
          >
            Install Now
          </Button>
        )}
      </div>
    </div>
  );
};

// Search Modal Component
const SearchModal = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("kona-recent-searches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (series) => {
    // Save to recent searches
    const updated = [series.title, ...recentSearches.filter(s => s !== series.title)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("kona-recent-searches", JSON.stringify(updated));
    
    navigate(`/series/${series.id}`);
    onClose();
    setQuery("");
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("kona-recent-searches");
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="top" className="h-[85vh] bg-background border-b border-white/10">
        <div className="pt-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search series, genres..."
              className="pl-10 h-12 bg-secondary border-0 rounded-full text-base"
              autoFocus
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {/* Results */}
          {!loading && results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-2">{results.length} results</p>
              {results.map(series => (
                <div
                  key={series.id}
                  onClick={() => handleSelect(series)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                >
                  <img src={series.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">{series.title}</h4>
                    <p className="text-xs text-muted-foreground">{series.genre} • {series.total_episodes} Eps <span className="text-green-400">• Free EP1</span></p>
                  </div>
                  <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && query && results.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No results found</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
            </div>
          )}

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Recent Searches</p>
                <button onClick={clearRecent} className="text-xs text-primary">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(term)}
                    className="px-3 py-1.5 bg-secondary rounded-full text-sm"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Genres */}
          {!query && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Browse by Genre</p>
              <div className="grid grid-cols-2 gap-2">
                {["Romance", "Drama", "Thriller", "Action"].map(genre => (
                  <button
                    key={genre}
                    onClick={() => setQuery(genre)}
                    className="p-4 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-xl text-left hover:from-primary/30 hover:to-purple-600/30 transition-colors"
                  >
                    <span className="font-medium">{genre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Tab Button
const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
      active 
        ? "text-white border-b-2 border-primary" 
        : "text-muted-foreground hover:text-white"
    }`}
  >
    {children}
  </button>
);

// Category Pill
const CategoryPill = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
      active 
        ? "bg-primary text-white" 
        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

// Home Page - Industry Standard
const HomePage = ({ onAuthClick }) => {
  const [series, setSeries] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [myList, setMyList] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [userReminders, setUserReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(null);
  const [showReminderSuccess, setShowReminderSuccess] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState("explore");
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [showReward, setShowReward] = useState(false);
  const [canClaimReward, setCanClaimReward] = useState(false);

  const tabs = [
    { id: "explore", label: "Explore" },
    { id: "new", label: "New" },
    { id: "originals", label: "Originals" },
    { id: "rankings", label: "Rankings" },
  ];

  const categories = [
    { id: "all", label: "Popular" },
    { id: "romance", label: "Romance" },
    { id: "drama", label: "Drama" },
    { id: "action", label: "Action" },
    { id: "thriller", label: "Thriller" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [seriesRes, featuredRes, comingSoonRes] = await Promise.all([
          axios.get(`${API}/series`),
          axios.get(`${API}/series/featured`),
          axios.get(`${API}/series/coming-soon`)
        ]);
        setSeries(seriesRes.data);
        setFeatured(featuredRes.data);
        setComingSoon(comingSoonRes.data);
        
        // Fetch user-specific data
        if (token) {
          // Real Continue Watching data
          try {
            const continueRes = await axios.get(`${API}/user/continue-watching`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setContinueWatching(continueRes.data);
          } catch (e) {
            // Fallback to mock data if no progress yet
            const mockContinue = seriesRes.data.slice(0, 3).map((s, i) => ({
              series: s,
              episode: i + 2,
              progress: Math.floor(Math.random() * 60) + 30
            }));
            setContinueWatching(mockContinue);
          }
          
          // Fetch My List
          try {
            const myListRes = await axios.get(`${API}/user/my-list`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setMyList(myListRes.data.map(s => s.id));
          } catch (e) {
            console.error("Error fetching my list:", e);
          }
          
          // Fetch user reminders
          try {
            const remindersRes = await axios.get(`${API}/user/reminders`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setUserReminders(remindersRes.data.reminders || []);
          } catch (e) {
            console.error("Error fetching reminders:", e);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Add to My List
  const handleAddToList = async (seriesId) => {
    if (!token) {
      onAuthClick();
      return;
    }
    try {
      await axios.post(`${API}/user/my-list/add`, 
        { series_id: seriesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyList([...myList, seriesId]);
      toast.success("Added to My List");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add");
    }
  };

  // Remove from My List
  const handleRemoveFromList = async (seriesId) => {
    try {
      await axios.post(`${API}/user/my-list/remove`, 
        { series_id: seriesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyList(myList.filter(id => id !== seriesId));
      toast.success("Removed from My List");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to remove");
    }
  };

  // Handle setting a reminder
  const handleSetReminder = async (seriesId) => {
    if (!token) {
      onAuthClick();
      return;
    }
    
    setReminderLoading(seriesId);
    try {
      await axios.post(`${API}/series/remind`, 
        { series_id: seriesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserReminders([...userReminders, seriesId]);
      setShowReminderSuccess(true);
      
      // Update local coming soon count
      setComingSoon(comingSoon.map(s => 
        s.id === seriesId ? { ...s, reserved_count: s.reserved_count + 1 } : s
      ));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to set reminder");
    }
    setReminderLoading(null);
  };

  useEffect(() => {
    const checkReward = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/rewards/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.can_claim) {
            setCanClaimReward(true);
            setShowReward(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkReward();
  }, [token]);

  const handleClaimReward = async () => {
    try {
      await axios.post(`${API}/rewards/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      toast.success("You got 10 coins!");
      setCanClaimReward(false);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim reward");
      return false;
    }
  };

  // Filter series based on active category
  const filteredSeries = activeCategory === "all" 
    ? series 
    : series.filter(s => s.genre.toLowerCase() === activeCategory);

  // Assign badges to series
  const getBadge = (s, index) => {
    if (s.featured) return "hot";
    if (index < 2) return "new";
    if (s.rating >= 4.8) return "top";
    return null;
  };

  const genres = [...new Set(series.map(s => s.genre))];

  // Hero carousel - use featured series or top series
  const heroSlides = featured.length > 0 ? featured : series.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Auto-play carousel
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4000); // Change slide every 4 seconds
    
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Swipe handlers
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (distance > minSwipeDistance && activeIndex < heroSlides.length - 1) {
      setActiveIndex(activeIndex + 1);
    } else if (distance < -minSwipeDistance && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const goToSlide = (index) => {
    setActiveIndex(Math.max(0, Math.min(heroSlides.length - 1, index)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20" data-testid="home-page">
      {/* Header - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black via-black/90 to-transparent max-w-md mx-auto" data-testid="app-header">
        <KonaLogo2Full height={28} />
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setShowSearch(true)}
            data-testid="search-btn"
          >
            <Search className="w-5 h-5" />
          </button>
          {user ? (
            <>
              <button 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setShowReward(true)}
                data-testid="gift-btn"
              >
                <Gift className="w-5 h-5 text-yellow-400" />
              </button>
              <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
            </>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              className="rounded-full bg-primary hover:bg-primary/90 h-8 px-4"
              onClick={onAuthClick}
              data-testid="login-btn"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Hero Carousel - True 3D Transform Based */}
      {heroSlides.length > 0 && (
        <div 
          className="mb-6 relative h-[420px]" 
          data-testid="hero-carousel"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Cards Container with 3D perspective */}
          <div 
            className="relative h-full w-full flex items-center justify-center"
            style={{ perspective: '1000px' }}
          >
            {heroSlides.map((heroSeries, index) => {
              const offset = index - activeIndex;
              const absOffset = Math.abs(offset);
              const isActive = offset === 0;
              
              // Calculate transforms
              const translateX = offset * 75; // Horizontal spacing
              const translateZ = -absOffset * 150; // Depth
              const rotateY = offset * 25; // Rotation
              const scale = isActive ? 1 : 0.8;
              const translateY = absOffset * 30; // Vertical drop
              const opacity = absOffset > 1 ? 0 : 1;
              const zIndex = 10 - absOffset;
              
              return (
                <div 
                  key={heroSeries.id}
                  className="absolute transition-all duration-500 ease-out cursor-pointer"
                  style={{
                    width: '70%',
                    maxWidth: '280px',
                    transform: `
                      translateX(${translateX}%)
                      translateY(${translateY}px)
                      translateZ(${translateZ}px)
                      rotateY(${rotateY}deg)
                      scale(${scale})
                    `,
                    zIndex,
                    opacity,
                    transformStyle: 'preserve-3d',
                  }}
                  onClick={() => isActive ? navigate(`/series/${heroSeries.id}`) : goToSlide(index)}
                >
                  {/* Card */}
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                    {/* Background Image */}
                    <img 
                      src={heroSeries.thumbnail} 
                      alt={heroSeries.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    
                    {/* Dark overlay for side cards */}
                    <div 
                      className="absolute inset-0 bg-black transition-opacity duration-500"
                      style={{ opacity: isActive ? 0 : 0.5 }}
                    />
                    
                    {/* Top Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                        TOP {index + 1}
                      </span>
                      {heroSeries.featured && (
                        <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                          HOT
                        </span>
                      )}
                    </div>
                    
                    {/* Episode Count */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs">
                      {heroSeries.total_episodes} EP
                    </div>
                    
                    {/* Play Button - Only on active card */}
                    {isActive && (
                      <button 
                        className="absolute inset-0 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to first episode of this series
                          navigate(`/watch/${heroSeries.id}-ep1`);
                        }}
                        data-testid={`hero-play-btn-${index}`}
                      >
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-black fill-black ml-1" />
                        </div>
                      </button>
                    )}
                    
                    {/* Content at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h2 className="font-heading text-lg font-bold mb-1 line-clamp-2">
                        {heroSeries.title}
                      </h2>
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <span>{heroSeries.genre}</span>
                        <span>•</span>
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span>{heroSeries.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dot Indicators */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === activeIndex 
                    ? "w-6 h-2 bg-red-500" 
                    : "w-2 h-2 bg-white/40 hover:bg-white/60"
                }`}
                data-testid={`slide-dot-${index}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticky Navigation - Tabs & Categories */}
      <div className="sticky top-14 z-40 bg-background">
        {/* Top Tabs */}
        <div className="flex items-center gap-1 px-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <TabButton 
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-background">
          {categories.map(cat => (
            <CategoryPill 
              key={cat.id}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </CategoryPill>
          ))}
        </div>
      </div>

      {/* Trending Now - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">
            {activeCategory === "all" ? "Trending Now 🔥" : categories.find(c => c.id === activeCategory)?.label}
          </h2>
          <button 
            onClick={() => navigate("/category/trending")}
            className="text-xs text-primary"
            data-testid="see-all-trending"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {filteredSeries.map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={getBadge(s, index)}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* My List Section - Only show if user has items */}
      {user && myList.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-heading text-sm font-semibold">My List 📚</h2>
            <button 
              onClick={() => navigate("/category/my-list")}
              className="text-xs text-primary"
              data-testid="see-all-my-list"
            >See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {series.filter(s => myList.includes(s.id)).map((s) => (
              <div key={s.id} className="flex-shrink-0 w-28">
                <SeriesCard 
                  series={s}
                  onClick={() => navigate(`/series/${s.id}`)}
                  showViews={false}
                  inMyList={true}
                  onRemoveFromList={handleRemoveFromList}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Romance Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Romance 💕</h2>
          <button 
            onClick={() => navigate("/category/romance")}
            className="text-xs text-primary"
            data-testid="see-all-romance"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Romance").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={index === 0 ? "hot" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
                inMyList={myList.includes(s.id)}
                onAddToList={handleAddToList}
                onRemoveFromList={handleRemoveFromList}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Continue Watching - Lower on the page like Netflix */}
      {user && continueWatching.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-heading text-sm font-semibold">Continue Watching</h2>
            <button 
              onClick={() => navigate("/category/continue-watching")}
              className="text-xs text-primary"
              data-testid="see-all-continue-watching"
            >See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {continueWatching.map((item, i) => (
              <div key={i} className="flex-shrink-0 w-28">
                <ContinueWatchingCard
                  series={item.series}
                  episode={item.episode}
                  progress={item.progress}
                  onClick={() => navigate(`/series/${item.series.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thriller Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Thriller 🔪</h2>
          <button 
            onClick={() => navigate("/category/thriller")}
            className="text-xs text-primary"
            data-testid="see-all-thriller"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Thriller").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={index === 0 ? "top" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Drama Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Drama 🎭</h2>
          <button 
            onClick={() => navigate("/category/drama")}
            className="text-xs text-primary"
            data-testid="see-all-drama"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Drama").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={index === 0 ? "vip" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Action 💥</h2>
          <button 
            onClick={() => navigate("/category/action")}
            className="text-xs text-primary"
            data-testid="see-all-action"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Action").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={index === 0 ? "new" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Section - Horizontal Scroll */}
      {comingSoon.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-heading text-sm font-semibold">Coming Soon 🔜</h2>
            <button 
              onClick={() => navigate("/category/coming-soon")}
              className="text-xs text-primary"
              data-testid="see-all-coming-soon"
            >See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {comingSoon.map((s) => (
              <div key={s.id} className="flex-shrink-0 w-28">
                <ComingSoonCard
                  series={s}
                  isReminded={userReminders.includes(s.id)}
                  onRemind={handleSetReminder}
                  loading={reminderLoading === s.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Releases Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">New Releases ✨</h2>
          <button 
            onClick={() => navigate("/category/new-releases")}
            className="text-xs text-primary"
            data-testid="see-all-new-releases"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.slice(-8).map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge="new"
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rankings Section */}
      {activeTab === "rankings" && (
        <div className="px-4 mt-6">
          <h2 className="font-heading text-sm font-semibold mb-3">Top 10 This Week</h2>
          <div className="space-y-3">
            {series.slice(0, 10).map((s, index) => (
              <div 
                key={s.id}
                onClick={() => navigate(`/series/${s.id}`)}
                className="flex items-center gap-3 p-2 rounded-xl bg-card/50 hover:bg-card transition-colors cursor-pointer"
              >
                <span className="font-heading text-2xl font-black text-primary w-8">{index + 1}</span>
                <img src={s.thumbnail} alt={s.title} className="w-16 h-20 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.genre} • {s.total_episodes} eps</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs">{s.rating}</span>
                    <Eye className="w-3 h-3 text-muted-foreground ml-2" />
                    <span className="text-xs text-muted-foreground">{(s.views/1000).toFixed(0)}K</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DailyRewardModal 
        open={showReward} 
        onClose={() => setShowReward(false)}
        onClaim={handleClaimReward}
      />
      
      <ReminderSuccessModal
        open={showReminderSuccess}
        onClose={() => setShowReminderSuccess(false)}
      />
      
      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </div>
  );
};

// Series Detail Page
const SeriesDetailPage = ({ onAuthClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [unlockedEpisodes, setUnlockedEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockSheet, setUnlockSheet] = useState({ open: false, episode: null });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [seriesRes, episodesRes] = await Promise.all([
          axios.get(`${API}/series/${id}`),
          axios.get(`${API}/series/${id}/episodes`)
        ]);
        setSeries(seriesRes.data);
        setEpisodes(episodesRes.data);

        if (token) {
          const unlockedRes = await axios.get(`${API}/user/unlocked-episodes`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUnlockedEpisodes(unlockedRes.data.unlocked_episodes);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, token]);

  const handleEpisodeClick = (episode) => {
    if (!user) {
      onAuthClick();
      return;
    }
    
    const isUnlocked = episode.is_free || unlockedEpisodes.includes(episode.id);
    if (isUnlocked) {
      navigate(`/watch/${episode.id}`);
    } else {
      setUnlockSheet({ open: true, episode });
    }
  };

  const handleUnlock = async (episodeId) => {
    try {
      await axios.post(`${API}/episodes/unlock`, { episode_id: episodeId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnlockedEpisodes([...unlockedEpisodes, episodeId]);
      await refreshUser();
      toast.success("Episode unlocked!");
      navigate(`/watch/${episodeId}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to unlock");
    }
  };

  if (loading || !series) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20" data-testid="series-detail-page">
      {/* Hero */}
      <div className="relative h-64">
        <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {user && (
          <div className="absolute top-4 right-4">
            <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 -mt-16 relative z-10">
        <Badge className="mb-2 bg-primary/80">{series.genre}</Badge>
        <h1 className="font-heading text-2xl font-bold mb-2">{series.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{series.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{(series.views / 1000).toFixed(0)}K views</span>
          </div>
          <span>{series.total_episodes} episodes</span>
        </div>
        <p className="text-muted-foreground text-sm mb-6">{series.description}</p>

        {/* Episodes */}
        <h2 className="font-heading text-lg font-semibold mb-3">Episodes</h2>
        <div className="space-y-2">
          {episodes.map((ep) => {
            const isUnlocked = ep.is_free || unlockedEpisodes.includes(ep.id);
            return (
              <div
                key={ep.id}
                onClick={() => handleEpisodeClick(ep)}
                className="flex items-center gap-4 p-3 rounded-xl bg-card/50 border border-white/5 hover:bg-card/80 transition-all cursor-pointer"
                data-testid={`episode-${ep.episode_number}`}
              >
                <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ep.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{ep.duration}</span>
                    {!isUnlocked && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Coins className="w-3 h-3" />
                        {ep.coins_required}
                      </span>
                    )}
                  </div>
                </div>
                {isUnlocked ? (
                  <Play className="w-5 h-5 text-primary" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <UnlockSheet
        open={unlockSheet.open}
        onClose={() => setUnlockSheet({ open: false, episode: null })}
        episode={unlockSheet.episode}
        onUnlock={handleUnlock}
        userCoins={user?.coins || 0}
      />
    </div>
  );
};

// Video Player Page
const VideoPlayerPage = ({ onAuthClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [series, setSeries] = useState(null);
  const [allEpisodes, setAllEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [videoQuality, setVideoQuality] = useState("480p");
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [signUpPromptType, setSignUpPromptType] = useState(""); // "midway", "end", "next_episode"
  const lastSavedProgress = useRef(0);
  const hasShownMidwayPrompt = useRef(false);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show sign-up prompt at 50% of video for guests
  useEffect(() => {
    if (!user && duration > 0 && currentTime > duration * 0.5 && !hasShownMidwayPrompt.current) {
      hasShownMidwayPrompt.current = true;
      setSignUpPromptType("midway");
      setShowSignUpPrompt(true);
      // Pause video when showing prompt
      const video = document.getElementById('main-video');
      if (video) video.pause();
      setIsPlaying(false);
    }
  }, [currentTime, duration, user]);

  // Show end prompt when video ends for guests
  const handleVideoEnded = () => {
    if (!user) {
      setSignUpPromptType("end");
      setShowSignUpPrompt(true);
    }
  };

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    let timer;
    if (showControls) {
      timer = setTimeout(() => setShowControls(false), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showControls]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const epRes = await axios.get(`${API}/episodes/${id}`, { headers });
        setEpisode(epRes.data);

        const seriesRes = await axios.get(`${API}/series/${epRes.data.series_id}`);
        setSeries(seriesRes.data);

        // Fetch all episodes for the series
        const allEpsRes = await axios.get(`${API}/series/${epRes.data.series_id}/episodes`);
        setAllEpisodes(allEpsRes.data);
      } catch (e) {
        console.error("Error loading episode:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, token]);

  const handleTimeUpdate = (e) => {
    const video = e.target;
    setCurrentTime(video.currentTime);
    if (video.duration && !duration) {
      setDuration(video.duration);
    }
    
    // Save progress every 10%
    if (token && duration > 0) {
      const progress = Math.round((video.currentTime / duration) * 100);
      const progressBucket = Math.floor(progress / 10) * 10;
      if (progressBucket > 0 && progressBucket !== lastSavedProgress.current) {
        lastSavedProgress.current = progressBucket;
        axios.post(`${API}/episodes/progress`, { episode_id: id, progress: progressBucket }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    }
  };

  const [isSeeking, setIsSeeking] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const progressBarRef = useRef(null);

  const calculateSeekPosition = (clientX) => {
    if (!progressBarRef.current || duration <= 0) return null;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    return percentage * duration;
  };

  const handleSeekStart = (e) => {
    e.preventDefault();
    setIsSeeking(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = calculateSeekPosition(clientX);
    if (newTime !== null) {
      setCurrentTime(newTime);
    }
  };

  const handleSeekMove = (e) => {
    if (!isSeeking) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = calculateSeekPosition(clientX);
    if (newTime !== null) {
      setCurrentTime(newTime);
    }
  };

  const handleSeekEnd = () => {
    if (isSeeking) {
      const video = document.getElementById('main-video');
      if (video) {
        video.currentTime = currentTime;
      }
      setIsSeeking(false);
    }
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isSeeking) {
      const handleMove = (e) => handleSeekMove(e);
      const handleEnd = () => handleSeekEnd();
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isSeeking, currentTime]);

  const togglePlayPause = () => {
    setShowControls(true);
    const video = document.getElementById('main-video');
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVideoTap = () => {
    setShowControls(!showControls);
  };

  const changeSpeed = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    const video = document.getElementById('main-video');
    if (video) video.playbackRate = nextSpeed;
  };

  if (loading || !episode) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-black z-[9999]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>,
      document.body
    );
  }

  const playerContent = (
    <div className="fixed inset-0 bg-black z-[9999]" data-testid="video-player-page">
      {/* Full-screen vertical video */}
      <video
        id="main-video"
        src={episode.video_url}
        autoPlay
        loop
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onClick={handleVideoTap}
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="video-element"
      />

      {/* Top gradient overlay - only visible when controls shown */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Bottom gradient overlay - only visible when controls shown */}
      <div className={`absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      {/* Header - only visible when controls shown */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-2"
          data-testid="player-back-btn"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white text-sm font-medium truncate px-4">
            {series?.title} <span className="text-white/70">EP.{episode.episode_number}</span>
          </p>
        </div>
        <button className="p-2">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>

      {/* Center play/pause button - shows when paused or controls visible */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-10"
        onClick={handleVideoTap}
      >
        {!isPlaying && (
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        )}
        {isPlaying && showControls && (
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <svg className="w-8 h-8 text-white" fill="white" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          </button>
        )}
      </div>

      {/* Right side action buttons - only visible when showControls is true */}
      <div className={`absolute right-3 bottom-36 flex flex-col items-center gap-5 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Likes */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs">5.5K</span>
        </button>

        {/* Episodes */}
        <button 
          onClick={() => setShowEpisodes(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </div>
          <span className="text-white text-xs">Episodes</span>
        </button>

        {/* Download/VIP */}
        <button 
          onClick={() => navigate("/subscriptions")}
          className="flex flex-col items-center gap-1 relative"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">VIP</span>
          <span className="text-white text-xs">Download</span>
        </button>
      </div>

      {/* Bottom control bar - only visible when showControls is true */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Progress bar - draggable */}
        <div className="px-4 mb-2">
          <div 
            ref={progressBarRef}
            className="relative h-2 bg-white/30 rounded-full cursor-pointer touch-none"
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
          >
            <div 
              className="absolute left-0 top-0 h-full bg-primary rounded-full pointer-events-none"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none"
              style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white text-xs">{formatTime(currentTime)}</span>
            <span className="text-white text-xs">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
          {/* Upgrade to VIP */}
          <button 
            onClick={() => navigate("/subscriptions")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
          >
            <Crown className="w-3.5 h-3.5" />
            Upgrade to VIP &gt;
          </button>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={changeSpeed}
              className="text-white text-xs font-medium bg-white/20 px-2.5 py-1 rounded"
            >
              {playbackSpeed}X
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-white text-xs font-medium bg-white/20 px-2.5 py-1 rounded"
              >
                {videoQuality}
              </button>
              {/* Quality menu */}
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden min-w-[100px]">
                  {[
                    { value: "480p", label: "480p", vip: false },
                    { value: "720p", label: "720p", vip: false },
                    { value: "1080p", label: "1080p", vip: true }
                  ].map((quality) => (
                    <button
                      key={quality.value}
                      onClick={() => {
                        if (quality.vip) {
                          navigate("/subscriptions");
                        } else {
                          setVideoQuality(quality.value);
                        }
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-white/10 ${
                        videoQuality === quality.value ? 'text-primary' : 'text-white'
                      }`}
                    >
                      <span>{quality.label}</span>
                      {quality.vip && (
                        <span className="bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">VIP</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Sheet */}
      <Sheet open={showEpisodes} onOpenChange={setShowEpisodes}>
        <SheetContent side="bottom" className="h-[60vh] bg-background/95 backdrop-blur-lg rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Episodes</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 overflow-y-auto max-h-[calc(60vh-80px)]">
            {allEpisodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => {
                  navigate(`/watch/${ep.id}`);
                  setShowEpisodes(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  ep.id === episode.id ? 'bg-primary/20 border border-primary' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {ep.episode_number}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{ep.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ep.coins_required === 0 ? (
                      <span className="text-green-400">FREE</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        {ep.coins_required}
                      </span>
                    )}
                  </p>
                </div>
                {ep.id === episode.id && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return createPortal(playerContent, document.body);
};

// Coin Store Page
const StorePage = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const location = useLocation();
  
  // Geo & Payment state
  const [geoData, setGeoData] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [packagesRes, geoRes, countriesRes] = await Promise.all([
          axios.get(`${API}/store/packages`),
          axios.get(`${API}/geo/detect`),
          axios.get(`${API}/geo/countries`)
        ]);
        setPackages(packagesRes.data);
        setGeoData(geoRes.data);
        setCountries(countriesRes.data);
        
        // Set detected country as default
        const detectedCountry = countriesRes.data.find(c => c.code === geoRes.data.country_code);
        if (detectedCountry) {
          setSelectedCountry(detectedCountry);
          setSelectedPaymentMethod(detectedCountry.payment_methods[0]);
        } else {
          // Default to international
          const intl = countriesRes.data.find(c => c.code === "INTL");
          setSelectedCountry(intl);
          setSelectedPaymentMethod(intl?.payment_methods[0]);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Check for payment return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    const txRef = params.get("tx_ref");
    const provider = params.get("provider") || "stripe";
    
    const paymentRef = sessionId || txRef;
    
    if (paymentRef && token) {
      setCheckingPayment(true);
      const pollStatus = async (attempts = 0) => {
        if (attempts >= 5) {
          setCheckingPayment(false);
          toast.error("Payment verification timed out");
          navigate("/store", { replace: true });
          return;
        }
        
        try {
          const res = await axios.get(`${API}/store/checkout/status/${paymentRef}?provider=${provider}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data.payment_status === "paid") {
            await refreshUser();
            toast.success("Payment successful! Coins added to your account.");
            setCheckingPayment(false);
            navigate("/store", { replace: true });
          } else if (res.data.status === "expired" || res.data.status === "failed") {
            toast.error("Payment failed or expired");
            setCheckingPayment(false);
            navigate("/store", { replace: true });
          } else {
            setTimeout(() => pollStatus(attempts + 1), 2000);
          }
        } catch (e) {
          console.error(e);
          setCheckingPayment(false);
          navigate("/store", { replace: true });
        }
      };
      pollStatus();
    }
  }, [location, token, refreshUser, navigate]);

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setShowPaymentSheet(true);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !selectedPaymentMethod || !selectedCountry) return;
    
    // Check if mobile money requires phone number
    if (selectedPaymentMethod.type === "mobilemoney" && !phoneNumber) {
      toast.error("Please enter your phone number for mobile money payment");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/store/checkout`, {
        package_id: selectedPackage.id,
        origin_url: window.location.origin,
        payment_method: selectedPaymentMethod.id,
        country_code: selectedCountry.code,
        phone_number: phoneNumber || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowPaymentSheet(false);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create checkout");
    }
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setSelectedPaymentMethod(country.payment_methods[0]);
    setShowCountryPicker(false);
  };

  // Calculate local price
  const getLocalPrice = (usdPrice) => {
    if (!selectedCountry) return `$${usdPrice.toFixed(2)}`;
    const currency = selectedCountry.currency || "USD";
    
    if (currency === "USD") return `$${usdPrice.toFixed(2)}`;
    
    // Get exchange rate for selected country
    const exchangeRates = {
      "KE": 130, "TZ": 2500, "UG": 3700, "RW": 1300, "CD": 2800, "BI": 2900, "SS": 130
    };
    const rate = exchangeRates[selectedCountry.code] || 1;
    const localPrice = usdPrice * rate;
    
    return `${currency} ${localPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (checkingPayment) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying payment...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-4" data-testid="store-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Coin Store</h1>
        {user && <CoinBalance coins={user.coins} />}
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Your Balance</p>
            <p className="font-heading text-3xl font-bold">{user?.coins || 0} <span className="text-lg text-muted-foreground">coins</span></p>
          </div>
        </div>
      </Card>

      {/* Country/Region Selector */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">Your region</p>
        <button
          onClick={() => setShowCountryPicker(true)}
          className="w-full p-3 rounded-xl bg-secondary/50 border border-white/10 flex items-center justify-between hover:bg-secondary/80 transition-all"
          data-testid="country-selector"
        >
          <span className="font-medium">{selectedCountry?.name || "Select country"}</span>
          <span className="text-muted-foreground text-sm">{selectedCountry?.currency || ""}</span>
        </button>
      </div>

      {/* Packages */}
      <h2 className="font-heading text-lg font-semibold mb-4">Buy Coins</h2>
      <div className="grid grid-cols-2 gap-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => handlePackageSelect(pkg)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${pkg.popular ? "border-violet-500/50 shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "border-white/10 hover:border-white/20"}`}
            data-testid={`package-${pkg.id}`}
          >
            {pkg.popular && (
              <Badge className="absolute top-2 right-2 bg-violet-500 text-xs">Popular</Badge>
            )}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <p className="font-heading font-bold text-lg">{pkg.coins}</p>
            {pkg.bonus > 0 && (
              <p className="text-xs text-green-400">+{pkg.bonus} bonus</p>
            )}
            <p className="text-muted-foreground text-sm">{getLocalPrice(pkg.price)}</p>
          </div>
        ))}
      </div>

      {/* Country Picker Dialog */}
      <Dialog open={showCountryPicker} onOpenChange={setShowCountryPicker}>
        <DialogContent className="max-w-[340px] bg-card border-white/10" data-testid="country-picker-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Select Your Region</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose your country for local payment methods
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto mt-4">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountryChange(country)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${selectedCountry?.code === country.code ? "bg-primary/20 border border-primary/50" : "bg-secondary/30 border border-transparent hover:bg-secondary/50"}`}
                data-testid={`country-${country.code}`}
              >
                <span className="font-medium">{country.name}</span>
                <span className="text-sm text-muted-foreground">{country.currency}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Sheet */}
      <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
        <SheetContent side="bottom" className="bg-card border-t border-white/10 rounded-t-3xl" data-testid="payment-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">Complete Purchase</SheetTitle>
          </SheetHeader>
          
          {selectedPackage && (
            <div className="py-4">
              {/* Package Summary */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPackage.coins} coins</p>
                    {selectedPackage.bonus > 0 && (
                      <p className="text-xs text-green-400">+{selectedPackage.bonus} bonus</p>
                    )}
                  </div>
                </div>
                <p className="font-heading font-bold text-lg">{getLocalPrice(selectedPackage.price)}</p>
              </div>

              {/* Payment Methods */}
              <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
              <div className="space-y-2 mb-4">
                {selectedCountry?.payment_methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPaymentMethod?.id === method.id ? "bg-primary/20 border border-primary/50" : "bg-secondary/30 border border-transparent hover:bg-secondary/50"}`}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${method.type === "mobilemoney" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {method.type === "mobilemoney" ? "📱" : "💳"}
                    </div>
                    <span className="font-medium">{method.name}</span>
                  </button>
                ))}
              </div>

              {/* Phone Number for Mobile Money */}
              {selectedPaymentMethod?.type === "mobilemoney" && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Phone Number</p>
                  <Input
                    type="tel"
                    placeholder="+254 700 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-secondary/50 border-white/10"
                    data-testid="phone-input"
                  />
                </div>
              )}

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-full"
                data-testid="confirm-purchase-btn"
              >
                Pay {getLocalPrice(selectedPackage.price)}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

// Profile Page
const ProfilePage = ({ onLogout }) => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [referralStats, setReferralStats] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchReferralStats = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/referral/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setReferralStats(res.data);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchReferralStats();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferral = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `🎬 Join ${APP_CONFIG.name} and get ${totalBonus} FREE coins!\n\n${APP_CONFIG.tagline} for free!\n\nUse my code: ${user?.referral_code}`;
    
    // Check if Web Share API is available AND we're in a secure context
    if (navigator.share && window.isSecureContext) {
      navigator.share({
        title: `Join ${APP_CONFIG.name} - Get ${totalBonus} Free Coins!`,
        text: shareText,
        url: shareUrl
      }).catch((err) => {
        // User cancelled or share failed - copy to clipboard as fallback
        if (err.name !== 'AbortError') {
          copyToClipboard(`${shareText}\n\n👉 ${shareUrl}`);
        }
      });
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(`${shareText}\n\n👉 ${shareUrl}`);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Share link copied to clipboard!");
      }).catch(() => {
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy. Please copy manually.");
    }
    document.body.removeChild(textArea);
  };

  const shareToWhatsApp = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `🎬 *Join ${APP_CONFIG.name}* and get *${totalBonus} FREE coins* to ${APP_CONFIG.tagline.toLowerCase()}!

✨ Trending shows updated daily
🎁 Free coins every day
📱 Watch anywhere, anytime

Use my referral code: *${user?.referral_code}*

👉 ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaSMS = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `Join ${APP_CONFIG.name} & get ${totalBonus} FREE coins! Use code: ${user?.referral_code} ${shareUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    window.location.href = smsUrl;
  };

  const copyReferralLink = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `🎬 Join ${APP_CONFIG.name} and get ${totalBonus} FREE coins!\n\nUse my code: ${user?.referral_code}\n\n👉 ${shareUrl}`;
    copyToClipboard(shareText);
  };

  if (!user) return null;

  return (
    <div className="pb-20 px-4 pt-4" data-testid="profile-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Profile</h1>
        <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
      </div>

      {/* User Info */}
      <Card className="bg-card/50 border-white/10 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold">{user.name}</h2>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
      </Card>

      {/* Referral Card */}
      <Card className="bg-gradient-to-br from-violet-600/20 to-pink-600/20 border-violet-500/30 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Invite Friends</h3>
            <p className="text-xs text-muted-foreground">Earn 20 coins per referral!</p>
          </div>
        </div>
        
        {/* Referral Code */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10 font-mono text-lg tracking-widest text-center">
            {user.referral_code || "Loading..."}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/20 hover:bg-white/10"
            onClick={copyReferralCode}
            data-testid="copy-referral-btn"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Share Buttons - Industry Standard Multi-Channel */}
        <div className="space-y-2">
          {/* Primary: WhatsApp */}
          <Button
            onClick={shareToWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] rounded-full h-12"
            data-testid="share-whatsapp-btn"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share via WhatsApp
          </Button>
          
          {/* Secondary Row */}
          <div className="flex gap-2">
            {/* SMS */}
            <Button
              onClick={shareViaSMS}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/10 rounded-full"
              data-testid="share-sms-btn"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              SMS
            </Button>
            
            {/* Copy Link */}
            <Button
              onClick={copyReferralLink}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/10 rounded-full"
              data-testid="copy-link-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            
            {/* More */}
            <Button
              onClick={shareReferral}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/10 rounded-full"
              data-testid="share-more-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              More
            </Button>
          </div>
        </div>

        {/* Referral Stats */}
        {referralStats && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-3 rounded-xl bg-black/20">
              <p className="font-heading text-xl font-bold text-violet-400">{referralStats.total_referrals}</p>
              <p className="text-xs text-muted-foreground">Friends Invited</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/20">
              <p className="font-heading text-xl font-bold text-yellow-400">{referralStats.total_earnings}</p>
              <p className="text-xs text-muted-foreground">Coins Earned</p>
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        {referralStats?.recent_referrals?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Recent Referrals</p>
            <div className="space-y-2">
              {referralStats.recent_referrals.map((ref, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-black/20">
                  <span className="text-muted-foreground">{ref.email}</span>
                  <span className="text-yellow-400">+{ref.reward}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Stats */}
      <Card className="bg-card/50 border-white/10 p-6 mb-6">
        <h3 className="font-heading font-semibold mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-xl bg-secondary/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-heading text-2xl font-bold">{user.coins}</span>
            </div>
            <p className="text-xs text-muted-foreground">Coins</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-secondary/50">
            <p className="font-heading text-2xl font-bold">
              {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">Member since</p>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <div className="space-y-2 mb-6">
        <button 
          onClick={() => navigate("/subscriptions")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/20 to-purple-600/20 hover:from-primary/30 hover:to-purple-600/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div className="text-left">
              <p className="font-medium text-sm">Subscription Plans</p>
              <p className="text-xs text-muted-foreground">Get monthly coins</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </button>
        
        {user.is_admin && (
          <button 
            onClick={() => navigate("/admin")}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">Admin Panel</p>
                <p className="text-xs text-muted-foreground">Manage platform</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>

      {/* Actions */}
      <Button 
        variant="outline" 
        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-full"
        onClick={handleLogout}
        data-testid="logout-btn"
      >
        Sign Out
      </Button>
    </div>
  );
};

// Admin Panel Page
const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/");
      return;
    }
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, seriesRes, transRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/series`, { headers }),
        axios.get(`${API}/admin/transactions`, { headers })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setSeriesList(seriesRes.data);
      setTransactions(transRes.data.transactions);
    } catch (e) {
      toast.error("Failed to load admin data");
      navigate("/");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "series", label: "Series", icon: Film },
    { id: "transactions", label: "Revenue", icon: CreditCard },
  ];

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Manage your platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "bg-primary text-white" 
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.total_users}</p>
              <p className="text-xs text-green-400">+{stats.recent_signups} this week</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10">
              <p className="text-xs text-muted-foreground">Total Series</p>
              <p className="text-2xl font-bold">{stats.total_series}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10">
              <p className="text-xs text-muted-foreground">Subscribers</p>
              <p className="text-2xl font-bold">{stats.active_subscriptions}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-3">
          {users.map(u => (
            <Card key={u.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{u.name || u.email}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-yellow-400">{u.coins} coins</p>
                <p className="text-xs text-muted-foreground">{u.subscription || "Free"}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Series Tab */}
      {activeTab === "series" && (
        <div className="space-y-3">
          {seriesList.map(s => (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <img src={s.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
              <div className="flex-1">
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.genre} • {s.total_episodes} eps</p>
              </div>
              <div className="text-right">
                <p className="text-xs">{s.views.toLocaleString()} views</p>
                <p className="text-xs text-yellow-400">{s.coins_per_episode} coins/ep</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map(t => (
              <Card key={t.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-green-400">${t.amount}</p>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Subscription Page
const SubscriptionPage = () => {
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
    <div className="p-4 pb-24">
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

// Category Page - Shows all series in a category
const CategoryPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const { category } = useParams();
  const { user, token } = useAuth();
  const [series, setSeries] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [myList, setMyList] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category configuration
  const categoryConfig = {
    trending: { title: "Trending Now", emoji: "🔥", filter: (s) => s },
    "my-list": { title: "My List", emoji: "📚", filter: (s) => s.filter(item => myList.includes(item.id)) },
    romance: { title: "Romance", emoji: "💕", filter: (s) => s.filter(item => item.genre === "Romance") },
    "continue-watching": { title: "Continue Watching", emoji: "▶️", filter: () => continueWatching },
    thriller: { title: "Thriller", emoji: "🔪", filter: (s) => s.filter(item => item.genre === "Thriller") },
    drama: { title: "Drama", emoji: "🎭", filter: (s) => s.filter(item => item.genre === "Drama") },
    action: { title: "Action", emoji: "💥", filter: (s) => s.filter(item => item.genre === "Action") },
    "coming-soon": { title: "Coming Soon", emoji: "🔜", filter: () => comingSoon },
    "new-releases": { title: "New Releases", emoji: "✨", filter: (s) => s.slice(-20) }
  };

  const currentCategory = categoryConfig[category] || { title: "All Series", emoji: "🎬", filter: (s) => s };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [seriesRes, comingSoonRes] = await Promise.all([
          axios.get(`${API}/series`),
          axios.get(`${API}/series/coming-soon`)
        ]);
        setSeries(seriesRes.data);
        setComingSoon(comingSoonRes.data);

        if (token) {
          const [myListRes, progressRes] = await Promise.all([
            axios.get(`${API}/users/me/my-list`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/users/me/watch-progress`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setMyList(myListRes.data.map(s => s.id));
          
          // Map continue watching data
          const watchProgress = progressRes.data;
          const continueData = watchProgress.map(wp => {
            const s = seriesRes.data.find(ser => ser.id === wp.series_id);
            if (s && wp.episodes?.length > 0) {
              const lastWatched = wp.episodes.sort((a, b) => 
                new Date(b.last_watched) - new Date(a.last_watched)
              )[0];
              return {
                series: s,
                episode: { episode_number: lastWatched.episode_number },
                progress: lastWatched.progress
              };
            }
            return null;
          }).filter(Boolean);
          setContinueWatching(continueData);
        }
      } catch (e) {
        console.error("Error fetching category data:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [token, category]);

  const filteredSeries = currentCategory.filter(series);

  const handleAddToList = async (seriesId) => {
    if (!token) return onAuthClick();
    try {
      await axios.post(`${API}/users/me/my-list`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList(prev => [...prev, seriesId]);
      toast.success("Added to My List");
    } catch (e) {
      toast.error("Failed to add");
    }
  };

  const handleRemoveFromList = async (seriesId) => {
    if (!token) return;
    try {
      await axios.delete(`${API}/users/me/my-list/${seriesId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList(prev => prev.filter(id => id !== seriesId));
      toast.success("Removed from My List");
    } catch (e) {
      toast.error("Failed to remove");
    }
  };

  return (
    <div className="pb-20 pt-4" data-testid="category-page">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-background/80 hover:bg-background"
          data-testid="category-back-btn"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading text-xl font-bold">
          {currentCategory.title} {currentCategory.emoji}
        </h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-muted-foreground">No series found in this category</p>
          {category === "my-list" && !user && (
            <Button onClick={onAuthClick} className="mt-4 rounded-full">
              Sign in to see your list
            </Button>
          )}
        </div>
      ) : category === "continue-watching" ? (
        /* Continue Watching Grid */
        <div className="grid grid-cols-3 gap-3 px-4">
          {filteredSeries.map((item, i) => (
            <div key={i}>
              <ContinueWatchingCard
                series={item.series}
                episode={item.episode}
                progress={item.progress}
                onClick={() => navigate(`/series/${item.series.id}`)}
              />
            </div>
          ))}
        </div>
      ) : category === "coming-soon" ? (
        /* Coming Soon Grid */
        <div className="grid grid-cols-3 gap-3 px-4">
          {filteredSeries.map((s) => (
            <div key={s.id}>
              <ComingSoonCard
                series={s}
                isReminded={false}
                onRemind={() => {}}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Standard Grid */
        <div className="grid grid-cols-3 gap-3 px-4">
          {filteredSeries.map((s) => (
            <div key={s.id}>
              <SeriesCard 
                series={s}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
                inMyList={myList.includes(s.id)}
                onAddToList={handleAddToList}
                onRemoveFromList={handleRemoveFromList}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main App
function App() {
  const [showAuth, setShowAuth] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  // Check for referral code in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      setReferralCode(refCode.toUpperCase());
      setShowAuth(true);
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#09090b]">
        <div className="max-w-md mx-auto min-h-screen bg-background overflow-hidden shadow-2xl border-x border-border/10 relative">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage onAuthClick={() => setShowAuth(true)} />} />
              <Route path="/category/:category" element={<CategoryPage onAuthClick={() => setShowAuth(true)} />} />
              <Route path="/series/:id" element={<SeriesDetailPage onAuthClick={() => setShowAuth(true)} />} />
              <Route path="/watch/:id" element={<VideoPlayerPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/subscriptions" element={<SubscriptionPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
            <BottomNav onAuthClick={() => setShowAuth(true)} />
            <InstallAppBanner />
            <AuthModal 
              open={showAuth} 
              onClose={() => { setShowAuth(false); setReferralCode(""); }}
              initialReferralCode={referralCode}
            />
          </BrowserRouter>
        </div>
        <Toaster position="top-center" />
      </div>
    </AuthProvider>
  );
}

export default App;
