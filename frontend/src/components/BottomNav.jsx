import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Compass, Gift, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const BottomNav = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Hide bottom nav on video player page
  if (location.pathname.startsWith("/watch")) {
    return null;
  }
  
  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Compass, label: "Discover", path: "/discover" },
    { icon: Gift, label: "Rewards", path: "/rewards", requiresAuth: false, highlight: true },
    { icon: ShoppingCart, label: "Store", path: "/store" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  const handleNav = (item) => {
    if ((item.path === "/store" || item.path === "/profile") && !user) {
      onAuthClick();
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-black/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-50 max-w-md mx-auto" data-testid="bottom-nav">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => handleNav(item)}
            className={`flex flex-col items-center gap-0.5 p-2 transition-all relative ${
              isActive 
                ? "text-primary" 
                : item.highlight 
                  ? "text-yellow-400" 
                  : "text-muted-foreground hover:text-white"
            }`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            {item.highlight && !isActive && (
              <span className="absolute -top-1 right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
            <item.icon className={`w-5 h-5 ${item.highlight && !isActive ? 'text-yellow-400' : ''}`} />
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
