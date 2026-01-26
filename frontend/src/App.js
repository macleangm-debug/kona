import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Home, Play, ShoppingCart, User, Gift, Lock, Coins, Star, Eye, Clock, ChevronLeft, X, Check, Loader2, Share2, Users, Copy, Trophy } from "lucide-react";
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
const SeriesCard = ({ series, onClick, badge, showViews = true }) => {
  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return views;
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
        
        {/* Episode count */}
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[10px]">
          EP.{series.total_episodes}
        </div>
        
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
      
      {/* Title & Genre */}
      <h3 className="font-medium text-sm line-clamp-1 mb-0.5">{series.title}</h3>
      <p className="text-[11px] text-muted-foreground">{series.genre}</p>
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
  const [loading, setLoading] = useState(true);
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
        const [seriesRes, featuredRes] = await Promise.all([
          axios.get(`${API}/series`),
          axios.get(`${API}/series/featured`)
        ]);
        setSeries(seriesRes.data);
        setFeatured(featuredRes.data);
        
        // Continue watching data
        if (token) {
          const mockContinue = seriesRes.data.slice(0, 3).map((s, i) => ({
            series: s,
            episode: i + 2,
            progress: Math.floor(Math.random() * 60) + 30
          }));
          setContinueWatching(mockContinue);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

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
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Track scroll position for 3D effect
  useEffect(() => {
    const container = document.querySelector('[data-testid="hero-carousel"] .carousel-container');
    if (!container) return;

    const handleScroll = () => {
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth * 0.75; // 75% card width
      const newIndex = Math.round(scrollLeft / cardWidth);
      const progress = scrollLeft / cardWidth;
      
      setScrollProgress(progress);
      if (newIndex !== currentSlide && newIndex >= 0 && newIndex < heroSlides.length) {
        setCurrentSlide(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [heroSlides.length, currentSlide]);

  // Calculate 3D transform for each card based on scroll position
  const getCardStyle = (index) => {
    const offset = index - scrollProgress;
    const absOffset = Math.abs(offset);
    
    // Scale: center card is 1, side cards are smaller
    const scale = Math.max(0.8, 1 - absOffset * 0.12);
    
    // Vertical offset: side cards drop down
    const translateY = absOffset * 30;
    
    // Z-index for layering
    const zIndex = 10 - Math.round(absOffset);
    
    // Rotation for curve effect
    const rotateY = offset * -10;
    
    return {
      transform: `scale(${scale}) translateY(${translateY}px) perspective(1000px) rotateY(${rotateY}deg)`,
      zIndex,
      transition: 'transform 0.15s ease-out'
    };
  };

  // Get dark overlay opacity for side cards
  const getDarkOverlay = (index) => {
    const offset = index - scrollProgress;
    const absOffset = Math.abs(offset);
    // Center card: 0 darkness, side cards: up to 0.5 darkness
    return Math.min(0.5, absOffset * 0.4);
  };

  const scrollToSlide = (index) => {
    const container = document.querySelector('[data-testid="hero-carousel"] .carousel-container');
    if (container) {
      const cardWidth = container.offsetWidth * 0.75;
      container.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
    }
    setCurrentSlide(index);
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
        <div className="flex items-center gap-3">
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

      {/* Hero Carousel - 3D Curved Card Scroll */}
      {heroSlides.length > 0 && (
        <div className="mb-4 overflow-hidden" data-testid="hero-carousel">
          {/* 3D Carousel Container */}
          <div 
            className="carousel-container flex gap-4 px-[12.5%] overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 pt-2"
            style={{ perspective: '1000px' }}
          >
            {heroSlides.map((heroSeries, index) => (
              <div 
                key={heroSeries.id} 
                className="flex-shrink-0 w-[75%] snap-center cursor-pointer"
                style={getCardStyle(index)}
                onClick={() => navigate(`/series/${heroSeries.id}`)}
              >
                {/* Card */}
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl">
                  {/* Background Image */}
                  <img 
                    src={heroSeries.thumbnail} 
                    alt={heroSeries.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Gradient overlay for content readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  
                  {/* Dark overlay for side cards - makes them appear darker/further back */}
                  <div 
                    className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-150"
                    style={{ opacity: getDarkOverlay(index) }}
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
                  
                  {/* Episode Count Badge */}
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs">
                    EP.{heroSeries.total_episodes}
                  </div>
                  
                  {/* Play Button - Always visible on center card */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                      <Play className="w-7 h-7 text-black fill-black ml-1" />
                    </div>
                  </div>
                  
                  {/* Content at Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Title */}
                    <h2 className="font-heading text-lg font-bold mb-1 line-clamp-2 leading-tight">
                      {heroSeries.title}
                    </h2>
                    
                    {/* Genre & Rating */}
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <span>{heroSeries.genre}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span>{heroSeries.rating}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dot Indicators - Red style */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {heroSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentSlide 
                    ? "w-6 h-2 bg-red-500" 
                    : "w-2 h-2 bg-white/30 hover:bg-white/50"
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
          <button className="text-xs text-primary">See All</button>
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

      {/* Top 10 in East Africa - Netflix style horizontal scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Top 10 in East Africa</h2>
          <button className="text-xs text-primary">See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.slice(0, 10).map((s, index) => (
            <div 
              key={s.id}
              onClick={() => navigate(`/series/${s.id}`)}
              className="flex-shrink-0 flex items-end cursor-pointer group"
            >
              <span className="font-heading text-6xl font-black text-stroke-primary opacity-80 -mr-2 z-10">
                {index + 1}
              </span>
              <div className="relative w-24 aspect-[3/4] rounded-lg overflow-hidden">
                <img 
                  src={s.thumbnail} 
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Romance Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Romance 💕</h2>
          <button className="text-xs text-primary">See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Romance").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={index === 0 ? "hot" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
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
            <button className="text-xs text-primary">See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {continueWatching.map((item, i) => (
              <div key={i} className="flex-shrink-0 w-44">
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
          <button className="text-xs text-primary">See All</button>
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
          <button className="text-xs text-primary">See All</button>
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
          <button className="text-xs text-primary">See All</button>
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

      {/* New Releases Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">New Releases ✨</h2>
          <button className="text-xs text-primary">See All</button>
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
const VideoPlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const epRes = await axios.get(`${API}/episodes/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEpisode(epRes.data);

        const seriesRes = await axios.get(`${API}/series/${epRes.data.series_id}`);
        setSeries(seriesRes.data);
      } catch (e) {
        console.error(e);
        navigate(-1);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, token, navigate]);

  const handleProgress = async (e) => {
    const video = e.target;
    const progress = Math.round((video.currentTime / video.duration) * 100);
    if (progress > 0 && progress % 10 === 0) {
      try {
        await axios.post(`${API}/episodes/progress`, { episode_id: id, progress }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading || !episode) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col" data-testid="video-player-page">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
          data-testid="player-back-btn"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {user && <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />}
      </div>

      {/* Video */}
      <div className="flex-1 flex items-center justify-center">
        <video
          src={episode.video_url}
          controls
          autoPlay
          onTimeUpdate={handleProgress}
          className="w-full max-h-full"
          data-testid="video-element"
        />
      </div>

      {/* Info */}
      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
        <p className="text-muted-foreground text-sm">{series?.title}</p>
        <h2 className="font-heading text-lg font-semibold">{episode.title}</h2>
      </div>
    </div>
  );
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
              <Route path="/series/:id" element={<SeriesDetailPage onAuthClick={() => setShowAuth(true)} />} />
              <Route path="/watch/:id" element={<VideoPlayerPage />} />
              <Route path="/store" element={<StorePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
            <BottomNav onAuthClick={() => setShowAuth(true)} />
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
