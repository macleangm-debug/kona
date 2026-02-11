import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { API } from "@/config";

// Pages where promos should not appear
const PROMO_EXCLUDED_PATHS = ['/admin', '/admin/login', '/creator/login', '/watch-party'];

// Minimum scroll distance before showing promo (pixels)
const MIN_SCROLL_BEFORE_PROMO = 400;
// Minimum time on page before showing promo (ms) - ONLY as secondary condition with scroll
const MIN_TIME_BEFORE_PROMO = 30000;

export const usePromoManager = () => {
  const [activePromo, setActivePromo] = useState(null);
  const [showPromo, setShowPromo] = useState(false);
  const [promos, setPromos] = useState([]);
  const [hasShownAppOpen, setHasShownAppOpen] = useState(false);
  const [hasShownTimed, setHasShownTimed] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const location = useLocation();

  // Check if current path should exclude promos
  const isExcludedPath = PROMO_EXCLUDED_PATHS.some(path => 
    location.pathname.startsWith(path)
  );

  // Track scroll distance
  useEffect(() => {
    let maxScroll = 0;
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      if (currentScroll > maxScroll) {
        maxScroll = currentScroll;
      }
      if (maxScroll >= MIN_SCROLL_BEFORE_PROMO && !hasScrolled) {
        setHasScrolled(true);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled]);

  // Track time on page
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeOnPage(prev => prev + 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  // Show promo only after user has scrolled (primary trigger) - time alone is not enough
  useEffect(() => {
    if (promos.length === 0 || hasShownAppOpen || isExcludedPath) return;

    const sessionShown = sessionStorage.getItem('kona-promo-shown');
    if (sessionShown) return;

    // Require scroll engagement first - don't show just on time alone
    // Only show after scrolling AND minimum time has passed (to ensure user is engaged)
    const hasEngaged = hasScrolled && timeOnPage >= 5000; // 5 sec minimum + scroll
    if (!hasEngaged) return;

    // Find all promos with app_open or both trigger type and randomly select one
    const eligiblePromos = promos.filter(p => p.trigger_type === 'app_open' || p.trigger_type === 'both');
    if (eligiblePromos.length > 0) {
      // Randomly select a promo for variety
      const randomIndex = Math.floor(Math.random() * eligiblePromos.length);
      const selectedPromo = eligiblePromos[randomIndex];
      setActivePromo(selectedPromo);
      setShowPromo(true);
      setHasShownAppOpen(true);
      sessionStorage.setItem('kona-promo-shown', 'true');
    }
  }, [promos, hasShownAppOpen, isExcludedPath, hasScrolled, timeOnPage]);

  // Timed trigger - only after significant engagement
  useEffect(() => {
    if (isExcludedPath) return;
    
    const sessionShown = sessionStorage.getItem('kona-promo-shown');
    if (sessionShown) return;
    
    if (promos.length === 0 || hasShownTimed || showPromo) return;

    // Find a promo with timed trigger
    const timedPromo = promos.find(p => 
      (p.trigger_type === 'timed' || p.trigger_type === 'both') && 
      p.id !== activePromo?.id
    );

    if (timedPromo && hasScrolled && timeOnPage >= MIN_TIME_BEFORE_PROMO) {
      const delay = timedPromo.delay_seconds * 1000 || 15000;
      const timer = setTimeout(() => {
        if (!showPromo) {
          setActivePromo(timedPromo);
          setShowPromo(true);
          setHasShownTimed(true);
        }
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [promos, hasShownTimed, showPromo, activePromo, isExcludedPath, hasScrolled, timeOnPage]);

  // Close promo when navigating to excluded paths
  useEffect(() => {
    if (isExcludedPath && showPromo) {
      setShowPromo(false);
    }
  }, [isExcludedPath, showPromo]);

  const closePromo = () => {
    setShowPromo(false);
  };

  return { activePromo, showPromo, closePromo };
};

export default usePromoManager;
