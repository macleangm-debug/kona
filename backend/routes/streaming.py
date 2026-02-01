"""
Streaming routes for CDN optimization
Handles video quality, adaptive bitrate, and bandwidth management
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from services import db, get_current_user, get_optional_user

router = APIRouter(prefix="/streaming", tags=["Streaming"])

# Video quality configurations
VIDEO_QUALITIES = {
    "360p": {
        "resolution": "640x360",
        "bitrate": "500k",
        "label": "Low (360p)",
        "bandwidth_kb": 500,
        "description": "Data saver - best for slow connections"
    },
    "480p": {
        "resolution": "854x480",
        "bitrate": "800k",
        "label": "Medium (480p)",
        "bandwidth_kb": 800,
        "description": "Good quality, less data"
    },
    "720p": {
        "resolution": "1280x720",
        "bitrate": "2000k",
        "label": "HD (720p)",
        "bandwidth_kb": 2000,
        "description": "High definition - recommended"
    },
    "1080p": {
        "resolution": "1920x1080",
        "bitrate": "4000k",
        "label": "Full HD (1080p)",
        "bandwidth_kb": 4000,
        "description": "Best quality - VIP only"
    }
}

# Quality tier limits by subscription type
QUALITY_TIERS = {
    "free": ["360p", "480p"],  # Free users limited to save bandwidth
    "basic": ["360p", "480p", "720p"],
    "premium": ["360p", "480p", "720p", "1080p"],
    "vip": ["360p", "480p", "720p", "1080p"]  # Full access
}

# Default quality by network type
DEFAULT_QUALITY = {
    "slow": "360p",    # < 1 Mbps
    "2g": "360p",
    "3g": "480p",
    "4g": "720p",
    "wifi": "720p",
    "unknown": "480p"  # Conservative default for Africa market
}


class QualityPreference(BaseModel):
    quality: str
    auto_quality: bool = True


class StreamingConfig(BaseModel):
    episode_id: str
    network_type: Optional[str] = "unknown"


@router.get("/config")
async def get_streaming_config(user: dict = Depends(get_optional_user)):
    """Get streaming configuration based on user tier"""
    
    # Determine user tier
    if not user:
        tier = "free"
    else:
        subscription = user.get("subscription", {})
        if subscription.get("active"):
            tier = subscription.get("plan", "basic")
        elif user.get("has_made_purchase", False):
            tier = "basic"  # Paying users get better quality
        else:
            tier = "free"
    
    available_qualities = QUALITY_TIERS.get(tier, QUALITY_TIERS["free"])
    
    # Get user's saved preference
    saved_quality = "480p"  # Default
    auto_quality = True
    
    if user:
        streaming_prefs = user.get("streaming_preferences", {})
        saved_quality = streaming_prefs.get("quality", "480p")
        auto_quality = streaming_prefs.get("auto_quality", True)
        
        # Ensure saved quality is still available for their tier
        if saved_quality not in available_qualities:
            saved_quality = available_qualities[-1]  # Highest available
    
    return {
        "tier": tier,
        "available_qualities": [
            {
                "value": q,
                **VIDEO_QUALITIES[q],
                "vip_only": q == "1080p" and tier not in ["premium", "vip"]
            }
            for q in VIDEO_QUALITIES.keys()
        ],
        "allowed_qualities": available_qualities,
        "current_quality": saved_quality,
        "auto_quality": auto_quality,
        "default_quality": "480p",  # Conservative default for Africa
        "recommendations": {
            "slow_connection": "360p",
            "mobile_data": "480p",
            "wifi": "720p"
        }
    }


@router.post("/quality")
async def set_quality_preference(data: QualityPreference, user: dict = Depends(get_current_user)):
    """Save user's quality preference"""
    
    # Validate quality
    if data.quality not in VIDEO_QUALITIES:
        raise HTTPException(status_code=400, detail="Invalid quality setting")
    
    # Check if user has access to this quality
    subscription = user.get("subscription", {})
    if subscription.get("active"):
        tier = subscription.get("plan", "basic")
    elif user.get("has_made_purchase", False):
        tier = "basic"
    else:
        tier = "free"
    
    allowed = QUALITY_TIERS.get(tier, QUALITY_TIERS["free"])
    if data.quality not in allowed:
        raise HTTPException(
            status_code=403, 
            detail=f"Quality {data.quality} requires VIP subscription"
        )
    
    # Save preference
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "streaming_preferences": {
                "quality": data.quality,
                "auto_quality": data.auto_quality
            }
        }}
    )
    
    return {
        "message": "Quality preference saved",
        "quality": data.quality,
        "auto_quality": data.auto_quality
    }


