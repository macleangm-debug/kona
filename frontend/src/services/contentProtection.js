/**
 * Content Protection Service
 * Protects video content from screenshots and screen recording
 * Works on both desktop and mobile devices
 */

// Check if we're on mobile
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Check if iOS
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

// Check if Android
export const isAndroid = () => {
  return /Android/i.test(navigator.userAgent);
};

/**
 * Disable right-click context menu on an element
 */
export const disableContextMenu = (element) => {
  if (!element) return;
  
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
};

/**
 * Disable text selection and dragging
 */
export const disableSelection = (element) => {
  if (!element) return;
  
  element.style.userSelect = 'none';
  element.style.webkitUserSelect = 'none';
  element.style.msUserSelect = 'none';
  element.style.MozUserSelect = 'none';
  
  element.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });
};

/**
 * Detect if screen is being recorded (limited support)
 * Works on some browsers with Screen Capture API
 */
export const detectScreenRecording = (onRecordingDetected) => {
  // Check for screen capture API
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    // Monitor for active screen captures
    const checkCapture = async () => {
      try {
        // This is a heuristic - if getDisplayMedia was recently called
        // The actual detection is limited by browser security
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Periodic check (limited effectiveness)
    setInterval(checkCapture, 5000);
  }
  
  // Detect visibility change (user switching apps/tabs)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      onRecordingDetected?.('tab_hidden');
    }
  });
  
  // Detect window blur (potential screen capture)
  window.addEventListener('blur', () => {
    onRecordingDetected?.('window_blur');
  });
};

/**
 * Create a watermark overlay for video
 */
export const createWatermark = (userId, username) => {
  const watermark = document.createElement('div');
  watermark.className = 'video-watermark';
  watermark.id = 'content-watermark';
  
  // Create multiple watermark instances for better coverage
  const watermarkText = username ? `${username.substring(0, 8)}...` : userId?.substring(0, 10);
  const timestamp = new Date().toISOString().split('T')[0];
  
  watermark.innerHTML = `
    <div class="watermark-grid">
      ${Array(6).fill(0).map(() => `
        <span class="watermark-item">${watermarkText} • ${timestamp}</span>
      `).join('')}
    </div>
  `;
  
  return watermark;
};

/**
 * Apply CSS-based screenshot protection
 * Note: This is not foolproof but adds a layer of difficulty
 */
export const applyScreenshotProtection = (videoElement) => {
  if (!videoElement) return;
  
  // Add protection styles
  const style = document.createElement('style');
  style.id = 'screenshot-protection-styles';
  style.textContent = `
    /* Watermark overlay styles */
    .video-watermark {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10;
      overflow: hidden;
    }
    
    .watermark-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-around;
      align-items: center;
      height: 100%;
      transform: rotate(-25deg) scale(1.5);
    }
    
    .watermark-item {
      color: rgba(255, 255, 255, 0.08);
      font-size: 14px;
      font-weight: 500;
      padding: 40px 60px;
      white-space: nowrap;
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* Blur effect when recording detected */
    .video-blur-protection {
      filter: blur(20px) !important;
      transition: filter 0.3s ease;
    }
    
    /* Prevent easy screenshots on some browsers */
    .protected-video {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    /* Mobile-specific protection */
    @media (max-width: 768px) {
      .watermark-item {
        font-size: 10px;
        padding: 30px 40px;
      }
    }
  `;
  
  // Only add if not already present
  if (!document.getElementById('screenshot-protection-styles')) {
    document.head.appendChild(style);
  }
  
  // Add protection class to video
  videoElement.classList.add('protected-video');
};

/**
 * Blur video content (used when recording is detected)
 */
export const blurVideo = (videoElement, blur = true) => {
  if (!videoElement) return;
  
  if (blur) {
    videoElement.classList.add('video-blur-protection');
  } else {
    videoElement.classList.remove('video-blur-protection');
  }
};

/**
 * Mobile-specific protections
 */
