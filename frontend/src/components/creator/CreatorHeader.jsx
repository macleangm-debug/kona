import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, ChevronDown, ChevronRight, Plus, LayoutDashboard, LineChart, Bell, History,
  Film, Settings, LogOut, Trophy, Coins, Calendar, TrendingUp,
  ShoppingBag, Handshake, Wand2, PieChart, Rocket, Briefcase, Vote
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Grouped navigation structure
const NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard }
    ]
  },
  {
    id: "revenue",
    label: "Revenue",
    icon: Coins,
    items: [
      { id: "earnings", label: "Earnings", icon: TrendingUp },
      { id: "analytics", label: "Analytics", icon: LineChart },
      { id: "payouts", label: "Payouts", icon: History }
    ]
  },
  {
    id: "content",
    label: "Content Tools",
    icon: Film,
    items: [
      { id: "scheduler", label: "Scheduler", icon: Calendar },
      { id: "trailers", label: "Trailers", icon: Film },
      { id: "thumbnails", label: "AI Thumbnails", icon: Wand2 }
    ]
  },
  {
    id: "growth",
    label: "Growth",
    icon: Rocket,
    items: [
      { id: "merchandise", label: "Merchandise", icon: ShoppingBag },
      { id: "sponsorships", label: "Sponsorships", icon: Handshake },
      { id: "milestones", label: "Milestones", icon: Trophy },
      { id: "polls", label: "Polls & Q&A", icon: Vote }
    ]
  }
];

export const CreatorHeader = ({ 
  dashboard, 
  activeTab, 
  setActiveTab, 
  onSubmitSeries,
  unreadNotifications = 0
}) => {
  const navigate = useNavigate();
  
  // Track expanded groups - expand the group containing active tab by default
  const getInitialExpanded = () => {
    const expanded = ["overview"]; // Always expand overview
    NAV_GROUPS.forEach(group => {
      if (group.items.some(item => item.id === activeTab)) {
        expanded.push(group.id);
      }
    });
    return [...new Set(expanded)];
  };
  
  const [expandedGroups, setExpandedGroups] = useState(getInitialExpanded);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleTabClick = (tabId, groupId) => {
    setActiveTab(tabId);
    // Ensure group is expanded when item is clicked
    if (!expandedGroups.includes(groupId)) {
      setExpandedGroups(prev => [...prev, groupId]);
    }
  };

  // Flat tabs for mobile
  const allTabs = NAV_GROUPS.flatMap(group => group.items);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-white/10 z-40">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-white/10">
          <h1 className="font-heading text-xl font-bold">Creator Studio</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {dashboard?.tier === "partner" ? "Premium Partner" : dashboard?.tier === "verified" ? "Verified Creator" : "New Creator"}
          </p>
        </div>

        {/* Grouped Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_GROUPS.map(group => {
            const isExpanded = expandedGroups.includes(group.id);
            const hasActiveItem = group.items.some(item => item.id === activeTab);
            const GroupIcon = group.icon;
            
            return (
              <div key={group.id} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    hasActiveItem 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <GroupIcon className="w-4 h-4" />
                    {group.label}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {/* Group Items */}
                {isExpanded && (
                  <div className="ml-3 mt-1 space-y-1 border-l border-white/10 pl-3">
                    {group.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <button
                          key={item.id}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                            activeTab === item.id 
                              ? "bg-primary/20 text-primary font-medium" 
                              : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          }`}
                          onClick={() => handleTabClick(item.id, group.id)}
                          data-testid={`tab-${item.id}`}
                        >
                          <ItemIcon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Notifications - Standalone */}
          <div className="pt-2 border-t border-white/10 mt-2">
            <button
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                activeTab === "notifications" 
                  ? "bg-primary/20 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
              onClick={() => setActiveTab("notifications")}
              data-testid="tab-notifications"
            >
              <Bell className="w-4 h-4" />
              Notifications
              {unreadNotifications > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 rounded-full text-[10px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              )}
            </button>
          </div>
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

      {/* Mobile Header */}
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
        
        {/* Mobile Tab Navigation - Grouped */}
        <div className="flex border-t border-white/5 overflow-x-auto hide-scrollbar">
          {NAV_GROUPS.map(group => (
            <div key={group.id} className="flex">
              {group.items.map(tab => (
                <button
                  key={tab.id}
                  className={`min-w-[70px] py-3 px-2 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                    activeTab === tab.id 
                      ? "text-primary border-b-2 border-primary bg-primary/5" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="truncate max-w-[60px]">{tab.label}</span>
                </button>
              ))}
              {/* Divider between groups */}
              <div className="w-px bg-white/10 my-2" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default CreatorHeader;
