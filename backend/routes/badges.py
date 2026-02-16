"""
Achievement Badges routes
"""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

from services import db, get_current_user

router = APIRouter(prefix="/badges", tags=["Badges"])

# Badge Definitions
BADGES = [
    {
        "id": "first_steps",
        "name": "First Steps",
        "description": "Watch your first episode",
        "icon": "sparkles",
        "color": "from-blue-500 to-cyan-500",
        "criteria": {"type": "episodes_watched", "target": 1},
        "reward_coins": 3
    },
    {
        "id": "marathon_master",
        "name": "Marathon Master",
        "description": "Watch 10+ episodes in one day",
        "icon": "flame",
        "color": "from-orange-500 to-red-500",
        "criteria": {"type": "episodes_in_day", "target": 10},
        "reward_coins": 10
    },
    {
        "id": "early_adopter",
        "name": "Early Adopter",
        "description": "Joined in the first 3 months",
        "icon": "star",
        "color": "from-yellow-400 to-amber-500",
        "criteria": {"type": "early_signup", "target": 90},
        "reward_coins": 15
    },
    {
        "id": "super_referrer",
        "name": "Super Referrer",
        "description": "Refer 10+ friends",
        "icon": "crown",
        "color": "from-purple-500 to-pink-500",
        "criteria": {"type": "referrals", "target": 10},
        "reward_coins": 25
    },
    {
        "id": "series_slayer",
        "name": "Series Slayer",
        "description": "Complete 5 full series",
        "icon": "film",
        "color": "from-green-500 to-emerald-500",
        "criteria": {"type": "series_completed", "target": 5},
        "reward_coins": 10
    },
    {
        "id": "vip_member",
        "name": "VIP Member",
        "description": "Subscribe to any VIP plan",
        "icon": "diamond",
        "color": "from-cyan-400 to-blue-500",
        "criteria": {"type": "subscription", "target": 1},
        "reward_coins": 0
    },
    {
        "id": "mission_ace",
        "name": "Mission Ace",
        "description": "Complete 50 daily missions",
        "icon": "target",
        "color": "from-red-500 to-rose-500",
        "criteria": {"type": "missions_completed", "target": 50},
        "reward_coins": 15
    },
    {
        "id": "night_owl",
        "name": "Night Owl",
        "description": "Watch 5+ episodes after midnight",
        "icon": "moon",
        "color": "from-indigo-500 to-purple-600",
        "criteria": {"type": "night_episodes", "target": 5},
        "reward_coins": 5
    },
    {
        "id": "big_spender",
        "name": "Big Spender",
        "description": "Purchase 1000+ coins total",
        "icon": "coins",
        "color": "from-yellow-500 to-orange-500",
        "criteria": {"type": "coins_purchased", "target": 1000},
        "reward_coins": 0
    },
    {
        "id": "loyal_viewer",
        "name": "Loyal Viewer",
        "description": "Maintain a 30-day login streak",
        "icon": "refresh",
        "color": "from-teal-500 to-green-500",
        "criteria": {"type": "login_streak", "target": 30},
        "reward_coins": 20
    }
]

class FeaturedBadgesUpdate(BaseModel):
    badge_ids: List[str]

@router.get("/all")
async def get_all_badges():
    """Get all available badges"""
    return BADGES

@router.get("/my-badges")
async def get_user_badges(user: dict = Depends(get_current_user)):
    """Get user's earned badges with progress"""
    earned_badges = user.get("badges", [])
    featured_badges = user.get("featured_badges", [])
    
    # Calculate progress for each badge
    badges_with_progress = []
    for badge in BADGES:
        badge_data = {
            **badge,
            "earned": badge["id"] in earned_badges,
            "featured": badge["id"] in featured_badges,
            "earned_at": None,
            "progress": 0,
            "progress_percent": 0
        }
        
        # Get earned date if earned
        if badge["id"] in earned_badges:
            badge_record = await db.user_badges.find_one({
                "user_id": user["id"],
                "badge_id": badge["id"]
            }, {"_id": 0})
            if badge_record:
                badge_data["earned_at"] = badge_record.get("earned_at")
        
        # Calculate progress
        progress = await calculate_badge_progress(user, badge)
        badge_data["progress"] = progress
        badge_data["progress_percent"] = min(100, (progress / badge["criteria"]["target"]) * 100)
        
        badges_with_progress.append(badge_data)
    
    return {
        "badges": badges_with_progress,
        "total_earned": len(earned_badges),
        "total_available": len(BADGES),
        "featured_badges": featured_badges
    }

