"""
Business Dashboard Analytics Tests
Tests for:
- GET /api/advertiser/analytics/daily (daily analytics with time-series data)
- GET /api/advertiser/analytics/campaigns (per-campaign analytics breakdown)
- GET /api/advertiser/analytics/overview (overall analytics)
- GET /api/advertiser/analytics/placements (placement analytics)
- GET /api/advertiser/analytics/geo (geo analytics)
- Campaign CRUD with geo targeting
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADVERTISER_EMAIL = "test@testcorp.com"
ADVERTISER_PASSWORD = "Test1234!"


class TestAdvertiserAuth:
    """Test advertiser authentication"""
    
    def test_advertiser_login_success(self):
        """Test advertiser login returns token and advertiser data"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "No token in response"
        assert "advertiser" in data, "No advertiser in response"
        assert data["advertiser"]["email"] == ADVERTISER_EMAIL
        assert "id" in data["advertiser"]
        assert "company_name" in data["advertiser"]
        print(f"✅ Advertiser login successful - {data['advertiser']['company_name']}")


class TestDailyAnalytics:
    """Tests for GET /api/advertiser/analytics/daily endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate advertiser")
    
    def test_daily_analytics_default_days(self):
        """Test daily analytics with default 30 days"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/daily",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "daily_data" in data, "Missing daily_data array"
        assert "period" in data, "Missing period"
        assert "summary" in data, "Missing summary"
        
        # Verify daily_data structure
        if len(data["daily_data"]) > 0:
            day = data["daily_data"][0]
            assert "date" in day, "Missing date in daily_data"
            assert "day" in day, "Missing day label"
            assert "impressions" in day, "Missing impressions"
            assert "views" in day, "Missing views"
            assert "clicks" in day, "Missing clicks"
            assert "spent" in day, "Missing spent"
            assert "ctr" in day, "Missing ctr"
            assert "view_rate" in day, "Missing view_rate"
            print(f"✅ Daily analytics returns {len(data['daily_data'])} days of data")
        else:
            print("⚠️ Daily data is empty (no campaign data yet)")
    
    def test_daily_analytics_14_days(self):
        """Test daily analytics with 14 days parameter (used by dashboard)"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/daily?days=14",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "daily_data" in data
        assert data["period"] == "Last 14 days", f"Expected 'Last 14 days', got '{data['period']}'"
        
        # Should have 14 data points
        assert len(data["daily_data"]) == 14, f"Expected 14 days, got {len(data['daily_data'])}"
        print(f"✅ Daily analytics returns exactly 14 days for dashboard chart")
    
    def test_daily_analytics_summary(self):
        """Test that summary contains all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/daily?days=7",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        summary = response.json()["summary"]
        required_fields = ["total_impressions", "total_views", "total_clicks", 
                         "total_spent", "avg_daily_impressions", "avg_daily_spent"]
        
        for field in required_fields:
            assert field in summary, f"Missing summary field: {field}"
        
        print(f"✅ Summary contains all required fields: {list(summary.keys())}")


