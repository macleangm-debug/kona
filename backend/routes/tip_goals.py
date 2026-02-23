"""
Tip Goals Routes
Creator fundraising goals with progress tracking
"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from services import db, get_current_user
from models.tip_goals import (
    GoalStatus, CreateTipGoalRequest, UpdateTipGoalRequest
)

router = APIRouter(prefix="/tip-goals", tags=["Tip Goals"])


@router.post("/")
async def create_tip_goal(
    request: CreateTipGoalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new tip goal (creator only)"""
    is_creator = current_user.get("role") == "creator"
    is_admin = current_user.get("is_admin")
    
    if not (is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Only creators can create tip goals")
    
    # Check for active goals limit (max 3 active goals)
    active_count = await db.tip_goals.count_documents({
        "creator_id": current_user["id"],
        "status": GoalStatus.ACTIVE
    })
    
    if active_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 active goals allowed")
    
    goal_id = str(uuid.uuid4())
    goal_doc = {
        "id": goal_id,
        "creator_id": current_user["id"],
        "creator_name": current_user.get("username") or current_user.get("name", "Creator"),
        "title": request.title,
        "description": request.description,
        "target_amount": request.target_amount,
        "current_amount": 0,
        "contributor_count": 0,
        "series_id": request.series_id,
        "status": GoalStatus.ACTIVE,
        "ends_at": request.ends_at,
        "show_on_profile": request.show_on_profile,
        "show_contributors": request.show_contributors,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None
    }
    
    await db.tip_goals.insert_one(goal_doc)
    del goal_doc["_id"]
    
    goal_doc["progress_percent"] = 0
    goal_doc["top_contributors"] = []
    
    return {"success": True, "goal": goal_doc}


@router.get("/creator/my")
async def get_my_tip_goals(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get creator's tip goals"""
    query = {"creator_id": current_user["id"]}
    if status:
        query["status"] = status
    
    goals = await db.tip_goals.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=20)
    
    for goal in goals:
        goal["progress_percent"] = round((goal["current_amount"] / goal["target_amount"]) * 100, 1) if goal["target_amount"] > 0 else 0
        
        # Get top contributors
        top = await db.tip_goal_contributions.find(
            {"goal_id": goal["id"], "anonymous": False},
            {"_id": 0}
        ).sort("amount", -1).limit(5).to_list(length=5)
        goal["top_contributors"] = top
    
    return {"goals": goals}


@router.get("/creator/{creator_id}")
async def get_creator_tip_goals(
    creator_id: str,
    active_only: bool = True
):
    """Get public tip goals for a creator"""
    query = {
        "creator_id": creator_id,
        "show_on_profile": True
    }
    if active_only:
        query["status"] = GoalStatus.ACTIVE
    
    goals = await db.tip_goals.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=10)
    
    for goal in goals:
        goal["progress_percent"] = round((goal["current_amount"] / goal["target_amount"]) * 100, 1) if goal["target_amount"] > 0 else 0
        
        if goal.get("show_contributors"):
            top = await db.tip_goal_contributions.find(
                {"goal_id": goal["id"], "anonymous": False},
                {"_id": 0}
            ).sort("amount", -1).limit(5).to_list(length=5)
            goal["top_contributors"] = top
        else:
            goal["top_contributors"] = []
    
    return {"goals": goals}


@router.get("/{goal_id}")
async def get_tip_goal(goal_id: str):
    """Get a specific tip goal"""
    goal = await db.tip_goals.find_one({"id": goal_id}, {"_id": 0})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    goal["progress_percent"] = round((goal["current_amount"] / goal["target_amount"]) * 100, 1) if goal["target_amount"] > 0 else 0
    
    if goal.get("show_contributors"):
        top = await db.tip_goal_contributions.find(
            {"goal_id": goal_id, "anonymous": False},
            {"_id": 0}
        ).sort("amount", -1).limit(10).to_list(length=10)
        goal["top_contributors"] = top
    else:
        goal["top_contributors"] = []
    
    return goal


