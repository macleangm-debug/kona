"""
Referral and milestone routes
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends

from services import db, get_current_user
from config.settings import (
    REFERRAL_REWARD_REFERRER, 
    REFERRAL_REWARD_REFEREE,
    REFERRAL_MILESTONES
)

router = APIRouter(prefix="/referral", tags=["Referral"])

@router.get("/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """Get user's referral statistics"""
    referrals = await db.referrals.find(
        {"referrer_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    referral_count = user.get("referral_count", 0)
    claimed_milestones = user.get("claimed_milestones", [])
    
    # Find next milestone
    next_milestone = None
    for m in REFERRAL_MILESTONES:
        if referral_count < m["required_referrals"]:
            next_milestone = {
                **m,
                "progress": referral_count,
                "remaining": m["required_referrals"] - referral_count
            }
            break
    
    return {
        "referral_code": user.get("referral_code"),
        "total_referrals": referral_count,
        "total_earnings": user.get("referral_earnings", 0),
        "reward_per_referral": REFERRAL_REWARD_REFERRER,
        "referee_bonus": REFERRAL_REWARD_REFEREE,
        "claimed_milestones": claimed_milestones,
        "next_milestone": next_milestone,
        "recent_referrals": [
            {
                "email": r["referee_email"][:3] + "***" + r["referee_email"][r["referee_email"].index("@"):],
                "reward": r["referrer_reward"],
                "date": r["created_at"]
            }
            for r in referrals[:5]
        ]
    }

@router.get("/validate/{code}")
async def validate_referral_code(code: str):
    """Validate a referral code"""
    user = await db.users.find_one({"referral_code": code.upper()})
    if user:
        return {
            "valid": True,
            "referrer_name": user["name"].split()[0],
            "bonus_coins": REFERRAL_REWARD_REFEREE
        }
    return {"valid": False}

@router.get("/leaderboard")
async def get_referral_leaderboard(period: str = "weekly"):
    """Get top referrers with period filter (weekly, monthly, all-time)"""
    from datetime import datetime, timezone, timedelta
    
    # Calculate date filter based on period
    now = datetime.now(timezone.utc)
    date_filter = {}
    
    if period == "weekly":
        # Start of current week (Monday)
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_of_week.isoformat()}}
    elif period == "monthly":
        # Start of current month
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        date_filter = {"created_at": {"$gte": start_of_month.isoformat()}}
    # all-time: no filter
    
    # Aggregate referrals by referrer
    pipeline = [
        {"$match": date_filter} if date_filter else {"$match": {}},
        {"$group": {
            "_id": "$referrer_id",
            "referrals": {"$sum": 1},
            "earnings": {"$sum": "$referrer_reward"}
        }},
        {"$sort": {"referrals": -1}},
        {"$limit": 20}
    ]
    
    if date_filter:
        pipeline[0] = {"$match": date_filter}
    else:
        pipeline.pop(0)
    
    referral_stats = await db.referrals.aggregate(pipeline).to_list(20)
    
    # Get user details for top referrers
    result = []
    for stat in referral_stats:
        user = await db.users.find_one({"id": stat["_id"]}, {"_id": 0, "id": 1, "name": 1})
        if user:
            # Anonymize name (First name + Last initial)
            name_parts = user.get("name", "User").split()
            display_name = name_parts[0]
            if len(name_parts) > 1:
                display_name += " " + name_parts[-1][0] + "."
            
            result.append({
                "user_id": user["id"],
                "name": display_name,
                "referrals": stat["referrals"],
                "earnings": stat.get("earnings", 0)
            })
    
    return result

