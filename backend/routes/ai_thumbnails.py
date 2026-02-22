"""
AI Thumbnail Generator Routes
Generate thumbnails using AI with multi-provider fallback
"""
import uuid
import base64
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import Response
from pydantic import BaseModel, Field

from services import db, get_current_user
from services.thumbnail_generator import (
    generate_thumbnail,
    generate_thumbnail_variations,
    get_provider_status,
    get_prompt_template,
    PROMPT_TEMPLATES
)

router = APIRouter(prefix="/ai-thumbnails", tags=["AI Thumbnail Generator"])


# ============ MODELS ============

class GenerateThumbnailRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=1000)
    series_id: Optional[str] = None
    episode_id: Optional[str] = None
    preferred_provider: str = Field(default="openai", pattern="^(openai|gemini)$")
    size: str = Field(default="1024x1024", pattern="^(1024x1024|1792x1024|1024x1792)$")
    style: str = Field(default="cinematic")
    save_to_library: bool = True


class GenerateFromGenreRequest(BaseModel):
    genre: str
    subject: str = Field(..., min_length=5, max_length=200)
    series_id: Optional[str] = None
    preferred_provider: str = "openai"
    style: str = "cinematic"


class GenerateVariationsRequest(BaseModel):
    prompt: str = Field(..., min_length=10, max_length=1000)
    series_id: Optional[str] = None
    num_variations: int = Field(default=3, ge=1, le=5)
    style: str = "cinematic"


class ApplyThumbnailRequest(BaseModel):
    thumbnail_id: str
    target_type: str = Field(..., pattern="^(series|episode)$")
    target_id: str


# ============ ROUTES ============

