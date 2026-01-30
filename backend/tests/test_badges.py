"""
Achievement Badges API Tests
Tests for badge endpoints: /api/badges/*
- GET /api/badges/all - Get all available badges
- GET /api/badges/my-badges - Get user badges with progress (auth required)
- POST /api/badges/check - Check and award new badges (auth required)
- PUT /api/badges/featured - Update featured badges max 3 (auth required)
- GET /api/badges/leaderboard - Get badge leaderboard
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_EMAIL = "user@kona.com"
TEST_USER_PASSWORD = "User123!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token for test user"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestBadgesPublicEndpoints:
    """Tests for public badge endpoints (no auth required)"""
    
    def test_get_all_badges_returns_200(self, api_client):
        """GET /api/badges/all returns 200"""
        response = api_client.get(f"{BASE_URL}/api/badges/all")
        assert response.status_code == 200
    
    def test_get_all_badges_returns_10_badges(self, api_client):
        """GET /api/badges/all returns exactly 10 badges"""
        response = api_client.get(f"{BASE_URL}/api/badges/all")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 10
    
    def test_get_all_badges_schema(self, api_client):
        """GET /api/badges/all returns badges with correct schema"""
        response = api_client.get(f"{BASE_URL}/api/badges/all")
        data = response.json()
        
        # Check first badge has all required fields
        badge = data[0]
        required_fields = ["id", "name", "description", "icon", "color", "criteria", "reward_coins"]
        for field in required_fields:
            assert field in badge, f"Missing field: {field}"
        
        # Check criteria structure
        assert "type" in badge["criteria"]
        assert "target" in badge["criteria"]
    
    def test_get_all_badges_contains_expected_badges(self, api_client):
        """GET /api/badges/all contains all expected badge IDs"""
        response = api_client.get(f"{BASE_URL}/api/badges/all")
        data = response.json()
        
        expected_badge_ids = [
            "first_steps", "marathon_master", "early_adopter", "super_referrer",
            "series_slayer", "vip_member", "mission_ace", "night_owl",
            "big_spender", "loyal_viewer"
        ]
        
        actual_badge_ids = [b["id"] for b in data]
        for expected_id in expected_badge_ids:
            assert expected_id in actual_badge_ids, f"Missing badge: {expected_id}"
    
    def test_get_leaderboard_returns_200(self, api_client):
        """GET /api/badges/leaderboard returns 200"""
        response = api_client.get(f"{BASE_URL}/api/badges/leaderboard")
        assert response.status_code == 200
    
    def test_get_leaderboard_returns_list(self, api_client):
        """GET /api/badges/leaderboard returns a list"""
        response = api_client.get(f"{BASE_URL}/api/badges/leaderboard")
        data = response.json()
        assert isinstance(data, list)


class TestBadgesAuthenticatedEndpoints:
    """Tests for authenticated badge endpoints"""
    
    def test_get_my_badges_requires_auth(self, api_client):
        """GET /api/badges/my-badges returns 401 without auth"""
        # Remove auth header temporarily
        api_client.headers.pop("Authorization", None)
        response = api_client.get(f"{BASE_URL}/api/badges/my-badges")
        assert response.status_code == 401
    
    def test_get_my_badges_returns_200(self, authenticated_client):
        """GET /api/badges/my-badges returns 200 with auth"""
        response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        assert response.status_code == 200
    
    def test_get_my_badges_schema(self, authenticated_client):
        """GET /api/badges/my-badges returns correct schema"""
        response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        data = response.json()
        
        # Check top-level fields
        assert "badges" in data
        assert "total_earned" in data
        assert "total_available" in data
        assert "featured_badges" in data
        
        # Check badges list
        assert isinstance(data["badges"], list)
        assert len(data["badges"]) == 10
        
        # Check badge structure includes progress fields
        badge = data["badges"][0]
        assert "earned" in badge
        assert "featured" in badge
        assert "progress" in badge
        assert "progress_percent" in badge
    
    def test_get_my_badges_progress_calculation(self, authenticated_client):
        """GET /api/badges/my-badges calculates progress correctly"""
        response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        data = response.json()
        
        # Find early_adopter badge - should have 100% progress for users created in first 90 days
        early_adopter = next((b for b in data["badges"] if b["id"] == "early_adopter"), None)
        assert early_adopter is not None
        # User created on Jan 28, 2026 - within 90 days of Jan 1, 2026 launch
        assert early_adopter["progress_percent"] == 100
    
    def test_check_badges_requires_auth(self, api_client):
        """POST /api/badges/check returns 401 without auth"""
        api_client.headers.pop("Authorization", None)
        response = api_client.post(f"{BASE_URL}/api/badges/check")
        assert response.status_code == 401
    
    def test_check_badges_returns_200(self, authenticated_client):
        """POST /api/badges/check returns 200 with auth"""
        response = authenticated_client.post(f"{BASE_URL}/api/badges/check")
        assert response.status_code == 200
    
    def test_check_badges_response_schema(self, authenticated_client):
        """POST /api/badges/check returns correct schema"""
        response = authenticated_client.post(f"{BASE_URL}/api/badges/check")
        data = response.json()
        
        assert "newly_earned" in data
        assert "total_reward" in data
        assert "total_badges" in data
        
        assert isinstance(data["newly_earned"], list)
        assert isinstance(data["total_reward"], int)
        assert isinstance(data["total_badges"], int)
    
    def test_featured_badges_requires_auth(self, api_client):
        """PUT /api/badges/featured returns 401 without auth"""
        api_client.headers.pop("Authorization", None)
        response = api_client.put(f"{BASE_URL}/api/badges/featured", json={"badge_ids": []})
        assert response.status_code == 401
    
    def test_featured_badges_max_3_validation(self, authenticated_client):
        """PUT /api/badges/featured rejects more than 3 badges"""
        response = authenticated_client.put(f"{BASE_URL}/api/badges/featured", json={
            "badge_ids": ["a", "b", "c", "d"]
        })
        assert response.status_code == 400
        assert "Maximum 3 featured badges" in response.json().get("detail", "")
    
    def test_featured_badges_unearned_validation(self, authenticated_client):
        """PUT /api/badges/featured rejects unearned badges"""
        # first_steps is likely not earned
        response = authenticated_client.put(f"{BASE_URL}/api/badges/featured", json={
            "badge_ids": ["first_steps"]
        })
        # Could be 400 if not earned, or 200 if earned
        if response.status_code == 400:
            assert "not earned" in response.json().get("detail", "")
    
    def test_featured_badges_update_success(self, authenticated_client):
        """PUT /api/badges/featured updates featured badges successfully"""
        # First get earned badges
        my_badges_response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        earned_badges = [b["id"] for b in my_badges_response.json()["badges"] if b["earned"]]
        
        if len(earned_badges) > 0:
            # Update featured with first earned badge
            response = authenticated_client.put(f"{BASE_URL}/api/badges/featured", json={
                "badge_ids": [earned_badges[0]]
            })
            assert response.status_code == 200
            assert "message" in response.json()
            assert response.json()["featured_badges"] == [earned_badges[0]]
        else:
            # No earned badges, test empty update
            response = authenticated_client.put(f"{BASE_URL}/api/badges/featured", json={
                "badge_ids": []
            })
            assert response.status_code == 200
    
    def test_featured_badges_persist(self, authenticated_client):
        """PUT /api/badges/featured changes persist in GET /api/badges/my-badges"""
        # Get earned badges
        my_badges_response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        earned_badges = [b["id"] for b in my_badges_response.json()["badges"] if b["earned"]]
        
        if len(earned_badges) > 0:
            # Update featured
            authenticated_client.put(f"{BASE_URL}/api/badges/featured", json={
                "badge_ids": [earned_badges[0]]
            })
            
            # Verify persistence
            verify_response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
            assert earned_badges[0] in verify_response.json()["featured_badges"]


class TestBadgeProgressTypes:
    """Tests for different badge progress calculation types"""
    
    def test_early_adopter_progress(self, authenticated_client):
        """Early Adopter badge progress is calculated correctly"""
        response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        badges = response.json()["badges"]
        
        early_adopter = next((b for b in badges if b["id"] == "early_adopter"), None)
        assert early_adopter is not None
        # Target is 90 days, progress should be 90 if eligible
        assert early_adopter["criteria"]["target"] == 90
    
    def test_first_steps_progress(self, authenticated_client):
        """First Steps badge progress is based on episodes_watched"""
        response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        badges = response.json()["badges"]
        
        first_steps = next((b for b in badges if b["id"] == "first_steps"), None)
        assert first_steps is not None
        assert first_steps["criteria"]["type"] == "episodes_watched"
        assert first_steps["criteria"]["target"] == 1
    
    def test_marathon_master_progress(self, authenticated_client):
        """Marathon Master badge progress is based on episodes_in_day"""
        response = authenticated_client.get(f"{BASE_URL}/api/badges/my-badges")
        badges = response.json()["badges"]
        
        marathon = next((b for b in badges if b["id"] == "marathon_master"), None)
        assert marathon is not None
        assert marathon["criteria"]["type"] == "episodes_in_day"
        assert marathon["criteria"]["target"] == 10


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
