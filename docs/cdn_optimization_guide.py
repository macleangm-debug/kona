"""
Bunny.net CDN Optimization Configuration
Implement these settings to reduce bandwidth costs by 50-70%
"""

# ============ VIDEO ENCODING PRESETS ============
# Use these FFmpeg settings when uploading videos

VIDEO_PRESETS = {
    "mobile": {
        "resolution": "480p",
        "bitrate": "800k",
        "audio_bitrate": "96k",
        "codec": "h264",
        "preset": "medium",
        "crf": 28,  # Higher = smaller file, lower quality
        "command": "-vf scale=-2:480 -c:v libx264 -preset medium -crf 28 -c:a aac -b:a 96k"
    },
    "standard": {
        "resolution": "720p",
        "bitrate": "2000k",
        "audio_bitrate": "128k",
        "codec": "h264",
        "preset": "medium",
        "crf": 24,
        "command": "-vf scale=-2:720 -c:v libx264 -preset medium -crf 24 -c:a aac -b:a 128k"
    },
    "hd": {
        "resolution": "1080p",
        "bitrate": "4000k",
        "audio_bitrate": "192k",
        "codec": "h264",
        "preset": "slow",  # Better compression
        "crf": 22,
        "command": "-vf scale=-2:1080 -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 192k"
    }
}

# ============ BUNNY.NET STREAM SETTINGS ============
# Configure in Bunny.net Dashboard → Stream → Library Settings

BUNNY_STREAM_CONFIG = {
    # Enable these in Bunny dashboard
    "transcoding": {
        "enable_mp4_fallback": True,
        "enable_hls": True,  # Adaptive streaming
        "resolutions": ["480p", "720p", "1080p"],
        "default_resolution": "720p",
        "watermark": False,  # Disable if not needed (saves processing)
    },
    
    # Optimize for Africa/Tanzania
    "edge_rules": {
        "primary_regions": ["AF"],  # Africa edge nodes
        "fallback_regions": ["EU"],  # Europe as backup
    },
    
    # Token authentication (prevents hotlinking)
    "security": {
        "token_authentication": True,
        "token_expiry_seconds": 3600,  # 1 hour
        "allowed_referrers": ["kona.app", "*.kona.app"],
    }
}

# ============ BANDWIDTH SAVING STRATEGIES ============

OPTIMIZATION_STRATEGIES = {
    # 1. Lazy Loading - Don't preload videos
    "lazy_loading": {
        "preload": "none",  # Don't preload video
        "poster": True,     # Show thumbnail instead
        "load_on_play": True
    },
    
    # 2. Quality Tiers by User Type
    "quality_by_tier": {
        "free_user": "480p",      # Limit free users
        "basic_user": "720p",     # Standard quality
        "vip_user": "1080p",      # Premium quality
    },
    
    # 3. Episode Length Limits
    "episode_limits": {
        "free_preview_seconds": 60,   # 1 min free preview
        "max_episode_minutes": 15,    # Short episodes = less bandwidth
    },
    
    # 4. Caching Strategy
    "caching": {
        "browser_cache_days": 7,
        "cdn_cache_days": 30,
        "thumbnails_cache_days": 90,
    },
    
    # 5. Thumbnail Optimization
    "thumbnails": {
        "format": "webp",         # 30% smaller than JPEG
        "quality": 80,
        "max_width": 400,
        "lazy_load": True,
    }
}

# ============ ESTIMATED SAVINGS ============
"""
Original Cost (500K users): ~$146,000/month

After Optimizations:
├── Video compression (720p default): -40%
├── Adaptive bitrate: -20%
├── Quality tiers: -15%
├── Lazy loading: -10%
├── Better caching: -10%
└── Total Savings: ~60-70%

Optimized Cost: ~$45,000-60,000/month
"""

# ============ IMPLEMENTATION CHECKLIST ============
OPTIMIZATION_CHECKLIST = [
    "☐ Enable HLS adaptive streaming in Bunny.net",
    "☐ Set default resolution to 720p",
    "☐ Limit free users to 480p quality",
    "☐ Enable token authentication to prevent hotlinking",
    "☐ Set Africa as primary edge region",
    "☐ Convert thumbnails to WebP format",
    "☐ Implement lazy loading for video player",
    "☐ Add quality selector in video player UI",
    "☐ Cache static assets aggressively",
    "☐ Compress all videos before upload with recommended presets",
]