class TestCampaignAnalytics:
    """Tests for GET /api/advertiser/analytics/campaigns endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate advertiser")
    
    def test_campaign_analytics_structure(self):
        """Test campaign analytics returns proper structure"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/campaigns",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "campaigns" in data, "Missing campaigns array"
        assert "total_campaigns" in data, "Missing total_campaigns"
        assert "by_status" in data, "Missing by_status breakdown"
        
        # Verify by_status structure
        by_status = data["by_status"]
        assert "active" in by_status, "Missing active count"
        assert "paused" in by_status, "Missing paused count"
        assert "pending" in by_status, "Missing pending count"
        assert "completed" in by_status, "Missing completed count"
        
        print(f"✅ Campaign analytics structure valid - {data['total_campaigns']} campaigns")
        print(f"   Status breakdown: {by_status}")
    
    def test_campaign_analytics_campaign_data(self):
        """Test individual campaign data structure for charts"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/campaigns",
            headers=self.headers
        )
        assert response.status_code == 200
        
        campaigns = response.json()["campaigns"]
        if len(campaigns) > 0:
            campaign = campaigns[0]
            required_fields = ["id", "name", "status", "impressions", "views", 
                            "clicks", "spent", "budget", "budget_used_percent",
                            "ctr", "view_rate", "cpv"]
            
            for field in required_fields:
                assert field in campaign, f"Campaign missing field: {field}"
            
            print(f"✅ Campaign data contains all fields needed for charts")
            print(f"   Sample campaign: {campaign['name']} - {campaign['status']}")
        else:
            print("⚠️ No campaigns to verify structure")


class TestOverviewAnalytics:
    """Tests for GET /api/advertiser/analytics/overview endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate advertiser")
    
    def test_overview_analytics(self):
        """Test overview analytics returns all stats for dashboard cards"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        required_fields = ["total_campaigns", "active_campaigns", "total_impressions",
                         "total_views", "total_clicks", "total_spent", 
                         "overall_ctr", "overall_view_rate", "avg_cost_per_view",
                         "balance", "tier"]
        
        for field in required_fields:
            assert field in data, f"Missing overview field: {field}"
        
        print(f"✅ Overview analytics contains all required fields")
        print(f"   Total impressions: {data['total_impressions']}")
        print(f"   Total views: {data['total_views']}")
        print(f"   Overall CTR: {data['overall_ctr']}%")
        print(f"   Balance: ${data['balance']}")


class TestPlacementAnalytics:
    """Tests for GET /api/advertiser/analytics/placements endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate advertiser")
    
    def test_placement_analytics(self):
        """Test placement analytics returns breakdown by ad type"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/placements",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "placements" in data, "Missing placements array"
        assert "total_ads" in data, "Missing total_ads count"
        
        print(f"✅ Placement analytics valid - {data['total_ads']} total ads")


class TestGeoAnalytics:
    """Tests for GET /api/advertiser/analytics/geo endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate advertiser")
    
    def test_geo_analytics(self):
        """Test geo analytics returns country breakdown"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/geo",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "countries" in data, "Missing countries array"
        assert "total_regions" in data, "Missing total_regions count"
        
        print(f"✅ Geo analytics valid - {data['total_regions']} regions tracked")


class TestCampaignWithGeoTargeting:
    """Tests for campaign creation with geo targeting"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/login",
            json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
        )
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
            self.advertiser = response.json()["advertiser"]
        else:
            pytest.skip("Could not authenticate advertiser")
    
    def test_get_campaigns_list(self):
        """Test getting list of campaigns"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/campaigns",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Expected campaigns list"
        
        if len(campaigns) > 0:
            campaign = campaigns[0]
            assert "id" in campaign
            assert "name" in campaign
            assert "status" in campaign
            assert "targeting" in campaign
            print(f"✅ Found {len(campaigns)} campaigns")
            print(f"   First campaign: {campaign['name']} ({campaign['status']})")
        else:
            print("⚠️ No campaigns found")
    
    def test_campaign_has_geo_targeting_field(self):
        """Test that campaigns have targeting field for geo targeting"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/campaigns",
            headers=self.headers
        )
        assert response.status_code == 200
        
        campaigns = response.json()
        if len(campaigns) > 0:
            campaign = campaigns[0]
            assert "targeting" in campaign, "Campaign missing targeting field"
            
            targeting = campaign.get("targeting", {})
            print(f"✅ Campaign targeting structure: {targeting}")
            
            # Targeting can include: countries, genres, age_range
            # These are optional so just verify the field exists
        else:
            print("⚠️ No campaigns to check targeting")
    
    def test_create_campaign_requires_balance(self):
        """Test that campaign creation checks prepay balance"""
        # This test verifies the prepay model is working
        # Account has $100 balance but $100 is already reserved
        current_balance = self.advertiser.get("balance", 0)
        
        response = requests.post(
            f"{BASE_URL}/api/advertiser/campaigns",
            headers=self.headers,
            json={
                "name": "TEST_Geo_Campaign",
                "campaign_type": "cpv",
                "budget": 500,  # More than available balance
                "start_date": "2026-02-10",
                "ad_placements": ["pre_roll"],
                "targeting": {
                    "countries": ["US", "KE", "NG"],
                    "genres": ["Drama", "Comedy"],
                    "age_range": [18, 35]
                }
            }
        )
        
        # Should fail due to insufficient balance
        if current_balance < 500:
            assert response.status_code == 402, f"Expected 402 for insufficient balance, got {response.status_code}"
            print(f"✅ Campaign creation correctly rejected - insufficient balance (${current_balance})")
        else:
            # If account has enough, campaign should be created
            assert response.status_code in [200, 201], f"Campaign creation failed: {response.text}"


class TestUnauthorizedAccess:
    """Test that analytics endpoints require authentication"""
    
    def test_daily_analytics_requires_auth(self):
        """Test daily analytics requires auth token"""
        response = requests.get(f"{BASE_URL}/api/advertiser/analytics/daily")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Daily analytics requires authentication")
    
    def test_campaign_analytics_requires_auth(self):
        """Test campaign analytics requires auth token"""
        response = requests.get(f"{BASE_URL}/api/advertiser/analytics/campaigns")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Campaign analytics requires authentication")
    
    def test_overview_analytics_requires_auth(self):
        """Test overview analytics requires auth token"""
        response = requests.get(f"{BASE_URL}/api/advertiser/analytics/overview")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Overview analytics requires authentication")
    
    def test_invalid_token_rejected(self):
        """Test that invalid token is rejected"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/analytics/daily",
            headers={"Authorization": "Bearer invalid_token_123"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✅ Invalid token correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
