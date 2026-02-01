"""
Bunny.net CDN Optimization Configuration
IMPLEMENTED - These optimizations reduce bandwidth costs by 50-70%
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
        "default_resolution": "480p",  # CHANGED: Africa market default
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

# ============ IMPLEMENTED FEATURES ============
# ✅ All features below are now live in the app

IMPLEMENTED_FEATURES = {
    # 1. Quality Tier System (API: /api/streaming/config)
    "quality_tiers": {
        "free": ["360p", "480p"],        # Limited to save bandwidth
        "basic": ["360p", "480p", "720p"],  # Paying users get HD
        "premium": ["360p", "480p", "720p", "1080p"],  # Full access
        "vip": ["360p", "480p", "720p", "1080p"]
    },
    
    # 2. Default Quality by Network (conservative for Africa)
    "default_quality_by_network": {
        "slow": "360p",
        "2g": "360p",
        "3g": "480p",
        "4g": "720p",
        "wifi": "720p",
        "unknown": "480p"  # Conservative default
    },
    
    # 3. Lazy Loading - Videos load on play
    "lazy_loading": {
        "preload": "none",
        "poster": True,
        "load_on_play": True
    },
    
    # 4. Data Saver Mode (API: POST /api/streaming/data-saver)
    "data_saver": {
        "quality": "360p",
        "auto_quality": False,
        "description": "Forces lowest quality to minimize data usage"
    },
    
    # 5. Auto-Quality (adaptive based on buffering)
    "auto_quality": {
        "buffer_threshold": 3,  # Seconds of rebuffering before quality drop
        "quality_switch_enabled": True,
        "network_monitoring": True
    },
    
    # 6. Bandwidth Estimation (API: GET /api/streaming/bandwidth-estimate)
    "bandwidth_display": {
        "360p": "~0.2 GB/hr",
        "480p": "~0.4 GB/hr",
        "720p": "~0.9 GB/hr",
        "1080p": "~1.8 GB/hr"
    }
}

# ============ API ENDPOINTS ============
API_ENDPOINTS = {
    "GET /api/streaming/config": "Get user's streaming config based on tier",
    "POST /api/streaming/quality": "Set quality preference (requires auth)",
    "GET /api/streaming/hls/{episode_id}": "Get HLS manifest with quality variants",
    "GET /api/streaming/bandwidth-estimate": "Get estimated data usage",
    "GET /api/streaming/preload-strategy/{episode_id}": "Get optimal preload settings",
    "POST /api/streaming/data-saver": "Toggle data saver mode"
}

# ============ ESTIMATED SAVINGS ============
"""
Original Cost (500K users): ~$146,000/month

After Optimizations:
├── Default 480p (not 720p/1080p): -35%
├── Auto-quality drops on buffering: -15%
├── Data Saver mode adoption: -10%
├── Lazy loading: -10%
├── Free tier limited to 480p: -15%
└── Total Savings: ~60-70%

Optimized Cost: ~$45,000-60,000/month
"""

# ============ IMPLEMENTATION CHECKLIST ============
OPTIMIZATION_CHECKLIST = [
    "✅ Enable HLS adaptive streaming in Bunny.net",
    "✅ Set default resolution to 480p (Africa market)",
    "✅ Limit free users to 480p quality (tier-based)",
    "☐ Enable token authentication to prevent hotlinking",
    "☐ Set Africa as primary edge region in Bunny.net",
    "☐ Convert thumbnails to WebP format",
    "✅ Implement lazy loading for video player (preload='none')",
    "✅ Add quality selector in video player UI with bandwidth info",
    "✅ Add Data Saver mode toggle",
    "✅ Add Auto-Quality toggle with network monitoring",
    "✅ Add Streaming Settings panel",
    "✅ Cache quality preferences per user",
    "☐ Compress all videos before upload with recommended presets",
]

# ============ UI COMPONENTS ADDED ============
UI_COMPONENTS = {
    "VideoPlayerPage.jsx": [
        "Data Saver toggle button",
        "Auto-quality indicator badge",
        "Network status indicator (Slow connection warning)",
        "Enhanced quality menu with bandwidth info",
        "Settings panel overlay with all streaming options",
        "Quality tier restrictions (VIP badge for 1080p)",
        "Buffering-based quality adjustment"
    ]
}
