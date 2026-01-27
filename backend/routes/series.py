"""
Series, episodes, and content routes
"""
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import SeriesResponse, EpisodeResponse, ReminderRequest
from services import db, get_current_user, get_optional_user

router = APIRouter(tags=["Series"])

@router.get("/series", response_model=List[SeriesResponse])
async def get_series():
    series = await db.series.find({}, {"_id": 0}).to_list(100)
    if not series:
        # Import seed_data from main server if needed
        from server import seed_data
        await seed_data()
        series = await db.series.find({}, {"_id": 0}).to_list(100)
    return series

@router.get("/series/featured", response_model=List[SeriesResponse])
async def get_featured_series():
    series = await db.series.find({"featured": True}, {"_id": 0}).to_list(10)
    return series

@router.get("/series/coming-soon")
async def get_coming_soon():
    """Get list of upcoming series"""
    coming_soon = await db.coming_soon.find({}, {"_id": 0}).to_list(20)
    return coming_soon

@router.post("/series/remind")
async def set_reminder(data: ReminderRequest, user: dict = Depends(get_current_user)):
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
async def get_series_detail(series_id: str):
    series = await db.series.find_one({"id": series_id}, {"_id": 0})
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    return series

@router.get("/series/{series_id}/episodes", response_model=List[EpisodeResponse])
async def get_episodes(series_id: str):
    episodes = await db.episodes.find({"series_id": series_id}, {"_id": 0}).sort("episode_number", 1).to_list(100)
    return episodes

@router.get("/episodes/{episode_id}")
async def get_episode(episode_id: str, user: dict = Depends(get_optional_user)):
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
