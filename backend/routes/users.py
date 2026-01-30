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

# Spin wheel prize configuration - Revenue optimized (max 5 coins)
SPIN_PRIZES = [1, 1, 2, 2, 3, 3, 4, 5]  # Very low prizes
SPIN_WEIGHTS = [25, 25, 18, 12, 8, 6, 4, 2]  # 50% chance for 1 coin, 2% for 5
MAX_SPINS_PER_DAY = 3  # Maximum spins allowed per day

# Watch streak rewards - minimal coins to encourage purchases
STREAK_REWARDS = {
    3: {"coins": 2, "badge": "streak_3"},
    7: {"coins": 5, "badge": "streak_7"},
    14: {"coins": 8, "badge": "streak_14"},
    30: {"coins": 15, "badge": "streak_30"},
}

# Viewer levels based on total watch time (in episodes)
VIEWER_LEVELS = [
    {"name": "Newcomer", "min_episodes": 0, "icon": "🌱", "perks": []},
    {"name": "Regular", "min_episodes": 10, "icon": "⭐", "perks": ["profile_frame_bronze"]},
    {"name": "Fan", "min_episodes": 30, "icon": "🔥", "perks": ["profile_frame_silver"]},
    {"name": "Superfan", "min_episodes": 75, "icon": "💎", "perks": ["profile_frame_gold"]},
    {"name": "Legend", "min_episodes": 150, "icon": "👑", "perks": ["profile_frame_platinum", "early_access"]},
]

# Daily challenges (mostly non-coin rewards)
DAILY_CHALLENGES = [
    {"id": "watch_1", "title": "Daily Watch", "description": "Watch 1 episode today", "target": 1, "reward_type": "xp", "reward": 10},
    {"id": "watch_3", "title": "Triple Play", "description": "Watch 3 episodes today", "target": 3, "reward_type": "xp", "reward": 30},
    {"id": "genre_explore", "title": "Genre Explorer", "description": "Watch from 2 different genres", "target": 2, "reward_type": "badge", "reward": "explorer"},
    {"id": "share_series", "title": "Social Star", "description": "Share a series with friends", "target": 1, "reward_type": "xp", "reward": 15},
]

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
    last_spin_date = user.get("last_spin_date")
    spins_today = user.get("spins_today", 0)
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    # Reset spins if it's a new day
    if last_spin_date != today:
        spins_today = 0
    
    can_spin = spins_today < MAX_SPINS_PER_DAY
    spins_remaining = MAX_SPINS_PER_DAY - spins_today
    
    return {
        "can_spin": can_spin, 
        "spins_remaining": spins_remaining,
        "max_spins": MAX_SPINS_PER_DAY,
        "spins_used": spins_today,
        "prizes": SPIN_PRIZES
    }

@router.post("/spin")
async def spin_wheel(user: dict = Depends(get_current_user)):
    """Spin the wheel and win coins"""
    last_spin_date = user.get("last_spin_date")
    spins_today = user.get("spins_today", 0)
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    # Reset spins if it's a new day
    if last_spin_date != today:
        spins_today = 0
    
    # Check if user has spins remaining
    if spins_today >= MAX_SPINS_PER_DAY:
        raise HTTPException(status_code=400, detail=f"No spins remaining today. Come back tomorrow!")
    
    # Select prize based on weights (heavily favor lower prizes)
    prize = random.choices(SPIN_PRIZES, weights=SPIN_WEIGHTS, k=1)[0]
    prize_index = SPIN_PRIZES.index(prize)
    
    # Award coins and update spin count
    new_coins = user["coins"] + prize
    new_spins_today = spins_today + 1
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "coins": new_coins, 
            "last_spin_date": today,
            "spins_today": new_spins_today
        }}
    )
    
    spins_remaining = MAX_SPINS_PER_DAY - new_spins_today
    
    return {
        "prize": prize,
        "prize_index": prize_index,
        "new_balance": new_coins,
        "spins_remaining": spins_remaining,
        "message": f"You won {prize} coins!"
    }

