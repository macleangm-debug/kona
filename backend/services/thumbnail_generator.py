"""
AI Thumbnail Generator Service
Multi-provider resilient thumbnail generation with automatic fallback
Providers: OpenAI GPT Image 1, Gemini Nano Banana
"""
import os
import base64
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Provider status tracking
PROVIDER_STATUS = {
    "openai": {"available": True, "last_error": None, "success_count": 0, "error_count": 0},
    "gemini": {"available": True, "last_error": None, "success_count": 0, "error_count": 0}
}


async def generate_with_openai(prompt: str, size: str = "1024x1024") -> Optional[bytes]:
    """Generate thumbnail using OpenAI GPT Image 1"""
    try:
        from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise ValueError("EMERGENT_LLM_KEY not configured")
        
        image_gen = OpenAIImageGeneration(api_key=api_key)
        
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            PROVIDER_STATUS["openai"]["success_count"] += 1
            return images[0]  # Return bytes directly
        
        return None
        
    except Exception as e:
        PROVIDER_STATUS["openai"]["error_count"] += 1
        PROVIDER_STATUS["openai"]["last_error"] = str(e)
        print(f"[ThumbnailGen] OpenAI error: {str(e)[:100]}")
        return None


async def generate_with_gemini(prompt: str) -> Optional[bytes]:
    """Generate thumbnail using Gemini Nano Banana"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.getenv("EMERGENT_LLM_KEY")
        if not api_key:
            raise ValueError("EMERGENT_LLM_KEY not configured")
        
        session_id = f"thumbnail-{uuid.uuid4().hex[:8]}"
        chat = LlmChat(
            api_key=api_key, 
            session_id=session_id, 
            system_message="You are a professional thumbnail designer. Create visually striking, high-quality thumbnails."
        )
        chat.with_model("gemini", "gemini-3-pro-image-preview").with_params(modalities=["image", "text"])
        
        msg = UserMessage(text=prompt)
        text, images = await chat.send_message_multimodal_response(msg)
        
        if images and len(images) > 0:
            # Decode base64 to bytes
            image_data = images[0].get("data", "")
            if image_data:
                PROVIDER_STATUS["gemini"]["success_count"] += 1
                return base64.b64decode(image_data)
        
        return None
        
    except Exception as e:
        PROVIDER_STATUS["gemini"]["error_count"] += 1
        PROVIDER_STATUS["gemini"]["last_error"] = str(e)
        print(f"[ThumbnailGen] Gemini error: {str(e)[:100]}")
        return None


async def generate_thumbnail(
    prompt: str,
    preferred_provider: str = "openai",
    size: str = "1024x1024",
    style: str = "cinematic"
) -> Dict[str, Any]:
    """
    Generate a thumbnail with automatic multi-provider fallback.
    
    Args:
        prompt: Description of the thumbnail to generate
        preferred_provider: First provider to try ("openai" or "gemini")
        size: Image size (1024x1024, 1792x1024, 1024x1792)
        style: Visual style hint (cinematic, dramatic, colorful, minimalist)
    
    Returns:
        Dict with image_bytes, image_base64, provider_used, and metadata
    """
    # Enhance prompt with style
    style_hints = {
        "cinematic": "cinematic lighting, dramatic composition, movie poster quality",
        "dramatic": "high contrast, intense colors, bold composition",
        "colorful": "vibrant colors, eye-catching, visually striking",
        "minimalist": "clean design, simple composition, elegant",
        "anime": "anime style, vibrant, Japanese animation aesthetic"
    }
    
    enhanced_prompt = f"{prompt}. Style: {style_hints.get(style, style_hints['cinematic'])}. " \
                     f"Professional thumbnail quality, attention-grabbing, suitable for video streaming platform."
    
    # Define fallback order
    providers = ["openai", "gemini"] if preferred_provider == "openai" else ["gemini", "openai"]
    
    image_bytes = None
    provider_used = None
    errors = []
    
    for provider in providers:
        if provider == "openai":
            image_bytes = await generate_with_openai(enhanced_prompt, size)
        else:
            image_bytes = await generate_with_gemini(enhanced_prompt)
        
        if image_bytes:
            provider_used = provider
            break
        else:
            errors.append(f"{provider}: {PROVIDER_STATUS[provider].get('last_error', 'Unknown error')}")
    
    if not image_bytes:
        return {
            "success": False,
            "error": f"All providers failed. Errors: {'; '.join(errors)}",
            "providers_tried": providers
        }
    
    # Convert to base64 for storage/transfer
    image_base64 = base64.b64encode(image_bytes).decode('utf-8')
    
    return {
        "success": True,
        "image_bytes": image_bytes,
        "image_base64": image_base64,
        "provider_used": provider_used,
        "prompt_used": enhanced_prompt,
        "size": size,
        "style": style,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


async def generate_thumbnail_variations(
    base_prompt: str,
    num_variations: int = 3,
    style: str = "cinematic"
) -> List[Dict[str, Any]]:
    """
    Generate multiple thumbnail variations for A/B testing.
    
    Args:
        base_prompt: Base description for thumbnails
        num_variations: Number of variations to generate (1-5)
        style: Visual style hint
    
    Returns:
        List of generated thumbnails with metadata
    """
    num_variations = min(max(num_variations, 1), 5)  # Clamp to 1-5
    
    # Create variation prompts
    variation_hints = [
        "close-up dramatic shot",
        "wide establishing shot with atmosphere",
        "character-focused with emotional expression",
        "action-packed dynamic composition",
        "mysterious mood with shadows"
    ]
    
    results = []
    for i in range(num_variations):
        variation_prompt = f"{base_prompt}. {variation_hints[i % len(variation_hints)]}"
        
        result = await generate_thumbnail(
            prompt=variation_prompt,
            preferred_provider="openai" if i % 2 == 0 else "gemini",  # Alternate providers
            style=style
        )
        
        if result.get("success"):
            result["variation_index"] = i
            result["variation_hint"] = variation_hints[i % len(variation_hints)]
            results.append(result)
    
    return results


def get_provider_status() -> Dict[str, Any]:
    """Get current status of all providers"""
    return {
        "providers": PROVIDER_STATUS,
        "recommended_provider": "openai" if PROVIDER_STATUS["openai"]["available"] else "gemini"
    }


# Prompt templates for common thumbnail scenarios
PROMPT_TEMPLATES = {
    "romance": "A romantic scene with {subject}, soft lighting, emotional atmosphere, beautiful cinematography",
    "drama": "A dramatic scene featuring {subject}, intense emotions, compelling storytelling moment",
    "action": "An action-packed scene with {subject}, dynamic movement, high energy, cinematic",
    "thriller": "A suspenseful scene with {subject}, mysterious mood, tension, dark atmosphere",
    "comedy": "A fun, lighthearted scene featuring {subject}, bright colors, cheerful atmosphere",
    "horror": "A horror scene with {subject}, dark shadows, creepy atmosphere, suspenseful",
    "fantasy": "A fantasy scene featuring {subject}, magical elements, otherworldly beauty",
    "historical": "A historical scene with {subject}, period-accurate, epic scale, cinematic"
}


def get_prompt_template(genre: str, subject: str) -> str:
    """Get a prompt template filled with subject"""
    template = PROMPT_TEMPLATES.get(genre.lower(), PROMPT_TEMPLATES["drama"])
    return template.format(subject=subject)
