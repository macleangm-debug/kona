import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const LanguageSelector = ({ variant = "dropdown", showLabel = true }) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languages, getCurrentLanguageInfo } = useLanguage();
  const currentLang = getCurrentLanguageInfo();

  if (variant === "buttons") {
    return (
      <div className="flex gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              currentLanguage === lang.code
                ? "bg-primary/20 border-primary text-primary"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <span className="text-sm font-medium">{lang.nativeName}</span>
            {currentLanguage === lang.code && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="flex items-center gap-2 hover:bg-white/10"
          data-testid="language-selector"
        >
          <Globe className="w-4 h-4" />
          {showLabel && <span className="hidden sm:inline">{currentLang.nativeName}</span>}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`flex items-center gap-3 cursor-pointer ${
              currentLanguage === lang.code ? "bg-primary/20" : ""
            }`}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{lang.nativeName}</p>
              <p className="text-xs text-gray-400">{lang.name}</p>
            </div>
            {currentLanguage === lang.code && <Check className="w-4 h-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
