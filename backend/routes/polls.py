"""
Fan Polls & Q&A Routes
Creator engagement through polls and fan questions
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query

from services import db, get_current_user
from models.polls import (
    PollType, PollStatus, PollOption,
    CreatePollRequest, UpdatePollRequest, VoteRequest,
    CreateQARequest, AnswerQARequest
)

router = APIRouter(prefix="/polls", tags=["Fan Polls & Q&A"])


# ============ POLLS ============

@router.post("/")
async def create_poll(
    request: CreatePollRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new poll (creators and admins)"""
    is_creator = current_user.get("role") == "creator"
    is_admin = current_user.get("is_admin") or current_user.get("role") == "admin"
    
    if not (is_creator or is_admin):
        raise HTTPException(status_code=403, detail="Only creators can create polls")
    
    # Validate options for multiple choice
    if request.poll_type == PollType.MULTIPLE_CHOICE:
        if len(request.options) < 2:
            raise HTTPException(status_code=400, detail="Multiple choice polls need at least 2 options")
    elif request.poll_type == PollType.YES_NO:
        request.options = ["Yes", "No"]
    elif request.poll_type == PollType.RATING:
        request.options = ["1", "2", "3", "4", "5"]
    
    # Build options with IDs
    options = [
        {"id": str(uuid.uuid4())[:8], "text": opt, "votes": 0}
        for opt in request.options
    ]
    
    poll_id = str(uuid.uuid4())
    poll_doc = {
        "id": poll_id,
        "creator_id": current_user["id"],
        "creator_name": current_user.get("username") or current_user.get("name", "Creator"),
        "series_id": request.series_id,
        "episode_id": request.episode_id,
        "question": request.question,
        "poll_type": request.poll_type,
        "options": options,
        "total_votes": 0,
        "status": PollStatus.ACTIVE,
        "allow_multiple_votes": request.allow_multiple_votes,
        "show_results_before_vote": request.show_results_before_vote,
        "ends_at": request.ends_at,
        "pinned": request.pinned,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None
    }
    
    await db.polls.insert_one(poll_doc)
    del poll_doc["_id"]
    
    return {"success": True, "poll": poll_doc}