@router.get("/milestones")
async def get_milestones(user: dict = Depends(get_current_user)):
    """Get user's milestone progress"""
    referral_count = user.get("referral_count", 0)
    claimed_milestones = user.get("claimed_milestones", [])
    
    milestones_with_status = []
    for milestone in REFERRAL_MILESTONES:
        is_reached = referral_count >= milestone["required_referrals"]
        is_claimed = milestone["id"] in claimed_milestones
        
        milestones_with_status.append({
            **milestone,
            "is_reached": is_reached,
            "is_claimed": is_claimed,
            "can_claim": is_reached and not is_claimed,
            "progress": min(referral_count, milestone["required_referrals"]),
            "progress_percent": min(100, (referral_count / milestone["required_referrals"]) * 100)
        })
    
    # Find next milestone
    next_milestone = None
    for m in milestones_with_status:
        if not m["is_reached"]:
            next_milestone = m
            break
    
    return {
        "referral_count": referral_count,
        "milestones": milestones_with_status,
        "next_milestone": next_milestone,
        "total_milestone_earnings": sum(m["reward_coins"] for m in REFERRAL_MILESTONES if m["id"] in claimed_milestones)
    }

@router.post("/milestones/{milestone_id}/claim")
async def claim_milestone(milestone_id: str, user: dict = Depends(get_current_user)):
    """Claim a milestone reward"""
    milestone = next((m for m in REFERRAL_MILESTONES if m["id"] == milestone_id), None)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    referral_count = user.get("referral_count", 0)
    claimed_milestones = user.get("claimed_milestones", [])
    
    if milestone_id in claimed_milestones:
        raise HTTPException(status_code=400, detail="Milestone already claimed")
    
    if referral_count < milestone["required_referrals"]:
        raise HTTPException(status_code=400, detail=f"Need {milestone['required_referrals']} referrals to claim this milestone")
    
    new_coins = user["coins"] + milestone["reward_coins"]
    claimed_milestones.append(milestone_id)
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "coins": new_coins,
                "claimed_milestones": claimed_milestones
            },
            "$inc": {
                "referral_earnings": milestone["reward_coins"]
            }
        }
    )
    
    # Log the milestone claim
    milestone_record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "milestone_id": milestone_id,
        "milestone_name": milestone["name"],
        "reward_coins": milestone["reward_coins"],
        "claimed_at": datetime.now(timezone.utc).isoformat()
    }
    await db.milestone_claims.insert_one(milestone_record)
    
    return {
        "message": f"Congratulations! You claimed the {milestone['name']} milestone!",
        "coins_earned": milestone["reward_coins"],
        "total_coins": new_coins,
        "milestone": milestone
    }

@router.get("/milestone-proximity")
async def get_milestone_proximity(user: dict = Depends(get_current_user)):
    """Check if user is close to next milestone (for notification triggers)"""
    referral_count = user.get("referral_count", 0)
    claimed_milestones = user.get("claimed_milestones", [])
    
    # Find next unclaimed milestone
    next_milestone = None
    for m in REFERRAL_MILESTONES:
        if m["id"] not in claimed_milestones:
            next_milestone = m
            break
    
    if not next_milestone:
        return {"has_notification": False, "all_claimed": True}
    
    remaining = next_milestone["required_referrals"] - referral_count
    
    # Trigger notification when within 3 referrals
    PROXIMITY_THRESHOLD = 3
    
    if remaining <= PROXIMITY_THRESHOLD and remaining > 0:
        return {
            "has_notification": True,
            "notification_type": "milestone_proximity",
            "milestone": next_milestone,
            "referrals_remaining": remaining,
            "current_referrals": referral_count,
            "message": f"Only {remaining} more referral{'s' if remaining > 1 else ''} to unlock {next_milestone['icon']} {next_milestone['name']}!",
            "reward_coins": next_milestone["reward_coins"]
        }
    
    if remaining <= 0:
        return {
            "has_notification": True,
            "notification_type": "milestone_claimable",
            "milestone": next_milestone,
            "message": f"🎉 You can claim your {next_milestone['icon']} {next_milestone['name']} milestone reward!",
            "reward_coins": next_milestone["reward_coins"]
        }
    
    return {
        "has_notification": False,
        "next_milestone": next_milestone,
        "referrals_remaining": remaining,
        "current_referrals": referral_count
    }
