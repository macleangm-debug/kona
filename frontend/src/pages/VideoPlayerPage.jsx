import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import axios from "axios";
import Hls from "hls.js";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, ChevronDown, Play, Pause, Lock, Heart, Crown, Coins, PictureInPicture2, Wifi, WifiOff, Settings2, Zap, Check, X, SkipForward, Volume2, VolumeX, Maximize2, Minimize2, Subtitles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { KonaLoader } from "@/components/SplashScreen";
import { toast } from "sonner";
import { initContentProtection, removeContentProtection } from "@/services/contentProtection";

// ============ SUBTITLE LANGUAGES ============
const SUBTITLE_LANGUAGES = [
  { code: "off", label: "Off", flag: "🚫" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "sw", label: "Kiswahili", flag: "🇰🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" }
];

// ============ AD CONFIGURATION ============
const AD_CONFIG = {
  // Ad placement by user tier (determines if ads show)
  adsByTier: {
    free: { preRoll: true, midRoll: true, postRoll: true, overlay: true },
    basic: { preRoll: true, midRoll: false, postRoll: false, overlay: false },
    premium: { preRoll: false, midRoll: false, postRoll: false, overlay: false },
    vip: { preRoll: false, midRoll: false, postRoll: false, overlay: false }
  },
  // Mid-roll ad intervals (percentage of video) - controlled by platform rules
  midRollPoints: [50], // Default: 50% - platform can override
  overlayDuration: 8, // seconds
  defaultIntroDuration: 30, // seconds
  defaultSkipAfter: 3, // seconds before skip is available
};

