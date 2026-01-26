import requests
import sys
import json
from datetime import datetime
import time

class MiniSeriesAPITester:
    def __init__(self, base_url="https://watchcredit.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration with welcome bonus"""
        timestamp = int(time.time())
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            
            # Check welcome bonus
            if response['user']['coins'] == 50:
                self.log_test("Welcome Bonus (50 coins)", True)
            else:
                self.log_test("Welcome Bonus (50 coins)", False, f"Got {response['user']['coins']} coins instead of 50")
            
            return True, test_user
        
        return False, {}

    def test_user_login(self, user_credentials):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={
                "email": user_credentials["email"],
                "password": user_credentials["password"]
            }
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        
        if success and 'id' in response and 'email' in response:
            return True
        return False

    def test_series_listing(self):
        """Test series listing"""
        success, response = self.run_test(
            "Get Series List",
            "GET",
            "series",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check if series have required fields
            series = response[0]
            required_fields = ['id', 'title', 'description', 'genre', 'thumbnail', 'total_episodes']
            
            for field in required_fields:
                if field not in series:
                    self.log_test("Series Data Structure", False, f"Missing field: {field}")
                    return False, []
            
            self.log_test("Series Data Structure", True)
            return True, response
        
        return False, []

    def test_featured_series(self):
        """Test featured series"""
        success, response = self.run_test(
            "Get Featured Series",
            "GET",
            "series/featured",
            200
        )
        
        if success and isinstance(response, list):
            return True, response
        return False, []

    def test_series_detail(self, series_id):
        """Test series detail"""
        success, response = self.run_test(
            "Get Series Detail",
            "GET",
            f"series/{series_id}",
            200
        )
        
        if success and 'id' in response:
            return True, response
        return False, {}

    def test_episodes_listing(self, series_id):
        """Test episodes listing for a series"""
        success, response = self.run_test(
            "Get Episodes List",
            "GET",
            f"series/{series_id}/episodes",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check episode structure
            episode = response[0]
            required_fields = ['id', 'series_id', 'episode_number', 'title', 'video_url', 'is_free']
            
            for field in required_fields:
                if field not in episode:
                    self.log_test("Episode Data Structure", False, f"Missing field: {field}")
                    return False, []
            
            # Check if first episode is free
            first_episode = next((ep for ep in response if ep['episode_number'] == 1), None)
            if first_episode and first_episode['is_free']:
                self.log_test("First Episode Free", True)
            else:
                self.log_test("First Episode Free", False, "First episode is not marked as free")
            
            self.log_test("Episode Data Structure", True)
            return True, response
        
        return False, []

    def test_episode_detail(self, episode_id):
        """Test episode detail"""
        success, response = self.run_test(
            "Get Episode Detail",
            "GET",
            f"episodes/{episode_id}",
            200
        )
        
        if success and 'id' in response:
            return True, response
        return False, {}

    def test_daily_reward_status(self):
        """Test daily reward status"""
        success, response = self.run_test(
            "Daily Reward Status",
            "GET",
            "rewards/status",
            200
        )
        
        if success and 'can_claim' in response and 'reward_amount' in response:
            return True, response
        return False, {}

    def test_daily_reward_claim(self):
        """Test daily reward claim"""
        success, response = self.run_test(
            "Claim Daily Reward",
            "POST",
            "rewards/claim",
            200
        )
        
        if success and 'coins_earned' in response:
            if response['coins_earned'] == 10:
                self.log_test("Daily Reward Amount (10 coins)", True)
            else:
                self.log_test("Daily Reward Amount (10 coins)", False, f"Got {response['coins_earned']} coins instead of 10")
            return True
        return False

    def test_coin_packages(self):
        """Test coin store packages"""
        success, response = self.run_test(
            "Get Coin Packages",
            "GET",
            "store/packages",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check package structure
            package = response[0]
            required_fields = ['id', 'name', 'coins', 'price']
            
            for field in required_fields:
                if field not in package:
                    self.log_test("Package Data Structure", False, f"Missing field: {field}")
                    return False, []
            
            self.log_test("Package Data Structure", True)
            return True, response
        
        return False, []

    def test_episode_unlock(self, episode_id):
        """Test episode unlock functionality"""
        success, response = self.run_test(
            "Unlock Episode",
            "POST",
            "episodes/unlock",
            200,
            data={"episode_id": episode_id}
        )
        
        if success and 'coins_spent' in response:
            return True, response
        return False, {}

    def test_watch_progress(self, episode_id):
        """Test watch progress tracking"""
        success, response = self.run_test(
            "Update Watch Progress",
            "POST",
            "episodes/progress",
            200,
            data={"episode_id": episode_id, "progress": 25}
        )
        
        if success and 'progress' in response:
            return True
        return False

    def test_unlocked_episodes(self):
        """Test get unlocked episodes"""
        success, response = self.run_test(
            "Get Unlocked Episodes",
            "GET",
            "user/unlocked-episodes",
            200
        )
        
        if success and 'unlocked_episodes' in response:
            return True, response
        return False, {}

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting MiniSeries API Tests...")
        print("=" * 50)
        
        # Test user registration
        reg_success, user_creds = self.test_user_registration()
        if not reg_success:
            print("❌ Registration failed, stopping tests")
            return self.get_summary()
        
        # Test user login
        if not self.test_user_login(user_creds):
            print("❌ Login failed, stopping tests")
            return self.get_summary()
        
        # Test user profile
        self.test_get_user_profile()
        
        # Test series functionality
        series_success, series_list = self.test_series_listing()
        if series_success and len(series_list) > 0:
            series_id = series_list[0]['id']
            
            # Test series detail
            self.test_series_detail(series_id)
            
            # Test episodes
            episodes_success, episodes_list = self.test_episodes_listing(series_id)
            if episodes_success and len(episodes_list) > 0:
                episode_id = episodes_list[0]['id']
                
                # Test episode detail
                self.test_episode_detail(episode_id)
                
                # Test watch progress
                self.test_watch_progress(episode_id)
                
                # Test episode unlock (for non-free episode)
                paid_episode = next((ep for ep in episodes_list if not ep['is_free']), None)
                if paid_episode:
                    # This might fail due to insufficient coins, which is expected
                    self.test_episode_unlock(paid_episode['id'])
        
        # Test featured series
        self.test_featured_series()
        
        # Test daily rewards
        reward_status_success, reward_status = self.test_daily_reward_status()
        if reward_status_success and reward_status.get('can_claim'):
            self.test_daily_reward_claim()
        
        # Test coin store
        self.test_coin_packages()
        
        # Test unlocked episodes
        self.test_unlocked_episodes()
        
        return self.get_summary()

    def get_summary(self):
        """Get test summary"""
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed. Check details above.")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0,
            "test_results": self.test_results
        }

def main():
    """Main test execution"""
    tester = MiniSeriesAPITester()
    summary = tester.run_all_tests()
    
    # Save results to file
    with open('/app/test_reports/backend_test_results.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    return 0 if summary["success_rate"] == 100 else 1

if __name__ == "__main__":
    sys.exit(main())