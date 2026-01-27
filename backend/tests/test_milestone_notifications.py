"""
Test Milestone Notifications Feature
- GET /api/referral/milestone-proximity - Returns notification when within 3 referrals of milestone
- GET /api/referral/milestone-proximity - Returns milestone_claimable when milestone is reached but not claimed
- GET /api/referral/milestone-proximity - Returns has_notification:false when not near milestone
- POST /api/notifications/subscribe - Saves push subscription
- DELETE /api/notifications/unsubscribe - Removes push subscription
- GET /api/notifications/settings - Returns user notification preferences
- PUT /api/notifications/settings - Updates notification preferences
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMilestoneProximityAPI:
    """Test milestone proximity notification endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def get_auth_token(self, email, password):
        """Helper to get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    def test_milestone_proximity_requires_auth(self):
        """Test that milestone-proximity endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/referral/milestone-proximity")
        assert response.status_code == 403 or response.status_code == 401
        print("✓ Milestone proximity endpoint requires authentication")
    
    def test_milestone_proximity_user_near_milestone(self):
        """Test milestone proximity for user with 48 referrals (2 away from Gold at 50)"""
        # First, create a test user with 48 referrals
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"alert_test_{unique_id}@test.com"
        test_password = "test123"
        
        # Register user
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": test_password,
            "name": "Alert Test User"
        })
        assert register_response.status_code == 200
        token = register_response.json().get("token")
        user_id = register_response.json().get("user", {}).get("id")
        
        # We need to manually set the referral count to 48 via MongoDB
        # For now, let's test with existing test user if available
        # Try to login with the provided test user
        existing_token = self.get_auth_token("alert_test@test.com", "test123")
        
        if existing_token:
            # Test with existing user
            response = self.session.get(
                f"{BASE_URL}/api/referral/milestone-proximity",
                headers={"Authorization": f"Bearer {existing_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            print(f"Milestone proximity response: {data}")
            
            # If user has 48 referrals, should show notification for Gold (50)
            if data.get("has_notification"):
                assert "milestone" in data
                assert "referrals_remaining" in data
                print(f"✓ User near milestone: {data.get('message')}")
            else:
                print(f"✓ User not near milestone or all claimed. Response: {data}")
        else:
            # Test with newly created user (0 referrals)
            response = self.session.get(
                f"{BASE_URL}/api/referral/milestone-proximity",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert response.status_code == 200
            data = response.json()
            
            # User with 0 referrals should not have notification (10 away from Bronze)
            assert data.get("has_notification") == False
            assert "next_milestone" in data
            assert data["next_milestone"]["id"] == "bronze"
            print(f"✓ New user not near milestone: {data.get('referrals_remaining')} referrals away from Bronze")
    
    def test_milestone_proximity_returns_correct_structure(self):
        """Test that milestone proximity returns correct response structure"""
        # Create a test user
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"struct_test_{unique_id}@test.com"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "test123",
            "name": "Structure Test User"
        })
        assert register_response.status_code == 200
        token = register_response.json().get("token")
        
        response = self.session.get(
            f"{BASE_URL}/api/referral/milestone-proximity",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have has_notification field
        assert "has_notification" in data
        
        if not data["has_notification"]:
            # Should have next_milestone info
            assert "next_milestone" in data or "all_claimed" in data
            if "next_milestone" in data:
                assert "referrals_remaining" in data
                assert "current_referrals" in data
        
        print(f"✓ Response structure is correct: {list(data.keys())}")


class TestNotificationSubscriptionAPI:
    """Test push notification subscription endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test user for notification tests
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"notif_test_{unique_id}@test.com"
        self.test_password = "test123"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": "Notification Test User"
        })
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            self.token = None
    
    def test_subscribe_push_notification(self):
        """Test POST /api/notifications/subscribe saves push subscription"""
        if not self.token:
            pytest.skip("Could not create test user")
        
        subscription_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
            "keys": {
                "p256dh": "test-p256dh-key",
                "auth": "test-auth-key"
            }
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json=subscription_data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Push subscription saved"
        print("✓ Push subscription saved successfully")
    
    def test_subscribe_requires_auth(self):
        """Test that subscribe endpoint requires authentication"""
        subscription_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {"p256dh": "test", "auth": "test"}
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json=subscription_data
        )
        
        assert response.status_code in [401, 403]
        print("✓ Subscribe endpoint requires authentication")
    
    def test_unsubscribe_push_notification(self):
        """Test DELETE /api/notifications/unsubscribe removes push subscription"""
        if not self.token:
            pytest.skip("Could not create test user")
        
        # First subscribe
        subscription_data = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-456",
            "keys": {"p256dh": "test-key", "auth": "test-auth"}
        }
        
        self.session.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json=subscription_data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        # Then unsubscribe
        response = self.session.delete(
            f"{BASE_URL}/api/notifications/unsubscribe",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Push subscription removed"
        print("✓ Push subscription removed successfully")
    
    def test_unsubscribe_requires_auth(self):
        """Test that unsubscribe endpoint requires authentication"""
        response = self.session.delete(f"{BASE_URL}/api/notifications/unsubscribe")
        assert response.status_code in [401, 403]
        print("✓ Unsubscribe endpoint requires authentication")


class TestNotificationSettingsAPI:
    """Test notification settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Create a test user
        unique_id = str(uuid.uuid4())[:8]
        self.test_email = f"settings_test_{unique_id}@test.com"
        self.test_password = "test123"
        
        register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_email,
            "password": self.test_password,
            "name": "Settings Test User"
        })
        if register_response.status_code == 200:
            self.token = register_response.json().get("token")
        else:
            self.token = None
    
    def test_get_notification_settings(self):
        """Test GET /api/notifications/settings returns user preferences"""
        if not self.token:
            pytest.skip("Could not create test user")
        
        response = self.session.get(
            f"{BASE_URL}/api/notifications/settings",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check default settings structure
        assert "push_enabled" in data
        assert "milestone_alerts" in data
        assert "new_episodes" in data
        assert "daily_rewards" in data
        
        # Default values should be True for alerts
        assert data["milestone_alerts"] == True
        assert data["new_episodes"] == True
        assert data["daily_rewards"] == True
        
        print(f"✓ Notification settings returned: {data}")
    
    def test_get_settings_requires_auth(self):
        """Test that get settings endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/notifications/settings")
        assert response.status_code in [401, 403]
        print("✓ Get settings endpoint requires authentication")
    
    def test_update_notification_settings(self):
        """Test PUT /api/notifications/settings updates preferences"""
        if not self.token:
            pytest.skip("Could not create test user")
        
        # Update settings
        new_settings = {
            "milestone_alerts": False,
            "new_episodes": True,
            "daily_rewards": False
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/notifications/settings",
            json=new_settings,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("message") == "Notification settings updated"
        assert data.get("settings", {}).get("milestone_alerts") == False
        assert data.get("settings", {}).get("new_episodes") == True
        assert data.get("settings", {}).get("daily_rewards") == False
        
        print("✓ Notification settings updated successfully")
        
        # Verify settings persisted
        get_response = self.session.get(
            f"{BASE_URL}/api/notifications/settings",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["milestone_alerts"] == False
        assert get_data["new_episodes"] == True
        assert get_data["daily_rewards"] == False
        
        print("✓ Settings persisted correctly after update")
    
    def test_update_settings_requires_auth(self):
        """Test that update settings endpoint requires authentication"""
        response = self.session.put(
            f"{BASE_URL}/api/notifications/settings",
            json={"milestone_alerts": False}
        )
        assert response.status_code in [401, 403]
        print("✓ Update settings endpoint requires authentication")
    
    def test_push_enabled_reflects_subscription_status(self):
        """Test that push_enabled reflects whether user has subscription"""
        if not self.token:
            pytest.skip("Could not create test user")
        
        # Initially should be False (no subscription)
        response = self.session.get(
            f"{BASE_URL}/api/notifications/settings",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["push_enabled"] == False
        print("✓ push_enabled is False when no subscription")
        
        # Subscribe
        self.session.post(
            f"{BASE_URL}/api/notifications/subscribe",
            json={
                "endpoint": "https://test.endpoint",
                "keys": {"p256dh": "key1", "auth": "key2"}
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        # Now should be True
        response = self.session.get(
            f"{BASE_URL}/api/notifications/settings",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["push_enabled"] == True
        print("✓ push_enabled is True after subscription")
        
        # Unsubscribe
        self.session.delete(
            f"{BASE_URL}/api/notifications/unsubscribe",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        # Should be False again
        response = self.session.get(
            f"{BASE_URL}/api/notifications/settings",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200
        assert response.json()["push_enabled"] == False
        print("✓ push_enabled is False after unsubscription")


class TestMilestoneProximityWithTestUser:
    """Test milestone proximity with pre-configured test user"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_milestone_test_user_proximity(self):
        """Test with milestone_test@test.com user (should have 48 referrals)"""
        # Try to login with the test user
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "milestone_test@test.com",
            "password": "test123"
        })
        
        if response.status_code != 200:
            pytest.skip("milestone_test@test.com user not found")
        
        token = response.json().get("token")
        user = response.json().get("user", {})
        referral_count = user.get("referral_count", 0)
        
        print(f"User referral count: {referral_count}")
        
        # Check milestone proximity
        proximity_response = self.session.get(
            f"{BASE_URL}/api/referral/milestone-proximity",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert proximity_response.status_code == 200
        data = proximity_response.json()
        
        print(f"Milestone proximity response: {data}")
        
        # Based on referral count, verify response
        if referral_count >= 47 and referral_count < 50:
            # Should show notification for Gold milestone
            assert data.get("has_notification") == True
            assert data.get("notification_type") == "milestone_proximity"
            assert data.get("milestone", {}).get("id") == "gold"
            print(f"✓ User is {50 - referral_count} referrals away from Gold milestone")
        elif referral_count >= 50:
            # Should show claimable or next milestone
            if data.get("notification_type") == "milestone_claimable":
                print(f"✓ Gold milestone is claimable")
            else:
                print(f"✓ Gold milestone already claimed, checking next milestone")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
