import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { HelmetProvider } from "react-helmet-async";

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
import { SplashWithSound } from "@/components/SplashScreen";
import { InstallPrompt } from "@/components/InstallPrompt";
import { VerificationBanner } from "@/components/VerificationBanner";

// Pages
import HomePageResponsive from "@/pages/HomePageResponsive";
import LandingPage from "@/pages/LandingPage";
import WatchPartyPage from "@/pages/WatchPartyPage";
import DownloadsPage from "@/pages/DownloadsPage";
import StoriesPage from "@/pages/StoriesPage";
import {
  SeriesDetailPage,
  VideoPlayerPage,
  StorePage,
  ProfilePage,
  SubscriptionPage,
  CategoryPage,
  CreatorPortal,
  CreatorSeriesDetailPage,
  CreatorLoginPage,
  AdminLoginPage,
  AdminDashboard,
  DiscoverPage,
  RewardsPage,
  LeaderboardPage,
  AboutPage,
  TermsPage,
  PrivacyPage,
  AdvertisersPage,
  CreatorsLandingPage,
  BusinessAuthPage,
  BusinessDashboard,
  CampaignCreatePage
} from "@/pages";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import HelpCenterPage from "@/pages/HelpCenterPage";
import SupportTicketPage from "@/pages/SupportTicketPage";
import ContentPage from "@/pages/ContentPage";
import SupportChatWidget from "@/components/SupportChatWidget";

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
  
  // Check if running as installed PWA
  const isPWA = typeof window !== 'undefined' && (
    window.matchMedia("(display-mode: standalone)").matches 
    || window.navigator.standalone 
    || document.referrer.includes("android-app://")
  );
  
  // Check if user has entered the app from landing page
  const hasEnteredApp = sessionStorage.getItem('kona_entered_app') === 'true';
  
  // Only show splash screen once per session using sessionStorage
  const [showSplash, setShowSplash] = useState(() => {
    const hasSeenSplash = sessionStorage.getItem('kona_splash_seen');
    return !hasSeenSplash;
  });
  
  const { user, token, refreshUser } = useAuth();
  const { activePromo, showPromo, closePromo } = usePromoManager();
  const { notification, showAlert, dismissAlert } = useMilestoneNotifications();

  // Handle splash screen completion - persist to sessionStorage
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('kona_splash_seen', 'true');
    setShowSplash(false);
  }, []);

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

  // Check if on landing page (only for non-PWA, non-entered users at root path)
  const isLandingPage = location.pathname === "/" && !isPWA && !hasEnteredApp && !user;
  
  // Pages that should have their own layout (no header/nav)
  const fullScreenPages = ["/watch", "/admin", "/admin/login", "/business"];
  const isFullScreenPage = fullScreenPages.some(page => location.pathname.startsWith(page)) || isLandingPage;
  
  // Pages that skip splash screen
  const skipSplashPages = ["/business", "/creator/login", "/admin", "/demo", "/forgot-password", "/reset-password"];
  const shouldSkipSplash = skipSplashPages.some(page => location.pathname.startsWith(page)) || isLandingPage;
  
  // Determine if we're in the "app" area (not landing page)
  const isInApp = isPWA || hasEnteredApp || user || location.pathname !== "/";

  return (
    <div className={`min-h-screen bg-background text-white ${isDesktop ? "w-full" : "max-w-md mx-auto"} relative`}>
      {/* Splash Screen - Only show in app area, not on landing page */}
      {showSplash && !shouldSkipSplash && isInApp && <SplashWithSound onComplete={handleSplashComplete} minDuration={5000} />}

      {/* Desktop Header - Only on desktop and not on full-screen pages and not on landing page */}
      {isDesktop && !isFullScreenPage && !isLandingPage && (
        <DesktopHeader 
          onAuthClick={() => handleAuthClick()} 
          onSearchClick={() => setShowSearch(true)}
        />
      )}

      {/* NOTE: Verification banner removed for regular viewers
          Viewers can watch, buy coins, but rewards/payouts require verification
          Businesses and Creators have mandatory verification in their portals */}

      <Routes>
        {/* Landing page for first-time web visitors */}
        <Route path="/" element={
          isLandingPage 
            ? <LandingPage onAuthClick={() => handleAuthClick()} />
            : <HomePageResponsive onAuthClick={() => handleAuthClick()} />
        } />
        {/* Explicit /home route for post-landing navigation */}
        <Route path="/home" element={<HomePageResponsive onAuthClick={() => handleAuthClick()} />} />
        <Route path="/discover" element={<DiscoverPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/rewards" element={<RewardsPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/leaderboard" element={<LeaderboardPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/series/:id" element={<SeriesDetailPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/watch/:id" element={<VideoPlayerPage onAuthClick={() => handleAuthClick(true)} />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/subscriptions" element={<SubscriptionPage />} />
        <Route path="/category/:category" element={<CategoryPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/stories" element={<StoriesPage onAuthClick={() => handleAuthClick()} />} />
        <Route path="/creator" element={<CreatorPortal />} />
        <Route path="/creator/series/:id" element={<CreatorSeriesDetailPage />} />
        <Route path="/creator/login" element={<CreatorLoginPage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/watch-party/:partyCode" element={<WatchPartyPage />} />
        <Route path="/downloads" element={<DownloadsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/advertisers" element={<AdvertisersPage />} />
        <Route path="/creators" element={<CreatorsLandingPage />} />
        
        {/* Help Center & Support */}
        <Route path="/help" element={<HelpCenterPage />} />
        <Route path="/help/article/:articleId" element={<HelpCenterPage />} />
        <Route path="/help/tickets/new" element={<SupportTicketPage />} />
        
        {/* Footer Content Pages */}
        <Route path="/careers" element={<ContentPage />} />
        <Route path="/press" element={<ContentPage />} />
        <Route path="/contact" element={<HelpCenterPage />} />
        <Route path="/safety" element={<ContentPage />} />
        <Route path="/guidelines" element={<ContentPage />} />
        <Route path="/accessibility" element={<ContentPage />} />
        <Route path="/cookies" element={<ContentPage />} />
        <Route path="/dmca" element={<ContentPage />} />
        <Route path="/creator-guidelines" element={<ContentPage />} />
        <Route path="/revenue" element={<ContentPage />} />
        
        {/* Auth Routes */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ForgotPasswordPage />} />
        
        {/* Business Portal Routes */}
        <Route path="/business/auth" element={<BusinessAuthPage />} />
        <Route path="/business/dashboard" element={<BusinessDashboard />} />
        <Route path="/business/campaigns/new" element={<CampaignCreatePage />} />
      </Routes>

      {/* Bottom Navigation - Only on mobile and not on full-screen pages and not on landing page */}
      {!isDesktop && !isFullScreenPage && !isLandingPage && (
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

      {/* Promotional Popup - Only in app area */}
      {isInApp && (
        <PromoPopup
          promo={activePromo}
          open={showPromo}
          onClose={closePromo}
        />
      )}

      {/* Milestone Notification Alert */}
      <MilestoneAlert
        notification={notification}
        open={showAlert}
        onDismiss={dismissAlert}
      />

      {/* PWA Install Banner - Mobile only, only in app area (not landing page) */}
      {!isDesktop && isInApp && <InstallAppBanner />}
      
      {/* PWA Install Prompt - Only show in app area (watching pages), not on landing page */}
      {isInApp && <InstallPrompt />}

      {/* Toast Notifications */}
      <Toaster position="top-center" richColors />
    </div>
  );
};

// Root App - wraps everything with providers
const App = () => {
  return (
    <HelmetProvider>
      <Router>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </Router>
    </HelmetProvider>
  );
};

export default App;
