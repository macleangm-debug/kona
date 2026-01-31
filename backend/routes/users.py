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
    {"name": "Legend", "min_episodes": 150, "icon": "👑", "perks": ["profile_frame_platinum", "early_access", "legend_badge"]},
]

# Legend-exclusive milestone badges (for users who maxed out)
LEGEND_MILESTONES = [
    {"episodes": 200, "badge": "legend_200", "title": "Rising Legend"},
    {"episodes": 300, "badge": "legend_300", "title": "True Legend"},
    {"episodes": 500, "badge": "legend_500", "title": "Ultimate Legend"},
    {"episodes": 1000, "badge": "legend_1000", "title": "Kona Master"},
]

# Daily challenges - ALL badge rewards (no XP)
DAILY_CHALLENGES = [
    {"id": "watch_1", "title": "Daily Watch", "description": "Watch 1 episode today", "target": 1, "reward_type": "badge", "reward": "daily_watcher"},
    {"id": "watch_3", "title": "Triple Play", "description": "Watch 3 episodes today", "target": 3, "reward_type": "badge", "reward": "binge_starter"},
    {"id": "genre_explore", "title": "Genre Explorer", "description": "Watch from 2 different genres", "target": 2, "reward_type": "badge", "reward": "explorer"},
    {"id": "share_series", "title": "Social Star", "description": "Share a series with friends", "target": 1, "reward_type": "badge", "reward": "social_star"},
]

# Mystery Box rewards - Heavily weighted toward non-coin rewards (NO XP)
MYSTERY_BOX_REWARDS = [
    {"type": "coins", "value": 1, "weight": 15, "label": "1 Coin", "icon": "🪙"},
    {"type": "coins", "value": 2, "weight": 10, "label": "2 Coins", "icon": "🪙"},
    {"type": "coins", "value": 3, "weight": 5, "label": "3 Coins", "icon": "🪙"},
    {"type": "badge", "value": "mystery_opener", "weight": 25, "label": "Mystery Badge", "icon": "🎭"},
    {"type": "badge", "value": "lucky_finder", "weight": 20, "label": "Lucky Finder", "icon": "🍀"},
    {"type": "frame", "value": "mystery_frame", "weight": 15, "label": "Mystery Frame", "icon": "🖼️"},
    {"type": "badge", "value": "treasure_hunter", "weight": 10, "label": "Treasure Hunter", "icon": "💎"},
]
MYSTERY_BOX_TRIGGER = 10  # Episodes needed to trigger mystery box

# Character Cards per Series (sample data)
CHARACTER_CARDS = {
    "series-1": [
        {"id": "s1-c1", "name": "Emma", "rarity": "common", "image": "emma.jpg"},
        {"id": "s1-c2", "name": "James", "rarity": "common", "image": "james.jpg"},
        {"id": "s1-c3", "name": "Sophie", "rarity": "rare", "image": "sophie.jpg"},
        {"id": "s1-c4", "name": "Michael", "rarity": "epic", "image": "michael.jpg"},
    ],
    "series-2": [
        {"id": "s2-c1", "name": "Alex", "rarity": "common", "image": "alex.jpg"},
        {"id": "s2-c2", "name": "Diana", "rarity": "common", "image": "diana.jpg"},
        {"id": "s2-c3", "name": "Marcus", "rarity": "rare", "image": "marcus.jpg"},
        {"id": "s2-c4", "name": "Victoria", "rarity": "epic", "image": "victoria.jpg"},
    ],
    "series-3": [
        {"id": "s3-c1", "name": "Lily", "rarity": "common", "image": "lily.jpg"},
        {"id": "s3-c2", "name": "Ryan", "rarity": "common", "image": "ryan.jpg"},
        {"id": "s3-c3", "name": "Zoe", "rarity": "rare", "image": "zoe.jpg"},
        {"id": "s3-c4", "name": "Nathan", "rarity": "epic", "image": "nathan.jpg"},
    ],
}
CARD_RARITY_WEIGHTS = {"common": 60, "rare": 30, "epic": 10}

