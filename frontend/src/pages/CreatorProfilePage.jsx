import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, Play, Users, Eye, Film, Calendar,
  Share2, CheckCircle, Instagram, Twitter, Youtube,
  ExternalLink, Heart, Plus, Check, Gift, ShoppingBag,
  Package, Coins, X, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

// Tip amounts for quick selection
const TIP_AMOUNTS = [10, 25, 50, 100, 500];

export const CreatorProfilePage = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Tip state
  const [showTipSheet, setShowTipSheet] = useState(false);
  const [tipAmount, setTipAmount] = useState(50);
  const [tipMessage, setTipMessage] = useState("");
  const [isTipping, setIsTipping] = useState(false);
  
  // Shop state
  const [shopItems, setShopItems] = useState([]);
  const [recentTips, setRecentTips] = useState([]);

  useEffect(() => {
    const fetchCreator = async () => {
      try {
        const response = await axios.get(`${API}/creators/${creatorId}/profile`);
        setCreator(response.data);
        
        // Check if user follows this creator
        if (token) {
          try {
            const followRes = await axios.get(`${API}/users/following`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setIsFollowing(followRes.data?.some(f => f.creator_id === creatorId) || false);
          } catch (e) {
            console.error("Failed to check follow status:", e);
          }
        }
        
        // Fetch shop items
        try {
          const shopRes = await axios.get(`${API}/creators/${creatorId}/shop?limit=6`);
          setShopItems(shopRes.data.items || []);
        } catch (e) {
          console.error("Failed to fetch shop:", e);
        }
        
        // Fetch recent tips
        try {
          const tipsRes = await axios.get(`${API}/creators/${creatorId}/tips/recent?limit=5`);
          setRecentTips(tipsRes.data || []);
        } catch (e) {
          console.error("Failed to fetch tips:", e);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Creator not found");
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [creatorId, token]);

  const handleFollow = async () => {
    if (!token) {
      toast.error("Please sign in to follow creators");
      navigate("/login");
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await axios.delete(`${API}/users/follow/${creatorId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFollowing(false);
        setCreator(prev => ({
          ...prev,
          stats: { ...prev.stats, followers: Math.max(0, prev.stats.followers - 1) }
        }));
        toast.success("Unfollowed creator");
      } else {
        await axios.post(`${API}/users/follow/${creatorId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFollowing(true);
        setCreator(prev => ({
          ...prev,
          stats: { ...prev.stats, followers: prev.stats.followers + 1 }
        }));
        toast.success("Now following!");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/creator/${creatorId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: creator?.display_name,
          text: `Check out ${creator?.display_name} on Kona!`,
          url: shareUrl
        });
      } catch (e) {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Profile link copied!");
    }
  };

  const handleSendTip = async () => {
    if (!token) {
      toast.error("Please sign in to send tips");
      navigate("/login");
      return;
    }

    if (tipAmount < 1) {
      toast.error("Minimum tip is 1 coin");
      return;
    }

    // Check if user has enough coins
    if ((user?.coins || 0) < tipAmount) {
      toast.error("Not enough coins");
      return;
    }

    setIsTipping(true);
    try {
      const response = await axios.post(`${API}/creators/${creatorId}/tip`, {
        amount: tipAmount,
        message: tipMessage || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(response.data.message || `Sent ${tipAmount} coins!`);
      setShowTipSheet(false);
      setTipMessage("");
      setTipAmount(50); // Reset to default
      
      // Refresh user balance
      if (refreshUser) {
        await refreshUser();
      }
      
      // Refresh recent tips
      const tipsRes = await axios.get(`${API}/creators/${creatorId}/tips/recent?limit=5`);
      setRecentTips(tipsRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send tip");
    } finally {
      setIsTipping(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || "0";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <Film className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Creator Not Found</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="creator-profile-page">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold">Creator Profile</h1>
          <button onClick={handleShare} className="p-2 -mr-2">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative">
            <img
              src={creator?.avatar_url || "/default-avatar.png"}
              alt={creator?.display_name}
              className="w-20 h-20 rounded-full object-cover border-2 border-primary"
            />
            {creator?.verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
                <CheckCircle className="w-4 h-4 text-white fill-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{creator?.display_name}</h2>
            </div>
            {creator?.username && (
              <p className="text-muted-foreground text-sm">@{creator.username}</p>
            )}
            <p className="text-xs text-primary mt-1">{creator?.category}</p>
          </div>
        </div>

        {/* Bio */}
        {creator?.bio && (
          <p className="mt-4 text-sm text-muted-foreground">{creator.bio}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold">{formatNumber(creator?.stats?.followers)}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold">{creator?.stats?.total_series || 0}</p>
            <p className="text-xs text-muted-foreground">Series</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold">{creator?.stats?.total_episodes || 0}</p>
            <p className="text-xs text-muted-foreground">Episodes</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/5">
            <p className="text-lg font-bold">{formatNumber(creator?.stats?.total_views)}</p>
            <p className="text-xs text-muted-foreground">Views</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex-1 ${isFollowing ? 'bg-white/10 hover:bg-white/20' : ''}`}
            variant={isFollowing ? "outline" : "default"}
            data-testid="follow-btn"
          >
            {isFollowing ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Following
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Follow
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Social Links */}
        {creator?.social_links && Object.keys(creator.social_links).length > 0 && (
          <div className="flex gap-3 mt-4 justify-center">
            {creator.social_links.instagram && (
              <a href={creator.social_links.instagram} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            )}
            {creator.social_links.twitter && (
              <a href={creator.social_links.twitter} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            )}
            {creator.social_links.youtube && (
              <a href={creator.social_links.youtube} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            )}
            {creator.social_links.website && (
              <a href={creator.social_links.website} target="_blank" rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Support Section - Tips & Shop */}
      <div className="px-4 mt-6">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          Support {creator?.display_name?.split(' ')[0]}
        </h3>
        
        {/* Action Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Tip Card */}
          <button
            onClick={() => setShowTipSheet(true)}
            className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 hover:border-yellow-500/50 transition-all text-center"
            data-testid="tip-btn"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-yellow-400" />
            </div>
            <p className="text-sm font-medium">Send Tip</p>
            <p className="text-[10px] text-muted-foreground">Support creator</p>
          </button>
          
          {/* Digital Shop Card */}
          <button
            onClick={() => navigate(`/creator/${creatorId}/shop?type=digital`)}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all text-center"
            data-testid="digital-shop-btn"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-purple-500/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-sm font-medium">Digital</p>
            <p className="text-[10px] text-muted-foreground">Downloads & more</p>
          </button>
          
          {/* Physical Shop Card */}
          <button
            onClick={() => navigate(`/creator/${creatorId}/shop?type=physical`)}
            className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 hover:border-blue-500/50 transition-all text-center"
            data-testid="physical-shop-btn"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm font-medium">Merch</p>
            <p className="text-[10px] text-muted-foreground">Physical items</p>
          </button>
        </div>
        
        {/* Shop Items Preview */}
        {shopItems.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Shop Items</p>
              <button 
                onClick={() => navigate(`/creator/${creatorId}/shop`)}
                className="text-xs text-primary"
              >
                View All
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
              {shopItems.slice(0, 4).map((item) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/creator/${creatorId}/shop/${item.id}`)}
                  className="flex-shrink-0 w-24 cursor-pointer group"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-white/5 mb-1">
                    <img 
                      src={item.image_url || "/default-product.jpg"} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <p className="text-xs truncate">{item.title}</p>
                  <p className="text-[10px] text-yellow-400 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    {item.price_coins}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Recent Tips */}
        {recentTips.length > 0 && (
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-muted-foreground mb-2">Recent Supporters</p>
            <div className="flex flex-wrap gap-2">
              {recentTips.map((tip, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-xs">
                  <span className="text-yellow-400">{tip.from_username}</span>
                  <span className="text-muted-foreground">sent</span>
                  <span className="text-yellow-400 font-medium">{tip.amount}</span>
                  <Coins className="w-3 h-3 text-yellow-400" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Series Grid */}
      <div className="px-4 mt-6">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          Series ({creator?.series?.length || 0})
        </h3>
        
        {creator?.series?.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {creator.series.map((series) => (
              <div 
                key={series.id} 
                className="cursor-pointer"
                onClick={() => navigate(`/series/${series.id}`)}
              >
                <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/5 relative group">
                  <img
                    src={series.thumbnail}
                    alt={series.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-medium truncate">{series.title}</p>
                    <p className="text-[10px] text-muted-foreground">{series.episode_count || 0} episodes</p>
                  </div>
                  {/* Play overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-primary/80 flex items-center justify-center">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Film className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No series yet</p>
          </div>
        )}
      </div>

      {/* Tip Sheet */}
      <Sheet open={showTipSheet} onOpenChange={setShowTipSheet}>
        <SheetContent side="bottom" className="bg-gray-900 border-white/10 rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-white flex items-center gap-2">
              <Gift className="w-5 h-5 text-yellow-400" />
              Send a Tip to {creator?.display_name?.split(' ')[0]}
            </SheetTitle>
          </SheetHeader>
          
          <div className="py-4 space-y-4">
            {/* Quick amounts */}
            <div className="flex flex-wrap gap-2">
              {TIP_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant={tipAmount === amount ? "default" : "outline"}
                  onClick={() => setTipAmount(amount)}
                  className="flex-1 min-w-[60px]"
                >
                  <Coins className="w-4 h-4 mr-1 text-yellow-400" />
                  {amount}
                </Button>
              ))}
            </div>
            
            {/* Custom amount */}
            <div>
              <label className="text-xs text-muted-foreground">Custom amount</label>
              <Input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(Math.max(1, parseInt(e.target.value) || 0))}
                className="bg-white/10 border-white/20"
                min={1}
                max={10000}
              />
            </div>
            
            {/* Message */}
            <div>
              <label className="text-xs text-muted-foreground">Add a message (optional)</label>
              <Input
                value={tipMessage}
                onChange={(e) => setTipMessage(e.target.value)}
                placeholder="Say something nice..."
                className="bg-white/10 border-white/20"
                maxLength={200}
              />
            </div>
            
            {/* Balance info */}
            <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-white/5">
              <span className="text-muted-foreground">Your balance:</span>
              <span className="text-white font-bold flex items-center gap-1">
                <Coins className="w-4 h-4 text-yellow-400" />
                {user?.coins || 0}
              </span>
            </div>
            
            {/* Send button */}
            <Button
              onClick={handleSendTip}
              disabled={isTipping || !tipAmount || (user?.coins || 0) < tipAmount}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold"
            >
              {isTipping ? "Sending..." : `Send ${tipAmount} Coins`}
            </Button>
            
            {(user?.coins || 0) < tipAmount && (
              <p className="text-center text-xs text-red-400">
                Not enough coins. <button onClick={() => navigate("/store")} className="underline">Get more</button>
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CreatorProfilePage;
