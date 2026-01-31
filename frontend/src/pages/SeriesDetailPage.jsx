import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Star, Eye, Lock, Clock, Play, Coins, Loader2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { CoinBalance, UnlockSheet } from "@/components";
import { WatchPartyModal } from "@/components/WatchPartyModal";

export const SeriesDetailPage = ({ onAuthClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [unlockedEpisodes, setUnlockedEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unlockSheet, setUnlockSheet] = useState({ open: false, episode: null });
  const [showWatchParty, setShowWatchParty] = useState(false);
  const [selectedEpisodeForParty, setSelectedEpisodeForParty] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [seriesRes, episodesRes] = await Promise.all([
          axios.get(`${API}/series/${id}`),
          axios.get(`${API}/series/${id}/episodes`)
        ]);
        setSeries(seriesRes.data);
        setEpisodes(episodesRes.data);

        if (token) {
          const unlockedRes = await axios.get(`${API}/user/unlocked-episodes`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUnlockedEpisodes(unlockedRes.data.unlocked_episodes);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, token]);

  const handleEpisodeClick = (episode) => {
    // Allow free episodes (Episode 1) to be watched without login
    const isUnlocked = episode.is_free || episode.episode_number === 1 || unlockedEpisodes.includes(episode.id);
    
    if (isUnlocked) {
      navigate(`/watch/${episode.id}`);
      return;
    }
    
    // For non-free episodes, require login
    if (!user) {
      onAuthClick();
      return;
    }
    
    setUnlockSheet({ open: true, episode });
  };

  const handleUnlock = async (episodeId) => {
    try {
      await axios.post(`${API}/episodes/unlock`, { episode_id: episodeId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnlockedEpisodes([...unlockedEpisodes, episodeId]);
      await refreshUser();
      toast.success("Episode unlocked!");
      navigate(`/watch/${episodeId}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to unlock");
    }
  };

  if (loading || !series) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20" data-testid="series-detail-page">
      {/* Spacer for fixed header */}
      <div className="h-16 lg:h-20" />
      
      {/* Hero */}
      <div className="relative h-64">
        <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
          data-testid="back-btn"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        {user && (
          <div className="absolute top-4 right-4 z-10">
            <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 -mt-16 relative z-10">
        <Badge className="mb-2 bg-primary/80">{series.genre}</Badge>
        <h1 className="font-heading text-2xl font-bold mb-2">{series.title}</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span>{series.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{(series.views / 1000).toFixed(0)}K views</span>
          </div>
          <span>{series.total_episodes} episodes</span>
        </div>
        <p className="text-muted-foreground text-sm mb-6">{series.description}</p>

        {/* Episodes */}
        <h2 className="font-heading text-lg font-semibold mb-3">Episodes</h2>
        <div className="space-y-2">
          {episodes.map((ep) => {
            const isUnlocked = ep.is_free || unlockedEpisodes.includes(ep.id);
            return (
              <div
                key={ep.id}
                onClick={() => handleEpisodeClick(ep)}
                className="flex items-center gap-4 p-3 rounded-xl bg-card/50 border border-white/5 hover:bg-card/80 transition-all cursor-pointer"
                data-testid={`episode-${ep.episode_number}`}
              >
                <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
                  {!isUnlocked && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{ep.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{ep.duration}</span>
                    {!isUnlocked && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Coins className="w-3 h-3" />
                        {ep.coins_required}
                      </span>
                    )}
                  </div>
                </div>
                {isUnlocked ? (
                  <Play className="w-5 h-5 text-primary" />
                ) : (
                  <Lock className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <UnlockSheet
        open={unlockSheet.open}
        onClose={() => setUnlockSheet({ open: false, episode: null })}
        episode={unlockSheet.episode}
        onUnlock={handleUnlock}
        userCoins={user?.coins || 0}
      />
    </div>
  );
};

export default SeriesDetailPage;
