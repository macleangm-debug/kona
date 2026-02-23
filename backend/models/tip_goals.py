"""
Tip Goals Models
Pydantic models for creator tip goals/fundraising
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class GoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class CreateTipGoalRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    target_amount: int = Field(..., ge=100, le=1000000)  # 100 to 1M coins
    series_id: Optional[str] = None
    ends_at: Optional[datetime] = None
    show_on_profile: bool = True
    show_contributors: bool = True


class UpdateTipGoalRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    target_amount: Optional[int] = Field(None, ge=100, le=1000000)
    status: Optional[GoalStatus] = None
    show_on_profile: Optional[bool] = None
    show_contributors: Optional[bool] = None


class TipGoalContribution(BaseModel):
    id: str
    goal_id: str
    user_id: str
    username: str
    amount: int
    message: Optional[str] = None
    anonymous: bool = False
    created_at: datetime


class TipGoalResponse(BaseModel):
    id: str
    creator_id: str
    creator_name: str
    title: str
    description: Optional[str] = None
    target_amount: int
    current_amount: int
    progress_percent: float
    contributor_count: int
    series_id: Optional[str] = None
    series_title: Optional[str] = None
    status: GoalStatus
    ends_at: Optional[datetime] = None
    show_on_profile: bool
    show_contributors: bool
    top_contributors: List[dict] = []
    created_at: datetime
    completed_at: Optional[datetime] = None
