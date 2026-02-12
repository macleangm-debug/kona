"""
Careers/Job Application Routes
Handles job applications with automated filtering
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
from services.database import db
from services import get_current_user
import uuid
import re

router = APIRouter()

# ============ MODELS ============
class JobApplication(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=8, max_length=20)
    country: str = Field(..., min_length=2, max_length=50)
    position_interest: str = Field(..., min_length=2, max_length=100)  # e.g., "Engineering", "Content", "Marketing"
    experience_years: int = Field(..., ge=0, le=50)
    current_role: Optional[str] = Field(None, max_length=100)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    resume_url: Optional[str] = Field(None, max_length=500)
    cover_letter: str = Field(..., min_length=50, max_length=5000)
    skills: List[str] = Field(default_factory=list)
    how_heard: Optional[str] = Field(None, max_length=100)  # How they heard about Kona
    available_start: Optional[str] = Field(None, max_length=50)  # When can they start
    salary_expectation: Optional[str] = Field(None, max_length=50)

class ApplicationResponse(BaseModel):
    id: str
    status: str
    message: str

class AdminApplicationUpdate(BaseModel):
    status: str  # "pending", "reviewed", "shortlisted", "interview", "rejected", "hired"
    admin_notes: Optional[str] = None
    interview_date: Optional[str] = None

# ============ KEYWORD FILTER MODELS ============
class KeywordFilter(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)  # e.g., "Backend Engineer"
    position_type: str = Field(..., min_length=2, max_length=100)  # e.g., "Engineering"
    required_skills: List[str] = Field(default_factory=list)  # Must have these
    preferred_skills: List[str] = Field(default_factory=list)  # Nice to have
    required_keywords: List[str] = Field(default_factory=list)  # Must appear in cover letter
    min_experience: int = Field(0, ge=0, le=50)
    is_active: bool = True

class KeywordFilterUpdate(BaseModel):
    name: Optional[str] = None
    position_type: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    required_keywords: Optional[List[str]] = None
    min_experience: Optional[int] = None
    is_active: Optional[bool] = None

# ============ ADMIN DEPENDENCY ============
async def require_admin(user: dict = Depends(get_current_user)):
    """Dependency to require admin privileges"""
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ SKILL MATCHING ALGORITHM ============
def calculate_skill_match(application: dict, keyword_filter: dict) -> dict:
    """
    Calculate how well an application matches a keyword filter.
    Returns match percentage and details.
    """
    app_skills = [s.lower().strip() for s in application.get("skills", [])]
    cover_letter = application.get("cover_letter", "").lower()
    experience = application.get("experience_years", 0)
    
    required_skills = [s.lower().strip() for s in keyword_filter.get("required_skills", [])]
    preferred_skills = [s.lower().strip() for s in keyword_filter.get("preferred_skills", [])]
    required_keywords = [k.lower().strip() for k in keyword_filter.get("required_keywords", [])]
    min_exp = keyword_filter.get("min_experience", 0)
    
    # Calculate required skills match
    required_matched = []
    required_missing = []
    for skill in required_skills:
        # Check exact match or partial match in skills list
        matched = any(skill in app_skill or app_skill in skill for app_skill in app_skills)
        # Also check if mentioned in cover letter
        if not matched:
            matched = skill in cover_letter
        if matched:
            required_matched.append(skill)
        else:
            required_missing.append(skill)
    
    # Calculate preferred skills match
    preferred_matched = []
    for skill in preferred_skills:
        matched = any(skill in app_skill or app_skill in skill for app_skill in app_skills)
        if not matched:
            matched = skill in cover_letter
        if matched:
            preferred_matched.append(skill)
    
    # Calculate keyword match
    keywords_matched = []
    keywords_missing = []
    for keyword in required_keywords:
        if keyword in cover_letter:
            keywords_matched.append(keyword)
        else:
            keywords_missing.append(keyword)
    
    # Experience check
    meets_experience = experience >= min_exp
    
    # Calculate overall match percentage
    total_required = len(required_skills) + len(required_keywords)
    total_matched_required = len(required_matched) + len(keywords_matched)
    
    # Required items are 70% of score, preferred are 30%
    if total_required > 0:
        required_score = (total_matched_required / total_required) * 70
    else:
        required_score = 70  # No requirements = full score
    
    if len(preferred_skills) > 0:
        preferred_score = (len(preferred_matched) / len(preferred_skills)) * 30
    else:
        preferred_score = 30  # No preferences = full score
    
    # Experience penalty
    if not meets_experience:
        required_score *= 0.8  # 20% penalty for not meeting experience
    
    match_percentage = round(required_score + preferred_score)
    
    # Determine qualification level
    if match_percentage >= 80 and len(required_missing) == 0:
        qualification = "excellent"
    elif match_percentage >= 60 and len(required_missing) <= 1:
        qualification = "good"
    elif match_percentage >= 40:
        qualification = "partial"
    else:
        qualification = "weak"
    
    return {
        "filter_id": keyword_filter.get("id"),
        "filter_name": keyword_filter.get("name"),
        "match_percentage": match_percentage,
        "qualification": qualification,
        "required_skills_matched": required_matched,
        "required_skills_missing": required_missing,
        "preferred_skills_matched": preferred_matched,
        "keywords_matched": keywords_matched,
        "keywords_missing": keywords_missing,
        "meets_experience": meets_experience,
        "experience_required": min_exp,
        "experience_has": experience
    }

# ============ AUTOMATED SCORING ============
def calculate_application_score(application: dict) -> dict:
    """
    Automatically scores and filters applications based on criteria.
    Returns score (0-100) and flags for HR review.
    """
    score = 0
    flags = []
    
    # Experience scoring (max 25 points)
    exp = application.get("experience_years", 0)
    if exp >= 5:
        score += 25
    elif exp >= 3:
        score += 20
    elif exp >= 1:
        score += 10
    else:
        score += 5
        flags.append("entry_level")
    
    # Cover letter quality (max 25 points)
    cover_letter = application.get("cover_letter", "")
    word_count = len(cover_letter.split())
    if word_count >= 150:
        score += 25
    elif word_count >= 100:
        score += 20
    elif word_count >= 50:
        score += 10
    else:
        flags.append("short_cover_letter")
    
    # Check for key terms in cover letter
    key_terms = ["streaming", "content", "africa", "entertainment", "growth", "team", "passionate"]
    term_count = sum(1 for term in key_terms if term.lower() in cover_letter.lower())
    score += min(term_count * 3, 15)  # Max 15 points for relevant terms
    
    # Profile completeness (max 20 points)
    completeness_score = 0
    if application.get("linkedin_url"):
        completeness_score += 5
    if application.get("portfolio_url"):
        completeness_score += 5
    if application.get("resume_url"):
        completeness_score += 5
    if len(application.get("skills", [])) >= 3:
        completeness_score += 5
    score += completeness_score
    
    # Location bonus for African countries (max 15 points)
    african_countries = [
        "kenya", "nigeria", "south africa", "ghana", "tanzania", "uganda", 
        "ethiopia", "rwanda", "senegal", "ivory coast", "cameroon", "morocco"
    ]
    country = application.get("country", "").lower()
    if any(c in country for c in african_countries):
        score += 15
        flags.append("african_candidate")
    
    # Determine priority
    if score >= 75:
        priority = "high"
    elif score >= 50:
        priority = "medium"
    else:
        priority = "low"
    
    return {
        "score": min(score, 100),
        "priority": priority,
        "flags": flags
    }

# ============ PUBLIC ROUTES ============
@router.post("/applications", response_model=ApplicationResponse)
async def submit_application(application: JobApplication):
    """Submit a new job application"""
    
    # Check for duplicate applications (same email in last 30 days)
    thirty_days_ago = datetime.now(timezone.utc).replace(day=datetime.now().day - 30)
    existing = await db.job_applications.find_one({
        "email": application.email.lower(),
        "created_at": {"$gte": thirty_days_ago.isoformat()}
    })
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted an application recently. Please wait before applying again."
        )
    
    # Create application document
    app_id = str(uuid.uuid4())
    app_data = {
        "id": app_id,
        **application.model_dump(),
        "email": application.email.lower(),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    # Calculate automated score
    scoring = calculate_application_score(app_data)
    app_data["auto_score"] = scoring["score"]
    app_data["priority"] = scoring["priority"]
    app_data["flags"] = scoring["flags"]
    
    # Insert into database
    await db.job_applications.insert_one(app_data)
    
    return ApplicationResponse(
        id=app_id,
        status="submitted",
        message="Thank you for your application! Our team will review it and get back to you within 2 weeks."
    )

@router.get("/applications/check")
async def check_application_status(email: str = Query(...)):
    """Check application status by email"""
    application = await db.job_applications.find_one(
        {"email": email.lower()},
        {"_id": 0, "id": 1, "status": 1, "position_interest": 1, "created_at": 1}
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="No application found with this email")
    
    status_messages = {
        "pending": "Your application is being reviewed.",
        "reviewed": "Your application has been reviewed by our team.",
        "shortlisted": "Congratulations! You've been shortlisted for the next round.",
        "interview": "You've been selected for an interview! Check your email for details.",
        "rejected": "Thank you for your interest, but we've decided to move forward with other candidates.",
        "hired": "Welcome to the team! Check your email for onboarding details."
    }
    
    return {
        "id": application["id"],
        "status": application["status"],
        "position": application["position_interest"],
        "submitted_at": application["created_at"],
        "message": status_messages.get(application["status"], "Status unknown")
    }

# ============ ADMIN ROUTES ============
@router.get("/admin/applications")
async def get_all_applications(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    position: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    """Get all applications for admin review"""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if position:
        query["position_interest"] = {"$regex": position, "$options": "i"}
    
    applications = await db.job_applications.find(
        query,
        {"_id": 0}
    ).sort([
        ("priority", -1),  # High priority first
        ("auto_score", -1),  # Then by score
        ("created_at", -1)  # Then by date
    ]).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.job_applications.count_documents(query)
    
    # Stats
    stats = {
        "total": total,
        "pending": await db.job_applications.count_documents({"status": "pending"}),
        "shortlisted": await db.job_applications.count_documents({"status": "shortlisted"}),
        "interview": await db.job_applications.count_documents({"status": "interview"}),
        "high_priority": await db.job_applications.count_documents({"priority": "high"})
    }
    
    return {"applications": applications, "total": total, "stats": stats}

@router.get("/admin/applications/{app_id}")
async def get_application_detail(app_id: str):
    """Get detailed view of a single application"""
    application = await db.job_applications.find_one(
        {"id": app_id},
        {"_id": 0}
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return application

@router.put("/admin/applications/{app_id}")
async def update_application_status(app_id: str, update: AdminApplicationUpdate):
    """Update application status (admin only)"""
    valid_statuses = ["pending", "reviewed", "shortlisted", "interview", "rejected", "hired"]
    if update.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    update_data = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update.admin_notes:
        update_data["admin_notes"] = update.admin_notes
    if update.interview_date:
        update_data["interview_date"] = update.interview_date
    
    result = await db.job_applications.update_one(
        {"id": app_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"success": True, "message": f"Application status updated to {update.status}"}

@router.delete("/admin/applications/{app_id}")
async def delete_application(app_id: str):
    """Delete an application (admin only)"""
    result = await db.job_applications.delete_one({"id": app_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"success": True, "message": "Application deleted"}
