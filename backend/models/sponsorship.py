"""
Sponsorship Marketplace Models
- Brand campaigns
- Creator applications
- Admin approval workflow
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class SponsorshipStatus(str, Enum):
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    SHORTLISTED = "shortlisted"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    COMPLETED = "completed"


class SponsorshipType(str, Enum):
    PRODUCT_PLACEMENT = "product_placement"
    DEDICATED_EPISODE = "dedicated_episode"
    SERIES_SPONSOR = "series_sponsor"
    SHOUTOUT = "shoutout"
    BRAND_INTEGRATION = "brand_integration"
    AFFILIATE = "affiliate"


class PaymentType(str, Enum):
    FIXED = "fixed"  # Fixed amount
    PER_VIEW = "per_view"  # Pay per view
    HYBRID = "hybrid"  # Fixed + per view bonus
    REVENUE_SHARE = "revenue_share"  # Percentage of episode earnings


# ============ BRAND MODELS ============

class BrandCreate(BaseModel):
    """Register a new brand for sponsorships"""
    company_name: str = Field(..., min_length=2, max_length=100)
    contact_name: str = Field(..., min_length=2, max_length=100)
    contact_email: str
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    description: str = Field(..., max_length=1000)
    industry: str  # e.g., "Fashion", "Tech", "Food & Beverage"
    budget_range_min: int = Field(default=1000, ge=100)
    budget_range_max: int = Field(default=100000, ge=100)


class BrandResponse(BaseModel):
    """Brand profile response"""
    id: str
    user_id: str
    company_name: str
    contact_name: str
    contact_email: str
    contact_phone: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    description: str
    industry: str
    budget_range_min: int
    budget_range_max: int
    is_verified: bool
    total_campaigns: int
    total_spent_coins: int
    created_at: str


# ============ CAMPAIGN MODELS ============

class CampaignCreate(BaseModel):
    """Create a new sponsorship campaign"""
    title: str = Field(..., min_length=5, max_length=100)
    description: str = Field(..., max_length=2000)
    sponsorship_type: SponsorshipType
    payment_type: PaymentType
    
    # Budget
    budget_coins: int = Field(..., ge=100)
    per_view_rate: Optional[int] = None  # Coins per 1000 views
    revenue_share_percent: Optional[int] = Field(default=None, ge=1, le=50)
    
    # Requirements
    min_followers: Optional[int] = None
    min_views: Optional[int] = None
    preferred_genres: Optional[List[str]] = None
    required_deliverables: List[str] = []  # e.g., ["1 dedicated episode", "3 social posts"]
    
    # Timeline
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    application_deadline: Optional[str] = None
    
    # Assets
    brand_assets_url: Optional[str] = None  # Link to brand kit/assets
    guidelines: Optional[str] = None  # Content guidelines
    
    # Targeting
    target_audience: Optional[str] = None
    target_regions: Optional[List[str]] = None
    max_creators: int = Field(default=5, ge=1, le=100)


class CampaignUpdate(BaseModel):
    """Update campaign"""
    title: Optional[str] = None
    description: Optional[str] = None
    budget_coins: Optional[int] = None
    status: Optional[SponsorshipStatus] = None
    application_deadline: Optional[str] = None
    max_creators: Optional[int] = None
    guidelines: Optional[str] = None


class CampaignResponse(BaseModel):
    """Campaign response"""
    id: str
    brand_id: str
    brand_name: str
    brand_logo: Optional[str]
    title: str
    description: str
    sponsorship_type: SponsorshipType
    payment_type: PaymentType
    budget_coins: int
    per_view_rate: Optional[int]
    revenue_share_percent: Optional[int]
    min_followers: Optional[int]
    min_views: Optional[int]
    preferred_genres: Optional[List[str]]
    required_deliverables: List[str]
    start_date: Optional[str]
    end_date: Optional[str]
    application_deadline: Optional[str]
    brand_assets_url: Optional[str]
    guidelines: Optional[str]
    target_audience: Optional[str]
    target_regions: Optional[List[str]]
    max_creators: int
    current_creators: int
    total_applications: int
    status: SponsorshipStatus
    admin_notes: Optional[str]
    created_at: str
    updated_at: str


# ============ APPLICATION MODELS ============

class ApplicationCreate(BaseModel):
    """Creator applies to a campaign"""
    campaign_id: str
    pitch: str = Field(..., min_length=50, max_length=2000)
    proposed_content: str = Field(..., max_length=1000)  # What they'll create
    proposed_timeline: Optional[str] = None
    asking_price_coins: Optional[int] = None  # Their rate (for negotiation)
    portfolio_links: Optional[List[str]] = None  # Links to past work
    series_id: Optional[str] = None  # If applying for specific series


class ApplicationResponse(BaseModel):
    """Application response"""
    id: str
    campaign_id: str
    campaign_title: str
    creator_id: str
    creator_name: str
    creator_avatar: Optional[str]
    creator_stats: dict  # followers, views, etc.
    pitch: str
    proposed_content: str
    proposed_timeline: Optional[str]
    asking_price_coins: Optional[int]
    final_price_coins: Optional[int]
    portfolio_links: Optional[List[str]]
    series_id: Optional[str]
    series_title: Optional[str]
    status: ApplicationStatus
    brand_feedback: Optional[str]
    admin_notes: Optional[str]
    created_at: str
    updated_at: str


class ApplicationStatusUpdate(BaseModel):
    """Update application status"""
    status: ApplicationStatus
    feedback: Optional[str] = None
    final_price_coins: Optional[int] = None


# ============ CREATOR OUTREACH MODELS ============

class CreatorOutreach(BaseModel):
    """Brand reaches out to a specific creator"""
    creator_id: str
    campaign_id: Optional[str] = None  # Link to existing campaign or create new
    message: str = Field(..., min_length=20, max_length=2000)
    proposed_budget_coins: int = Field(..., ge=100)
    sponsorship_type: SponsorshipType
    deliverables: List[str]


class OutreachResponse(BaseModel):
    """Outreach response"""
    id: str
    brand_id: str
    brand_name: str
    creator_id: str
    creator_name: str
    campaign_id: Optional[str]
    message: str
    proposed_budget_coins: int
    sponsorship_type: SponsorshipType
    deliverables: List[str]
    status: str  # pending, accepted, declined, negotiating
    creator_response: Optional[str]
    created_at: str
    responded_at: Optional[str]