# ============ DAILY REWARDS ============
@router.post("/rewards/claim")
async def claim_daily_reward(user: dict = Depends(get_current_user)):
    last_claim = user.get("last_daily_reward")
    now = datetime.now(timezone.utc)
    today = now.date().isoformat()
    
    if last_claim:
        last_claim_dt = datetime.fromisoformat(last_claim.replace('Z', '+00:00'))
        hours_since = (now - last_claim_dt).total_seconds() / 3600
        if hours_since < 24:
            raise HTTPException(status_code=400, detail=f"Can claim again in {24 - int(hours_since)} hours")
    
    # Check if user has watched at least 1 episode today
    episodes_watched_today = user.get("episodes_watched_today", 0)
    last_watch_date = user.get("last_watch_date", "")
    
    # Reset counter if last watch was not today
    if last_watch_date != today:
        episodes_watched_today = 0
    
    if episodes_watched_today < 1:
        raise HTTPException(
            status_code=400, 
            detail="Watch at least 1 episode today to claim your daily reward!"
        )
    
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
    today = now.date().isoformat()
    
    # Check episode watching requirement
    episodes_watched_today = user.get("episodes_watched_today", 0)
    last_watch_date = user.get("last_watch_date", "")
    
    if last_watch_date != today:
        episodes_watched_today = 0
    
    watch_requirement_met = episodes_watched_today >= 1
    
    if not last_claim:
        return {
            "can_claim": watch_requirement_met, 
            "hours_until_next": 0, 
            "reward_amount": DAILY_REWARD_COINS,
            "watch_requirement_met": watch_requirement_met,
            "episodes_watched_today": episodes_watched_today,
            "episodes_required": 1
        }
    
    last_claim_dt = datetime.fromisoformat(last_claim.replace('Z', '+00:00'))
    hours_since = (now - last_claim_dt).total_seconds() / 3600
    time_requirement_met = hours_since >= 24
    can_claim = time_requirement_met and watch_requirement_met
    hours_until_next = max(0, 24 - hours_since) if not time_requirement_met else 0
    
    return {
        "can_claim": can_claim, 
        "hours_until_next": hours_until_next, 
        "reward_amount": DAILY_REWARD_COINS,
        "watch_requirement_met": watch_requirement_met,
        "episodes_watched_today": episodes_watched_today,
        "episodes_required": 1
    }

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
    
    # For Legend users - show milestone progress
    legend_progress = None
    if current_level["name"] == "Legend":
        # Find next Legend milestone
        next_milestone = None
        current_milestone = None
        for milestone in LEGEND_MILESTONES:
            if episodes_watched >= milestone["episodes"]:
                current_milestone = milestone
            else:
                next_milestone = milestone
                break
        
        if next_milestone:
            legend_progress = {
                "current_milestone": current_milestone,
                "next_milestone": next_milestone,
                "episodes_to_next": next_milestone["episodes"] - episodes_watched,
                "progress_percent": round(((episodes_watched - (current_milestone["episodes"] if current_milestone else 150)) / 
                                          (next_milestone["episodes"] - (current_milestone["episodes"] if current_milestone else 150))) * 100, 1)
            }
        else:
            # User has achieved all milestones!
            legend_progress = {
                "current_milestone": current_milestone,
                "next_milestone": None,
                "all_milestones_complete": True,
                "message": "You've achieved the highest level! You are a true Kona Master!"
            }
    
    return {
        "current_level": current_level,
        "next_level": next_level,
        "episodes_watched": episodes_watched,
        "episodes_to_next": episodes_needed,
        "progress_percent": round(progress, 1),
        "all_levels": VIEWER_LEVELS,
        "legend_milestones": LEGEND_MILESTONES if current_level["name"] == "Legend" else None,
        "legend_progress": legend_progress,
        "is_max_level": current_level["name"] == "Legend"
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

# ============ MYSTERY BOX ============
@router.get("/mystery-box/status")
async def get_mystery_box_status(user: dict = Depends(get_current_user)):
    """Check if user has a mystery box to open"""
    episodes_watched = user.get("total_episodes_watched", 0)
    last_box_at = user.get("last_mystery_box_at", 0)
    
    # Calculate if new box is available
    boxes_earned = episodes_watched // MYSTERY_BOX_TRIGGER
    boxes_opened = last_box_at // MYSTERY_BOX_TRIGGER if last_box_at > 0 else 0
    has_pending_box = boxes_earned > boxes_opened
    
    # Progress to next box
    episodes_since_last = episodes_watched % MYSTERY_BOX_TRIGGER
    progress_percent = (episodes_since_last / MYSTERY_BOX_TRIGGER) * 100
    episodes_to_next = MYSTERY_BOX_TRIGGER - episodes_since_last
    
    return {
        "has_pending_box": has_pending_box,
        "boxes_opened": boxes_opened,
        "episodes_watched": episodes_watched,
        "progress_to_next": round(progress_percent, 1),
        "episodes_to_next": episodes_to_next,
        "trigger_every": MYSTERY_BOX_TRIGGER
    }

@router.post("/mystery-box/open")
async def open_mystery_box(user: dict = Depends(get_current_user)):
    """Open a mystery box and get reward"""
    episodes_watched = user.get("total_episodes_watched", 0)
    last_box_at = user.get("last_mystery_box_at", 0)
    
    boxes_earned = episodes_watched // MYSTERY_BOX_TRIGGER
    boxes_opened = last_box_at // MYSTERY_BOX_TRIGGER if last_box_at > 0 else 0
    
    if boxes_earned <= boxes_opened:
        raise HTTPException(status_code=400, detail="No mystery box available")
    
    # Select random reward based on weights
    weights = [r["weight"] for r in MYSTERY_BOX_REWARDS]
    reward = random.choices(MYSTERY_BOX_REWARDS, weights=weights, k=1)[0]
    
    # Apply reward
    update_data = {"last_mystery_box_at": episodes_watched}
    reward_details = {"type": reward["type"], "value": reward["value"], "label": reward["label"], "icon": reward["icon"]}
    
    if reward["type"] == "coins":
        new_coins = user.get("coins", 0) + reward["value"]
        update_data["coins"] = new_coins
        reward_details["new_balance"] = new_coins
    elif reward["type"] == "badge":
        user_badges = user.get("badges", {})
        user_badges[reward["value"]] = {
            "earned_at": datetime.now(timezone.utc).isoformat(),
            "type": "mystery_box"
        }
        update_data["badges"] = user_badges
    elif reward["type"] == "frame":
        user_frames = user.get("profile_frames", [])
        if reward["value"] not in user_frames:
            user_frames.append(reward["value"])
            update_data["profile_frames"] = user_frames
    elif reward["type"] == "xp":
        new_xp = user.get("total_xp", 0) + reward["value"]
        update_data["total_xp"] = new_xp
        reward_details["new_xp"] = new_xp
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {
        "reward": reward_details,
        "message": f"You got {reward['label']}!",
        "next_box_in": MYSTERY_BOX_TRIGGER
    }

# ============ CHARACTER CARDS ============
@router.get("/cards/collection")
async def get_card_collection(user: dict = Depends(get_current_user)):
    """Get user's card collection"""
    collected_cards = user.get("collected_cards", [])
    
    # Build collection stats per series
    collection = []
    total_cards = 0
    total_collected = 0
    
    for series_id, cards in CHARACTER_CARDS.items():
        series = await db.series.find_one({"id": series_id}, {"_id": 0, "title": 1, "thumbnail": 1})
        series_cards = []
        collected_count = 0
        
        for card in cards:
            is_collected = card["id"] in collected_cards
            if is_collected:
                collected_count += 1
                total_collected += 1
            series_cards.append({
                **card,
                "collected": is_collected
            })
        
        total_cards += len(cards)
        set_complete = collected_count == len(cards)
        
        collection.append({
            "series_id": series_id,
            "series_title": series["title"] if series else "Unknown",
            "series_thumbnail": series["thumbnail"] if series else None,
            "cards": series_cards,
            "collected_count": collected_count,
            "total_cards": len(cards),
            "set_complete": set_complete
        })
    
    return {
        "collection": collection,
        "total_collected": total_collected,
        "total_cards": total_cards,
        "completion_percent": round((total_collected / total_cards) * 100, 1) if total_cards > 0 else 0
    }

@router.post("/cards/draw/{series_id}")
async def draw_card(series_id: str, user: dict = Depends(get_current_user)):
    """Draw a random card after watching an episode (called automatically)"""
    if series_id not in CHARACTER_CARDS:
        raise HTTPException(status_code=400, detail="No cards for this series")
    
    collected_cards = user.get("collected_cards", [])
    series_cards = CHARACTER_CARDS[series_id]
    
    # Filter out already collected cards
    available_cards = [c for c in series_cards if c["id"] not in collected_cards]
    
    if not available_cards:
        return {"message": "You have all cards from this series!", "card": None, "already_complete": True}
    
    # Weighted random selection by rarity
    weights = [CARD_RARITY_WEIGHTS.get(c["rarity"], 50) for c in available_cards]
    selected_card = random.choices(available_cards, weights=weights, k=1)[0]
    
    # Award the card
    collected_cards.append(selected_card["id"])
    
    # Check if set is now complete
    set_complete = all(c["id"] in collected_cards for c in series_cards)
    
    update_data = {"collected_cards": collected_cards}
    badge_awarded = None
    
    # Award badge for completing set
    if set_complete:
        user_badges = user.get("badges", {})
        badge_id = f"collector_{series_id}"
        if badge_id not in user_badges:
            user_badges[badge_id] = {
                "earned_at": datetime.now(timezone.utc).isoformat(),
                "type": "card_collection"
            }
            update_data["badges"] = user_badges
            badge_awarded = badge_id
    
    await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    return {
        "card": selected_card,
        "is_new": True,
        "set_complete": set_complete,
        "badge_awarded": badge_awarded,
        "message": f"You got {selected_card['name']}!" + (" 🎉 Set complete!" if set_complete else "")
    }

# ============ WEEKLY WATCH LEADERBOARD ============
@router.get("/leaderboard/weekly")
async def get_weekly_leaderboard(user: dict = Depends(get_optional_user)):
    """Get weekly watch leaderboard - no coin rewards, just status"""
    now = datetime.now(timezone.utc)
    
    # Get start of current week (Monday)
    start_of_week = now - timedelta(days=now.weekday())
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    week_key = start_of_week.strftime("%Y-W%W")
    
    # Get top 50 users by weekly watch count
    pipeline = [
        {"$match": {f"weekly_watch.{week_key}": {"$exists": True}}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "name": 1,
            "weekly_episodes": f"$weekly_watch.{week_key}",
            "viewer_level": 1,
            "profile_frame": 1
        }},
        {"$sort": {"weekly_episodes": -1}},
        {"$limit": 50}
    ]
    
    leaderboard = await db.users.aggregate(pipeline).to_list(50)
    
    # Add ranks and determine badges
    for i, entry in enumerate(leaderboard):
        entry["rank"] = i + 1
        if i == 0:
            entry["badge"] = "weekly_champion"
            entry["badge_icon"] = "👑"
        elif i < 3:
            entry["badge"] = "weekly_top3"
            entry["badge_icon"] = "🏆"
        elif i < 10:
            entry["badge"] = "weekly_top10"
            entry["badge_icon"] = "⭐"
        else:
            entry["badge"] = None
            entry["badge_icon"] = None
    
    # Get current user's position if logged in
    user_rank = None
    user_episodes = 0
    if user:
        user_weekly = user.get("weekly_watch", {}).get(week_key, 0)
        user_episodes = user_weekly
        
        # Find user's rank
        count = await db.users.count_documents({
            f"weekly_watch.{week_key}": {"$gt": user_weekly}
        })
        user_rank = count + 1
    
    return {
        "week": week_key,
        "leaderboard": leaderboard,
        "user_rank": user_rank,
        "user_episodes": user_episodes,
        "rewards": [
            {"rank": "1st", "reward": "Weekly Champion Badge + Profile Crown", "icon": "👑"},
            {"rank": "2nd-3rd", "reward": "Top 3 Badge + Silver Border", "icon": "🏆"},
            {"rank": "4th-10th", "reward": "Top 10 Badge", "icon": "⭐"},
        ],
        "ends_in_days": 7 - now.weekday()
    }

