"""
Revenue Distribution & Payout Management
- Editable expense rates and creator shares
- Distinguishes between purchased coins and free/reward coins
- Creator payout tracking
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from bson import ObjectId

from services import db, get_current_user

router = APIRouter(prefix="/revenue", tags=["Revenue Management"])

# ============ DEFAULT SETTINGS ============
DEFAULT_SETTINGS = {
    "expenses": {
        "payment_gateway": 4.0,      # 4%
        "cdn_hosting": 8.0,          # 8%
        "content_moderation": 3.0,   # 3%
        "total": 15.0                # 15% total
    },
    "creator_tiers": [
        {"name": "New Creator", "min_views": 0, "max_views": 10000, "share": 65},
        {"name": "Rising Star", "min_views": 10001, "max_views": 100000, "share": 68},
        {"name": "Verified Creator", "min_views": 100001, "max_views": 1000000, "share": 70},
        {"name": "Premium Partner", "min_views": 1000001, "max_views": None, "share": 75}
    ],
    "platform_share": 30,  # Default platform share (before tier adjustments)
    "free_coins_payout": False,  # Free/reward coins don't count for payouts
    "min_payout_threshold": 10.0,  # Minimum $10 to request payout
    "payout_cycle_days": 7  # Weekly payouts
}


# ============ MODELS ============
class ExpenseSettings(BaseModel):
    payment_gateway: float
    cdn_hosting: float
    content_moderation: float

class CreatorTier(BaseModel):
    name: str
    min_views: int
    max_views: Optional[int]
    share: float

class RevenueSettings(BaseModel):
    expenses: ExpenseSettings
    creator_tiers: List[CreatorTier]
    min_payout_threshold: float
    payout_cycle_days: int


# ============ SETTINGS ENDPOINTS ============
@router.get("/settings")
async def get_revenue_settings(user: dict = Depends(get_current_user)):
    """Get current revenue distribution settings"""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.settings.find_one({"type": "revenue"})
    if not settings:
        # Return defaults if not configured
        return DEFAULT_SETTINGS
    
    # Remove MongoDB _id
    settings.pop("_id", None)
    settings.pop("type", None)
    return settings


@router.put("/settings")
async def update_revenue_settings(settings: RevenueSettings, user: dict = Depends(get_current_user)):
    """Update revenue distribution settings (Admin only)"""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Calculate total expenses
    total_expenses = (
        settings.expenses.payment_gateway + 
        settings.expenses.cdn_hosting + 
        settings.expenses.content_moderation
    )
    
    if total_expenses > 50:
        raise HTTPException(status_code=400, detail="Total expenses cannot exceed 50%")
    
    settings_dict = {
        "type": "revenue",
        "expenses": {
            "payment_gateway": settings.expenses.payment_gateway,
            "cdn_hosting": settings.expenses.cdn_hosting,
            "content_moderation": settings.expenses.content_moderation,
            "total": total_expenses
        },
        "creator_tiers": [t.dict() for t in settings.creator_tiers],
        "min_payout_threshold": settings.min_payout_threshold,
        "payout_cycle_days": settings.payout_cycle_days,
        "free_coins_payout": False,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": user["id"]
    }
    
    await db.settings.update_one(
        {"type": "revenue"},
        {"$set": settings_dict},
        upsert=True
    )
    
    return {"success": True, "message": "Revenue settings updated", "settings": settings_dict}


# ============ EXPENSE MANAGEMENT ============
@router.get("/expenses")
async def get_expenses(user: dict = Depends(get_current_user)):
    """Get expense breakdown"""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.settings.find_one({"type": "revenue"})
    expenses = settings.get("expenses") if settings else DEFAULT_SETTINGS["expenses"]
    
    return {
        "expenses": expenses,
        "description": {
            "payment_gateway": "Stripe, Flutterwave, M-Pesa transaction fees",
            "cdn_hosting": "Video streaming, storage, bandwidth costs",
            "content_moderation": "Review, compliance, and legal costs"
        }
    }


@router.put("/expenses")
async def update_expenses(expenses: ExpenseSettings, user: dict = Depends(get_current_user)):
    """Update expense percentages"""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total = expenses.payment_gateway + expenses.cdn_hosting + expenses.content_moderation
    
    if total > 50:
        raise HTTPException(status_code=400, detail="Total expenses cannot exceed 50%")
    
    await db.settings.update_one(
        {"type": "revenue"},
        {"$set": {
            "expenses": {
                "payment_gateway": expenses.payment_gateway,
                "cdn_hosting": expenses.cdn_hosting,
                "content_moderation": expenses.content_moderation,
                "total": total
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "total_expenses": total}


# ============ CREATOR TIERS ============
@router.get("/tiers")
async def get_creator_tiers(user: dict = Depends(get_current_user)):
    """Get creator tier configuration"""
    settings = await db.settings.find_one({"type": "revenue"})
    tiers = settings.get("creator_tiers") if settings else DEFAULT_SETTINGS["creator_tiers"]
    
    return {"tiers": tiers}


@router.put("/tiers")
async def update_creator_tiers(tiers: List[CreatorTier], user: dict = Depends(get_current_user)):
    """Update creator tier configuration"""
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate tiers
    for tier in tiers:
        if tier.share < 0 or tier.share > 100:
            raise HTTPException(status_code=400, detail=f"Invalid share for {tier.name}")
    
    await db.settings.update_one(
        {"type": "revenue"},
        {"$set": {
            "creator_tiers": [t.dict() for t in tiers],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "tiers": [t.dict() for t in tiers]}


# ============ REVENUE CALCULATOR ============
@router.post("/calculate")
async def calculate_revenue(
    gross_revenue: float,
    total_views: int = 0,
    user: dict = Depends(get_current_user)
):
    """Calculate revenue distribution for a given amount"""
    settings = await db.settings.find_one({"type": "revenue"})
    if not settings:
        settings = DEFAULT_SETTINGS
    
    expenses = settings.get("expenses", DEFAULT_SETTINGS["expenses"])
    tiers = settings.get("creator_tiers", DEFAULT_SETTINGS["creator_tiers"])
    
    # Find applicable tier
    creator_share_percent = 65  # Default
    tier_name = "New Creator"
    for tier in tiers:
        max_views = tier.get("max_views") or float('inf')
        if tier["min_views"] <= total_views <= max_views:
            creator_share_percent = tier["share"]
            tier_name = tier["name"]
            break
    
    # Calculate
    expense_amount = gross_revenue * (expenses["total"] / 100)
    net_revenue = gross_revenue - expense_amount
    creator_amount = net_revenue * (creator_share_percent / 100)
    platform_amount = net_revenue - creator_amount
    
    return {
        "gross_revenue": round(gross_revenue, 2),
        "expenses": {
            "total_percent": expenses["total"],
            "amount": round(expense_amount, 2),
            "breakdown": {
                "payment_gateway": round(gross_revenue * (expenses["payment_gateway"] / 100), 2),
                "cdn_hosting": round(gross_revenue * (expenses["cdn_hosting"] / 100), 2),
                "content_moderation": round(gross_revenue * (expenses["content_moderation"] / 100), 2)
            }
        },
        "net_revenue": round(net_revenue, 2),
        "creator": {
            "tier": tier_name,
            "share_percent": creator_share_percent,
            "amount": round(creator_amount, 2)
        },
        "platform": {
            "share_percent": round(100 - creator_share_percent, 1),
            "amount": round(platform_amount, 2)
        }
    }


# ============ CREATOR EARNINGS ============
@router.get("/creator/{creator_id}/earnings")
async def get_creator_earnings(creator_id: str, user: dict = Depends(get_current_user)):
    """Get earnings for a specific creator"""
    # Check if user is the creator or admin
    if user["id"] != creator_id and not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Access denied")
    
    creator = await db.users.find_one({"id": creator_id})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    # Get creator's content stats
    series = await db.series.find({"creator_id": creator_id}).to_list(100)
    
    total_views = sum(s.get("total_views", 0) for s in series)
    total_episodes = sum(s.get("total_episodes", 0) for s in series)
    
    # Get revenue settings
    settings = await db.settings.find_one({"type": "revenue"})
    if not settings:
        settings = DEFAULT_SETTINGS
    
    tiers = settings.get("creator_tiers", DEFAULT_SETTINGS["creator_tiers"])
    expenses = settings.get("expenses", DEFAULT_SETTINGS["expenses"])
    
    # Find tier
    current_tier = tiers[0]
    next_tier = tiers[1] if len(tiers) > 1 else None
    for i, tier in enumerate(tiers):
        max_views = tier.get("max_views") or float('inf')
        if tier["min_views"] <= total_views <= max_views:
            current_tier = tier
            next_tier = tiers[i + 1] if i + 1 < len(tiers) else None
            break
    
    # Calculate earnings (from purchased coins only)
    purchased_earnings = creator.get("purchased_coin_earnings", 0)
    pending_payout = creator.get("pending_payout", 0)
    total_paid = creator.get("total_paid_out", 0)
    
    # Calculate what they'd earn on $100
    sample_gross = 100
    expense_amount = sample_gross * (expenses["total"] / 100)
    net = sample_gross - expense_amount
    creator_sample = net * (current_tier["share"] / 100)
    
    return {
        "creator_id": creator_id,
        "stats": {
            "total_views": total_views,
            "total_series": len(series),
            "total_episodes": total_episodes
        },
        "tier": {
            "current": current_tier,
            "next": next_tier,
            "views_to_next": (next_tier["min_views"] - total_views) if next_tier else 0
        },
        "earnings": {
            "from_purchases": round(purchased_earnings, 2),
            "pending_payout": round(pending_payout, 2),
            "total_paid": round(total_paid, 2),
            "note": "Only purchased coins count - free/reward coins excluded"
        },
        "rate_example": {
            "per_100_gross": round(creator_sample, 2),
            "expense_deduction": round(expense_amount, 2),
            "your_share_percent": current_tier["share"]
        }
    }


# ============ PAYOUT DASHBOARD ============
@router.get("/payouts")
async def get_all_payouts(user: dict = Depends(get_current_user)):
    """Get all pending and completed payouts (Admin only)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    payouts = await db.payouts.find().sort("created_at", -1).to_list(100)
    
    # Remove _id from each
    for p in payouts:
        p["_id"] = str(p["_id"])
    
    pending_total = sum(p["amount"] for p in payouts if p.get("status") == "pending")
    completed_total = sum(p["amount"] for p in payouts if p.get("status") == "completed")
    
    return {
        "payouts": payouts,
        "summary": {
            "pending_count": len([p for p in payouts if p.get("status") == "pending"]),
            "pending_total": round(pending_total, 2),
            "completed_count": len([p for p in payouts if p.get("status") == "completed"]),
            "completed_total": round(completed_total, 2)
        }
    }


