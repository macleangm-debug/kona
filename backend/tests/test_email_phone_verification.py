"""
Tests for Email and Phone Verification System
- Email verification: POST /api/auth/send-email-verification, POST /api/auth/verify-email
- Phone verification: POST /api/auth/verify-phone-code
- Verification status: GET /api/auth/verification-status
- Password reset: POST /api/auth/request-password-reset, POST /api/auth/reset-password
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestEmailPhoneVerification:
    """Email and Phone Verification System Tests"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for verification tests"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_verify_{unique_id}@example.com"
        password = "TestPass123!"
        
        # Register a new user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": f"Test Verifier {unique_id}",
            "phone": None,
            "country_code": "254"
        })
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            return {
                "email": email,
                "password": password,
                "token": data.get("token"),
                "user": data.get("user"),
                "unique_id": unique_id
            }
        else:
            pytest.skip(f"Failed to create test user: {response.text}")
    
    @pytest.fixture(scope="class")
    def test_user_with_phone(self):
        """Create a test user with phone for phone verification tests"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_phone_verify_{unique_id}@example.com"
        phone = f"7{unique_id[:8].replace('-', '')}"
        password = "TestPass123!"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": f"Test Phone User {unique_id}",
            "phone": phone,
            "country_code": "254"
        })
        
        if response.status_code == 201 or response.status_code == 200:
            data = response.json()
            return {
                "email": email,
                "password": password,
                "phone": phone,
                "token": data.get("token"),
                "user": data.get("user"),
                "unique_id": unique_id
            }
        else:
            pytest.skip(f"Failed to create test user with phone: {response.text}")
    
    # ==================== EMAIL VERIFICATION TESTS ====================
    
    def test_send_email_verification_success(self, test_user):
        """Test POST /api/auth/send-email-verification - sends code successfully"""
        response = requests.post(
            f"{BASE_URL}/api/auth/send-email-verification",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "message" in data
        assert "email_masked" in data
        
        # In test mode, should return test_code
        assert "test_mode" in data or "test_code" in data, "Expected test_mode or test_code in response"
        
        if "test_code" in data:
            assert len(data["test_code"]) == 6, "Verification code should be 6 digits"
            assert data["test_code"].isdigit(), "Verification code should be numeric"
            # Store code for next test
            test_user["verification_code"] = data["test_code"]
        
        print(f"✓ Email verification code sent successfully. Masked: {data.get('email_masked')}")
    
    def test_send_email_verification_requires_auth(self):
        """Test that send-email-verification requires authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/send-email-verification")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Email verification endpoint requires authentication")
    
    def test_verify_email_success(self, test_user):
        """Test POST /api/auth/verify-email - verifies email with code"""
        # First send verification code
        send_response = requests.post(
            f"{BASE_URL}/api/auth/send-email-verification",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        assert send_response.status_code == 200
        send_data = send_response.json()
        
        code = send_data.get("test_code")
        if not code:
            pytest.skip("No test_code returned - email service may be in production mode")
        
        # Verify with the code
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-email?code={code}",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert "message" in data
        assert "coins_awarded" in data
        assert data["coins_awarded"] == 5, f"Expected 5 coins reward, got {data['coins_awarded']}"
        
        print(f"✓ Email verified successfully! Coins awarded: {data['coins_awarded']}")
    
    def test_verify_email_invalid_code(self, test_user):
        """Test verify-email with invalid code returns error"""
        # Need a fresh user since the previous one might already be verified
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_invalid_code_{unique_id}@example.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": f"Test Invalid Code {unique_id}"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to create test user for invalid code test")
        
        token = reg_response.json().get("token")
        
        # Send verification code first
        requests.post(
            f"{BASE_URL}/api/auth/send-email-verification",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Try to verify with wrong code
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-email?code=000000",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid code, got {response.status_code}"
        print("✓ Invalid verification code correctly rejected")
    
    def test_verify_email_no_code_sent(self):
        """Test verify-email without sending code first"""
        # Create new user
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_no_code_{unique_id}@example.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "name": f"Test No Code {unique_id}"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to create test user")
        
        token = reg_response.json().get("token")
        
        # Try to verify without sending code
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-email?code=123456",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "No verification code found" in response.json().get("detail", "")
        print("✓ Verify without sending code correctly rejected")
    
    def test_verify_email_already_verified(self, test_user):
        """Test that already verified email returns appropriate error"""
        # First verify the email
        send_response = requests.post(
            f"{BASE_URL}/api/auth/send-email-verification",
            headers={"Authorization": f"Bearer {test_user['token']}"}
        )
        
        # If already verified, this will return 400
        if send_response.status_code == 400:
            assert "already verified" in send_response.json().get("detail", "").lower()
            print("✓ Already verified email correctly rejected on send")
        else:
            # Verify it first
            code = send_response.json().get("test_code")
            if code:
                requests.post(
                    f"{BASE_URL}/api/auth/verify-email?code={code}",
                    headers={"Authorization": f"Bearer {test_user['token']}"}
                )
            
            # Now try again
            response = requests.post(
                f"{BASE_URL}/api/auth/send-email-verification",
                headers={"Authorization": f"Bearer {test_user['token']}"}
            )
            
            assert response.status_code == 400
            assert "already verified" in response.json().get("detail", "").lower()
            print("✓ Already verified email correctly rejected")
    
    # ==================== PHONE VERIFICATION TESTS ====================
    
    def test_send_otp_for_phone(self, test_user_with_phone):
        """Test POST /api/auth/send-otp - sends OTP for phone"""
        response = requests.post(f"{BASE_URL}/api/auth/send-otp", json={
            "phone": test_user_with_phone["phone"],
            "country_code": "254",
            "verification_method": "sms"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "message" in data
        assert "expires_in" in data
        
        print(f"✓ OTP sent successfully: {data['message']}")
    
    def test_verify_phone_code_requires_auth(self):
        """Test that verify-phone-code requires authentication"""
        response = requests.post(f"{BASE_URL}/api/auth/verify-phone-code?code=123456")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Phone verification endpoint requires authentication")
    
    def test_verify_phone_code_no_otp(self, test_user_with_phone):
        """Test verify-phone-code without sending OTP first"""
        # Create fresh user
        unique_id = str(uuid.uuid4())[:8]
        phone = f"8{unique_id[:7].replace('-', '')}"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_phone_no_otp_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Phone No OTP {unique_id}",
            "phone": phone,
            "country_code": "254"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to create test user")
        
        token = reg_response.json().get("token")
        
        response = requests.post(
            f"{BASE_URL}/api/auth/verify-phone-code?code=123456",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Phone verification without OTP correctly rejected")
    
    # ==================== VERIFICATION STATUS TESTS ====================
    
    def test_verification_status_unverified(self):
        """Test GET /api/auth/verification-status for unverified user"""
        # Create fresh unverified user
        unique_id = str(uuid.uuid4())[:8]
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_status_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Status {unique_id}",
            "phone": f"6{unique_id[:7].replace('-', '')}",
            "country_code": "254"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to create test user")
        
        token = reg_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/verification-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "email" in data
        assert "email_verified" in data
        assert "phone" in data
        assert "phone_verified" in data
        assert "verification_reward" in data
        assert "features_locked" in data
        
        # Unverified user should have features locked
        assert data["email_verified"] == False
        assert data["phone_verified"] == False
        assert data["features_locked"] == True
        assert data["verification_reward"] == 5
        
        print(f"✓ Verification status for unverified user correct. Features locked: {data['features_locked']}")
    
    def test_verification_status_after_email_verified(self):
        """Test verification status after email is verified"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_verified_status_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Verified Status {unique_id}"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to create test user")
        
        token = reg_response.json().get("token")
        
        # Send and verify email
        send_response = requests.post(
            f"{BASE_URL}/api/auth/send-email-verification",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if send_response.status_code == 200:
            code = send_response.json().get("test_code")
            if code:
                requests.post(
                    f"{BASE_URL}/api/auth/verify-email?code={code}",
                    headers={"Authorization": f"Bearer {token}"}
                )
        
        # Check status
        response = requests.get(
            f"{BASE_URL}/api/auth/verification-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["email_verified"] == True
        assert data["features_locked"] == False, "Features should be unlocked after email verification"
        
        print(f"✓ Verification status after email verification correct. Features locked: {data['features_locked']}")
    
    def test_verification_status_requires_auth(self):
        """Test that verification-status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth/verification-status")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Verification status endpoint requires authentication")
    
    # ==================== PASSWORD RESET TESTS ====================
    
    def test_request_password_reset(self, test_user):
        """Test POST /api/auth/request-password-reset"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-password-reset?email={test_user['email']}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data
        # Message should be vague for security
        assert "if an account exists" in data["message"].lower() or "reset link" in data["message"].lower()
        
        print(f"✓ Password reset request successful: {data['message']}")
    
    def test_request_password_reset_nonexistent_email(self):
        """Test password reset for non-existent email (should return same response for security)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/request-password-reset?email=nonexistent_{uuid.uuid4()}@example.com"
        )
        
        # Should return 200 with vague message for security (don't reveal if account exists)
        assert response.status_code == 200, f"Expected 200 for security, got {response.status_code}"
        
        print("✓ Password reset for non-existent email returns proper security response")
    
    def test_reset_password_invalid_token(self):
        """Test POST /api/auth/reset-password with invalid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password?token=invalid_token_123&new_password=NewPass123!"
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"
        data = response.json()
        
        assert "invalid" in data.get("detail", "").lower() or "expired" in data.get("detail", "").lower()
        
        print("✓ Invalid reset token correctly rejected")
    
    def test_reset_password_short_password(self):
        """Test reset password with too short password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password?token=some_token&new_password=short"
        )
        
        # Either invalid token (400) or password validation error (400)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("✓ Short password or invalid token correctly rejected")
    
    # ==================== COIN REWARD VERIFICATION ====================
    
    def test_email_verification_awards_5_coins(self):
        """Test that email verification awards exactly 5 coins"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create user
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_coins_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Coins {unique_id}"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to create test user")
        
        reg_data = reg_response.json()
        token = reg_data.get("token")
        initial_coins = reg_data.get("user", {}).get("coins", 0)
        
        # Send and verify email
        send_response = requests.post(
            f"{BASE_URL}/api/auth/send-email-verification",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if send_response.status_code != 200:
            pytest.skip("Failed to send verification email")
        
        code = send_response.json().get("test_code")
        if not code:
            pytest.skip("No test code returned")
        
        verify_response = requests.post(
            f"{BASE_URL}/api/auth/verify-email?code={code}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        
        assert verify_data["coins_awarded"] == 5
        
        # Verify coins were actually added by checking user profile
        me_response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if me_response.status_code == 200:
            new_coins = me_response.json().get("coins", 0)
            assert new_coins == initial_coins + 5, f"Expected {initial_coins + 5} coins, got {new_coins}"
            print(f"✓ Email verification awarded 5 coins. Before: {initial_coins}, After: {new_coins}")
        else:
            print(f"✓ Email verification response claims 5 coins awarded")


class TestUserRegistrationVerificationFields:
    """Test that new users have correct verification fields"""
    
    def test_new_user_has_verification_fields(self):
        """Test that newly registered user has phone_verified and email_verified fields"""
        unique_id = str(uuid.uuid4())[:8]
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_fields_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Fields {unique_id}"
        })
        
        assert response.status_code in [200, 201], f"Registration failed: {response.text}"
        data = response.json()
        user = data.get("user", {})
        
        # Check verification fields exist and are False
        assert "phone_verified" in user, "Missing phone_verified field"
        assert "email_verified" in user, "Missing email_verified field"
        assert user["phone_verified"] == False
        assert user["email_verified"] == False
        
        print(f"✓ New user has correct verification fields: email_verified={user['email_verified']}, phone_verified={user['phone_verified']}")
    
    def test_login_returns_verification_fields(self):
        """Test that login response includes verification fields"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"TEST_login_fields_{unique_id}@example.com"
        password = "TestPass123!"
        
        # Register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "name": f"Test Login Fields {unique_id}"
        })
        
        # Login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        user = data.get("user", {})
        
        assert "phone_verified" in user, "Missing phone_verified in login response"
        assert "email_verified" in user, "Missing email_verified in login response"
        
        print(f"✓ Login response includes verification fields")
    
    def test_me_endpoint_returns_verification_fields(self):
        """Test that /auth/me includes verification fields"""
        unique_id = str(uuid.uuid4())[:8]
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"TEST_me_fields_{unique_id}@example.com",
            "password": "TestPass123!",
            "name": f"Test Me Fields {unique_id}"
        })
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip("Failed to register")
        
        token = reg_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        user = response.json()
        
        assert "phone_verified" in user, "Missing phone_verified in /me response"
        assert "email_verified" in user, "Missing email_verified in /me response"
        
        print(f"✓ /auth/me includes verification fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
