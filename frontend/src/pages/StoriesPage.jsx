import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import { 
  X, Heart, Share2, MessageCircle, Play, Pause, Volume2, VolumeX, 
  ChevronUp, ChevronDown, ChevronRight, List, Bookmark, Send 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { KonaLoader } from "@/components/SplashScreen";

// Share Modal Component
const ShareModal = ({ open, onClose, episode, series, onShare }) => {
  if (!open) return null;
  
  const shareUrl = `${window.location.origin}/watch/${series?.id}-ep${episode?.episode_number}`;
  const shareText = `Watch "${series?.title}" on Kona! 🎬`;
  
  const handleShare = async (platform) => {
    onShare(platform);
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'copy_link':
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied!");
        break;
    }
    onClose();
  };
  
  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-gray-900 rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
        <h3 className="text-lg font-semibold mb-4 text-center">Share with Friends</h3>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <button 
            onClick={() => handleShare('whatsapp')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-gray-400">WhatsApp</span>
          </button>
          
          <button 
            onClick={() => handleShare('twitter')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-400 flex items-center justify-center">
              <span className="text-white font-bold">X</span>
            </div>
            <span className="text-xs text-gray-400">Twitter</span>
          </button>
          
          <button 
            onClick={() => handleShare('facebook')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">f</span>
            </div>
            <span className="text-xs text-gray-400">Facebook</span>
          </button>
          
          <button 
            onClick={() => handleShare('copy_link')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
              <Bookmark className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs text-gray-400">Copy Link</span>
          </button>
        </div>
        
        <button
          onClick={onClose}
          className="w-full py-3 bg-white/10 rounded-xl text-sm font-medium hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>,
    document.body
  );
};

// Story Card Component
const StoryCard = ({ 
  story, 
  isActive, 
  onLike, 
  onShare, 
  onViewSeries, 
  onViewEpisodes,
  isMuted,
  onToggleMute 
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const lastTapRef = useRef(0);
  const doubleTapTimeout = useRef(null);
  
  // Handle video playback based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      if (isActive) {
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      } else {
        video.pause();
        video.currentTime = 0;
        setIsPlaying(false);
        setProgress(0);
      }
    }
  }, [isActive]);
  
  // Handle double tap to like
  const handleTap = useCallback((e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap - like
      clearTimeout(doubleTapTimeout.current);
      if (!story.liked) {
        onLike();
        setShowDoubleTapHeart(true);
        setTimeout(() => setShowDoubleTapHeart(false), 1000);
      }
    } else {
      // Single tap - toggle play/pause
      doubleTapTimeout.current = setTimeout(() => {
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      }, DOUBLE_TAP_DELAY);
    }
    lastTapRef.current = now;
  }, [story.liked, onLike]);
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };
  
  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="relative w-full h-full bg-black" data-testid="story-card">
      {/* Video */}
      <video
        ref={videoRef}
        src={story.episode?.video_url}
        className="w-full h-full object-contain"
        loop
        playsInline
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        onClick={handleTap}
      />
      
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-white/20">
        <div 
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Double tap heart animation */}
      {showDoubleTapHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
        </div>
      )}
      
      {/* Play/Pause indicator */}
      {!isPlaying && isActive && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-10 h-10 text-white fill-white ml-1" />
          </div>
        </div>
      )}
      
      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* Like */}
        <button 
          onClick={onLike}
          className="flex flex-col items-center gap-1"
          data-testid="story-like-btn"
        >
          <div className={`w-12 h-12 rounded-full backdrop-blur-sm flex items-center justify-center transition-all ${
            story.liked ? 'bg-red-500/30 scale-110' : 'bg-black/30'
          }`}>
            <Heart className={`w-6 h-6 transition-all ${story.liked ? 'text-red-500 fill-red-500 scale-110' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(story.likes || 0)}</span>
        </button>
        
        {/* Share */}
        <button 
          onClick={onShare}
          className="flex flex-col items-center gap-1"
          data-testid="story-share-btn"
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">{formatCount(story.shares || 0)}</span>
        </button>
        
        {/* Episodes - Swipe right */}
        <button 
          onClick={onViewEpisodes}
          className="flex flex-col items-center gap-1"
          data-testid="story-episodes-btn"
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <List className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-medium">Episodes</span>
        </button>
        
        {/* Mute toggle */}
        <button 
          onClick={onToggleMute}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
          </div>
        </button>
      </div>
      
      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-20 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
        {/* Series info - clickable to view series */}
        <button 
          onClick={onViewSeries}
          className="flex items-center gap-3 mb-2 w-full text-left"
          data-testid="story-series-info-btn"
        >
          <img 
            src={story.series?.thumbnail} 
            alt={story.series?.title}
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
          <div className="flex-1">
            <h3 className="font-bold text-white">{story.series?.title}</h3>
            <p className="text-gray-300 text-sm">Episode 1 • Free</p>
          </div>
        </button>
        
        {/* Episode title */}
        <p className="text-white/80 text-sm line-clamp-2">
          {story.episode?.title || story.series?.description}
        </p>
      </div>
      
      {/* Swipe hint (shows briefly) */}
      <div className="absolute top-1/2 left-4 transform -translate-y-1/2 opacity-30 pointer-events-none">
        <div className="flex flex-col items-center gap-2 animate-pulse">
          <ChevronUp className="w-6 h-6 text-white" />
          <span className="text-white text-xs">Swipe</span>
          <ChevronDown className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

// Main Stories Page
export const StoriesPage = ({ onAuthClick }) => {
  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  // Fetch stories
  useEffect(() => {
    const fetchStories = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API}/stories/feed`, { headers });
        setStories(res.data);
      } catch (e) {
        console.error("Failed to fetch stories", e);
        toast.error("Failed to load stories");
      }
      setLoading(false);
    };
    fetchStories();
  }, [token]);
  
  // Handle swipe
  const handleTouchStart = (e) => {
    if (isTransitioning) return;
    setTouchStartY(e.touches[0].clientY);
  };
  
  const handleTouchMove = (e) => {
    if (isTransitioning) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStartY - currentY;
    setSwipeOffset(diff);
  };
  
  const handleTouchEnd = () => {
    if (isTransitioning) return;
    const threshold = 100;
    
    if (swipeOffset > threshold && currentIndex < stories.length - 1) {
      // Swipe up - next story
      setIsTransitioning(true);
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => setIsTransitioning(false), 300);
    } else if (swipeOffset < -threshold && currentIndex > 0) {
      // Swipe down - previous story
      setIsTransitioning(true);
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => setIsTransitioning(false), 300);
    }
    
    setSwipeOffset(0);
  };
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp' && currentIndex < stories.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowDown' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'Escape') {
        navigate(-1);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, stories.length, navigate]);
  
  // Like handler
  const handleLike = async (storyIndex) => {
    if (!token) {
      onAuthClick?.();
      return;
    }
    
    const story = stories[storyIndex];
    const isLiked = story.liked;
    
    // Optimistic update
    setStories(prev => prev.map((s, i) => 
      i === storyIndex 
        ? { ...s, liked: !isLiked, likes: isLiked ? s.likes - 1 : s.likes + 1 }
        : s
    ));
    
    try {
      const endpoint = isLiked ? '/episodes/unlike' : '/episodes/like';
      await axios.post(`${API}${endpoint}`, 
        { episode_id: story.episode.id },
        { headers: { Authorization: `Bearer ${token}` }}
      );
    } catch (e) {
      // Revert on error
      setStories(prev => prev.map((s, i) => 
        i === storyIndex 
          ? { ...s, liked: isLiked, likes: isLiked ? s.likes + 1 : s.likes - 1 }
          : s
      ));
      toast.error("Failed to update like");
    }
  };
  
  // Share handler
  const handleShare = async (platform) => {
    const story = stories[currentIndex];
    try {
      await axios.post(`${API}/episodes/share`, 
        { episode_id: story.episode.id, platform },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      // Update share count locally
      setStories(prev => prev.map((s, i) => 
        i === currentIndex ? { ...s, shares: (s.shares || 0) + 1 } : s
      ));
    } catch (e) {
      console.error("Share tracking failed", e);
    }
  };
  
  // View series handler
  const handleViewSeries = (seriesId) => {
    navigate(`/series/${seriesId}`);
  };
  
  // View episodes handler (swipe right equivalent)
  const handleViewEpisodes = (seriesId) => {
    navigate(`/series/${seriesId}?tab=episodes`);
  };
  
  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
        <KonaLoader size={60} />
      </div>,
      document.body
    );
  }
  
  if (stories.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black text-white">
        <p className="text-lg mb-4">No stories available</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-primary rounded-full"
        >
          Go Home
        </button>
      </div>,
      document.body
    );
  }
  
  const currentStory = stories[currentIndex];
  
  return createPortal(
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-black"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="stories-page"
    >
      {/* Close button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        data-testid="stories-close-btn"
      >
        <X className="w-5 h-5 text-white" />
      </button>
      
      {/* Story counter */}
      <div className="absolute top-4 right-4 z-50 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
        <span className="text-white text-sm font-medium">
          {currentIndex + 1} / {stories.length}
        </span>
      </div>
      
      {/* Stories container with swipe animation */}
      <div 
        className="w-full h-full transition-transform duration-300 ease-out"
        style={{ 
          transform: `translateY(${-swipeOffset * 0.3}px)` 
        }}
      >
        <StoryCard
          story={currentStory}
          isActive={true}
          onLike={() => handleLike(currentIndex)}
          onShare={() => setShowShareModal(true)}
          onViewSeries={() => handleViewSeries(currentStory.series?.id)}
          onViewEpisodes={() => handleViewEpisodes(currentStory.series?.id)}
          isMuted={isMuted}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      </div>
      
      {/* Navigation indicators */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-50">
        {stories.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-1.5 rounded-full transition-all ${
              idx === currentIndex 
                ? 'h-6 bg-white' 
                : 'h-1.5 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
      
      {/* Share Modal */}
      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        episode={currentStory?.episode}
        series={currentStory?.series}
        onShare={handleShare}
      />
    </div>,
    document.body
  );
};

export default StoriesPage;
