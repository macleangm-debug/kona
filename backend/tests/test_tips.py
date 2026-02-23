"""
Test Tip Jar / Super Coins Feature
Tests for creator tipping system with tiered amounts and visual effects
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

# Common headers
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}


class TestTipTiers:
    """Test GET /api/tips/tiers endpoint - returns 5 tiers with amounts and effects"""
    
    def test_get_tip_tiers_returns_5_tiers(self):
        """Verify all 5 tip tiers are returned"""
        response = requests.get(f"{BASE_URL}/api/tips/tiers", headers=HEADERS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tiers" in data, "Response should contain 'tiers' key"
        
        tiers = data["tiers"]
        assert len(tiers) == 5, f"Expected 5 tiers, got {len(tiers)}"
        
    def test_tip_tiers_have_correct_amounts(self):
        """Verify tier amounts: small=10, medium=50, large=100, super=500, mega=1000"""
        response = requests.get(f"{BASE_URL}/api/tips/tiers", headers=HEADERS)
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        expected_amounts = {
            "small": 10,
            "medium": 50,
            "large": 100,
            "super": 500,
            "mega": 1000
        }
        
        for tier in tiers:
            tier_name = tier["tier"]
            assert tier_name in expected_amounts, f"Unexpected tier: {tier_name}"
            assert tier["amount"] == expected_amounts[tier_name], \
                f"Tier {tier_name} should have amount {expected_amounts[tier_name]}, got {tier['amount']}"
    
    def test_tip_tiers_have_effects(self):
        """Verify each tier has visual effect configuration"""
        response = requests.get(f"{BASE_URL}/api/tips/tiers", headers=HEADERS)
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        for tier in tiers:
            assert "effect" in tier, f"Tier {tier['tier']} should have 'effect'"
            effect = tier["effect"]
            assert "animation" in effect, f"Effect should have 'animation'"
            assert "duration" in effect, f"Effect should have 'duration'"
            assert "color" in effect, f"Effect should have 'color'"
    
    def test_tip_tiers_have_labels(self):
        """Verify each tier has a label"""
        response = requests.get(f"{BASE_URL}/api/tips/tiers")
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        for tier in tiers:
            assert "label" in tier, f"Tier {tier['tier']} should have 'label'"
            assert tier["label"] == tier["tier"].capitalize(), \
                f"Label should be capitalized tier name"


class TestCreatorTipStats:
    """Test GET /api/tips/creator/stats endpoint - requires authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_creator_stats_requires_auth(self):
        """Verify endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/tips/creator/stats")
        assert response.status_code == 401, "Should require authentication"
    
    def test_creator_stats_returns_statistics(self, auth_token):
        """Verify creator stats response structure"""
        response = requests.get(
            f"{BASE_URL}/api/tips/creator/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify all expected fields
        expected_fields = [
            "total_tips_received",
            "total_coins_received",
            "tips_today",
            "coins_today",
            "tips_this_week",
            "coins_this_week",
            "tips_this_month",
            "coins_this_month",
            "top_tipper",
            "recent_tips"
        ]
        
        for field in expected_fields:
            assert field in data, f"Response should contain '{field}'"
    
    def test_creator_stats_numeric_values(self, auth_token):
        """Verify numeric stats are integers"""
        response = requests.get(
            f"{BASE_URL}/api/tips/creator/stats",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        numeric_fields = [
            "total_tips_received",
            "total_coins_received",
            "tips_today",
            "coins_today",
            "tips_this_week",
            "coins_this_week",
            "tips_this_month",
            "coins_this_month"
        ]
        
        for field in numeric_fields:
            assert isinstance(data[field], int), f"'{field}' should be integer"
            assert data[field] >= 0, f"'{field}' should be non-negative"


class TestGlobalLeaderboard:
    """Test GET /api/tips/global/leaderboard endpoint"""
    
    def test_global_leaderboard_returns_leaderboard(self):
        """Verify global leaderboard endpoint works"""
        response = requests.get(f"{BASE_URL}/api/tips/global/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard'"
        assert "timeframe" in data, "Response should contain 'timeframe'"
        assert isinstance(data["leaderboard"], list), "Leaderboard should be a list"
    
    def test_global_leaderboard_default_timeframe(self):
        """Verify default timeframe is 'all'"""
        response = requests.get(f"{BASE_URL}/api/tips/global/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert data["timeframe"] == "all", "Default timeframe should be 'all'"
    
    def test_global_leaderboard_week_timeframe(self):
        """Test leaderboard with week timeframe"""
        response = requests.get(f"{BASE_URL}/api/tips/global/leaderboard?timeframe=week")
        assert response.status_code == 200
        
        data = response.json()
        assert data["timeframe"] == "week"
    
    def test_global_leaderboard_month_timeframe(self):
        """Test leaderboard with month timeframe"""
        response = requests.get(f"{BASE_URL}/api/tips/global/leaderboard?timeframe=month")
        assert response.status_code == 200
        
        data = response.json()
        assert data["timeframe"] == "month"
    
    def test_global_leaderboard_limit_parameter(self):
        """Test leaderboard respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/tips/global/leaderboard?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["leaderboard"]) <= 5, "Should respect limit parameter"


class TestCreatorLeaderboard:
    """Test GET /api/tips/creator/{creator_id}/leaderboard endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def creator_id(self, auth_token):
        """Get creator ID from auth"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        if response.status_code == 200:
            return response.json().get("id")
        pytest.skip("Could not get creator ID")
    
    def test_creator_leaderboard(self, creator_id):
        """Test creator-specific leaderboard"""
        response = requests.get(f"{BASE_URL}/api/tips/creator/{creator_id}/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "leaderboard" in data, "Response should contain 'leaderboard'"
        assert "creator_id" in data, "Response should contain 'creator_id'"
        assert data["creator_id"] == creator_id


class TestSendTip:
    """Test POST /api/tips/send endpoint - requires authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_send_tip_requires_auth(self):
        """Verify endpoint returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/tips/send", json={
            "creator_id": "test-creator",
            "tier": "small"
        })
        assert response.status_code == 401, "Should require authentication"
    
    def test_send_tip_invalid_tier(self, auth_token):
        """Test sending with invalid tier"""
        response = requests.post(
            f"{BASE_URL}/api/tips/send",
            json={
                "creator_id": "some-creator",
                "tier": "invalid_tier"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        # Should return 422 (validation error) or 400 (bad request)
        assert response.status_code in [400, 422], \
            f"Invalid tier should fail, got {response.status_code}"
    
    def test_send_tip_to_nonexistent_creator(self, auth_token):
        """Test sending tip to non-existent creator"""
        response = requests.post(
            f"{BASE_URL}/api/tips/send",
            json={
                "creator_id": "nonexistent-creator-id-12345",
                "tier": "small"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 404, "Should return 404 for non-existent creator"


class TestUserTipHistory:
    """Test GET /api/tips/user/history endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_user_history_requires_auth(self):
        """Verify endpoint returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/tips/user/history")
        assert response.status_code == 401, "Should require authentication"
    
    def test_user_history_returns_structure(self, auth_token):
        """Verify user tip history response structure"""
        response = requests.get(
            f"{BASE_URL}/api/tips/user/history",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "tips" in data, "Response should contain 'tips'"
        assert "total" in data, "Response should contain 'total'"
        assert "total_spent" in data, "Response should contain 'total_spent'"
        assert "has_more" in data, "Response should contain 'has_more'"
        assert isinstance(data["tips"], list), "'tips' should be a list"
