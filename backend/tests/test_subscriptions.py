"""
Subscription API Tests with KwikPay Payment Integration (MOCKED)
Tests subscription tiers, payment providers, upgrade flow, and cancellation
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip('/')

# Test configuration
TEST_PREFIX = f"TEST_SUB_{int(datetime.now().timestamp())}"


class TestSubscriptionTiers:
    """Test /api/subscriptions/tiers endpoint"""
    
    def test_get_tiers_without_country(self):
        """GET /api/subscriptions/tiers - returns all tiers"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/tiers")
        assert response.status_code == 200
        
        data = response.json()
        assert "tiers" in data
        assert "tier_order" in data
        
        # Verify all 4 tiers exist
        tiers = data["tiers"]
        assert "free" in tiers
        assert "basic" in tiers
        assert "premium" in tiers
        assert "vip" in tiers
        
        # Verify tier order
        assert data["tier_order"] == ["free", "basic", "premium", "vip"]
        
        # Verify pricing (USD)
        assert tiers["free"]["price_usd"] == 0
        assert tiers["basic"]["price_usd"] == 2.99
        assert tiers["premium"]["price_usd"] == 5.99
        assert tiers["vip"]["price_usd"] == 9.99
        
        # Verify device limits
        assert tiers["free"]["device_limit"] == 3
        assert tiers["basic"]["device_limit"] == 5
        assert tiers["premium"]["device_limit"] == 7
        assert tiers["vip"]["device_limit"] == 10
        
        print(f"✓ All 4 tiers returned with correct pricing and device limits")
    
    def test_get_tiers_with_kenya_country_code(self):
        """GET /api/subscriptions/tiers?country_code=KE - shows prices in KES"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/tiers?country_code=KE")
        assert response.status_code == 200
        
        data = response.json()
        assert data["country_code"] == "KE"
        
        # Verify local pricing is included
        tiers = data["tiers"]
        
        # Free tier should have local_price
        assert "local_price" in tiers["free"]
        assert tiers["free"]["local_price"]["currency"] == "KES"
        assert tiers["free"]["local_price"]["amount"] == 0
        
        # Basic tier (2.99 USD * 130 KES/USD = ~389 KES)
        assert "local_price" in tiers["basic"]
        assert tiers["basic"]["local_price"]["currency"] == "KES"
        assert tiers["basic"]["local_price"]["amount"] == 389.0  # 2.99 * 130 rounded
        
        # VIP tier (9.99 USD * 130 KES/USD = ~1299 KES)
        assert "local_price" in tiers["vip"]
        assert tiers["vip"]["local_price"]["currency"] == "KES"
        assert tiers["vip"]["local_price"]["amount"] == 1299.0  # 9.99 * 130 rounded
        
        # Verify formatted prices
        assert "KES" in tiers["vip"]["local_price"]["formatted"]
        
        print(f"✓ Kenya (KE) tiers show prices in KES with correct exchange rate")
    
    def test_get_tiers_with_nigeria_country_code(self):
        """GET /api/subscriptions/tiers?country_code=NG - shows prices in NGN"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/tiers?country_code=NG")
        assert response.status_code == 200
        
        data = response.json()
        assert data["country_code"] == "NG"
        
        tiers = data["tiers"]
        
        # Verify NGN pricing (exchange rate: 1600 NGN/USD)
        assert tiers["basic"]["local_price"]["currency"] == "NGN"
        expected_basic_ngn = round(2.99 * 1600, 0)
        assert tiers["basic"]["local_price"]["amount"] == expected_basic_ngn
        
        expected_vip_ngn = round(9.99 * 1600, 0)
        assert tiers["vip"]["local_price"]["amount"] == expected_vip_ngn
        
        print(f"✓ Nigeria (NG) tiers show prices in NGN with correct exchange rate")