@router.post("/generate")
async def generate_ai_thumbnail(
    request: GenerateThumbnailRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a single AI thumbnail from a text prompt.
    Uses multi-provider fallback (OpenAI → Gemini) for reliability.
    """
    result = await generate_thumbnail(
        prompt=request.prompt,
        preferred_provider=request.preferred_provider,
        size=request.size,
        style=request.style
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    # Save to library if requested
    thumbnail_id = None
    if request.save_to_library:
        thumbnail_id = str(uuid.uuid4())
        thumbnail_doc = {
            "id": thumbnail_id,
            "creator_id": current_user["id"],
            "prompt": request.prompt,
            "image_base64": result["image_base64"],
            "provider_used": result["provider_used"],
            "size": request.size,
            "style": request.style,
            "series_id": request.series_id,
            "episode_id": request.episode_id,
            "applied_to": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.ai_thumbnails.insert_one(thumbnail_doc)
        del thumbnail_doc["_id"]
    
    return {
        "success": True,
        "thumbnail_id": thumbnail_id,
        "image_base64": result["image_base64"][:50] + "...",  # Truncated for response
        "image_url": f"/api/ai-thumbnails/{thumbnail_id}/image" if thumbnail_id else None,
        "provider_used": result["provider_used"],
        "prompt_used": result.get("prompt_used", request.prompt),
        "generated_at": result.get("generated_at")
    }


@router.post("/generate-from-genre")
async def generate_from_genre(
    request: GenerateFromGenreRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a thumbnail using a genre template.
    Automatically creates an optimized prompt based on genre.
    """
    # Get prompt from template
    prompt = get_prompt_template(request.genre, request.subject)
    
    result = await generate_thumbnail(
        prompt=prompt,
        preferred_provider=request.preferred_provider,
        style=request.style
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Generation failed"))
    
    # Save to library
    thumbnail_id = str(uuid.uuid4())
    thumbnail_doc = {
        "id": thumbnail_id,
        "creator_id": current_user["id"],
        "prompt": prompt,
        "genre": request.genre,
        "subject": request.subject,
        "image_base64": result["image_base64"],
        "provider_used": result["provider_used"],
        "size": "1024x1024",
        "style": request.style,
        "series_id": request.series_id,
        "applied_to": None,
        "created_at": datetime.now(timezone.utc)
    }
    await db.ai_thumbnails.insert_one(thumbnail_doc)
    
    return {
        "success": True,
        "thumbnail_id": thumbnail_id,
        "image_url": f"/api/ai-thumbnails/{thumbnail_id}/image",
        "provider_used": result["provider_used"],
        "prompt_generated": prompt,
        "genre": request.genre
    }


@router.post("/generate-variations")
async def generate_variations(
    request: GenerateVariationsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate multiple thumbnail variations for A/B testing.
    Creates different compositions and angles from the same base prompt.
    """
    results = await generate_thumbnail_variations(
        base_prompt=request.prompt,
        num_variations=request.num_variations,
        style=request.style
    )
    
    if not results:
        raise HTTPException(status_code=500, detail="All generation attempts failed")
    
    # Save all to library
    saved_thumbnails = []
    for result in results:
        thumbnail_id = str(uuid.uuid4())
        thumbnail_doc = {
            "id": thumbnail_id,
            "creator_id": current_user["id"],
            "prompt": result.get("prompt_used", request.prompt),
            "image_base64": result["image_base64"],
            "provider_used": result["provider_used"],
            "size": result.get("size", "1024x1024"),
            "style": request.style,
            "series_id": request.series_id,
            "variation_index": result.get("variation_index"),
            "variation_hint": result.get("variation_hint"),
            "applied_to": None,
            "created_at": datetime.now(timezone.utc)
        }
        await db.ai_thumbnails.insert_one(thumbnail_doc)
        
        saved_thumbnails.append({
            "thumbnail_id": thumbnail_id,
            "image_url": f"/api/ai-thumbnails/{thumbnail_id}/image",
            "variation_index": result.get("variation_index"),
            "variation_hint": result.get("variation_hint"),
            "provider_used": result["provider_used"]
        })
    
    return {
        "success": True,
        "total_requested": request.num_variations,
        "total_generated": len(saved_thumbnails),
        "thumbnails": saved_thumbnails
    }


@router.get("/library")
async def get_thumbnail_library(
    series_id: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get creator's AI-generated thumbnail library"""
    query = {"creator_id": current_user["id"]}
    if series_id:
        query["series_id"] = series_id
    
    thumbnails = await db.ai_thumbnails.find(
        query, 
        {"_id": 0, "image_base64": 0}  # Exclude large base64 data
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    total = await db.ai_thumbnails.count_documents(query)
    
    # Add image URLs
    for thumb in thumbnails:
        thumb["image_url"] = f"/api/ai-thumbnails/{thumb['id']}/image"
    
    return {
        "thumbnails": thumbnails,
        "total": total,
        "has_more": skip + len(thumbnails) < total
    }


@router.get("/{thumbnail_id}")
async def get_thumbnail(
    thumbnail_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get thumbnail details (without image data)"""
    thumbnail = await db.ai_thumbnails.find_one(
        {"id": thumbnail_id, "creator_id": current_user["id"]},
        {"_id": 0, "image_base64": 0}
    )
    
    if not thumbnail:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    thumbnail["image_url"] = f"/api/ai-thumbnails/{thumbnail_id}/image"
    return thumbnail


@router.get("/{thumbnail_id}/image")
async def get_thumbnail_image(thumbnail_id: str):
    """Get the actual thumbnail image as binary"""
    thumbnail = await db.ai_thumbnails.find_one(
        {"id": thumbnail_id},
        {"_id": 0, "image_base64": 1}
    )
    
    if not thumbnail or not thumbnail.get("image_base64"):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    image_bytes = base64.b64decode(thumbnail["image_base64"])
    
    return Response(
        content=image_bytes,
        media_type="image/png",
        headers={"Cache-Control": "public, max-age=86400"}  # Cache for 24 hours
    )


@router.post("/{thumbnail_id}/apply")
async def apply_thumbnail(
    thumbnail_id: str,
    request: ApplyThumbnailRequest,
    current_user: dict = Depends(get_current_user)
):
    """Apply an AI-generated thumbnail to a series or episode"""
    # Get thumbnail
    thumbnail = await db.ai_thumbnails.find_one(
        {"id": thumbnail_id, "creator_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not thumbnail:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    # Get image URL
    image_url = f"/api/ai-thumbnails/{thumbnail_id}/image"
    
    # Apply to target
    if request.target_type == "series":
        # Update series thumbnail
        result = await db.creator_series.update_one(
            {"id": request.target_id, "creator_id": current_user["id"]},
            {"$set": {"thumbnail": image_url, "thumbnail_ai_generated": True}}
        )
        
        # Also update main series collection if published
        await db.series.update_one(
            {"id": request.target_id},
            {"$set": {"thumbnail": image_url}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Series not found or not owned by you")
    
    else:  # episode
        result = await db.creator_episodes.update_one(
            {"id": request.target_id, "creator_id": current_user["id"]},
            {"$set": {"thumbnail": image_url, "thumbnail_ai_generated": True}}
        )
        
        # Also update main episodes collection if synced
        await db.episodes.update_one(
            {"id": request.target_id},
            {"$set": {"thumbnail": image_url}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Episode not found or not owned by you")
    
    # Mark thumbnail as applied
    await db.ai_thumbnails.update_one(
        {"id": thumbnail_id},
        {"$set": {"applied_to": {"type": request.target_type, "id": request.target_id}}}
    )
    
    return {
        "success": True,
        "message": f"Thumbnail applied to {request.target_type}",
        "thumbnail_url": image_url
    }


@router.delete("/{thumbnail_id}")
async def delete_thumbnail(
    thumbnail_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an AI-generated thumbnail from library"""
    result = await db.ai_thumbnails.delete_one({
        "id": thumbnail_id,
        "creator_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    return {"success": True, "message": "Thumbnail deleted"}


@router.get("/providers/status")
async def get_providers_status(current_user: dict = Depends(get_current_user)):
    """Get status of AI thumbnail generation providers"""
    status = get_provider_status()
    return {
        **status,
        "available_styles": ["cinematic", "dramatic", "colorful", "minimalist", "anime"],
        "available_sizes": ["1024x1024", "1792x1024", "1024x1792"],
        "genre_templates": list(PROMPT_TEMPLATES.keys())
    }


# ============ BACKGROUND JOB ============

async def generate_thumbnails_background(
    creator_id: str,
    series_id: str,
    prompt: str,
    num_variations: int = 3
):
    """Background job to generate multiple thumbnails"""
    try:
        results = await generate_thumbnail_variations(
            base_prompt=prompt,
            num_variations=num_variations,
            style="cinematic"
        )
        
        for result in results:
            thumbnail_id = str(uuid.uuid4())
            thumbnail_doc = {
                "id": thumbnail_id,
                "creator_id": creator_id,
                "prompt": result.get("prompt_used", prompt),
                "image_base64": result["image_base64"],
                "provider_used": result["provider_used"],
                "size": result.get("size", "1024x1024"),
                "style": "cinematic",
                "series_id": series_id,
                "variation_index": result.get("variation_index"),
                "background_generated": True,
                "applied_to": None,
                "created_at": datetime.now(timezone.utc)
            }
            await db.ai_thumbnails.insert_one(thumbnail_doc)
        
        # Notify creator (if notification system exists)
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": creator_id,
            "type": "ai_thumbnails_ready",
            "title": "AI Thumbnails Ready",
            "message": f"{len(results)} AI-generated thumbnails are ready for your series",
            "data": {"series_id": series_id, "count": len(results)},
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })
        
    except Exception as e:
        print(f"[ThumbnailGen] Background job failed: {str(e)}")


@router.post("/generate-background")
async def generate_in_background(
    request: GenerateVariationsRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Start thumbnail generation in background.
    Useful for generating multiple variations without waiting.
    """
    if not request.series_id:
        raise HTTPException(status_code=400, detail="series_id is required for background generation")
    
    background_tasks.add_task(
        generate_thumbnails_background,
        creator_id=current_user["id"],
        series_id=request.series_id,
        prompt=request.prompt,
        num_variations=request.num_variations
    )
    
    return {
        "success": True,
        "message": f"Generation started in background. You'll be notified when {request.num_variations} thumbnails are ready.",
        "series_id": request.series_id
    }