export const applyMobileProtection = (videoElement, onViolation) => {
  if (!isMobile()) return;
  
  // iOS: Detect when app goes to background
  if (isIOS()) {
    document.addEventListener('pagehide', () => {
      onViolation?.('ios_background');
    });
    
    // Detect screenshot on iOS (limited - only works in some cases)
    window.addEventListener('resize', () => {
      // iOS screenshot sometimes triggers a brief resize
      // This is a heuristic and not reliable
    });
  }
  
  // Android: Additional protections
  if (isAndroid()) {
    // Detect multi-window mode (split screen - potential recording)
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(display-mode: standalone)');
      mediaQuery.addEventListener('change', (e) => {
        if (!e.matches) {
          onViolation?.('android_multiwindow');
        }
      });
    }
  }
  
  // Prevent long-press context menu on mobile
  videoElement?.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault(); // Prevent multi-touch gestures
    }
  }, { passive: false });
  
  videoElement?.addEventListener('touchend', (e) => {
    // Prevent default touch behaviors
  }, { passive: true });
};

/**
 * Initialize all content protection for a video element
 */
export const initContentProtection = (videoContainer, videoElement, user, options = {}) => {
  const {
    enableWatermark = true,
    enableBlurOnHidden = true,
    enableContextMenuBlock = true,
    onViolation = null
  } = options;
  
  // 1. Disable right-click
  if (enableContextMenuBlock) {
    disableContextMenu(videoContainer);
    disableContextMenu(videoElement);
  }
  
  // 2. Disable selection
  disableSelection(videoContainer);
  
  // 3. Apply CSS protection
  applyScreenshotProtection(videoElement);
  
  // 4. Add watermark
  if (enableWatermark && user) {
    const existingWatermark = document.getElementById('content-watermark');
    if (existingWatermark) {
      existingWatermark.remove();
    }
    
    const watermark = createWatermark(user.id, user.name || user.email);
    videoContainer?.appendChild(watermark);
  }
  
  // 5. Blur on tab hidden
  if (enableBlurOnHidden) {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        blurVideo(videoElement, true);
        videoElement?.pause();
        onViolation?.('tab_hidden');
      } else {
        blurVideo(videoElement, false);
      }
    });
  }
  
  // 6. Apply mobile-specific protection
  applyMobileProtection(videoElement, onViolation);
  
  // 7. Detect screen recording attempts
  detectScreenRecording((type) => {
    onViolation?.(type);
  });
  
  // 8. Disable picture-in-picture if needed
  if (videoElement) {
    videoElement.disablePictureInPicture = true;
  }
  
  // 9. Keyboard shortcut blocking (PrintScreen, etc.)
  document.addEventListener('keydown', (e) => {
    // Block PrintScreen
    if (e.key === 'PrintScreen') {
      e.preventDefault();
      blurVideo(videoElement, true);
      setTimeout(() => blurVideo(videoElement, false), 1000);
      onViolation?.('printscreen');
    }
    
    // Block common screenshot shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4')) {
      e.preventDefault();
      onViolation?.('screenshot_shortcut');
    }
  });
  
  return {
    enableWatermark: () => {
      if (user) {
        const watermark = createWatermark(user.id, user.name || user.email);
        videoContainer?.appendChild(watermark);
      }
    },
    disableWatermark: () => {
      document.getElementById('content-watermark')?.remove();
    },
    blur: () => blurVideo(videoElement, true),
    unblur: () => blurVideo(videoElement, false)
  };
};

/**
 * Remove all content protection
 */
export const removeContentProtection = (videoElement) => {
  document.getElementById('content-watermark')?.remove();
  document.getElementById('screenshot-protection-styles')?.remove();
  
  if (videoElement) {
    videoElement.classList.remove('protected-video');
    videoElement.classList.remove('video-blur-protection');
    videoElement.disablePictureInPicture = false;
  }
};

export default {
  initContentProtection,
  removeContentProtection,
  blurVideo,
  createWatermark,
  isMobile,
  isIOS,
  isAndroid
};
