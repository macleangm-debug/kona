import React, { useState, useEffect } from "react";
import { X, Download, Smartphone, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export const InstallPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  
  // Compute these values directly instead of using state
  const isIOS = typeof window !== 'undefined' && /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia("(display-mode: standalone)").matches 
    || window.navigator.standalone 
    || document.referrer.includes("android-app://")
  );

  useEffect(() => {
    // Don't run on server or if already installed
    if (typeof window === 'undefined' || isStandalone) return;

    // Check if user dismissed the prompt recently (within 7 days)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return; // Don't show if dismissed within 7 days
      }
    }

    // Listen for the beforeinstallprompt event (Android/Desktop)
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Show prompt after a delay (let user browse first)
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // For iOS, show after delay if not standalone
    if (isIOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 10000); // Show after 10 seconds for iOS
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, [isIOS, isStandalone]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Desktop - trigger native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === "accepted") {
        setShowPrompt(false);
        localStorage.setItem("pwa-installed", "true");
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS - show manual instructions
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSInstructions(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  // Don't show if already installed or prompt shouldn't be shown
  if (isStandalone || !showPrompt) {
    return null;
  }

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-end sm:items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/10 animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary" />
            </div>
            <button 
              onClick={handleDismiss}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Install Kona on iPhone</h3>
          <p className="text-gray-400 text-sm mb-6">Follow these simple steps:</p>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Tap the</span>
                <div className="bg-white/10 px-2 py-1 rounded flex items-center gap-1">
                  <Share className="w-4 h-4 text-blue-400" />
                  <span className="text-white text-xs">Share</span>
                </div>
                <span className="text-white text-sm">button</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">2</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Scroll and tap</span>
                <div className="bg-white/10 px-2 py-1 rounded flex items-center gap-1">
                  <Plus className="w-4 h-4 text-white" />
                  <span className="text-white text-xs">Add to Home Screen</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">3</span>
              </div>
              <span className="text-white text-sm">Tap <strong>Add</strong> in the top right</span>
            </div>
          </div>
          
          <Button 
            onClick={handleDismiss}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Got it!
          </Button>
        </div>
      </div>
    );
  }

  // Main Install Banner
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-500">
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-4 border border-white/10 shadow-2xl">
        <div className="flex items-start gap-3">
          {/* App Icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white font-bold text-xl">K</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-semibold text-base">Install Kona</h3>
                <p className="text-gray-400 text-xs mt-0.5">Watch anytime, even offline</p>
              </div>
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-full transition-colors -mr-1 -mt-1"
                data-testid="install-prompt-dismiss"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            
            {/* Benefits */}
            <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                Faster
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                Offline
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                No browser
              </span>
            </div>
            
            {/* Install Button */}
            <Button 
              onClick={handleInstall}
              size="sm"
              className="mt-3 w-full bg-primary hover:bg-primary/90 text-white font-medium h-9"
              data-testid="install-prompt-btn"
            >
              <Download className="w-4 h-4 mr-2" />
              {isIOS ? "How to Install" : "Install Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Smaller inline install button for use in Profile/Settings
export const InstallButton = ({ className = "" }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches 
      || window.navigator.standalone;
    setIsStandalone(standalone);

    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    if (ios && !standalone) {
      setCanInstall(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setCanInstall(false);
    } else if (isIOS) {
      alert("To install: Tap the Share button, then 'Add to Home Screen'");
    }
  };

  if (isStandalone) {
    return (
      <div className={`flex items-center gap-2 text-green-500 text-sm ${className}`}>
        <Smartphone className="w-4 h-4" />
        <span>App Installed</span>
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstall}
      variant="outline"
      className={`gap-2 ${className}`}
      data-testid="install-app-btn"
    >
      <Download className="w-4 h-4" />
      Install App
    </Button>
  );
};

export default InstallPrompt;
