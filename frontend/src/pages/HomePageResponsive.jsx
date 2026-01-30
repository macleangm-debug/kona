import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Search, Gift, Star, Play, Info, Plus, Check, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { KonaLogo2Full } from "@/components/KonaLogo";
import { CoinBalance, DailyRewardModal, ReminderSuccessModal, SearchModal, KonaLoader } from "@/components";
import SeriesCardDesktop from "@/components/SeriesCardDesktop";
import SpinInviteModal from "@/components/SpinInviteModal";

// Content Row Component - Horizontal Scrollable
const ContentRow = ({ title, series, onCardClick, myList, onAddToList, onRemoveFromList, badge }) => {
  const rowRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkArrows = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.8;
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkArrows();
    const row = rowRef.current;
    if (row) {
      row.addEventListener('scroll', checkArrows);
      return () => row.removeEventListener('scroll', checkArrows);
    }
  }, [series]);

  if (!series || series.length === 0) return null;

  return (
    <div className="mb-8 lg:mb-12 group/row relative">
      {/* Row Title */}
      <h2 className="font-heading text-base lg:text-xl font-semibold mb-3 lg:mb-4 px-4 lg:px-12">
        {title}
      </h2>
      
      {/* Scroll Container */}
      <div className="relative">
        {/* Left Arrow - Desktop only */}
        <button
          onClick={() => scroll('left')}
          className={`hidden lg:flex absolute left-0 top-0 bottom-0 w-12 z-10 items-center justify-center bg-gradient-to-r from-black/80 to-transparent transition-opacity ${
            showLeftArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>

        {/* Cards Container */}
        <div
          ref={rowRef}
          className="flex gap-3 lg:gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {series.map((s, index) => (
            <SeriesCardDesktop
              key={s.id}
              series={s}
              badge={badge ? (typeof badge === 'function' ? badge(s, index) : badge) : null}
              onClick={() => onCardClick(s.id)}
              inMyList={myList?.includes(s.id)}
              onAddToList={onAddToList}
              onRemoveFromList={onRemoveFromList}
            />
          ))}
        </div>

        {/* Right Arrow - Desktop only */}
        <button
          onClick={() => scroll('right')}
          className={`hidden lg:flex absolute right-0 top-0 bottom-0 w-12 z-10 items-center justify-center bg-gradient-to-l from-black/80 to-transparent transition-opacity ${
            showRightArrow ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

// Desktop Hero Billboard
const HeroBillboard = ({ series, onPlay, onMoreInfo, inMyList, onAddToList }) => {
  const [isMuted, setIsMuted] = useState(true);
  
  if (!series) return null;

  return (
    <div className="relative w-full h-[70vh] lg:h-[85vh] mb-8">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={series.thumbnail} 
          alt={series.title}
          className="w-full h-full object-cover"
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/30" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute bottom-[15%] left-0 right-0 px-6 lg:px-12 max-w-3xl">
        {/* Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-red-600 text-white text-sm font-bold rounded">
            TOP 10
          </span>
          <span className="text-gray-300 text-sm">#1 in Series Today</span>
        </div>

        {/* Title */}
        <h1 className="font-heading text-4xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
          {series.title}
        </h1>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mb-4 text-sm lg:text-base text-gray-300">
          <span className="text-green-500 font-semibold">98% Match</span>
          <span>{series.total_episodes} Episodes</span>
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            {series.rating}
          </span>
          <span className="px-2 py-0.5 border border-gray-500 text-xs">HD</span>
        </div>

        {/* Description */}
        <p className="text-gray-300 text-sm lg:text-base mb-6 max-w-2xl line-clamp-3">
          {series.description || "An incredible story that will keep you on the edge of your seat. Watch the first episode free and unlock the rest with coins."}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onPlay}
            size="lg"
            className="bg-white text-black hover:bg-white/90 rounded-md px-8 h-12 text-base font-semibold"
            data-testid="hero-play-btn"
          >
            <Play className="w-6 h-6 fill-black mr-2" />
            Play
          </Button>
          <Button
            onClick={onMoreInfo}
            size="lg"
            variant="secondary"
            className="bg-gray-500/70 hover:bg-gray-500/90 text-white rounded-md px-6 h-12 text-base font-semibold"
            data-testid="hero-info-btn"
          >
            <Info className="w-5 h-5 mr-2" />
            More Info
          </Button>
          <Button
            onClick={() => onAddToList(series.id)}
            size="icon"
            variant="outline"
            className="rounded-full w-12 h-12 border-gray-400 hover:border-white"
            data-testid="hero-add-list-btn"
          >
            {inMyList ? (
              <Check className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mute/Unmute Button */}
      <button
        onClick={() => setIsMuted(!isMuted)}
        className="absolute bottom-[15%] right-6 lg:right-12 p-3 rounded-full border border-gray-400 hover:border-white transition-colors"
      >
        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>

      {/* Age Rating */}
      <div className="absolute bottom-[15%] right-24 lg:right-32 flex items-center gap-2 px-3 py-1 bg-gray-800/80 border-l-2 border-gray-400">
        <span className="text-sm">16+</span>
      </div>
    </div>
  );
};

// Mobile Hero Carousel (existing Swiper implementation)
const MobileHeroCarousel = ({ series, onCardClick }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const navigate = useNavigate();

  if (!series || series.length === 0) return null;

  return (
    <div className="mb-6 relative" data-testid="hero-carousel">
      <Swiper
        modules={[EffectCoverflow, Autoplay, Pagination]}
        effect="coverflow"
        grabCursor={true}
        centeredSlides={true}
        slidesPerView="auto"
        loop={series.length > 2}
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
        {series.map((heroSeries, index) => (
          <SwiperSlide key={heroSeries.id} className="hero-slide">
            <div 
              className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl cursor-pointer mx-auto"
              style={{ maxWidth: '280px' }}
              onClick={() => navigate(`/watch/${heroSeries.id}-ep1`)}
            >
              <img 
                src={heroSeries.thumbnail} 
                alt={heroSeries.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                  TOP {index + 1}
                </span>
              </div>
              
              <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs">
                {heroSeries.total_episodes} EP
              </div>
              
              <button className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                  <Play className="w-8 h-8 text-black fill-black ml-1" />
                </div>
              </button>
              
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h2 className="font-heading text-lg font-bold mb-1 line-clamp-2">
                  {heroSeries.title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <span>{heroSeries.genre}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span>{heroSeries.rating}</span>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

// Main HomePage Component
export const HomePageResponsive = ({ onAuthClick }) => {
  const [series, setSeries] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [myList, setMyList] = useState([]);
  const [comingSoon, setComingSoon] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();

  // Check viewport size
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        
        if (token) {
          try {
            const [continueRes, myListRes] = await Promise.all([
              axios.get(`${API}/user/continue-watching`, { headers: { Authorization: `Bearer ${token}` } }),
              axios.get(`${API}/user/my-list`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setContinueWatching(continueRes.data);
            setMyList(myListRes.data.map(s => s.id));
          } catch (e) {
            // Fallback mock data
            const mockContinue = seriesRes.data.slice(0, 3).map((s, i) => ({
              series: s,
              episode: i + 2,
              progress: Math.floor(Math.random() * 60) + 30
            }));
            setContinueWatching(mockContinue);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, [token]);

  // Daily reward check
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
        } catch (e) {}
      }
    };
    checkReward();
  }, [token]);

  const handleAddToList = async (seriesId) => {
    if (!token) { onAuthClick(); return; }
    try {
      await axios.post(`${API}/user/my-list/add`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList([...myList, seriesId]);
      toast.success("Added to My List");
    } catch (e) {
      toast.error("Failed to add");
    }
  };

  const handleRemoveFromList = async (seriesId) => {
    try {
      await axios.post(`${API}/user/my-list/remove`, { series_id: seriesId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyList(myList.filter(id => id !== seriesId));
      toast.success("Removed from My List");
    } catch (e) {
      toast.error("Failed to remove");
    }
  };

  const handleClaimReward = async () => {
    try {
      await axios.post(`${API}/rewards/claim`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshUser();
      toast.success("You got 10 coins!");
      setCanClaimReward(false);
      return true;
    } catch (e) {
      toast.error("Failed to claim reward");
      return false;
    }
  };

  const getBadge = (s, index) => {
    if (s.featured) return "hot";
    if (index < 2) return "new";
    if (s.rating >= 4.8) return "top";
    return null;
  };

  const heroSeries = featured.length > 0 ? featured : series.slice(0, 5);
  const billboardSeries = heroSeries[0];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <KonaLoader size={60} />
        <p className="mt-4 text-sm text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="home-page">
      {/* Mobile Header - Only on mobile */}
      {!isDesktop && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black via-black/90 to-transparent lg:hidden" data-testid="mobile-header">
          <KonaLogo2Full height={28} />
          <div className="flex items-center gap-2">
            <button 
              className="p-2 hover:bg-white/10 rounded-full"
              onClick={() => setShowSearch(true)}
            >
              <Search className="w-5 h-5" />
            </button>
            {user ? (
              <>
                <button 
                  className="p-2 hover:bg-white/10 rounded-full relative"
                  onClick={() => navigate("/notifications")}
                  data-testid="mobile-notifications-btn"
                >
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                </button>
                <button 
                  className="p-2 hover:bg-white/10 rounded-full"
                  onClick={() => setShowReward(true)}
                >
                  <Gift className="w-5 h-5 text-yellow-400" />
                </button>
                <CoinBalance coins={user.coins} onClick={() => navigate("/store")} />
              </>
            ) : (
              <Button 
                variant="default" 
                size="sm" 
                className="rounded-full bg-primary"
                onClick={onAuthClick}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Spacer for mobile header */}
      {!isDesktop && <div className="h-14 lg:hidden" />}
      
      {/* Desktop spacer for fixed header */}
      {isDesktop && <div className="h-20" />}

      {/* Hero Section */}
      {isDesktop ? (
        <HeroBillboard 
          series={billboardSeries}
          onPlay={() => navigate(`/watch/${billboardSeries?.id}-ep1`)}
          onMoreInfo={() => navigate(`/series/${billboardSeries?.id}`)}
          inMyList={myList.includes(billboardSeries?.id)}
          onAddToList={handleAddToList}
        />
      ) : (
        <MobileHeroCarousel 
          series={heroSeries}
          onCardClick={(id) => navigate(`/series/${id}`)}
        />
      )}

      {/* Content Rows */}
      <div className={isDesktop ? "" : "px-0"}>
        {/* Continue Watching */}
        {user && continueWatching.length > 0 && (
          <ContentRow
            title="Continue Watching"
            series={continueWatching.map(item => item.series)}
            onCardClick={(id) => navigate(`/series/${id}`)}
            myList={myList}
            onAddToList={handleAddToList}
            onRemoveFromList={handleRemoveFromList}
          />
        )}

        {/* Trending Now */}
        <ContentRow
          title="Trending Now 🔥"
          series={series}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
          badge={getBadge}
        />

        {/* My List */}
        {user && myList.length > 0 && (
          <ContentRow
            title="My List"
            series={series.filter(s => myList.includes(s.id))}
            onCardClick={(id) => navigate(`/series/${id}`)}
            myList={myList}
            onAddToList={handleAddToList}
            onRemoveFromList={handleRemoveFromList}
          />
        )}

        {/* Romance */}
        <ContentRow
          title="Romance 💕"
          series={series.filter(s => s.genre === "Romance")}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
          badge={(s, i) => i === 0 ? "hot" : null}
        />

        {/* Thriller */}
        <ContentRow
          title="Thriller 🔪"
          series={series.filter(s => s.genre === "Thriller")}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
        />

        {/* Drama */}
        <ContentRow
          title="Drama 🎭"
          series={series.filter(s => s.genre === "Drama")}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
        />

        {/* Action */}
        <ContentRow
          title="Action 💥"
          series={series.filter(s => s.genre === "Action")}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
        />

        {/* Top 10 */}
        <ContentRow
          title="Top 10 This Week"
          series={series.slice(0, 10)}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
          badge={(s, i) => `#${i + 1}`}
        />

        {/* Coming Soon */}
        {comingSoon.length > 0 && (
          <ContentRow
            title="Coming Soon 🔜"
            series={comingSoon}
            onCardClick={(id) => navigate(`/series/${id}`)}
            myList={myList}
            onAddToList={handleAddToList}
            onRemoveFromList={handleRemoveFromList}
          />
        )}

        {/* New Releases */}
        <ContentRow
          title="New Releases ✨"
          series={series.slice(-10)}
          onCardClick={(id) => navigate(`/series/${id}`)}
          myList={myList}
          onAddToList={handleAddToList}
          onRemoveFromList={handleRemoveFromList}
          badge="new"
        />
      </div>

      {/* Footer - Desktop only */}
      {isDesktop && (
        <footer className="mt-16 py-12 px-12 border-t border-white/10">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-4 gap-8 mb-8">
              <div>
                <KonaLogo2Full height={32} />
                <p className="text-gray-400 text-sm mt-4">
                  Your corner for the best mini-series. Watch anywhere, anytime.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Browse</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><button onClick={() => navigate("/category/trending")} className="hover:text-white">Trending</button></li>
                  <li><button onClick={() => navigate("/category/romance")} className="hover:text-white">Romance</button></li>
                  <li><button onClick={() => navigate("/category/thriller")} className="hover:text-white">Thriller</button></li>
                  <li><button onClick={() => navigate("/category/drama")} className="hover:text-white">Drama</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Account</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><button onClick={() => navigate("/store")} className="hover:text-white">Get Coins</button></li>
                  <li><button onClick={() => navigate("/subscriptions")} className="hover:text-white">VIP Plans</button></li>
                  <li><button onClick={() => navigate("/profile")} className="hover:text-white">Profile</button></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Creators</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li><button onClick={() => navigate("/creator")} className="hover:text-white">Creator Portal</button></li>
                  <li><button onClick={() => navigate("/creator/login")} className="hover:text-white">Creator Login</button></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 pt-8 flex items-center justify-between text-sm text-gray-500">
              <p>© 2026 Kona. All rights reserved.</p>
              <div className="flex gap-6">
                <button className="hover:text-white">Terms of Service</button>
                <button className="hover:text-white">Privacy Policy</button>
                <button className="hover:text-white">Contact Us</button>
              </div>
            </div>
          </div>
        </footer>
      )}

      {/* Modals */}
      <DailyRewardModal 
        open={showReward} 
        onClose={() => setShowReward(false)}
        onClaim={handleClaimReward}
      />
      
      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </div>
  );
};

export default HomePageResponsive;