@router.get("/creator/my")
async def get_my_polls(
    status: Optional[str] = None,
    series_id: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get creator's polls"""
    query = {"creator_id": current_user["id"]}
    if status:
        query["status"] = status
    if series_id:
        query["series_id"] = series_id
    
    polls = await db.polls.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.polls.count_documents(query)
    
    # Calculate percentages
    for poll in polls:
        if poll["total_votes"] > 0:
            for opt in poll.get("options", []):
                opt["vote_percentage"] = round((opt["votes"] / poll["total_votes"]) * 100, 1)
    
    return {"polls": polls, "total": total}


@router.get("/series/{series_id}")
async def get_series_polls(
    series_id: str,
    include_closed: bool = False,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Get polls for a series (public endpoint)"""
    query = {"series_id": series_id}
    if not include_closed:
        query["status"] = PollStatus.ACTIVE
    
    polls = await db.polls.find(query, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(length=50)
    
    # Check if user has voted
    user_id = current_user["id"] if current_user else None
    for poll in polls:
        if poll["total_votes"] > 0:
            for opt in poll.get("options", []):
                opt["vote_percentage"] = round((opt["votes"] / poll["total_votes"]) * 100, 1)
        
        poll["user_voted"] = False
        poll["user_vote_option_ids"] = []
        
        if user_id:
            vote = await db.poll_votes.find_one(
                {"poll_id": poll["id"], "user_id": user_id},
                {"_id": 0, "option_ids": 1}
            )
            if vote:
                poll["user_voted"] = True
                poll["user_vote_option_ids"] = vote.get("option_ids", [])
    
    return {"polls": polls}


@router.get("/{poll_id}")
async def get_poll(
    poll_id: str,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Get a single poll with results"""
    poll = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    # Calculate percentages
    if poll["total_votes"] > 0:
        for opt in poll.get("options", []):
            opt["vote_percentage"] = round((opt["votes"] / poll["total_votes"]) * 100, 1)
    
    # Check user vote
    poll["user_voted"] = False
    poll["user_vote_option_ids"] = []
    
    if current_user:
        vote = await db.poll_votes.find_one(
            {"poll_id": poll_id, "user_id": current_user["id"]},
            {"_id": 0, "option_ids": 1}
        )
        if vote:
            poll["user_voted"] = True
            poll["user_vote_option_ids"] = vote.get("option_ids", [])
    
    return poll


@router.post("/{poll_id}/vote")
async def vote_on_poll(
    poll_id: str,
    request: VoteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Vote on a poll"""
    poll = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found")
    
    if poll["status"] != PollStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Poll is not active")
    
    if poll.get("ends_at") and datetime.now(timezone.utc) > poll["ends_at"]:
        raise HTTPException(status_code=400, detail="Poll has ended")
    
    # Check if already voted
    existing_vote = await db.poll_votes.find_one(
        {"poll_id": poll_id, "user_id": current_user["id"]}
    )
    if existing_vote and not poll.get("allow_multiple_votes"):
        raise HTTPException(status_code=400, detail="You have already voted")
    
    # Validate option IDs
    valid_option_ids = [opt["id"] for opt in poll.get("options", [])]
    for opt_id in request.option_ids:
        if opt_id not in valid_option_ids:
            raise HTTPException(status_code=400, detail=f"Invalid option: {opt_id}")
    
    # If multiple votes not allowed, only count first option
    vote_option_ids = request.option_ids if poll.get("allow_multiple_votes") else [request.option_ids[0]]
    
    # Record vote
    vote_doc = {
        "id": str(uuid.uuid4()),
        "poll_id": poll_id,
        "user_id": current_user["id"],
        "option_ids": vote_option_ids,
        "comment": request.comment,
        "created_at": datetime.now(timezone.utc)
    }
    await db.poll_votes.insert_one(vote_doc)
    
    # Update poll counts
    for opt_id in vote_option_ids:
        await db.polls.update_one(
            {"id": poll_id, "options.id": opt_id},
            {"$inc": {"options.$.votes": 1, "total_votes": 1}}
        )
    
    # Get updated poll
    updated_poll = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    if updated_poll["total_votes"] > 0:
        for opt in updated_poll.get("options", []):
            opt["vote_percentage"] = round((opt["votes"] / updated_poll["total_votes"]) * 100, 1)
    
    updated_poll["user_voted"] = True
    updated_poll["user_vote_option_ids"] = vote_option_ids
    
    return {"success": True, "poll": updated_poll}


@router.patch("/{poll_id}")
async def update_poll(
    poll_id: str,
    request: UpdatePollRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update a poll (creator only)"""
    poll = await db.polls.find_one({"id": poll_id, "creator_id": current_user["id"]})
    if not poll:
        raise HTTPException(status_code=404, detail="Poll not found or not owned by you")
    
    update_data = {"updated_at": datetime.now(timezone.utc)}
    if request.question:
        update_data["question"] = request.question
    if request.status:
        update_data["status"] = request.status
    if request.ends_at:
        update_data["ends_at"] = request.ends_at
    if request.pinned is not None:
        update_data["pinned"] = request.pinned
    
    await db.polls.update_one({"id": poll_id}, {"$set": update_data})
    
    updated = await db.polls.find_one({"id": poll_id}, {"_id": 0})
    return {"success": True, "poll": updated}


@router.delete("/{poll_id}")
async def delete_poll(
    poll_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a poll (creator only)"""
    result = await db.polls.delete_one({"id": poll_id, "creator_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Poll not found or not owned by you")
    
    # Also delete votes
    await db.poll_votes.delete_many({"poll_id": poll_id})
    
    return {"success": True, "message": "Poll deleted"}


# ============ Q&A ============

@router.post("/qa")
async def submit_question(
    request: CreateQARequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit a question to a creator"""
    qa_id = str(uuid.uuid4())
    qa_doc = {
        "id": qa_id,
        "series_id": request.series_id,
        "episode_id": request.episode_id,
        "user_id": current_user["id"],
        "username": current_user.get("username") or current_user.get("name", "Anonymous"),
        "user_avatar": current_user.get("avatar"),
        "question": request.question,
        "upvotes": 0,
        "upvoted_by": [],
        "is_answered": False,
        "answer": None,
        "answered_at": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.qa_questions.insert_one(qa_doc)
    del qa_doc["_id"]
    del qa_doc["upvoted_by"]
    
    return {"success": True, "question": qa_doc}


@router.get("/qa/series/{series_id}")
async def get_series_questions(
    series_id: str,
    answered_only: bool = False,
    sort_by: str = "upvotes",  # upvotes, newest, answered
    limit: int = 20,
    skip: int = 0,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """Get Q&A questions for a series"""
    query = {"series_id": series_id}
    if answered_only:
        query["is_answered"] = True
    
    sort_field = "upvotes" if sort_by == "upvotes" else "created_at" if sort_by == "newest" else "answered_at"
    sort_order = -1
    
    questions = await db.qa_questions.find(
        query, 
        {"_id": 0, "upvoted_by": 0}
    ).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.qa_questions.count_documents(query)
    
    # Check if user upvoted
    if current_user:
        for q in questions:
            upvote_check = await db.qa_questions.find_one(
                {"id": q["id"], "upvoted_by": current_user["id"]},
                {"_id": 1}
            )
            q["user_upvoted"] = upvote_check is not None
    
    return {"questions": questions, "total": total}


@router.get("/qa/creator/pending")
async def get_pending_questions(
    series_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get unanswered questions for creator"""
    # Get creator's series
    creator_series = await db.creator_series.find(
        {"creator_id": current_user["id"]},
        {"_id": 0, "id": 1}
    ).to_list(length=100)
    
    series_ids = [s["id"] for s in creator_series]
    
    query = {"series_id": {"$in": series_ids}, "is_answered": False}
    if series_id:
        query["series_id"] = series_id
    
    questions = await db.qa_questions.find(
        query,
        {"_id": 0, "upvoted_by": 0}
    ).sort("upvotes", -1).to_list(length=50)
    
    return {"questions": questions, "total": len(questions)}


@router.post("/qa/{question_id}/answer")
async def answer_question(
    question_id: str,
    request: AnswerQARequest,
    current_user: dict = Depends(get_current_user)
):
    """Answer a question (creator only)"""
    question = await db.qa_questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Verify creator owns the series
    series = await db.creator_series.find_one({
        "id": question["series_id"],
        "creator_id": current_user["id"]
    })
    if not series and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="You can only answer questions on your series")
    
    await db.qa_questions.update_one(
        {"id": question_id},
        {"$set": {
            "is_answered": True,
            "answer": request.answer,
            "answered_at": datetime.now(timezone.utc)
        }}
    )
    
    updated = await db.qa_questions.find_one({"id": question_id}, {"_id": 0, "upvoted_by": 0})
    return {"success": True, "question": updated}


@router.post("/qa/{question_id}/upvote")
async def upvote_question(
    question_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Upvote a question"""
    question = await db.qa_questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if already upvoted
    if current_user["id"] in question.get("upvoted_by", []):
        # Remove upvote
        await db.qa_questions.update_one(
            {"id": question_id},
            {
                "$pull": {"upvoted_by": current_user["id"]},
                "$inc": {"upvotes": -1}
            }
        )
        return {"success": True, "action": "removed", "upvotes": question["upvotes"] - 1}
    else:
        # Add upvote
        await db.qa_questions.update_one(
            {"id": question_id},
            {
                "$push": {"upvoted_by": current_user["id"]},
                "$inc": {"upvotes": 1}
            }
        )
        return {"success": True, "action": "added", "upvotes": question["upvotes"] + 1}


@router.delete("/qa/{question_id}")
async def delete_question(
    question_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a question (owner or creator of series)"""
    question = await db.qa_questions.find_one({"id": question_id})
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check permission
    is_owner = question["user_id"] == current_user["id"]
    is_series_creator = await db.creator_series.find_one({
        "id": question["series_id"],
        "creator_id": current_user["id"]
    }) is not None
    is_admin = current_user.get("role") == "admin"
    
    if not (is_owner or is_series_creator or is_admin):
        raise HTTPException(status_code=403, detail="Not authorized to delete this question")
    
    await db.qa_questions.delete_one({"id": question_id})
    return {"success": True, "message": "Question deleted"}
