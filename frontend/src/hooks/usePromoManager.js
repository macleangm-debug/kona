import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/config";

export const usePromoManager = () => {
  const [activePromo, setActivePromo] = useState(null);
  const [showPromo, setShowPromo] = useState(false);
  const [promos, setPromos] = useState([]);
  const [hasShownAppOpen, setHasShownAppOpen] = useState(false);
  const [hasShownTimed, setHasShownTimed] = useState(false);

  // Fetch promos on mount
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const res = await axios.get(`${API}/promos/active`);
        setPromos(res.data);
      } catch (e) {
        console.error('Failed to fetch promos:', e);
      }
    };
    fetchPromos();
  }, []);

  // Check session storage for app-open trigger
  useEffect(() => {
    if (promos.length === 0 || hasShownAppOpen) return;

    const sessionShown = sessionStorage.getItem('kona-promo-shown');
    if (sessionShown) return;

    // Find a promo with app_open or both trigger type
    const appOpenPromo = promos.find(p => p.trigger_type === 'app_open' || p.trigger_type === 'both');
    if (appOpenPromo) {
      // Delay slightly for better UX
      const timer = setTimeout(() => {
        setActivePromo(appOpenPromo);
        setShowPromo(true);
        setHasShownAppOpen(true);
        sessionStorage.setItem('kona-promo-shown', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [promos, hasShownAppOpen]);

  // Timed trigger (10 seconds after browsing) - only once per session
  useEffect(() => {
    // Skip if session already showed promos
    const sessionShown = sessionStorage.getItem('kona-promo-shown');
    if (sessionShown) return;
    
    if (promos.length === 0 || hasShownTimed || showPromo) return;

    // Find a promo with timed trigger that hasn't been shown yet
    const timedPromo = promos.find(p => 
      (p.trigger_type === 'timed' || p.trigger_type === 'both') && 
      p.id !== activePromo?.id
    );

    if (timedPromo) {
      const delay = timedPromo.delay_seconds * 1000 || 10000;
      const timer = setTimeout(() => {
        if (!showPromo) { // Only show if popup isn't already visible
          setActivePromo(timedPromo);
          setShowPromo(true);
          setHasShownTimed(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [promos, hasShownTimed, showPromo, activePromo]);

  const closePromo = () => {
    setShowPromo(false);
  };

  return { activePromo, showPromo, closePromo };
};

export default usePromoManager;
