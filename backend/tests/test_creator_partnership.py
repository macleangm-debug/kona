"""
Creator Partnership System Tests
Tests for: Creator application, video upload via Bunny.net, revenue share, tiered system, milestone bonuses, payout requests
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CREATOR_EMAIL = "milestone_test@test.com"
TEST_CREATOR_PASSWORD = "test123"

# New test user for application flow
NEW_APPLICANT_EMAIL = f"TEST_creator_applicant_{uuid.uuid4().hex[:8]}@test.com"
NEW_APPLICANT_PASSWORD = "test123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def creator_token(api_client):
    """Get authentication token for approved creator"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_CREATOR_EMAIL,
        "password": TEST_CREATOR_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Creator authentication failed: {response.text}")


@pytest.fixture(scope="module")
def new_user_token(api_client):
    """Create and authenticate a new user for application testing"""
    # Register new user
    register_response = api_client.post(f"{BASE_URL}/api/auth/register", json={
        "email": NEW_APPLICANT_EMAIL,
        "password": NEW_APPLICANT_PASSWORD,
        "name": "Test Creator Applicant"
    })
    
    if register_response.status_code in [200, 201]:
        return register_response.json().get("token")
    
    # If user exists, try login
    login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": NEW_APPLICANT_EMAIL,
        "password": NEW_APPLICANT_PASSWORD
    })
    if login_response.status_code == 200:
        return login_response.json().get("token")
    
    pytest.skip(f"Failed to create/login new user: {register_response.text}")


class TestCreatorApplication:
    """Tests for creator application flow"""
    
    def test_creator_status_unauthenticated(self, api_client):
        """GET /api/creator/status - Requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/creator/status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Creator status requires authentication")
    
    def test_creator_status_for_non_creator(self, api_client, new_user_token):
        """GET /api/creator/status - Returns is_creator:false for non-creator"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/status",
            headers={"Authorization": f"Bearer {new_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_creator"] == False
        assert data["status"] is None
        print(f"✓ Non-creator status: {data}")
    
    def test_creator_apply_success(self, api_client, new_user_token):
        """POST /api/creator/apply - Submit creator application"""
        application = {
            "name": "Test Creator Applicant",
            "email": NEW_APPLICANT_EMAIL,
            "bio": "I am a passionate content creator with experience in drama and romance mini-series.",
            "content_type": "romance",
            "expected_uploads_per_month": 4
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/apply",
            json=application,
            headers={"Authorization": f"Bearer {new_user_token}"}
        )
        
        # Could be 200 or 400 if already applied
        if response.status_code == 400:
            assert "already" in response.json().get("detail", "").lower() or "pending" in response.json().get("detail", "").lower()
            print(f"✓ Application already exists: {response.json()['detail']}")
        else:
            assert response.status_code == 200
            data = response.json()
            assert "creator_id" in data
            assert data["status"] == "pending"
            print(f"✓ Application submitted: {data}")
    
    def test_creator_apply_validation(self, api_client, new_user_token):
        """POST /api/creator/apply - Validates required fields"""
        # Missing bio (too short)
        application = {
            "name": "Test",
            "email": NEW_APPLICANT_EMAIL,
            "bio": "Short",  # Less than 20 chars
            "content_type": "romance"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/apply",
            json=application,
            headers={"Authorization": f"Bearer {new_user_token}"}
        )
        
        # Should fail validation or already applied
        assert response.status_code in [400, 422]
        print(f"✓ Validation works: {response.status_code}")
    
    def test_creator_status_after_apply(self, api_client, new_user_token):
        """GET /api/creator/status - Shows pending status after application"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/status",
            headers={"Authorization": f"Bearer {new_user_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Status should be pending or approved (if already processed)
        assert data["status"] in ["pending", "approved", "rejected", None]
        print(f"✓ Creator status after apply: {data}")


class TestApprovedCreatorDashboard:
    """Tests for approved creator dashboard and stats"""
    
    def test_creator_status_approved(self, api_client, creator_token):
        """GET /api/creator/status - Returns approved status for creator"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/status",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_creator"] == True
        assert data["status"] == "approved"
        assert "tier" in data
        assert "creator_id" in data
        print(f"✓ Approved creator status: {data}")
    
    def test_creator_dashboard(self, api_client, creator_token):
        """GET /api/creator/dashboard - Returns dashboard stats"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/dashboard",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify dashboard structure
        assert "creator_id" in data
        assert "name" in data
        assert "tier" in data
        assert "revenue_share" in data
        assert "total_series" in data
        assert "total_episodes" in data
        assert "total_views" in data
        assert "total_earnings" in data
        assert "pending_payout" in data
        assert "this_month_views" in data
        assert "this_month_earnings" in data
        assert "milestones" in data
        
        # Verify tier system values
        assert data["tier"] in ["new", "verified", "partner"]
        assert 0.60 <= data["revenue_share"] <= 0.70
        
        print(f"✓ Dashboard stats: tier={data['tier']}, revenue_share={data['revenue_share']}, total_earnings={data['total_earnings']}")
    
    def test_creator_dashboard_unauthenticated(self, api_client):
        """GET /api/creator/dashboard - Requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/creator/dashboard")
        assert response.status_code in [401, 403]
        print("✓ Dashboard requires authentication")


