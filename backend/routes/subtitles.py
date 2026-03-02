"""
Subtitle Management Routes
Supports multiple formats: .docx, .txt, .srt, .vtt
Includes in-app subtitle editor and auto-conversion
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import io

from services import db
from services.auth import get_current_user

router = APIRouter(prefix="/subtitles", tags=["Subtitles"])


class SubtitleCue(BaseModel):
    """A single subtitle cue with timing"""
    start_time: str  # Format: "00:00:00.000" or seconds
    end_time: str
    text: str


class SubtitleCreate(BaseModel):
    """Create subtitles from in-app editor"""
    episode_id: str
    language: str = Field(default="en", pattern="^(en|sw|fr|ar|pt|ha|am|zu)$")
    cues: List[SubtitleCue]


class SubtitleFromText(BaseModel):
    """Create subtitles from plain text (auto-timing)"""
    episode_id: str
    language: str = Field(default="en")
    text: str  # Plain text, one line per subtitle
    duration_per_line: float = Field(default=3.0, ge=1.0, le=10.0)  # seconds


class SubtitleLine(BaseModel):
    """Single line for in-app editor"""
    index: int
    start_time: float  # in seconds
    end_time: float
    text: str


LANGUAGE_NAMES = {
    "en": "English",
    "sw": "Swahili",
    "fr": "French",
    "ar": "Arabic",
    "pt": "Portuguese",
    "ha": "Hausa",
    "am": "Amharic",
    "zu": "Zulu"
}


def parse_time_to_seconds(time_str: str) -> float:
    """Convert time string to seconds"""
    # Handle VTT/SRT format: 00:00:00.000 or 00:00:00,000
    time_str = time_str.replace(',', '.')
    
    parts = time_str.split(':')
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return float(hours) * 3600 + float(minutes) * 60 + float(seconds)
    elif len(parts) == 2:
        minutes, seconds = parts
        return float(minutes) * 60 + float(seconds)
    else:
        return float(time_str)


def seconds_to_vtt_time(seconds: float) -> str:
    """Convert seconds to VTT time format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def parse_srt(content: str) -> List[dict]:
    """Parse SRT format to subtitle cues"""
    cues = []
    blocks = re.split(r'\n\n+', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) >= 3:
            # Line 0: index number
            # Line 1: timing (00:00:00,000 --> 00:00:00,000)
            # Line 2+: text
            timing_match = re.match(
                r'(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})',
                lines[1]
            )
            if timing_match:
                cues.append({
                    "start": parse_time_to_seconds(timing_match.group(1)),
                    "end": parse_time_to_seconds(timing_match.group(2)),
                    "text": '\n'.join(lines[2:])
                })
    
    return cues


