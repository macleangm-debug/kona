"""
Early Access Routes
Premium subscribers get episodes early
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from services import db, get_current_user
from models.early_access import (
    EarlyAccessTier, EARLY_ACCESS_HOURS,
    SetEarlyAccessRequest, SubscribeEarlyAccessRequest
)

router = APIRouter(prefix="/early-access", tags=["Early Access"])

# Pricing per tier (monthly)
TIER_PRICES = {
    EarlyAccessTier.BASIC: 100,    # 100 coins/month
    EarlyAccessTier.PREMIUM: 200,  # 200 coins/month
    EarlyAccessTier.VIP: 500       # 500 coins/month
}


@router.get("/tiers")
async def get_early_access_tiers():
    """Get available early access tiers"""
    tiers = []
    for tier in EarlyAccessTier:
        if tier != EarlyAccessTier.NONE:
            tiers.append({
                "tier": tier.value,
                "hours_early": EARLY_ACCESS_HOURS[tier],
                "price_per_month": TIER_PRICES.get(tier, 0),
                "label": tier.value.capitalize(),
                "description": f"Get episodes {EARLY_ACCESS_HOURS[tier]} hours early"
            })
    return {"tiers": tiers}


@router.post("/series/{series_id}/configure")
async def configure_series_early_access(
    series_id: str,
    request: SetEarlyAccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Configure early access settings for a series (creator only)"""
    series = await db.creator_series.find_one({
        "id": series_id,
        "creator_id": current_user["id"]
    })
    
    if not series:
        raise HTTPException(status_code=404, detail="Series not found or not owned by you")
    
    # Use custom hours if provided, otherwise use tier default
    hours = request.early_access_hours if request.early_access_hours is not None else EARLY_ACCESS_HOURS.get(request.early_access_tier, 0)
    
    await db.creator_series.update_one(
        {"id": series_id},
        {"$set": {
            "early_access_enabled": request.early_access_tier != EarlyAccessTier.NONE,
            "early_access_tier": request.early_access_tier,
            "early_access_hours": hours,
            "early_access_price_coins": request.early_access_price_coins or TIER_PRICES.get(request.early_access_tier, 0),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "success": True,
        "message": f"Early access configured: {hours} hours early",
        "early_access_tier": request.early_access_tier,
        "early_access_hours": hours
    }


@router.post("/episode/{episode_id}/configure")
async def configure_episode_early_access(
    episode_id: str,
    request: SetEarlyAccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Configure early access for a specific episode"""
    episode = await db.creator_episodes.find_one({
        "id": episode_id,
        "creator_id": current_user["id"]
    })
    
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found or not owned by you")
    
    hours = request.early_access_hours if request.early_access_hours is not None else EARLY_ACCESS_HOURS.get(request.early_access_tier, 0)
    
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {
            "early_access_enabled": request.early_access_tier != EarlyAccessTier.NONE,
            "early_access_hours": hours,
            "early_access_until": datetime.now(timezone.utc) + timedelta(hours=hours) if hours > 0 else None,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    return {
        "success": True,
        "message": f"Episode early access configured: {hours} hours",
        "early_access_hours": hours
    }


@router.post("/subscribe")
async def subscribe_to_early_access(
    request: SubscribeEarlyAccessRequest,
    current_user: dict = Depends(get_current_user)
):
    """Subscribe to early access for a creator or series"""
    # Get price
    price = TIER_PRICES.get(request.tier, 100) * (request.duration_days / 30)
    price = int(price)
    
    # Check balance
    if current_user.get("coins", 0) < price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient coins. Need {price}, have {current_user.get('coins', 0)}"
        )
    
    # Check if already subscribed
    existing = await db.early_access_subscriptions.find_one({
        "user_id": current_user["id"],
        "creator_id": request.creator_id,
        "series_id": request.series_id,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    })
    
    if existing:
        # Extend subscription
        new_expiry = existing["expires_at"] + timedelta(days=request.duration_days)
        await db.early_access_subscriptions.update_one(
            {"id": existing["id"]},
            {"$set": {"expires_at": new_expiry, "tier": request.tier}}
        )
        sub_id = existing["id"]
    else:
        # Create new subscription
        sub_id = str(uuid.uuid4())
        sub_doc = {
            "id": sub_id,
            "user_id": current_user["id"],
            "creator_id": request.creator_id,
            "series_id": request.series_id,
            "tier": request.tier,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=request.duration_days),
            "created_at": datetime.now(timezone.utc)
        }
        await db.early_access_subscriptions.insert_one(sub_doc)
    
    # Deduct coins
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"coins": -price}}
    )
    
    # Add coins to creator
    creator_share = int(price * 0.7)
    await db.users.update_one(
        {"id": request.creator_id},
        {"$inc": {"coins": creator_share}}
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "early_access_subscription",
        "from_user_id": current_user["id"],
        "to_user_id": request.creator_id,
        "amount": price,
        "creator_share": creator_share,
        "subscription_id": sub_id,
        "tier": request.tier,
        "duration_days": request.duration_days,
        "created_at": datetime.now(timezone.utc)
    })
    
    return {
        "success": True,
        "subscription_id": sub_id,
        "tier": request.tier,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=request.duration_days)).isoformat(),
        "price_paid": price
    }


@router.get("/my-subscriptions")
async def get_my_subscriptions(
    current_user: dict = Depends(get_current_user)
):
    """Get user's active early access subscriptions"""
    subs = await db.early_access_subscriptions.find({
        "user_id": current_user["id"],
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    }, {"_id": 0}).to_list(length=50)
    
    # Enrich with creator/series info
    for sub in subs:
        creator = await db.users.find_one({"id": sub["creator_id"]}, {"_id": 0, "username": 1, "name": 1})
        sub["creator_name"] = creator.get("username") or creator.get("name", "Creator") if creator else "Unknown"
        
        if sub.get("series_id"):
            series = await db.creator_series.find_one({"id": sub["series_id"]}, {"_id": 0, "title": 1})
            sub["series_title"] = series.get("title") if series else None
    
    return {"subscriptions": subs}


@router.get("/check/{creator_id}")
async def check_early_access(
    creator_id: str,
    series_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has early access to a creator's content"""
    query = {
        "user_id": current_user["id"],
        "creator_id": creator_id,
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    }
    
    # Check for series-specific or creator-wide subscription
    sub = await db.early_access_subscriptions.find_one(
        {**query, "$or": [{"series_id": series_id}, {"series_id": None}]},
        {"_id": 0}
    )
    
    if sub:
        return {
            "has_early_access": True,
            "tier": sub["tier"],
            "hours_early": EARLY_ACCESS_HOURS.get(EarlyAccessTier(sub["tier"]), 0),
            "expires_at": sub["expires_at"].isoformat()
        }
    
    return {"has_early_access": False}


@router.get("/creator/subscribers")
async def get_creator_subscribers(
    series_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get list of early access subscribers for creator"""
    query = {
        "creator_id": current_user["id"],
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    }
    if series_id:
        query["series_id"] = series_id
    
    subs = await db.early_access_subscriptions.find(query, {"_id": 0}).to_list(length=100)
    
    # Enrich with user info
    for sub in subs:
        user = await db.users.find_one({"id": sub["user_id"]}, {"_id": 0, "username": 1, "name": 1, "avatar": 1})
        if user:
            sub["user_name"] = user.get("username") or user.get("name", "User")
            sub["user_avatar"] = user.get("avatar")
    
    # Get stats
    total_subs = len(subs)
    tier_counts = {}
    for sub in subs:
        tier = sub.get("tier", "basic")
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    return {
        "subscribers": subs,
        "total": total_subs,
        "by_tier": tier_counts
    }
