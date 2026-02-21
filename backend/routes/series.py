"""
Series, episodes, and content routes
With Redis caching for high performance (10M+ users)
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends, Request

from models.schemas import SeriesResponse, EpisodeResponse, ReminderRequest
from services import db, get_current_user, get_optional_user
from services.cache import cache, CACHE_TTL, series_key, series_list_key, episodes_key
from services.rate_limiter import limiter

router = APIRouter(tags=["Series"])

@router.get("/series", response_model=List[SeriesResponse])
@limiter.limit("60/minute")
async def get_series(request: Request):
    """Get all series with caching - sorted by newest first"""
    cache_key = series_list_key("all")
    
    # Try cache first
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch from DB - sort by created_at descending (newest first)
    series = await db.series.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    if not series:
        from server import seed_data
        await seed_data()
        series = await db.series.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Cache the result
    await cache.set(cache_key, series, CACHE_TTL["series_list"])
    return series

@router.get("/series/featured", response_model=List[SeriesResponse])
@limiter.limit("60/minute")
async def get_featured_series(request: Request):
    """Get featured series with caching"""
    cache_key = series_list_key("featured")
    
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    series = await db.series.find({"featured": True}, {"_id": 0}).to_list(10)
    await cache.set(cache_key, series, CACHE_TTL["series_list"])
    return series

@router.get("/series/coming-soon")
@limiter.limit("60/minute")
async def get_coming_soon(request: Request):
    """Get list of upcoming series with caching"""
    cache_key = "coming_soon:list"
    
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    coming_soon = await db.coming_soon.find({}, {"_id": 0}).to_list(20)
    await cache.set(cache_key, coming_soon, CACHE_TTL["series_list"])
    return coming_soon

@router.post("/series/remind")
@limiter.limit("20/minute")
async def set_reminder(request: Request, data: ReminderRequest, user: dict = Depends(get_current_user)):
    """Set a reminder for upcoming series"""
    series = await db.coming_soon.find_one({"id": data.series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    reminders = user.get("reminders", [])
    if data.series_id in reminders:
        raise HTTPException(status_code=400, detail="Reminder already set")
    
    reminders.append(data.series_id)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"reminders": reminders}}
    )
    
    await db.coming_soon.update_one(
        {"id": data.series_id},
        {"$inc": {"reserved_count": 1}}
    )
    
    return {"message": "Reminder set successfully!", "series_id": data.series_id}

@router.get("/series/{series_id}", response_model=SeriesResponse)
@limiter.limit("100/minute")
async def get_series_detail(request: Request, series_id: str):
    """Get series detail with caching"""
    cache_key = series_key(series_id)
    
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    series = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    
    await cache.set(cache_key, series, CACHE_TTL["series"])
    return series

@router.get("/stories/feed")
@limiter.limit("60/minute")
async def get_stories_feed(request: Request, limit: int = 20):
    """
    Get vertical Stories feed - only episodes marked as story content.
    These are vertical (9:16) videos meant for the TikTok-style browsing experience.
    Includes Episode 1s and any bonus story content from creators.
    """
    cache_key = series_list_key("stories_feed")
    
    cached = await cache.get(cache_key)
    if cached:
        return cached[:limit]
    
    # Get all story content episodes (Episode 1s are automatically story content)
    stories = await db.episodes.find(
        {"$or": [
            {"is_story_content": True},
            {"episode_number": 1}  # Episode 1 is always story content
        ]},
        {"_id": 0}
    ).sort([("created_at", -1), ("episode_number", 1)]).to_list(100)
    
    # Enrich with series info
    enriched_stories = []
    for story in stories:
        series = await db.series.find_one({"id": story["series_id"]}, {"_id": 0})
        if series:
            enriched_stories.append({
                **story,
                "series_title": series.get("title", ""),
                "series_thumbnail": series.get("thumbnail", ""),
                "series_genre": series.get("genre", ""),
                "is_story_content": True  # Ensure this flag is set
            })
    
    await cache.set(cache_key, enriched_stories, CACHE_TTL["series_list"])
    return enriched_stories[:limit]

@router.get("/series/{series_id}/episodes", response_model=List[EpisodeResponse])
@limiter.limit("100/minute")
async def get_episodes(request: Request, series_id: str):
    """Get episodes with caching"""
    cache_key = episodes_key(series_id)
    
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    episodes = await db.episodes.find({"series_id": series_id}, {"_id": 0}).sort("episode_number", 1).to_list(100)
    await cache.set(cache_key, episodes, CACHE_TTL["episodes"])
    return episodes

@router.get("/episodes/{episode_id}")
@limiter.limit("100/minute")
async def get_episode(request: Request, episode_id: str, user: dict = Depends(get_optional_user)):
    """Get episode details - allows guests for free episodes"""
    from services.bunny import bunny_service
    
    episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Generate video URLs from bunny_video_id if available
    # Priority order: HLS (best quality/adaptive) -> MP4 720p -> MP4 480p -> Embed (requires config)
    embed_url = None
    mp4_url = None
    mp4_urls = {}  # Multiple quality options
    hls_url = None
    
    if episode.get("bunny_video_id"):
        video_id = episode["bunny_video_id"]
        # HLS playlist URL (primary - adaptive bitrate streaming)
        hls_url = bunny_service.get_direct_play_url(video_id)
        
        # MP4 fallback URLs for maximum compatibility (like YouTube/Netflix)
        # These are direct CDN links that don't need referrer configuration
        mp4_urls = {
            "720p": bunny_service.get_mp4_fallback_url(video_id, "720p"),
            "480p": bunny_service.get_mp4_fallback_url(video_id, "480p"),
            "360p": bunny_service.get_mp4_fallback_url(video_id, "360p"),
        }
        mp4_url = mp4_urls.get("720p", mp4_urls.get("480p"))  # Default to best quality available
        
        # Embed URL (last resort - requires domain configuration)
        embed_url = bunny_service.get_embed_url(video_id)
    
    # If video_url is set manually (e.g., external URL), use that as primary
    video_url = episode.get("video_url") or hls_url
    
    # Free episodes can be accessed by anyone
    if episode.get("is_free", False):
        return {
            **episode,
            "video_url": video_url,
            "hls_url": hls_url,
            "mp4_url": mp4_url,
            "mp4_urls": mp4_urls,
            "embed_url": embed_url,
            "unlocked": True,
            "is_guest": user is None
        }
    
    # Paid episodes require authentication
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to watch this episode")
    
    unlocked = episode_id in user.get("unlocked_episodes", [])
    return {
        **episode,
        "video_url": video_url,
        "hls_url": hls_url,
        "mp4_url": mp4_url,
        "mp4_urls": mp4_urls,
        "embed_url": embed_url,
        "unlocked": unlocked
    }

@router.get("/search")
async def search_series(q: str, limit: int = 20):
    """Search series by title or description"""
    if not q or len(q.strip()) < 2:
        return []
    
    # Case-insensitive search
    regex_pattern = {"$regex": q, "$options": "i"}
    
    results = await db.series.find(
        {
            "$or": [
                {"title": regex_pattern},
                {"description": regex_pattern},
                {"genre": regex_pattern}
            ]
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    return results

from pydantic import BaseModel
from datetime import datetime, timezone

class EpisodeProgressRequest(BaseModel):
    episode_id: str
    progress: int  # 0-100

@router.post("/episodes/progress")
async def save_episode_progress(data: EpisodeProgressRequest, user: dict = Depends(get_optional_user)):
    """Save episode watch progress and track daily viewing for rewards"""
    if not user:
        return {"message": "Progress not saved (guest)", "saved": False}
    
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    watch_progress = user.get("watch_progress", {})
    old_progress = watch_progress.get(data.episode_id, 0)
    watch_progress[data.episode_id] = max(old_progress, data.progress)
    
    # Track episodes watched today (count new episode views at 10%+ progress)
    last_watch_date = user.get("last_watch_date", "")
    episodes_watched_today = user.get("episodes_watched_today", 0)
    watched_episodes_today_list = user.get("watched_episodes_today_list", [])
    free_episodes_today = user.get("free_episodes_watched_today", 0)
    paid_episodes_today = user.get("paid_episodes_watched_today", 0)
    
    # Reset if new day
    if last_watch_date != today:
        episodes_watched_today = 0
        watched_episodes_today_list = []
        free_episodes_today = 0
        paid_episodes_today = 0
    
    # Count as watched if progress >= 10% and not already counted today
    episode_is_new_today = data.episode_id not in watched_episodes_today_list
    if data.progress >= 10 and episode_is_new_today:
        episodes_watched_today += 1
        watched_episodes_today_list.append(data.episode_id)
        
        # Check if this is a free or paid episode
        episode = await db.episodes.find_one({"id": data.episode_id}, {"_id": 0, "is_free": 1, "episode_number": 1})
        is_free = episode.get("is_free", False) if episode else False
        # Episode 1 is always free
        if episode and episode.get("episode_number") == 1:
            is_free = True
        
        if is_free:
            free_episodes_today += 1
        else:
            paid_episodes_today += 1
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "watch_progress": watch_progress,
            "last_watch_date": today,
            "episodes_watched_today": episodes_watched_today,
            "watched_episodes_today_list": watched_episodes_today_list,
            "free_episodes_watched_today": free_episodes_today,
            "paid_episodes_watched_today": paid_episodes_today
        }}
    )
    
    return {
        "message": "Progress saved", 
        "progress": data.progress, 
        "saved": True,
        "episodes_watched_today": episodes_watched_today,
        "free_episodes_today": free_episodes_today,
        "paid_episodes_today": paid_episodes_today
    }
