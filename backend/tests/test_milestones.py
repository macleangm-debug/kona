"""
Referral Milestone Rewards API Tests
Tests for GET /api/referral/milestones and POST /api/referral/milestones/{id}/claim
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test user credentials (has 30 referrals, Bronze+Silver claimed)
TEST_USER_EMAIL = "milestone_test@test.com"
TEST_USER_PASSWORD = "test123"

# Milestone configuration
MILESTONES = [
    {"id": "bronze", "required_referrals": 10, "reward_coins": 100},
    {"id": "silver", "required_referrals": 25, "reward_coins": 300},
    {"id": "gold", "required_referrals": 50, "reward_coins": 600},
    {"id": "platinum", "required_referrals": 100, "reward_coins": 1500},
    {"id": "diamond", "required_referrals": 200, "reward_coins": 4000},
]


class TestMilestoneSetup:
    """Setup test user with referrals for milestone testing"""
    
    @pytest.fixture(scope="class")
    def session(self):
        return requests.Session()
    
    def test_create_or_login_test_user(self, session):
        """Create test user or login if exists"""
        # Try to register first
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Milestone Test User"
        })
        
        if register_response.status_code == 200:
            print(f"Created new test user: {TEST_USER_EMAIL}")
            data = register_response.json()
            assert "token" in data
            return data["token"]
        elif register_response.status_code == 400:
            # User exists, login instead
            login_response = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            data = login_response.json()
            print(f"Logged in existing user: {TEST_USER_EMAIL}")
            return data["token"]
        else:
            pytest.fail(f"Failed to create/login user: {register_response.text}")


class TestMilestoneAPIs:
    """Test milestone API endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        session = requests.Session()
        
        # Try login first
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["token"]
        
        # If login fails, try to register
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Milestone Test User"
        })
        
        if register_response.status_code == 200:
            return register_response.json()["token"]
        
        pytest.skip(f"Could not authenticate test user: {login_response.text}")
    
    @pytest.fixture(scope="class")
    def session(self, auth_token):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return s
    
    def test_get_milestones_returns_all_five(self, session):
        """GET /api/referral/milestones returns all 5 milestones"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "milestones" in data
        assert len(data["milestones"]) == 5, f"Expected 5 milestones, got {len(data['milestones'])}"
        
        # Verify milestone IDs
        milestone_ids = [m["id"] for m in data["milestones"]]
        expected_ids = ["bronze", "silver", "gold", "platinum", "diamond"]
        assert milestone_ids == expected_ids, f"Milestone IDs mismatch: {milestone_ids}"
        
        print(f"✓ All 5 milestones returned: {milestone_ids}")
    
    def test_milestones_have_correct_structure(self, session):
        """Each milestone has required fields"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ["id", "name", "icon", "required_referrals", "reward_coins", 
                          "is_reached", "is_claimed", "can_claim", "progress", "progress_percent"]
        
        for milestone in data["milestones"]:
            for field in required_fields:
                assert field in milestone, f"Missing field '{field}' in milestone {milestone.get('id')}"
        
        print(f"✓ All milestones have correct structure")
    
    def test_milestones_have_correct_rewards(self, session):
        """Verify milestone reward values match spec"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200
        
        data = response.json()
        
        expected_rewards = {
            "bronze": {"referrals": 10, "coins": 100},
            "silver": {"referrals": 25, "coins": 300},
            "gold": {"referrals": 50, "coins": 600},
            "platinum": {"referrals": 100, "coins": 1500},
            "diamond": {"referrals": 200, "coins": 4000},
        }
        
        for milestone in data["milestones"]:
            mid = milestone["id"]
            assert milestone["required_referrals"] == expected_rewards[mid]["referrals"], \
                f"{mid}: Expected {expected_rewards[mid]['referrals']} referrals, got {milestone['required_referrals']}"
            assert milestone["reward_coins"] == expected_rewards[mid]["coins"], \
                f"{mid}: Expected {expected_rewards[mid]['coins']} coins, got {milestone['reward_coins']}"
        
        print(f"✓ All milestone rewards match specification")
    
    def test_milestone_status_logic(self, session):
        """Test milestone status (locked/claimable/claimed) logic"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200
        
        data = response.json()
        referral_count = data["referral_count"]
        
        for milestone in data["milestones"]:
            is_reached = referral_count >= milestone["required_referrals"]
            
            # Verify is_reached matches referral count
            assert milestone["is_reached"] == is_reached, \
                f"{milestone['id']}: is_reached should be {is_reached} with {referral_count} referrals"
            
            # can_claim should be True only if reached AND not claimed
            if milestone["is_reached"] and not milestone["is_claimed"]:
                assert milestone["can_claim"] == True, \
                    f"{milestone['id']}: should be claimable (reached={milestone['is_reached']}, claimed={milestone['is_claimed']})"
            else:
                assert milestone["can_claim"] == False, \
                    f"{milestone['id']}: should NOT be claimable"
        
        print(f"✓ Milestone status logic correct for {referral_count} referrals")
    
    def test_referral_count_in_response(self, session):
        """Response includes user's referral count"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200
        
        data = response.json()
        assert "referral_count" in data
        assert isinstance(data["referral_count"], int)
        assert data["referral_count"] >= 0
        
        print(f"✓ Referral count in response: {data['referral_count']}")
    
    def test_next_milestone_field(self, session):
        """Response includes next_milestone if not all claimed"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200
        
        data = response.json()
        assert "next_milestone" in data
        
        # Find first unreached milestone
        unreached = [m for m in data["milestones"] if not m["is_reached"]]
        if unreached:
            assert data["next_milestone"] is not None
            assert data["next_milestone"]["id"] == unreached[0]["id"]
            print(f"✓ Next milestone: {data['next_milestone']['name']}")
        else:
            print(f"✓ All milestones reached")
    
    def test_total_milestone_earnings(self, session):
        """Response includes total_milestone_earnings"""
        response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_milestone_earnings" in data
        
        # Calculate expected earnings from claimed milestones
        claimed_earnings = sum(m["reward_coins"] for m in data["milestones"] if m["is_claimed"])
        assert data["total_milestone_earnings"] == claimed_earnings, \
            f"Expected {claimed_earnings}, got {data['total_milestone_earnings']}"
        
        print(f"✓ Total milestone earnings: {data['total_milestone_earnings']}")


