"""
Early Access Models
Pydantic models for premium early access feature
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class EarlyAccessTier(str, Enum):
    NONE = "none"           # No early access
    BASIC = "basic"         # 24 hours early
    PREMIUM = "premium"     # 48 hours early
    VIP = "vip"             # 72 hours early (1 week for series)


EARLY_ACCESS_HOURS = {
    EarlyAccessTier.NONE: 0,
    EarlyAccessTier.BASIC: 24,
    EarlyAccessTier.PREMIUM: 48,
    EarlyAccessTier.VIP: 72
}


class SetEarlyAccessRequest(BaseModel):
    early_access_tier: EarlyAccessTier = EarlyAccessTier.NONE
    early_access_hours: Optional[int] = Field(None, ge=0, le=168)  # Max 1 week
    early_access_price_coins: int = Field(default=0, ge=0)


class EarlyAccessSubscription(BaseModel):
    id: str
    user_id: str
    creator_id: str
    series_id: Optional[str] = None
    tier: EarlyAccessTier
    expires_at: datetime
    created_at: datetime


class SubscribeEarlyAccessRequest(BaseModel):
    creator_id: str
    series_id: Optional[str] = None
    tier: EarlyAccessTier = EarlyAccessTier.BASIC
    duration_days: int = Field(default=30, ge=1, le=365)
