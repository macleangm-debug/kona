import requests
import sys
import json
from datetime import datetime
import time

class MiniSeriesAPITester:
    def __init__(self, base_url="https://miniseries-coins.preview.emergentagent.com"):
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

    def test_geo_detect(self):
        """Test geo location detection"""
        success, response = self.run_test(
            "Geo Location Detection",
            "GET",
            "geo/detect",
            200
        )
        
        if success and 'country_code' in response and 'currency' in response and 'payment_methods' in response:
            # Verify payment methods structure
            if isinstance(response['payment_methods'], list) and len(response['payment_methods']) > 0:
                payment_method = response['payment_methods'][0]
                required_fields = ['id', 'name', 'type', 'provider']
                
                for field in required_fields:
                    if field not in payment_method:
                        self.log_test("Geo Detection Payment Methods Structure", False, f"Missing field: {field}")
                        return False, {}
                
                self.log_test("Geo Detection Payment Methods Structure", True)
            return True, response
        return False, {}

    def test_geo_countries(self):
        """Test supported countries listing"""
        success, response = self.run_test(
            "Get Supported Countries",
            "GET",
            "geo/countries",
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            # Check if required countries are present
            country_codes = [country['code'] for country in response]
            required_countries = ['KE', 'TZ', 'UG', 'RW', 'CD', 'INTL']
            
            missing_countries = []
            for country_code in required_countries:
                if country_code not in country_codes:
                    missing_countries.append(country_code)
            
            if missing_countries:
                self.log_test("Required Countries Present", False, f"Missing countries: {missing_countries}")
            else:
                self.log_test("Required Countries Present", True)
            
            # Check country structure
            country = response[0]
            required_fields = ['code', 'name', 'currency', 'payment_methods']
            
            for field in required_fields:
                if field not in country:
                    self.log_test("Country Data Structure", False, f"Missing field: {field}")
                    return False, []
            
            self.log_test("Country Data Structure", True)
            return True, response
        
        return False, []

    def test_geo_payment_methods(self, country_code):
        """Test payment methods for specific country"""
        success, response = self.run_test(
            f"Payment Methods for {country_code}",
            "GET",
            f"geo/payment-methods/{country_code}",
            200
        )
        
        if success and 'payment_methods' in response and 'currency' in response:
            # Verify specific country payment methods
            if country_code == 'KE':
                # Kenya should have M-Pesa and Card
                method_ids = [pm['id'] for pm in response['payment_methods']]
                if 'mpesa' in method_ids and 'card' in method_ids:
                    self.log_test("Kenya Payment Methods (M-Pesa + Card)", True)
                else:
                    self.log_test("Kenya Payment Methods (M-Pesa + Card)", False, f"Missing expected methods. Found: {method_ids}")
                
                # Check currency
                if response['currency'] == 'KES':
                    self.log_test("Kenya Currency (KES)", True)
                else:
                    self.log_test("Kenya Currency (KES)", False, f"Expected KES, got {response['currency']}")
            
            elif country_code == 'UG':
                # Uganda should have MTN, Airtel, and Card
                method_ids = [pm['id'] for pm in response['payment_methods']]
                expected_methods = ['mtn', 'airtel', 'card']
                missing_methods = [m for m in expected_methods if m not in method_ids]
                
                if not missing_methods:
                    self.log_test("Uganda Payment Methods (MTN + Airtel + Card)", True)
                else:
                    self.log_test("Uganda Payment Methods (MTN + Airtel + Card)", False, f"Missing methods: {missing_methods}")
                
                # Check currency
                if response['currency'] == 'UGX':
                    self.log_test("Uganda Currency (UGX)", True)
                else:
                    self.log_test("Uganda Currency (UGX)", False, f"Expected UGX, got {response['currency']}")
            
            elif country_code == 'INTL':
                # International should have only card
                method_ids = [pm['id'] for pm in response['payment_methods']]
                if len(method_ids) == 1 and 'card' in method_ids:
                    self.log_test("International Payment Methods (Card Only)", True)
                else:
                    self.log_test("International Payment Methods (Card Only)", False, f"Expected only card, got: {method_ids}")
                
                # Check currency
                if response['currency'] == 'USD':
                    self.log_test("International Currency (USD)", True)
                else:
                    self.log_test("International Currency (USD)", False, f"Expected USD, got {response['currency']}")
            
            return True, response
        return False, {}

    def test_checkout_with_geo_data(self, package_id, country_code, payment_method):
        """Test checkout with geo-based payment data"""
        checkout_data = {
            "package_id": package_id,
            "origin_url": "https://test.example.com",
            "payment_method": payment_method,
            "country_code": country_code
        }
        
        # Add phone number for mobile money
        if payment_method in ['mpesa', 'mtn', 'airtel']:
            checkout_data["phone_number"] = "+254700123456"
        
        success, response = self.run_test(
            f"Checkout with {country_code} {payment_method}",
            "POST",
            "store/checkout",
            200,
            data=checkout_data
        )
        
        if success and 'url' in response and 'provider' in response:
            # Verify provider selection
            expected_provider = "flutterwave" if country_code != "INTL" else "stripe"
            if response['provider'] == expected_provider:
                self.log_test(f"Correct Provider Selection ({expected_provider})", True)
            else:
                self.log_test(f"Correct Provider Selection ({expected_provider})", False, f"Expected {expected_provider}, got {response['provider']}")
            
            return True, response
        return False, {}

    def test_referral_code_validation(self, referral_code):
        """Test referral code validation"""
        success, response = self.run_test(
            f"Validate Referral Code ({referral_code})",
            "GET",
            f"referral/validate/{referral_code}",
            200
        )
        
        if success and 'valid' in response:
            if response['valid']:
                # Check if bonus_coins is present for valid codes
                if 'bonus_coins' in response and response['bonus_coins'] == 30:
                    self.log_test("Referral Bonus Amount (30 coins)", True)
                else:
                    self.log_test("Referral Bonus Amount (30 coins)", False, f"Expected 30 bonus coins, got {response.get('bonus_coins', 'none')}")
                
                # Check if referrer_name is present
                if 'referrer_name' in response:
                    self.log_test("Referrer Name in Validation", True)
                else:
                    self.log_test("Referrer Name in Validation", False, "Missing referrer_name in response")
            
            return True, response
        return False, {}

    def test_referral_stats(self):
        """Test user's referral statistics"""
        success, response = self.run_test(
            "Get Referral Stats",
            "GET",
            "referral/stats",
            200
        )
        
        if success and 'referral_code' in response:
            # Check required fields
            required_fields = ['referral_code', 'total_referrals', 'total_earnings', 'reward_per_referral', 'referee_bonus']
            
            for field in required_fields:
                if field not in response:
                    self.log_test("Referral Stats Structure", False, f"Missing field: {field}")
                    return False, {}
            
            # Check reward amounts
            if response['reward_per_referral'] == 20:
                self.log_test("Referrer Reward Amount (20 coins)", True)
            else:
                self.log_test("Referrer Reward Amount (20 coins)", False, f"Expected 20, got {response['reward_per_referral']}")
            
            if response['referee_bonus'] == 30:
                self.log_test("Referee Bonus Amount (30 coins)", True)
            else:
                self.log_test("Referee Bonus Amount (30 coins)", False, f"Expected 30, got {response['referee_bonus']}")
            
            self.log_test("Referral Stats Structure", True)
            return True, response
        return False, {}

    def test_referral_leaderboard(self):
        """Test referral leaderboard"""
        success, response = self.run_test(
            "Get Referral Leaderboard",
            "GET",
            "referral/leaderboard",
            200
        )
        
        if success and isinstance(response, list):
            # Check if leaderboard has proper structure (even if empty)
            if len(response) > 0:
                # Check leaderboard entry structure
                entry = response[0]
                required_fields = ['name', 'referrals', 'earnings']
                
                for field in required_fields:
                    if field not in entry:
                        self.log_test("Leaderboard Entry Structure", False, f"Missing field: {field}")
                        return False, []
                
                self.log_test("Leaderboard Entry Structure", True)
            else:
                self.log_test("Leaderboard Accessible (Empty)", True)
            
            return True, response
        return False, []

    def test_registration_with_referral(self, referral_code):
        """Test user registration with referral code"""
        timestamp = int(time.time())
        test_user = {
            "email": f"referred_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "name": f"Referred User {timestamp}",
            "referral_code": referral_code
        }
        
        success, response = self.run_test(
            "Registration with Referral Code",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response and 'user' in response:
            # Check if user got 80 coins (50 welcome + 30 referral bonus)
            if response['user']['coins'] == 80:
                self.log_test("Referral Registration Bonus (80 coins)", True)
            else:
                self.log_test("Referral Registration Bonus (80 coins)", False, f"Got {response['user']['coins']} coins instead of 80")
            
            return True, response
        return False, {}

    def test_referrer_reward(self, referrer_token, initial_coins):
        """Test if referrer received reward coins"""
        # Get current user profile to check coins
        success, response = self.run_test(
            "Check Referrer Reward",
            "GET",
            "auth/me",
            200,
            headers={'Authorization': f'Bearer {referrer_token}'}
        )
        
        if success and 'coins' in response:
            expected_coins = initial_coins + 20  # Should get 20 coins for referral
            if response['coins'] == expected_coins:
                self.log_test("Referrer Reward (20 coins)", True)
            else:
                self.log_test("Referrer Reward (20 coins)", False, f"Expected {expected_coins} coins, got {response['coins']}")
            
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
        
        # Store referrer info for referral testing
        referrer_token = self.token
        referrer_coins = 50  # Initial coins after registration
        
        # Test user login
        if not self.test_user_login(user_creds):
            print("❌ Login failed, stopping tests")
            return self.get_summary()
        
        # Test user profile
        self.test_get_user_profile()
        
        # Test referral system
        print("\n🤝 Testing Referral System...")
        
        # Test referral stats for new user (should have 0 referrals)
        referral_stats_success, referral_stats = self.test_referral_stats()
        referral_code = None
        if referral_stats_success and referral_stats.get('referral_code'):
            referral_code = referral_stats['referral_code']
            print(f"   User's referral code: {referral_code}")
        
        # Test referral code validation
        if referral_code:
            self.test_referral_code_validation(referral_code)
            
            # Test invalid referral code
            invalid_success, invalid_response = self.test_referral_code_validation("INVALID123")
            if invalid_success and not invalid_response.get('valid', True):
                self.log_test("Invalid Referral Code Rejection", True)
            else:
                self.log_test("Invalid Referral Code Rejection", False, "Invalid code was not properly rejected")
        
        # Test referral leaderboard
        self.test_referral_leaderboard()
        
        # Test registration with referral code (create new user using first user's code)
        if referral_code:
            referred_success, referred_response = self.test_registration_with_referral(referral_code)
            if referred_success:
                # Check if referrer got reward
                self.test_referrer_reward(referrer_token, referrer_coins)
                
                # Test referral stats again to see if count increased
                # Switch back to referrer token to check stats
                current_token = self.token
                self.token = referrer_token
                updated_stats_success, updated_stats = self.test_referral_stats()
                if updated_stats_success:
                    if updated_stats.get('total_referrals', 0) == 1:
                        self.log_test("Referral Count Update", True)
                    else:
                        self.log_test("Referral Count Update", False, f"Expected 1 referral, got {updated_stats.get('total_referrals', 0)}")
                    
                    if updated_stats.get('total_earnings', 0) == 20:
                        self.log_test("Referral Earnings Update", True)
                    else:
                        self.log_test("Referral Earnings Update", False, f"Expected 20 earnings, got {updated_stats.get('total_earnings', 0)}")
                
                # Switch back to referred user token
                self.token = current_token
        
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
        packages_success, packages_list = self.test_coin_packages()
        if packages_success:
            self._test_packages = packages_list
        
        # Test unlocked episodes
        self.test_unlocked_episodes()
        
        # Test geo-based payment routing
        print("\n🌍 Testing Geo-based Payment Routing...")
        
        # Test geo detection
        geo_success, geo_data = self.test_geo_detect()
        
        # Test countries listing
        countries_success, countries_list = self.test_geo_countries()
        
        # Test specific country payment methods
        if countries_success:
            # Test Kenya (M-Pesa + Card)
            self.test_geo_payment_methods('KE')
            
            # Test Uganda (MTN + Airtel + Card)
            self.test_geo_payment_methods('UG')
            
            # Test International (Card only)
            self.test_geo_payment_methods('INTL')
        
        # Test checkout with geo data (if we have packages)
        if hasattr(self, '_test_packages') and self._test_packages:
            package_id = self._test_packages[0]['id']
            
            # Test Kenya M-Pesa checkout
            self.test_checkout_with_geo_data(package_id, 'KE', 'mpesa')
            
            # Test Uganda MTN checkout
            self.test_checkout_with_geo_data(package_id, 'UG', 'mtn')
            
            # Test International card checkout
            self.test_checkout_with_geo_data(package_id, 'INTL', 'card')
        
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