// ============ FETCH ADS FROM SERVER ============
const fetchAdsFromServer = async (episodeId, placement, videoDuration, isFreeContent, userId) => {
  try {
    const params = new URLSearchParams({
      episode_id: episodeId,
      placement: placement,
      is_free_content: isFreeContent.toString()
    });
    if (videoDuration) params.append('video_duration', Math.round(videoDuration).toString());
    if (userId) params.append('user_id', userId);
    
    const response = await axios.get(`${API}/ads/serve?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch ads:', error);
    return { ads: [], reason: 'Failed to fetch ads' };
  }
};

// Track ad events (impressions, views, clicks)
const trackAdEvent = async (adId, eventType, campaignId = null, userId = null, episodeId = null) => {
  try {
    const params = new URLSearchParams({
      ad_id: adId,
      event_type: eventType
    });
    if (campaignId) params.append('campaign_id', campaignId);
    if (userId) params.append('user_id', userId);
    if (episodeId) params.append('episode_id', episodeId);
    
    await axios.post(`${API}/ads/track?${params.toString()}`);
  } catch (error) {
    console.error('Failed to track ad event:', error);
  }
};

// ============ AD COMPONENT ============
const AdPlayer = ({ ad, onAdComplete, onSkip, canSkip, skipCountdown, episodeId, userId }) => {
  const adVideoRef = useRef(null);
  const [adProgress, setAdProgress] = useState(0);
  const [adError, setAdError] = useState(false);
  const [impressionTracked, setImpressionTracked] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const errorHandled = useRef(false);
  
  // Track impression when ad loads
  useEffect(() => {
    if (ad && !impressionTracked) {
      trackAdEvent(ad.id, 'impression', ad.campaign_id, userId, episodeId);
      setImpressionTracked(true);
    }
  }, [ad, impressionTracked, userId, episodeId]);
  
  // Track view when ad completes (or reaches 75%)
  useEffect(() => {
    if (adProgress >= 75 && !viewTracked && ad) {
      trackAdEvent(ad.id, 'view', ad.campaign_id, userId, episodeId);
      setViewTracked(true);
    }
  }, [adProgress, viewTracked, ad, userId, episodeId]);
  
  // Auto-complete if ad fails to load or doesn't play
  useEffect(() => {
    const timer = setTimeout(() => {
      if (adProgress === 0 && !errorHandled.current) {
        // Ad didn't start playing, auto-skip
        errorHandled.current = true;
        onAdComplete();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [adProgress, onAdComplete]);
  
  // Handle ad error
  useEffect(() => {
    if (adError && !errorHandled.current) {
      errorHandled.current = true;
      onAdComplete();
    }
  }, [adError, onAdComplete]);
  
  if (adError) {
    return null;
  }
  
  const handleAdClick = () => {
    // Track click and open advertiser URL
    if (ad.click_url) {
      trackAdEvent(ad.id, 'click', ad.campaign_id, userId, episodeId);
      window.open(ad.click_url, '_blank');
    }
  };
  
  return (
    <div className="absolute inset-0 bg-black z-50" data-testid="ad-player">
      <video
        ref={adVideoRef}
        src={ad.media_url || ad.url}
        autoPlay
        playsInline
        muted
        onTimeUpdate={(e) => setAdProgress((e.target.currentTime / (ad.duration || 15)) * 100)}
        onEnded={onAdComplete}
        onError={() => setAdError(true)}
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleAdClick}
      />
      
      {/* Ad badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">AD</span>
        <span className="text-white/70 text-xs">{ad.campaign_name || ad.advertiser || 'Sponsor'}</span>
      </div>
      
      {/* Call to action button */}
      {ad.click_url && (
        <button
          onClick={handleAdClick}
          className="absolute bottom-24 left-4 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          data-testid="ad-cta-btn"
        >
          {ad.call_to_action || 'Learn More'}
        </button>
      )}
      
      {/* Skip button */}
      <div className="absolute bottom-20 right-4">
        {canSkip ? (
          <button
            onClick={onSkip}
            className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
            data-testid="skip-ad-btn"
          >
            Skip Ad <SkipForward className="w-4 h-4" />
          </button>
        ) : (
          <div className="bg-black/50 backdrop-blur-sm text-white/70 px-4 py-2 rounded-lg text-sm">
            Skip in {skipCountdown}s
          </div>
        )}
      </div>
      
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div 
          className="h-full bg-yellow-500 transition-all duration-300"
          style={{ width: `${adProgress}%` }}
        />
      </div>
    </div>
  );
};

// ============ OVERLAY AD COMPONENT ============
const OverlayAd = ({ onClose, advertiser = "Sponsor" }) => (
  <div className="absolute bottom-24 left-4 right-4 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-lg p-3 border border-white/10 animate-in slide-in-from-bottom duration-300" data-testid="overlay-ad">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">AD</span>
        </div>
        <div>
          <p className="text-white text-sm font-medium">{advertiser}</p>
          <p className="text-white/50 text-xs">Sponsored</p>
        </div>
      </div>
      <button 
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded-full transition-colors"
      >
        <X className="w-4 h-4 text-white/50" />
      </button>
    </div>
  </div>
);

// ============ SKIP INTRO BUTTON ============
const SkipIntroButton = ({ onClick, visible }) => {
  if (!visible) return null;
  
  return (
    <button
      onClick={onClick}
      className="absolute bottom-32 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105 border border-white/20 animate-in fade-in slide-in-from-right duration-300"
      data-testid="skip-intro-btn"
    >
      Skip Intro <SkipForward className="w-4 h-4" />
    </button>
  );
};

// ============ MINI PLAYER COMPONENT ============
const MiniPlayer = ({ episode, series, currentTime, duration, isPlaying, onExpand, onClose, onPlayPause, videoRef }) => {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  return createPortal(
    <div 
      className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-80 bg-gray-900/95 backdrop-blur-lg rounded-xl overflow-hidden shadow-2xl border border-white/10 z-50 animate-in slide-in-from-bottom duration-300"
      data-testid="mini-player"
    >
      <div className="flex">
        {/* Video thumbnail/preview */}
        <div className="relative w-32 h-20 flex-shrink-0 bg-black" onClick={onExpand}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white" />
            )}
          </div>
        </div>
        
        {/* Info */}
        <div className="flex-1 p-2 min-w-0">
          <p className="text-white text-sm font-medium truncate">{series?.title}</p>
          <p className="text-white/50 text-xs truncate">E{episode?.episode_number}: {episode?.title}</p>
          
          {/* Controls */}
          <div className="flex items-center gap-2 mt-1">
            <button onClick={onPlayPause} className="p-1 hover:bg-white/10 rounded">
              {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
            </button>
            <button onClick={onExpand} className="p-1 hover:bg-white/10 rounded">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded ml-auto">
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-0.5 bg-white/10">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>,
    document.body
  );
};

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
  const [signUpPromptType, setSignUpPromptType] = useState("");
  const lastSavedProgress = useRef(0);
  const hasShownMidwayPrompt = useRef(false);
  
  // CDN Optimization states
  const [streamingConfig, setStreamingConfig] = useState(null);
  const [autoQuality, setAutoQuality] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [networkStatus, setNetworkStatus] = useState("good");
  const [bufferingCount, setBufferingCount] = useState(0);
  const videoRef = useRef(null);
  
  // Track when video element is mounted (to fix race condition in HLS init)
  const [videoMounted, setVideoMounted] = useState(false);
  
  // Mini-player states
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [swipeDistance, setSwipeDistance] = useState(0);
  const miniVideoRef = useRef(null);
  
  // Skip Intro states
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [introDuration, setIntroDuration] = useState(AD_CONFIG.defaultIntroDuration);
  const [introSkipped, setIntroSkipped] = useState(false);
  
  // Ad states
  const [userTier, setUserTier] = useState("free");
  const [isPlayingAd, setIsPlayingAd] = useState(false);
  const [currentAd, setCurrentAd] = useState(null);
  const [adType, setAdType] = useState(null); // "preRoll", "midRoll", "postRoll"
  const [canSkipAd, setCanSkipAd] = useState(false);
  const [skipCountdown, setSkipCountdown] = useState(5);
  const [showOverlayAd, setShowOverlayAd] = useState(false);
  const [shownMidRollPoints, setShownMidRollPoints] = useState([]);
  const [preRollComplete, setPreRollComplete] = useState(false);
  const adTimerRef = useRef(null);
  
  // Like states
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Video error state
  const [videoError, setVideoError] = useState(null);
  
  // HLS fallback state - switch to MP4 or embed player when HLS fails
  const [useEmbedFallback, setUseEmbedFallback] = useState(false);
  const [useMp4Fallback, setUseMp4Fallback] = useState(false);
  
  // Embed player error state (for 403/configuration issues)
  const [embedError, setEmbedError] = useState(false);
  
  // Subtitle states
  const [subtitles, setSubtitles] = useState({}); // { en: "url", sw: "url", fr: "url" }
  const [activeSubtitle, setActiveSubtitle] = useState("off");
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);

  // Adaptive Video Player states
  const [videoAspectRatio, setVideoAspectRatio] = useState(null); // e.g., 16/9, 9/16, 1
  const [isVerticalVideo, setIsVerticalVideo] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [screenOrientation, setScreenOrientation] = useState('portrait');

  // Volume state (starts muted to allow autoplay)
  const [isMuted, setIsMuted] = useState(true);
  
  // HLS instance ref
  const hlsRef = useRef(null);

  // Gesture Control states
  const [lastTapTime, setLastTapTime] = useState(0);
  const [doubleTapSide, setDoubleTapSide] = useState(null); // 'left' | 'right' | 'center'
  const [showDoubleTapFeedback, setShowDoubleTapFeedback] = useState(false);
  const [horizontalSwipeStart, setHorizontalSwipeStart] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null); // 'left' | 'right'
  const [showSwipeFeedback, setShowSwipeFeedback] = useState(false);
  const DOUBLE_TAP_DELAY = 300; // ms
  const SWIPE_THRESHOLD = 80; // px

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ============ DETERMINE USER TIER FOR ADS ============
  useEffect(() => {
    if (user) {
      const subscription = user.subscription;
      if (subscription?.active) {
        setUserTier(subscription.plan || "basic");
      } else if (user.has_made_purchase) {
        setUserTier("basic");
      } else {
        setUserTier("free");
      }
    } else {
      setUserTier("free");
    }
  }, [user]);

  // ============ CONTENT PROTECTION ============
  useEffect(() => {
    const videoContainer = document.getElementById('video-player-container');
    const video = videoRef.current;
    
    if (videoContainer && video && episode) {
      const protection = initContentProtection(videoContainer, video, user, {
        enableWatermark: true,
        enableBlurOnHidden: true,
        enableContextMenuBlock: true,
        onViolation: (type) => {
          console.log('Content protection violation:', type);
          // Optionally log to analytics or show warning
          if (type === 'printscreen' || type === 'screenshot_shortcut') {
            toast.error('Screenshots are not allowed');
          }
        }
      });
      
      return () => {
        removeContentProtection(video);
      };
    }
  }, [episode, user]);

  // ============ HLS VIDEO INITIALIZATION ============
  useEffect(() => {
    const video = videoRef.current;
    const videoUrl = episode?.video_url;
    const mp4Url = episode?.mp4_url;
    const embedUrl = episode?.embed_url;
    
    // If using embed fallback, skip video initialization
    if (useEmbedFallback) return;
    
    // Wait for video element to be mounted
    if (!video || !videoMounted) return;
    
    // If using MP4 fallback, set the video source directly
    if (useMp4Fallback && mp4Url) {
      console.log("Setting MP4 source:", mp4Url);
      // Clear any previous errors
      setVideoError(null);
      video.src = mp4Url;
      video.load();
      // Try to play
      video.play().catch(err => {
        console.log("MP4 autoplay blocked:", err.message);
      });
      return;
    }
    
    // Need video_url for HLS
    if (!videoUrl) return;
    
    // Reset error state on new video
    setVideoError(null);
    
    // Check if URL is an HLS playlist
    const isHlsUrl = videoUrl.includes('.m3u8') || videoUrl.includes('playlist');
    
    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Track recovery attempts to avoid infinite loops
    let mediaRecoveryAttempts = 0;
    const MAX_RECOVERY_ATTEMPTS = 1;
    
    // Helper function to fallback to MP4 or embed
    const handleFallback = (errorType) => {
      console.warn(`HLS ${errorType}, attempting fallback...`);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      
      // First try MP4 fallback (most compatible)
      if (mp4Url) {
        console.log("Falling back to MP4:", mp4Url);
        setUseMp4Fallback(true);
      } else if (embedUrl) {
        // If no MP4, try embed player
        console.log("Falling back to embed player");
        setUseEmbedFallback(true);
      } else {
        setVideoError("Video format not supported. Please try a different browser.");
      }
    };
    
    if (isHlsUrl && Hls.isSupported()) {
      // Use HLS.js for browsers that don't support HLS natively
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;
      
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Video is ready to play
        setVideoError(null);
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn("HLS error event:", data.type, data.details, "fatal:", data.fatal);
        
        // Check for codec-related errors that can't be recovered
        const unrecoverableErrors = [
          'manifestIncompatibleCodecsError',
          'bufferIncompatibleCodecsError',
          'manifestParsingError',
          'levelLoadError'
        ];
        
        if (unrecoverableErrors.includes(data.details)) {
          handleFallback(data.details);
          return;
        }
        
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover from network error
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Try to recover from media error (limited attempts)
              if (mediaRecoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
                mediaRecoveryAttempts++;
                console.log("Attempting HLS media recovery, attempt:", mediaRecoveryAttempts);
                hls.recoverMediaError();
              } else {
                handleFallback("media recovery failed");
              }
              break;
            default:
              handleFallback(data.details);
              break;
          }
        }
      });
    } else if (isHlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = videoUrl;
      video.addEventListener('error', () => {
        if (mp4Url) {
          setUseMp4Fallback(true);
        } else if (embedUrl) {
          setUseEmbedFallback(true);
        } else {
          setVideoError("Failed to load video.");
        }
      });
    } else {
      // Direct video URL (MP4, etc.)
      video.src = videoUrl;
    }
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [episode?.video_url, episode?.mp4_url, episode?.embed_url, useEmbedFallback, useMp4Fallback, videoMounted]);

  // ============ PRE-ROLL AD LOGIC ============
  useEffect(() => {
    // Show pre-roll ad when video loads (if applicable)
    const fetchAndShowPreRoll = async () => {
      if (episode && !preRollComplete && !loading) {
        const adConfig = AD_CONFIG.adsByTier[userTier];
        if (adConfig?.preRoll && episode.is_free) {
          // Fetch real ads from server
          const adResponse = await fetchAdsFromServer(
            episode.id,
            'pre_roll',
            null, // duration not known yet
            true, // is_free_content
            user?.id
          );
          
          if (adResponse.ads && adResponse.ads.length > 0) {
            const serverAd = adResponse.ads[0];
            setCurrentAd({
              id: serverAd.id,
              campaign_id: serverAd.campaign_id,
              url: serverAd.media_url,
              media_url: serverAd.media_url,
              duration: serverAd.duration || 10,
              advertiser: serverAd.campaign_name || 'Sponsor',
              campaign_name: serverAd.campaign_name,
              skipAfter: serverAd.skip_after || AD_CONFIG.defaultSkipAfter,
              click_url: serverAd.click_url,
              call_to_action: serverAd.call_to_action
            });
            setAdType("preRoll");
            setIsPlayingAd(true);
            setCanSkipAd(false);
            setSkipCountdown(serverAd.skip_after || AD_CONFIG.defaultSkipAfter);
            
            // Start countdown for skip button
            adTimerRef.current = setInterval(() => {
              setSkipCountdown(prev => {
                if (prev <= 1) {
                  setCanSkipAd(true);
                  clearInterval(adTimerRef.current);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
            
            // Fallback: Auto-skip ad after 20 seconds if video doesn't load
            setTimeout(() => {
              if (!preRollComplete) {
                handleAdComplete();
              }
            }, 20000);
          } else {
            // No ads available, skip to main content
            setPreRollComplete(true);
          }
        } else {
          setPreRollComplete(true);
        }
      }
    };
    
    fetchAndShowPreRoll();
    
    return () => {
      if (adTimerRef.current) clearInterval(adTimerRef.current);
    };
  }, [episode, loading, userTier, preRollComplete, user]);

  // ============ MID-ROLL AD LOGIC ============
  useEffect(() => {
    if (!duration || isPlayingAd || !preRollComplete || !episode?.is_free) return;
    
    const adConfig = AD_CONFIG.adsByTier[userTier];
    if (!adConfig?.midRoll) return;
    
    const progressPercent = (currentTime / duration) * 100;
    
    const showMidRollAd = async (point) => {
      if (progressPercent >= point && !shownMidRollPoints.includes(point)) {
        // Pause video and fetch mid-roll ad
        const video = videoRef.current;
        if (video) video.pause();
        
        // Fetch real ads from server
        const adResponse = await fetchAdsFromServer(
          episode.id,
          'mid_roll',
          duration,
          true,
          user?.id
        );
        
        if (adResponse.ads && adResponse.ads.length > 0) {
          const serverAd = adResponse.ads[0];
          setCurrentAd({
            id: serverAd.id,
            campaign_id: serverAd.campaign_id,
            url: serverAd.media_url,
            media_url: serverAd.media_url,
            duration: serverAd.duration || 10,
            advertiser: serverAd.campaign_name || 'Sponsor',
            campaign_name: serverAd.campaign_name,
            skipAfter: serverAd.skip_after || 5,
            click_url: serverAd.click_url,
            call_to_action: serverAd.call_to_action
          });
          setAdType("midRoll");
          setIsPlayingAd(true);
          setCanSkipAd(false);
          setSkipCountdown(serverAd.skip_after || 5);
          setShownMidRollPoints(prev => [...prev, point]);
          
          adTimerRef.current = setInterval(() => {
            setSkipCountdown(prev => {
              if (prev <= 1) {
                setCanSkipAd(true);
                clearInterval(adTimerRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // No ads available, continue video
          setShownMidRollPoints(prev => [...prev, point]);
          if (video) video.play();
        }
      }
    };
    
    for (const point of AD_CONFIG.midRollPoints) {
      showMidRollAd(point);
    }
  }, [currentTime, duration, userTier, isPlayingAd, preRollComplete, shownMidRollPoints, episode, user]);

  // ============ OVERLAY AD LOGIC ============
  useEffect(() => {
    if (!episode?.is_free) return;
    
    const adConfig = AD_CONFIG.adsByTier[userTier];
    if (!adConfig?.overlay || !preRollComplete || isPlayingAd) return;
    
    // Show overlay ad at random intervals (between 20-40 seconds after start)
    const showOverlayTimer = setTimeout(async () => {
      if (!isMiniPlayer) {
        // Fetch overlay ad from server
        const adResponse = await fetchAdsFromServer(
          episode.id,
          'overlay',
          duration,
          true,
          user?.id
        );
        
        if (adResponse.ads && adResponse.ads.length > 0) {
          setShowOverlayAd(true);
          // Track impression
          trackAdEvent(adResponse.ads[0].id, 'impression', adResponse.ads[0].campaign_id, user?.id, episode.id);
          // Auto-hide after duration
          setTimeout(() => setShowOverlayAd(false), AD_CONFIG.overlayDuration * 1000);
        }
      }
    }, (20 + Math.random() * 20) * 1000);
    
    return () => clearTimeout(showOverlayTimer);
  }, [preRollComplete, userTier, isPlayingAd, isMiniPlayer, episode, user, duration]);

  // ============ SKIP INTRO LOGIC ============
  useEffect(() => {
    if (introSkipped || isPlayingAd) return;
    
    // Get intro duration from episode or use default
    const episodeIntroDuration = episode?.intro_duration || AD_CONFIG.defaultIntroDuration;
    setIntroDuration(episodeIntroDuration);
    
    // Show skip intro button when in intro section (after 3 seconds)
    if (currentTime >= 3 && currentTime < episodeIntroDuration) {
      setShowSkipIntro(true);
    } else {
      setShowSkipIntro(false);
    }
  }, [currentTime, episode, introSkipped, isPlayingAd]);

  const handleSkipIntro = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = introDuration;
      setIntroSkipped(true);
      setShowSkipIntro(false);
    }
  };

  // ============ AD HANDLERS ============
  const handleAdComplete = () => {
    setIsPlayingAd(false);
    setCurrentAd(null);
    if (adTimerRef.current) clearInterval(adTimerRef.current);
    
    if (adType === "preRoll") {
      setPreRollComplete(true);
    }
    
    // Resume video after mid-roll
    if (adType === "midRoll") {
      const video = videoRef.current;
      if (video) video.play();
    }
    
    setAdType(null);
  };

  const handleSkipAd = () => {
    if (canSkipAd) {
      handleAdComplete();
    }
  };

  // ============ SWIPE DOWN / MINI-PLAYER LOGIC ============
  const handleTouchStart = (e) => {
    if (isMiniPlayer) return;
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (isMiniPlayer || touchStartY === 0) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartY;
    
    // Only track downward swipes
    if (distance > 0) {
      setSwipeDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    // If swiped down more than 100px, minimize to mini-player
    if (swipeDistance > 100) {
      setIsMiniPlayer(true);
      // Pause main video, sync to mini player
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
    }
    setTouchStartY(0);
    setSwipeDistance(0);
  };

  const handleExpandMiniPlayer = () => {
    setIsMiniPlayer(false);
  };

  const handleCloseMiniPlayer = () => {
    setIsMiniPlayer(false);
    navigate(-1); // Go back
  };

  const handleMiniPlayerPlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
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
      
      // Reset all fallback states when episode changes
      setUseEmbedFallback(false);
      setUseMp4Fallback(false);
      setVideoError(null);
      setVideoMounted(false); // Reset so HLS re-initializes for new video
      setEmbedError(false); // Reset embed error state
      
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const epRes = await axios.get(`${API}/episodes/${id}`, { headers });
        setEpisode(epRes.data);

        const seriesRes = await axios.get(`${API}/series/${epRes.data.series_id}`);
        setSeries(seriesRes.data);

        // Fetch all episodes for the series
        const allEpsRes = await axios.get(`${API}/series/${epRes.data.series_id}/episodes`);
        setAllEpisodes(allEpsRes.data);
        
        // Fetch like status
        try {
          const likeRes = await axios.get(`${API}/episodes/${id}/like-status`, { headers });
          setIsLiked(likeRes.data.liked);
          setLikesCount(likeRes.data.likes);
        } catch (e) {
          // Default to 0 likes if fetch fails
          setLikesCount(epRes.data.likes || 0);
        }
        
        // Load subtitles if available
        if (epRes.data.subtitles) {
          setSubtitles(epRes.data.subtitles);
          // Auto-enable subtitles if available (first available language)
          const availableLangs = Object.keys(epRes.data.subtitles);
          if (availableLangs.length > 0) {
            // Check user preference in localStorage
            const preferredLang = localStorage.getItem('kona_subtitle_lang') || availableLangs[0];
            if (epRes.data.subtitles[preferredLang]) {
              setActiveSubtitle(preferredLang);
            } else {
              setActiveSubtitle(availableLangs[0]);
            }
          }
        }
      } catch (e) {
        console.error("Error loading episode:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, token]);

  // Fetch streaming configuration for CDN optimization
  useEffect(() => {
    const fetchStreamingConfig = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API}/streaming/config`, { headers });
        setStreamingConfig(res.data);
        
        // Set quality from user preference or default
        if (res.data.current_quality) {
          setVideoQuality(res.data.current_quality);
        }
        setAutoQuality(res.data.auto_quality ?? true);
      } catch (e) {
        console.log("Using default streaming config");
      }
    };
    fetchStreamingConfig();
  }, [token]);

  // Network status monitoring for adaptive quality
  useEffect(() => {
    const checkNetwork = () => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          setNetworkStatus("slow");
          if (autoQuality && videoQuality !== "360p") {
            setVideoQuality("360p");
            toast.info("Switched to 360p for slow connection");
          }
        } else if (effectiveType === "3g") {
          setNetworkStatus("slow");
          if (autoQuality && videoQuality === "720p" || videoQuality === "1080p") {
            setVideoQuality("480p");
            toast.info("Switched to 480p for 3G connection");
          }
        } else {
          setNetworkStatus("good");
        }
      }
    };
    
    checkNetwork();
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener("change", checkNetwork);
      return () => connection.removeEventListener("change", checkNetwork);
    }
  }, [autoQuality, videoQuality]);

  // ============ ADAPTIVE VIDEO PLAYER - Aspect Ratio Detection ============
  const handleVideoMetadataLoaded = useCallback((e) => {
    const video = e.target;
    const { videoWidth, videoHeight } = video;
    
    if (videoWidth && videoHeight) {
      const aspectRatio = videoWidth / videoHeight;
      setVideoAspectRatio(aspectRatio);
      
      // Video is vertical if height > width (aspect ratio < 1)
      // Standard vertical: 9:16 = 0.5625
      // Square: 1:1 = 1.0
      // Standard horizontal: 16:9 = 1.78
      setIsVerticalVideo(aspectRatio < 1);
      
      console.log(`Video detected: ${videoWidth}x${videoHeight}, Aspect: ${aspectRatio.toFixed(2)}, Vertical: ${aspectRatio < 1}`);
    }
  }, []);

  // ============ SCREEN ORIENTATION DETECTION ============
  useEffect(() => {
    const updateOrientation = () => {
      if (window.screen?.orientation?.type) {
        const type = window.screen.orientation.type;
        setScreenOrientation(type.includes('portrait') ? 'portrait' : 'landscape');
      } else if (window.innerWidth > window.innerHeight) {
        setScreenOrientation('landscape');
      } else {
        setScreenOrientation('portrait');
      }
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    }

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      }
    };
  }, []);

  // ============ FULLSCREEN TOGGLE ============
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const playerContainer = document.getElementById('video-player-container');
        if (playerContainer?.requestFullscreen) {
          await playerContainer.requestFullscreen();
          setIsFullscreen(true);
          // Try to lock to landscape for horizontal videos
          if (!isVerticalVideo && window.screen?.orientation?.lock) {
            try {
              await window.screen.orientation.lock('landscape');
            } catch (e) {
              // Orientation lock not supported or failed
            }
          }
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
        // Unlock orientation
        if (window.screen?.orientation?.unlock) {
          window.screen.orientation.unlock();
        }
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, [isVerticalVideo]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Determine video display style based on aspect ratio and orientation
  const getVideoDisplayStyle = useCallback(() => {
    // Vertical video (9:16, etc.)
    if (isVerticalVideo) {
      if (screenOrientation === 'portrait') {
        // Vertical video on portrait phone = fill screen (object-cover)
        return 'object-cover';
      } else {
        // Vertical video on landscape = fit with black bars on sides
        return 'object-contain';
      }
    }
    
    // Horizontal video (16:9, etc.)
    if (screenOrientation === 'landscape' || isFullscreen) {
      // Horizontal video on landscape = fill screen
      return 'object-contain';
    } else {
      // Horizontal video on portrait phone = fit with bars on top/bottom
      return 'object-contain';
    }
  }, [isVerticalVideo, screenOrientation, isFullscreen]);

  // Handle buffering events for adaptive quality
  const handleWaiting = useCallback(() => {
    setBufferingCount(prev => {
      const newCount = prev + 1;
      // If buffering frequently and auto-quality enabled, lower quality
      if (newCount >= 3 && autoQuality) {
        const qualities = ["360p", "480p", "720p", "1080p"];
        const currentIdx = qualities.indexOf(videoQuality);
        if (currentIdx > 0) {
          const newQuality = qualities[currentIdx - 1];
          setVideoQuality(newQuality);
          toast.info(`Switched to ${newQuality} due to slow connection`);
          return 0; // Reset count
        }
      }
      return newCount;
    });
  }, [autoQuality, videoQuality]);

  // Save quality preference when changed
  const handleQualityChange = async (quality) => {
    setVideoQuality(quality);
    setShowQualityMenu(false);
    
    if (token) {
      try {
        await axios.post(`${API}/streaming/quality`, 
          { quality, auto_quality: autoQuality },
          { headers: { Authorization: `Bearer ${token}` }}
        );
      } catch (e) {
        // Silently fail - quality still changes locally
      }
    }
  };

  // Toggle data saver mode
  const toggleDataSaver = async () => {
    const newValue = !dataSaver;
    setDataSaver(newValue);
    
    if (newValue) {
      setVideoQuality("360p");
      setAutoQuality(false);
      toast.success("Data Saver ON - Playing at 360p");
    } else {
      setVideoQuality("480p");
      setAutoQuality(true);
      toast.info("Data Saver OFF");
    }
    
    if (token) {
      try {
        await axios.post(`${API}/streaming/data-saver?enabled=${newValue}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        // Silently fail - preference still changes locally
      }
    }
  };

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
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const progressBarRef = useRef(null);

  // Check PiP support on mount
  useEffect(() => {
    setIsPipSupported('pictureInPictureEnabled' in document && document.pictureInPictureEnabled);
  }, []);

  // Handle PiP toggle
  const togglePictureInPicture = async () => {
    const video = document.getElementById('main-video');
    if (!video) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPipActive(false);
      } else if (isPipSupported) {
        await video.requestPictureInPicture();
        setIsPipActive(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
      toast.error('Picture-in-Picture not available');
    }
  };

  // Listen for PiP events
  useEffect(() => {
    const video = document.getElementById('main-video');
    if (!video) return;

    const handleEnterPip = () => setIsPipActive(true);
    const handleLeavePip = () => setIsPipActive(false);

    video.addEventListener('enterpictureinpicture', handleEnterPip);
    video.addEventListener('leavepictureinpicture', handleLeavePip);

    return () => {
      video.removeEventListener('enterpictureinpicture', handleEnterPip);
      video.removeEventListener('leavepictureinpicture', handleLeavePip);
    };
  }, [episode]);

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

  // Toggle mute/unmute
  const toggleMute = () => {
    const video = document.getElementById('main-video');
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  // ============ GESTURE CONTROLS ============
  // Double-tap to like (center) or seek (left/right)
  const handleVideoTap = (e) => {
    const now = Date.now();
    const timeDiff = now - lastTapTime;
    
    // Get tap position
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = e.clientX || (e.touches && e.touches[0]?.clientX) || rect.width / 2;
    const relativeX = tapX - rect.left;
    const screenThird = rect.width / 3;
    
    let tapSide = 'center';
    if (relativeX < screenThird) tapSide = 'left';
    else if (relativeX > screenThird * 2) tapSide = 'right';
    
    if (timeDiff < DOUBLE_TAP_DELAY && timeDiff > 0) {
      // Double tap detected!
      setDoubleTapSide(tapSide);
      setShowDoubleTapFeedback(true);
      
      if (tapSide === 'center') {
        // Double-tap center = Like
        handleLikeToggle();
      } else if (tapSide === 'left') {
        // Double-tap left = Rewind 10 seconds
        const video = document.getElementById('main-video');
        if (video) {
          video.currentTime = Math.max(0, video.currentTime - 10);
          toast.info('⏪ -10s');
        }
      } else if (tapSide === 'right') {
        // Double-tap right = Forward 10 seconds
        const video = document.getElementById('main-video');
        if (video) {
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          toast.info('⏩ +10s');
        }
      }
      
      // Hide feedback after animation
      setTimeout(() => {
        setShowDoubleTapFeedback(false);
        setDoubleTapSide(null);
      }, 500);
      
      setLastTapTime(0); // Reset to prevent triple tap
    } else {
      // Single tap - toggle controls
      setLastTapTime(now);
      // Delay single tap action to wait for potential double tap
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_TAP_DELAY) {
          setShowControls(prev => !prev);
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Horizontal swipe to navigate episodes
  const handleHorizontalSwipeStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setHorizontalSwipeStart(clientX);
  };

  const handleHorizontalSwipeMove = (e) => {
    if (horizontalSwipeStart === null) return;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const diff = clientX - horizontalSwipeStart;
    
    if (Math.abs(diff) > SWIPE_THRESHOLD / 2) {
      setSwipeDirection(diff > 0 ? 'right' : 'left');
    }
  };

  const handleHorizontalSwipeEnd = () => {
    if (horizontalSwipeStart === null || !swipeDirection) {
      setHorizontalSwipeStart(null);
      setSwipeDirection(null);
      return;
    }
    
    // Navigate to previous/next episode
    if (swipeDirection === 'right' && currentEpisodeIndex > 0) {
      // Swipe right = Previous episode
      const prevEpisode = allEpisodes[currentEpisodeIndex - 1];
      if (prevEpisode) {
        setShowSwipeFeedback(true);
        setTimeout(() => {
          navigate(`/watch/${prevEpisode.id}`);
          setShowSwipeFeedback(false);
        }, 300);
      }
    } else if (swipeDirection === 'left' && nextEpisode) {
      // Swipe left = Next episode
      setShowSwipeFeedback(true);
      setTimeout(() => {
        navigate(`/watch/${nextEpisode.id}`);
        setShowSwipeFeedback(false);
      }, 300);
    }
    
    setHorizontalSwipeStart(null);
    setSwipeDirection(null);
  };

  const changeSpeed = () => {
    const speeds = [0.5, 1.0, 1.5, 2.0];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    const video = document.getElementById('main-video');
    if (video) video.playbackRate = nextSpeed;
  };
  
  // ============ LIKE/UNLIKE HANDLERS ============
  const handleLikeToggle = async () => {
    if (!token) {
      onAuthClick?.();
      return;
    }
    
    const wasLiked = isLiked;
    // Optimistic update
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);
    
    try {
      const endpoint = wasLiked ? '/episodes/unlike' : '/episodes/like';
      const res = await axios.post(`${API}${endpoint}`, 
        { episode_id: id },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setLikesCount(res.data.likes);
    } catch (e) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
      toast.error(e.response?.data?.detail || "Failed to update like");
    }
  };
  
  // Format like count for display
  const formatLikeCount = (count) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  if (loading || !episode) {
    return createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-black z-[9999]">
        <KonaLoader size={60} />
      </div>,
      document.body
    );
  }

  // Show mini-player if minimized
  if (isMiniPlayer) {
    return (
      <MiniPlayer
        episode={episode}
        series={series}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onExpand={handleExpandMiniPlayer}
        onClose={handleCloseMiniPlayer}
        onPlayPause={handleMiniPlayerPlayPause}
        videoRef={miniVideoRef}
      />
    );
  }

  // Show ad player if playing ad
  if (isPlayingAd && currentAd) {
    return createPortal(
      <AdPlayer
        ad={currentAd}
        onAdComplete={handleAdComplete}
        onSkip={handleSkipAd}
        canSkip={canSkipAd}
        skipCountdown={skipCountdown}
        episodeId={episode?.id}
        userId={user?.id}
      />,
      document.body
    );
  }

  const playerContent = (
    <div 
      id="video-player-container"
      className="fixed inset-0 bg-black z-[9999]" 
      data-testid="video-player-page"
      onTouchStart={(e) => {
        handleTouchStart(e); // Vertical swipe for mini-player
        handleHorizontalSwipeStart(e); // Horizontal swipe for episode navigation
      }}
      onTouchMove={(e) => {
        handleTouchMove(e);
        handleHorizontalSwipeMove(e);
      }}
      onTouchEnd={(e) => {
        handleTouchEnd(e);
        handleHorizontalSwipeEnd(e);
      }}
      onMouseDown={handleHorizontalSwipeStart}
      onMouseMove={handleHorizontalSwipeMove}
      onMouseUp={handleHorizontalSwipeEnd}
      style={{
        transform: swipeDistance > 0 ? `translateY(${Math.min(swipeDistance, 150)}px) scale(${1 - swipeDistance / 1000})` : 'none',
        opacity: swipeDistance > 0 ? 1 - swipeDistance / 300 : 1,
        transition: swipeDistance === 0 ? 'transform 0.3s, opacity 0.3s' : 'none'
      }}
    >
      {/* Video SEO Tags */}
      {episode && series && (
        <Helmet>
          <title>{`${episode.title || `Episode ${episode.episode_number}`} - ${series.title} | Stream Kona`}</title>
          <meta name="description" content={episode.description || `Watch ${series.title} Episode ${episode.episode_number} on Stream Kona`} />
          <link rel="canonical" href={`https://www.streamkona.com/watch/${id}`} />
          <meta property="og:type" content="video.episode" />
          <meta property="og:title" content={`${series.title} - Episode ${episode.episode_number}`} />
          <meta property="og:image" content={episode.thumbnail || series.thumbnail} />
          <meta property="og:video" content={episode.video_url} />
          <meta property="og:video:type" content="video/mp4" />
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "VideoObject",
              "name": `${series.title} - Episode ${episode.episode_number}`,
              "description": episode.description || `Watch ${series.title} on Stream Kona`,
              "thumbnailUrl": episode.thumbnail || series.thumbnail,
              "uploadDate": episode.created_at || new Date().toISOString(),
              "duration": episode.duration ? `PT${episode.duration}M` : "PT10M",
              "contentUrl": episode.video_url,
              "embedUrl": `https://www.streamkona.com/watch/${id}`,
              "interactionStatistic": {
                "@type": "InteractionCounter",
                "interactionType": { "@type": "WatchAction" },
                "userInteractionCount": episode.views || 0
              },
              "partOfSeries": {
                "@type": "TVSeries",
                "name": series.title
              }
            })}
          </script>
        </Helmet>
      )}

      {/* Swipe down indicator */}
      {swipeDistance > 50 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center animate-pulse">
          <ChevronDown className="w-6 h-6 text-white" />
          <span className="text-white/70 text-xs">Release to minimize</span>
        </div>
      )}

      {/* Double-tap feedback overlay */}
      {showDoubleTapFeedback && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          {doubleTapSide === 'center' && (
            <div className="animate-ping">
              <Heart className="w-20 h-20 text-red-500 fill-red-500" />
            </div>
          )}
          {doubleTapSide === 'left' && (
            <div className="absolute left-8 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2 animate-pulse">
              <ChevronLeft className="w-6 h-6 text-white" />
              <span className="text-white font-bold">10s</span>
            </div>
          )}
          {doubleTapSide === 'right' && (
            <div className="absolute right-8 flex items-center gap-2 bg-black/50 rounded-full px-4 py-2 animate-pulse">
              <span className="text-white font-bold">10s</span>
              <ChevronLeft className="w-6 h-6 text-white rotate-180" />
            </div>
          )}
        </div>
      )}

      {/* Horizontal swipe feedback */}
      {swipeDirection && (
        <div className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className={`flex items-center gap-2 bg-black/70 rounded-full px-6 py-3 ${
            swipeDirection === 'left' ? 'animate-slide-left' : 'animate-slide-right'
          }`}>
            {swipeDirection === 'right' ? (
              <>
                <ChevronLeft className="w-6 h-6 text-white" />
                <span className="text-white font-medium">Previous Episode</span>
              </>
            ) : (
              <>
                <span className="text-white font-medium">Next Episode</span>
                <ChevronLeft className="w-6 h-6 text-white rotate-180" />
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Adaptive Video Player - Automatically adjusts for vertical/horizontal content */}
      <div className="absolute inset-0 flex items-center justify-center bg-black">
        {/* Bunny.net Embed Player Fallback (when HLS fails due to codec issues) */}
        {useEmbedFallback && episode?.embed_url ? (
          <div className="w-full h-full relative" data-testid="embed-fallback-player">
            {/* Embed Error Message (403/configuration issues) */}
            {embedError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black z-10">
                <div className="text-center p-8 max-w-md">
                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Settings2 className="w-10 h-10 text-yellow-400" />
                  </div>
                  <h3 className="text-white text-xl font-semibold mb-3">Video Service Configuration Needed</h3>
                  <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                    The video streaming service needs to be configured for this domain. 
                    This is not a problem with your upload – the video file is fine.
                  </p>
                  <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-gray-300 text-xs font-medium mb-2">For Administrators:</p>
                    <p className="text-gray-400 text-xs">
                      Add this domain to the allowed referrers in your Bunny.net Stream Library settings.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setEmbedError(false);
                      setUseEmbedFallback(false);
                      setVideoMounted(false);
                    }}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : null}
            <iframe
              src={episode.embed_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              loading="lazy"
              title={episode.title || "Video Player"}
              style={{ border: 'none' }}
              onLoad={(e) => {
                // Check if iframe loaded with an error (403, etc.)
                // We use a timeout to detect if the player doesn't initialize
                setTimeout(() => {
                  try {
                    // If we can't access content due to cross-origin, check if player rendered
                    const iframe = e.target;
                    if (iframe && iframe.contentWindow) {
                      // Player loaded, but may show error page
                      // We can't directly check cross-origin content, so we set a flag
                      // that can be checked if user interaction fails
                    }
                  } catch (err) {
                    // Cross-origin error is expected, but if iframe is visible it might be showing error
                  }
                }, 3000);
              }}
              onError={() => {
                console.error("Embed player failed to load");
                setEmbedError(true);
              }}
            />
            {/* Fallback: Show config message after timeout if player appears broken */}
            {!embedError && (
              <div className="absolute bottom-4 right-4 z-20">
                <button
                  onClick={() => setEmbedError(true)}
                  className="bg-black/50 hover:bg-black/70 text-white/70 hover:text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
                  title="Report video issue"
                >
                  Video not loading?
                </button>
              </div>
            )}
          </div>
        ) : (
          <video
            id="main-video"
            ref={(el) => {
              videoRef.current = el;
              // Signal that video element is mounted (fixes race condition in HLS init)
              if (el && !videoMounted) {
                setVideoMounted(true);
              }
            }}
            autoPlay
            muted
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            onWaiting={handleWaiting}
            onClick={handleVideoTap}
            onLoadedMetadata={handleVideoMetadataLoaded}
            onLoadedData={() => {
              // Start playing when video is loaded (after pre-roll if any)
              if (preRollComplete && videoRef.current) {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
              setVideoError(null);
            }}
            onError={(e) => {
              console.error('Video load error:', e);
              // Fallback chain: HLS -> MP4 -> Embed
              // Only trigger fallback if MP4 hasn't been tried yet
              if (!useMp4Fallback && episode?.mp4_url) {
                console.warn("Video error, trying MP4 fallback");
                setUseMp4Fallback(true);
              } else if (!useEmbedFallback && episode?.embed_url) {
                console.warn("Video error, switching to embed fallback");
                setUseEmbedFallback(true);
              } else {
                setVideoError('Video unavailable - please try again later');
              }
            }}
            className={`w-full h-full transition-all duration-300 ${getVideoDisplayStyle()}`}
            style={{
              // For vertical videos in portrait mode, ensure full coverage
              maxHeight: isVerticalVideo && screenOrientation === 'portrait' ? '100%' : undefined,
              maxWidth: isVerticalVideo && screenOrientation === 'portrait' ? '100%' : undefined,
            }}
            data-testid="video-element"
          >
            {/* Subtitle tracks */}
            {subtitles.en && (
              <track 
                kind="subtitles" 
                src={subtitles.en} 
                srcLang="en" 
                label="English"
                default={activeSubtitle === "en"}
              />
            )}
          {subtitles.sw && (
            <track 
              kind="subtitles" 
              src={subtitles.sw} 
              srcLang="sw" 
              label="Kiswahili"
              default={activeSubtitle === "sw"}
            />
          )}
          {subtitles.fr && (
            <track 
              kind="subtitles" 
              src={subtitles.fr} 
              srcLang="fr" 
              label="Français"
              default={activeSubtitle === "fr"}
            />
          )}
          </video>
        )}
      </div>

      {/* Video Error Overlay */}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">Video Unavailable</h3>
            <p className="text-gray-400 text-sm mb-4">{videoError}</p>
            <button 
              onClick={() => {
                setVideoError(null);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Video format indicator - shows when controls are visible */}
      {showControls && videoAspectRatio && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="text-white/70 text-xs">
              {isVerticalVideo ? '📱 Vertical' : '📺 Horizontal'}
            </span>
            {!isVerticalVideo && screenOrientation === 'portrait' && (
              <span className="text-purple-400 text-xs animate-pulse">Rotate for fullscreen</span>
            )}
          </div>
        </div>
      )}
      
      {/* Skip Intro Button */}
      <SkipIntroButton visible={showSkipIntro && !isPlayingAd} onClick={handleSkipIntro} />
      
      {/* Overlay Ad */}
      {showOverlayAd && (
        <OverlayAd 
          advertiser={AD_CONFIG.mockAds[0].advertiser}
          onClose={() => setShowOverlayAd(false)}
        />
      )}
      
      {/* Ad-free badge for premium users */}
      {(userTier === "premium" || userTier === "vip") && showControls && (
        <div className="absolute top-16 right-4 z-30 flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-2 py-1 rounded-full border border-yellow-500/30">
          <Crown className="w-3 h-3 text-yellow-500" />
          <span className="text-yellow-500 text-[10px] font-medium">Ad-Free</span>
        </div>
      )}
      
      {/* Network/Quality indicator */}
      <div className={`absolute top-16 left-3 z-30 flex items-center gap-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {networkStatus === "slow" && (
          <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-full">
            <WifiOff className="w-3 h-3 text-yellow-500" />
            <span className="text-yellow-500 text-[10px]">Slow</span>
          </div>
        )}
        {autoQuality && (
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
            <Zap className="w-3 h-3 text-blue-400" />
            <span className="text-blue-400 text-[10px]">Auto</span>
          </div>
        )}
        {dataSaver && (
          <div className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-full">
            <Wifi className="w-3 h-3 text-green-500" />
            <span className="text-green-500 text-[10px]">Data Saver</span>
          </div>
        )}
      </div>

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
                  Sign up to continue watching. You&apos;ll get 50 FREE coins to unlock episodes!
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
        <div className="flex items-center gap-1">
          {/* Minimize to mini-player */}
          <button 
            onClick={() => setIsMiniPlayer(true)}
            className="p-2"
            data-testid="minimize-player-btn"
          >
            <Minimize2 className="w-5 h-5 text-white" />
          </button>
          <button className="p-2">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="2"/>
              <circle cx="12" cy="12" r="2"/>
              <circle cx="12" cy="19" r="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Center play/pause button - shows when paused or controls visible */}
      <div 
        className="absolute inset-0 flex items-center justify-center z-10"
        onClick={handleVideoTap}
      >
        {!isPlaying && (
          <button
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
            data-testid="center-play-btn"
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </button>
        )}
        {isPlaying && showControls && (
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
            className="w-16 h-16 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            data-testid="center-pause-btn"
          >
            <Pause className="w-8 h-8 text-white" fill="white" />
          </button>
        )}
      </div>

      {/* Right side action buttons - ALWAYS visible (like TikTok style) */}
      <div className="absolute right-3 bottom-36 flex flex-col items-center gap-5 z-50">
        {/* Fullscreen toggle - for horizontal videos */}
        {!isVerticalVideo && (
          <button 
            onClick={toggleFullscreen}
            className="flex flex-col items-center gap-1"
            data-testid="fullscreen-btn"
          >
            <div className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center ${isFullscreen ? 'bg-primary/50' : 'bg-black/30'}`}>
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-white" />
              ) : (
                <Maximize2 className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-white text-xs">{isFullscreen ? 'Exit' : 'Full'}</span>
          </button>
        )}

        {/* Likes */}
        <button 
          onClick={handleLikeToggle}
          className="flex flex-col items-center gap-1"
          data-testid="video-like-btn"
        >
          <div className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
            isLiked ? 'bg-red-500/30 scale-110' : 'bg-black/30'
          }`}>
            <Heart className={`w-5 h-5 transition-all duration-300 ${
              isLiked ? 'text-red-500 fill-red-500 scale-110' : 'text-white'
            }`} />
          </div>
          <span className="text-white text-xs">{formatLikeCount(likesCount)}</span>
        </button>

        {/* Picture-in-Picture */}
        {isPipSupported && (
          <button 
            onClick={togglePictureInPicture}
            className="flex flex-col items-center gap-1"
            data-testid="pip-btn"
          >
            <div className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center ${isPipActive ? 'bg-primary/50' : 'bg-black/30'}`}>
              <PictureInPicture2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xs">{isPipActive ? 'Exit PiP' : 'PiP'}</span>
          </button>
        )}

        {/* Subtitles */}
        <div className="relative">
          <button 
            onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
            className="flex flex-col items-center gap-1"
            data-testid="subtitle-btn"
          >
            <div className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center ${activeSubtitle !== 'off' ? 'bg-primary/50' : 'bg-black/30'}`}>
              <Subtitles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xs">
              {activeSubtitle === 'off' ? 'CC' : activeSubtitle.toUpperCase()}
            </span>
          </button>
          
          {/* Subtitle dropdown menu */}
          {showSubtitleMenu && (
            <div className="absolute bottom-full right-0 mb-2 bg-black/90 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden min-w-[140px]">
              {SUBTITLE_LANGUAGES.map((lang) => {
                const isAvailable = lang.code === 'off' || subtitles[lang.code];
                const isActive = activeSubtitle === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      if (isAvailable) {
                        setActiveSubtitle(lang.code);
                        localStorage.setItem('kona_subtitle_lang', lang.code);
                        // Update video tracks
                        const video = document.getElementById('main-video');
                        if (video) {
                          for (let i = 0; i < video.textTracks.length; i++) {
                            video.textTracks[i].mode = video.textTracks[i].language === lang.code ? 'showing' : 'hidden';
                          }
                          if (lang.code === 'off') {
                            for (let i = 0; i < video.textTracks.length; i++) {
                              video.textTracks[i].mode = 'hidden';
                            }
                          }
                        }
                        setShowSubtitleMenu(false);
                      }
                    }}
                    disabled={!isAvailable}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      isActive ? 'bg-primary/30 text-white' : 
                      isAvailable ? 'text-white hover:bg-white/10' : 
                      'text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span className="flex-1">{lang.label}</span>
                    {isActive && <Check className="w-4 h-4 text-primary" />}
                    {!isAvailable && lang.code !== 'off' && (
                      <span className="text-[10px] text-white/40">N/A</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
          {/* Data Saver Toggle */}
          <button 
            onClick={toggleDataSaver}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              dataSaver 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            data-testid="data-saver-toggle"
          >
            <Wifi className="w-3.5 h-3.5" />
            Data Saver
          </button>

          {/* Playback controls */}
          <div className="flex items-center gap-2">
            {/* Volume toggle */}
            <button 
              onClick={toggleMute}
              className="text-white bg-white/20 p-1.5 rounded"
              data-testid="volume-toggle"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
            <button 
              onClick={changeSpeed}
              className="text-white text-xs font-medium bg-white/20 px-2.5 py-1 rounded"
            >
              {playbackSpeed}X
            </button>
            
            {/* Settings button */}
            <button 
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="text-white bg-white/20 p-1.5 rounded"
              data-testid="settings-btn"
            >
              <Settings2 className="w-4 h-4" />
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className={`text-white text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1 ${
                  autoQuality ? 'bg-blue-500/30' : 'bg-white/20'
                }`}
                data-testid="quality-selector"
              >
                {autoQuality && <Zap className="w-3 h-3 text-blue-400" />}
                {videoQuality}
              </button>
              
              {/* Enhanced Quality menu with bandwidth info */}
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 backdrop-blur-lg rounded-xl overflow-hidden min-w-[180px] border border-white/10 shadow-xl">
                  {/* Auto Quality Toggle */}
                  <button
                    onClick={() => {
                      setAutoQuality(!autoQuality);
                      if (!autoQuality) {
                        toast.info("Auto quality enabled");
                      }
                    }}
                    className={`w-full px-3 py-2.5 text-left text-xs flex items-center justify-between hover:bg-white/10 border-b border-white/10 ${
                      autoQuality ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className={`w-3.5 h-3.5 ${autoQuality ? 'text-blue-400' : 'text-white/50'}`} />
                      <span className={autoQuality ? 'text-blue-400' : 'text-white'}>Auto</span>
                    </div>
                    {autoQuality && <Check className="w-3.5 h-3.5 text-blue-400" />}
                  </button>
                  
                  {/* Quality Options */}
                  {[
                    { value: "360p", label: "360p", bandwidth: "~0.2 GB/hr", desc: "Data saver", tier: "free" },
                    { value: "480p", label: "480p", bandwidth: "~0.4 GB/hr", desc: "Standard", tier: "free" },
                    { value: "720p", label: "HD 720p", bandwidth: "~0.9 GB/hr", desc: "Recommended", tier: "basic" },
                    { value: "1080p", label: "Full HD", bandwidth: "~1.8 GB/hr", desc: "Best quality", tier: "vip" }
                  ].map((quality) => {
                    // Check if user can access this quality
                    const allowedQualities = streamingConfig?.allowed_qualities || ["360p", "480p"];
                    const isAllowed = allowedQualities.includes(quality.value);
                    const isVipOnly = quality.tier === "vip" && !isAllowed;
                    
                    return (
                      <button
                        key={quality.value}
                        onClick={() => {
                          if (isVipOnly) {
                            navigate("/subscriptions");
                            setShowQualityMenu(false);
                          } else if (isAllowed) {
                            handleQualityChange(quality.value);
                            setAutoQuality(false);
                          } else {
                            toast.error("Upgrade to access this quality");
                          }
                        }}
                        className={`w-full px-3 py-2.5 text-left text-xs hover:bg-white/10 ${
                          videoQuality === quality.value && !autoQuality ? 'bg-primary/10' : ''
                        } ${!isAllowed ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={videoQuality === quality.value && !autoQuality ? 'text-primary font-medium' : 'text-white'}>
                                {quality.label}
                              </span>
                              {isVipOnly && (
                                <span className="bg-yellow-500 text-black text-[8px] font-bold px-1 rounded">VIP</span>
                              )}
                            </div>
                            <span className="text-white/40 text-[10px]">{quality.bandwidth} · {quality.desc}</span>
                          </div>
                          {videoQuality === quality.value && !autoQuality && (
                            <Check className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Bandwidth tip */}
                  <div className="px-3 py-2 bg-white/5 border-t border-white/10">
                    <p className="text-[10px] text-white/40">
                      {networkStatus === "slow" 
                        ? "⚠️ Slow connection detected. Using lower quality."
                        : "💡 Lower quality = less data usage"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Settings Menu Overlay */}
        {showSettingsMenu && (
          <div 
            className="absolute inset-0 bg-black/80 z-40 flex items-end justify-center"
            onClick={() => setShowSettingsMenu(false)}
          >
            <div 
              className="bg-gray-900/95 backdrop-blur-lg rounded-t-2xl p-4 w-full max-w-md mb-0 border-t border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-white font-medium mb-4">Streaming Settings</h3>
              
              {/* Auto Quality */}
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-white text-sm">Auto Quality</p>
                  <p className="text-white/50 text-xs">Adjusts based on your connection</p>
                </div>
                <button 
                  onClick={() => setAutoQuality(!autoQuality)}
                  className={`w-12 h-6 rounded-full transition-colors ${autoQuality ? 'bg-primary' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${autoQuality ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {/* Data Saver */}
              <div className="flex items-center justify-between py-3 border-b border-white/10">
                <div>
                  <p className="text-white text-sm">Data Saver</p>
                  <p className="text-white/50 text-xs">Always play at lowest quality (360p)</p>
                </div>
                <button 
                  onClick={toggleDataSaver}
                  className={`w-12 h-6 rounded-full transition-colors ${dataSaver ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full transition-transform ${dataSaver ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              
              {/* Current Quality Info */}
              <div className="py-3">
                <p className="text-white/50 text-xs mb-2">Current Settings</p>
                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/70">Quality</span>
                    <span className="text-white">{videoQuality}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-white/70">Est. Data/hr</span>
                    <span className="text-white">
                      {videoQuality === "360p" ? "~0.2 GB" : 
                       videoQuality === "480p" ? "~0.4 GB" :
                       videoQuality === "720p" ? "~0.9 GB" : "~1.8 GB"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-white/70">Your Tier</span>
                    <span className="text-primary capitalize">{streamingConfig?.tier || "free"}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowSettingsMenu(false)}
                className="w-full mt-2 py-3 bg-primary rounded-lg text-white font-medium"
              >
                Done
              </button>
            </div>
          </div>
        )}
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
