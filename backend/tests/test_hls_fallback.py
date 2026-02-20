"""
Test HLS-to-Embed Fallback Feature
Tests the backend API endpoint for public video playback
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEpisodeEndpoint:
    """Test GET /api/episodes/{episode_id} returns embed_url for HLS fallback"""
    
    def test_episode_returns_embed_url(self):
        """Test that episode endpoint returns embed_url field"""
        episode_id = "cs-8e6c36c6e4-s01e01"
        response = requests.get(f"{BASE_URL}/api/episodes/{episode_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check required fields exist
        assert "video_url" in data, "Missing video_url field"
        assert "embed_url" in data, "Missing embed_url field - CRITICAL for HLS fallback"
        assert "unlocked" in data, "Missing unlocked field"
        
        # Validate video_url format (HLS playlist)
        assert data["video_url"], "video_url is empty"
        assert ".m3u8" in data["video_url"] or "playlist" in data["video_url"], \
            f"Expected HLS URL with .m3u8 or playlist, got: {data['video_url']}"
        
        # Validate embed_url format (Bunny.net iframe embed)
        assert data["embed_url"], "embed_url is empty - HLS fallback won't work!"
        assert "iframe.mediadelivery.net" in data["embed_url"], \
            f"Expected Bunny.net embed URL, got: {data['embed_url']}"
        
        print(f"✅ Episode API returns embed_url: {data['embed_url']}")
        print(f"✅ Episode API returns video_url: {data['video_url']}")
    
    def test_episode_is_unlocked_for_guests(self):
        """Test that free episode is accessible without auth"""
        episode_id = "cs-8e6c36c6e4-s01e01"
        response = requests.get(f"{BASE_URL}/api/episodes/{episode_id}")
        
        assert response.status_code == 200, f"Guest access failed: {response.status_code}"
        
        data = response.json()
        assert data.get("unlocked") == True, "Free episode should be unlocked for guests"
        assert data.get("is_guest") == True or data.get("is_free") == True, \
            "Episode should indicate guest access or free status"
    
    def test_embed_url_format_is_valid(self):
        """Test that embed_url is correctly formatted for Bunny.net"""
        episode_id = "cs-8e6c36c6e4-s01e01"
        response = requests.get(f"{BASE_URL}/api/episodes/{episode_id}")
        
        data = response.json()
        embed_url = data.get("embed_url")
        
        # Validate Bunny.net embed URL format
        # Expected: https://iframe.mediadelivery.net/embed/{library_id}/{video_id}
        assert embed_url, "embed_url is None/empty"
        assert embed_url.startswith("https://iframe.mediadelivery.net/embed/"), \
            f"Invalid embed URL format: {embed_url}"
        
        parts = embed_url.split("/")
        assert len(parts) >= 6, f"embed_url missing parts: {embed_url}"
        
        library_id = parts[-2]
        video_id = parts[-1]
        
        assert library_id.isdigit(), f"Library ID should be numeric: {library_id}"
        assert len(video_id) > 10, f"Video ID seems too short: {video_id}"
        
        print(f"✅ Valid embed URL - Library: {library_id}, Video: {video_id}")
    
    def test_bunny_video_id_present(self):
        """Test that bunny_video_id is included in response"""
        episode_id = "cs-8e6c36c6e4-s01e01"
        response = requests.get(f"{BASE_URL}/api/episodes/{episode_id}")
        
        data = response.json()
        
        # bunny_video_id is needed to generate embed_url
        assert "bunny_video_id" in data, "bunny_video_id field missing from response"
        assert data["bunny_video_id"], "bunny_video_id is empty"
        
        # Verify bunny_video_id is in both video_url and embed_url
        assert data["bunny_video_id"] in data["video_url"], \
            "bunny_video_id not found in video_url"
        assert data["bunny_video_id"] in data["embed_url"], \
            "bunny_video_id not found in embed_url"


class TestStreamingConfig:
    """Test streaming configuration endpoint"""
    
    def test_streaming_config_accessible(self):
        """Test streaming config endpoint works"""
        response = requests.get(f"{BASE_URL}/api/streaming/config")
        
        assert response.status_code == 200, f"Streaming config failed: {response.status_code}"
        
        data = response.json()
        # Basic validation - just check it returns something
        assert isinstance(data, dict), "Expected dict response"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