@router.get("/hls/{episode_id}")
async def get_hls_manifest(episode_id: str, user: dict = Depends(get_optional_user)):
    """
    Get HLS manifest for adaptive bitrate streaming
    Returns quality variants based on user tier
    """
    episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Determine user tier
    if not user:
        tier = "free"
    else:
        subscription = user.get("subscription", {})
        if subscription.get("active"):
            tier = subscription.get("plan", "basic")
        else:
            tier = "free" if not user.get("has_made_purchase") else "basic"
    
    allowed_qualities = QUALITY_TIERS.get(tier, QUALITY_TIERS["free"])
    
    # Build HLS playlist URLs (simulated - in production, Bunny.net generates these)
    base_url = episode.get("video_url", "")
    
    # For demo, return quality options. In production, these would be actual HLS variant streams
    variants = []
    for quality in allowed_qualities:
        config = VIDEO_QUALITIES[quality]
        variants.append({
            "quality": quality,
            "resolution": config["resolution"],
            "bandwidth": config["bandwidth_kb"] * 1000,
            "url": f"{base_url}?quality={quality}",  # In production: actual HLS stream URL
            "label": config["label"]
        })
    
    return {
        "episode_id": episode_id,
        "type": "hls",
        "variants": variants,
        "default_quality": "480p",
        "user_tier": tier,
        "adaptive_enabled": True,
        "buffer_config": {
            "initial_buffer_seconds": 3,
            "rebuffer_goal_seconds": 5,
            "max_buffer_seconds": 30
        }
    }


@router.get("/bandwidth-estimate")
async def get_bandwidth_estimate(user: dict = Depends(get_optional_user)):
    """
    Get estimated monthly bandwidth usage based on viewing habits
    Helps users understand data costs
    """
    if not user:
        return {
            "estimated_hours": 10,
            "estimated_gb": 5,
            "recommended_quality": "480p",
            "tip": "Sign up to track your viewing habits and optimize data usage"
        }
    
    # Calculate based on watch history
    watch_progress = user.get("watch_progress", {})
    episodes_watched = len(watch_progress)
    
    # Assume average 15 min per episode
    avg_minutes_per_episode = 15
    total_minutes = episodes_watched * avg_minutes_per_episode
    total_hours = total_minutes / 60
    
    # Get user's quality preference
    streaming_prefs = user.get("streaming_preferences", {})
    quality = streaming_prefs.get("quality", "480p")
    
    # Calculate data usage
    bandwidth_kb = VIDEO_QUALITIES.get(quality, VIDEO_QUALITIES["480p"])["bandwidth_kb"]
    gb_per_hour = (bandwidth_kb * 60 * 60) / (8 * 1024 * 1024)  # Convert to GB
    
    estimated_monthly_gb = total_hours * gb_per_hour * 4  # Assume monthly usage is 4x current
    
    # Cost-saving tip based on usage
    if estimated_monthly_gb > 20:
        tip = "Consider using 480p quality to save up to 60% on data costs"
        recommended = "480p"
    elif estimated_monthly_gb > 10:
        tip = "Your data usage is moderate. 720p is a good balance of quality and data"
        recommended = "720p"
    else:
        tip = "Your data usage is low. Enjoy the best quality available!"
        recommended = quality
    
    return {
        "episodes_watched": episodes_watched,
        "estimated_hours_watched": round(total_hours, 1),
        "current_quality": quality,
        "estimated_monthly_gb": round(estimated_monthly_gb, 2),
        "recommended_quality": recommended,
        "tip": tip,
        "data_by_quality": {
            "360p": round(0.23 * total_hours * 4, 2),  # ~0.23 GB/hour
            "480p": round(0.36 * total_hours * 4, 2),  # ~0.36 GB/hour
            "720p": round(0.9 * total_hours * 4, 2),   # ~0.9 GB/hour
            "1080p": round(1.8 * total_hours * 4, 2)   # ~1.8 GB/hour
        }
    }


@router.get("/preload-strategy/{episode_id}")
async def get_preload_strategy(episode_id: str, user: dict = Depends(get_optional_user)):
    """
    Return optimized preload strategy based on user and network conditions
    Implements lazy loading to save bandwidth
    """
    return {
        "episode_id": episode_id,
        "preload": "none",  # Don't preload video - load on play
        "poster": True,  # Show thumbnail instead
        "lazy_load_thumbnails": True,
        "buffer_strategy": {
            "initial_buffer_kb": 500,  # Small initial buffer
            "buffer_ahead_seconds": 10,  # Only buffer 10 seconds ahead
            "quality_switch_threshold": 3  # Seconds of rebuffering before quality drop
        },
        "bandwidth_saving_mode": user.get("data_saver", False) if user else True,
        "tip": "Videos load on play to save your data"
    }


@router.post("/data-saver")
async def toggle_data_saver(enabled: bool, user: dict = Depends(get_current_user)):
    """Toggle data saver mode for aggressive bandwidth optimization"""
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "data_saver": enabled,
            "streaming_preferences.quality": "360p" if enabled else "480p",
            "streaming_preferences.auto_quality": not enabled
        }}
    )
    
    return {
        "data_saver": enabled,
        "message": "Data saver enabled - videos will play at 360p" if enabled else "Data saver disabled",
        "quality": "360p" if enabled else "480p"
    }
