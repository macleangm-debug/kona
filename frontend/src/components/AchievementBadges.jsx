import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { Award, Loader2, Star, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { BadgeCard, BadgeToast } from "@/components/BadgeCard";
import { toast } from "sonner";

export const AchievementBadges = () => {
  const { t } = useTranslation();
  const { user, token, refreshUser } = useAuth();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [selectedForFeatured, setSelectedForFeatured] = useState([]);
  const [editingFeatured, setEditingFeatured] = useState(false);

  useEffect(() => {
    if (token) {
      fetchBadges();
    }
  }, [token]);

  const fetchBadges = async () => {
    try {
      const res = await axios.get(`${API}/badges/my-badges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBadges(res.data.badges);
      setSelectedForFeatured(res.data.featured_badges || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const checkForNewBadges = async () => {
    setChecking(true);
    try {
      const res = await axios.post(`${API}/badges/check`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.newly_earned.length > 0) {
        // Show toast for each new badge
        res.data.newly_earned.forEach((badge) => {
          toast.custom(() => <BadgeToast badge={badge} />, {
            duration: 5000
          });
        });
        
        // Refresh badges and user data
        await fetchBadges();
        await refreshUser();
      } else {
        toast.info("No new badges earned yet. Keep going!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to check badges");
    }
    setChecking(false);
  };

  const toggleFeaturedBadge = (badgeId) => {
    if (selectedForFeatured.includes(badgeId)) {
      setSelectedForFeatured(selectedForFeatured.filter(id => id !== badgeId));
    } else if (selectedForFeatured.length < 3) {
      setSelectedForFeatured([...selectedForFeatured, badgeId]);
    } else {
      toast.error("Maximum 3 featured badges");
    }
  };

  const saveFeaturedBadges = async () => {
    try {
      await axios.put(`${API}/badges/featured`, 
        { badge_ids: selectedForFeatured },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Featured badges updated!");
      setEditingFeatured(false);
      fetchBadges();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

  return (
    <div className="space-y-4" data-testid="achievement-badges">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          <h3 className="font-heading font-semibold">Achievement Badges</h3>
        </div>
        <span className="text-xs text-gray-400">
          {earnedBadges.length}/{badges.length} earned
        </span>
      </div>

      {/* Check for New Badges Button */}
      <Button 
        onClick={checkForNewBadges}
        disabled={checking}
        variant="outline"
        className="w-full rounded-full border-primary/50"
        size="sm"
      >
        {checking ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Star className="w-4 h-4 mr-2" />
        )}
        Check for New Badges
      </Button>

      {/* Featured Badges Section */}
      {earnedBadges.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">Featured Badges</p>
              <p className="text-xs text-gray-400">Show up to 3 on your profile</p>
            </div>
            {editingFeatured ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditingFeatured(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={saveFeaturedBadges}>
                  <Check className="w-4 h-4 mr-1" /> Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditingFeatured(true)}>
                Edit
              </Button>
            )}
          </div>
          
          {editingFeatured ? (
            <div className="grid grid-cols-5 gap-2">
              {earnedBadges.map((badge) => (
                <BadgeCard 
                  key={badge.id}
                  badge={{...badge, featured: selectedForFeatured.includes(badge.id)}}
                  size="sm"
                  showProgress={false}
                  onClick={() => toggleFeaturedBadge(badge.id)}
                  selected={selectedForFeatured.includes(badge.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 justify-center">
              {earnedBadges.filter(b => b.featured).length > 0 ? (
                earnedBadges.filter(b => b.featured).map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} size="md" showProgress={false} />
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  Click "Edit" to select your featured badges
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div>
          <p className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
            <Check className="w-4 h-4" /> Earned ({earnedBadges.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {earnedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} size="md" showProgress={false} />
            ))}
          </div>
        </div>
      )}

      {/* Unearned Badges */}
      {unearnedBadges.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-400 mb-2">
            In Progress ({unearnedBadges.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {unearnedBadges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} size="md" showProgress={true} />
            ))}
          </div>
        </div>
      )}

      {/* Badge Descriptions */}
      <Card className="p-4 bg-white/5 border-white/10">
        <p className="text-sm font-medium mb-3">How to Earn Badges</p>
        <div className="space-y-2 text-xs text-gray-400">
          {badges.slice(0, 5).map((badge) => (
            <div key={badge.id} className="flex items-center justify-between">
              <span>{badge.name}</span>
              <span className={badge.earned ? "text-green-400" : ""}>{badge.description}</span>
            </div>
          ))}
          <p className="text-center pt-2 text-gray-500">...and more!</p>
        </div>
      </Card>
    </div>
  );
};

export default AchievementBadges;
