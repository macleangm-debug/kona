"""
Sponsorship Marketplace Routes
- Brand campaign management
- Creator applications
- Admin approval workflow
- Bidirectional outreach
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from services.database import db
from routes.auth import get_current_user
from models.sponsorship import (
    SponsorshipStatus, ApplicationStatus, SponsorshipType, PaymentType,
    BrandCreate, BrandResponse,
    CampaignCreate, CampaignUpdate, CampaignResponse,
    ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate,
    CreatorOutreach, OutreachResponse
)

router = APIRouter(prefix="/sponsorship", tags=["sponsorship"])


# ============ HELPER FUNCTIONS ============

async def get_creator_or_403(user: dict):
    """Get creator profile or raise 403"""
    creator = await db.creators.find_one({"user_id": user["id"]}, {"_id": 0})
    if not creator or creator.get("status") != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    return creator


async def get_brand_or_403(user: dict):
    """Get brand profile or raise 403"""
    brand = await db.brands.find_one({"user_id": user["id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=403, detail="Not a registered brand")
    return brand


async def get_admin_or_403(user: dict):
    """Check if user is admin"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ============ BRAND REGISTRATION ============

@router.post("/brands/register")
async def register_brand(
    brand: BrandCreate,
    user: dict = Depends(get_current_user)
):
    """Register as a brand for sponsorships"""
    # Check if already registered
    existing = await db.brands.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Already registered as a brand")
    
    brand_id = f"brand-{uuid.uuid4().hex[:12]}"
    
    brand_doc = {
        "id": brand_id,
        "user_id": user["id"],
        **brand.dict(),
        "is_verified": False,
        "total_campaigns": 0,
        "total_spent_coins": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.brands.insert_one(brand_doc)
    
    # Update user role
    await db.users.update_one({"id": user["id"]}, {"$set": {"brand_id": brand_id}})
    
    return {"message": "Brand registered successfully", "brand_id": brand_id}


@router.get("/brands/me")
async def get_my_brand(user: dict = Depends(get_current_user)):
    """Get current user's brand profile"""
    brand = await db.brands.find_one({"user_id": user["id"]}, {"_id": 0})
    if not brand:
        raise HTTPException(status_code=404, detail="Not registered as a brand")
    return brand


# ============ CAMPAIGN MANAGEMENT (BRAND) ============

@router.post("/campaigns")
async def create_campaign(
    campaign: CampaignCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new sponsorship campaign"""
    brand = await get_brand_or_403(user)
    
    campaign_id = f"camp-{uuid.uuid4().hex[:12]}"
    
    campaign_doc = {
        "id": campaign_id,
        "brand_id": brand["id"],
        "brand_name": brand["company_name"],
        "brand_logo": brand.get("logo_url"),
        **campaign.dict(),
        "sponsorship_type": campaign.sponsorship_type.value,
        "payment_type": campaign.payment_type.value,
        "current_creators": 0,
        "total_applications": 0,
        "status": SponsorshipStatus.PENDING_APPROVAL.value,
        "admin_notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sponsorship_campaigns.insert_one(campaign_doc)
    await db.brands.update_one({"id": brand["id"]}, {"$inc": {"total_campaigns": 1}})
    
    return {"message": "Campaign created and pending admin approval", "campaign_id": campaign_id}


@router.get("/campaigns/my")
async def get_my_campaigns(
    user: dict = Depends(get_current_user),
    status: Optional[SponsorshipStatus] = None
):
    """Get all campaigns for current brand"""
    brand = await get_brand_or_403(user)
    
    query = {"brand_id": brand["id"]}
    if status:
        query["status"] = status.value
    
    campaigns = await db.sponsorship_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {"campaigns": campaigns, "count": len(campaigns)}


@router.patch("/campaigns/{campaign_id}")
async def update_campaign(
    campaign_id: str,
    update: CampaignUpdate,
    user: dict = Depends(get_current_user)
):
    """Update a campaign"""
    brand = await get_brand_or_403(user)
    
    campaign = await db.sponsorship_campaigns.find_one({
        "id": campaign_id,
        "brand_id": brand["id"]
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sponsorship_campaigns.update_one({"id": campaign_id}, {"$set": update_data})
    
    return {"message": "Campaign updated"}


# ============ BROWSE CAMPAIGNS (CREATOR) ============

@router.get("/campaigns/browse")
async def browse_campaigns(
    sponsorship_type: Optional[SponsorshipType] = None,
    min_budget: Optional[int] = None,
    max_budget: Optional[int] = None,
    genre: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """Browse active sponsorship campaigns"""
    query = {"status": SponsorshipStatus.ACTIVE.value}
    
    if sponsorship_type:
        query["sponsorship_type"] = sponsorship_type.value
    if min_budget:
        query["budget_coins"] = {"$gte": min_budget}
    if max_budget:
        query.setdefault("budget_coins", {})["$lte"] = max_budget
    if genre:
        query["preferred_genres"] = {"$in": [genre]}
    
    skip = (page - 1) * limit
    campaigns = await db.sponsorship_campaigns.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.sponsorship_campaigns.count_documents(query)
    
    return {
        "campaigns": campaigns,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    """Get campaign details"""
    campaign = await db.sponsorship_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign


# ============ APPLICATIONS (CREATOR) ============

@router.post("/applications")
async def apply_to_campaign(
    application: ApplicationCreate,
    user: dict = Depends(get_current_user)
):
    """Apply to a sponsorship campaign"""
    creator = await get_creator_or_403(user)
    
    # Check campaign exists and is active
    campaign = await db.sponsorship_campaigns.find_one({
        "id": application.campaign_id,
        "status": SponsorshipStatus.ACTIVE.value
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found or not active")
    
    # Check deadline
    if campaign.get("application_deadline"):
        deadline = datetime.fromisoformat(campaign["application_deadline"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > deadline:
            raise HTTPException(status_code=400, detail="Application deadline has passed")
    
    # Check max creators
    if campaign["current_creators"] >= campaign["max_creators"]:
        raise HTTPException(status_code=400, detail="Campaign has reached maximum creators")
    
    # Check if already applied
    existing = await db.sponsorship_applications.find_one({
        "campaign_id": application.campaign_id,
        "creator_id": creator["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this campaign")
    
    # Check creator meets requirements
    if campaign.get("min_views") and creator.get("total_views", 0) < campaign["min_views"]:
        raise HTTPException(status_code=400, detail=f"Minimum {campaign['min_views']} views required")
    
    app_id = f"app-{uuid.uuid4().hex[:12]}"
    
    # Get series title if specified
    series_title = None
    if application.series_id:
        series = await db.creator_series.find_one({"id": application.series_id}, {"_id": 0, "title": 1})
        if series:
            series_title = series["title"]
    
    app_doc = {
        "id": app_id,
        "campaign_id": application.campaign_id,
        "campaign_title": campaign["title"],
        "creator_id": creator["id"],
        "creator_name": creator.get("display_name") or user.get("username", "Creator"),
        "creator_avatar": creator.get("avatar_url"),
        "creator_stats": {
            "total_views": creator.get("total_views", 0),
            "total_series": creator.get("series_count", 0),
            "total_earnings": creator.get("total_earnings", 0)
        },
        "pitch": application.pitch,
        "proposed_content": application.proposed_content,
        "proposed_timeline": application.proposed_timeline,
        "asking_price_coins": application.asking_price_coins,
        "final_price_coins": None,
        "portfolio_links": application.portfolio_links,
        "series_id": application.series_id,
        "series_title": series_title,
        "status": ApplicationStatus.PENDING.value,
        "brand_feedback": None,
        "admin_notes": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sponsorship_applications.insert_one(app_doc)
    await db.sponsorship_campaigns.update_one(
        {"id": application.campaign_id},
        {"$inc": {"total_applications": 1}}
    )
    
    return {"message": "Application submitted", "application_id": app_id}


@router.get("/applications/my")
async def get_my_applications(
    user: dict = Depends(get_current_user),
    status: Optional[ApplicationStatus] = None
):
    """Get all applications for current creator"""
    creator = await get_creator_or_403(user)
    
    query = {"creator_id": creator["id"]}
    if status:
        query["status"] = status.value
    
    applications = await db.sponsorship_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    return {"applications": applications, "count": len(applications)}


@router.delete("/applications/{application_id}")
async def withdraw_application(
    application_id: str,
    user: dict = Depends(get_current_user)
):
    """Withdraw an application"""
    creator = await get_creator_or_403(user)
    
    application = await db.sponsorship_applications.find_one({
        "id": application_id,
        "creator_id": creator["id"]
    })
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if application["status"] not in [ApplicationStatus.PENDING.value, ApplicationStatus.SHORTLISTED.value]:
        raise HTTPException(status_code=400, detail="Cannot withdraw accepted/rejected application")
    
    await db.sponsorship_applications.update_one(
        {"id": application_id},
        {"$set": {"status": ApplicationStatus.WITHDRAWN.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Application withdrawn"}


# ============ APPLICATION MANAGEMENT (BRAND) ============

@router.get("/campaigns/{campaign_id}/applications")
async def get_campaign_applications(
    campaign_id: str,
    user: dict = Depends(get_current_user),
    status: Optional[ApplicationStatus] = None
):
    """Get all applications for a campaign (brand owner)"""
    brand = await get_brand_or_403(user)
    
    campaign = await db.sponsorship_campaigns.find_one({
        "id": campaign_id,
        "brand_id": brand["id"]
    })
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    query = {"campaign_id": campaign_id}
    if status:
        query["status"] = status.value
    
    applications = await db.sponsorship_applications.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"applications": applications, "count": len(applications)}


@router.patch("/applications/{application_id}/status")
async def update_application_status(
    application_id: str,
    status_update: ApplicationStatusUpdate,
    user: dict = Depends(get_current_user)
):
    """Update application status (brand or admin)"""
    brand = await get_brand_or_403(user)
    
    application = await db.sponsorship_applications.find_one({"id": application_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify brand owns the campaign
    campaign = await db.sponsorship_campaigns.find_one({
        "id": application["campaign_id"],
        "brand_id": brand["id"]
    })
    
    if not campaign:
        raise HTTPException(status_code=403, detail="Not authorized to update this application")
    
    update_data = {
        "status": status_update.status.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status_update.feedback:
        update_data["brand_feedback"] = status_update.feedback
    if status_update.final_price_coins:
        update_data["final_price_coins"] = status_update.final_price_coins
    
    # If accepting, increment current_creators
    if status_update.status == ApplicationStatus.ACCEPTED:
        await db.sponsorship_campaigns.update_one(
            {"id": application["campaign_id"]},
            {"$inc": {"current_creators": 1}}
        )
    
    await db.sponsorship_applications.update_one({"id": application_id}, {"$set": update_data})
    
    return {"message": "Application status updated"}


# ============ BRAND OUTREACH TO CREATORS ============

@router.post("/outreach")
async def send_creator_outreach(
    outreach: CreatorOutreach,
    user: dict = Depends(get_current_user)
):
    """Brand reaches out to a specific creator"""
    brand = await get_brand_or_403(user)
    
    # Get creator
    creator = await db.creators.find_one({"id": outreach.creator_id}, {"_id": 0})
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    
    outreach_id = f"out-{uuid.uuid4().hex[:12]}"
    
    outreach_doc = {
        "id": outreach_id,
        "brand_id": brand["id"],
        "brand_name": brand["company_name"],
        "creator_id": outreach.creator_id,
        "creator_name": creator.get("display_name", "Creator"),
        "campaign_id": outreach.campaign_id,
        "message": outreach.message,
        "proposed_budget_coins": outreach.proposed_budget_coins,
        "sponsorship_type": outreach.sponsorship_type.value,
        "deliverables": outreach.deliverables,
        "status": "pending",
        "creator_response": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "responded_at": None
    }
    
    await db.sponsorship_outreach.insert_one(outreach_doc)
    
    # TODO: Send notification to creator
    
    return {"message": "Outreach sent to creator", "outreach_id": outreach_id}


@router.get("/outreach/received")
async def get_received_outreach(user: dict = Depends(get_current_user)):
    """Get all outreach messages for creator"""
    creator = await get_creator_or_403(user)
    
    outreach = await db.sponsorship_outreach.find(
        {"creator_id": creator["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return {"outreach": outreach, "count": len(outreach)}


@router.post("/outreach/{outreach_id}/respond")
async def respond_to_outreach(
    outreach_id: str,
    response: str,
    accept: bool,
    user: dict = Depends(get_current_user)
):
    """Creator responds to brand outreach"""
    creator = await get_creator_or_403(user)
    
    outreach = await db.sponsorship_outreach.find_one({
        "id": outreach_id,
        "creator_id": creator["id"]
    })
    
    if not outreach:
        raise HTTPException(status_code=404, detail="Outreach not found")
    
    if outreach["status"] != "pending":
        raise HTTPException(status_code=400, detail="Already responded to this outreach")
    
    await db.sponsorship_outreach.update_one(
        {"id": outreach_id},
        {"$set": {
            "status": "accepted" if accept else "declined",
            "creator_response": response,
            "responded_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Response sent"}


# ============ ADMIN APPROVAL ============

@router.get("/admin/pending")
async def get_pending_campaigns(user: dict = Depends(get_current_user)):
    """Get campaigns pending admin approval"""
    await get_admin_or_403(user)
    
    campaigns = await db.sponsorship_campaigns.find(
        {"status": SponsorshipStatus.PENDING_APPROVAL.value},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"campaigns": campaigns, "count": len(campaigns)}


@router.post("/admin/campaigns/{campaign_id}/approve")
async def approve_campaign(
    campaign_id: str,
    notes: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Admin approves a campaign"""
    await get_admin_or_403(user)
    
    result = await db.sponsorship_campaigns.update_one(
        {"id": campaign_id, "status": SponsorshipStatus.PENDING_APPROVAL.value},
        {"$set": {
            "status": SponsorshipStatus.ACTIVE.value,
            "admin_notes": notes,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found or already processed")
    
    return {"message": "Campaign approved and now active"}


@router.post("/admin/campaigns/{campaign_id}/reject")
async def reject_campaign(
    campaign_id: str,
    reason: str,
    user: dict = Depends(get_current_user)
):
    """Admin rejects a campaign"""
    await get_admin_or_403(user)
    
    result = await db.sponsorship_campaigns.update_one(
        {"id": campaign_id, "status": SponsorshipStatus.PENDING_APPROVAL.value},
        {"$set": {
            "status": SponsorshipStatus.REJECTED.value,
            "admin_notes": reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found or already processed")
    
    return {"message": "Campaign rejected"}


# ============ ANALYTICS ============

@router.get("/analytics/creator")
async def get_creator_sponsorship_analytics(user: dict = Depends(get_current_user)):
    """Get sponsorship analytics for creator"""
    creator = await get_creator_or_403(user)
    
    # Applications stats
    pipeline = [
        {"$match": {"creator_id": creator["id"]}},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    app_stats = await db.sponsorship_applications.aggregate(pipeline).to_list(10)
    stats_by_status = {s["_id"]: s["count"] for s in app_stats}
    
    # Total earnings from sponsorships
    accepted_apps = await db.sponsorship_applications.find(
        {"creator_id": creator["id"], "status": ApplicationStatus.COMPLETED.value},
        {"_id": 0, "final_price_coins": 1}
    ).to_list(100)
    
    total_earnings = sum(a.get("final_price_coins", 0) for a in accepted_apps)
    
    # Outreach stats
    outreach_count = await db.sponsorship_outreach.count_documents({"creator_id": creator["id"]})
    
    return {
        "applications": {
            "total": sum(stats_by_status.values()),
            "pending": stats_by_status.get(ApplicationStatus.PENDING.value, 0),
            "accepted": stats_by_status.get(ApplicationStatus.ACCEPTED.value, 0),
            "rejected": stats_by_status.get(ApplicationStatus.REJECTED.value, 0),
            "completed": stats_by_status.get(ApplicationStatus.COMPLETED.value, 0)
        },
        "total_earnings_coins": total_earnings,
        "outreach_received": outreach_count
    }
