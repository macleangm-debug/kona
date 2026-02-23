"""
Tip Jar / Super Coins Routes
Viewer tipping system for creators
"""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from services import db, get_current_user
from models.tips import (
    TipTier, TIP_AMOUNTS, TIP_EFFECTS,
    SendTipRequest
)

router = APIRouter(prefix="/tips", tags=["Tip Jar / Super Coins"])


@router.get("/tiers")
async def get_tip_tiers():
    """Get available tip tiers with amounts and effects"""
    tiers = []
    for tier in TipTier:
        tiers.append({
            "tier": tier.value,
            "amount": TIP_AMOUNTS[tier],
            "effect": TIP_EFFECTS[tier],
            "label": tier.value.capitalize()
        })
    return {"tiers": tiers}


@router.post("/send")
async def send_tip(
    request: SendTipRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a tip to a creator"""
    # Get tip amount
    amount = TIP_AMOUNTS.get(request.tier)
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid tip tier")
    
    # Check user balance
    user_balance = current_user.get("coins", 0)
    if user_balance < amount:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient coins. You have {user_balance}, need {amount}"
        )
    
    # Verify creator exists
    creator = await db.users.find_one({"id": request.creator_id}, {"_id": 0, "id": 1, "username": 1, "name": 1})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Can't tip yourself
    if request.creator_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot tip yourself")
    
    # Create tip record
    tip_id = str(uuid.uuid4())
    tip_doc = {
        "id": tip_id,
        "tipper_id": current_user["id"],
        "tipper_name": "Anonymous" if request.anonymous else (current_user.get("username") or current_user.get("name", "User")),
        "tipper_avatar": None if request.anonymous else current_user.get("avatar"),
        "creator_id": request.creator_id,
        "creator_name": creator.get("username") or creator.get("name", "Creator"),
        "series_id": request.series_id,
        "episode_id": request.episode_id,
        "tier": request.tier,
        "amount": amount,
        "message": request.message,
        "anonymous": request.anonymous,
        "effect": TIP_EFFECTS[request.tier],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.tips.insert_one(tip_doc)
    
    # Deduct from tipper's balance
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"coins": -amount}}
    )
    
    # Add to creator's earnings (they get 70% of tips)
    creator_share = int(amount * 0.7)
    await db.users.update_one(
        {"id": request.creator_id},
        {"$inc": {"coins": creator_share, "total_tips_received": amount}}
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "tip",
        "from_user_id": current_user["id"],
        "to_user_id": request.creator_id,
        "amount": amount,
        "creator_share": creator_share,
        "tip_id": tip_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Create notification for creator
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": request.creator_id,
        "type": "tip_received",
        "title": f"New {request.tier.value.capitalize()} Tip!",
        "message": f"{'Someone' if request.anonymous else tip_doc['tipper_name']} sent you a {amount} coin tip!" + (f" \"{request.message}\"" if request.message else ""),
        "data": {"tip_id": tip_id, "amount": amount, "tier": request.tier},
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    del tip_doc["_id"]
    
    # Get updated user balance
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "coins": 1})
    
    return {
        "success": True,
        "tip": tip_doc,
        "new_balance": updated_user.get("coins", 0),
        "message": f"Successfully sent {amount} coins to {creator.get('username') or creator.get('name')}!"
    }


@router.get("/creator/stats")
async def get_creator_tip_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get tip statistics for creator"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    
    creator_id = current_user["id"]
    
    # Total stats
    pipeline_total = [
        {"$match": {"creator_id": creator_id}},
        {"$group": {
            "_id": None,
            "total_tips": {"$sum": 1},
            "total_amount": {"$sum": "$amount"}
        }}
    ]
    total_result = await db.tips.aggregate(pipeline_total).to_list(length=1)
    total_stats = total_result[0] if total_result else {"total_tips": 0, "total_amount": 0}
    
    # Today stats
    pipeline_today = [
        {"$match": {"creator_id": creator_id, "created_at": {"$gte": today_start}}},
        {"$group": {
            "_id": None,
            "tips": {"$sum": 1},
            "amount": {"$sum": "$amount"}
        }}
    ]
    today_result = await db.tips.aggregate(pipeline_today).to_list(length=1)
    today_stats = today_result[0] if today_result else {"tips": 0, "amount": 0}
    
    # Week stats
    pipeline_week = [
        {"$match": {"creator_id": creator_id, "created_at": {"$gte": week_start}}},
        {"$group": {
            "_id": None,
            "tips": {"$sum": 1},
            "amount": {"$sum": "$amount"}
        }}
    ]
    week_result = await db.tips.aggregate(pipeline_week).to_list(length=1)
    week_stats = week_result[0] if week_result else {"tips": 0, "amount": 0}
    
    # Month stats
    pipeline_month = [
        {"$match": {"creator_id": creator_id, "created_at": {"$gte": month_start}}},
        {"$group": {
            "_id": None,
            "tips": {"$sum": 1},
            "amount": {"$sum": "$amount"}
        }}
    ]
    month_result = await db.tips.aggregate(pipeline_month).to_list(length=1)
    month_stats = month_result[0] if month_result else {"tips": 0, "amount": 0}
    
    # Top tipper
    pipeline_top = [
        {"$match": {"creator_id": creator_id, "anonymous": False}},
        {"$group": {
            "_id": "$tipper_id",
            "name": {"$first": "$tipper_name"},
            "avatar": {"$first": "$tipper_avatar"},
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        {"$sort": {"total": -1}},
        {"$limit": 1}
    ]
    top_result = await db.tips.aggregate(pipeline_top).to_list(length=1)
    top_tipper = None
    if top_result:
        top_tipper = {
            "user_id": top_result[0]["_id"],
            "username": top_result[0]["name"],
            "avatar": top_result[0]["avatar"],
            "total_amount": top_result[0]["total"],
            "tip_count": top_result[0]["count"]
        }
    
    # Recent tips
    recent_tips = await db.tips.find(
        {"creator_id": creator_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(length=10)
    
    return {
        "total_tips_received": total_stats.get("total_tips", 0),
        "total_coins_received": total_stats.get("total_amount", 0),
        "tips_today": today_stats.get("tips", 0),
        "coins_today": today_stats.get("amount", 0),
        "tips_this_week": week_stats.get("tips", 0),
        "coins_this_week": week_stats.get("amount", 0),
        "tips_this_month": month_stats.get("tips", 0),
        "coins_this_month": month_stats.get("amount", 0),
        "top_tipper": top_tipper,
        "recent_tips": recent_tips
    }


@router.get("/creator/{creator_id}/leaderboard")
async def get_creator_tipper_leaderboard(
    creator_id: str,
    limit: int = 10
):
    """Get top tippers for a specific creator"""
    pipeline = [
        {"$match": {"creator_id": creator_id, "anonymous": False}},
        {"$group": {
            "_id": "$tipper_id",
            "username": {"$first": "$tipper_name"},
            "avatar": {"$first": "$tipper_avatar"},
            "total_amount": {"$sum": "$amount"},
            "tip_count": {"$sum": 1}
        }},
        {"$sort": {"total_amount": -1}},
        {"$limit": limit}
    ]
    
    results = await db.tips.aggregate(pipeline).to_list(length=limit)
    
    leaderboard = []
    for i, entry in enumerate(results):
        leaderboard.append({
            "rank": i + 1,
            "user_id": entry["_id"],
            "username": entry["username"],
            "avatar": entry["avatar"],
            "total_amount": entry["total_amount"],
            "tip_count": entry["tip_count"]
        })
    
    return {"leaderboard": leaderboard, "creator_id": creator_id}


@router.get("/global/leaderboard")
async def get_global_tipper_leaderboard(
    timeframe: str = "all",  # all, month, week
    limit: int = 20
):
    """Get global top tippers leaderboard"""
    match_query = {"anonymous": False}
    
    now = datetime.now(timezone.utc)
    if timeframe == "week":
        week_start = now - timedelta(days=7)
        match_query["created_at"] = {"$gte": week_start}
    elif timeframe == "month":
        month_start = now - timedelta(days=30)
        match_query["created_at"] = {"$gte": month_start}
    
    pipeline = [
        {"$match": match_query},
        {"$group": {
            "_id": "$tipper_id",
            "username": {"$first": "$tipper_name"},
            "avatar": {"$first": "$tipper_avatar"},
            "total_amount": {"$sum": "$amount"},
            "tip_count": {"$sum": 1},
            "creators_supported": {"$addToSet": "$creator_id"}
        }},
        {"$addFields": {
            "creators_count": {"$size": "$creators_supported"}
        }},
        {"$sort": {"total_amount": -1}},
        {"$limit": limit}
    ]
    
    results = await db.tips.aggregate(pipeline).to_list(length=limit)
    
    leaderboard = []
    for i, entry in enumerate(results):
        leaderboard.append({
            "rank": i + 1,
            "user_id": entry["_id"],
            "username": entry["username"],
            "avatar": entry["avatar"],
            "total_amount": entry["total_amount"],
            "tip_count": entry["tip_count"],
            "creators_supported": entry["creators_count"]
        })
    
    return {"leaderboard": leaderboard, "timeframe": timeframe}


@router.get("/series/{series_id}/recent")
async def get_series_recent_tips(
    series_id: str,
    limit: int = 20
):
    """Get recent tips for a series (for live display)"""
    tips = await db.tips.find(
        {"series_id": series_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {"tips": tips, "series_id": series_id}


@router.get("/episode/{episode_id}/recent")
async def get_episode_recent_tips(
    episode_id: str,
    limit: int = 20
):
    """Get recent tips for an episode (for live display during playback)"""
    tips = await db.tips.find(
        {"episode_id": episode_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(length=limit)
    
    return {"tips": tips, "episode_id": episode_id}


@router.get("/user/history")
async def get_user_tip_history(
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get user's tip history (tips they've sent)"""
    tips = await db.tips.find(
        {"tipper_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.tips.count_documents({"tipper_id": current_user["id"]})
    
    # Calculate total spent
    pipeline = [
        {"$match": {"tipper_id": current_user["id"]}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    total_result = await db.tips.aggregate(pipeline).to_list(length=1)
    total_spent = total_result[0]["total"] if total_result else 0
    
    return {
        "tips": tips,
        "total": total,
        "total_spent": total_spent,
        "has_more": skip + len(tips) < total
    }
