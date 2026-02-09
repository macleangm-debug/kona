"""
Tests for Admin Ads Approval Endpoints and Geo-location in Auth responses
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {"email": "superadmin@kona.com", "password": "SuperAdmin2025!"}
BUSINESS_USER = {"email": "test@testcorp.com", "password": "Test1234!"}

# ============ FIXTURES ============
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get super admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed - status: {response.status_code}")

@pytest.fixture(scope="module")
def business_token(api_client):
    """Get business user authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=BUSINESS_USER)
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Business user authentication failed - status: {response.status_code}")


# ============ GEO-LOCATION IN AUTH RESPONSES ============
class TestGeoLocationAuth:
    """Test geo-location data in auth API responses"""
    
    def test_login_returns_geo_field(self, api_client):
        """Login response should include geo field"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user' field"
        
        user = data["user"]
        # Check geo field exists
        assert "geo" in user, "User response should contain 'geo' field"
        
        # geo can be None for existing users without geo data, but field must exist
        print(f"Geo field value: {user.get('geo')}")
    
    def test_login_returns_last_login_geo_field(self, api_client):
        """Login response should include last_login_geo field"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=SUPER_ADMIN)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        user = data["user"]
        
        # Check last_login_geo field exists
        assert "last_login_geo" in user, "User response should contain 'last_login_geo' field"
        
        # last_login_geo should have geo data structure (or be populated after login)
        last_login_geo = user.get("last_login_geo")
        print(f"Last login geo: {last_login_geo}")
        
        if last_login_geo:
            # If populated, check structure
            assert "logged_in_at" in last_login_geo or "country" in last_login_geo, \
                "last_login_geo should have timestamp or country info"
    
    def test_register_returns_geo_field(self, api_client):
        """Register response should include geo field for new users"""
        import uuid
        test_email = f"testgeo_{uuid.uuid4().hex[:8]}@test.com"
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "TestPass123!",
            "name": "Geo Test User"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user' field"
        
        user = data["user"]
        assert "geo" in user, "User response should contain 'geo' field"
        
        geo = user.get("geo")
        print(f"Registration geo: {geo}")
        
        # New user should have geo object with structure
        if geo:
            # Check geo structure has expected fields
            assert isinstance(geo, dict), "geo should be a dict"
            # Check for geo fields (may be None for localhost)
            assert "detected_at" in geo or "country" in geo or "country_code" in geo, \
                "geo should have expected fields"
    
    def test_me_endpoint_returns_geo_fields(self, api_client, admin_token):
        """GET /me should return geo and last_login_geo fields"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"GET /me failed: {response.text}"
        
        data = response.json()
        assert "geo" in data, "/me response should contain 'geo' field"
        assert "last_login_geo" in data, "/me response should contain 'last_login_geo' field"
        
        print(f"/me geo: {data.get('geo')}")
        print(f"/me last_login_geo: {data.get('last_login_geo')}")


# ============ ADMIN ADS APPROVAL ENDPOINTS ============
class TestAdminAdsApprovalEndpoints:
    """Test Admin Ads Approval API endpoints"""
    
    def test_get_pending_ads(self, api_client, admin_token):
        """GET /admin/ads/pending should return pending ads list"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/ads/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get pending ads: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Pending ads count: {len(data)}")
        
        # If there are pending ads, check structure
        if len(data) > 0:
            ad = data[0]
            assert "id" in ad, "Ad should have 'id' field"
            assert "status" in ad, "Ad should have 'status' field"
            assert ad["status"] == "pending_approval", f"Ad status should be pending_approval, got {ad['status']}"
    
    def test_get_pending_campaigns(self, api_client, admin_token):
        """GET /admin/campaigns/pending should return pending campaigns list"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/campaigns/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get pending campaigns: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Pending campaigns count: {len(data)}")
        
        # If there are pending campaigns, check structure
        if len(data) > 0:
            campaign = data[0]
            assert "id" in campaign, "Campaign should have 'id' field"
            assert "status" in campaign, "Campaign should have 'status' field"
    
    def test_get_ads_stats(self, api_client, admin_token):
        """GET /admin/ads/stats should return advertising statistics"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/ads/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get ads stats: {response.text}"
        
        data = response.json()
        
        # Check required fields in stats response
        assert "ads" in data, "Stats should contain 'ads' field"
        assert "campaigns" in data, "Stats should contain 'campaigns' field"
        assert "total_advertisers" in data, "Stats should contain 'total_advertisers' field"
        assert "total_ad_revenue" in data, "Stats should contain 'total_ad_revenue' field"
        
        # Check ads sub-structure
        ads_stats = data["ads"]
        assert "pending" in ads_stats, "ads stats should have 'pending' count"
        assert "approved" in ads_stats, "ads stats should have 'approved' count"
        assert "rejected" in ads_stats, "ads stats should have 'rejected' count"
        
        # Check campaigns sub-structure
        campaign_stats = data["campaigns"]
        assert "pending" in campaign_stats, "campaigns stats should have 'pending' count"
        assert "active" in campaign_stats, "campaigns stats should have 'active' count"
        assert "completed" in campaign_stats, "campaigns stats should have 'completed' count"
        
        print(f"Ads stats: {data}")
    
    def test_ads_endpoints_require_auth(self, api_client):
        """Ads approval endpoints should require authentication"""
        endpoints = [
            ("GET", f"{BASE_URL}/api/admin/ads/pending"),
            ("GET", f"{BASE_URL}/api/admin/campaigns/pending"),
            ("GET", f"{BASE_URL}/api/admin/ads/stats"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = api_client.get(url)
            
            assert response.status_code in [401, 403, 422], \
                f"{method} {url} should require auth, got {response.status_code}"
        
        print("All ads endpoints correctly require authentication")
    
    def test_ads_endpoints_require_admin(self, api_client, business_token):
        """Ads approval endpoints should require admin privileges"""
        # Business user should not have admin access
        response = api_client.get(
            f"{BASE_URL}/api/admin/ads/pending",
            headers={"Authorization": f"Bearer {business_token}"}
        )
        
        assert response.status_code in [401, 403], \
            f"Non-admin should get 401/403, got {response.status_code}"
        
        print("Non-admin users correctly denied access to ads endpoints")


class TestApproveRejectAds:
    """Test approve/reject functionality (only if there are pending items)"""
    
    def test_approve_ad_nonexistent(self, api_client, admin_token):
        """POST /admin/ads/{ad_id}/approve should return 404 for non-existent ad"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/ads/nonexistent-ad-12345/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 for non-existent ad
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_reject_ad_nonexistent(self, api_client, admin_token):
        """POST /admin/ads/{ad_id}/reject should return 404 for non-existent ad"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/ads/nonexistent-ad-12345/reject",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 for non-existent ad
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_approve_campaign_nonexistent(self, api_client, admin_token):
        """POST /admin/campaigns/{campaign_id}/approve should return 404 for non-existent campaign"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/campaigns/nonexistent-campaign-12345/approve",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 for non-existent campaign
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
    
    def test_reject_campaign_nonexistent(self, api_client, admin_token):
        """POST /admin/campaigns/{campaign_id}/reject should return 404 for non-existent campaign"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/campaigns/nonexistent-campaign-12345/reject",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 404 for non-existent campaign
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
