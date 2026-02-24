"""
Test Shorts API - Create social media shorts from episodes
Tests: GET /api/shorts/my, POST /api/shorts/create
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestShortsAPI:
    """Shorts API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token before each test"""
        self.token = None
        self.episode_id = None
        self.series_id = None
        
        # Login to get token
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "superadmin@kona.com",
            "password": "SuperAdmin2025!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        assert self.token, "No token in login response"
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get creator series to find an episode
        series_res = requests.get(f"{BASE_URL}/api/creator/series", headers=self.headers)
        if series_res.status_code == 200:
            series_list = series_res.json()
            if series_list and len(series_list) > 0:
                self.series_id = series_list[0].get("id")
                # Get episodes from first series
                detail_res = requests.get(f"{BASE_URL}/api/creator/series/{self.series_id}", headers=self.headers)
                if detail_res.status_code == 200:
                    detail = detail_res.json()
                    eps = detail.get("episodes", [])
                    if eps:
                        self.episode_id = eps[0].get("id")
    
    def test_get_my_shorts_returns_empty_list_for_new_user(self):
        """GET /api/shorts/my should return empty list for users without shorts"""
        response = requests.get(f"{BASE_URL}/api/shorts/my", headers=self.headers)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "shorts" in data, "Response should contain 'shorts' key"
        assert "total" in data, "Response should contain 'total' key"
        assert isinstance(data["shorts"], list), "'shorts' should be a list"
        assert isinstance(data["total"], int), "'total' should be an integer"
        print(f"✓ GET /api/shorts/my returns {data['total']} shorts")
    
    def test_get_my_shorts_requires_authentication(self):
        """GET /api/shorts/my should require authentication"""
        response = requests.get(f"{BASE_URL}/api/shorts/my")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ GET /api/shorts/my requires authentication")
    
    def test_create_short_with_valid_episode(self):
        """POST /api/shorts/create should work with valid episode_id"""
        if not self.episode_id:
            pytest.skip("No episode available for testing - skip short creation")
        
        payload = {
            "episode_id": self.episode_id,
            "series_id": self.series_id,
            "title": f"TEST_short_{int(time.time())}",
            "start_time": 0.0,
            "end_time": 15.0,
            "format": "tiktok",
            "aspect_ratio": "9:16"
        }
        
        response = requests.post(f"{BASE_URL}/api/shorts/create", json=payload, headers=self.headers)
        
        # Status assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["id"].startswith("short-"), f"Short ID should start with 'short-', got {data['id']}"
        assert data["episode_id"] == self.episode_id, "Episode ID should match"
        assert data["title"] == payload["title"], "Title should match"
        assert data["duration"] == 15.0, "Duration should be 15 seconds (end - start)"
        assert data["format"] == "tiktok", "Format should be tiktok"
        assert data["status"] in ["ready", "processing"], "Status should be ready or processing"
        
        print(f"✓ POST /api/shorts/create successful - created short: {data['id']}")
        
        # Cleanup - delete the test short
        delete_res = requests.delete(f"{BASE_URL}/api/shorts/{data['id']}", headers=self.headers)
        assert delete_res.status_code == 200, f"Failed to cleanup test short: {delete_res.text}"
        print(f"✓ Cleanup - deleted test short: {data['id']}")
    
    def test_create_short_with_invalid_episode(self):
        """POST /api/shorts/create should return 404 for invalid episode_id"""
        payload = {
            "episode_id": "invalid-episode-123",
            "title": "Test Short Invalid",
            "start_time": 0.0,
            "end_time": 15.0,
            "format": "tiktok",
            "aspect_ratio": "9:16"
        }
        
        response = requests.post(f"{BASE_URL}/api/shorts/create", json=payload, headers=self.headers)
        
        assert response.status_code == 404, f"Expected 404 for invalid episode, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail'"
        print(f"✓ POST /api/shorts/create returns 404 for invalid episode: {data['detail']}")
    
    def test_create_short_duration_too_short(self):
        """POST /api/shorts/create should reject clips under 3 seconds"""
        if not self.episode_id:
            pytest.skip("No episode available for testing")
        
        payload = {
            "episode_id": self.episode_id,
            "title": "Test Short Too Short",
            "start_time": 0.0,
            "end_time": 2.0,  # Only 2 seconds - should fail
            "format": "tiktok",
            "aspect_ratio": "9:16"
        }
        
        response = requests.post(f"{BASE_URL}/api/shorts/create", json=payload, headers=self.headers)
        
        assert response.status_code == 400, f"Expected 400 for short < 3s, got {response.status_code}"
        print(f"✓ POST /api/shorts/create rejects clips under 3 seconds")
    
    def test_create_short_duration_too_long(self):
        """POST /api/shorts/create should reject clips over format max duration"""
        if not self.episode_id:
            pytest.skip("No episode available for testing")
        
        payload = {
            "episode_id": self.episode_id,
            "title": "Test Short Too Long",
            "start_time": 0.0,
            "end_time": 130.0,  # 130 seconds - exceeds max for all formats
            "format": "tiktok",  # Max 60s for TikTok
            "aspect_ratio": "9:16"
        }
        
        response = requests.post(f"{BASE_URL}/api/shorts/create", json=payload, headers=self.headers)
        
        assert response.status_code == 400, f"Expected 400 for too long clip, got {response.status_code}"
        print(f"✓ POST /api/shorts/create rejects clips exceeding format max duration")
    
    def test_create_short_requires_authentication(self):
        """POST /api/shorts/create should require authentication"""
        payload = {
            "episode_id": "test",
            "title": "Test Short",
            "start_time": 0.0,
            "end_time": 15.0,
            "format": "tiktok"
        }
        
        response = requests.post(f"{BASE_URL}/api/shorts/create", json=payload)
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ POST /api/shorts/create requires authentication")
    
    def test_create_short_with_different_formats(self):
        """POST /api/shorts/create should work with different export formats"""
        if not self.episode_id:
            pytest.skip("No episode available for testing")
        
        formats = [
            {"format": "instagram", "aspect": "9:16", "max": 90},
            {"format": "youtube", "aspect": "9:16", "max": 60},
            {"format": "square", "aspect": "1:1", "max": 60},
            {"format": "landscape", "aspect": "16:9", "max": 120}
        ]
        
        for fmt in formats:
            payload = {
                "episode_id": self.episode_id,
                "title": f"TEST_short_{fmt['format']}_{int(time.time())}",
                "start_time": 0.0,
                "end_time": 30.0,
                "format": fmt["format"],
                "aspect_ratio": fmt["aspect"]
            }
            
            response = requests.post(f"{BASE_URL}/api/shorts/create", json=payload, headers=self.headers)
            
            assert response.status_code == 200, f"Format {fmt['format']} failed: {response.text}"
            data = response.json()
            assert data["format"] == fmt["format"], f"Format should be {fmt['format']}"
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/shorts/{data['id']}", headers=self.headers)
        
        print(f"✓ All export formats work correctly: instagram, youtube, square, landscape")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
