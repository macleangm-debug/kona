"""
Test suite for CDN Optimization Streaming APIs
Tests quality tiers, data saver, bandwidth estimation, and preload strategies
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@kona.com"
TEST_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestStreamingConfigAPI:
    """Tests for GET /api/streaming/config"""
    
    def test_anonymous_streaming_config(self):
        """Anonymous users should get free tier config"""
        response = requests.get(f"{BASE_URL}/api/streaming/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data["tier"] == "free"
        assert data["default_quality"] == "480p"
        assert data["auto_quality"] == True
        assert "available_qualities" in data
        assert "allowed_qualities" in data
        assert "recommendations" in data
        
        # Free tier should only allow 360p and 480p
        assert data["allowed_qualities"] == ["360p", "480p"]
        
        # All 4 qualities should be listed but with vip_only flags
        assert len(data["available_qualities"]) == 4
        
        # Check VIP badge on 1080p for free users
        quality_1080p = next(q for q in data["available_qualities"] if q["value"] == "1080p")
        assert quality_1080p["vip_only"] == True
    
    def test_authenticated_streaming_config(self, auth_headers):
        """Authenticated users should get their saved preferences"""
        response = requests.get(f"{BASE_URL}/api/streaming/config", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "tier" in data
        assert "current_quality" in data
        assert "auto_quality" in data
        assert "available_qualities" in data


class TestQualityPreferenceAPI:
    """Tests for POST /api/streaming/quality"""
    
    def test_set_valid_quality_480p(self, auth_headers):
        """Free users can set 480p quality"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/quality",
            headers=auth_headers,
            json={"quality": "480p", "auto_quality": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["quality"] == "480p"
        assert data["auto_quality"] == True
        assert "message" in data
    
    def test_set_valid_quality_360p(self, auth_headers):
        """Free users can set 360p quality"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/quality",
            headers=auth_headers,
            json={"quality": "360p", "auto_quality": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["quality"] == "360p"
    
    def test_set_720p_blocked_for_free_user(self, auth_headers):
        """Free users cannot set 720p quality"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/quality",
            headers=auth_headers,
            json={"quality": "720p", "auto_quality": False}
        )
        assert response.status_code == 403
        assert "VIP subscription" in response.json()["detail"]
    
    def test_set_1080p_blocked_for_free_user(self, auth_headers):
        """Free users cannot set 1080p quality"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/quality",
            headers=auth_headers,
            json={"quality": "1080p", "auto_quality": False}
        )
        assert response.status_code == 403
        assert "VIP subscription" in response.json()["detail"]
    
    def test_set_invalid_quality(self, auth_headers):
        """Invalid quality values should be rejected"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/quality",
            headers=auth_headers,
            json={"quality": "4k", "auto_quality": False}
        )
        assert response.status_code == 400
        assert "Invalid quality" in response.json()["detail"]
    
    def test_quality_requires_auth(self):
        """Setting quality requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/quality",
            json={"quality": "480p", "auto_quality": True}
        )
        assert response.status_code in [401, 403]


class TestBandwidthEstimateAPI:
    """Tests for GET /api/streaming/bandwidth-estimate"""
    
    def test_anonymous_bandwidth_estimate(self):
        """Anonymous users get default estimates"""
        response = requests.get(f"{BASE_URL}/api/streaming/bandwidth-estimate")
        assert response.status_code == 200
        
        data = response.json()
        assert data["estimated_hours"] == 10
        assert data["estimated_gb"] == 5
        assert data["recommended_quality"] == "480p"
        assert "tip" in data
        assert "Sign up" in data["tip"]
    
    def test_authenticated_bandwidth_estimate(self, auth_headers):
        """Authenticated users get personalized estimates"""
        response = requests.get(f"{BASE_URL}/api/streaming/bandwidth-estimate", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "episodes_watched" in data
        assert "estimated_hours_watched" in data
        assert "current_quality" in data
        assert "estimated_monthly_gb" in data
        assert "recommended_quality" in data
        assert "tip" in data
        assert "data_by_quality" in data
        
        # Verify data_by_quality has all 4 quality options
        assert "360p" in data["data_by_quality"]
        assert "480p" in data["data_by_quality"]
        assert "720p" in data["data_by_quality"]
        assert "1080p" in data["data_by_quality"]


class TestPreloadStrategyAPI:
    """Tests for GET /api/streaming/preload-strategy/{episode_id}"""
    
    def test_preload_strategy_valid_episode(self):
        """Get preload strategy for valid episode"""
        response = requests.get(f"{BASE_URL}/api/streaming/preload-strategy/series-1-ep1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["episode_id"] == "series-1-ep1"
        assert data["preload"] == "none"  # Lazy loading
        assert data["poster"] == True
        assert data["lazy_load_thumbnails"] == True
        assert "buffer_strategy" in data
        assert data["buffer_strategy"]["initial_buffer_kb"] == 500
        assert data["buffer_strategy"]["buffer_ahead_seconds"] == 10
        assert "tip" in data
    
    def test_preload_strategy_bandwidth_saving_mode(self):
        """Anonymous users should have bandwidth_saving_mode enabled"""
        response = requests.get(f"{BASE_URL}/api/streaming/preload-strategy/series-1-ep1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["bandwidth_saving_mode"] == True


class TestDataSaverAPI:
    """Tests for POST /api/streaming/data-saver"""
    
    def test_enable_data_saver(self, auth_headers):
        """Enable data saver mode"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/data-saver?enabled=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["data_saver"] == True
        assert data["quality"] == "360p"
        assert "enabled" in data["message"].lower()
    
    def test_disable_data_saver(self, auth_headers):
        """Disable data saver mode"""
        response = requests.post(
            f"{BASE_URL}/api/streaming/data-saver?enabled=false",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["data_saver"] == False
        assert data["quality"] == "480p"
    
    def test_data_saver_requires_auth(self):
        """Data saver toggle requires authentication"""
        response = requests.post(f"{BASE_URL}/api/streaming/data-saver?enabled=true")
        assert response.status_code in [401, 403]


class TestHLSManifestAPI:
    """Tests for GET /api/streaming/hls/{episode_id}"""
    
    def test_hls_manifest_anonymous(self):
        """Anonymous users get free tier HLS variants"""
        response = requests.get(f"{BASE_URL}/api/streaming/hls/series-1-ep1")
        assert response.status_code == 200
        
        data = response.json()
        assert data["episode_id"] == "series-1-ep1"
        assert data["type"] == "hls"
        assert data["user_tier"] == "free"
        assert data["adaptive_enabled"] == True
        assert data["default_quality"] == "480p"
        
        # Free tier should only have 360p and 480p variants
        assert len(data["variants"]) == 2
        qualities = [v["quality"] for v in data["variants"]]
        assert "360p" in qualities
        assert "480p" in qualities
        assert "720p" not in qualities
        assert "1080p" not in qualities
        
        # Check buffer config
        assert "buffer_config" in data
        assert data["buffer_config"]["initial_buffer_seconds"] == 3
    
    def test_hls_manifest_invalid_episode(self):
        """Invalid episode ID returns 404"""
        response = requests.get(f"{BASE_URL}/api/streaming/hls/invalid-episode-id")
        assert response.status_code == 404


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
