import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  Compass, Sparkles, TrendingUp, Heart, Zap, Clock, 
  Star, Play, ChevronRight, Loader2, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import SeriesCardDesktop from "@/components/SeriesCardDesktop";

// Netflix-style Content Preview Category Card
const CategoryCard = ({ title, icon: Icon, color, onClick, previewImages = [], seriesCount = 0 }) => (
  <button
    onClick={onClick}
    className="group relative overflow-hidden rounded-xl aspect-[16/9] min-w-[280px] lg:min-w-[320px] hover:scale-[1.02] transition-all duration-300 shadow-lg"
  >
    {/* Background Images Grid */}
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
      {previewImages.slice(0, 4).map((img, i) => (
        <div 
          key={i} 
          className="bg-cover bg-center"
          style={{ backgroundImage: `url(${img})` }}
        />
      ))}
      {/* Fill empty slots with gradient */}
      {[...Array(Math.max(0, 4 - previewImages.length))].map((_, i) => (
        <div key={`empty-${i}`} className={`bg-gradient-to-br ${color}`} />
      ))}
    </div>
    
    {/* Gradient Overlay */}
    <div className={`absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80 group-hover:opacity-90 transition-opacity`} />
    
    {/* Content */}
    <div className="absolute inset-0 flex flex-col justify-end p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-bold text-lg text-white">{title}</h3>
          {seriesCount > 0 && (
            <p className="text-xs text-gray-300">{seriesCount} series</p>
          )}
        </div>
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Play className="w-4 h-4 text-white fill-white" />
        </div>
      </div>
    </div>
    
    {/* Hover border effect */}
    <div className={`absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-white/30 transition-colors`} />
  </button>
);

// "Because You Watched" Row
const BecauseYouWatchedRow = ({ baseSeries, recommendations, onCardClick, myList, onAddToList, onRemoveFromList }) => {
  if (!baseSeries || recommendations.length === 0) return null;
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4 px-4 lg:px-12">
        <img 
          src={baseSeries.thumbnail} 
          alt="" 
          className="w-12 h-16 rounded-lg object-cover"
        />
        <div>
          <p className="text-sm text-gray-400">Because you watched</p>
          <p className="font-semibold">{baseSeries.title}</p>
        </div>
      </div>
      <div className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2">
        {recommendations.map((s) => (
          <SeriesCardDesktop
            key={s.id}
            series={s}
            onClick={() => onCardClick(s.id)}
            inMyList={myList?.includes(s.id)}
            onAddToList={onAddToList}
            onRemoveFromList={onRemoveFromList}
          />
        ))}
      </div>
    </div>
  );
};

// Content Row
const ContentRow = ({ title, icon: Icon, series, onCardClick, myList, onAddToList, onRemoveFromList }) => {
  if (!series || series.length === 0) return null;
  
  return (
    <div className="mb-8">
      <h2 className="font-heading text-base lg:text-xl font-semibold mb-4 px-4 lg:px-12 flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-primary" />}
        {title}
      </h2>
      <div className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2">
        {series.map((s) => (
          <SeriesCardDesktop
            key={s.id}
            series={s}
            onClick={() => onCardClick(s.id)}
            inMyList={myList?.includes(s.id)}
            onAddToList={onAddToList}
            onRemoveFromList={onRemoveFromList}
          />
        ))}
      </div>
    </div>
  );
};

