import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const InstallAppBanner = () => {
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

export default InstallAppBanner;