# ============ WATCH STREAKS ============
@router.get("/streak/status")
async def get_streak_status(user: dict = Depends(get_current_user)):
    """Get user's current watch streak status"""
    current_streak = user.get("watch_streak", 0)
    last_watch_date = user.get("last_watch_date")
    streak_rewards_claimed = user.get("streak_rewards_claimed", [])
    
    now = datetime.now(timezone.utc)
    today = now.date()
    
    # Check if streak is still valid (watched yesterday or today)
    if last_watch_date:
        last_date = datetime.fromisoformat(last_watch_date.replace('Z', '+00:00')).date()
        days_since = (today - last_date).days
        if days_since > 1:
            current_streak = 0  # Streak broken
    
    # Calculate next milestone
    next_milestone = None
    for days, reward in sorted(STREAK_REWARDS.items()):
        if days > current_streak:
            next_milestone = {"days": days, "coins": reward["coins"], "badge": reward["badge"]}
            break
    
    # Check claimable rewards
    claimable_rewards = []
    for days, reward in STREAK_REWARDS.items():
        if current_streak >= days and str(days) not in streak_rewards_claimed:
            claimable_rewards.append({"days": days, **reward})
    
    return {
        "current_streak": current_streak,
        "last_watch_date": last_watch_date,
        "next_milestone": next_milestone,
        "claimable_rewards": claimable_rewards,
        "all_milestones": [{"days": d, **r} for d, r in STREAK_REWARDS.items()]
    }

@router.post("/streak/claim/{days}")
async def claim_streak_reward(days: int, user: dict = Depends(get_current_user)):
    """Claim a streak milestone reward"""
    current_streak = user.get("watch_streak", 0)
    streak_rewards_claimed = user.get("streak_rewards_claimed", [])
    
    if days not in STREAK_REWARDS:
        raise HTTPException(status_code=400, detail="Invalid milestone")
    
    if current_streak < days:
        raise HTTPException(status_code=400, detail=f"Need {days}-day streak to claim")
    
    if str(days) in streak_rewards_claimed:
        raise HTTPException(status_code=400, detail="Already claimed")
    
    reward = STREAK_REWARDS[days]
    new_coins = user["coins"] + reward["coins"]
    streak_rewards_claimed.append(str(days))
    
    # Also award the badge
    user_badges = user.get("badges", {})
    user_badges[reward["badge"]] = {
        "earned_at": datetime.now(timezone.utc).isoformat(),
        "type": "streak"
    }
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "coins": new_coins,
            "streak_rewards_claimed": streak_rewards_claimed,
            "badges": user_badges
        }}
    )
    
    return {
        "message": f"Claimed {reward['coins']} coins and {reward['badge']} badge!",
        "coins_awarded": reward["coins"],
        "badge_awarded": reward["badge"],
        "new_balance": new_coins
    }

# ============ VIEWER LEVELS ============
@router.get("/viewer-level")
async def get_viewer_level(user: dict = Depends(get_current_user)):
    """Get user's viewer level based on episodes watched"""
    episodes_watched = user.get("total_episodes_watched", 0)
    total_xp = user.get("total_xp", 0)
    
    # Determine current level
    current_level = VIEWER_LEVELS[0]
    next_level = None
    
    for i, level in enumerate(VIEWER_LEVELS):
        if episodes_watched >= level["min_episodes"]:
            current_level = level
            if i < len(VIEWER_LEVELS) - 1:
                next_level = VIEWER_LEVELS[i + 1]
        else:
            break
    
    # Calculate progress to next level
    progress = 100
    episodes_needed = 0
    if next_level:
        episodes_needed = next_level["min_episodes"] - episodes_watched
        level_range = next_level["min_episodes"] - current_level["min_episodes"]
        current_progress = episodes_watched - current_level["min_episodes"]
        progress = min(100, (current_progress / level_range) * 100) if level_range > 0 else 100
    
    return {
        "current_level": current_level,
        "next_level": next_level,
        "episodes_watched": episodes_watched,
        "episodes_to_next": episodes_needed,
        "progress_percent": round(progress, 1),
        "total_xp": total_xp,
        "all_levels": VIEWER_LEVELS
    }

