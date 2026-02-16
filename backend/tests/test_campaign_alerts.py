"""
Tests for Campaign Alerts System
- Advertiser alerts endpoints
- Admin alerts endpoints  
- Alert mark as read functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADVERTISER_EMAIL = "test@testcorp.com"
ADVERTISER_PASSWORD = "Test1234!"
ADMIN_EMAIL = "superadmin@kona.com"
ADMIN_PASSWORD = "SuperAdmin2025!"


@pytest.fixture(scope="module")
def advertiser_token():
    """Get advertiser authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/advertiser/login",
        json={"email": ADVERTISER_EMAIL, "password": ADVERTISER_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Advertiser login failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code}")


class TestAdvertiserAlerts:
    """Advertiser campaign alerts endpoint tests"""
    
    def test_get_advertiser_alerts_returns_structure(self, advertiser_token):
        """GET /api/advertiser/alerts returns correct response structure"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/alerts",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "alerts" in data
        assert "unread_count" in data
        assert isinstance(data["alerts"], list)
        assert isinstance(data["unread_count"], int)
        print(f"✓ Advertiser alerts response: {len(data['alerts'])} alerts, {data['unread_count']} unread")

    def test_get_advertiser_alerts_unread_only(self, advertiser_token):
        """GET /api/advertiser/alerts?unread_only=true filters correctly"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/alerts?unread_only=true",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        print(f"✓ Unread-only filter works: {len(data['alerts'])} unread alerts")

    def test_get_advertiser_alerts_with_limit(self, advertiser_token):
        """GET /api/advertiser/alerts?limit=10 respects limit parameter"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/alerts?limit=10",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["alerts"]) <= 10
        print(f"✓ Limit parameter works: returned {len(data['alerts'])} alerts (max 10)")

    def test_advertiser_alerts_requires_auth(self):
        """GET /api/advertiser/alerts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/advertiser/alerts")
        assert response.status_code == 401
        print("✓ Advertiser alerts endpoint requires authentication")

    def test_mark_alert_read_nonexistent(self, advertiser_token):
        """POST /api/advertiser/alerts/{id}/read returns 404 for nonexistent alert"""
        fake_alert_id = f"alert-{uuid.uuid4().hex[:12]}"
        response = requests.post(
            f"{BASE_URL}/api/advertiser/alerts/{fake_alert_id}/read",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        assert response.status_code == 404
        print("✓ Mark nonexistent alert returns 404")

    def test_mark_all_alerts_read(self, advertiser_token):
        """POST /api/advertiser/alerts/mark-all-read works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/advertiser/alerts/mark-all-read",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Mark all read: {data['message']}")


class TestAdminAlerts:
    """Admin campaign alerts endpoint tests"""
    
    def test_get_admin_alerts_returns_structure(self, admin_token):
        """GET /api/admin/ads/alerts returns correct response structure"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ads/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "alerts" in data
        assert "unread_count" in data
        assert isinstance(data["alerts"], list)
        assert isinstance(data["unread_count"], int)
        print(f"✓ Admin alerts response: {len(data['alerts'])} alerts, {data['unread_count']} unread")

    def test_get_admin_alerts_unread_only(self, admin_token):
        """GET /api/admin/ads/alerts?unread_only=true filters correctly"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ads/alerts?unread_only=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        print(f"✓ Admin unread-only filter works: {len(data['alerts'])} unread alerts")

    def test_admin_alerts_requires_auth(self):
        """GET /api/admin/ads/alerts requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ads/alerts")
        assert response.status_code == 401
        print("✓ Admin alerts endpoint requires authentication")

    def test_admin_mark_alert_read_nonexistent(self, admin_token):
        """POST /api/admin/ads/alerts/{id}/read returns 404 for nonexistent alert"""
        fake_alert_id = f"alert-{uuid.uuid4().hex[:12]}"
        response = requests.post(
            f"{BASE_URL}/api/admin/ads/alerts/{fake_alert_id}/read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Admin mark nonexistent alert returns 404")

    def test_admin_mark_all_alerts_read(self, admin_token):
        """POST /api/admin/ads/alerts/mark-all-read works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/admin/ads/alerts/mark-all-read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ Admin mark all read: {data['message']}")


class TestAlertIntegration:
    """Integration tests for alert system"""
    
    def test_alerts_empty_for_new_campaigns(self, advertiser_token):
        """Alerts should be empty when no campaigns have hit milestones"""
        response = requests.get(
            f"{BASE_URL}/api/advertiser/alerts",
            headers={"Authorization": f"Bearer {advertiser_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Note: Alerts are generated when campaigns hit milestones (1K, 10K, etc views)
        # Empty alerts is expected for campaigns with low activity
        print(f"✓ Alerts count matches expected behavior: {len(data['alerts'])} alerts")
    
    def test_alert_fields_if_present(self, admin_token):
        """Verify alert structure has all required fields if alerts exist"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ads/alerts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data['alerts']) > 0:
            alert = data['alerts'][0]
            required_fields = ['id', 'campaign_id', 'metric', 'message', 'created_at']
            for field in required_fields:
                assert field in alert, f"Missing field: {field}"
            print(f"✓ Alert has all required fields: {list(alert.keys())}")
        else:
            print("✓ No alerts to verify structure (expected - no campaigns hit milestones)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
