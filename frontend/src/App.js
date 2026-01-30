import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// i18n
import "@/i18n";

// Contexts
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Hooks
import { usePromoManager } from "@/hooks/usePromoManager";
import { useMilestoneNotifications } from "@/hooks/useMilestoneNotifications";

// Components
import { 
  AuthModal, 
  BottomNav, 
  InstallAppBanner, 
  PromoPopup, 
  MilestoneAlert,
  SearchModal
} from "@/components";
import DesktopHeader from "@/components/DesktopHeader";
import { SplashScreen } from "@/components/SplashScreen";

// Pages
import HomePageResponsive from "@/pages/HomePageResponsive";
import {
  SeriesDetailPage,
  VideoPlayerPage,
  StorePage,
  ProfilePage,
  SubscriptionPage,
  CategoryPage,
  CreatorPortal,
  CreatorLoginPage,
  AdminLoginPage,
  AdminDashboard,
  DiscoverPage,
  RewardsPage,
  LeaderboardPage
} from "@/pages";

// Swiper CSS
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// Main App Content - uses hooks that need AuthProvider
const AppContent = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [forceSignUp, setForceSignUp] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash once per session
    const hasSeenSplash = sessionStorage.getItem('kona_splash_shown');
    return !hasSeenSplash;
  });
  
  const { user } = useAuth();
  const { activePromo, showPromo, closePromo } = usePromoManager();
  const { notification, showAlert, dismissAlert } = useMilestoneNotifications();

  // Handle splash screen completion
  const handleSplashComplete = () => {
    sessionStorage.setItem('kona_splash_shown', 'true');
    setShowSplash(false);
  };

  // Check viewport size
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle referral code from URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
      setForceSignUp(true);
      setShowAuth(true);
    }
  }, [searchParams]);

  const handleAuthClick = (signUpMode = false) => {
    setForceSignUp(signUpMode);
    setShowAuth(true);
  };

  // Pages that should have their own layout (no header/nav)
  const fullScreenPages = ["/watch", "/admin", "/creator/login", "/admin/login"];
  const isFullScreenPage = fullScreenPages.some(page => location.pathname.startsWith(page));

  return (
    <div className={`min-h-screen bg-background text-white ${isDesktop ? "w-full" : "max-w-md mx-auto"} relative`}>
      {/* Desktop Header - Only on desktop and not on full-screen pages */}
      {isDesktop && !isFullScreenPage && (
        <DesktopHeader 
          onAuthClick={() => handleAuthClick()} 
          onSearchClick={() => setShowSearch(true)}
        />
      )}

      <Routes>
        <Route path="/" element={<HomePageResponsive onAuthClick={() => handleAuthClick()} />} />
        <Route path="/discover" element={<DiscoverPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/rewards" element={<RewardsPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/leaderboard" element={<LeaderboardPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/series/:id" element={<SeriesDetailPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/watch/:id" element={<VideoPlayerPage onAuthClick={() => handleAuthClick(true)} />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/subscriptions" element={<SubscriptionPage />} />
        <Route path="/category/:category" element={<CategoryPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/creator" element={<CreatorPortal />} />
        <Route path="/creator/login" element={<CreatorLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>

      {/* Bottom Navigation - Only on mobile and not on full-screen pages */}
      {!isDesktop && !isFullScreenPage && (
        <BottomNav onAuthClick={() => handleAuthClick()} />
      )}

      {/* Auth Modal */}
      <AuthModal 
        open={showAuth} 
        onClose={() => {
          setShowAuth(false);
          setForceSignUp(false);
        }}
        initialReferralCode={referralCode}
        forceSignUp={forceSignUp}
      />

      {/* Search Modal */}
      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
      />

      {/* Promotional Popup */}
      <PromoPopup
        promo={activePromo}
        open={showPromo}
        onClose={closePromo}
      />

      {/* Milestone Notification Alert */}
      <MilestoneAlert
        notification={notification}
        open={showAlert}
        onDismiss={dismissAlert}
      />

      {/* PWA Install Banner - Mobile only */}
      {!isDesktop && <InstallAppBanner />}

      {/* Toast Notifications */}
      <Toaster position="top-center" richColors />
    </div>
  );
};

// Root App - wraps everything with providers
const App = () => {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
};

export default App;
