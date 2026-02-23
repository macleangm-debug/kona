"""
Tip Jar / Super Coins Models
Pydantic models for creator tipping system
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TipTier(str, Enum):
    SMALL = "small"      # 10 coins
    MEDIUM = "medium"    # 50 coins
    LARGE = "large"      # 100 coins
    SUPER = "super"      # 500 coins
    MEGA = "mega"        # 1000 coins


TIP_AMOUNTS = {
    TipTier.SMALL: 10,
    TipTier.MEDIUM: 50,
    TipTier.LARGE: 100,
    TipTier.SUPER: 500,
    TipTier.MEGA: 1000
}

TIP_EFFECTS = {
    TipTier.SMALL: {"animation": "sparkle", "duration": 2, "color": "#FFD700"},
    TipTier.MEDIUM: {"animation": "hearts", "duration": 3, "color": "#FF69B4"},
    TipTier.LARGE: {"animation": "fireworks", "duration": 4, "color": "#00BFFF"},
    TipTier.SUPER: {"animation": "rainbow", "duration": 5, "color": "#9400D3"},
    TipTier.MEGA: {"animation": "explosion", "duration": 6, "color": "#FF4500"}
}


class SendTipRequest(BaseModel):
    creator_id: str
    series_id: Optional[str] = None
    episode_id: Optional[str] = None
    tier: TipTier
    message: Optional[str] = Field(None, max_length=200)
    anonymous: bool = False


class TipResponse(BaseModel):
    id: str
    tipper_id: str
    tipper_name: str
    tipper_avatar: Optional[str] = None
    creator_id: str
    creator_name: str
    series_id: Optional[str] = None
    episode_id: Optional[str] = None
    tier: TipTier
    amount: int
    message: Optional[str] = None
    anonymous: bool = False
    effect: dict
    created_at: datetime


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    username: str
    avatar: Optional[str] = None
    total_tips: int
    total_amount: int
    favorite_creator: Optional[str] = None


class CreatorTipStats(BaseModel):
    total_tips_received: int
    total_coins_received: int
    tips_today: int
    coins_today: int
    tips_this_week: int
    coins_this_week: int
    tips_this_month: int
    coins_this_month: int
    top_tipper: Optional[dict] = None
    recent_tips: List[dict] = []
