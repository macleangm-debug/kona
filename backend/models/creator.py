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
class CreatorSeriesCreate(BaseModel):
    """Create a new series as a creator"""
    title: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=20, max_length=1000)
    genre: str
    thumbnail_url: Optional[str] = None

class CreatorEpisodeCreate(BaseModel):
    """Create a new episode as a creator"""
    series_id: str
    episode_number: int = Field(..., ge=1)
    title: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    is_free: bool = False
    coins_required: int = Field(default=5, ge=0, le=50)

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
    status: str = "draft"  # draft, pending_review, published, rejected
    total_episodes: int = 0
    total_views: int = 0
    total_earnings: int = 0
    created_at: str
    published_at: Optional[str] = None

class CreatorEpisode(BaseModel):
    """Episode in a creator's series"""
    id: str
    series_id: str
    creator_id: str
    episode_number: int
    title: str
    description: Optional[str]
    bunny_video_id: Optional[str] = None
    encoding_status: str = "pending"  # pending, uploading, encoding, ready, failed
    duration: Optional[int] = None
    thumbnail: Optional[str] = None
    is_free: bool = False
    coins_required: int = 5
    views: int = 0
    earnings: int = 0
    created_at: str
    published_at: Optional[str] = None

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
