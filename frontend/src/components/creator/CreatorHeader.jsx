import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus, LayoutDashboard, LineChart, Bell, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CreatorHeader = ({ 
  dashboard, 
  activeTab, 
  setActiveTab, 
  onSubmitSeries,
  unreadNotifications = 0
}) => {
  const navigate = useNavigate();

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "payouts", label: "Payouts", icon: History },
  ];

  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading text-lg font-bold">Creator Studio</h1>
            <p className="text-xs text-muted-foreground">
              {dashboard?.tier === "partner" ? "Premium Partner" : dashboard?.tier === "verified" ? "Verified" : "New"} • {Math.round(dashboard?.revenue_share * 100)}% share
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveTab("notifications")}
            className="relative p-2 hover:bg-secondary rounded-full"
            data-testid="notifications-btn"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
          <Button size="sm" onClick={onSubmitSeries} data-testid="submit-series-btn">
            <Plus className="w-4 h-4 mr-1" /> Submit Series
          </Button>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-t border-white/5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`flex-1 min-w-[100px] py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CreatorHeader;
