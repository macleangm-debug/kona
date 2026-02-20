"""
Test Video Preview Feature for Creators
- Tests GET /api/creator/episodes/{id}/preview endpoint
- Verifies HLS URL is returned correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://kona-creator-portal.preview.emergentagent.com')

class TestVideoPreview:
    """Tests for creator video preview feature"""
    
    @pytest.fixture
    def session(self):
        """Create a session with proper headers"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json",
            "Origin": BASE_URL,
            "Referer": f"{BASE_URL}/"
        })
        return session
    
    @pytest.fixture
    def auth_token(self, session):
        """Get authentication token for superadmin"""
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@kona.com",
            "password": "SuperAdmin2025!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    def test_preview_endpoint_exists(self, session, auth_token):
        """Test that preview endpoint returns data for existing episode"""
        response = session.get(
            f"{BASE_URL}/api/creator/episodes/cs-8e6c36c6e4-s01e01/preview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 200 for existing episode
        assert response.status_code == 200, f"Preview endpoint failed: {response.text}"
        
        data = response.json()
        
        # Verify required fields are present
        assert "episode_id" in data
        assert "hls_url" in data
        assert "can_preview" in data
        assert "encoding_status" in data
    
    def test_preview_returns_hls_url(self, session, auth_token):
        """Test that preview returns HLS streaming URL"""
        response = session.get(
            f"{BASE_URL}/api/creator/episodes/cs-8e6c36c6e4-s01e01/preview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify HLS URL format
        if data.get("can_preview"):
            hls_url = data.get("hls_url")
            assert hls_url is not None, "HLS URL should be present when can_preview is True"
            assert ".m3u8" in hls_url, "HLS URL should contain .m3u8 extension"
            assert "b-cdn.net" in hls_url, "HLS URL should be from Bunny.net CDN"
    
    def test_preview_returns_thumbnail(self, session, auth_token):
        """Test that preview returns thumbnail URL"""
        response = session.get(
            f"{BASE_URL}/api/creator/episodes/cs-8e6c36c6e4-s01e01/preview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify thumbnail is present
        thumbnail = data.get("thumbnail")
        if data.get("can_preview"):
            assert thumbnail is not None, "Thumbnail should be present"
            assert thumbnail.startswith("http"), "Thumbnail should be a valid URL"
    
    def test_preview_unauthorized_without_token(self, session):
        """Test that preview endpoint requires authentication"""
        response = session.get(
            f"{BASE_URL}/api/creator/episodes/cs-8e6c36c6e4-s01e01/preview"
        )
        
        # Should return 401 or 403 without token
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_preview_nonexistent_episode(self, session, auth_token):
        """Test preview endpoint with non-existent episode"""
        response = session.get(
            f"{BASE_URL}/api/creator/episodes/nonexistent-episode-id/preview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Should return 404 for non-existent episode
        assert response.status_code == 404, f"Should return 404 for non-existent episode: {response.text}"
    
    def test_preview_returns_duration(self, session, auth_token):
        """Test that preview returns video duration"""
        response = session.get(
            f"{BASE_URL}/api/creator/episodes/cs-8e6c36c6e4-s01e01/preview",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify duration is present
        if data.get("can_preview"):
            duration = data.get("duration")
            assert duration is not None, "Duration should be present"
            assert isinstance(duration, (int, float)), "Duration should be a number"
            assert duration >= 0, "Duration should be non-negative"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
