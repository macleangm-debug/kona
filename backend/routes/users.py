"""
User-related routes (rewards, lists, progress, unlock)
"""
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import MyListRequest, UnlockEpisodeRequest, WatchProgressUpdate
from services import db, get_current_user, get_optional_user
from config.settings import DAILY_REWARD_COINS

router = APIRouter(tags=["User"])

# Spin wheel prize configuration - Lower prizes, harder to get big wins
SPIN_PRIZES = [1, 2, 3, 5, 8, 10, 15, 25]  # Lower prizes
SPIN_WEIGHTS = [30, 25, 20, 12, 7, 4, 1.5, 0.5]  # Much harder to get high prizes
MAX_SPINS_PER_DAY = 3  # Maximum spins allowed per day

# ============ DAILY REWARDS ============
@router.post("/rewards/claim")
async def claim_daily_reward(user: dict = Depends(get_current_user)):
    last_claim = user.get("last_daily_reward")
    now = datetime.now(timezone.utc)
    
    if last_claim:
        last_claim_dt = datetime.fromisoformat(last_claim.replace('Z', '+00:00'))
        hours_since = (now - last_claim_dt).total_seconds() / 3600
        if hours_since < 24:
            raise HTTPException(status_code=400, detail=f"Can claim again in {24 - int(hours_since)} hours")
    
    new_coins = user["coins"] + DAILY_REWARD_COINS
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"coins": new_coins, "last_daily_reward": now.isoformat()}}
    )
    
    return {"message": f"Claimed {DAILY_REWARD_COINS} coins!", "coins": new_coins}

@router.get("/rewards/status")
async def get_reward_status(user: dict = Depends(get_current_user)):
    last_claim = user.get("last_daily_reward")
    now = datetime.now(timezone.utc)
    
    if not last_claim:
        return {"can_claim": True, "hours_until_next": 0, "reward_amount": DAILY_REWARD_COINS}
    
    last_claim_dt = datetime.fromisoformat(last_claim.replace('Z', '+00:00'))
    hours_since = (now - last_claim_dt).total_seconds() / 3600
    can_claim = hours_since >= 24
    hours_until_next = max(0, 24 - hours_since) if not can_claim else 0
    
    return {"can_claim": can_claim, "hours_until_next": hours_until_next, "reward_amount": DAILY_REWARD_COINS}

# ============ SPIN WHEEL ============
@router.get("/spin/status")
async def get_spin_status(user: dict = Depends(get_current_user)):
    """Check if user can spin the wheel today"""
    last_spin = user.get("last_spin")
    now = datetime.now(timezone.utc)
    
    if not last_spin:
        return {"can_spin": True, "prizes": SPIN_PRIZES}
    
    last_spin_dt = datetime.fromisoformat(last_spin.replace('Z', '+00:00'))
    hours_since = (now - last_spin_dt).total_seconds() / 3600
    can_spin = hours_since >= 24
    
    return {
        "can_spin": can_spin, 
        "hours_until_next": max(0, 24 - hours_since) if not can_spin else 0,
        "prizes": SPIN_PRIZES
    }

@router.post("/spin")
async def spin_wheel(user: dict = Depends(get_current_user)):
    """Spin the wheel and win coins"""
    last_spin = user.get("last_spin")
    now = datetime.now(timezone.utc)
    
    if last_spin:
        last_spin_dt = datetime.fromisoformat(last_spin.replace('Z', '+00:00'))
        hours_since = (now - last_spin_dt).total_seconds() / 3600
        if hours_since < 24:
            raise HTTPException(status_code=400, detail=f"Can spin again in {24 - int(hours_since)} hours")
    
    # Select prize based on weights
    prize = random.choices(SPIN_PRIZES, weights=SPIN_WEIGHTS, k=1)[0]
    prize_index = SPIN_PRIZES.index(prize)
    
    # Award coins
    new_coins = user["coins"] + prize
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"coins": new_coins, "last_spin": now.isoformat()}}
    )
    
    return {
        "prize": prize,
        "prize_index": prize_index,
        "new_balance": new_coins,
        "message": f"You won {prize} coins!"
    }

# ============ MY LIST ============
@router.get("/users/me/my-list")
async def get_my_list(user: dict = Depends(get_current_user)):
    my_list_ids = user.get("my_list", [])
    if not my_list_ids:
        return []
    
    series = await db.series.find(
        {"id": {"$in": my_list_ids}},
        {"_id": 0}
    ).to_list(100)
    
    return series

@router.post("/users/me/my-list")
async def add_to_my_list(data: MyListRequest, user: dict = Depends(get_current_user)):
    my_list = user.get("my_list", [])
    if data.series_id in my_list:
        raise HTTPException(status_code=400, detail="Already in list")
    
    my_list.append(data.series_id)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"my_list": my_list}}
    )
    
    return {"message": "Added to list", "my_list": my_list}