@router.get("/payouts/pending")
async def get_pending_payouts(user: dict = Depends(get_current_user)):
    """Get creators with pending payouts"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all creators with pending payouts
    creators = await db.users.find({
        "pending_payout": {"$gt": 0}
    }).to_list(100)
    
    settings = await db.settings.find_one({"type": "revenue"})
    min_threshold = settings.get("min_payout_threshold", 10) if settings else 10
    
    pending_list = []
    for c in creators:
        pending_list.append({
            "creator_id": c["id"],
            "name": c.get("name", "Unknown"),
            "email": c.get("email"),
            "pending_amount": round(c.get("pending_payout", 0), 2),
            "eligible": c.get("pending_payout", 0) >= min_threshold,
            "payout_method": c.get("payout_method", "Not set")
        })
    
    return {
        "pending_payouts": pending_list,
        "min_threshold": min_threshold,
        "total_pending": round(sum(p["pending_amount"] for p in pending_list), 2)
    }


# ============ COIN TYPE TRACKING ============
@router.get("/coin-sources")
async def get_coin_sources(user: dict = Depends(get_current_user)):
    """Get breakdown of coin sources (purchased vs free)"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Aggregate coin sources
    pipeline = [
        {"$group": {
            "_id": None,
            "total_purchased": {"$sum": "$purchased_coins"},
            "total_free": {"$sum": "$free_coins_earned"},
            "total_referral": {"$sum": "$referral_coins"},
            "total_current": {"$sum": "$coins"}
        }}
    ]
    
    result = await db.users.aggregate(pipeline).to_list(1)
    
    if result:
        data = result[0]
        return {
            "purchased_coins": data.get("total_purchased", 0),
            "free_reward_coins": data.get("total_free", 0),
            "referral_coins": data.get("total_referral", 0),
            "currently_held": data.get("total_current", 0),
            "note": "Only purchased coins generate creator payouts"
        }
    
    return {
        "purchased_coins": 0,
        "free_reward_coins": 0,
        "referral_coins": 0,
        "currently_held": 0
    }