export const DiscoverPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [allSeries, setAllSeries] = useState([]);
  const [myList, setMyList] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simulated personalized data (in production, this comes from recommendation engine)
  const [forYou, setForYou] = useState([]);
  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [quickBites, setQuickBites] = useState([]);
  const [watchedSeries, setWatchedSeries] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [seriesRes, comingSoonRes] = await Promise.all([
        axios.get(`${API}/series`),
        axios.get(`${API}/series/coming-soon`)
      ]);
      const series = seriesRes.data;
      setAllSeries(series);
      setComingSoon(comingSoonRes.data);

      // Generate personalized recommendations
      generateRecommendations(series);

      if (token) {
        try {
          const myListRes = await axios.get(`${API}/user/my-list`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyList(myListRes.data.map(s => s.id));
          
          // Simulate "Because you watched" based on first item in history
          if (series.length > 0) {
            const randomWatched = series[Math.floor(Math.random() * Math.min(5, series.length))];
            setWatchedSeries(randomWatched);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateRecommendations = (series) => {
    // Shuffle and create different recommendation categories
    const shuffled = [...series].sort(() => Math.random() - 0.5);
    
    // For You - personalized mix
    setForYou(shuffled.slice(0, 10));
    
    // Trending - sort by views
    setTrending([...series].sort((a, b) => b.views - a.views).slice(0, 10));
    
    // New Releases - last added
    setNewReleases(series.slice(-10).reverse());
    
    // Top Rated - sort by rating
    setTopRated([...series].sort((a, b) => b.rating - a.rating).slice(0, 10));
    
    // Quick Bites - series with fewer episodes
    setQuickBites([...series].sort((a, b) => a.total_episodes - b.total_episodes).slice(0, 10));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    generateRecommendations(allSeries);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleAddToList = async (seriesId) => {
    if (!token) { onAuthClick(); return; }
    try {
      await axios.post(`${API}/user/my-list/add`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList([...myList, seriesId]);
    } catch (e) {}
  };

  const handleRemoveFromList = async (seriesId) => {
    try {
      await axios.post(`${API}/user/my-list/remove`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList(myList.filter(id => id !== seriesId));
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-8 pt-20 lg:pt-24" data-testid="discover-page">
      {/* Header */}
      <div className="px-4 lg:px-12 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold">Discover</h1>
              <p className="text-sm text-gray-400">Personalized picks just for you</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="rounded-full"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Categories - Netflix-style Preview Cards */}
      <div className="px-4 lg:px-12 mb-8">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
          <CategoryCard 
            title="Trending Now" 
            icon={TrendingUp} 
            color="from-red-500 to-orange-500"
            onClick={() => navigate("/category/trending")}
            previewImages={trending.slice(0, 4).map(s => s.thumbnail)}
            seriesCount={trending.length}
          />
          <CategoryCard 
            title="Top Rated" 
            icon={Star} 
            color="from-yellow-500 to-amber-500"
            onClick={() => navigate("/category/top-rated")}
            previewImages={topRated.slice(0, 4).map(s => s.thumbnail)}
            seriesCount={topRated.length}
          />
          <CategoryCard 
            title="New Releases" 
            icon={Sparkles} 
            color="from-green-500 to-emerald-500"
            onClick={() => navigate("/category/new-releases")}
            previewImages={newReleases.slice(0, 4).map(s => s.thumbnail)}
            seriesCount={newReleases.length}
          />
          <CategoryCard 
            title="Romance" 
            icon={Heart} 
            color="from-pink-500 to-rose-500"
            onClick={() => navigate("/category/romance")}
            previewImages={allSeries.filter(s => s.genre === "Romance").slice(0, 4).map(s => s.thumbnail)}
            seriesCount={allSeries.filter(s => s.genre === "Romance").length}
          />
          <CategoryCard 
            title="Drama" 
            icon={Star} 
            color="from-purple-500 to-violet-500"
            onClick={() => navigate("/category/drama")}
            previewImages={allSeries.filter(s => s.genre === "Drama").slice(0, 4).map(s => s.thumbnail)}
            seriesCount={allSeries.filter(s => s.genre === "Drama").length}
          />
          <CategoryCard 
            title="Thriller" 
            icon={Zap} 
            color="from-slate-600 to-gray-800"
            onClick={() => navigate("/category/thriller")}
            previewImages={allSeries.filter(s => s.genre === "Thriller").slice(0, 4).map(s => s.thumbnail)}
            seriesCount={allSeries.filter(s => s.genre === "Thriller").length}
          />
          <CategoryCard 
            title="Action" 
            icon={TrendingUp} 
            color="from-orange-500 to-red-600"
            onClick={() => navigate("/category/action")}
            previewImages={allSeries.filter(s => s.genre === "Action").slice(0, 4).map(s => s.thumbnail)}
            seriesCount={allSeries.filter(s => s.genre === "Action").length}
          />
          <CategoryCard 
            title="Coming Soon" 
            icon={Clock} 
            color="from-blue-500 to-cyan-500"
            onClick={() => navigate("/category/coming-soon")}
            previewImages={comingSoon.slice(0, 4).map(s => s.thumbnail)}
            seriesCount={comingSoon.length}
          />
        </div>
      </div>

      {/* For You - AI Personalized */}
      <ContentRow
        title="Picked For You"
        icon={Sparkles}
        series={forYou}
        onCardClick={(id) => navigate(`/series/${id}`)}
        myList={myList}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />

      {/* Because You Watched */}
      {user && watchedSeries && (
        <BecauseYouWatchedRow
          baseSeries={watchedSeries}
          recommendations={allSeries.filter(s => 
            s.genre === watchedSeries.genre && s.id !== watchedSeries.id
          ).slice(0, 8)}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
        />
      )}

      {/* Trending */}
      <ContentRow
        title="Trending This Week"
        icon={TrendingUp}
        series={trending}
        onCardClick={(id) => navigate(`/series/${id}`)}
        myList={myList}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />

      {/* Top Rated */}
      <ContentRow
        title="Highest Rated"
        icon={Star}
        series={topRated}
        onCardClick={(id) => navigate(`/series/${id}`)}
        myList={myList}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />

      {/* Genre-based recommendations */}
      <ContentRow
        title="If You Like Romance"
        icon={Heart}
        series={allSeries.filter(s => s.genre === "Romance").slice(0, 10)}
        onCardClick={(id) => navigate(`/series/${id}`)}
        myList={myList}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />

      {/* Quick Bites */}
      <ContentRow
        title="Quick Bites (Under 10 Episodes)"
        icon={Clock}
        series={quickBites}
        onCardClick={(id) => navigate(`/series/${id}`)}
        myList={myList}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />

      {/* New Releases */}
      <ContentRow
        title="Just Added"
        icon={Sparkles}
        series={newReleases}
        onCardClick={(id) => navigate(`/series/${id}`)}
        myList={myList}
        onAddToList={handleAddToList}
        onRemoveFromList={handleRemoveFromList}
      />
    </div>
  );
};

export default DiscoverPage;
