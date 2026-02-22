import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, Plus, LayoutDashboard, LineChart, Bell, History,
  Film, Settings, LogOut, Trophy, Coins, Calendar, TrendingUp,
  ShoppingBag, Handshake, Wand2
} from "lucide-react";
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
    { id: "earnings", label: "Earnings", icon: TrendingUp },
    { id: "analytics", label: "Analytics", icon: LineChart },
    { id: "scheduler", label: "Scheduler", icon: Calendar },
    { id: "milestones", label: "Milestones", icon: Trophy },
    { id: "merchandise", label: "Merch", icon: ShoppingBag },
    { id: "sponsorships", label: "Sponsors", icon: Handshake },
    { id: "trailers", label: "Trailers", icon: Film },
    { id: "thumbnails", label: "AI Thumbs", icon: Wand2 },
    { id: "payouts", label: "Payouts", icon: History },
  ];

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, positioned below main header */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-white/10 z-40">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-white/10">
          <h1 className="font-heading text-xl font-bold">Creator Studio</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {dashboard?.tier === "partner" ? "Premium Partner" : dashboard?.tier === "verified" ? "Verified Creator" : "New Creator"}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-primary/20 text-primary border border-primary/30" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
          
          {/* Notifications in sidebar */}
          <button
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === "notifications" 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
            onClick={() => setActiveTab("notifications")}
            data-testid="tab-notifications"
          >
            <Bell className="w-5 h-5" />
            Notifications
            {unreadNotifications > 0 && (
              <span className="ml-auto px-2 py-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </button>
        </nav>

        {/* Stats Summary */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Revenue Share
            </span>
            <span className="font-bold text-primary">{Math.round((dashboard?.revenue_share || 0.3) * 100)}%</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" />
              Pending
            </span>
            <span className="font-bold">{dashboard?.pending_payout || 0}</span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="p-4 border-t border-white/10">
          <Button className="w-full" onClick={onSubmitSeries} data-testid="submit-series-btn">
            <Plus className="w-4 h-4 mr-2" /> Submit Series
          </Button>
        </div>

        {/* Back to Home */}
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Kona
          </button>
        </div>
      </aside>

      {/* Mobile Header - Hidden on desktop */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading text-lg font-bold">Creator Studio</h1>
              <p className="text-xs text-muted-foreground">
                {dashboard?.tier === "partner" ? "Premium Partner" : dashboard?.tier === "verified" ? "Verified" : "New"} • {Math.round((dashboard?.revenue_share || 0.3) * 100)}% share
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
            <Button size="sm" onClick={onSubmitSeries} data-testid="submit-series-btn-mobile">
              <Plus className="w-4 h-4 mr-1" /> Submit
            </Button>
          </div>
        </div>
        
        {/* Mobile Tab Navigation */}
        <div className="flex border-t border-white/5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`flex-1 min-w-[80px] py-3 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                activeTab === tab.id 
                  ? "text-primary border-b-2 border-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CreatorHeader;
