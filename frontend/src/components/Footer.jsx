import React from "react";
import { useNavigate } from "react-router-dom";
import { KonaLogo2Full } from "@/components/KonaLogo";

const Footer = () => {
  const navigate = useNavigate();

  return (
    <footer className="bg-black/50 border-t border-white/10 py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
            <KonaLogo2Full height={24} />
          </button>
          
          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <button 
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Home
            </button>
            <button 
              onClick={() => navigate("/discover")}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Discover
            </button>
            <button 
              onClick={() => navigate("/store")}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              Store
            </button>
            <button 
              onClick={() => navigate("/about")}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              About
            </button>
          </div>
          
          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © 2025 Stream Kona. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