def parse_vtt(content: str) -> List[dict]:
    """Parse VTT format to subtitle cues"""
    cues = []
    # Remove WEBVTT header
    content = re.sub(r'^WEBVTT.*\n', '', content, flags=re.MULTILINE)
    blocks = re.split(r'\n\n+', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        for i, line in enumerate(lines):
            timing_match = re.match(
                r'(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})',
                line
            )
            if timing_match:
                text_lines = lines[i+1:] if i+1 < len(lines) else []
                cues.append({
                    "start": parse_time_to_seconds(timing_match.group(1)),
                    "end": parse_time_to_seconds(timing_match.group(2)),
                    "text": '\n'.join(text_lines)
                })
                break
    
    return cues


def parse_docx(content: bytes) -> str:
    """Extract text from Word document"""
    try:
        from docx import Document
        doc = Document(io.BytesIO(content))
        
        full_text = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                full_text.append(text)
        
        return '\n'.join(full_text)
    except ImportError:
        raise HTTPException(status_code=500, detail="python-docx not installed")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse Word document: {str(e)}")


def parse_simple_timed_text(content: str) -> List[dict]:
    """
    Parse simple timed text format:
    [00:00] First subtitle line
    [00:03] Second subtitle line
    OR
    0:00 - First subtitle
    0:03 - Second subtitle
    """
    cues = []
    lines = content.strip().split('\n')
    
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        
        # Try format: [00:00] text or [00:00:00] text
        match1 = re.match(r'\[?(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\]?\s*[-:]?\s*(.+)', line)
        if match1:
            start_time = match1.group(1)
            text = match1.group(2).strip()
            
            # Calculate end time (next cue start or +3 seconds)
            start_seconds = parse_time_to_seconds(start_time)
            
            # Look ahead for next timestamp
            end_seconds = start_seconds + 3.0  # Default 3 seconds
            if i + 1 < len(lines):
                next_match = re.match(r'\[?(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\]?', lines[i+1])
                if next_match:
                    end_seconds = parse_time_to_seconds(next_match.group(1)) - 0.1
            
            cues.append({
                "start": start_seconds,
                "end": end_seconds,
                "text": text
            })
    
    return cues


def generate_vtt(cues: List[dict]) -> str:
    """Generate VTT content from cues"""
    vtt_lines = ["WEBVTT", ""]
    
    for i, cue in enumerate(cues, 1):
        start = seconds_to_vtt_time(cue["start"])
        end = seconds_to_vtt_time(cue["end"])
        vtt_lines.append(f"{i}")
        vtt_lines.append(f"{start} --> {end}")
        vtt_lines.append(cue["text"])
        vtt_lines.append("")
    
    return '\n'.join(vtt_lines)


async def verify_episode_ownership(episode_id: str, user_id: str) -> dict:
    """Verify user owns the episode"""
    creator = await db.creators.find_one({"user_id": user_id}, {"_id": 0})
    if not creator or creator["status"] != "approved":
        raise HTTPException(status_code=403, detail="Not an approved creator")
    
    episode = await db.creator_episodes.find_one({
        "id": episode_id,
        "creator_id": creator["id"]
    }, {"_id": 0})
    
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    return {"creator": creator, "episode": episode}


@router.post("/upload")
async def upload_subtitle_file(
    episode_id: str = Form(...),
    language: str = Form(default="en"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload subtitle file in various formats:
    - .vtt (WebVTT)
    - .srt (SubRip)
    - .txt (Plain text with timestamps or simple text)
    - .docx (Word document - extracts text and auto-times)
    
    Auto-converts to VTT format for video player compatibility.
    """
    data = await verify_episode_ownership(episode_id, current_user["id"])
    episode = data["episode"]
    
    # Validate language
    if language not in LANGUAGE_NAMES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid language. Supported: {list(LANGUAGE_NAMES.keys())}"
        )
    
    # Read file content
    content = await file.read()
    filename = file.filename.lower()
    
    cues = []
    
    try:
        if filename.endswith('.vtt'):
            # Already VTT format
            text_content = content.decode('utf-8')
            cues = parse_vtt(text_content)
            
        elif filename.endswith('.srt'):
            # SRT format - convert to VTT
            text_content = content.decode('utf-8')
            cues = parse_srt(text_content)
            
        elif filename.endswith('.docx'):
            # Word document - extract text and auto-time
            text_content = parse_docx(content)
            # Try to parse as timed text first
            cues = parse_simple_timed_text(text_content)
            if not cues:
                # No timestamps - auto-generate timing
                lines = [l.strip() for l in text_content.split('\n') if l.strip()]
                current_time = 0.0
                for line in lines:
                    # Estimate duration based on text length (avg reading speed)
                    duration = max(2.0, min(6.0, len(line) / 15))  # 2-6 seconds
                    cues.append({
                        "start": current_time,
                        "end": current_time + duration,
                        "text": line
                    })
                    current_time += duration + 0.2  # Small gap between cues
                    
        elif filename.endswith('.txt'):
            # Plain text - check for timestamps or auto-time
            text_content = content.decode('utf-8')
            cues = parse_simple_timed_text(text_content)
            if not cues:
                # No timestamps found - auto-generate
                lines = [l.strip() for l in text_content.split('\n') if l.strip()]
                current_time = 0.0
                for line in lines:
                    duration = max(2.0, min(6.0, len(line) / 15))
                    cues.append({
                        "start": current_time,
                        "end": current_time + duration,
                        "text": line
                    })
                    current_time += duration + 0.2
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Use .vtt, .srt, .txt, or .docx"
            )
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File encoding not supported. Use UTF-8.")
    
    if not cues:
        raise HTTPException(status_code=400, detail="No subtitle cues found in file")
    
    # Generate VTT content
    vtt_content = generate_vtt(cues)
    
    # Store subtitle data
    subtitle_id = f"sub-{uuid.uuid4().hex[:12]}"
    subtitle_doc = {
        "id": subtitle_id,
        "episode_id": episode_id,
        "language": language,
        "language_name": LANGUAGE_NAMES[language],
        "cues": cues,
        "vtt_content": vtt_content,
        "cue_count": len(cues),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "source_format": filename.split('.')[-1]
    }
    
    # Save to database
    await db.subtitles.update_one(
        {"episode_id": episode_id, "language": language},
        {"$set": subtitle_doc},
        upsert=True
    )
    
    # Update episode subtitle reference
    subtitles = episode.get("subtitles", {}) or {}
    subtitles[language] = {
        "id": subtitle_id,
        "cue_count": len(cues),
        "has_content": True
    }
    
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    return {
        "success": True,
        "message": f"Subtitles uploaded for {LANGUAGE_NAMES[language]}",
        "subtitle_id": subtitle_id,
        "cue_count": len(cues),
        "language": language,
        "preview": cues[:3] if cues else []
    }


@router.post("/from-text")
async def create_subtitles_from_text(
    data: SubtitleFromText,
    current_user: dict = Depends(get_current_user)
):
    """
    Create subtitles from plain text with auto-timing.
    Each line becomes a subtitle cue.
    """
    await verify_episode_ownership(data.episode_id, current_user["id"])
    
    if data.language not in LANGUAGE_NAMES:
        raise HTTPException(status_code=400, detail="Invalid language code")
    
    lines = [l.strip() for l in data.text.split('\n') if l.strip()]
    if not lines:
        raise HTTPException(status_code=400, detail="No text provided")
    
    cues = []
    current_time = 0.0
    
    for line in lines:
        # Adjust duration based on text length
        word_count = len(line.split())
        duration = max(data.duration_per_line, word_count * 0.4)  # ~0.4s per word min
        duration = min(duration, 8.0)  # Max 8 seconds
        
        cues.append({
            "start": current_time,
            "end": current_time + duration,
            "text": line
        })
        current_time += duration + 0.2
    
    # Generate VTT
    vtt_content = generate_vtt(cues)
    
    # Store
    subtitle_id = f"sub-{uuid.uuid4().hex[:12]}"
    subtitle_doc = {
        "id": subtitle_id,
        "episode_id": data.episode_id,
        "language": data.language,
        "language_name": LANGUAGE_NAMES[data.language],
        "cues": cues,
        "vtt_content": vtt_content,
        "cue_count": len(cues),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "source_format": "text"
    }
    
    await db.subtitles.update_one(
        {"episode_id": data.episode_id, "language": data.language},
        {"$set": subtitle_doc},
        upsert=True
    )
    
    # Update episode
    episode = await db.creator_episodes.find_one({"id": data.episode_id}, {"_id": 0})
    subtitles = episode.get("subtitles", {}) or {}
    subtitles[data.language] = {
        "id": subtitle_id,
        "cue_count": len(cues),
        "has_content": True
    }
    
    await db.creator_episodes.update_one(
        {"id": data.episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    await db.episodes.update_one(
        {"id": data.episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    return {
        "success": True,
        "subtitle_id": subtitle_id,
        "cue_count": len(cues),
        "total_duration": current_time,
        "preview": cues[:5]
    }


@router.post("/editor")
async def save_from_editor(
    data: SubtitleCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Save subtitles created in the in-app editor.
    Accepts list of cues with precise timing.
    """
    await verify_episode_ownership(data.episode_id, current_user["id"])
    
    if data.language not in LANGUAGE_NAMES:
        raise HTTPException(status_code=400, detail="Invalid language code")
    
    cues = []
    for cue in data.cues:
        cues.append({
            "start": parse_time_to_seconds(cue.start_time),
            "end": parse_time_to_seconds(cue.end_time),
            "text": cue.text
        })
    
    # Sort by start time
    cues.sort(key=lambda x: x["start"])
    
    # Generate VTT
    vtt_content = generate_vtt(cues)
    
    # Store
    subtitle_id = f"sub-{uuid.uuid4().hex[:12]}"
    subtitle_doc = {
        "id": subtitle_id,
        "episode_id": data.episode_id,
        "language": data.language,
        "language_name": LANGUAGE_NAMES[data.language],
        "cues": cues,
        "vtt_content": vtt_content,
        "cue_count": len(cues),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"],
        "source_format": "editor"
    }
    
    await db.subtitles.update_one(
        {"episode_id": data.episode_id, "language": data.language},
        {"$set": subtitle_doc},
        upsert=True
    )
    
    # Update episode
    episode = await db.creator_episodes.find_one({"id": data.episode_id}, {"_id": 0})
    subtitles = episode.get("subtitles", {}) or {}
    subtitles[data.language] = {
        "id": subtitle_id,
        "cue_count": len(cues),
        "has_content": True
    }
    
    await db.creator_episodes.update_one(
        {"id": data.episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    await db.episodes.update_one(
        {"id": data.episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    return {
        "success": True,
        "subtitle_id": subtitle_id,
        "cue_count": len(cues),
        "language": data.language
    }


@router.get("/{episode_id}/{language}")
async def get_subtitle(
    episode_id: str,
    language: str
):
    """Get subtitle cues for editing or playback"""
    subtitle = await db.subtitles.find_one(
        {"episode_id": episode_id, "language": language},
        {"_id": 0}
    )
    
    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitles not found")
    
    return subtitle


@router.get("/{episode_id}/{language}/vtt")
async def get_subtitle_vtt(
    episode_id: str,
    language: str
):
    """Get subtitle in VTT format for video player"""
    from fastapi.responses import PlainTextResponse
    
    subtitle = await db.subtitles.find_one(
        {"episode_id": episode_id, "language": language},
        {"_id": 0}
    )
    
    if not subtitle:
        raise HTTPException(status_code=404, detail="Subtitles not found")
    
    return PlainTextResponse(
        content=subtitle.get("vtt_content", ""),
        media_type="text/vtt"
    )


@router.get("/{episode_id}")
async def list_subtitles(episode_id: str):
    """List all available subtitles for an episode"""
    subtitles = await db.subtitles.find(
        {"episode_id": episode_id},
        {"_id": 0, "vtt_content": 0, "cues": 0}  # Exclude large fields
    ).to_list(20)
    
    return {
        "episode_id": episode_id,
        "subtitles": subtitles,
        "available_languages": [s["language"] for s in subtitles]
    }


@router.delete("/{episode_id}/{language}")
async def delete_subtitle(
    episode_id: str,
    language: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete subtitles for a specific language"""
    await verify_episode_ownership(episode_id, current_user["id"])
    
    result = await db.subtitles.delete_one({
        "episode_id": episode_id,
        "language": language
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Subtitles not found")
    
    # Update episode
    episode = await db.creator_episodes.find_one({"id": episode_id}, {"_id": 0})
    subtitles = episode.get("subtitles", {}) or {}
    if language in subtitles:
        del subtitles[language]
    
    await db.creator_episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    await db.episodes.update_one(
        {"id": episode_id},
        {"$set": {"subtitles": subtitles}}
    )
    
    return {"success": True, "message": f"Subtitles for {language} deleted"}
