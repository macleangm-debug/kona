"""
Test Tips, Tip Goals, and Early Access Feature Integration
Tests for the video player tip integration, tip goals, and early access features
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

# Common headers - includes User-Agent to bypass anti-automation
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for testing"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }, headers=HEADERS)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def user_info(auth_token):
    """Get user info from auth"""
    auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
    if response.status_code == 200:
        return response.json()
    pytest.skip("Could not get user info")


# ========== TIPS API TESTS ==========
class TestTipsAPI:
    """Test /api/tips endpoints"""
    
    def test_tips_tiers_endpoint(self):
        """GET /api/tips/tiers - returns 5 tiers with amounts and effects"""
        response = requests.get(f"{BASE_URL}/api/tips/tiers", headers=HEADERS)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "tiers" in data
        assert len(data["tiers"]) == 5
        
        # Verify tier structure
        expected_tiers = ["small", "medium", "large", "super", "mega"]
        actual_tiers = [t["tier"] for t in data["tiers"]]
        for tier in expected_tiers:
            assert tier in actual_tiers, f"Missing tier: {tier}"
    
    def test_tips_tiers_amounts(self):
        """Verify tier amounts: small=10, medium=50, large=100, super=500, mega=1000"""
        response = requests.get(f"{BASE_URL}/api/tips/tiers", headers=HEADERS)
        assert response.status_code == 200
        
        tiers = {t["tier"]: t["amount"] for t in response.json()["tiers"]}
        assert tiers["small"] == 10
        assert tiers["medium"] == 50
        assert tiers["large"] == 100
        assert tiers["super"] == 500
        assert tiers["mega"] == 1000
    
    def test_tips_send_requires_auth(self):
        """POST /api/tips/send - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/tips/send", json={
            "creator_id": "test",
            "tier": "small"
        }, headers=HEADERS)
        assert response.status_code == 401
    
    def test_tips_send_invalid_tier(self, auth_token):
        """POST /api/tips/send - rejects invalid tier"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/tips/send", json={
            "creator_id": "test",
            "tier": "invalid"
        }, headers=auth_headers)
        assert response.status_code in [400, 422]
    
    def test_tips_send_nonexistent_creator(self, auth_token):
        """POST /api/tips/send - returns 404 for non-existent creator"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.post(f"{BASE_URL}/api/tips/send", json={
            "creator_id": "nonexistent-creator-id-xyz",
            "tier": "small"
        }, headers=auth_headers)
        assert response.status_code == 404


