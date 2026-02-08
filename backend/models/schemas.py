"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
import re

# ============ AUTH MODELS ============
class UserCreate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    password: str
    name: str
    referral_code: Optional[str] = None
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v):
        if v:
            # Remove spaces and dashes
            cleaned = re.sub(r'[\s\-]', '', v)
            if not re.match(r'^\+?\d{9,15}$', cleaned):
                raise ValueError('Invalid phone number format')
            return cleaned
        return v

class UserCreatePhone(BaseModel):
    phone: str
    country_code: str
    password: str
    name: str
    referral_code: Optional[str] = None

class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str

class SendOTPRequest(BaseModel):
    phone: str
    country_code: str
    verification_method: str = "whatsapp"  # whatsapp, flash_call, sms

class VerifyOTPRequest(BaseModel):
    phone: str
    country_code: str
    otp: str

class OTPResponse(BaseModel):
    success: bool
    message: str
    expires_in: int = 300  # 5 minutes

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    country_code: Optional[str] = None
    name: str
    coins: int
    created_at: str
    last_daily_reward: Optional[str] = None
    referral_code: Optional[str] = None
    referral_count: int = 0
    referral_earnings: int = 0
    is_admin: bool = False
    is_super_admin: bool = False
    phone_verified: bool = False
    email_verified: bool = False

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

# ============ SERIES MODELS ============
class SeriesResponse(BaseModel):
    id: str
    title: str
    description: str
    thumbnail: str
    genre: str
    rating: float
    total_episodes: int
    views: int = 0
    featured: bool = False

class EpisodeResponse(BaseModel):
    id: str
    series_id: str
    episode_number: int
    title: str
    thumbnail: str
    duration: str
    video_url: str
    is_free: bool = False
    coins_required: int = 5
    intro_duration: int = 30  # Skip Intro duration in seconds

class UnlockEpisodeRequest(BaseModel):
    episode_id: str

# ============ COIN/PAYMENT MODELS ============
class CoinPackage(BaseModel):
    id: str
    coins: int
    price: float
    bonus: int
    popular: bool = False

class CheckoutRequest(BaseModel):
    package_id: str
    country_code: Optional[str] = None
    payment_method: Optional[str] = "card"

class WatchProgressUpdate(BaseModel):
    progress: float

# ============ COMING SOON MODELS ============
class ReminderRequest(BaseModel):
    series_id: str

class ComingSoonResponse(BaseModel):
    id: str
    title: str
    description: str
    thumbnail: str
    genre: str
    release_date: str
    teaser_url: Optional[str] = None
    reserved_count: int = 0

# ============ USER LIST MODELS ============
class MyListRequest(BaseModel):
    series_id: str

class SearchQuery(BaseModel):
    query: str
    limit: int = 20

# ============ SUBSCRIPTION MODELS ============
class SubscriptionPlan(BaseModel):
    id: str
    name: str
    price: float
    coins_per_month: int
    description: str
    features: List[str]
    popular: bool = False

class SubscribeRequest(BaseModel):
    plan_id: str
    country_code: Optional[str] = None
    payment_method: Optional[str] = "card"

# ============ ADMIN MODELS ============
class AdminSeriesCreate(BaseModel):
    title: str
    description: str
    thumbnail: str
    genre: str
    rating: float = 4.5
    total_episodes: int = 10
    featured: bool = False

class AdminEpisodeCreate(BaseModel):
    series_id: str
    episode_number: int
    title: str
    thumbnail: str
    duration: str
    video_url: str
    is_free: bool = False
    coins_required: int = 5
    is_story_content: bool = False  # If true, requires vertical video format (9:16)
    aspect_ratio: Optional[str] = None  # e.g., "9:16", "16:9", "1:1"

class AdminUserUpdate(BaseModel):
    coins: Optional[int] = None
    is_admin: Optional[bool] = None

# ============ PROMO MODELS ============
class FeaturedPromo(BaseModel):
    id: str
    series_id: str
    title: str
    subtitle: str
    description: Optional[str] = None
    promo_image: str
    tags: List[str] = []
    badge_text: Optional[str] = None
    is_active: bool = True
    priority: int = 0
    trigger_type: str = "both"
    delay_seconds: int = 10
    created_at: str
    expires_at: Optional[str] = None

class FeaturedPromoCreate(BaseModel):
    series_id: str
    title: str
    subtitle: str
    description: Optional[str] = None
    promo_image: str
    tags: List[str] = []
    badge_text: Optional[str] = None
    priority: int = 0
    trigger_type: str = "both"
    delay_seconds: int = 10

# ============ NOTIFICATION MODELS ============
class PushSubscription(BaseModel):
    endpoint: str
    keys: dict

class NotificationSettings(BaseModel):
    milestone_alerts: bool = True
    new_episodes: bool = True
    daily_rewards: bool = True
