import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { SeriesCard, ContinueWatchingCard, ComingSoonCard } from "@/components";

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

  return (
    <div className="pb-20 pt-4" data-testid="category-page">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-background/80 hover:bg-background"
          data-testid="category-back-btn"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading text-xl font-bold">
          {currentCategory.title} {currentCategory.emoji}
        </h1>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSeries.length === 0 ? (
        <div className="text-center py-12 px-4">
          <p className="text-muted-foreground">No series found in this category</p>
          {category === "my-list" && !user && (
            <Button onClick={onAuthClick} className="mt-4 rounded-full">
              Sign in to see your list
            </Button>
          )}
        </div>
      ) : category === "continue-watching" ? (
        /* Continue Watching Grid */
        <div className="grid grid-cols-3 gap-3 px-4">
          {filteredSeries.map((item, i) => (
            <div key={i}>
              <ContinueWatchingCard
                series={item.series}
                episode={item.episode}
                progress={item.progress}
                onClick={() => navigate(`/series/${item.series.id}`)}
              />
            </div>
          ))}
        </div>
      ) : category === "coming-soon" ? (
        /* Coming Soon Grid */
        <div className="grid grid-cols-3 gap-3 px-4">
          {filteredSeries.map((s) => (
            <div key={s.id}>
              <ComingSoonCard
                series={s}
                isReminded={false}
                onRemind={() => {}}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Standard Grid */
        <div className="grid grid-cols-3 gap-3 px-4">
          {filteredSeries.map((s) => (
            <div key={s.id}>
              <SeriesCard 
                series={s}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
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
