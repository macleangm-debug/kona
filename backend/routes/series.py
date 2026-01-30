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
    """Get all series with caching"""
    cache_key = series_list_key("all")
    
    # Try cache first
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    # Fetch from DB
    series = await db.series.find({}, {"_id": 0}).to_list(100)
    if not series:
        from server import seed_data
        await seed_data()
        series = await db.series.find({}, {"_id": 0}).to_list(100)
    
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
    episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    # Free episodes can be accessed by anyone
    if episode.get("is_free", False):
        return {
            **episode,
            "unlocked": True,
            "is_guest": user is None
        }
    
    # Paid episodes require authentication
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to watch this episode")
    
    unlocked = episode_id in user.get("unlocked_episodes", [])
    return {
        **episode,
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
