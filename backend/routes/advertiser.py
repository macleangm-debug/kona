"""
Advertiser/Business Portal Routes
Handles advertiser registration, campaign management, and ad operations
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
import jwt
import os

from services import db
from services.auth import get_current_user

router = APIRouter(tags=["Advertiser"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "kona-secret-key-2025")

# ============ MODELS ============

class AdvertiserRegister(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    contact_name: str
    phone: Optional[str] = None
    website: Optional[str] = None
    industry: Optional[str] = None

class AdvertiserLogin(BaseModel):
    email: EmailStr
    password: str

class CampaignCreate(BaseModel):
    name: str
    campaign_type: str  # "cpv", "monthly", "sponsorship", "takeover"
    budget: float
    daily_budget: Optional[float] = None
    start_date: str
    end_date: Optional[str] = None
    targeting: Optional[dict] = None  # { genre: [], age_range: [], countries: [] }
    ad_placements: List[str] = ["pre_roll"]  # pre_roll, mid_roll, overlay, story

class AdCreativeCreate(BaseModel):
    campaign_id: str
    name: str
    creative_type: str  # "video", "image", "overlay"
    media_url: str
    duration: Optional[int] = None  # seconds
    click_url: Optional[str] = None
    call_to_action: Optional[str] = "Learn More"

# ============ PRICING TIERS ============
PRICING_TIERS = {
    "basic": {
        "name": "Basic (CPV)",
        "description": "Pay per view - Only pay for actual eyeballs",
        "cpv_rate": 0.02,  # $0.02 per completed view
        "monthly_fee": 0,
        "min_budget": 50,
        "features": ["Pre-roll ads", "Basic analytics", "Self-serve dashboard"]
    },
    "pro": {
        "name": "Pro (Monthly + CPV)",
        "description": "Predictable base + volume bonus",
        "cpv_rate": 0.01,  # Reduced rate
        "monthly_fee": 500,
        "min_budget": 500,
        "features": ["All Basic features", "Mid-roll ads", "A/B testing", "Priority support", "Audience insights"]
    },
    "premium": {
        "name": "Premium (Sponsorship)",
        "description": "High-margin brand exclusivity",
        "cpv_rate": 0.005,
        "monthly_fee": 2000,
        "min_budget": 2000,
        "features": ["All Pro features", "Series sponsorship", "Custom audiences", "Brand safety controls", "Dedicated manager"]
    },
    "enterprise": {
        "name": "Enterprise (Full Takeover)",
        "description": "Maximum exclusivity = maximum visibility",
        "cpv_rate": 0,  # Flat fee
        "monthly_fee": 5000,
        "min_budget": 5000,
        "features": ["All Premium features", "Story takeover", "Genre exclusivity", "Lookalike audiences", "Retargeting pixels", "White-glove service"]
    }
}

# ============ HELPERS ============

def get_advertiser_token(advertiser_id: str, company_name: str):
    """Create JWT token for advertiser"""
    payload = {
        "advertiser_id": advertiser_id,
        "company_name": company_name,
        "type": "advertiser",
        "exp": datetime.now(timezone.utc).timestamp() + (24 * 60 * 60 * 30)  # 30 days
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

async def require_advertiser(request):
    """Extract and verify advertiser from request"""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization token")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "advertiser":
            raise HTTPException(status_code=403, detail="Not an advertiser account")
        
        advertiser = await db.advertisers.find_one({"id": payload["advertiser_id"]}, {"_id": 0})
        if not advertiser:
            raise HTTPException(status_code=404, detail="Advertiser not found")
        return advertiser
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ AUTH ROUTES ============

@router.post("/advertiser/register")
async def register_advertiser(data: AdvertiserRegister):
    """Register a new advertiser/business account"""
    # Check if email already exists
    existing = await db.advertisers.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    advertiser_id = f"adv-{uuid.uuid4().hex[:12]}"
    hashed_password = pwd_context.hash(data.password)
    
    advertiser = {
        "id": advertiser_id,
        "company_name": data.company_name,
        "email": data.email.lower(),
        "password": hashed_password,
        "contact_name": data.contact_name,
        "phone": data.phone,
        "website": data.website,
        "industry": data.industry,
        "tier": "basic",  # Start with basic tier
        "status": "pending",  # pending, active, suspended
        "balance": 0.0,
        "total_spent": 0.0,
        "campaigns_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    await db.advertisers.insert_one(advertiser)
    
    # Remove password from response
    advertiser.pop("password", None)
    token = get_advertiser_token(advertiser_id, data.company_name)
    
    return {
        "message": "Advertiser account created successfully",
        "token": token,
        "advertiser": advertiser
    }

@router.post("/advertiser/login")
async def login_advertiser(data: AdvertiserLogin):
    """Login as advertiser"""
    advertiser = await db.advertisers.find_one({"email": data.email.lower()})
    if not advertiser:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not pwd_context.verify(data.password, advertiser["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if advertiser.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended. Contact support.")
    
    token = get_advertiser_token(advertiser["id"], advertiser["company_name"])
    
    # Remove password from response
    advertiser.pop("password", None)
    advertiser.pop("_id", None)
    
    return {
        "token": token,
        "advertiser": advertiser
    }

@router.get("/advertiser/me")
async def get_advertiser_profile(request: Request):
    """Get current advertiser profile"""
    advertiser = await require_advertiser(request)
    return advertiser

# ============ PRICING ROUTES ============

@router.get("/advertiser/pricing")
async def get_pricing_tiers():
    """Get all available pricing tiers and prepay requirements"""
    return {
        "tiers": PRICING_TIERS,
        "prepay_requirements": {
            "minimum_deposit": MIN_WALLET_BALANCE,
            "currency": "USD",
            "note": "Funds must be added before creating campaigns"
        },
        "ad_placements": {
            "pre_roll": {
                "name": "Pre-roll",
                "description": "5-10 second ad before video starts",
                "skip_after": 3,
                "available_tiers": ["basic", "pro", "premium", "enterprise"]
            },
            "mid_roll": {
                "name": "Mid-roll",
                "description": "Ad during video at 25%, 50%, or 75%",
                "available_tiers": ["pro", "premium", "enterprise"]
            },
            "overlay": {
                "name": "Overlay Banner",
                "description": "8-second dismissible banner overlay",
                "available_tiers": ["pro", "premium", "enterprise"]
            },
            "story": {
                "name": "Story Ad",
                "description": "Full-screen vertical ad between stories",
                "duration": "5-15 seconds",
                "available_tiers": ["premium", "enterprise"]
            },
            "sponsorship": {
                "name": "Series Sponsorship",
                "description": "'Brought to you by [Brand]' on specific series",
                "available_tiers": ["premium", "enterprise"]
            },
            "takeover": {
                "name": "Story Takeover",
                "description": "Own the Stories feed for 24 hours",
                "available_tiers": ["enterprise"]
            }
        }
    }

# ============ AD PLACEMENT RULES (Platform-controlled) ============
AD_PLACEMENT_RULES = {
    "video_length_rules": {
        "short": {  # < 3 minutes
            "max_duration_seconds": 180,
            "allowed_placements": ["pre_roll"],
            "max_ads": 1
        },
        "medium": {  # 3-10 minutes
            "max_duration_seconds": 600,
            "allowed_placements": ["pre_roll", "mid_roll"],
            "max_ads": 2,
            "mid_roll_positions": [0.5]  # 50% through
        },
        "long": {  # 10+ minutes
            "max_duration_seconds": 999999,  # Effectively infinite
            "allowed_placements": ["pre_roll", "mid_roll", "overlay"],
            "max_ads": 3,
            "mid_roll_positions": [0.33, 0.66]  # 33% and 66% through
        }
    },
    "viewer_rules": {
        "free_content": True,   # Show ads on free episodes
        "paid_content": False,  # No ads on paid/coin episodes
        "premium_subscribers": False  # No ads for premium subscribers
    },
    "ad_duration": {
        "pre_roll": {"min": 5, "max": 10, "skip_after": 3},
        "mid_roll": {"min": 5, "max": 15, "skip_after": 5},
        "overlay": {"duration": 8},
        "story": {"min": 5, "max": 15}
    }
}

# Minimum wallet balance to create/run campaigns
MIN_WALLET_BALANCE = 50.0

# ============ CAMPAIGN ROUTES ============

@router.post("/advertiser/campaigns")
async def create_campaign(data: CampaignCreate, request: "Request"):
    """Create a new ad campaign (PREPAY REQUIRED)"""
    advertiser = await require_advertiser(request)
    
    # PREPAY CHECK: Verify sufficient wallet balance
    current_balance = advertiser.get("balance", 0)
    if current_balance < MIN_WALLET_BALANCE:
        raise HTTPException(
            status_code=402,  # Payment Required
            detail=f"Insufficient balance. Minimum ${MIN_WALLET_BALANCE} required. Current balance: ${current_balance:.2f}. Please add funds first."
        )
    
    if data.budget > current_balance:
        raise HTTPException(
            status_code=402,
            detail=f"Campaign budget (${data.budget}) exceeds wallet balance (${current_balance:.2f}). Please add more funds or reduce budget."
        )
    
    # Validate tier permissions for ad placements
    tier = advertiser.get("tier", "basic")
    tier_info = PRICING_TIERS.get(tier, PRICING_TIERS["basic"])
    
    # Validate ad placements against tier
    available_placements = []
    for placement_id, placement_info in AD_PLACEMENT_RULES.get("ad_duration", {}).items():
        # Check tier access
        pricing_placement = {
            "pre_roll": ["basic", "pro", "premium", "enterprise"],
            "mid_roll": ["pro", "premium", "enterprise"],
            "overlay": ["pro", "premium", "enterprise"],
            "story": ["premium", "enterprise"]
        }
        if tier in pricing_placement.get(placement_id, []):
            available_placements.append(placement_id)
    
    # Filter requested placements to only allowed ones
    valid_placements = [p for p in data.ad_placements if p in available_placements]
    if not valid_placements:
        valid_placements = ["pre_roll"]  # Default to pre-roll
    
    campaign_id = f"camp-{uuid.uuid4().hex[:12]}"
    
    campaign = {
        "id": campaign_id,
        "advertiser_id": advertiser["id"],
        "name": data.name,
        "campaign_type": data.campaign_type,
        "tier": tier,
        "budget": data.budget,
        "reserved_budget": data.budget,  # Reserve funds from wallet
        "daily_budget": data.daily_budget or data.budget / 30,
        "spent": 0.0,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "targeting": data.targeting or {},
        "ad_placements": valid_placements,
        "placement_preference": data.ad_placements,  # What advertiser wanted
        "status": "pending_approval",  # pending_approval, active, paused, completed, rejected, insufficient_funds
        "impressions": 0,
        "views": 0,
        "clicks": 0,
        "conversions": 0,
        "cpv_rate": tier_info["cpv_rate"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "paused_reason": None,
        "ads": []
    }
    
    # PREPAY: Reserve budget from wallet
    await db.advertisers.update_one(
        {"id": advertiser["id"]},
        {
            "$inc": {
                "balance": -data.budget,  # Deduct from available balance
                "reserved_balance": data.budget,  # Add to reserved
                "campaigns_count": 1
            }
        }
    )
    
    # Log transaction
    await db.ad_transactions.insert_one({
        "id": f"txn-{uuid.uuid4().hex[:12]}",
        "advertiser_id": advertiser["id"],
        "campaign_id": campaign_id,
        "type": "reserve",
        "amount": -data.budget,
        "description": f"Budget reserved for campaign: {data.name}",
        "balance_after": current_balance - data.budget,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    await db.campaigns.insert_one(campaign)
    
    campaign.pop("_id", None)
    return {
        "message": "Campaign created and pending approval. Budget reserved from wallet.",
        "campaign": campaign,
        "wallet": {
            "previous_balance": current_balance,
            "reserved": data.budget,
            "new_available_balance": current_balance - data.budget
        }
    }

@router.get("/advertiser/campaigns")
async def get_advertiser_campaigns(request: Request, status: Optional[str] = None):
    """Get all campaigns for current advertiser"""
    advertiser = await require_advertiser(request)
    
    query = {"advertiser_id": advertiser["id"]}
    if status:
        query["status"] = status
    
    campaigns = await db.campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@router.get("/advertiser/campaigns/{campaign_id}")
async def get_campaign_detail(campaign_id: str, request: Request):
    """Get detailed campaign info with analytics"""
    advertiser = await require_advertiser(request)
    
    campaign = await db.campaigns.find_one(
        {"id": campaign_id, "advertiser_id": advertiser["id"]},
        {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get campaign ads
    ads = await db.ad_creatives.find({"campaign_id": campaign_id}, {"_id": 0}).to_list(50)
    campaign["ads"] = ads
    
    # Calculate analytics
    campaign["analytics"] = {
        "ctr": round((campaign["clicks"] / max(campaign["impressions"], 1)) * 100, 2),
        "view_rate": round((campaign["views"] / max(campaign["impressions"], 1)) * 100, 2),
        "cost_per_view": round(campaign["spent"] / max(campaign["views"], 1), 4),
        "cost_per_click": round(campaign["spent"] / max(campaign["clicks"], 1), 4)
    }
    
    return campaign

@router.patch("/advertiser/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, request: Request):
    """Update campaign settings"""
    advertiser = await require_advertiser(request)
    body = await request.json()
    
    campaign = await db.campaigns.find_one(
        {"id": campaign_id, "advertiser_id": advertiser["id"]}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Only allow certain fields to be updated
    allowed_fields = ["name", "daily_budget", "end_date", "targeting", "status"]
    update_data = {k: v for k, v in body.items() if k in allowed_fields}
    
    if "status" in update_data and update_data["status"] not in ["paused", "active"]:
        raise HTTPException(status_code=400, detail="Can only pause or resume campaigns")
    
    if update_data:
        await db.campaigns.update_one(
            {"id": campaign_id},
            {"$set": update_data}
        )
    
    return {"message": "Campaign updated", "updated_fields": list(update_data.keys())}

# ============ AD CREATIVE ROUTES ============

@router.post("/advertiser/campaigns/{campaign_id}/ads")
async def create_ad_creative(campaign_id: str, data: AdCreativeCreate, request: Request):
    """Upload/create an ad creative for a campaign"""
    advertiser = await require_advertiser(request)
    
    # Verify campaign belongs to advertiser
    campaign = await db.campaigns.find_one(
        {"id": campaign_id, "advertiser_id": advertiser["id"]}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    ad_id = f"ad-{uuid.uuid4().hex[:12]}"
    
    ad_creative = {
        "id": ad_id,
        "campaign_id": campaign_id,
        "advertiser_id": advertiser["id"],
        "name": data.name,
        "creative_type": data.creative_type,
        "media_url": data.media_url,
        "duration": data.duration or 10,
        "click_url": data.click_url,
        "call_to_action": data.call_to_action,
        "status": "pending_approval",  # pending_approval, approved, rejected
        "impressions": 0,
        "views": 0,
        "clicks": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "approved_at": None,
        "rejection_reason": None
    }
    
    await db.ad_creatives.insert_one(ad_creative)
    ad_creative.pop("_id", None)
    
    return {
        "message": "Ad creative uploaded and pending approval",
        "ad": ad_creative
    }

@router.get("/advertiser/campaigns/{campaign_id}/ads")
async def get_campaign_ads(campaign_id: str, request: Request):
    """Get all ad creatives for a campaign"""
    advertiser = await require_advertiser(request)
    
    # Verify campaign belongs to advertiser
    campaign = await db.campaigns.find_one(
        {"id": campaign_id, "advertiser_id": advertiser["id"]}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    ads = await db.ad_creatives.find(
        {"campaign_id": campaign_id},
        {"_id": 0}
    ).to_list(50)
    
    return ads

# ============ ANALYTICS ROUTES ============

@router.get("/advertiser/analytics/overview")
async def get_analytics_overview(request: Request):
    """Get overall analytics for advertiser"""
    advertiser = await require_advertiser(request)
    
    # Aggregate all campaign stats
    campaigns = await db.campaigns.find(
        {"advertiser_id": advertiser["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    total_impressions = sum(c.get("impressions", 0) for c in campaigns)
    total_views = sum(c.get("views", 0) for c in campaigns)
    total_clicks = sum(c.get("clicks", 0) for c in campaigns)
    total_spent = sum(c.get("spent", 0) for c in campaigns)
    
    return {
        "total_campaigns": len(campaigns),
        "active_campaigns": len([c for c in campaigns if c.get("status") == "active"]),
        "total_impressions": total_impressions,
        "total_views": total_views,
        "total_clicks": total_clicks,
        "total_spent": round(total_spent, 2),
        "overall_ctr": round((total_clicks / max(total_impressions, 1)) * 100, 2),
        "overall_view_rate": round((total_views / max(total_impressions, 1)) * 100, 2),
        "avg_cost_per_view": round(total_spent / max(total_views, 1), 4),
        "balance": advertiser.get("balance", 0),
        "tier": advertiser.get("tier", "basic")
    }

@router.get("/advertiser/analytics/daily")
async def get_daily_analytics(request: Request, days: int = 30):
    """Get daily analytics breakdown"""
    await require_advertiser(request)  # Verify authentication
    
    # In a real implementation, this would query daily aggregated data
    # For now, return mock daily data structure
    return {
        "period": f"Last {days} days",
        "daily_data": [],  # Would be populated with real data
        "note": "Daily analytics data will be populated as ads run"
    }

# ============ BILLING ROUTES ============

@router.post("/advertiser/billing/add-funds")
async def add_funds(request: Request):
    """Add funds to advertiser account (PREPAY wallet)"""
    advertiser = await require_advertiser(request)
    body = await request.json()
    
    amount = body.get("amount", 0)
    if amount < 10:
        raise HTTPException(status_code=400, detail="Minimum deposit is $10")
    
    # In production, this would integrate with Stripe/payment provider
    # For now, just update balance
    await db.advertisers.update_one(
        {"id": advertiser["id"]},
        {"$inc": {"balance": amount}}
    )
    
    # Log transaction
    await db.ad_transactions.insert_one({
        "id": f"txn-{uuid.uuid4().hex[:12]}",
        "advertiser_id": advertiser["id"],
        "type": "deposit",
        "amount": amount,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "message": f"${amount} added to account",
        "new_balance": advertiser.get("balance", 0) + amount
    }

@router.get("/advertiser/billing/transactions")
async def get_transactions(request: Request, limit: int = 50):
    """Get billing transaction history"""
    advertiser = await require_advertiser(request)
    
    transactions = await db.ad_transactions.find(
        {"advertiser_id": advertiser["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return transactions

# ============ ADMIN APPROVAL ROUTES (for admin users) ============

@router.get("/admin/advertiser/pending")
async def get_pending_ads(user: dict = Depends(get_current_user)):
    """Get all ads pending approval (Admin only)"""
    is_admin = user.get("role") in ["admin", "super_admin"] or user.get("is_super_admin") or user.get("is_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pending_ads = await db.ad_creatives.find(
        {"status": "pending_approval"},
        {"_id": 0}
    ).to_list(100)
    
    # Enrich with advertiser info
    for ad in pending_ads:
        advertiser = await db.advertisers.find_one(
            {"id": ad["advertiser_id"]},
            {"_id": 0, "company_name": 1, "email": 1}
        )
        ad["advertiser"] = advertiser
    
    return pending_ads

@router.post("/admin/advertiser/ads/{ad_id}/approve")
async def approve_ad(ad_id: str, user: dict = Depends(get_current_user)):
    """Approve an ad creative (Admin only)"""
    is_admin = user.get("role") in ["admin", "super_admin"] or user.get("is_super_admin") or user.get("is_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.ad_creatives.update_one(
        {"id": ad_id},
        {"$set": {
            "status": "approved",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user["id"]
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {"message": "Ad approved", "ad_id": ad_id}

@router.post("/admin/advertiser/ads/{ad_id}/reject")
async def reject_ad(ad_id: str, user: dict = Depends(get_current_user)):
    """Reject an ad creative (Admin only)"""
    is_admin = user.get("role") in ["admin", "super_admin"] or user.get("is_super_admin") or user.get("is_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get rejection reason from body if provided
    
    result = await db.ad_creatives.update_one(
        {"id": ad_id},
        {"$set": {
            "status": "rejected",
            "rejection_reason": "Content does not meet guidelines",
            "rejected_by": user["id"]
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    return {"message": "Ad rejected", "ad_id": ad_id}

@router.post("/admin/advertiser/campaigns/{campaign_id}/approve")
async def approve_campaign(campaign_id: str, user: dict = Depends(get_current_user)):
    """Approve a campaign (Admin only)"""
    is_admin = user.get("role") in ["admin", "super_admin"] or user.get("is_super_admin") or user.get("is_admin")
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "status": "active",
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": user["id"]
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"message": "Campaign approved and now active", "campaign_id": campaign_id}


# ============ AD SERVING ROUTES (Called by Video Player) ============

@router.get("/ads/serve")
async def serve_ads(
    episode_id: str,
    placement: str = "pre_roll",
    video_duration: Optional[int] = None,
    is_free_content: bool = True,
    user_id: Optional[str] = None
):
    """
    Serve ads for video playback (called by video player).
    Platform decides which ads to show based on rules.
    
    Args:
        episode_id: The episode being watched
        placement: Requested placement type (pre_roll, mid_roll, etc.)
        video_duration: Duration of the video in seconds
        is_free_content: Whether this is a free episode
        user_id: Optional user ID to check if premium subscriber
    """
    import random
    
    # Rule 1: No ads on paid content
    if not is_free_content:
        return {"ads": [], "reason": "Paid content - ad-free experience"}
    
    # Rule 2: Check if user is premium subscriber (no ads)
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"subscription": 1})
        if user and user.get("subscription", {}).get("active"):
            return {"ads": [], "reason": "Premium subscriber - ad-free experience"}
    
    # Rule 3: Determine allowed placements based on video duration
    allowed_placements = ["pre_roll"]  # Default
    if video_duration:
        if video_duration < 180:  # < 3 minutes
            allowed_placements = ["pre_roll"]
        elif video_duration < 600:  # 3-10 minutes
            allowed_placements = ["pre_roll", "mid_roll"]
        else:  # 10+ minutes
            allowed_placements = ["pre_roll", "mid_roll", "overlay"]
    
    # Only serve if requested placement is allowed
    if placement not in allowed_placements:
        return {
            "ads": [],
            "reason": f"Placement '{placement}' not allowed for this video length",
            "allowed_placements": allowed_placements
        }
    
    # Get active campaigns with approved ads for this placement
    campaigns = await db.campaigns.find({
        "status": "active",
        "ad_placements": placement,
        "$expr": {"$lt": ["$spent", "$budget"]}  # Has remaining budget
    }, {"_id": 0}).to_list(100)
    
    if not campaigns:
        return {"ads": [], "reason": "No active campaigns available"}
    
    # Get approved ads from active campaigns
    campaign_ids = [c["id"] for c in campaigns]
    ads = await db.ad_creatives.find({
        "campaign_id": {"$in": campaign_ids},
        "status": "approved"
    }, {"_id": 0}).to_list(50)
    
    if not ads:
        return {"ads": [], "reason": "No approved ads available"}
    
    # Select ads based on targeting and budget
    # For now, random selection weighted by remaining budget
    selected_ads = []
    for ad in ads:
        campaign = next((c for c in campaigns if c["id"] == ad["campaign_id"]), None)
        if campaign:
            ad["campaign_name"] = campaign.get("name")
            ad["cpv_rate"] = campaign.get("cpv_rate", 0.02)
            ad["skip_after"] = AD_PLACEMENT_RULES["ad_duration"].get(placement, {}).get("skip_after", 3)
            selected_ads.append(ad)
    
    # Limit number of ads based on rules
    max_ads = 1 if placement == "pre_roll" else 2
    selected_ads = random.sample(selected_ads, min(len(selected_ads), max_ads))
    
    return {
        "ads": selected_ads,
        "placement": placement,
        "rules_applied": {
            "video_duration_category": "short" if (video_duration or 0) < 180 else "medium" if (video_duration or 0) < 600 else "long",
            "allowed_placements": allowed_placements,
            "max_ads": max_ads
        }
    }


@router.post("/ads/track")
async def track_ad_event(
    ad_id: str,
    event_type: str,  # impression, view, click, skip
    campaign_id: Optional[str] = None,
    user_id: Optional[str] = None,
    episode_id: Optional[str] = None
):
    """
    Track ad events and charge advertiser (PREPAY deduction).
    Called when ad is shown, viewed, clicked, or skipped.
    """
    # Get ad and campaign
    ad = await db.ad_creatives.find_one({"id": ad_id})
    if not ad:
        raise HTTPException(status_code=404, detail="Ad not found")
    
    campaign_id = campaign_id or ad.get("campaign_id")
    campaign = await db.campaigns.find_one({"id": campaign_id})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Update ad stats
    update_ad = {"$inc": {}}
    if event_type == "impression":
        update_ad["$inc"]["impressions"] = 1
    elif event_type == "view":
        update_ad["$inc"]["views"] = 1
    elif event_type == "click":
        update_ad["$inc"]["clicks"] = 1
    
    if update_ad["$inc"]:
        await db.ad_creatives.update_one({"id": ad_id}, update_ad)
    
    # Update campaign stats and charge for views
    update_campaign = {"$inc": {}}
    charge_amount = 0
    
    if event_type == "impression":
        update_campaign["$inc"]["impressions"] = 1
    elif event_type == "view":
        update_campaign["$inc"]["views"] = 1
        # Charge CPV rate for completed views
        charge_amount = campaign.get("cpv_rate", 0.02)
        update_campaign["$inc"]["spent"] = charge_amount
    elif event_type == "click":
        update_campaign["$inc"]["clicks"] = 1
    
    if update_campaign["$inc"]:
        await db.campaigns.update_one({"id": campaign_id}, update_campaign)
    
    # If charged, update advertiser reserved balance
    if charge_amount > 0:
        await db.advertisers.update_one(
            {"id": campaign["advertiser_id"]},
            {"$inc": {"reserved_balance": -charge_amount, "total_spent": charge_amount}}
        )
        
        # Check if campaign budget exhausted
        updated_campaign = await db.campaigns.find_one({"id": campaign_id})
        if updated_campaign and updated_campaign.get("spent", 0) >= updated_campaign.get("budget", 0):
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "completed", "paused_reason": "Budget exhausted"}}
            )
    
    return {
        "tracked": True,
        "event_type": event_type,
        "ad_id": ad_id,
        "charged": charge_amount
    }


@router.get("/ads/placement-rules")
async def get_placement_rules():
    """Get ad placement rules (for frontend reference)"""
    return {
        "rules": AD_PLACEMENT_RULES,
        "summary": {
            "short_videos": "< 3 min: Pre-roll only (1 ad max)",
            "medium_videos": "3-10 min: Pre-roll + 1 Mid-roll",
            "long_videos": "10+ min: Pre-roll + 2 Mid-rolls + Overlay",
            "free_content_only": "Ads only shown on free episodes",
            "premium_users": "No ads for premium subscribers"
        }
    }
