"""
Super Creator Management Routes
Handles sub-creator management, onboarding, and commission tracking for Super Creators
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import uuid

from services import db
from auth import get_current_user

router = APIRouter(prefix="/super-creator", tags=["Super Creator"])


class SubCreatorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    commission_percent: float = Field(default=10.0, ge=0, le=100)
    content_types: List[str] = Field(default=["all"])
    notes: Optional[str] = None


class SubCreatorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    commission_percent: Optional[float] = Field(default=None, ge=0, le=100)
    content_types: Optional[List[str]] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class SubCreatorInvite(BaseModel):
    name: str
    email: EmailStr
    commission_percent: float = Field(default=10.0, ge=0, le=100)
    message: Optional[str] = None


async def verify_super_creator(user_id: str) -> dict:
    """Verify user is a super creator and return their contract info"""
    contract = await db.contracts.find_one({
        "creator.user_id": user_id,
        "contract_terms.is_super_creator": True,
        "status": {"$in": ["active", "signed"]}
    }, {"_id": 0})
    
    if not contract:
        raise HTTPException(
            status_code=403, 
            detail="You must be an active Super Creator to access this feature"
        )
    return contract


@router.get("/status")
async def get_super_creator_status(current_user: dict = Depends(get_current_user)):
    """Check if current user is a super creator and get their status"""
    
    contract = await db.contracts.find_one({
        "creator.user_id": current_user["id"],
        "contract_terms.is_super_creator": True
    }, {"_id": 0})
    
    if not contract:
        return {
            "is_super_creator": False,
            "message": "No Super Creator contract found"
        }
    
    return {
        "is_super_creator": True,
        "contract_number": contract.get("contract_number"),
        "status": contract.get("status"),
        "territory": contract.get("contract_terms", {}).get("territory"),
        "territory_exclusive": contract.get("contract_terms", {}).get("territory_exclusive", False),
        "can_manage_creators": contract.get("contract_terms", {}).get("can_manage_creators", False),
        "sub_creator_commission_percent": contract.get("contract_terms", {}).get("sub_creator_commission_percent", 10),
        "sub_creator_negotiable_terms": contract.get("contract_terms", {}).get("sub_creator_negotiable_terms", False)
    }


@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """Get Super Creator dashboard overview"""
    
    contract = await verify_super_creator(current_user["id"])
    
    # Get sub-creators
    sub_creators = await db.sub_creators.find({
        "super_creator_id": current_user["id"]
    }, {"_id": 0}).to_list(100)
    
    # Calculate stats
    active_count = sum(1 for sc in sub_creators if sc.get("status") == "active")
    pending_count = sum(1 for sc in sub_creators if sc.get("status") == "pending")
    
    # Get earnings data (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    earnings_pipeline = [
        {
            "$match": {
                "super_creator_id": current_user["id"],
                "created_at": {"$gte": thirty_days_ago.isoformat()}
            }
        },
        {
            "$group": {
                "_id": None,
                "total_earnings": {"$sum": "$amount"},
                "commission_earned": {"$sum": "$commission"},
                "transactions": {"$sum": 1}
            }
        }
    ]
    
    earnings_result = await db.super_creator_earnings.aggregate(earnings_pipeline).to_list(1)
    earnings = earnings_result[0] if earnings_result else {
        "total_earnings": 0,
        "commission_earned": 0,
        "transactions": 0
    }
    
    return {
        "contract": {
            "number": contract.get("contract_number"),
            "territory": contract.get("contract_terms", {}).get("territory"),
            "exclusive": contract.get("contract_terms", {}).get("territory_exclusive"),
            "commission_rate": contract.get("contract_terms", {}).get("sub_creator_commission_percent", 10)
        },
        "sub_creators": {
            "total": len(sub_creators),
            "active": active_count,
            "pending": pending_count,
            "inactive": len(sub_creators) - active_count - pending_count
        },
        "earnings_30d": {
            "total": earnings.get("total_earnings", 0),
            "commission": earnings.get("commission_earned", 0),
            "transactions": earnings.get("transactions", 0)
        }
    }


@router.get("/sub-creators")
async def list_sub_creators(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all sub-creators under this Super Creator"""
    
    await verify_super_creator(current_user["id"])
    
    query = {"super_creator_id": current_user["id"]}
    if status:
        query["status"] = status
    
    sub_creators = await db.sub_creators.find(query, {"_id": 0}).to_list(100)
    
    # Enrich with earnings data
    for sc in sub_creators:
        # Get lifetime earnings for each sub-creator
        earnings = await db.super_creator_earnings.aggregate([
            {"$match": {"sub_creator_id": sc["id"]}},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$amount"},
                "commission": {"$sum": "$commission"}
            }}
        ]).to_list(1)
        
        sc["earnings"] = earnings[0] if earnings else {"total": 0, "commission": 0}
    
    return {"sub_creators": sub_creators, "total": len(sub_creators)}


