import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import { ChevronLeft, Play, Lock, Heart, Crown, Coins, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const VideoPlayerPage = ({ onAuthClick }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [series, setSeries] = useState(null);
  const [allEpisodes, setAllEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [videoQuality, setVideoQuality] = useState("480p");
  const [showControls, setShowControls] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSignUpPrompt, setShowSignUpPrompt] = useState(false);
  const [signUpPromptType, setSignUpPromptType] = useState(""); // "midway", "end", "next_episode"
  const lastSavedProgress = useRef(0);
  const hasShownMidwayPrompt = useRef(false);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Show sign-up prompt at 50% of video for guests
  useEffect(() => {
    if (!user && duration > 0 && currentTime > duration * 0.5 && !hasShownMidwayPrompt.current) {
      hasShownMidwayPrompt.current = true;
      setSignUpPromptType("midway");
      setShowSignUpPrompt(true);
      // Pause video when showing prompt
      const video = document.getElementById('main-video');
      if (video) video.pause();
      setIsPlaying(false);
    }
  }, [currentTime, duration, user]);

  // Get next episode
  const currentEpisodeIndex = allEpisodes.findIndex(ep => ep.id === episode?.id);
  const nextEpisode = currentEpisodeIndex >= 0 && currentEpisodeIndex < allEpisodes.length - 1 
    ? allEpisodes[currentEpisodeIndex + 1] 
    : null;

  // Show end prompt when video ends
  const handleVideoEnded = () => {
    if (nextEpisode) {
      setSignUpPromptType("next_episode_preview");
      setShowSignUpPrompt(true);
    }
  };

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    let timer;
    if (showControls) {
      timer = setTimeout(() => setShowControls(false), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showControls]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const epRes = await axios.get(`${API}/episodes/${id}`, { headers });
        setEpisode(epRes.data);

        const seriesRes = await axios.get(`${API}/series/${epRes.data.series_id}`);
        setSeries(seriesRes.data);

        // Fetch all episodes for the series
        const allEpsRes = await axios.get(`${API}/series/${epRes.data.series_id}/episodes`);
        setAllEpisodes(allEpsRes.data);
      } catch (e) {
        console.error("Error loading episode:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, token]);

  const handleTimeUpdate = (e) => {
    const video = e.target;
    setCurrentTime(video.currentTime);
    if (video.duration && !duration) {
      setDuration(video.duration);
    }
    
    // Save progress every 10%
    if (token && duration > 0) {
      const progress = Math.round((video.currentTime / duration) * 100);
      const progressBucket = Math.floor(progress / 10) * 10;
      if (progressBucket > 0 && progressBucket !== lastSavedProgress.current) {
        lastSavedProgress.current = progressBucket;
        axios.post(`${API}/episodes/progress`, { episode_id: id, progress: progressBucket }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }
    }
  };

  const [isSeeking, setIsSeeking] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const progressBarRef = useRef(null);

  const calculateSeekPosition = (clientX) => {
    if (!progressBarRef.current || duration <= 0) return null;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    return percentage * duration;
  };

  const handleSeekStart = (e) => {
    e.preventDefault();
    setIsSeeking(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = calculateSeekPosition(clientX);
    if (newTime !== null) {
      setCurrentTime(newTime);
    }
  };

  const handleSeekMove = (e) => {
    if (!isSeeking) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const newTime = calculateSeekPosition(clientX);
    if (newTime !== null) {
      setCurrentTime(newTime);
    }
  };

  const handleSeekEnd = () => {
    if (isSeeking) {
      const video = document.getElementById('main-video');
      if (video) {
        video.currentTime = currentTime;
      }
      setIsSeeking(false);
    }
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isSeeking) {
      const handleMove = (e) => handleSeekMove(e);
      const handleEnd = () => handleSeekEnd();
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isSeeking, currentTime]);

  const togglePlayPause = () => {
    setShowControls(true);
    const video = document.getElementById('main-video');
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleVideoTap = () => {
    setShowControls(!showControls);
  };

  const changeSpeed = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    const video = document.getElementById('main-video');
    if (video) video.playbackRate = nextSpeed;
  };

  if (loading || !episode) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-black z-[9999]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>,
      document.body
    );
  }

  const playerContent = (
    <div className="fixed inset-0 bg-black z-[9999]" data-testid="video-player-page">
      {/* Full-screen vertical video */}
      <video
        id="main-video"
        src={episode.video_url}
        autoPlay
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleVideoEnded}
        onClick={handleVideoTap}
        className="absolute inset-0 w-full h-full object-cover"
        data-testid="video-element"
      />

      {/* Sign Up Prompt Modal for Guests */}
      {showSignUpPrompt && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-gray-900 to-black rounded-2xl p-5 max-w-sm w-full border border-white/10">
            {signUpPromptType === "midway" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-primary" fill="currentColor" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Enjoying the show?</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Sign up for FREE to continue watching and unlock exclusive features!
                </p>
              </div>
            )}
            {signUpPromptType === "end" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Want to watch more?</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Create a FREE account to unlock Episode 2 and get 50 bonus coins!
                </p>
              </div>
            )}
            {signUpPromptType === "next_episode" && (
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Episode Locked</h3>
                <p className="text-gray-400 text-sm mb-6">
                  Sign up to continue watching. You'll get 50 FREE coins to unlock episodes!
                </p>
              </div>
            )}
            {signUpPromptType === "next_episode_preview" && nextEpisode && (
              <>
                <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Up Next</p>
                
                {/* Next Episode Preview Card */}
                <div className="flex gap-3 bg-white/5 rounded-xl p-3 mb-4">
                  <div className="relative w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={series?.thumbnail} 
                      alt={nextEpisode.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-black" />
                      </div>
                    </div>
                    <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white">
                      EP {nextEpisode.episode_number}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm line-clamp-1">{nextEpisode.title}</h4>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                      {series?.title}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Lock className="w-3 h-3 text-yellow-500" />
                      <span className="text-yellow-500 text-xs font-medium">
                        {user ? `${nextEpisode.coins_required} coins` : "Sign up to unlock"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-white mb-1">
                    {user ? "Unlock Next Episode" : "Sign up to continue"}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {user 
                      ? `Use ${nextEpisode.coins_required} coins to watch Episode ${nextEpisode.episode_number}`
                      : "Create a FREE account and get 50 bonus coins!"
                    }
                  </p>
                </div>
              </>
            )}
            
            <div className="space-y-3">
              {signUpPromptType === "next_episode_preview" && user ? (
                <>
                  <Button 
                    onClick={async () => {
                      // Try to unlock the episode
                      try {
                        await axios.post(`${API}/episodes/unlock`, 
                          { episode_id: nextEpisode.id },
                          { headers: { Authorization: `Bearer ${token}` }}
                        );
                        setShowSignUpPrompt(false);
                        navigate(`/watch/${nextEpisode.id}`);
                      } catch (e) {
                        toast.error(e.response?.data?.detail || "Failed to unlock");
                        if (e.response?.data?.detail?.includes("Insufficient")) {
                          navigate("/store");
                        }
                      }
                    }}
                    className="w-full bg-primary hover:bg-primary/90 rounded-full py-3 font-semibold"
                  >
                    <Coins className="w-4 h-4 mr-2" />
                    Unlock for {nextEpisode?.coins_required} Coins
                  </Button>
                  <button 
                    onClick={() => {
                      setShowSignUpPrompt(false);
                      navigate(`/series/${series?.id}`);
                    }}
                    className="w-full text-gray-400 text-sm py-2 hover:text-white transition-colors"
                  >
                    Back to Series
                  </button>
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => {
                      setShowSignUpPrompt(false);
                      navigate("/");
                      setTimeout(() => {
                        if (onAuthClick) onAuthClick();
                      }, 100);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 rounded-full py-3 font-semibold"
                    data-testid="signup-prompt-btn"
                  >
                    Sign Up FREE
                  </Button>
                  <button 
                    onClick={() => {
                      setShowSignUpPrompt(false);
                      if (signUpPromptType === "midway") {
                        const video = document.getElementById('main-video');
                        if (video) video.play();
                        setIsPlaying(true);
                      } else {
                        navigate(-1);
                      }
                    }}
                    className="w-full text-gray-400 text-sm py-2 hover:text-white transition-colors"
                  >
                    {signUpPromptType === "midway" ? "Continue Watching" : "Maybe Later"}
                  </button>
                </>
              )}
            </div>
            
            <p className="text-gray-500 text-xs mt-4">
              No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      )}

      {/* Top gradient overlay - only visible when controls shown */}
      <div className={`absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Bottom gradient overlay - only visible when controls shown */}
      <div className={`absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      {/* Header - only visible when controls shown */}
      <div className={`absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <button
          onClick={() => navigate(-1)}
          className="p-2"
          data-testid="player-back-btn"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1 text-center">
          <p className="text-white text-sm font-medium truncate px-4">
            {series?.title} <span className="text-white/70">EP.{episode.episode_number}</span>
          </p>
        </div>
        <button className="p-2">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2"/>
            <circle cx="12" cy="12" r="2"/>
            <circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>

      {/* Center play/pause button - shows when paused or controls visible */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-10"
        onClick={handleVideoTap}
      >
        {!isPlaying && (
          <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </div>
        )}
        {isPlaying && showControls && (
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
          >
            <svg className="w-8 h-8 text-white" fill="white" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          </button>
        )}
      </div>

      {/* Right side action buttons - only visible when showControls is true */}
      <div className={`absolute right-3 bottom-36 flex flex-col items-center gap-5 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Likes */}
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xs">5.5K</span>
        </button>

        {/* Episodes */}
        <button 
          onClick={() => setShowEpisodes(true)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </div>
          <span className="text-white text-xs">Episodes</span>
        </button>

        {/* Download/VIP */}
        <button 
          onClick={() => navigate("/subscriptions")}
          className="flex flex-col items-center gap-1 relative"
        >
          <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </div>
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">VIP</span>
          <span className="text-white text-xs">Download</span>
        </button>
      </div>

      {/* Bottom control bar - only visible when showControls is true */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Progress bar - draggable */}
        <div className="px-4 mb-2">
          <div 
            ref={progressBarRef}
            className="relative h-2 bg-white/30 rounded-full cursor-pointer touch-none"
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
          >
            <div 
              className="absolute left-0 top-0 h-full bg-primary rounded-full pointer-events-none"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg pointer-events-none"
              style={{ left: `calc(${duration > 0 ? (currentTime / duration) * 100 : 0}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white text-xs">{formatTime(currentTime)}</span>
            <span className="text-white text-xs">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
          {/* Upgrade to VIP */}
          <button 
            onClick={() => navigate("/subscriptions")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-3 py-1.5 rounded-full text-xs font-bold shadow-lg"
          >
            <Crown className="w-3.5 h-3.5" />
            Upgrade to VIP &gt;
          </button>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={changeSpeed}
              className="text-white text-xs font-medium bg-white/20 px-2.5 py-1 rounded"
            >
              {playbackSpeed}X
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="text-white text-xs font-medium bg-white/20 px-2.5 py-1 rounded"
              >
                {videoQuality}
              </button>
              {/* Quality menu */}
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg overflow-hidden min-w-[100px]">
                  {[
                    { value: "480p", label: "480p", vip: false },
                    { value: "720p", label: "720p", vip: false },
                    { value: "1080p", label: "1080p", vip: true }
                  ].map((quality) => (
                    <button
                      key={quality.value}
                      onClick={() => {
                        if (quality.vip) {
                          navigate("/subscriptions");
                        } else {
                          setVideoQuality(quality.value);
                        }
                        setShowQualityMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-white/10 ${
                        videoQuality === quality.value ? 'text-primary' : 'text-white'
                      }`}
                    >
                      <span>{quality.label}</span>
                      {quality.vip && (
                        <span className="bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">VIP</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episodes Sheet */}
      <Sheet open={showEpisodes} onOpenChange={setShowEpisodes}>
        <SheetContent side="bottom" className="h-[60vh] bg-background/95 backdrop-blur-lg rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Episodes</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 overflow-y-auto max-h-[calc(60vh-80px)]">
            {allEpisodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => {
                  // If guest and not Episode 1, show sign-up prompt
                  if (!user && ep.episode_number !== 1 && !ep.is_free) {
                    setShowEpisodes(false);
                    setSignUpPromptType("next_episode");
                    setShowSignUpPrompt(true);
                    return;
                  }
                  navigate(`/watch/${ep.id}`);
                  setShowEpisodes(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  ep.id === episode.id ? 'bg-primary/20 border border-primary' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                  {ep.episode_number}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{ep.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ep.coins_required === 0 ? (
                      <span className="text-green-400">FREE</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3 text-yellow-400" />
                        {ep.coins_required}
                      </span>
                    )}
                  </p>
                </div>
                {ep.id === episode.id && (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  return createPortal(playerContent, document.body);
};

export default VideoPlayerPage;
