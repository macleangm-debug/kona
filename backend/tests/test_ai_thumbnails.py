"""
AI Thumbnail Generator API Tests
Tests the multi-provider AI thumbnail generation feature
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"


class TestAIThumbnailEndpoints:
    """Test AI Thumbnail Generator API endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        # Login to get token
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_providers_status_endpoint(self):
        """Test /api/ai-thumbnails/providers/status returns provider info"""
        response = requests.get(
            f"{BASE_URL}/api/ai-thumbnails/providers/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify providers info
        assert "providers" in data
        assert "openai" in data["providers"]
        assert "gemini" in data["providers"]
        
        # Verify OpenAI provider structure
        assert data["providers"]["openai"]["available"] is True
        assert "success_count" in data["providers"]["openai"]
        assert "error_count" in data["providers"]["openai"]
        
        # Verify Gemini provider structure
        assert data["providers"]["gemini"]["available"] is True
        
        # Verify styles are returned
        assert "available_styles" in data
        expected_styles = ["cinematic", "dramatic", "colorful", "minimalist", "anime"]
        for style in expected_styles:
            assert style in data["available_styles"], f"Missing style: {style}"
        
        # Verify sizes are returned
        assert "available_sizes" in data
        expected_sizes = ["1024x1024", "1792x1024", "1024x1792"]
        for size in expected_sizes:
            assert size in data["available_sizes"], f"Missing size: {size}"
        
        # Verify genre templates
        assert "genre_templates" in data
        expected_genres = ["romance", "drama", "action", "thriller", "comedy", "horror", "fantasy", "historical"]
        for genre in expected_genres:
            assert genre in data["genre_templates"], f"Missing genre template: {genre}"
        
        # Verify recommended provider
        assert "recommended_provider" in data
        assert data["recommended_provider"] in ["openai", "gemini"]
        
        print(f"✓ Provider status endpoint returned {len(data['providers'])} providers")
        print(f"✓ Available styles: {data['available_styles']}")
        print(f"✓ Genre templates: {data['genre_templates']}")

    def test_library_endpoint_returns_empty_initially(self):
        """Test /api/ai-thumbnails/library returns empty array initially"""
        response = requests.get(
            f"{BASE_URL}/api/ai-thumbnails/library",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Verify response structure
        assert "thumbnails" in data
        assert "total" in data
        assert "has_more" in data
        
        # Verify initial state (should be empty or have previous test data)
        assert isinstance(data["thumbnails"], list)
        assert isinstance(data["total"], int)
        assert isinstance(data["has_more"], bool)
        
        print(f"✓ Library endpoint returned {data['total']} thumbnails")
        print(f"✓ has_more: {data['has_more']}")

    def test_library_endpoint_with_pagination(self):
        """Test /api/ai-thumbnails/library supports pagination params"""
        response = requests.get(
            f"{BASE_URL}/api/ai-thumbnails/library?limit=10&skip=0",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "thumbnails" in data
        assert len(data["thumbnails"]) <= 10  # Should respect limit
        
        print("✓ Library endpoint supports pagination parameters")

    def test_library_endpoint_with_series_filter(self):
        """Test /api/ai-thumbnails/library filters by series_id"""
        response = requests.get(
            f"{BASE_URL}/api/ai-thumbnails/library?series_id=non-existent-id",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should return empty for non-existent series
        assert data["total"] == 0
        assert len(data["thumbnails"]) == 0
        
        print("✓ Library endpoint filters by series_id correctly")

    def test_providers_status_requires_auth(self):
        """Test /api/ai-thumbnails/providers/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai-thumbnails/providers/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Provider status endpoint requires authentication")

    def test_library_requires_auth(self):
        """Test /api/ai-thumbnails/library requires authentication"""
        response = requests.get(f"{BASE_URL}/api/ai-thumbnails/library")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Library endpoint requires authentication")

    def test_generate_endpoint_validation(self):
        """Test /api/ai-thumbnails/generate validates input"""
        # Test with too short prompt (should fail validation)
        response = requests.post(
            f"{BASE_URL}/api/ai-thumbnails/generate",
            headers=self.headers,
            json={
                "prompt": "short",  # Less than 10 chars
                "style": "cinematic",
                "size": "1024x1024",
                "preferred_provider": "openai",
                "save_to_library": False
            }
        )
        # Should return 422 for validation error (prompt too short)
        assert response.status_code == 422, f"Expected 422 for short prompt, got {response.status_code}"
        print("✓ Generate endpoint validates minimum prompt length")

    def test_generate_from_genre_validation(self):
        """Test /api/ai-thumbnails/generate-from-genre validates input"""
        # Test with too short subject
        response = requests.post(
            f"{BASE_URL}/api/ai-thumbnails/generate-from-genre",
            headers=self.headers,
            json={
                "genre": "drama",
                "subject": "hi"  # Less than 5 chars
            }
        )
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for short subject, got {response.status_code}"
        print("✓ Generate from genre endpoint validates minimum subject length")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
