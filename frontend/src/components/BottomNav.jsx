import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingCart, User } from "lucide-react";
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

export default BottomNav;