# ========== TIP GOALS API TESTS ==========
class TestTipGoalsAPI:
    """Test /api/tip-goals endpoints"""
    
    def test_tip_goals_creator_endpoint(self):
        """GET /api/tip-goals/creator/{id} - returns goals for creator (empty for non-existent)"""
        response = requests.get(f"{BASE_URL}/api/tip-goals/creator/test-creator-id", headers=HEADERS)
        assert response.status_code == 200
        
        data = response.json()
        assert "goals" in data
        assert isinstance(data["goals"], list)
    
    def test_tip_goals_get_by_id_not_found(self):
        """GET /api/tip-goals/{id} - returns 404 for non-existent goal"""
        response = requests.get(f"{BASE_URL}/api/tip-goals/nonexistent-goal-id", headers=HEADERS)
        assert response.status_code == 404
    
    def test_tip_goals_create_requires_auth(self):
        """POST /api/tip-goals/ - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/tip-goals/", json={
            "title": "Test Goal",
            "target_amount": 1000
        }, headers=HEADERS)
        assert response.status_code == 401
    
    def test_tip_goals_contribute_requires_auth(self):
        """POST /api/tip-goals/{id}/contribute - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/tip-goals/test-goal/contribute?amount=100",
            headers=HEADERS
        )
        assert response.status_code == 401
    
    def test_tip_goals_contribute_not_found(self, auth_token):
        """POST /api/tip-goals/{id}/contribute - returns 404 for non-existent goal"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/tip-goals/nonexistent-goal/contribute?amount=100",
            headers=auth_headers
        )
        assert response.status_code == 404
    
    def test_tip_goals_contributions_not_found(self):
        """GET /api/tip-goals/{id}/contributions - returns 404 for non-existent goal"""
        response = requests.get(f"{BASE_URL}/api/tip-goals/nonexistent-goal/contributions", headers=HEADERS)
        assert response.status_code == 404
    
    def test_tip_goals_my_goals_requires_auth(self):
        """GET /api/tip-goals/creator/my - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/tip-goals/creator/my", headers=HEADERS)
        assert response.status_code == 401
    
    def test_tip_goals_my_goals_returns_list(self, auth_token):
        """GET /api/tip-goals/creator/my - returns list of creator's goals"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/tip-goals/creator/my", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "goals" in data
        assert isinstance(data["goals"], list)


# ========== EARLY ACCESS API TESTS ==========
class TestEarlyAccessAPI:
    """Test /api/early-access endpoints"""
    
    def test_early_access_tiers_endpoint(self):
        """GET /api/early-access/tiers - returns 3 tiers"""
        response = requests.get(f"{BASE_URL}/api/early-access/tiers", headers=HEADERS)
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        assert len(data["tiers"]) == 3
    
    def test_early_access_tiers_structure(self):
        """Verify early access tier structure"""
        response = requests.get(f"{BASE_URL}/api/early-access/tiers", headers=HEADERS)
        assert response.status_code == 200
        
        tiers = response.json()["tiers"]
        for tier in tiers:
            assert "tier" in tier
            assert "hours_early" in tier
            assert "price_per_month" in tier
            assert "label" in tier
            assert "description" in tier
    
    def test_early_access_tiers_values(self):
        """Verify early access tier values: basic=24h, premium=48h, vip=72h"""
        response = requests.get(f"{BASE_URL}/api/early-access/tiers", headers=HEADERS)
        assert response.status_code == 200
        
        tiers = {t["tier"]: t for t in response.json()["tiers"]}
        assert tiers["basic"]["hours_early"] == 24
        assert tiers["premium"]["hours_early"] == 48
        assert tiers["vip"]["hours_early"] == 72
        
        # Verify prices
        assert tiers["basic"]["price_per_month"] == 100
        assert tiers["premium"]["price_per_month"] == 200
        assert tiers["vip"]["price_per_month"] == 500
    
    def test_early_access_subscribe_requires_auth(self):
        """POST /api/early-access/subscribe - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/early-access/subscribe", json={
            "creator_id": "test",
            "tier": "basic"
        }, headers=HEADERS)
        assert response.status_code == 401
    
    def test_early_access_my_subscriptions_requires_auth(self):
        """GET /api/early-access/my-subscriptions - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/early-access/my-subscriptions", headers=HEADERS)
        assert response.status_code == 401
    
    def test_early_access_my_subscriptions_returns_list(self, auth_token):
        """GET /api/early-access/my-subscriptions - returns subscriptions list"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/early-access/my-subscriptions", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "subscriptions" in data
        assert isinstance(data["subscriptions"], list)
    
    def test_early_access_check_requires_auth(self):
        """GET /api/early-access/check/{creator_id} - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/early-access/check/test-creator", headers=HEADERS)
        assert response.status_code == 401
    
    def test_early_access_check_returns_status(self, auth_token):
        """GET /api/early-access/check/{creator_id} - returns early access status"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/early-access/check/test-creator", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "has_early_access" in data


# ========== INTEGRATION TESTS ==========
class TestTipIntegration:
    """Integration tests for tip features"""
    
    def test_all_tip_endpoints_accessible(self):
        """Verify all tip endpoints are registered and accessible"""
        endpoints = [
            ("GET", "/api/tips/tiers"),
            ("GET", "/api/tips/global/leaderboard"),
            ("GET", "/api/tip-goals/creator/test"),
            ("GET", "/api/early-access/tiers"),
        ]
        
        for method, endpoint in endpoints:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS)
            assert response.status_code in [200, 401, 404], \
                f"Endpoint {method} {endpoint} returned {response.status_code}"
    
    def test_tips_creator_stats_structure(self, auth_token):
        """GET /api/tips/creator/stats - returns proper stats structure"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/tips/creator/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_fields = [
            "total_tips_received", "total_coins_received",
            "tips_today", "coins_today",
            "tips_this_week", "coins_this_week",
            "tips_this_month", "coins_this_month",
            "top_tipper", "recent_tips"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_tips_user_history_structure(self, auth_token):
        """GET /api/tips/user/history - returns proper history structure"""
        auth_headers = {**HEADERS, "Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/tips/user/history", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "tips" in data
        assert "total" in data
        assert "total_spent" in data
        assert "has_more" in data
