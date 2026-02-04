"""
Creator Partnership Models
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime

# ============ CREATOR MODELS ============
class CreatorApplication(BaseModel):
    """Application to become a creator"""
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    bio: str = Field(..., min_length=20, max_length=500)
    portfolio_url: Optional[str] = None
    content_type: str = Field(..., description="Type of content: romance, drama, thriller, etc.")
    sample_video_url: Optional[str] = None
    expected_uploads_per_month: int = Field(default=4, ge=1, le=30)

class CreatorProfile(BaseModel):
    """Creator profile in the system"""
    id: str
    user_id: str
    name: str
    email: str
    bio: str
    avatar_url: Optional[str] = None
    tier: str = "new"  # new, verified, partner
    status: str = "pending"  # pending, approved, rejected, suspended
    revenue_share: float = 0.60  # 60% default
    total_views: int = 0
    total_earnings: int = 0  # in coins
    pending_payout: int = 0
    series_count: int = 0
    created_at: str
    approved_at: Optional[str] = None

class CreatorDashboardStats(BaseModel):
    """Dashboard statistics for creators"""
    total_series: int
    total_episodes: int
    total_views: int
    total_earnings: int
    pending_payout: int
    this_month_views: int
    this_month_earnings: int
    tier: str
    revenue_share: float

# ============ CREATOR CONTENT MODELS ============

# Series Submission for Approval
class SeriesSubmission(BaseModel):
    """Submit a new series for approval with pilot episode"""
    # Series Info
    title: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=50, max_length=2000)
    genre: str
    target_audience: str = Field(..., description="e.g., 18-35 female, family-friendly")
    content_rating: str = Field(default="PG-13", description="G, PG, PG-13, R")
    language: str = Field(default="en")
    thumbnail_url: Optional[str] = None
    
    # Pilot Episode Info
    pilot_title: str = Field(..., min_length=2, max_length=100)
    pilot_description: str = Field(..., min_length=20, max_length=500)
    pilot_video_url: str = Field(..., description="URL to pilot episode video")
    pilot_duration: Optional[int] = Field(default=None, description="Duration in seconds")
    
    # Series Plan
    planned_seasons: int = Field(default=1, ge=1, le=10)
    episodes_per_season: int = Field(default=10, ge=5, le=50)
    release_schedule: str = Field(default="weekly", description="daily, weekly, biweekly")
    
    # Additional Info
    unique_selling_point: str = Field(..., min_length=20, max_length=500, description="What makes this series special?")

class SeriesSubmissionResponse(BaseModel):
    """Response after submitting series for approval"""
    submission_id: str
    status: str  # pending_review, under_review, approved, rejected
    message: str
    estimated_review_time: str

class SeasonCreate(BaseModel):
    """Create a new season for an approved series"""
    series_id: str
    season_number: int = Field(..., ge=1, le=20)
    title: Optional[str] = Field(default=None, description="e.g., 'The Beginning'")
    description: Optional[str] = None

class CreatorSeriesCreate(BaseModel):
    """Create a new series as a creator"""
    title: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=20, max_length=1000)
    genre: str
    thumbnail_url: Optional[str] = None

class CreatorEpisodeCreate(BaseModel):
    """Create a new episode as a creator"""
    series_id: str
    season_number: int = Field(default=1, ge=1, le=20)
    episode_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    video_url: Optional[str] = None
    is_free: bool = False
    coins_required: int = Field(default=5, ge=0, le=50)
    intro_duration: int = Field(default=30, ge=0, le=120, description="Intro duration in seconds for Skip Intro feature")
    subtitles: Optional[dict] = Field(default=None, description="Subtitle URLs: {en: 'url', sw: 'url', fr: 'url'}")


class SubtitleUpload(BaseModel):
    """Upload subtitles for an episode"""
    episode_id: str
    language: str = Field(..., description="Language code: en, sw, fr")
    subtitle_url: str = Field(..., description="URL to .vtt subtitle file")


class EpisodeUpdate(BaseModel):
    """Update episode settings"""
    title: Optional[str] = None
    description: Optional[str] = None
    is_free: Optional[bool] = None
    coins_required: Optional[int] = Field(default=None, ge=0, le=50)
    intro_duration: Optional[int] = Field(default=None, ge=0, le=120)
    subtitles: Optional[dict] = Field(default=None, description="Subtitle URLs")

class VideoUploadResponse(BaseModel):
    """Response after initiating video upload"""
    video_id: str
    upload_url: str
    episode_id: str

class CreatorSeries(BaseModel):
    """Series owned by a creator"""
    id: str
    creator_id: str
    title: str
    description: str
    genre: str
    thumbnail: str
    target_audience: Optional[str] = None
    content_rating: str = "PG-13"
    language: str = "en"
    status: str = "pending_review"  # pending_review, under_review, approved, rejected, published
    rejection_reason: Optional[str] = None
    total_seasons: int = 1
    total_episodes: int = 0
    total_views: int = 0
    total_earnings: int = 0
    created_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None
    published_at: Optional[str] = None

class Season(BaseModel):
    """Season within a series"""
    id: str
    series_id: str
    creator_id: str
    season_number: int
    title: Optional[str] = None
    description: Optional[str] = None
    total_episodes: int = 0
    status: str = "active"  # active, completed
    created_at: str

class CreatorEpisode(BaseModel):
    """Episode in a creator's series"""
    id: str
    series_id: str
    season_id: str
    creator_id: str
    season_number: int
    episode_number: int
    episode_code: str  # e.g., "S01E03"
    title: str
    description: Optional[str]
    video_url: Optional[str] = None
    bunny_video_id: Optional[str] = None
    encoding_status: str = "pending"  # pending, uploading, encoding, ready, failed
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    is_free: bool = False
    is_pilot: bool = False
    coins_required: int = 5
    intro_duration: int = 30
    views: int = 0
    earnings: int = 0
    created_at: str
    published_at: Optional[str] = None

# ============ ADMIN REVIEW MODELS ============
class SubmissionReview(BaseModel):
    """Admin review of a series submission"""
    submission_id: str
    decision: str = Field(..., description="approved, rejected, request_changes")
    feedback: str = Field(..., min_length=10, max_length=1000)
    content_quality_score: int = Field(default=0, ge=0, le=10)
    market_fit_score: int = Field(default=0, ge=0, le=10)
    technical_quality_score: int = Field(default=0, ge=0, le=10)

class SubmissionStatus(BaseModel):
    """Status of a series submission"""
    submission_id: str
    series_title: str
    creator_name: str
    creator_email: str
    status: str
    submitted_at: str
    pilot_video_url: str
    genre: str
    planned_seasons: int
    episodes_per_season: int
    feedback: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None

# ============ REVENUE MODELS ============
class ViewRecord(BaseModel):
    """Record of a video view for revenue tracking"""
    id: str
    episode_id: str
    series_id: str
    creator_id: str
    user_id: Optional[str] = None  # None for guest views
    coins_spent: int
    creator_share: int
    platform_share: int
    timestamp: str

class PayoutRequest(BaseModel):
    """Creator payout request"""
    amount: int = Field(..., ge=100, description="Minimum 100 coins")
    payout_method: str = "mpesa"  # mpesa, bank, paypal
    payout_details: dict  # phone number, bank account, etc.

class PayoutRecord(BaseModel):
    """Record of a payout to creator"""
    id: str
    creator_id: str
    amount: int
    payout_method: str
    payout_details: dict
    status: str = "pending"  # pending, processing, completed, failed
    created_at: str
    processed_at: Optional[str] = None
