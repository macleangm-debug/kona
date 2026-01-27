import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

// Contexts
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Hooks
import { usePromoManager } from "@/hooks/usePromoManager";
import { useMilestoneNotifications } from "@/hooks/useMilestoneNotifications";

// Components
import { 
  AuthModal, 
  BottomNav, 
  InstallAppBanner, 
  PromoPopup, 
  MilestoneAlert 
} from "@/components";

// Pages
import {
  HomePage,
  SeriesDetailPage,
  VideoPlayerPage,
  StorePage,
  ProfilePage,
  SubscriptionPage,
  CategoryPage,
  CreatorPortal,
  CreatorLoginPage,
  AdminPage,
  AdminLoginPage,
  AdminDashboard
} from "@/pages";

// Swiper CSS
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

// Main App Content - uses hooks that need AuthProvider
const AppContent = () => {
  const [searchParams] = useSearchParams();
  const [showAuth, setShowAuth] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [forceSignUp, setForceSignUp] = useState(false);
  
  const { user } = useAuth();
  const { activePromo, showPromo, closePromo } = usePromoManager();
  const { notification, showAlert, dismissAlert } = useMilestoneNotifications();

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

  return (
    <div className="min-h-screen bg-background text-white max-w-md mx-auto relative">
      <Routes>
        <Route path="/" element={<HomePage onAuthClick={() => handleAuthClick()} />} />
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

      {/* Bottom Navigation */}
      <BottomNav onAuthClick={() => handleAuthClick()} />

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

      {/* PWA Install Banner */}
      <InstallAppBanner />

      {/* Toast Notifications */}
      <Toaster position="top-center" richColors />
    </div>
  );
};

// Root App - wraps everything with providers
const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