@router.put("/featured")
async def update_featured_badges(data: FeaturedBadgesUpdate, user: dict = Depends(get_current_user)):
    """Update user's featured badges (max 3)"""
    if len(data.badge_ids) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 featured badges allowed")
    
    # Verify user has earned these badges
    earned_badges = user.get("badges", [])
    for badge_id in data.badge_ids:
        if badge_id not in earned_badges:
            raise HTTPException(status_code=400, detail=f"Badge '{badge_id}' not earned yet")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"featured_badges": data.badge_ids}}
    )
    
    return {"message": "Featured badges updated", "featured_badges": data.badge_ids}

@router.post("/check")
async def check_and_award_badges(user: dict = Depends(get_current_user)):
    """Check and award any newly earned badges"""
    earned_badges = user.get("badges", [])
    newly_earned = []
    total_reward = 0
    
    for badge in BADGES:
        if badge["id"] in earned_badges:
            continue
        
        progress = await calculate_badge_progress(user, badge)
        if progress >= badge["criteria"]["target"]:
            # Award badge
            earned_badges.append(badge["id"])
            newly_earned.append(badge)
            total_reward += badge["reward_coins"]
            
            # Record badge earn
            await db.user_badges.insert_one({
                "id": str(uuid.uuid4()),
                "user_id": user["id"],
                "badge_id": badge["id"],
                "earned_at": datetime.now(timezone.utc).isoformat()
            })
    
    if newly_earned:
        # Update user badges and coins
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {"badges": earned_badges},
                "$inc": {"coins": total_reward}
            }
        )
    
    return {
        "newly_earned": newly_earned,
        "total_reward": total_reward,
        "total_badges": len(earned_badges)
    }

async def calculate_badge_progress(user: dict, badge: dict) -> int:
    """Calculate progress towards a badge"""
    criteria = badge["criteria"]
    criteria_type = criteria["type"]
    
    if criteria_type == "episodes_watched":
        return user.get("total_episodes_watched", 0)
    
    elif criteria_type == "episodes_in_day":
        # Check today's episode count
        today = datetime.now(timezone.utc).date().isoformat()
        daily_stats = user.get("daily_watch_stats", {})
        return daily_stats.get(today, 0)
    
    elif criteria_type == "early_signup":
        # Check if user signed up within first 90 days of app launch
        # App launch date: January 1, 2026
        app_launch = datetime(2026, 1, 1, tzinfo=timezone.utc)
        user_created = datetime.fromisoformat(user.get("created_at", datetime.now(timezone.utc).isoformat()).replace("Z", "+00:00"))
        days_since_launch = (user_created - app_launch).days
        if days_since_launch <= criteria["target"]:
            return criteria["target"]  # Eligible
        return 0
    
    elif criteria_type == "referrals":
        return user.get("referral_count", 0)
    
    elif criteria_type == "series_completed":
        return user.get("series_completed", 0)
    
    elif criteria_type == "subscription":
        if user.get("subscription_tier"):
            return 1
        return 0
    
    elif criteria_type == "missions_completed":
        return user.get("missions_completed", 0)
    
    elif criteria_type == "night_episodes":
        return user.get("night_episodes_watched", 0)
    
    elif criteria_type == "coins_purchased":
        return user.get("total_coins_purchased", 0)
    
    elif criteria_type == "login_streak":
        return user.get("max_login_streak", user.get("login_streak", 0))
    
    return 0

@router.get("/leaderboard")
async def get_badge_leaderboard():
    """Get users with most badges"""
    pipeline = [
        {"$match": {"badges": {"$exists": True, "$ne": []}}},
        {"$project": {
            "_id": 0,
            "id": 1,
            "name": 1,
            "badges": 1,
            "badge_count": {"$size": "$badges"}
        }},
        {"$sort": {"badge_count": -1}},
        {"$limit": 10}
    ]
    
    top_users = await db.users.aggregate(pipeline).to_list(10)
    
    return [
        {
            "name": u["name"].split()[0] + (" " + u["name"].split()[-1][0] + "." if len(u["name"].split()) > 1 else ""),
            "badge_count": u["badge_count"],
            "badges": u["badges"][:3]  # Show top 3 badges
        }
        for u in top_users
    ]
