"""
Test file for Creator Portal New Features: Merchandise, Sponsorships, Trailers
These tests verify the backend APIs for the 3 new creator portal tabs.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "superadmin@kona.com"
TEST_PASSWORD = "SuperAdmin2025!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for superadmin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


# ==================== MERCHANDISE API TESTS ====================

class TestMerchandiseAPIs:
    """Tests for Merchandise Store feature"""
    
    def test_get_my_merchandise_items(self, headers):
        """Test GET /api/merchandise/items/my - should return creator's merchandise items"""
        response = requests.get(f"{BASE_URL}/api/merchandise/items/my", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        print(f"Found {len(data['items'])} merchandise items")
    
    def test_get_merchandise_analytics(self, headers):
        """Test GET /api/merchandise/analytics - should return merchandise analytics"""
        response = requests.get(f"{BASE_URL}/api/merchandise/analytics", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_items" in data
        assert "total_orders" in data
        assert "total_revenue_coins" in data
        assert "total_items_sold" in data
        print(f"Merchandise Analytics: {data['total_items']} items, {data['total_orders']} orders")
    
    def test_get_pending_orders(self, headers):
        """Test GET /api/merchandise/orders/creator/pending - should return pending orders"""
        response = requests.get(f"{BASE_URL}/api/merchandise/orders/creator/pending", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        print(f"Found {len(data['orders'])} pending orders")


# ==================== SPONSORSHIP API TESTS ====================

class TestSponsorshipAPIs:
    """Tests for Sponsorship Marketplace feature"""
    
    def test_browse_campaigns(self):
        """Test GET /api/sponsorship/campaigns/browse - should return active campaigns (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/sponsorship/campaigns/browse")
        assert response.status_code == 200
        
        data = response.json()
        assert "campaigns" in data
        assert isinstance(data["campaigns"], list)
        print(f"Found {len(data['campaigns'])} active campaigns")
    
    def test_get_my_applications(self, headers):
        """Test GET /api/sponsorship/applications/my - should return creator's applications"""
        response = requests.get(f"{BASE_URL}/api/sponsorship/applications/my", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "applications" in data
        assert isinstance(data["applications"], list)
        print(f"Found {len(data['applications'])} applications")
    
    def test_get_received_outreach(self, headers):
        """Test GET /api/sponsorship/outreach/received - should return brand outreach"""
        response = requests.get(f"{BASE_URL}/api/sponsorship/outreach/received", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "outreach" in data
        assert isinstance(data["outreach"], list)
        print(f"Found {len(data['outreach'])} outreach messages")
    
    def test_get_creator_sponsorship_analytics(self, headers):
        """Test GET /api/sponsorship/analytics/creator - should return sponsorship analytics"""
        response = requests.get(f"{BASE_URL}/api/sponsorship/analytics/creator", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "applications" in data
        assert "total_earnings_coins" in data
        print(f"Sponsorship Analytics: {data['applications'].get('total', 0)} applications")


# ==================== TRAILERS API TESTS ====================

class TestTrailersAPIs:
    """Tests for Trailer Creator feature"""
    
    def test_get_my_trailers(self, headers):
        """Test GET /api/trailers/my - should return creator's trailer projects"""
        response = requests.get(f"{BASE_URL}/api/trailers/my", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "trailers" in data
        assert isinstance(data["trailers"], list)
        print(f"Found {len(data['trailers'])} trailer projects")
    
    def test_get_music_library(self):
        """Test GET /api/trailers/music/library - should return available music tracks (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/trailers/music/library")
        assert response.status_code == 200
        
        data = response.json()
        assert "tracks" in data
        assert isinstance(data["tracks"], list)
        print(f"Found {len(data['tracks'])} music tracks in library")


# ==================== EXISTING TAB API TESTS ====================

class TestExistingCreatorTabs:
    """Tests for existing creator tabs: Earnings, Scheduler, Milestones"""
    
    def test_get_earnings_realtime(self, headers):
        """Test GET /api/creator/earnings/realtime - should return real-time earnings data"""
        response = requests.get(f"{BASE_URL}/api/creator/earnings/realtime", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "today" in data
        assert "this_week" in data
        assert "this_month" in data
        print(f"Earnings: Today={data['today']}, Week={data['this_week']}, Month={data['this_month']}")
    
    def test_get_schedules(self, headers):
        """Test GET /api/creator/schedules - should return scheduled episodes"""
        response = requests.get(f"{BASE_URL}/api/creator/schedules", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "schedules" in data
        assert isinstance(data["schedules"], list)
        print(f"Found {len(data['schedules'])} scheduled episodes")
    
    def test_get_milestones(self, headers):
        """Test GET /api/creator/milestones - should return milestones and progress"""
        response = requests.get(f"{BASE_URL}/api/creator/milestones", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "milestones" in data
        assert "progress" in data
        print(f"Found {len(data['milestones'])} milestones")


# ==================== CREATOR STATUS TEST ====================

class TestCreatorStatus:
    """Test creator status and dashboard"""
    
    def test_get_creator_status(self, headers):
        """Test GET /api/creator/status - user should be an approved creator"""
        response = requests.get(f"{BASE_URL}/api/creator/status", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "is_creator" in data
        assert data["is_creator"] == True, "User should be an approved creator"
        print(f"Creator status: is_creator={data['is_creator']}")
    
    def test_get_creator_dashboard(self, headers):
        """Test GET /api/creator/dashboard - should return dashboard data"""
        response = requests.get(f"{BASE_URL}/api/creator/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total_views" in data
        assert "total_earnings" in data
        print(f"Dashboard: Views={data['total_views']}, Earnings={data['total_earnings']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