# ============ DAILY CHALLENGES ============
@router.get("/challenges/daily")
async def get_daily_challenges(user: dict = Depends(get_current_user)):
    """Get today's challenges and progress"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    # Get or reset daily progress
    challenge_date = user.get("challenge_date")
    if challenge_date != today:
        # Reset for new day
        daily_progress = {c["id"]: 0 for c in DAILY_CHALLENGES}
        completed_today = []
    else:
        daily_progress = user.get("daily_challenge_progress", {})
        completed_today = user.get("challenges_completed_today", [])
    
    challenges = []
    for challenge in DAILY_CHALLENGES:
        progress = daily_progress.get(challenge["id"], 0)
        is_complete = progress >= challenge["target"]
        is_claimed = challenge["id"] in completed_today
        
        challenges.append({
            **challenge,
            "progress": progress,
            "is_complete": is_complete,
            "is_claimed": is_claimed
        })
    
    return {
        "date": today,
        "challenges": challenges,
        "total_completed": len(completed_today)
    }

@router.post("/challenges/claim/{challenge_id}")
async def claim_challenge_reward(challenge_id: str, user: dict = Depends(get_current_user)):
    """Claim a completed challenge reward"""
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    # Find challenge
    challenge = next((c for c in DAILY_CHALLENGES if c["id"] == challenge_id), None)
    if not challenge:
        raise HTTPException(status_code=400, detail="Invalid challenge")
    
    # Check progress
    challenge_date = user.get("challenge_date", today)
    daily_progress = user.get("daily_challenge_progress", {})
    completed_today = user.get("challenges_completed_today", [])
    
    if challenge_date != today:
        raise HTTPException(status_code=400, detail="Challenge expired")
    
    progress = daily_progress.get(challenge_id, 0)
    if progress < challenge["target"]:
        raise HTTPException(status_code=400, detail="Challenge not complete")
    
    if challenge_id in completed_today:
        raise HTTPException(status_code=400, detail="Already claimed")
    
    # Award reward
    completed_today.append(challenge_id)
    total_xp = user.get("total_xp", 0)
    user_badges = user.get("badges", {})
    
    update_data = {
        "challenges_completed_today": completed_today,
        "challenge_date": today
    }
    
    reward_message = ""
    if challenge["reward_type"] == "xp":
        total_xp += challenge["reward"]
        update_data["total_xp"] = total_xp
        reward_message = f"+{challenge['reward']} XP"
    elif challenge["reward_type"] == "badge":
        user_badges[challenge["reward"]] = {
            "earned_at": now.isoformat(),
            "type": "challenge"
        }
        update_data["badges"] = user_badges
        reward_message = f"Badge: {challenge['reward']}"
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {
        "message": f"Challenge complete! {reward_message}",
        "reward_type": challenge["reward_type"],
        "reward": challenge["reward"],
        "total_xp": total_xp
    }

# ============ PURCHASE PROMPTS ============
@router.get("/purchase-prompt")
async def get_purchase_prompt(user: dict = Depends(get_current_user)):
    """Get contextual purchase prompts based on user state"""
    coins = user.get("coins", 0)
    
    # Standard episode costs
    EPISODE_COST = 15
    
    prompts = []
    
    # "Almost there" prompt
    if 0 < coins < EPISODE_COST:
        coins_needed = EPISODE_COST - coins
        prompts.append({
            "type": "almost_there",
            "title": "Almost There!",
            "message": f"Just {coins_needed} more coins to unlock your next episode!",
            "cta": "Get Coins",
            "priority": 1
        })
    
    # Low balance prompt
    if coins == 0:
        prompts.append({
            "type": "empty_wallet",
            "title": "Your wallet is empty",
            "message": "Top up now and continue watching!",
            "cta": "Buy Coins",
            "priority": 2
        })
    
    # First purchase bonus (check if user has never purchased)
    if not user.get("has_purchased"):
        prompts.append({
            "type": "first_purchase",
            "title": "First Purchase Bonus!",
            "message": "Buy any coin pack and get 20% extra coins!",
            "cta": "Claim Bonus",
            "priority": 0
        })
    
    return {
        "prompts": sorted(prompts, key=lambda x: x["priority"]),
        "current_balance": coins,
        "episode_cost": EPISODE_COST
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

