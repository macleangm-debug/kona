import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Check, Copy, Share2, Users, ChevronLeft, Loader2, Trophy, Lock, Film, Crown, Coins, Settings, Bell, Globe, Award, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { API, APP_CONFIG } from "@/config";
import { toast } from "sonner";
import { CoinBalance } from "@/components";
import { LanguageSelector } from "@/components/LanguageSelector";
import { NotificationSettings } from "@/components/NotificationSettings";
import { AchievementBadges } from "@/components/AchievementBadges";
import { LogoutConfirmModal, ClaimRewardModal } from "@/components/AnimatedModals";
import { InstallButton } from "@/components/InstallPrompt";

export const ProfilePage = ({ onLogout }) => {
  const { t } = useTranslation();
  const { user, logout, token, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [referralStats, setReferralStats] = useState(null);
  const [milestones, setMilestones] = useState(null);
  const [copied, setCopied] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [pendingClaimMilestone, setPendingClaimMilestone] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (token) {
        try {
          const [statsRes, milestonesRes] = await Promise.all([
            axios.get(`${API}/referral/stats`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/referral/milestones`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setReferralStats(statsRes.data);
          setMilestones(milestonesRes.data);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchData();
  }, [token]);

  const claimMilestone = async (milestoneId) => {
    setClaimingMilestone(milestoneId);
    setClaimLoading(true);
    try {
      const res = await axios.post(
        `${API}/referral/milestones/${milestoneId}/claim`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message);
      await refreshUser();
      // Refresh milestones
      const milestonesRes = await axios.get(`${API}/referral/milestones`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMilestones(milestonesRes.data);
      setPendingClaimMilestone(null);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim milestone");
    }
    setClaimingMilestone(null);
    setClaimLoading(false);
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    logout();
    navigate("/");
    toast.success("Logged out successfully");
    setLogoutLoading(false);
    setShowLogoutModal(false);
  };

  const copyReferralCode = () => {
    if (user?.referral_code) {
      navigator.clipboard.writeText(user.referral_code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareReferral = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `🎬 Join ${APP_CONFIG.name} and get ${totalBonus} FREE coins!\n\n${APP_CONFIG.tagline} for free!\n\nUse my code: ${user?.referral_code}`;
    
    // Check if Web Share API is available AND we're in a secure context
    if (navigator.share && window.isSecureContext) {
      navigator.share({
        title: `Join ${APP_CONFIG.name} - Get ${totalBonus} Free Coins!`,
        text: shareText,
        url: shareUrl
      }).catch((err) => {
        // User cancelled or share failed - copy to clipboard as fallback
        if (err.name !== 'AbortError') {
          copyToClipboard(`${shareText}\n\n👉 ${shareUrl}`);
        }
      });
    } else {
      // Fallback: copy to clipboard
      copyToClipboard(`${shareText}\n\n👉 ${shareUrl}`);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        toast.success("Share link copied to clipboard!");
      }).catch(() => {
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      toast.success("Share link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy. Please copy manually.");
    }
    document.body.removeChild(textArea);
  };

  const shareToWhatsApp = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `🎬 *Join ${APP_CONFIG.name}* and get *${totalBonus} FREE coins* to ${APP_CONFIG.tagline.toLowerCase()}!

✨ Trending shows updated daily
🎁 Free coins every day
📱 Watch anywhere, anytime

Use my referral code: *${user?.referral_code}*

👉 ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaSMS = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `Join ${APP_CONFIG.name} & get ${totalBonus} FREE coins! Use code: ${user?.referral_code} ${shareUrl}`;
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    window.location.href = smsUrl;
  };

  const copyReferralLink = () => {
    const shareUrl = `${window.location.origin}?ref=${user?.referral_code}`;
    const totalBonus = APP_CONFIG.welcomeBonus + APP_CONFIG.referralBonus;
    const shareText = `🎬 Join ${APP_CONFIG.name} and get ${totalBonus} FREE coins!\n\nUse my code: ${user?.referral_code}\n\n👉 ${shareUrl}`;
    copyToClipboard(shareText);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pb-20 px-4 lg:px-12 pt-20 lg:pt-24" data-testid="profile-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Profile</h1>
        <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
      </div>

      {/* Desktop Two-Column Layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left Column */}
        <div>
      {/* User Info */}
      <Card className="bg-card/50 border-white/10 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-heading text-xl font-semibold">{user.name}</h2>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
        </div>
      </Card>

      {/* Referral Card */}
      <Card className="bg-gradient-to-br from-violet-600/20 to-pink-600/20 border-violet-500/30 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Invite Friends</h3>
            <p className="text-xs text-muted-foreground">Earn 20 coins per referral!</p>
          </div>
        </div>
        
        {/* Referral Code */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 p-3 rounded-xl bg-black/30 border border-white/10 font-mono text-lg tracking-widest text-center">
            {user.referral_code || "Loading..."}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/20 hover:bg-white/10"
            onClick={copyReferralCode}
            data-testid="copy-referral-btn"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Share Buttons - Industry Standard Multi-Channel */}
        <div className="space-y-2">
          {/* Primary: WhatsApp */}
          <Button
            onClick={shareToWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#128C7E] rounded-full h-12"
            data-testid="share-whatsapp-btn"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share via WhatsApp
          </Button>
          
          {/* Secondary Row */}
          <div className="flex gap-2">
            {/* SMS */}
            <Button
              onClick={shareViaSMS}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/10 rounded-full"
              data-testid="share-sms-btn"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              SMS
            </Button>
            
            {/* Copy Link */}
            <Button
              onClick={copyReferralLink}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/10 rounded-full"
              data-testid="copy-link-btn"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            
            {/* More */}
            <Button
              onClick={shareReferral}
              variant="outline"
              className="flex-1 border-white/20 hover:bg-white/10 rounded-full"
              data-testid="share-more-btn"
            >
              <Share2 className="w-4 h-4 mr-2" />
              More
            </Button>
          </div>
        </div>

        {/* Referral Stats */}
        {referralStats && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="text-center p-3 rounded-xl bg-black/20">
              <p className="font-heading text-xl font-bold text-violet-400">{referralStats.total_referrals}</p>
              <p className="text-xs text-muted-foreground">Friends Invited</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-black/20">
              <p className="font-heading text-xl font-bold text-yellow-400">{referralStats.total_earnings}</p>
              <p className="text-xs text-muted-foreground">Coins Earned</p>
            </div>
          </div>
        )}

        {/* Recent Referrals */}
        {referralStats?.recent_referrals?.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Recent Referrals</p>
            <div className="space-y-2">
              {referralStats.recent_referrals.map((ref, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-black/20">
                  <span className="text-muted-foreground">{ref.email}</span>
                  <span className="text-yellow-400">+{ref.reward}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

        </div>
        {/* Right Column */}
        <div>
      {/* Referral Milestones */}
      {milestones && (
        <Card className="bg-card/50 border-white/10 p-6 mb-6" data-testid="milestones-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <h3 className="font-heading font-semibold">Referral Milestones</h3>
            </div>
            <span className="text-xs text-muted-foreground">{milestones.referral_count} referrals</span>
          </div>

          {/* Next Milestone Progress */}
          {milestones.next_milestone && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Next: {milestones.next_milestone.icon} {milestones.next_milestone.name}</span>
                <span className="text-xs text-muted-foreground">
                  {milestones.referral_count}/{milestones.next_milestone.required_referrals}
                </span>
              </div>
              <Progress 
                value={milestones.next_milestone.progress_percent} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {milestones.next_milestone.required_referrals - milestones.referral_count} more to unlock {milestones.next_milestone.reward_coins} coins!
              </p>
            </div>
          )}

          {/* Milestone List */}
          <div className="space-y-3">
            {milestones.milestones.map((milestone) => (
              <div 
                key={milestone.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  milestone.is_claimed 
                    ? 'bg-green-500/10 border border-green-500/30' 
                    : milestone.can_claim 
                      ? 'bg-yellow-500/10 border border-yellow-500/30 animate-pulse' 
                      : 'bg-secondary/30'
                }`}
                data-testid={`milestone-${milestone.id}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{milestone.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{milestone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {milestone.required_referrals} referrals • {milestone.reward_description}
                    </p>
                  </div>
                </div>
                
                {milestone.is_claimed ? (
                  <div className="flex items-center gap-1 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Claimed</span>
                  </div>
                ) : milestone.can_claim ? (
                  <Button
                    size="sm"
                    onClick={() => setPendingClaimMilestone(milestone)}
                    disabled={claimingMilestone === milestone.id}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full text-xs px-3"
                    data-testid={`claim-${milestone.id}`}
                  >
                    {claimingMilestone === milestone.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Claim!'
                    )}
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stats */}
      <Card className="bg-card/50 border-white/10 p-6 mb-6">
        <h3 className="font-heading font-semibold mb-4">Your Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-xl bg-secondary/50">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-heading text-2xl font-bold">{user.coins}</span>
            </div>
            <p className="text-xs text-muted-foreground">Coins</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-secondary/50">
            <p className="font-heading text-2xl font-bold">
              {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </p>
            <p className="text-xs text-muted-foreground">Member since</p>
          </div>
        </div>
      </Card>

      {/* Quick Links */}
      <div className="space-y-2 mb-6">
        {/* Leaderboard */}
        <button 
          onClick={() => navigate("/leaderboard")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 hover:from-yellow-500/30 hover:to-orange-500/30 transition-colors"
          data-testid="leaderboard-btn"
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div className="text-left">
              <p className="font-medium text-sm">{t("leaderboard.title")}</p>
              <p className="text-xs text-muted-foreground">{t("leaderboard.subtitle")}</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </button>

        <button 
          onClick={() => navigate("/creator")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-600/20 hover:from-green-500/30 hover:to-emerald-600/30 transition-colors"
          data-testid="creator-portal-btn"
        >
          <div className="flex items-center gap-3">
            <Film className="w-5 h-5 text-green-400" />
            <div className="text-left">
              <p className="font-medium text-sm">{t("profile.creatorStudio")}</p>
              <p className="text-xs text-muted-foreground">Upload & earn from your content</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </button>
        
        <button 
          onClick={() => navigate("/subscriptions")}
          className="w-full flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/20 to-purple-600/20 hover:from-primary/30 hover:to-purple-600/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-yellow-400" />
            <div className="text-left">
              <p className="font-medium text-sm">{t("profile.upgradeToVip")}</p>
              <p className="text-xs text-muted-foreground">Get monthly coins</p>
            </div>
          </div>
          <ChevronLeft className="w-5 h-5 rotate-180" />
        </button>
        
        {user.is_admin && (
          <button 
            onClick={() => navigate("/admin")}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">{t("profile.adminPanel")}</p>
                <p className="text-xs text-muted-foreground">Manage platform</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 rotate-180" />
          </button>
        )}
      </div>

      {/* Settings Section */}
      <Card className="bg-card/50 border-white/10 p-6 mb-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {t("profile.settings")}
        </h3>
        
        {/* Install App */}
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-green-400" />
            <div>
              <p className="font-medium text-sm">Install App</p>
              <p className="text-xs text-muted-foreground">Add Kona to your home screen</p>
            </div>
          </div>
          <InstallButton />
        </div>
        
        {/* Language Setting */}
        <div className="flex items-center justify-between py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-400" />
            <div>
              <p className="font-medium text-sm">{t("profile.language")}</p>
              <p className="text-xs text-muted-foreground">Select your preferred language</p>
            </div>
          </div>
          <LanguageSelector />
        </div>
        
        {/* Notifications Setting */}
        <div className="py-3">
          <button 
            onClick={() => setShowNotificationSettings(!showNotificationSettings)}
            className="w-full flex items-center justify-between"
            data-testid="toggle-notifications-btn"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-400" />
              <div className="text-left">
                <p className="font-medium text-sm">{t("profile.notifications")}</p>
                <p className="text-xs text-muted-foreground">Manage push notifications</p>
              </div>
            </div>
            <ChevronLeft className={`w-5 h-5 transition-transform ${showNotificationSettings ? '-rotate-90' : 'rotate-180'}`} />
          </button>
          
          {showNotificationSettings && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <NotificationSettings />
            </div>
          )}
        </div>
      </Card>

      {/* Achievement Badges Section */}
      <Card className="bg-card/50 border-white/10 p-6 mb-6">
        <AchievementBadges />
      </Card>
        </div>
      </div>
      {/* End Desktop Two-Column Layout */}

      {/* Actions */}
      <Button 
        variant="outline" 
        className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-full"
        onClick={() => setShowLogoutModal(true)}
        data-testid="logout-btn"
      >
        {t("auth.signOut")}
      </Button>

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogout}
        loading={logoutLoading}
      />

      {/* Claim Reward Confirmation Modal */}
      <ClaimRewardModal
        open={!!pendingClaimMilestone}
        onOpenChange={(open) => !open && setPendingClaimMilestone(null)}
        rewardName={pendingClaimMilestone?.name || ""}
        rewardAmount={pendingClaimMilestone?.reward_coins || 0}
        onConfirm={() => claimMilestone(pendingClaimMilestone?.id)}
        loading={claimLoading}
      />
    </div>
  );
};

export default ProfilePage;