class TestMilestoneClaim:
    """Test milestone claim functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test user"""
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["token"]
        
        # Try register
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Milestone Test User"
        })
        
        if register_response.status_code == 200:
            return register_response.json()["token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture(scope="class")
    def session(self, auth_token):
        s = requests.Session()
        s.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return s
    
    def test_claim_invalid_milestone_returns_404(self, session):
        """POST /api/referral/milestones/invalid/claim returns 404"""
        response = session.post(f"{BASE_URL}/api/referral/milestones/invalid_milestone/claim")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()
        
        print(f"✓ Invalid milestone returns 404")
    
    def test_cannot_claim_unreached_milestone(self, session):
        """Cannot claim milestone without meeting referral requirement"""
        # Get current milestones
        milestones_response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert milestones_response.status_code == 200
        
        data = milestones_response.json()
        
        # Find an unreached milestone
        unreached = [m for m in data["milestones"] if not m["is_reached"]]
        
        if not unreached:
            pytest.skip("All milestones reached - cannot test unreached claim")
        
        milestone_to_test = unreached[0]
        
        # Try to claim it
        claim_response = session.post(f"{BASE_URL}/api/referral/milestones/{milestone_to_test['id']}/claim")
        assert claim_response.status_code == 400, f"Expected 400, got {claim_response.status_code}"
        
        error_data = claim_response.json()
        assert "detail" in error_data
        assert "referrals" in error_data["detail"].lower()
        
        print(f"✓ Cannot claim unreached milestone '{milestone_to_test['id']}' - correctly rejected")
    
    def test_cannot_claim_already_claimed_milestone(self, session):
        """Cannot claim same milestone twice"""
        # Get current milestones
        milestones_response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert milestones_response.status_code == 200
        
        data = milestones_response.json()
        
        # Find a claimed milestone
        claimed = [m for m in data["milestones"] if m["is_claimed"]]
        
        if not claimed:
            pytest.skip("No claimed milestones - cannot test double claim")
        
        milestone_to_test = claimed[0]
        
        # Try to claim it again
        claim_response = session.post(f"{BASE_URL}/api/referral/milestones/{milestone_to_test['id']}/claim")
        assert claim_response.status_code == 400, f"Expected 400, got {claim_response.status_code}"
        
        error_data = claim_response.json()
        assert "detail" in error_data
        assert "already claimed" in error_data["detail"].lower()
        
        print(f"✓ Cannot claim already claimed milestone '{milestone_to_test['id']}' - correctly rejected")


class TestMilestoneClaimSuccess:
    """Test successful milestone claim (if claimable milestone exists)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        session = requests.Session()
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if login_response.status_code == 200:
            return login_response.json()["token"]
        
        register_response = session.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Milestone Test User"
        })
        
        if register_response.status_code == 200:
            return register_response.json()["token"]
        
        pytest.skip("Could not authenticate")
    
    @pytest.fixture(scope="class")
    def session(self, auth_token):
        s = requests.Session()
        s.headers.update({
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        })
        return s
    
    def test_claim_claimable_milestone(self, session):
        """Successfully claim a claimable milestone"""
        # Get current milestones
        milestones_response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert milestones_response.status_code == 200
        
        data = milestones_response.json()
        
        # Find a claimable milestone
        claimable = [m for m in data["milestones"] if m["can_claim"]]
        
        if not claimable:
            print(f"ℹ No claimable milestones available (referral_count={data['referral_count']})")
            pytest.skip("No claimable milestones - test user may need more referrals")
        
        milestone_to_claim = claimable[0]
        
        # Get user's current coins
        user_response = session.get(f"{BASE_URL}/api/auth/me")
        assert user_response.status_code == 200
        initial_coins = user_response.json()["coins"]
        
        # Claim the milestone
        claim_response = session.post(f"{BASE_URL}/api/referral/milestones/{milestone_to_claim['id']}/claim")
        assert claim_response.status_code == 200, f"Claim failed: {claim_response.text}"
        
        claim_data = claim_response.json()
        
        # Verify response structure
        assert "message" in claim_data
        assert "coins_earned" in claim_data
        assert "total_coins" in claim_data
        assert "milestone" in claim_data
        
        # Verify coins earned matches milestone reward
        assert claim_data["coins_earned"] == milestone_to_claim["reward_coins"]
        
        # Verify total coins increased correctly
        expected_total = initial_coins + milestone_to_claim["reward_coins"]
        assert claim_data["total_coins"] == expected_total, \
            f"Expected {expected_total} coins, got {claim_data['total_coins']}"
        
        print(f"✓ Successfully claimed '{milestone_to_claim['name']}' milestone")
        print(f"  Coins earned: {claim_data['coins_earned']}")
        print(f"  Total coins: {claim_data['total_coins']}")
        
        # Verify milestone is now marked as claimed
        verify_response = session.get(f"{BASE_URL}/api/referral/milestones")
        assert verify_response.status_code == 200
        
        verify_data = verify_response.json()
        claimed_milestone = next(m for m in verify_data["milestones"] if m["id"] == milestone_to_claim["id"])
        
        assert claimed_milestone["is_claimed"] == True
        assert claimed_milestone["can_claim"] == False
        
        print(f"✓ Milestone correctly marked as claimed in subsequent GET")


class TestMilestoneAuth:
    """Test milestone endpoints require authentication"""
    
    def test_get_milestones_requires_auth(self):
        """GET /api/referral/milestones requires authentication"""
        response = requests.get(f"{BASE_URL}/api/referral/milestones")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET milestones requires auth (status: {response.status_code})")
    
    def test_claim_milestone_requires_auth(self):
        """POST /api/referral/milestones/{id}/claim requires authentication"""
        response = requests.post(f"{BASE_URL}/api/referral/milestones/bronze/claim")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ POST claim milestone requires auth (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