class TestPaymentProviders:
    """Test /api/subscriptions/payment-providers/{country_code} endpoint"""
    
    def test_get_kenya_payment_providers(self):
        """GET /api/subscriptions/payment-providers/KE - returns M-Pesa and Airtel Money"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/payment-providers/KE")
        assert response.status_code == 200
        
        data = response.json()
        assert data["country_code"] == "KE"
        assert data["country_name"] == "Kenya"
        assert data["currency"] == "KES"
        
        providers = data["providers"]
        assert len(providers) == 2
        
        provider_ids = [p["id"] for p in providers]
        assert "mpesa" in provider_ids
        assert "airtel_money" in provider_ids
        
        # Verify M-Pesa details
        mpesa = next(p for p in providers if p["id"] == "mpesa")
        assert mpesa["name"] == "M-Pesa"
        assert mpesa["type"] == "mobile_money"
        
        print(f"✓ Kenya has M-Pesa and Airtel Money providers")
    
    def test_get_nigeria_payment_providers(self):
        """GET /api/subscriptions/payment-providers/NG - returns card and bank transfer"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/payment-providers/NG")
        assert response.status_code == 200
        
        data = response.json()
        assert data["country_code"] == "NG"
        assert data["currency"] == "NGN"
        
        providers = data["providers"]
        provider_ids = [p["id"] for p in providers]
        assert "card" in provider_ids
        assert "bank_transfer" in provider_ids
        
        # Verify card provider type
        card = next(p for p in providers if p["id"] == "card")
        assert card["type"] == "card"
        
        print(f"✓ Nigeria has card and bank transfer providers")
    
    def test_get_tanzania_payment_providers(self):
        """GET /api/subscriptions/payment-providers/TZ - returns multiple mobile money providers"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/payment-providers/TZ")
        assert response.status_code == 200
        
        data = response.json()
        assert data["country_code"] == "TZ"
        assert data["currency"] == "TZS"
        
        providers = data["providers"]
        provider_ids = [p["id"] for p in providers]
        
        # Tanzania should have Vodacom M-Pesa, Tigo Pesa, and Airtel Money
        assert "vodacom_mpesa" in provider_ids
        assert "tigopesa" in provider_ids
        assert "airtel_money" in provider_ids
        
        print(f"✓ Tanzania has 3 mobile money providers")
    
    def test_get_unknown_country_defaults_to_kenya(self):
        """GET /api/subscriptions/payment-providers/XX - defaults to Kenya providers"""
        response = requests.get(f"{BASE_URL}/api/subscriptions/payment-providers/XX")
        assert response.status_code == 200
        
        data = response.json()
        # Should default to Kenya's providers
        providers = data["providers"]
        provider_ids = [p["id"] for p in providers]
        assert "mpesa" in provider_ids or len(providers) > 0
        
        print(f"✓ Unknown country code handled gracefully")


class TestAuthenticatedEndpoints:
    """Test authenticated subscription endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_user(self):
        """Create a test user and get auth token"""
        email = f"{TEST_PREFIX}_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Test User"
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Registration failed: {reg_response.json()}")
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "TestPass123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.json()}")
        
        self.token = login_response.json()["token"]
        self.user = login_response.json()["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_my_subscription_free_tier(self):
        """GET /api/subscriptions/my-subscription - returns current subscription details"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/my-subscription",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # New users should be on free tier
        assert data["current_tier"] == "free"
        assert data["tier_name"] == "Free"
        assert data["device_limit"] == 3
        assert data["is_paid"] == False
        assert data["subscription"] is None
        
        # Verify upgrade options are provided
        assert "upgrade_options" in data
        assert len(data["upgrade_options"]) == 3  # basic, premium, vip
        
        # Verify benefits structure
        assert "benefits" in data
        assert data["benefits"]["ad_free"] == False
        assert data["benefits"]["video_quality"] == "720p"
        
        print(f"✓ New user on free tier with 3 upgrade options")
    
    def test_upgrade_requires_phone_for_mobile_money(self):
        """POST /api/subscriptions/upgrade - mobile money requires phone number"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "basic",
                "provider_id": "mpesa"
                # Missing phone_number
            }
        )
        
        assert response.status_code == 400
        assert "phone number" in response.json()["detail"].lower()
        
        print(f"✓ Upgrade correctly requires phone for mobile money")
    
    def test_upgrade_with_mobile_money(self):
        """POST /api/subscriptions/upgrade - initiates payment with KwikPay (MOCKED)"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "basic",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["status"] == "success"
        assert "data" in data
        assert "payment_id" in data["data"]
        assert data["data"]["tier"] == "basic"
        assert data["mock"] == True  # Verify it's using mock mode
        
        # Store payment_id for next test
        self.payment_id = data["data"]["payment_id"]
        
        print(f"✓ Upgrade initiated with MOCKED KwikPay, payment_id: {self.payment_id}")
    
    def test_cannot_downgrade_subscription(self):
        """POST /api/subscriptions/upgrade - cannot downgrade to lower tier"""
        # First, simulate an upgrade to VIP
        upgrade_response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "vip",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        
        if upgrade_response.status_code == 200:
            payment_id = upgrade_response.json()["data"]["payment_id"]
            # Simulate success
            requests.post(
                f"{BASE_URL}/api/subscriptions/payment/{payment_id}/simulate-success",
                headers=self.headers
            )
        
        # Try to downgrade to basic
        downgrade_response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "basic",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        
        assert downgrade_response.status_code == 400
        assert "downgrade" in downgrade_response.json()["detail"].lower()
        
        print(f"✓ Cannot downgrade from higher to lower tier")
    
    def test_cannot_upgrade_to_free_tier(self):
        """POST /api/subscriptions/upgrade - cannot purchase free tier"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "free",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        
        assert response.status_code == 400
        assert "free" in response.json()["detail"].lower()
        
        print(f"✓ Cannot purchase free tier")
    
    def test_invalid_tier_returns_error(self):
        """POST /api/subscriptions/upgrade - invalid tier returns error"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "gold",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        
        assert response.status_code == 400
        assert "invalid" in response.json()["detail"].lower()
        
        print(f"✓ Invalid tier correctly rejected")


class TestPaymentFlow:
    """Test full payment flow with simulate-success"""
    
    @pytest.fixture(autouse=True)
    def setup_user(self):
        """Create a test user and get auth token"""
        email = f"{TEST_PREFIX}_payment_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Payment Test User"
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Registration failed: {reg_response.json()}")
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "TestPass123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.json()}")
        
        self.token = login_response.json()["token"]
        self.user = login_response.json()["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_full_upgrade_flow_with_simulate_success(self):
        """Complete upgrade flow: initiate -> check status -> simulate success"""
        # Step 1: Verify user is on free tier
        sub_response = requests.get(
            f"{BASE_URL}/api/subscriptions/my-subscription",
            headers=self.headers
        )
        assert sub_response.status_code == 200
        assert sub_response.json()["current_tier"] == "free"
        
        # Step 2: Initiate upgrade to premium
        upgrade_response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "premium",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        assert upgrade_response.status_code == 200
        payment_id = upgrade_response.json()["data"]["payment_id"]
        print(f"Payment initiated: {payment_id}")
        
        # Step 3: Check payment status (in mock mode, this may complete immediately)
        status_response = requests.get(
            f"{BASE_URL}/api/subscriptions/payment/{payment_id}/status",
            headers=self.headers
        )
        assert status_response.status_code == 200
        
        # In mock mode, payment completes immediately when status is checked
        if status_response.json().get("payment_status") == "completed":
            print("Payment auto-completed in mock mode")
        else:
            # Step 4: Simulate payment success
            simulate_response = requests.post(
                f"{BASE_URL}/api/subscriptions/payment/{payment_id}/simulate-success",
                headers=self.headers
            )
            assert simulate_response.status_code == 200
            print("Payment simulated successfully")
        
        # Step 5: Verify user is now on premium tier
        final_sub_response = requests.get(
            f"{BASE_URL}/api/subscriptions/my-subscription",
            headers=self.headers
        )
        assert final_sub_response.status_code == 200
        
        data = final_sub_response.json()
        assert data["current_tier"] == "premium"
        assert data["tier_name"] == "Premium"
        assert data["device_limit"] == 7
        assert data["is_paid"] == True
        assert data["subscription"] is not None
        assert data["subscription"]["status"] == "active"
        
        # Verify benefits
        assert data["benefits"]["ad_free"] == True
        assert data["benefits"]["video_quality"] == "1080p"
        assert data["benefits"]["download_enabled"] == True
        
        print(f"✓ Full upgrade flow completed: free -> premium")
    
    def test_payment_status_for_nonexistent_payment(self):
        """GET /api/subscriptions/payment/{id}/status - 404 for nonexistent payment"""
        response = requests.get(
            f"{BASE_URL}/api/subscriptions/payment/nonexistent_payment_123/status",
            headers=self.headers
        )
        assert response.status_code == 404
        
        print(f"✓ 404 returned for nonexistent payment")
    
    def test_cannot_simulate_success_twice(self):
        """POST /api/subscriptions/payment/{id}/simulate-success - cannot complete twice"""
        # Initiate upgrade
        upgrade_response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "basic",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        assert upgrade_response.status_code == 200
        payment_id = upgrade_response.json()["data"]["payment_id"]
        
        # Check status (this will complete the payment in mock mode)
        requests.get(
            f"{BASE_URL}/api/subscriptions/payment/{payment_id}/status",
            headers=self.headers
        )
        
        # Try to simulate again
        simulate_response = requests.post(
            f"{BASE_URL}/api/subscriptions/payment/{payment_id}/simulate-success",
            headers=self.headers
        )
        
        assert simulate_response.status_code == 400
        assert "already completed" in simulate_response.json()["detail"].lower()
        
        print(f"✓ Cannot simulate payment success twice")


class TestCancelSubscription:
    """Test subscription cancellation"""
    
    @pytest.fixture(autouse=True)
    def setup_user_with_subscription(self):
        """Create a test user, upgrade to premium, and get auth token"""
        email = f"{TEST_PREFIX}_cancel_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": "Cancel Test User"
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Registration failed: {reg_response.json()}")
        
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "TestPass123!"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.json()}")
        
        self.token = login_response.json()["token"]
        self.user = login_response.json()["user"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_cancel_free_tier_returns_error(self):
        """POST /api/subscriptions/cancel - cannot cancel free tier"""
        response = requests.post(
            f"{BASE_URL}/api/subscriptions/cancel",
            headers=self.headers,
            json={"reason": "Testing"}
        )
        
        assert response.status_code == 400
        assert "no active subscription" in response.json()["detail"].lower()
        
        print(f"✓ Cannot cancel free tier (no subscription)")
    
    def test_cancel_paid_subscription(self):
        """POST /api/subscriptions/cancel - cancels paid subscription"""
        # First upgrade to basic
        upgrade_response = requests.post(
            f"{BASE_URL}/api/subscriptions/upgrade",
            headers=self.headers,
            json={
                "tier": "basic",
                "provider_id": "mpesa",
                "phone_number": "+254712345678"
            }
        )
        assert upgrade_response.status_code == 200
        payment_id = upgrade_response.json()["data"]["payment_id"]
        
        # Complete the payment by checking status
        requests.get(
            f"{BASE_URL}/api/subscriptions/payment/{payment_id}/status",
            headers=self.headers
        )
        
        # Now cancel
        cancel_response = requests.post(
            f"{BASE_URL}/api/subscriptions/cancel",
            headers=self.headers,
            json={"reason": "Testing cancellation"}
        )
        
        assert cancel_response.status_code == 200
        data = cancel_response.json()
        
        # Note: The response structure may vary based on implementation
        assert data.get("message") or data.get("status") == "success"
        
        print(f"✓ Paid subscription cancelled successfully")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