@router.post("/leaderboard/weekly/claim")
async def claim_weekly_reward(user: dict = Depends(get_current_user)):
    """Claim weekly leaderboard reward (badge only, no coins)"""
    now = datetime.now(timezone.utc)
    
    # Get previous week
    start_of_last_week = now - timedelta(days=now.weekday() + 7)
    last_week_key = start_of_last_week.strftime("%Y-W%W")
    
    # Check if already claimed
    claimed_weeks = user.get("claimed_weekly_rewards", [])
    if last_week_key in claimed_weeks:
        raise HTTPException(status_code=400, detail="Already claimed this week's reward")
    
    # Get user's rank from last week
    user_episodes = user.get("weekly_watch", {}).get(last_week_key, 0)
    if user_episodes == 0:
        raise HTTPException(status_code=400, detail="No watch activity last week")
    
    count = await db.users.count_documents({
        f"weekly_watch.{last_week_key}": {"$gt": user_episodes}
    })
    rank = count + 1
    
    # Determine reward based on rank
    badge_id = None
    badge_name = None
    
    if rank == 1:
        badge_id = f"weekly_champion_{last_week_key}"
        badge_name = "Weekly Champion"
    elif rank <= 3:
        badge_id = f"weekly_top3_{last_week_key}"
        badge_name = "Weekly Top 3"
    elif rank <= 10:
        badge_id = f"weekly_top10_{last_week_key}"
        badge_name = "Weekly Top 10"
    else:
        raise HTTPException(status_code=400, detail="Rank not eligible for rewards (Top 10 only)")
    
    # Award badge
    user_badges = user.get("badges", {})
    user_badges[badge_id] = {
        "earned_at": now.isoformat(),
        "type": "weekly_leaderboard",
        "rank": rank,
        "week": last_week_key
    }
    claimed_weeks.append(last_week_key)
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"badges": user_badges, "claimed_weekly_rewards": claimed_weeks}}
    )
    
    return {
        "message": f"Claimed {badge_name} badge!",
        "badge": badge_id,
        "rank": rank,
        "week": last_week_key
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

