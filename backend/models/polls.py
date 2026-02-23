"""
Fan Polls & Q&A Models
Pydantic models for creator polls and fan engagement
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PollType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    YES_NO = "yes_no"
    RATING = "rating"
    OPEN_ENDED = "open_ended"


class PollStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


class PollOption(BaseModel):
    id: str
    text: str
    votes: int = 0
    vote_percentage: float = 0.0


class CreatePollRequest(BaseModel):
    series_id: Optional[str] = None
    episode_id: Optional[str] = None
    question: str = Field(..., min_length=5, max_length=500)
    poll_type: PollType = PollType.MULTIPLE_CHOICE
    options: List[str] = Field(default=[], max_length=10)  # For multiple choice
    allow_multiple_votes: bool = False
    show_results_before_vote: bool = False
    ends_at: Optional[datetime] = None
    pinned: bool = False


class UpdatePollRequest(BaseModel):
    question: Optional[str] = Field(None, min_length=5, max_length=500)
    status: Optional[PollStatus] = None
    ends_at: Optional[datetime] = None
    pinned: Optional[bool] = None


class VoteRequest(BaseModel):
    option_ids: List[str] = Field(..., min_length=1)
    comment: Optional[str] = Field(None, max_length=500)  # For open-ended


class PollResponse(BaseModel):
    id: str
    creator_id: str
    creator_name: str
    series_id: Optional[str] = None
    series_title: Optional[str] = None
    episode_id: Optional[str] = None
    question: str
    poll_type: PollType
    options: List[PollOption] = []
    total_votes: int = 0
    status: PollStatus
    allow_multiple_votes: bool
    show_results_before_vote: bool
    ends_at: Optional[datetime] = None
    pinned: bool = False
    user_voted: bool = False
    user_vote_option_ids: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class QAQuestion(BaseModel):
    id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    question: str
    upvotes: int = 0
    is_answered: bool = False
    answer: Optional[str] = None
    answered_at: Optional[datetime] = None
    created_at: datetime


class CreateQARequest(BaseModel):
    series_id: Optional[str] = None
    episode_id: Optional[str] = None
    question: str = Field(..., min_length=10, max_length=1000)


class AnswerQARequest(BaseModel):
    answer: str = Field(..., min_length=1, max_length=2000)
