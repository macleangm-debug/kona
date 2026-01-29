import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, ChevronDown, User, LogOut, Crown, Settings, Film } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { KonaLogo2Full } from "@/components/KonaLogo";
import { CoinBalance } from "@/components/CoinBalance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const DesktopHeader = ({ onAuthClick, onSearchClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);

  // Track scroll for header background
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Discover", path: "/discover" },
    { label: "Rewards", path: "/rewards", highlight: true },
    { label: "My List", path: "/category/my-list", requiresAuth: true },
    { label: "Coming Soon", path: "/category/coming-soon" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-black/95 backdrop-blur-md shadow-lg" 
          : "bg-gradient-to-b from-black/80 via-black/50 to-transparent"
      }`}
      data-testid="desktop-header"
    >
      <div className="max-w-[1920px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <button onClick={() => navigate("/")} className="flex-shrink-0">
              <KonaLogo2Full height={32} />
            </button>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                if (item.requiresAuth && !user) return null;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive 
                        ? "text-white bg-white/10" 
                        : item.highlight 
                          ? "text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                    {item.highlight && !isActive && (
                      <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Search + User */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button 
              onClick={onSearchClick}
              className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              data-testid="desktop-search-btn"
            >
              <Search className="w-5 h-5" />
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <button className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </button>

                {/* Coin Balance */}
                <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-sm font-bold">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-white/10">
                    <div className="px-3 py-2 border-b border-white/10">
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                    <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/subscriptions")} className="cursor-pointer">
                      <Crown className="w-4 h-4 mr-2 text-yellow-400" />
                      Upgrade to VIP
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/creator")} className="cursor-pointer">
                      <Film className="w-4 h-4 mr-2 text-green-400" />
                      Creator Studio
                    </DropdownMenuItem>
                    {user.is_admin && (
                      <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                        <Settings className="w-4 h-4 mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <button
                onClick={onAuthClick}
                className="px-5 py-2 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg transition-colors"
                data-testid="desktop-login-btn"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopHeader;