@router.delete("/users/me/my-list/{series_id}")
async def remove_from_my_list(series_id: str, user: dict = Depends(get_current_user)):
    my_list = user.get("my_list", [])
    if series_id not in my_list:
        raise HTTPException(status_code=400, detail="Not in list")
    
    my_list.remove(series_id)
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"my_list": my_list}}
    )
    
    return {"message": "Removed from list", "my_list": my_list}

# ============ WATCH PROGRESS ============
@router.get("/user/continue-watching")
async def get_continue_watching(user: dict = Depends(get_current_user)):
    watch_progress = user.get("watch_progress", {})
    if not watch_progress:
        return []
    
    continue_watching = []
    for episode_id, progress in watch_progress.items():
        if progress < 95:  # Not finished
            episode = await db.episodes.find_one({"id": episode_id}, {"_id": 0})
            if episode:
                series = await db.series.find_one({"id": episode["series_id"]}, {"_id": 0})
                if series:
                    continue_watching.append({
                        "series": series,
                        "episode": episode,
                        "progress": progress
                    })
    
    return continue_watching[:10]  # Limit to 10

@router.post("/user/watch-progress/{episode_id}")
async def update_watch_progress(episode_id: str, data: WatchProgressUpdate, user: dict = Depends(get_optional_user)):
    """Update watch progress - optional auth (guests can save temporarily)"""
    if not user:
        return {"message": "Progress not saved (guest user)", "saved": False}
    
    watch_progress = user.get("watch_progress", {})
    watch_progress[episode_id] = data.progress
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"watch_progress": watch_progress}}
    )
    
    return {"message": "Progress saved", "progress": data.progress, "saved": True}

@router.get("/user/watch-progress/{episode_id}")
async def get_watch_progress(episode_id: str, user: dict = Depends(get_optional_user)):
    """Get watch progress for episode - optional auth"""
    if not user:
        return {"progress": 0}
    
    watch_progress = user.get("watch_progress", {})
    return {"progress": watch_progress.get(episode_id, 0)}

# ============ UNLOCK EPISODES ============
@router.post("/episodes/unlock")
async def unlock_episode(data: UnlockEpisodeRequest, user: dict = Depends(get_current_user)):
    episode = await db.episodes.find_one({"id": data.episode_id}, {"_id": 0})
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    if episode.get("is_free", False):
        return {"message": "Episode is free!", "unlocked": True}
    
    if data.episode_id in user.get("unlocked_episodes", []):
        return {"message": "Episode already unlocked", "unlocked": True}
    
    coins_required = episode.get("coins_required", 5)
    if user["coins"] < coins_required:
        raise HTTPException(status_code=400, detail=f"Need {coins_required} coins to unlock")
    
    new_coins = user["coins"] - coins_required
    unlocked = user.get("unlocked_episodes", [])
    unlocked.append(data.episode_id)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"coins": new_coins, "unlocked_episodes": unlocked}}
    )
    
    # Track revenue for creator if this is creator content
    creator_id = episode.get("creator_id")
    if creator_id:
        await track_creator_revenue(
            episode_id=data.episode_id,
            series_id=episode.get("series_id"),
            creator_id=creator_id,
            user_id=user["id"],
            coins_spent=coins_required
        )
    
    return {
        "message": "Episode unlocked!",
        "coins_spent": coins_required,
        "coins_remaining": new_coins,
        "unlocked": True
    }


async def track_creator_revenue(episode_id: str, series_id: str, creator_id: str, user_id: str, coins_spent: int):
    """Track revenue when user unlocks creator content"""
    import uuid
    from datetime import datetime, timezone
    
    # Get creator's revenue share
    creator = await db.creators.find_one({"id": creator_id})
    if not creator:
        return
    
    revenue_share = creator.get("revenue_share", 0.60)
    creator_share = int(coins_spent * revenue_share)
    platform_share = coins_spent - creator_share
    
    # Record the view/purchase
    view_record = {
        "id": f"view-{uuid.uuid4().hex[:12]}",
        "episode_id": episode_id,
        "series_id": series_id,
        "creator_id": creator_id,
        "user_id": user_id,
        "coins_spent": coins_spent,
        "creator_share": creator_share,
        "platform_share": platform_share,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.view_records.insert_one(view_record)
    
    # Update creator stats
    await db.creators.update_one(
        {"id": creator_id},
        {"$inc": {
            "total_views": 1,
            "total_earnings": creator_share,
            "pending_payout": creator_share
        }}
    )
    
    # Update episode stats
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$inc": {"views": 1, "earnings": creator_share}}
    )
    
    # Update series stats
    await db.creator_series.update_one(
        {"id": series_id},
        {"$inc": {"total_views": 1, "total_earnings": creator_share}}
    )

