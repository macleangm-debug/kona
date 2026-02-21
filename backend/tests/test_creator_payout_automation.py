"""
Creator Portal and Auto-Payout Automation Tests
Tests:
- Creator status and dashboard endpoints
- Creator series listing
- Upload settings API
- Auto-payout settings CRUD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials - superadmin is auto-approved as creator
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"

# User-Agent header to bypass bot detection
DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/json"
}


class TestCreatorPortalAndAutoPayout:
    """Creator Portal and Auto-Payout Tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for superadmin (who is auto-approved as creator)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }, headers=DEFAULT_HEADERS)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Auth headers for requests"""
        return {**DEFAULT_HEADERS, "Authorization": f"Bearer {auth_token}"}
    
    # ============ CREATOR STATUS TESTS ============
    def test_01_creator_status_endpoint(self, auth_headers):
        """GET /api/creator/status - should return creator status"""
        response = requests.get(f"{BASE_URL}/api/creator/status", headers=auth_headers)
        assert response.status_code == 200, f"Creator status failed: {response.text}"
        
        data = response.json()
        # Superadmin should be auto-approved as creator
        assert "is_creator" in data, f"Missing is_creator in response: {data}"
        assert "status" in data, f"Missing status in response: {data}"
        print(f"✅ Creator status: is_creator={data['is_creator']}, status={data['status']}")
    
    def test_02_creator_status_requires_auth(self):
        """GET /api/creator/status - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/status", headers=DEFAULT_HEADERS)
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Creator status requires auth")
    
    # ============ CREATOR DASHBOARD TESTS ============
    def test_03_creator_dashboard_endpoint(self, auth_headers):
        """GET /api/creator/dashboard - should return dashboard data"""
        response = requests.get(f"{BASE_URL}/api/creator/dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        
        data = response.json()
        # Check required fields
        expected_fields = ["creator_id", "name", "tier", "revenue_share", "total_series", 
                          "total_episodes", "total_views", "total_earnings", "pending_payout"]
        for field in expected_fields:
            assert field in data, f"Missing field '{field}' in dashboard: {data}"
        
        print(f"✅ Dashboard: tier={data['tier']}, series={data['total_series']}, earnings={data['total_earnings']}")
    
    def test_04_creator_dashboard_requires_auth(self):
        """GET /api/creator/dashboard - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Creator dashboard requires auth")
    
    # ============ CREATOR SERIES TESTS ============
    def test_05_creator_series_list(self, auth_headers):
        """GET /api/creator/series - should return creator's series"""
        response = requests.get(f"{BASE_URL}/api/creator/series", headers=auth_headers)
        assert response.status_code == 200, f"Series list failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"
        print(f"✅ Creator series list: {len(data)} series found")
    
    def test_06_creator_series_requires_auth(self):
        """GET /api/creator/series - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/series")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Creator series requires auth")
    
    # ============ UPLOAD SETTINGS TESTS ============
    def test_07_upload_settings_endpoint(self, auth_headers):
        """GET /api/creator/upload-settings - should return video format rules"""
        response = requests.get(f"{BASE_URL}/api/creator/upload-settings", headers=auth_headers)
        assert response.status_code == 200, f"Upload settings failed: {response.text}"
        
        data = response.json()
        # Check video settings
        assert "video" in data, f"Missing 'video' key: {data}"
        video = data["video"]
        assert "allowed_formats" in video, f"Missing allowed_formats: {video}"
        assert "max_file_size_mb" in video, f"Missing max_file_size_mb: {video}"
        assert "max_duration_minutes" in video, f"Missing max_duration_minutes: {video}"
        
        # Check pricing info
        assert "pricing" in data, f"Missing 'pricing' key: {data}"
        pricing = data["pricing"]
        assert "default_episode_price" in pricing, f"Missing default_episode_price: {pricing}"
        assert "first_episode_free" in pricing, f"Missing first_episode_free: {pricing}"
        
        print(f"✅ Upload settings: formats={video['allowed_formats']}, max_size={video['max_file_size_mb']}MB")
    
    def test_08_upload_settings_requires_auth(self):
        """GET /api/creator/upload-settings - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/upload-settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Upload settings requires auth")
    
    # ============ AUTO-PAYOUT SETTINGS TESTS ============
    def test_09_auto_payout_settings_get(self, auth_headers):
        """GET /api/payouts/auto/settings - should return auto-payout config"""
        response = requests.get(f"{BASE_URL}/api/payouts/auto/settings", headers=auth_headers)
        assert response.status_code == 200, f"Auto-payout settings failed: {response.text}"
        
        data = response.json()
        # Check required fields
        expected_fields = ["creator_id", "status", "threshold_coins"]
        for field in expected_fields:
            assert field in data, f"Missing field '{field}': {data}"
        
        # Should also have balance info
        assert "current_balance" in data, f"Missing current_balance: {data}"
        assert "balance_meets_threshold" in data, f"Missing balance_meets_threshold: {data}"
        
        print(f"✅ Auto-payout settings: status={data['status']}, threshold={data['threshold_coins']}")
    
    def test_10_auto_payout_settings_requires_auth(self):
        """GET /api/payouts/auto/settings - should require authentication"""
        response = requests.get(f"{BASE_URL}/api/payouts/auto/settings")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ Auto-payout settings requires auth")
    
    def test_11_auto_payout_settings_update_threshold(self, auth_headers):
        """PUT /api/payouts/auto/settings - should update threshold"""
        # Update threshold
        update_data = {"threshold_coins": 10000}
        response = requests.put(
            f"{BASE_URL}/api/payouts/auto/settings",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update threshold failed: {response.text}"
        
        data = response.json()
        assert data.get("threshold_coins") == 10000, f"Threshold not updated: {data}"
        print("✅ Updated threshold to 10000")
        
        # Reset back to default
        response = requests.put(
            f"{BASE_URL}/api/payouts/auto/settings",
            json={"threshold_coins": 5000},
            headers=auth_headers
        )
        assert response.status_code == 200, "Failed to reset threshold"
        print("✅ Reset threshold back to 5000")
    
    def test_12_auto_payout_settings_update_status(self, auth_headers):
        """PUT /api/payouts/auto/settings - should toggle enabled/disabled"""
        # Enable auto-payout
        response = requests.put(
            f"{BASE_URL}/api/payouts/auto/settings",
            json={"status": "enabled"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Enable failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "enabled", f"Status not enabled: {data}"
        print("✅ Enabled auto-payout")
        
        # Disable auto-payout
        response = requests.put(
            f"{BASE_URL}/api/payouts/auto/settings",
            json={"status": "disabled"},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Disable failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "disabled", f"Status not disabled: {data}"
        print("✅ Disabled auto-payout")
    
    def test_13_auto_payout_settings_update_method(self, auth_headers):
        """PUT /api/payouts/auto/settings - should update payout method"""
        update_data = {
            "payout_method": "mobile_money",
            "country_code": "KE",
            "payout_details": {"phone_number": "+254712345678"}
        }
        response = requests.put(
            f"{BASE_URL}/api/payouts/auto/settings",
            json=update_data,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Update method failed: {response.text}"
        
        data = response.json()
        assert data.get("payout_method") == "mobile_money", f"Method not updated: {data}"
        assert data.get("country_code") == "KE", f"Country not updated: {data}"
        print("✅ Updated payout method to mobile_money")
    
    def test_14_auto_payout_settings_validate_min_threshold(self, auth_headers):
        """PUT /api/payouts/auto/settings - should reject threshold below minimum"""
        # Try to set threshold below minimum (1000)
        response = requests.put(
            f"{BASE_URL}/api/payouts/auto/settings",
            json={"threshold_coins": 500},
            headers=auth_headers
        )
        # Should fail with 400
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✅ Correctly rejected threshold below minimum (500)")
    
    # ============ PAYOUT HISTORY TESTS ============
    def test_15_payout_history_endpoint(self, auth_headers):
        """GET /api/payouts/history - should return payout history"""
        response = requests.get(f"{BASE_URL}/api/payouts/history", headers=auth_headers)
        assert response.status_code == 200, f"Payout history failed: {response.text}"
        
        data = response.json()
        assert "payouts" in data, f"Missing payouts: {data}"
        assert "total_paid_out" in data, f"Missing total_paid_out: {data}"
        assert "pending_balance" in data, f"Missing pending_balance: {data}"
        
        print(f"✅ Payout history: {len(data['payouts'])} payouts, pending={data['pending_balance']}")
    
    def test_16_payout_providers_endpoint(self):
        """GET /api/payouts/providers - should return supported countries"""
        # This endpoint doesn't require auth
        response = requests.get(f"{BASE_URL}/api/payouts/providers")
        assert response.status_code == 200, f"Providers failed: {response.text}"
        
        data = response.json()
        assert "countries" in data, f"Missing countries: {data}"
        assert "min_payout_coins" in data, f"Missing min_payout_coins: {data}"
        
        print(f"✅ Payout providers: {len(data['countries'])} countries supported")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
