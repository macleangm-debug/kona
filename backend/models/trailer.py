"""
Series Trailer Creator Models
- Video processing with FFmpeg
- Manual and AI scene selection
- Trailer generation
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class TrailerStatus(str, Enum):
    DRAFT = "draft"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class SceneSelectionMethod(str, Enum):
    MANUAL = "manual"
    AI_AUTO = "ai_auto"
    HYBRID = "hybrid"


class ExportFormat(str, Enum):
    MP4_1080P = "mp4_1080p"
    MP4_720P = "mp4_720p"
    MP4_480P = "mp4_480p"
    VERTICAL_9_16 = "vertical_9_16"  # For TikTok, Reels
    SQUARE_1_1 = "square_1_1"  # For Instagram


# ============ SCENE MODELS ============

class SceneMarker(BaseModel):
    """A marked scene/highlight in an episode"""
    episode_id: str
    start_time: float  # Seconds
    end_time: float  # Seconds
    label: Optional[str] = None  # e.g., "Dramatic moment", "Action scene"
    ai_score: Optional[float] = None  # AI excitement score 0-1
    thumbnail_url: Optional[str] = None


class AISceneDetection(BaseModel):
    """AI-detected exciting moments"""
    episode_id: str
    scenes: List[SceneMarker]
    detection_method: str  # e.g., "audio_peak", "motion", "face_expression"
    processing_time_ms: int


# ============ TRAILER MODELS ============

class TrailerCreate(BaseModel):
    """Create a new trailer project"""
    series_id: str
    title: str = Field(default="Official Trailer", max_length=100)
    target_duration: int = Field(default=30, ge=15, le=120)  # Seconds
    selection_method: SceneSelectionMethod = SceneSelectionMethod.HYBRID
    include_title_card: bool = True
    include_end_card: bool = True
    background_music_id: Optional[str] = None


class TrailerSceneAdd(BaseModel):
    """Add scenes to a trailer"""
    scenes: List[SceneMarker]


class TrailerUpdate(BaseModel):
    """Update trailer settings"""
    title: Optional[str] = None
    target_duration: Optional[int] = None
    include_title_card: Optional[bool] = None
    include_end_card: Optional[bool] = None
    scene_order: Optional[List[str]] = None  # Reorder scene IDs
    background_music_id: Optional[str] = None
    transition_style: Optional[str] = None  # "cut", "fade", "dissolve"


class TrailerResponse(BaseModel):
    """Trailer project response"""
    id: str
    series_id: str
    series_title: str
    creator_id: str
    title: str
    target_duration: int
    actual_duration: Optional[float]
    selection_method: SceneSelectionMethod
    scenes: List[SceneMarker]
    include_title_card: bool
    include_end_card: bool
    background_music_id: Optional[str]
    transition_style: str
    status: TrailerStatus
    progress_percent: int
    preview_url: Optional[str]
    exports: List[dict]  # List of exported formats and URLs
    created_at: str
    updated_at: str
    processed_at: Optional[str]


class TrailerExportRequest(BaseModel):
    """Request to export trailer in specific format"""
    format: ExportFormat
    add_watermark: bool = False
    watermark_text: Optional[str] = None


class TrailerExportResponse(BaseModel):
    """Export result"""
    trailer_id: str
    format: ExportFormat
    url: str
    file_size_mb: float
    duration: float
    resolution: str
    created_at: str


# ============ BACKGROUND MUSIC MODELS ============

class BackgroundMusic(BaseModel):
    """Background music for trailers"""
    id: str
    title: str
    artist: Optional[str]
    duration: float
    genre: str  # "dramatic", "action", "romantic", "upbeat"
    preview_url: str
    is_premium: bool
    coins_required: int  # 0 for free tracks


# ============ PROCESSING JOB MODELS ============

class TrailerJob(BaseModel):
    """Background processing job for trailer"""
    job_id: str
    trailer_id: str
    status: str  # queued, processing, completed, failed
    progress_percent: int
    current_step: str  # "extracting_scenes", "adding_transitions", "encoding"
    started_at: Optional[str]
    completed_at: Optional[str]
    error_message: Optional[str]
