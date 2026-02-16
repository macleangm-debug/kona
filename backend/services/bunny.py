"""
Bunny.net Stream Service for video upload and streaming
"""
import os
import hashlib
import base64
import hmac
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional

# Bunny.net Configuration
BUNNY_API_KEY = os.environ.get("BUNNY_STREAM_API_KEY", "")
BUNNY_LIBRARY_ID = os.environ.get("BUNNY_LIBRARY_ID", "")
BUNNY_PULL_ZONE = os.environ.get("BUNNY_PULL_ZONE", "")
BUNNY_TOKEN_KEY = os.environ.get("BUNNY_TOKEN_KEY", "")
BUNNY_CDN_HOSTNAME = os.environ.get("BUNNY_CDN_HOSTNAME", "")
BUNNY_BASE_URL = "https://video.bunnycdn.com"


class BunnyStreamService:
    """Service for interacting with Bunny.net Stream API"""
    
    def __init__(self):
        self.api_key = BUNNY_API_KEY
        self.library_id = BUNNY_LIBRARY_ID
        self.base_url = BUNNY_BASE_URL
        self.token_key = BUNNY_TOKEN_KEY
        self.cdn_hostname = BUNNY_CDN_HOSTNAME
    
    async def create_video(self, title: str) -> dict:
        """Create a video object in Bunny Stream"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/library/{self.library_id}/videos",
                headers={
                    "AccessKey": self.api_key,
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                json={"title": title}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": response.text}
            
            data = response.json()
            return {
                "success": True,
                "video_id": data.get("guid"),
                "library_id": self.library_id
            }
    
    async def get_upload_url(self, video_id: str) -> str:
        """Get the upload URL for a video"""
        return f"{self.base_url}/library/{self.library_id}/videos/{video_id}"
    
    async def upload_video(self, video_id: str, file_content: bytes) -> dict:
        """Upload video file to Bunny Stream"""
        async with httpx.AsyncClient(timeout=600.0) as client:
            response = await client.put(
                f"{self.base_url}/library/{self.library_id}/videos/{video_id}",
                headers={
                    "AccessKey": self.api_key,
                    "Accept": "application/json"
                },
                content=file_content
            )
            
            if response.status_code != 200:
                return {"success": False, "error": response.text}
            
            return {"success": True, "message": "Video uploaded successfully"}
    
    async def get_video_status(self, video_id: str) -> dict:
        """Get video encoding status"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/library/{self.library_id}/videos/{video_id}",
                headers={"AccessKey": self.api_key}
            )
            
            if response.status_code != 200:
                return {"success": False, "error": "Video not found"}
            
            data = response.json()
            
            # Status mapping
            status_map = {
                0: "queued",
                1: "processing",
                2: "encoding",
                3: "ready",
                4: "ready",
                5: "failed"
            }
            
            return {
                "success": True,
                "video_id": video_id,
                "status": status_map.get(data.get("status", 0), "unknown"),
                "duration": data.get("length"),
                "thumbnail_url": f"https://{self.cdn_hostname}/{video_id}/thumbnail.jpg",
                "available_resolutions": data.get("availableResolutions", "").split(",") if data.get("availableResolutions") else []
            }
    
    async def delete_video(self, video_id: str) -> dict:
        """Delete a video from Bunny Stream"""
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/library/{self.library_id}/videos/{video_id}",
                headers={"AccessKey": self.api_key}
            )
            
            if response.status_code not in [200, 204]:
                return {"success": False, "error": response.text}
            
            return {"success": True, "message": "Video deleted"}
    
    def generate_signed_url(
        self, 
        video_id: str, 
        expiration_hours: int = 24,
        user_ip: Optional[str] = None
    ) -> str:
        """Generate a signed URL for secure video streaming"""
        expires = int((datetime.now(timezone.utc) + timedelta(hours=expiration_hours)).timestamp())
        
        # HLS playlist path
        path = f"/{video_id}/playlist.m3u8"
        
        # Build hashable string
        hashable = self.token_key + path + str(expires)
        if user_ip:
            hashable += user_ip
        
        # Generate signature
        signature = hashlib.sha256(hashable.encode()).digest()
        token = base64.b64encode(signature).decode('utf-8')
        token = token.replace('+', '-').replace('/', '_').replace('=', '')
        
        # Build URL
        url = f"https://{self.cdn_hostname}{path}?token={token}&expires={expires}"
        
        return url
    
    def get_embed_url(self, video_id: str) -> str:
        """Get embed URL for iframe player"""
        return f"https://iframe.mediadelivery.net/embed/{self.library_id}/{video_id}"
    
    def get_direct_play_url(self, video_id: str) -> str:
        """Get direct HLS playlist URL (for custom players)"""
        return f"https://{self.cdn_hostname}/{video_id}/playlist.m3u8"
    
    def get_thumbnail_url(self, video_id: str) -> str:
        """Get thumbnail URL for a video"""
        return f"https://{self.cdn_hostname}/{video_id}/thumbnail.jpg"


# Singleton instance
bunny_service = BunnyStreamService()
