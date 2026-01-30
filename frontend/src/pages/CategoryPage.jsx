import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Loader2, BookmarkPlus, Compass, Sparkles, Play, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { SeriesCard, ContinueWatchingCard, ComingSoonCard } from "@/components";
import SeriesCardDesktop from "@/components/SeriesCardDesktop";

export const CategoryPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const { category } = useParams();
  const { user, token } = useAuth();
  const [series, setSeries] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [myList, setMyList] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category configuration
  const categoryConfig = {
    trending: { title: "Trending Now", emoji: "🔥", filter: (s) => s },
    "top-rated": { title: "Top Rated", emoji: "⭐", filter: (s) => s.filter(item => item.rating >= 4.5) },
    "my-list": { title: "My List", emoji: "📚", filter: (s) => s.filter(item => myList.includes(item.id)) },
    romance: { title: "Romance", emoji: "💕", filter: (s) => s.filter(item => item.genre === "Romance") },
    "continue-watching": { title: "Continue Watching", emoji: "▶️", filter: () => continueWatching },
    thriller: { title: "Thriller", emoji: "🔪", filter: (s) => s.filter(item => item.genre === "Thriller") },
    drama: { title: "Drama", emoji: "🎭", filter: (s) => s.filter(item => item.genre === "Drama") },
    action: { title: "Action", emoji: "💥", filter: (s) => s.filter(item => item.genre === "Action") },
    "coming-soon": { title: "Coming Soon", emoji: "🔜", filter: () => comingSoon },
    "new-releases": { title: "New Releases", emoji: "✨", filter: (s) => s.slice(-20) }
  };

  const currentCategory = categoryConfig[category] || { title: "All Series", emoji: "🎬", filter: (s) => s };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [seriesRes, comingSoonRes] = await Promise.all([
          axios.get(`${API}/series`),
          axios.get(`${API}/series/coming-soon`)
        ]);
        setSeries(seriesRes.data);
        setComingSoon(comingSoonRes.data);

        if (token) {
          const [myListRes, progressRes] = await Promise.all([
            axios.get(`${API}/user/my-list`, { headers: { Authorization: `Bearer ${token}` } }),
            axios.get(`${API}/user/continue-watching`, { headers: { Authorization: `Bearer ${token}` } })
          ]);
          setMyList(myListRes.data.map(s => s.id));
          setContinueWatching(progressRes.data);
        }
      } catch (e) {
        console.error("Error fetching category data:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [token, category]);

  const filteredSeries = currentCategory.filter(series);

  const handleAddToList = async (seriesId) => {
    if (!token) return onAuthClick();
    try {
      await axios.post(`${API}/user/my-list/add`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList(prev => [...prev, seriesId]);
      toast.success("Added to My List");
    } catch (e) {
      toast.error("Failed to add");
    }
  };

  const handleRemoveFromList = async (seriesId) => {
    if (!token) return;
    try {
      await axios.post(`${API}/user/my-list/remove`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList(prev => prev.filter(id => id !== seriesId));
      toast.success("Removed from My List");
    } catch (e) {
      toast.error("Failed to remove");
    }
  };

  // Check if we should use carousel layout (desktop-style horizontal scroll)
  const useCarouselLayout = window.innerWidth >= 1024;

  return (
    <div className="pb-20 pt-20 lg:pt-24" data-testid="category-page">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 lg:px-12 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-background/80 hover:bg-background"
          data-testid="category-back-btn"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading text-xl lg:text-2xl font-bold">
          {currentCategory.title} {currentCategory.emoji}
        </h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSeries.length === 0 ? (
        /* Empty State with CTA */
        category === "my-list" ? (
          <div className="px-4 lg:px-12">
            <Card className="max-w-lg mx-auto p-8 bg-gradient-to-br from-primary/10 to-purple-600/10 border-primary/20 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                <BookmarkPlus className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="font-heading text-2xl font-bold mb-3">
                {user ? "Your List is Empty" : "Start Your Watchlist"}
              </h2>
              
              <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                {user 
                  ? "Save your favorite series here for easy access. Tap the + button on any series to add it to your list."
                  : "Sign in to create your personal watchlist and never lose track of what you want to watch next."
                }
              </p>
              
              {!user ? (
                <div className="space-y-3">
                  <Button onClick={onAuthClick} className="w-full rounded-full" size="lg">
                    <Heart className="w-5 h-5 mr-2" />
                    Sign In to Start
                  </Button>
                  <p className="text-xs text-gray-500">
                    Get personalized recommendations & save favorites
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button onClick={() => navigate("/discover")} className="w-full rounded-full" size="lg">
                    <Compass className="w-5 h-5 mr-2" />
                    Discover Series
                  </Button>
                  <Button onClick={() => navigate("/")} variant="outline" className="w-full rounded-full">
                    <Play className="w-5 h-5 mr-2" />
                    Browse Home
                  </Button>
                </div>
              )}
              
              {/* Feature highlights */}
              <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-3 gap-4 text-center">
                <div>
                  <Sparkles className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
                  <p className="text-xs text-gray-400">Quick Access</p>
                </div>
                <div>
                  <Heart className="w-5 h-5 mx-auto mb-1 text-red-400" />
                  <p className="text-xs text-gray-400">Save Favorites</p>
                </div>
                <div>
                  <Play className="w-5 h-5 mx-auto mb-1 text-green-400" />
                  <p className="text-xs text-gray-400">Resume Anytime</p>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <p className="text-muted-foreground">No series found in this category</p>
            <Button onClick={() => navigate("/discover")} className="mt-4 rounded-full">
              Discover Series
            </Button>
          </div>
        )
      ) : category === "continue-watching" ? (
        /* Continue Watching - Carousel on desktop, grid on mobile */
        <div className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2">
          {filteredSeries.map((item, i) => (
            <div key={i} className="flex-shrink-0">
              <SeriesCardDesktop
                series={item.series}
                onClick={() => navigate(`/series/${item.series.id}`)}
                inMyList={myList.includes(item.series.id)}
                onAddToList={handleAddToList}
                onRemoveFromList={handleRemoveFromList}
              />
            </div>
          ))}
        </div>
      ) : category === "coming-soon" ? (
        /* Coming Soon - Carousel layout */
        <div className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2">
          {filteredSeries.map((s) => (
            <div key={s.id} className="flex-shrink-0">
              <SeriesCardDesktop
                series={s}
                onClick={() => navigate(`/series/${s.id}`)}
                inMyList={myList.includes(s.id)}
                onAddToList={handleAddToList}
                onRemoveFromList={handleRemoveFromList}
                showComingSoon={true}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Standard layout - Carousel on desktop */
        <div className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2 flex-wrap lg:flex-nowrap">
          {filteredSeries.map((s) => (
            <div key={s.id} className="flex-shrink-0 w-[calc(33.333%-8px)] lg:w-auto">
              <SeriesCardDesktop
                series={s}
                onClick={() => navigate(`/series/${s.id}`)}
                inMyList={myList.includes(s.id)}
                onAddToList={handleAddToList}
                onRemoveFromList={handleRemoveFromList}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
