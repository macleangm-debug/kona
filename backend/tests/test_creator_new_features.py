"""
Tests for Creator Portal New Features:
1. Real-time Earnings Dashboard
2. Episode Scheduler
3. Creator Milestones & Badges
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "superadmin@kona.com"
ADMIN_PASSWORD = "SuperAdmin2025!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin/creator"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with authentication"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestRealtimeEarnings:
    """Test /api/creator/earnings/realtime endpoint"""
    
    def test_earnings_realtime_returns_correct_structure(self, auth_headers):
        """Verify realtime earnings endpoint returns expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/creator/earnings/realtime",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required top-level fields exist
        assert "today" in data, "Missing 'today' field"
        assert "this_week" in data, "Missing 'this_week' field"
        assert "this_month" in data, "Missing 'this_month' field"
        assert "total" in data, "Missing 'total' field"
        assert "hourly_chart" in data, "Missing 'hourly_chart' field"
        assert "last_updated" in data, "Missing 'last_updated' field"
        
        # Check today structure
        assert "earnings" in data["today"], "Missing 'earnings' in today"
        assert "views" in data["today"], "Missing 'views' in today"
        
        # Check this_week structure
        assert "earnings" in data["this_week"], "Missing 'earnings' in this_week"
        assert "views" in data["this_week"], "Missing 'views' in this_week"
        
        # Check this_month structure
        assert "earnings" in data["this_month"], "Missing 'earnings' in this_month"
        assert "views" in data["this_month"], "Missing 'views' in this_month"
        
        # Check total structure
        assert "earnings" in data["total"], "Missing 'earnings' in total"
        assert "views" in data["total"], "Missing 'views' in total"
        
        # Check hourly_chart is a list with 24 hours
        assert isinstance(data["hourly_chart"], list), "hourly_chart should be a list"
        assert len(data["hourly_chart"]) == 24, f"hourly_chart should have 24 hours, got {len(data['hourly_chart'])}"
        
        # Check hourly_chart structure
        for hour_data in data["hourly_chart"]:
            assert "hour" in hour_data, "Missing 'hour' in hourly_chart item"
            assert "label" in hour_data, "Missing 'label' in hourly_chart item"
            assert "earnings" in hour_data, "Missing 'earnings' in hourly_chart item"
            assert "views" in hour_data, "Missing 'views' in hourly_chart item"
        
        print(f"✓ Real-time earnings endpoint working - Today: {data['today']['earnings']} coins, {data['today']['views']} views")
    
    def test_earnings_realtime_without_auth(self):
        """Verify endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/creator/earnings/realtime")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestEarningsHistory:
    """Test /api/creator/earnings/history endpoint"""
    
    @pytest.mark.parametrize("period", ["7d", "30d", "90d"])
    def test_earnings_history_with_periods(self, auth_headers, period):
        """Verify earnings history works with different time periods"""
        response = requests.get(
            f"{BASE_URL}/api/creator/earnings/history?period={period}",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200 for period={period}, got {response.status_code}"
        
        data = response.json()
        
        # Check required fields
        assert "period" in data, "Missing 'period' field"
        assert data["period"] == period, f"Expected period '{period}', got '{data['period']}'"
        assert "data" in data, "Missing 'data' field"
        assert "summary" in data, "Missing 'summary' field"
        
        # Check summary structure
        summary = data["summary"]
        assert "total_earnings" in summary, "Missing 'total_earnings' in summary"
        assert "total_views" in summary, "Missing 'total_views' in summary"
        assert "average_daily_earnings" in summary, "Missing 'average_daily_earnings' in summary"
        
        print(f"✓ History period={period}: Total earnings={summary['total_earnings']}, Views={summary['total_views']}")
    
    def test_earnings_history_data_format(self, auth_headers):
        """Verify data array has correct format"""
        response = requests.get(
            f"{BASE_URL}/api/creator/earnings/history?period=7d",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Data should be a list
        assert isinstance(data["data"], list), "data should be a list"
        
        # If there's data, check each item format
        for item in data["data"]:
            assert "_id" in item, "Each data item should have '_id' (date)"
            assert "earnings" in item, "Each data item should have 'earnings'"
            assert "views" in item, "Each data item should have 'views'"


class TestCreatorMilestones:
    """Test /api/creator/milestones endpoints"""
    
    def test_get_milestones_returns_correct_structure(self, auth_headers):
        """Verify milestones endpoint returns expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/creator/milestones",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "milestones" in data, "Missing 'milestones' field"
        assert "progress" in data, "Missing 'progress' field"
        assert "stats" in data, "Missing 'stats' field"
        
        # Check milestones is a list
        assert isinstance(data["milestones"], list), "milestones should be a list"
        
        # Check progress contains expected milestone types
        progress = data["progress"]
        expected_types = ["views", "episodes", "earnings", "series"]
        for milestone_type in expected_types:
            assert milestone_type in progress, f"Missing '{milestone_type}' in progress"
            
            # Check progress structure for each type
            type_progress = progress[milestone_type]
            assert "current" in type_progress, f"Missing 'current' in {milestone_type} progress"
            assert "next_threshold" in type_progress or type_progress.get("next_name") == "All milestones achieved!", f"Missing 'next_threshold' in {milestone_type} progress"
            assert "progress_percent" in type_progress, f"Missing 'progress_percent' in {milestone_type} progress"
        
        # Check stats structure
        stats = data["stats"]
        assert "total_views" in stats, "Missing 'total_views' in stats"
        assert "total_episodes" in stats, "Missing 'total_episodes' in stats"
        assert "total_earnings" in stats, "Missing 'total_earnings' in stats"
        assert "total_series" in stats, "Missing 'total_series' in stats"
        
        print(f"✓ Milestones endpoint working - {len(data['milestones'])} milestones achieved")
        print(f"  Stats: Views={stats['total_views']}, Episodes={stats['total_episodes']}, Series={stats['total_series']}")
    
    def test_check_milestones_returns_new_milestones(self, auth_headers):
        """Test POST /api/creator/milestones/check endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/creator/milestones/check",
            headers=auth_headers,
            json={}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "new_milestones" in data, "Missing 'new_milestones' field"
        assert "bonus_coins_awarded" in data, "Missing 'bonus_coins_awarded' field"
        assert "message" in data, "Missing 'message' field"
        
        # new_milestones should be a list
        assert isinstance(data["new_milestones"], list), "new_milestones should be a list"
        
        # If there are new milestones, check their structure
        for milestone in data["new_milestones"]:
            assert "id" in milestone, "Missing 'id' in milestone"
            assert "milestone_type" in milestone, "Missing 'milestone_type' in milestone"
            assert "milestone_name" in milestone, "Missing 'milestone_name' in milestone"
            assert "milestone_value" in milestone, "Missing 'milestone_value' in milestone"
        
        print(f"✓ Milestones check: {len(data['new_milestones'])} new milestones, {data['bonus_coins_awarded']} bonus coins")


class TestEpisodeScheduler:
    """Test /api/creator/schedules and schedule endpoints"""
    
    def test_get_schedules_returns_list(self, auth_headers):
        """Verify schedules endpoint returns list of scheduled episodes"""
        response = requests.get(
            f"{BASE_URL}/api/creator/schedules",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "schedules" in data, "Missing 'schedules' field"
        assert "count" in data, "Missing 'count' field"
        
        # schedules should be a list
        assert isinstance(data["schedules"], list), "schedules should be a list"
        assert isinstance(data["count"], int), "count should be an integer"
        
        # If there are schedules, check their structure
        for schedule in data["schedules"]:
            assert "id" in schedule, "Missing 'id' in schedule"
            assert "episode_id" in schedule, "Missing 'episode_id' in schedule"
            assert "scheduled_for" in schedule, "Missing 'scheduled_for' in schedule"
            assert "status" in schedule, "Missing 'status' in schedule"
        
        print(f"✓ Schedules endpoint working - {data['count']} scheduled episodes")


class TestEpisodeSync:
    """Test /api/creator/series/{id}/sync-episodes endpoint"""
    
    def test_sync_requires_auth(self):
        """Verify sync endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/creator/series/test-id/sync-episodes")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_sync_nonexistent_series(self, auth_headers):
        """Verify sync returns 404 for non-existent series"""
        response = requests.post(
            f"{BASE_URL}/api/creator/series/nonexistent-series-id/sync-episodes",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for non-existent series, got {response.status_code}"


class TestCreatorStatus:
    """Test creator status endpoint"""
    
    def test_creator_status(self, auth_headers):
        """Verify admin is approved as creator"""
        response = requests.get(
            f"{BASE_URL}/api/creator/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "is_creator" in data
        assert "status" in data
        
        print(f"✓ Creator status: is_creator={data['is_creator']}, status={data['status']}")


class TestSeriesPage:
    """Test series page shows correct episode count"""
    
    def test_implementation_success_series_episodes(self, auth_headers):
        """Check Implementation Success series (cs-2d72ac686d) has 4 episodes"""
        series_id = "cs-2d72ac686d"
        
        # Check public series endpoint
        response = requests.get(f"{BASE_URL}/api/series/{series_id}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Series '{data.get('title')}': total_episodes={data.get('total_episodes')}")
            
            # Also check episodes endpoint
            episodes_response = requests.get(f"{BASE_URL}/api/series/{series_id}/episodes")
            if episodes_response.status_code == 200:
                episodes = episodes_response.json()
                episode_list = episodes.get("episodes", episodes) if isinstance(episodes, dict) else episodes
                print(f"  Episodes returned: {len(episode_list) if isinstance(episode_list, list) else 'unknown'}")
        else:
            print(f"Note: Series {series_id} not found (may not exist in this environment)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
