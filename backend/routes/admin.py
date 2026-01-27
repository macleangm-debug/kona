"""
Admin routes
"""
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import (
    AdminSeriesCreate, AdminEpisodeCreate, AdminUserUpdate,
    FeaturedPromoCreate, FeaturedPromo
)
from services import db, get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

async def require_admin(user: dict = Depends(get_current_user)):
    """Dependency to require admin privileges"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ ADMIN SERIES ============
@router.post("/series")
async def create_series(data: AdminSeriesCreate, user: dict = Depends(require_admin)):
    series_id = f"series-{uuid.uuid4().hex[:8]}"
    series = {
        "id": series_id,
        **data.dict(),
        "views": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.series.insert_one(series)
    del series["_id"]
    return series

@router.put("/series/{series_id}")
async def update_series(series_id: str, data: AdminSeriesCreate, user: dict = Depends(require_admin)):
    result = await db.series.update_one(
        {"id": series_id},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Series not found")
    return {"message": "Series updated"}

@router.delete("/series/{series_id}")
async def delete_series(series_id: str, user: dict = Depends(require_admin)):
    result = await db.series.delete_one({"id": series_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Series not found")
    # Also delete episodes
    await db.episodes.delete_many({"series_id": series_id})
    return {"message": "Series and episodes deleted"}

# ============ ADMIN EPISODES ============
@router.post("/episodes")
async def create_episode(data: AdminEpisodeCreate, user: dict = Depends(require_admin)):
    episode_id = f"{data.series_id}-ep{data.episode_number}"
    episode = {
        "id": episode_id,
        **data.dict(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.episodes.insert_one(episode)
    del episode["_id"]
    return episode

@router.put("/episodes/{episode_id}")
async def update_episode(episode_id: str, data: AdminEpisodeCreate, user: dict = Depends(require_admin)):
    result = await db.episodes.update_one(
        {"id": episode_id},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Episode not found")
    return {"message": "Episode updated"}

@router.delete("/episodes/{episode_id}")
async def delete_episode(episode_id: str, user: dict = Depends(require_admin)):
    result = await db.episodes.delete_one({"id": episode_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Episode not found")
    return {"message": "Episode deleted"}

# ============ ADMIN USERS ============
@router.get("/users")
async def list_users(user: dict = Depends(require_admin), skip: int = 0, limit: int = 50):
    users = await db.users.find(
        {},
        {"_id": 0, "password_hash": 0}
    ).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    return {"users": users, "total": total}

@router.put("/users/{user_id}")
async def update_user(user_id: str, data: AdminUserUpdate, user: dict = Depends(require_admin)):
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User updated"}

# ============ ADMIN STATS ============
@router.get("/stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_series = await db.series.count_documents({})
    total_episodes = await db.episodes.count_documents({})
    
    # Calculate total coins in circulation
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$coins"}}}]
    coins_result = await db.users.aggregate(pipeline).to_list(1)
    total_coins = coins_result[0]["total"] if coins_result else 0
    
    return {
        "total_users": total_users,
        "total_series": total_series,
        "total_episodes": total_episodes,
        "total_coins_circulation": total_coins
    }

# ============ ADMIN PROMOS ============
@router.get("/promos")
async def list_promos(user: dict = Depends(require_admin)):
    promos = await db.featured_promos.find({}, {"_id": 0}).to_list(100)
    return promos

@router.post("/promos")
async def create_promo(data: FeaturedPromoCreate, user: dict = Depends(require_admin)):
    promo_id = f"promo-{uuid.uuid4().hex[:8]}"
    promo = {
        "id": promo_id,
        **data.dict(),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": None
    }
    await db.featured_promos.insert_one(promo)
    del promo["_id"]
    return promo

@router.put("/promos/{promo_id}")
async def update_promo(promo_id: str, data: FeaturedPromoCreate, user: dict = Depends(require_admin)):
    result = await db.featured_promos.update_one(
        {"id": promo_id},
        {"$set": data.dict()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Promo not found")
    return {"message": "Promo updated"}

@router.delete("/promos/{promo_id}")
async def delete_promo(promo_id: str, user: dict = Depends(require_admin)):
    result = await db.featured_promos.delete_one({"id": promo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo not found")
    return {"message": "Promo deleted"}