@router.post("/sub-creators")
async def create_sub_creator(
    data: SubCreatorCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new sub-creator"""
    
    contract = await verify_super_creator(current_user["id"])
    
    # Check if email already exists
    existing = await db.sub_creators.find_one({
        "email": data.email,
        "super_creator_id": current_user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="Sub-creator with this email already exists")
    
    # Validate commission against contract limits
    max_commission = contract.get("contract_terms", {}).get("sub_creator_commission_percent", 10)
    if not contract.get("contract_terms", {}).get("sub_creator_negotiable_terms", False):
        # If not negotiable, enforce the contract rate
        data.commission_percent = max_commission
    
    sub_creator = {
        "id": f"sc-{uuid.uuid4().hex[:12]}",
        "super_creator_id": current_user["id"],
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "commission_percent": data.commission_percent,
        "content_types": data.content_types,
        "notes": data.notes,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sub_creators.insert_one(sub_creator)
    sub_creator.pop("_id", None)
    
    return {"success": True, "sub_creator": sub_creator}


@router.get("/sub-creators/{sub_creator_id}")
async def get_sub_creator(
    sub_creator_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get details of a specific sub-creator"""
    
    await verify_super_creator(current_user["id"])
    
    sub_creator = await db.sub_creators.find_one({
        "id": sub_creator_id,
        "super_creator_id": current_user["id"]
    }, {"_id": 0})
    
    if not sub_creator:
        raise HTTPException(status_code=404, detail="Sub-creator not found")
    
    # Get earnings history
    earnings = await db.super_creator_earnings.find({
        "sub_creator_id": sub_creator_id
    }, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    sub_creator["earnings_history"] = earnings
    
    return sub_creator


@router.put("/sub-creators/{sub_creator_id}")
async def update_sub_creator(
    sub_creator_id: str,
    data: SubCreatorUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a sub-creator's details"""
    
    contract = await verify_super_creator(current_user["id"])
    
    sub_creator = await db.sub_creators.find_one({
        "id": sub_creator_id,
        "super_creator_id": current_user["id"]
    })
    
    if not sub_creator:
        raise HTTPException(status_code=404, detail="Sub-creator not found")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.name:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.commission_percent is not None:
        # Validate commission
        if not contract.get("contract_terms", {}).get("sub_creator_negotiable_terms", False):
            raise HTTPException(status_code=400, detail="Commission rates are not negotiable under your contract")
        update_data["commission_percent"] = data.commission_percent
    if data.content_types:
        update_data["content_types"] = data.content_types
    if data.status:
        if data.status not in ["pending", "active", "inactive", "terminated"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = data.status
    if data.notes is not None:
        update_data["notes"] = data.notes
    
    await db.sub_creators.update_one(
        {"id": sub_creator_id},
        {"$set": update_data}
    )
    
    updated = await db.sub_creators.find_one({"id": sub_creator_id}, {"_id": 0})
    
    return {"success": True, "sub_creator": updated}


@router.delete("/sub-creators/{sub_creator_id}")
async def remove_sub_creator(
    sub_creator_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a sub-creator (soft delete - set to terminated)"""
    
    await verify_super_creator(current_user["id"])
    
    result = await db.sub_creators.update_one(
        {
            "id": sub_creator_id,
            "super_creator_id": current_user["id"]
        },
        {
            "$set": {
                "status": "terminated",
                "terminated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sub-creator not found")
    
    return {"success": True, "message": "Sub-creator terminated"}


@router.post("/sub-creators/{sub_creator_id}/activate")
async def activate_sub_creator(
    sub_creator_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Activate a pending sub-creator"""
    
    await verify_super_creator(current_user["id"])
    
    result = await db.sub_creators.update_one(
        {
            "id": sub_creator_id,
            "super_creator_id": current_user["id"],
            "status": "pending"
        },
        {
            "$set": {
                "status": "active",
                "activated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pending sub-creator not found")
    
    return {"success": True, "message": "Sub-creator activated"}


@router.get("/earnings")
async def get_earnings_report(
    period: str = "30d",  # 7d, 30d, 90d, all
    current_user: dict = Depends(get_current_user)
):
    """Get earnings report for Super Creator"""
    
    await verify_super_creator(current_user["id"])
    
    # Calculate date filter
    if period == "7d":
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
    elif period == "30d":
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
    elif period == "90d":
        start_date = datetime.now(timezone.utc) - timedelta(days=90)
    else:
        start_date = None
    
    query = {"super_creator_id": current_user["id"]}
    if start_date:
        query["created_at"] = {"$gte": start_date.isoformat()}
    
    # Get earnings grouped by sub-creator
    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": "$sub_creator_id",
                "sub_creator_name": {"$first": "$sub_creator_name"},
                "total_amount": {"$sum": "$amount"},
                "total_commission": {"$sum": "$commission"},
                "transaction_count": {"$sum": 1}
            }
        },
        {"$sort": {"total_commission": -1}}
    ]
    
    by_creator = await db.super_creator_earnings.aggregate(pipeline).to_list(100)
    
    # Get daily breakdown
    daily_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {"$substr": ["$created_at", 0, 10]},
                "amount": {"$sum": "$amount"},
                "commission": {"$sum": "$commission"},
                "transactions": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    daily = await db.super_creator_earnings.aggregate(daily_pipeline).to_list(100)
    
    # Calculate totals
    total_amount = sum(item.get("total_amount", 0) for item in by_creator)
    total_commission = sum(item.get("total_commission", 0) for item in by_creator)
    total_transactions = sum(item.get("transaction_count", 0) for item in by_creator)
    
    return {
        "period": period,
        "summary": {
            "total_amount": total_amount,
            "total_commission": total_commission,
            "total_transactions": total_transactions
        },
        "by_sub_creator": by_creator,
        "daily_breakdown": daily
    }


@router.post("/invite")
async def invite_sub_creator(
    data: SubCreatorInvite,
    current_user: dict = Depends(get_current_user)
):
    """Send invitation to a potential sub-creator"""
    
    contract = await verify_super_creator(current_user["id"])
    
    # Check if already invited or exists
    existing = await db.sub_creators.find_one({
        "email": data.email,
        "super_creator_id": current_user["id"]
    })
    if existing:
        raise HTTPException(status_code=400, detail="This email has already been invited or is a sub-creator")
    
    # Create invitation record
    invitation = {
        "id": f"inv-{uuid.uuid4().hex[:12]}",
        "super_creator_id": current_user["id"],
        "super_creator_name": current_user.get("name", "Unknown"),
        "name": data.name,
        "email": data.email,
        "commission_percent": data.commission_percent,
        "message": data.message,
        "territory": contract.get("contract_terms", {}).get("territory"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    }
    
    await db.sub_creator_invitations.insert_one(invitation)
    
    # In production, send email here
    # For now, just return success
    
    return {
        "success": True,
        "message": f"Invitation sent to {data.email}",
        "invitation_id": invitation["id"]
    }
