import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Gift, Star, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';

import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/SplashScreen";
import { API } from "@/config";
import { toast } from "sonner";
import { KonaLogo2Full } from "@/components/KonaLogo";
import { CoinBalance, SeriesCard, LazySeriesCard, ContinueWatchingCard, ComingSoonCard, DailyRewardModal, ReminderSuccessModal, SearchModal } from "@/components";

// Tab Button
const TabButton = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-all ${
      active 
        ? "text-white border-b-2 border-primary" 
        : "text-muted-foreground hover:text-white"
    }`}
  >
    {children}
  </button>
);

// Category Pill
const CategoryPill = ({ active, children, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
      active 
        ? "bg-primary text-white" 
        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

export const HomePage = ({ onAuthClick }) => {
  const [series, setSeries] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [myList, setMyList] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [userReminders, setUserReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reminderLoading, setReminderLoading] = useState(null);
  const [showReminderSuccess, setShowReminderSuccess] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState("explore");
  const [activeCategory, setActiveCategory] = useState("all");
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [showReward, setShowReward] = useState(false);
  const [canClaimReward, setCanClaimReward] = useState(false);

  const tabs = [
    { id: "explore", label: "Explore" },
    { id: "new", label: "New" },
    { id: "originals", label: "Originals" },
    { id: "rankings", label: "Rankings" },
  ];

  const categories = [
    { id: "all", label: "Popular" },
    { id: "romance", label: "Romance" },
    { id: "drama", label: "Drama" },
    { id: "action", label: "Action" },
    { id: "thriller", label: "Thriller" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [seriesRes, featuredRes, comingSoonRes] = await Promise.all([
          axios.get(`${API}/series`),
          axios.get(`${API}/series/featured`),
          axios.get(`${API}/series/coming-soon`)
        ]);
        setSeries(seriesRes.data);
        setFeatured(featuredRes.data);
        setComingSoon(comingSoonRes.data);
        
        // Fetch user-specific data
        if (token) {
          // Real Continue Watching data
          try {
            const continueRes = await axios.get(`${API}/user/continue-watching`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setContinueWatching(continueRes.data);
          } catch (e) {
            // Fallback to mock data if no progress yet
            const mockContinue = seriesRes.data.slice(0, 3).map((s, i) => ({
              series: s,
              episode: i + 2,
              progress: Math.floor(Math.random() * 60) + 30
            }));
            setContinueWatching(mockContinue);
          }
          
          // Fetch My List
          try {
            const myListRes = await axios.get(`${API}/user/my-list`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setMyList(myListRes.data.map(s => s.id));
          } catch (e) {
            console.error("Error fetching my list:", e);
          }
          
          // Fetch user reminders
          try {
            const remindersRes = await axios.get(`${API}/user/reminders`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            setUserReminders(remindersRes.data.reminders || []);
          } catch (e) {
            console.error("Error fetching reminders:", e);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Add to My List
  const handleAddToList = async (seriesId) => {
    if (!token) {
      onAuthClick();
      return;
    }
    try {
      await axios.post(`${API}/user/my-list/add`, 
        { series_id: seriesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyList([...myList, seriesId]);
      toast.success("Added to My List");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add");
    }
  };

  // Remove from My List
  const handleRemoveFromList = async (seriesId) => {
    try {
      await axios.post(`${API}/user/my-list/remove`, 
        { series_id: seriesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMyList(myList.filter(id => id !== seriesId));
      toast.success("Removed from My List");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to remove");
    }
  };

  // Handle setting a reminder
  const handleSetReminder = async (seriesId) => {
    if (!token) {
      onAuthClick();
      return;
    }
    
    setReminderLoading(seriesId);
    try {
      await axios.post(`${API}/series/remind`, 
        { series_id: seriesId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserReminders([...userReminders, seriesId]);
      setShowReminderSuccess(true);
      
      // Update local coming soon count
      setComingSoon(comingSoon.map(s => 
        s.id === seriesId ? { ...s, reserved_count: s.reserved_count + 1 } : s
      ));
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to set reminder");
    }
    setReminderLoading(null);
  };

  useEffect(() => {
    const checkReward = async () => {
      if (token) {
        try {
          const res = await axios.get(`${API}/rewards/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.data.can_claim) {
            setCanClaimReward(true);
            setShowReward(true);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
    checkReward();
  }, [token]);

  const handleClaimReward = async () => {
    try {
      await axios.post(`${API}/rewards/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      toast.success("You got 3 coins!");
      setCanClaimReward(false);
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to claim reward");
      return false;
    }
  };

  // Filter series based on active category
  const filteredSeries = activeCategory === "all" 
    ? series 
    : series.filter(s => s.genre.toLowerCase() === activeCategory);

  // Assign badges to series
  const getBadge = (s, index) => {
    if (s.featured) return "hot";
    if (index < 2) return "new";
    if (s.rating >= 4.8) return "top";
    return null;
  };

  // Hero carousel - use featured series or top series
  const heroSlides = featured.length > 0 ? featured : series.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const swiperRef = useRef(null);

  if (loading) {
    return <PageLoader message="Loading content..." />;
  }

  return (
    <div className="pb-20" data-testid="home-page">
      {/* Header - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black via-black/90 to-transparent max-w-md mx-auto" data-testid="app-header">
        <KonaLogo2Full height={28} />
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button 
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setShowSearch(true)}
            data-testid="search-btn"
          >
            <Search className="w-5 h-5" />
          </button>
          {user ? (
            <>
              <button 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                onClick={() => setShowReward(true)}
                data-testid="gift-btn"
              >
                <Gift className="w-5 h-5 text-yellow-400" />
              </button>
              <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
            </>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              className="rounded-full bg-primary hover:bg-primary/90 h-8 px-4"
              onClick={onAuthClick}
              data-testid="login-btn"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-14" />

      {/* Hero Carousel - Swiper Coverflow Effect */}
      {heroSlides.length > 0 && (
        <div className="mb-6 relative" data-testid="hero-carousel">
          <Swiper
            ref={swiperRef}
            modules={[EffectCoverflow, Autoplay, Pagination]}
            effect="coverflow"
            grabCursor={true}
            centeredSlides={true}
            slidesPerView="auto"
            loop={heroSlides.length > 2}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
              pauseOnMouseEnter: true
            }}
            coverflowEffect={{
              rotate: 0,
              stretch: 0,
              depth: 200,
              modifier: 1.5,
              slideShadows: false,
            }}
            pagination={{
              clickable: true,
              bulletClass: 'swiper-pagination-bullet hero-bullet',
              bulletActiveClass: 'swiper-pagination-bullet-active hero-bullet-active',
            }}
            onSlideChange={(swiper) => setActiveIndex(swiper.realIndex)}
            className="hero-swiper"
            style={{ paddingBottom: '40px' }}
          >
            {heroSlides.map((heroSeries, index) => (
              <SwiperSlide key={heroSeries.id} className="hero-slide">
                <div 
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl cursor-pointer mx-auto"
                  style={{ maxWidth: '280px' }}
                  onClick={() => navigate(`/watch/${heroSeries.id}-ep1`)}
                >
                  {/* Background Image */}
                  <img 
                    src={heroSeries.thumbnail} 
                    alt={heroSeries.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  {/* Top Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                      TOP {index + 1}
                    </span>
                    {heroSeries.featured && (
                      <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                        HOT
                      </span>
                    )}
                  </div>
                  
                  {/* Episode Count */}
                  <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs">
                    {heroSeries.total_episodes} EP
                  </div>
                  
                  {/* Play Button */}
                  <button 
                    className="absolute inset-0 flex items-center justify-center z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/watch/${heroSeries.id}-ep1`);
                    }}
                    data-testid={`hero-play-btn-${index}`}
                  >
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-black fill-black ml-1" />
                    </div>
                  </button>
                  
                  {/* Content at Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="font-heading text-lg font-bold mb-1 line-clamp-2">
                      {heroSeries.title}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <span>{heroSeries.genre}</span>
                      <span>•</span>
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>{heroSeries.rating}</span>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      )}

      {/* Sticky Navigation - Tabs & Categories */}
      <div className="sticky top-14 z-40 bg-background">
        {/* Top Tabs */}
        <div className="flex items-center gap-1 px-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <TabButton 
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide bg-background">
          {categories.map(cat => (
            <CategoryPill 
              key={cat.id}
              active={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </CategoryPill>
          ))}
        </div>
      </div>

      {/* Trending Now - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">
            {activeCategory === "all" ? "Trending Now 🔥" : categories.find(c => c.id === activeCategory)?.label}
          </h2>
          <button 
            onClick={() => navigate("/category/trending")}
            className="text-xs text-primary"
            data-testid="see-all-trending"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {filteredSeries.map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <LazySeriesCard 
                series={s}
                badge={getBadge(s, index)}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* My List Section - Only show if user has items */}
      {user && myList.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-heading text-sm font-semibold">My List 📚</h2>
            <button 
              onClick={() => navigate("/category/my-list")}
              className="text-xs text-primary"
              data-testid="see-all-my-list"
            >See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {series.filter(s => myList.includes(s.id)).map((s) => (
              <div key={s.id} className="flex-shrink-0 w-28">
                <SeriesCard 
                  series={s}
                  onClick={() => navigate(`/series/${s.id}`)}
                  showViews={false}
                  inMyList={true}
                  onRemoveFromList={handleRemoveFromList}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Romance Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Romance 💕</h2>
          <button 
            onClick={() => navigate("/category/romance")}
            className="text-xs text-primary"
            data-testid="see-all-romance"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Romance").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <LazySeriesCard 
                series={s}
                badge={index === 0 ? "hot" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
                inMyList={myList.includes(s.id)}
                onAddToList={handleAddToList}
                onRemoveFromList={handleRemoveFromList}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Continue Watching - Lower on the page like Netflix */}
      {user && continueWatching.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-heading text-sm font-semibold">Continue Watching</h2>
            <button 
              onClick={() => navigate("/category/continue-watching")}
              className="text-xs text-primary"
              data-testid="see-all-continue-watching"
            >See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {continueWatching.map((item, i) => (
              <div key={i} className="flex-shrink-0 w-28">
                <ContinueWatchingCard
                  series={item.series}
                  episode={item.episode}
                  progress={item.progress}
                  onClick={() => navigate(`/series/${item.series.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thriller Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Thriller 🔪</h2>
          <button 
            onClick={() => navigate("/category/thriller")}
            className="text-xs text-primary"
            data-testid="see-all-thriller"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Thriller").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <LazySeriesCard 
                series={s}
                badge={index === 0 ? "top" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Drama Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Drama 🎭</h2>
          <button 
            onClick={() => navigate("/category/drama")}
            className="text-xs text-primary"
            data-testid="see-all-drama"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Drama").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <LazySeriesCard 
                series={s}
                badge={index === 0 ? "vip" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">Action 💥</h2>
          <button 
            onClick={() => navigate("/category/action")}
            className="text-xs text-primary"
            data-testid="see-all-action"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.filter(s => s.genre === "Action").map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge={index === 0 ? "new" : null}
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Section - Horizontal Scroll */}
      {comingSoon.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-heading text-sm font-semibold">Coming Soon 🔜</h2>
            <button 
              onClick={() => navigate("/category/coming-soon")}
              className="text-xs text-primary"
              data-testid="see-all-coming-soon"
            >See All</button>
          </div>
          <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
            {comingSoon.map((s) => (
              <div key={s.id} className="flex-shrink-0 w-28">
                <ComingSoonCard
                  series={s}
                  isReminded={userReminders.includes(s.id)}
                  onRemind={handleSetReminder}
                  loading={reminderLoading === s.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Releases Section - Horizontal Scroll */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h2 className="font-heading text-sm font-semibold">New Releases ✨</h2>
          <button 
            onClick={() => navigate("/category/new-releases")}
            className="text-xs text-primary"
            data-testid="see-all-new-releases"
          >See All</button>
        </div>
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-2">
          {series.slice(-8).map((s, index) => (
            <div key={s.id} className="flex-shrink-0 w-28">
              <SeriesCard 
                series={s}
                badge="new"
                onClick={() => navigate(`/series/${s.id}`)}
                showViews={false}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rankings Section */}
      {activeTab === "rankings" && (
        <div className="px-4 mt-6">
          <h2 className="font-heading text-sm font-semibold mb-3">Top 10 This Week</h2>
          <div className="space-y-3">
            {series.slice(0, 10).map((s, index) => (
              <div 
                key={s.id}
                onClick={() => navigate(`/series/${s.id}`)}
                className="flex items-center gap-3 p-2 rounded-xl bg-card/50 hover:bg-card transition-colors cursor-pointer"
              >
                <span className="font-heading text-2xl font-black text-primary w-8">{index + 1}</span>
                <img src={s.thumbnail} alt={s.title} className="w-16 h-20 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm line-clamp-1">{s.title}</h3>
                  <p className="text-xs text-muted-foreground">{s.genre} • {s.total_episodes} eps</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs">{s.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DailyRewardModal 
        open={showReward} 
        onClose={() => setShowReward(false)}
        onClaim={handleClaimReward}
      />
      
      <ReminderSuccessModal
        open={showReminderSuccess}
        onClose={() => setShowReminderSuccess(false)}
      />
      
      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </div>
  );
};

export default HomePage;