@router.post("/{goal_id}/contribute")
async def contribute_to_goal(
    goal_id: str,
    amount: int,
    message: Optional[str] = None,
    anonymous: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Contribute to a tip goal"""
    if amount < 10:
        raise HTTPException(status_code=400, detail="Minimum contribution is 10 coins")
    
    goal = await db.tip_goals.find_one({"id": goal_id})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if goal["status"] != GoalStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Goal is not active")
    
    # Can't contribute to own goal
    if goal["creator_id"] == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot contribute to your own goal")
    
    # Check balance
    if current_user.get("coins", 0) < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient coins. Need {amount}, have {current_user.get('coins', 0)}"
        )
    
    # Create contribution
    contrib_id = str(uuid.uuid4())
    contrib_doc = {
        "id": contrib_id,
        "goal_id": goal_id,
        "user_id": current_user["id"],
        "username": "Anonymous" if anonymous else (current_user.get("username") or current_user.get("name", "User")),
        "avatar": None if anonymous else current_user.get("avatar"),
        "amount": amount,
        "message": message[:200] if message else None,
        "anonymous": anonymous,
        "created_at": datetime.now(timezone.utc)
    }
    await db.tip_goal_contributions.insert_one(contrib_doc)
    
    # Deduct from contributor
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$inc": {"coins": -amount}}
    )
    
    # Add to creator (70% share)
    creator_share = int(amount * 0.7)
    await db.users.update_one(
        {"id": goal["creator_id"]},
        {"$inc": {"coins": creator_share}}
    )
    
    # Update goal progress
    new_amount = goal["current_amount"] + amount
    update_data = {
        "current_amount": new_amount,
        "$inc": {"contributor_count": 1}
    }
    
    # Check if goal completed
    if new_amount >= goal["target_amount"]:
        update_data["status"] = GoalStatus.COMPLETED
        update_data["completed_at"] = datetime.now(timezone.utc)
    
    await db.tip_goals.update_one(
        {"id": goal_id},
        {"$set": {k: v for k, v in update_data.items() if not k.startswith("$")},
         **{k: v for k, v in update_data.items() if k.startswith("$")}}
    )
    
    # Create notification for creator
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": goal["creator_id"],
        "type": "goal_contribution",
        "title": f"New Contribution to \"{goal['title']}\"!",
        "message": f"{'Someone' if anonymous else contrib_doc['username']} contributed {amount} coins!" + (f" \"{message[:50]}...\"" if message else ""),
        "data": {"goal_id": goal_id, "amount": amount, "new_total": new_amount},
        "read": False,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Record transaction
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "type": "goal_contribution",
        "from_user_id": current_user["id"],
        "to_user_id": goal["creator_id"],
        "amount": amount,
        "creator_share": creator_share,
        "goal_id": goal_id,
        "created_at": datetime.now(timezone.utc)
    })
    
    del contrib_doc["_id"]
    
    # Get updated balance
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "coins": 1})
    
    return {
        "success": True,
        "contribution": contrib_doc,
        "new_total": new_amount,
        "progress_percent": round((new_amount / goal["target_amount"]) * 100, 1),
        "goal_completed": new_amount >= goal["target_amount"],
        "new_balance": updated_user.get("coins", 0)
    }


@router.patch("/{goal_id}")
async def update_tip_goal(
    goal_id: str,
    request: UpdateTipGoalRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a tip goal (creator only)"""
    goal = await db.tip_goals.find_one({"id": goal_id, "creator_id": current_user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found or not owned by you")
    
    update_data = {}
    if request.title:
        update_data["title"] = request.title
    if request.description is not None:
        update_data["description"] = request.description
    if request.target_amount:
        update_data["target_amount"] = request.target_amount
    if request.status:
        update_data["status"] = request.status
        if request.status == GoalStatus.COMPLETED:
            update_data["completed_at"] = datetime.now(timezone.utc)
    if request.show_on_profile is not None:
        update_data["show_on_profile"] = request.show_on_profile
    if request.show_contributors is not None:
        update_data["show_contributors"] = request.show_contributors
    
    if update_data:
        await db.tip_goals.update_one({"id": goal_id}, {"$set": update_data})
    
    updated = await db.tip_goals.find_one({"id": goal_id}, {"_id": 0})
    return {"success": True, "goal": updated}


@router.delete("/{goal_id}")
async def delete_tip_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a tip goal (creator only, only if no contributions)"""
    goal = await db.tip_goals.find_one({"id": goal_id, "creator_id": current_user["id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found or not owned by you")
    
    if goal["current_amount"] > 0:
        raise HTTPException(status_code=400, detail="Cannot delete goal with contributions. Cancel it instead.")
    
    await db.tip_goals.delete_one({"id": goal_id})
    return {"success": True, "message": "Goal deleted"}


@router.get("/{goal_id}/contributions")
async def get_goal_contributions(
    goal_id: str,
    limit: int = 20,
    skip: int = 0
):
    """Get contributions for a goal"""
    goal = await db.tip_goals.find_one({"id": goal_id}, {"_id": 0, "show_contributors": 1})
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if not goal.get("show_contributors"):
        return {"contributions": [], "total": 0, "message": "Contributors hidden by creator"}
    
    contributions = await db.tip_goal_contributions.find(
        {"goal_id": goal_id},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.tip_goal_contributions.count_documents({"goal_id": goal_id})
    
    return {"contributions": contributions, "total": total}
