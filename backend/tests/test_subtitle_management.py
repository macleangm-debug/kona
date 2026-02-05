"""
Subtitle Management API Tests

Tests for:
- GET /api/creator/subtitle-template - VTT template download
- POST /api/creator/episodes/{episode_id}/subtitles - Upload subtitle
- GET /api/creator/episodes/{episode_id}/subtitles - Get subtitles
- DELETE /api/creator/episodes/{episode_id}/subtitles/{language} - Remove subtitle
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DEMO_USER = {"email": "demo@kona.com", "password": "Demo123!"}
EPISODE_ID = "ep-f4346bfe8d"  # Existing episode from demo creator


class TestSubtitleTemplate:
    """Tests for subtitle template download"""

    def test_subtitle_template_returns_vtt(self):
        """GET /api/creator/subtitle-template returns valid VTT content"""
        response = requests.get(f"{BASE_URL}/api/creator/subtitle-template")
        
        assert response.status_code == 200
        assert "WEBVTT" in response.text
        assert "text/vtt" in response.headers.get("content-type", "")
        
        # Check for expected content structure
        assert "00:00:00.000 -->" in response.text
        assert "Character" in response.text
        print("✅ Subtitle template returns valid VTT format")

    def test_subtitle_template_download_header(self):
        """GET /api/creator/subtitle-template has download attachment header"""
        response = requests.get(f"{BASE_URL}/api/creator/subtitle-template")
        
        assert response.status_code == 200
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert "subtitle_template.vtt" in content_disposition
        print("✅ Subtitle template has proper download headers")


class TestSubtitleManagement:
    """Tests for subtitle CRUD operations"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user (creator)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=DEMO_USER
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")

    @pytest.fixture
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {"Authorization": f"Bearer {auth_token}"}

    def test_upload_english_subtitle(self, auth_headers):
        """POST /api/creator/episodes/{id}/subtitles - Upload English subtitle"""
        # First clean up any existing English subtitle
        requests.delete(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles/en",
            headers=auth_headers
        )
        
        # Upload new English subtitle
        response = requests.post(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles",
            headers=auth_headers,
            json={
                "episode_id": EPISODE_ID,
                "language": "en",
                "subtitle_url": "data:text/vtt;base64,V0VCVlRUCgoxCjAwOjAwOjAwLjAwMCAtLT4gMDA6MDA6MDMuMDAwClRlc3QgRW5nbGlzaCBzdWJ0aXRsZQ=="
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "Subtitles for en uploaded successfully" in data["message"]
        assert "en" in data["subtitles"]
        print("✅ English subtitle uploaded successfully")

    def test_upload_swahili_subtitle(self, auth_headers):
        """POST /api/creator/episodes/{id}/subtitles - Upload Swahili subtitle"""
        response = requests.post(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles",
            headers=auth_headers,
            json={
                "episode_id": EPISODE_ID,
                "language": "sw",
                "subtitle_url": "data:text/vtt;base64,V0VCVlRUCgoxCjAwOjAwOjAwLjAwMCAtLT4gMDA6MDA6MDMuMDAwCkphbWJvIER1bmlh"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "sw" in data["message"] or "sw" in data["subtitles"]
        print("✅ Swahili subtitle uploaded successfully")

    def test_upload_french_subtitle(self, auth_headers):
        """POST /api/creator/episodes/{id}/subtitles - Upload French subtitle"""
        response = requests.post(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles",
            headers=auth_headers,
            json={
                "episode_id": EPISODE_ID,
                "language": "fr",
                "subtitle_url": "data:text/vtt;base64,V0VCVlRUCgoxCjAwOjAwOjAwLjAwMCAtLT4gMDA6MDA6MDMuMDAwCkJvbmpvdXIgTW9uZGU="
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "fr" in data["message"] or "fr" in data["subtitles"]
        print("✅ French subtitle uploaded successfully")

    def test_get_subtitles(self, auth_headers):
        """GET /api/creator/episodes/{id}/subtitles - Retrieve subtitles"""
        response = requests.get(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "episode_id" in data
        assert "subtitles" in data
        assert "available_languages" in data
        assert isinstance(data["available_languages"], list)
        print(f"✅ Retrieved subtitles: {data['available_languages']}")

    def test_delete_subtitle(self, auth_headers):
        """DELETE /api/creator/episodes/{id}/subtitles/{lang} - Remove subtitle"""
        # First ensure we have a subtitle to delete
        requests.post(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles",
            headers=auth_headers,
            json={
                "episode_id": EPISODE_ID,
                "language": "en",
                "subtitle_url": "data:text/vtt;base64,dGVzdA=="
            }
        )
        
        # Now delete it
        response = requests.delete(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles/en",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "en removed" in data["message"] or "en" not in data.get("subtitles", {})
        print("✅ Subtitle deleted successfully")

    def test_invalid_language_rejected(self, auth_headers):
        """POST subtitle with invalid language returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles",
            headers=auth_headers,
            json={
                "episode_id": EPISODE_ID,
                "language": "es",  # Spanish not supported
                "subtitle_url": "data:text/vtt;base64,dGVzdA=="
            }
        )
        
        assert response.status_code == 400
        assert "Invalid language" in response.json().get("detail", "")
        print("✅ Invalid language correctly rejected")

    def test_unauthenticated_request_rejected(self):
        """API endpoints require authentication"""
        response = requests.get(
            f"{BASE_URL}/api/creator/episodes/{EPISODE_ID}/subtitles"
        )
        
        assert response.status_code in [401, 403]
        print("✅ Unauthenticated requests correctly rejected")


class TestCreatorStatus:
    """Verify creator user can access subtitle features"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=DEMO_USER
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")

    def test_demo_user_is_approved_creator(self, auth_token):
        """Verify demo user has creator status"""
        response = requests.get(
            f"{BASE_URL}/api/creator/status",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["is_creator"] == True
        assert data["status"] == "approved"
        print(f"✅ Demo user is approved creator (tier: {data.get('tier')})")

    def test_creator_has_series_with_episodes(self, auth_token):
        """Verify demo creator has series and episodes for testing"""
        response = requests.get(
            f"{BASE_URL}/api/creator/series",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code == 200
        series = response.json()
        assert len(series) > 0
        
        # Get first series details
        series_id = series[0]["id"]
        detail_response = requests.get(
            f"{BASE_URL}/api/creator/series/{series_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert detail_response.status_code == 200
        data = detail_response.json()
        assert len(data.get("episodes", [])) > 0
        print(f"✅ Creator has {len(series)} series with episodes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