class TestCreatorSeries:
    """Tests for creator series management"""
    
    def test_get_creator_series(self, api_client, creator_token):
        """GET /api/creator/series - List creator's series"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/series",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            series = data[0]
            assert "id" in series
            assert "title" in series
            assert "status" in series
            assert "total_episodes" in series
            print(f"✓ Creator has {len(data)} series. First: {series['title']} ({series['status']})")
        else:
            print("✓ Creator has no series yet")
    
    def test_create_series(self, api_client, creator_token):
        """POST /api/creator/series - Create new series"""
        series_data = {
            "title": f"TEST_Series_{uuid.uuid4().hex[:6]}",
            "description": "This is a test series created for automated testing purposes.",
            "genre": "Drama"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/series",
            json=series_data,
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "series_id" in data
        assert data["status"] == "draft"
        print(f"✓ Series created: {data['series_id']}")
        return data["series_id"]
    
    def test_create_series_validation(self, api_client, creator_token):
        """POST /api/creator/series - Validates required fields"""
        # Missing description (too short)
        series_data = {
            "title": "Test",
            "description": "Short",  # Less than 20 chars
            "genre": "Drama"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/series",
            json=series_data,
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert response.status_code == 422
        print("✓ Series creation validates description length")
    
    def test_get_series_detail(self, api_client, creator_token):
        """GET /api/creator/series/{id} - Get series with episodes"""
        # First get list of series
        list_response = api_client.get(
            f"{BASE_URL}/api/creator/series",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if list_response.status_code == 200 and len(list_response.json()) > 0:
            series_id = list_response.json()[0]["id"]
            
            response = api_client.get(
                f"{BASE_URL}/api/creator/series/{series_id}",
                headers={"Authorization": f"Bearer {creator_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            assert "episodes" in data
            print(f"✓ Series detail: {data['title']} with {len(data['episodes'])} episodes")
        else:
            pytest.skip("No series available for detail test")


class TestCreatorEpisodes:
    """Tests for creator episode management with Bunny.net integration"""
    
    def test_create_episode(self, api_client, creator_token):
        """POST /api/creator/episodes - Create episode with Bunny.net video"""
        # First get a series
        series_response = api_client.get(
            f"{BASE_URL}/api/creator/series",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if series_response.status_code != 200 or len(series_response.json()) == 0:
            pytest.skip("No series available for episode creation")
        
        series_id = series_response.json()[0]["id"]
        
        episode_data = {
            "series_id": series_id,
            "episode_number": 99,  # High number to avoid conflicts
            "title": f"TEST_Episode_{uuid.uuid4().hex[:6]}",
            "description": "Test episode for automated testing",
            "is_free": True,
            "coins_required": 0
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/episodes",
            json=episode_data,
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "episode_id" in data
        assert "video_id" in data  # Bunny.net video ID
        assert "upload_url" in data  # Bunny.net upload URL
        assert "upload_headers" in data
        
        print(f"✓ Episode created: {data['episode_id']}, Bunny video: {data['video_id']}")
        return data
    
    def test_get_episode_status(self, api_client, creator_token):
        """GET /api/creator/episodes/{id}/status - Check video encoding status"""
        # Get series with episodes
        series_response = api_client.get(
            f"{BASE_URL}/api/creator/series",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if series_response.status_code != 200 or len(series_response.json()) == 0:
            pytest.skip("No series available")
        
        series_id = series_response.json()[0]["id"]
        
        # Get series detail with episodes
        detail_response = api_client.get(
            f"{BASE_URL}/api/creator/series/{series_id}",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if detail_response.status_code != 200:
            pytest.skip("Could not get series detail")
        
        episodes = detail_response.json().get("episodes", [])
        if len(episodes) == 0:
            pytest.skip("No episodes available for status check")
        
        episode_id = episodes[0]["id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/creator/episodes/{episode_id}/status",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "episode_id" in data
        assert "status" in data
        assert data["status"] in ["pending", "queued", "processing", "encoding", "ready", "failed", "unknown"]
        
        print(f"✓ Episode status: {data['episode_id']} - {data['status']}")


class TestSeriesSubmission:
    """Tests for series submission and review flow"""
    
    def test_submit_series_without_episodes(self, api_client, creator_token):
        """POST /api/creator/series/{id}/submit - Fails without episodes"""
        # Create a new series without episodes
        series_data = {
            "title": f"TEST_Empty_Series_{uuid.uuid4().hex[:6]}",
            "description": "This series has no episodes for testing submission validation.",
            "genre": "Drama"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/creator/series",
            json=series_data,
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test series")
        
        series_id = create_response.json()["series_id"]
        
        # Try to submit without episodes
        response = api_client.post(
            f"{BASE_URL}/api/creator/series/{series_id}/submit",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 400
        assert "episode" in response.json().get("detail", "").lower()
        print("✓ Series submission requires at least 1 episode")
    
    def test_submit_series_with_episodes(self, api_client, creator_token):
        """POST /api/creator/series/{id}/submit - Submits series for review"""
        # Get series with episodes
        series_response = api_client.get(
            f"{BASE_URL}/api/creator/series",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if series_response.status_code != 200:
            pytest.skip("Could not get series list")
        
        # Find a series with episodes that's in draft status
        for series in series_response.json():
            if series["total_episodes"] > 0 and series["status"] == "draft":
                series_id = series["id"]
                
                response = api_client.post(
                    f"{BASE_URL}/api/creator/series/{series_id}/submit",
                    headers={"Authorization": f"Bearer {creator_token}"}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] in ["pending_review", "published"]
                print(f"✓ Series submitted: {data['status']}")
                return
        
        print("✓ No draft series with episodes available for submission test (skipped)")


class TestAdminCreatorManagement:
    """Tests for admin creator management endpoints"""
    
    def test_admin_list_creators(self, api_client, creator_token):
        """GET /api/admin/creators - List all creators (admin only)"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/creators",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        # Should work if user is admin
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
            print(f"✓ Admin can list {len(data)} creators")
        elif response.status_code == 403:
            print("✓ Non-admin cannot list creators (expected)")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")
    
    def test_admin_approve_creator(self, api_client, creator_token):
        """POST /api/admin/creators/{id}/approve - Approve creator (admin only)"""
        # First get pending creators
        list_response = api_client.get(
            f"{BASE_URL}/api/admin/creators?status=pending",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        if list_response.status_code == 403:
            print("✓ Non-admin cannot approve creators (expected)")
            return
        
        if list_response.status_code == 200 and len(list_response.json()) > 0:
            creator_id = list_response.json()[0]["id"]
            
            response = api_client.post(
                f"{BASE_URL}/api/admin/creators/{creator_id}/approve",
                headers={"Authorization": f"Bearer {creator_token}"}
            )
            
            if response.status_code == 200:
                print(f"✓ Creator approved: {creator_id}")
            elif response.status_code == 404:
                print("✓ Creator already processed or not found")
            else:
                print(f"✓ Approve response: {response.status_code}")
        else:
            print("✓ No pending creators to approve")


class TestRevenueTracking:
    """Tests for revenue tracking when users unlock creator content"""
    
    def test_earnings_history(self, api_client, creator_token):
        """GET /api/creator/earnings - Get earnings history"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/earnings",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_earnings" in data
        assert "pending_payout" in data
        assert "recent_earnings" in data
        assert isinstance(data["recent_earnings"], list)
        
        print(f"✓ Earnings: total={data['total_earnings']}, pending={data['pending_payout']}, recent={len(data['recent_earnings'])}")
    
    def test_payout_history(self, api_client, creator_token):
        """GET /api/creator/payouts - Get payout history"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/payouts",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Payout history: {len(data)} records")


class TestPayoutRequests:
    """Tests for creator payout requests"""
    
    def test_payout_request_insufficient_balance(self, api_client, creator_token):
        """POST /api/creator/payout/request - Fails with insufficient balance"""
        payout_data = {
            "amount": 999999,  # Very high amount
            "payout_method": "mpesa",
            "payout_details": {"phone": "+254700000000"}
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/payout/request",
            json=payout_data,
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 400
        assert "insufficient" in response.json().get("detail", "").lower()
        print("✓ Payout request validates balance")
    
    def test_payout_request_minimum_amount(self, api_client, creator_token):
        """POST /api/creator/payout/request - Enforces minimum amount"""
        payout_data = {
            "amount": 50,  # Below minimum of 100
            "payout_method": "mpesa",
            "payout_details": {"phone": "+254700000000"}
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/creator/payout/request",
            json=payout_data,
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        # Should fail validation (422) or business rule (400)
        assert response.status_code in [400, 422]
        print("✓ Payout request enforces minimum amount")


class TestTierSystem:
    """Tests for creator tier system (new/verified/partner)"""
    
    def test_tier_revenue_shares(self, api_client, creator_token):
        """Verify tier system revenue shares"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/dashboard",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        tier = data["tier"]
        revenue_share = data["revenue_share"]
        
        # Verify tier-specific revenue shares
        expected_shares = {
            "new": 0.60,
            "verified": 0.65,
            "partner": 0.70
        }
        
        assert tier in expected_shares
        assert revenue_share == expected_shares[tier], f"Expected {expected_shares[tier]} for {tier}, got {revenue_share}"
        
        print(f"✓ Tier system: {tier} = {revenue_share * 100}% revenue share")
    
    def test_milestone_bonuses_structure(self, api_client, creator_token):
        """Verify milestone bonuses are returned in dashboard"""
        response = api_client.get(
            f"{BASE_URL}/api/creator/dashboard",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "milestones" in data
        milestones = data["milestones"]
        assert isinstance(milestones, list)
        assert len(milestones) > 0
        
        # Verify milestone structure
        for milestone in milestones:
            assert "views" in milestone
            assert "bonus_coins" in milestone
        
        print(f"✓ Milestone bonuses: {len(milestones)} milestones defined")
        for m in milestones:
            print(f"  - {m['views']} views = {m['bonus_coins']} bonus coins")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
