"""
Test Suite for Creator Payout History & Notification System
Features tested:
- GET /api/creator/payouts - Payout history with summary
- POST /api/creator/payout/request - Request payout
- GET /api/notifications/list - List notifications
- POST /api/notifications/mark-read/{id} - Mark single notification as read
- POST /api/notifications/mark-all-read - Mark all as read
- DELETE /api/notifications/{id} - Delete notification
- DELETE /api/notifications/clear-all - Clear all notifications
- GET /api/notifications/unread-count - Get unread count
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Test credentials
TEST_EMAIL = "demo@kona.com"
TEST_PASSWORD = "Demo123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo creator"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Create auth headers"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestCreatorPayouts:
    """Tests for Payout History & Request endpoints"""
    
    def test_get_payouts_returns_list_and_summary(self, auth_headers):
        """GET /api/creator/payouts returns payouts list with summary"""
        response = requests.get(
            f"{BASE_URL}/api/creator/payouts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "payouts" in data, "Response should have 'payouts' key"
        assert "summary" in data, "Response should have 'summary' key"
        assert isinstance(data["payouts"], list), "payouts should be a list"
        
        # Verify summary structure
        summary = data["summary"]
        assert "available_balance" in summary, "Summary should have available_balance"
        assert "total_completed" in summary, "Summary should have total_completed"
        assert "total_pending" in summary, "Summary should have total_pending"
        assert "total_requested" in summary, "Summary should have total_requested"
        print(f"✓ Payouts summary: available={summary['available_balance']}, pending={summary['total_pending']}")
    
    def test_get_payouts_with_status_filter(self, auth_headers):
        """GET /api/creator/payouts?status=pending filters by status"""
        response = requests.get(
            f"{BASE_URL}/api/creator/payouts?status=pending",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "payouts" in data
        # All payouts should be pending
        for payout in data["payouts"]:
            assert payout["status"] == "pending", f"Expected pending status, got {payout['status']}"
        print(f"✓ Status filter works, {len(data['payouts'])} pending payouts")
    
    def test_request_payout_fails_with_insufficient_balance(self, auth_headers):
        """POST /api/creator/payout/request fails when balance is insufficient"""
        # Demo user has 0 balance, so any request should fail
        response = requests.post(
            f"{BASE_URL}/api/creator/payout/request",
            headers=auth_headers,
            json={
                "amount": 100,
                "payout_method": "mpesa",
                "payout_details": "+254712345678"
            }
        )
        # Should fail due to insufficient balance
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "Insufficient balance" in response.json().get("detail", "") or "balance" in response.json().get("detail", "").lower()
        print("✓ Payout request correctly rejected for insufficient balance")
    
    def test_request_payout_fails_with_low_amount(self, auth_headers):
        """POST /api/creator/payout/request fails when amount < 100"""
        response = requests.post(
            f"{BASE_URL}/api/creator/payout/request",
            headers=auth_headers,
            json={
                "amount": 50,  # Below minimum
                "payout_method": "mpesa",
                "payout_details": "+254712345678"
            }
        )
        assert response.status_code == 400
        detail = response.json().get("detail", "")
        assert "100" in detail or "minimum" in detail.lower()
        print("✓ Payout request correctly rejected for amount below minimum")
    
    def test_get_payouts_unauthenticated_fails(self):
        """GET /api/creator/payouts without auth returns 401/403"""
        response = requests.get(f"{BASE_URL}/api/creator/payouts")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated access correctly blocked")


class TestNotifications:
    """Tests for Notification System endpoints"""
    
    def test_get_notifications_list(self, auth_headers):
        """GET /api/notifications/list returns notifications"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "notifications" in data, "Response should have 'notifications' key"
        assert "unread_count" in data, "Response should have 'unread_count' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["notifications"], list)
        print(f"✓ Got {data['total']} notifications, {data['unread_count']} unread")
    
    def test_get_notifications_unread_only(self, auth_headers):
        """GET /api/notifications/list?unread_only=true filters unread"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/list?unread_only=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # All returned notifications should be unread
        for notif in data["notifications"]:
            assert notif.get("read") == False, f"Expected unread notification"
        print(f"✓ Unread filter works, {len(data['notifications'])} unread notifications")
    
    def test_get_unread_count(self, auth_headers):
        """GET /api/notifications/unread-count returns count"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
        print(f"✓ Unread count: {data['unread_count']}")
    
    def test_seed_sample_notifications(self, auth_headers):
        """POST /api/notifications/seed-sample creates test notifications"""
        response = requests.post(
            f"{BASE_URL}/api/notifications/seed-sample",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "Created" in data.get("message", "")
        print(f"✓ {data.get('message')}")
    
    def test_mark_notification_as_read(self, auth_headers):
        """POST /api/notifications/mark-read/{id} marks as read"""
        # First get a notification
        list_response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        
        notifications = list_response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications to test")
        
        # Get first unread notification
        unread = [n for n in notifications if not n.get("read")]
        if not unread:
            print("✓ No unread notifications to mark (all already read)")
            return
        
        notif_id = unread[0]["id"]
        
        # Mark as read
        mark_response = requests.post(
            f"{BASE_URL}/api/notifications/mark-read/{notif_id}",
            headers=auth_headers
        )
        assert mark_response.status_code == 200
        
        # Verify it was marked
        verify_response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        updated_notifications = verify_response.json().get("notifications", [])
        marked_notif = next((n for n in updated_notifications if n["id"] == notif_id), None)
        assert marked_notif and marked_notif.get("read") == True
        print(f"✓ Notification {notif_id} marked as read")
    
    def test_mark_all_read(self, auth_headers):
        """POST /api/notifications/mark-all-read marks all as read"""
        # First seed some fresh notifications
        requests.post(f"{BASE_URL}/api/notifications/seed-sample", headers=auth_headers)
        
        # Mark all as read
        response = requests.post(
            f"{BASE_URL}/api/notifications/mark-all-read",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "Marked" in response.json().get("message", "")
        
        # Verify unread count is 0
        count_response = requests.get(
            f"{BASE_URL}/api/notifications/unread-count",
            headers=auth_headers
        )
        assert count_response.json().get("unread_count") == 0
        print("✓ All notifications marked as read")
    
    def test_delete_notification(self, auth_headers):
        """DELETE /api/notifications/{id} deletes a notification"""
        # Seed fresh notifications first
        requests.post(f"{BASE_URL}/api/notifications/seed-sample", headers=auth_headers)
        
        # Get a notification to delete
        list_response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        notifications = list_response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications to delete")
        
        notif_id = notifications[0]["id"]
        initial_count = len(notifications)
        
        # Delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/notifications/{notif_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200
        
        # Verify it's gone
        verify_response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        new_count = len(verify_response.json().get("notifications", []))
        assert new_count == initial_count - 1
        print(f"✓ Notification {notif_id} deleted successfully")
    
    def test_clear_all_notifications(self, auth_headers):
        """DELETE /api/notifications/clear-all clears all"""
        # First seed some notifications
        requests.post(f"{BASE_URL}/api/notifications/seed-sample", headers=auth_headers)
        
        # Clear all
        response = requests.delete(
            f"{BASE_URL}/api/notifications/clear-all",
            headers=auth_headers
        )
        assert response.status_code == 200
        assert "Deleted" in response.json().get("message", "")
        
        # Verify empty
        list_response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        assert len(list_response.json().get("notifications", [])) == 0
        print("✓ All notifications cleared")
    
    def test_notifications_unauthenticated_fails(self):
        """Notification endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/notifications/list")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated access correctly blocked")


class TestEmailQueue:
    """Tests for Email Queue (mocked) endpoint"""
    
    def test_get_email_queue(self, auth_headers):
        """GET /api/notifications/email-queue returns queued emails"""
        response = requests.get(
            f"{BASE_URL}/api/notifications/email-queue",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "emails" in data
        assert "note" in data, "Should have note about email service being pending"
        print(f"✓ Email queue: {len(data['emails'])} emails, note: {data['note'][:50]}...")


class TestNotificationStructure:
    """Tests for notification data structure"""
    
    def test_notification_has_required_fields(self, auth_headers):
        """Notifications have all required fields"""
        # Seed fresh notifications
        requests.post(f"{BASE_URL}/api/notifications/seed-sample", headers=auth_headers)
        
        response = requests.get(
            f"{BASE_URL}/api/notifications/list",
            headers=auth_headers
        )
        
        notifications = response.json().get("notifications", [])
        if not notifications:
            pytest.skip("No notifications to check structure")
        
        required_fields = ["id", "type", "title", "message", "read", "created_at"]
        for notif in notifications[:3]:  # Check first 3
            for field in required_fields:
                assert field in notif, f"Notification missing required field: {field}"
        
        print(f"✓ Notification structure verified with fields: {required_fields}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
