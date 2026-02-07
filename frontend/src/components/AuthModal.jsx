import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Phone, Mail, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { APP_CONFIG, API } from "@/config";
import { toast } from "sonner";
import axios from "axios";
import { LoginSuccessModal, SignupSuccessModal } from "@/components/AnimatedModals";

// African countries with phone codes
const COUNTRIES = [
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪" },
  { code: "TZ", name: "Tanzania", dialCode: "255", flag: "🇹🇿" },
  { code: "UG", name: "Uganda", dialCode: "256", flag: "🇺🇬" },
  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭" },
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦" },
  { code: "RW", name: "Rwanda", dialCode: "250", flag: "🇷🇼" },
  { code: "ET", name: "Ethiopia", dialCode: "251", flag: "🇪🇹" },
  { code: "SN", name: "Senegal", dialCode: "221", flag: "🇸🇳" },
  { code: "CI", name: "Ivory Coast", dialCode: "225", flag: "🇨🇮" },
  { code: "CM", name: "Cameroon", dialCode: "237", flag: "🇨🇲" },
  { code: "ZM", name: "Zambia", dialCode: "260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dialCode: "263", flag: "🇿🇼" },
  { code: "MW", name: "Malawi", dialCode: "265", flag: "🇲🇼" },
  { code: "BW", name: "Botswana", dialCode: "267", flag: "🇧🇼" },
];

export const AuthModal = ({ open, onClose, initialReferralCode = "", forceSignUp = false }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(initialReferralCode || forceSignUp ? false : true);
  const [authMethod, setAuthMethod] = useState("phone"); // "phone" or "email"
  
  // Form fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  
  // Country selection
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // Default to Kenya
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  
  // OTP verification
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [verificationMethod, setVerificationMethod] = useState("whatsapp");
  
  // Validation
  const [referralValid, setReferralValid] = useState(null);
  const [referralBonus, setReferralBonus] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  
  const { login, register, user } = useAuth();
  
  // Success modal states
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [signupBonusInfo, setSignupBonusInfo] = useState({ welcome: 0, referral: 0 });

  // Update referral code when initialReferralCode changes
  useEffect(() => {
    if (initialReferralCode) {
      setReferralCode(initialReferralCode);
      setIsLogin(false);
    }
  }, [initialReferralCode]);

  // Force signup mode when prop changes
  useEffect(() => {
    if (forceSignUp && open) {
      setIsLogin(false);
    }
  }, [forceSignUp, open]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Validate referral code
  useEffect(() => {
    const validateCode = async () => {
      if (referralCode.length >= 6) {
        try {
          const res = await axios.get(`${API}/referral/validate/${referralCode}`);
          setReferralValid(res.data.valid);
          if (res.data.valid) {
            setReferralBonus(res.data.bonus_coins);
          }
        } catch (e) {
          setReferralValid(false);
        }
      } else {
        setReferralValid(null);
      }
    };
    if (!isLogin && referralCode) {
      validateCode();
    }
  }, [referralCode, isLogin]);

  const handleSendOTP = async () => {
    if (!phone) {
      toast.error("Please enter your phone number");
      return;
    }
    
    setSendingOTP(true);
    try {
      await axios.post(`${API}/auth/send-otp`, {
        phone: phone,
        country_code: selectedCountry.dialCode,
        verification_method: verificationMethod
      });
      
      setOtpSent(true);
      setShowOTPInput(true);
      setResendTimer(60);
      toast.success(`Verification code sent via ${verificationMethod === 'whatsapp' ? 'WhatsApp' : verificationMethod === 'flash_call' ? 'call' : 'SMS'}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send verification code");
    }
    setSendingOTP(false);
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      toast.error("Please enter the complete 6-digit code");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/verify-otp`, {
        phone: phone,
        country_code: selectedCountry.dialCode,
        otp: otpString
      });
      
      setOtpVerified(true);
      toast.success("Phone number verified!");
      
      // Auto-proceed with registration if all fields are filled
      if (!isLogin && name && password) {
        await handleSubmit();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code");
      setOtp(["", "", "", "", "", ""]);
    }
    setLoading(false);
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
    
    // Auto-verify when complete
    if (newOtp.every(d => d) && newOtp.join("").length === 6) {
      setTimeout(() => handleVerifyOTP(), 300);
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        // Login
        if (authMethod === "email") {
          await login(email, password);
        } else {
          await login(null, password, `+${selectedCountry.dialCode}${phone}`);
        }
        setShowLoginSuccess(true);
      } else {
        // Register
        const registerData = {
          name,
          password,
          referral_code: referralValid ? referralCode : null
        };
        
        if (authMethod === "email") {
          registerData.email = email;
        } else {
          registerData.phone = phone;
          registerData.country_code = selectedCountry.dialCode;
        }
        
        await register(registerData);
        
        setSignupBonusInfo({
          welcome: APP_CONFIG.welcomeBonus,
          referral: referralValid ? APP_CONFIG.referralBonus : 0
        });
        setShowSignupSuccess(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  const handleSuccessClose = () => {
    setShowLoginSuccess(false);
    setShowSignupSuccess(false);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setEmail("");
    setPhone("");
    setPassword("");
    setName("");
    setReferralCode("");
    setOtp(["", "", "", "", "", ""]);
    setOtpSent(false);
    setOtpVerified(false);
    setShowOTPInput(false);
  };

  const switchAuthMethod = (method) => {
    setAuthMethod(method);
    resetForm();
  };

  return (
    <>
      <Dialog open={open && !showLoginSuccess && !showSignupSuccess} onOpenChange={onClose}>
        <DialogContent className="max-w-[380px] bg-card border-white/10 p-0 overflow-hidden" data-testid="auth-modal">
          {/* Auth Method Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => switchAuthMethod("phone")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                authMethod === "phone" 
                  ? "text-primary border-b-2 border-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-white"
              }`}
              data-testid="auth-phone-tab"
            >
              <Phone className="w-4 h-4" />
              Phone
            </button>
            <button
              onClick={() => switchAuthMethod("email")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                authMethod === "email" 
                  ? "text-primary border-b-2 border-primary bg-primary/5" 
                  : "text-muted-foreground hover:text-white"
              }`}
              data-testid="auth-email-tab"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
          </div>

          <div className="p-6">
            <DialogHeader className="mb-4">
              <DialogTitle className="font-heading text-2xl">
                {isLogin ? "Welcome Back" : "Join Kona"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {isLogin 
                  ? `Sign in with your ${authMethod}` 
                  : `Create an account with your ${authMethod}`
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name field (signup only) */}
              {!isLogin && (
                <Input
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50 border-white/10"
                  data-testid="auth-name-input"
                  required
                />
              )}

              {/* Phone Number Input */}
              {authMethod === "phone" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {/* Country Selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCountryPicker(!showCountryPicker)}
                        className="flex items-center gap-1 h-10 px-3 rounded-lg bg-secondary/50 border border-white/10 hover:border-white/20 transition-colors"
                        data-testid="country-selector"
                      >
                        <span className="text-lg">{selectedCountry.flag}</span>
                        <span className="text-sm text-muted-foreground">+{selectedCountry.dialCode}</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </button>
                      
                      {/* Country Dropdown */}
                      {showCountryPicker && (
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto bg-card border border-white/10 rounded-lg shadow-xl z-50">
                          {COUNTRIES.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(country);
                                setShowCountryPicker(false);
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
                                selectedCountry.code === country.code ? 'bg-primary/10' : ''
                              }`}
                            >
                              <span className="text-lg">{country.flag}</span>
                              <span className="flex-1 text-sm">{country.name}</span>
                              <span className="text-xs text-muted-foreground">+{country.dialCode}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Phone Input */}
                    <Input
                      type="tel"
                      placeholder="712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-secondary/50 border-white/10"
                      data-testid="auth-phone-input"
                      required
                    />
                  </div>

                  {/* Verification Method (signup only) */}
                  {!isLogin && !otpVerified && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Verify via:</p>
                      <div className="flex gap-2">
                        {[
                          { value: "whatsapp", label: "WhatsApp", icon: "💬" },
                          { value: "flash_call", label: "Flash Call", icon: "📞" },
                          { value: "sms", label: "SMS", icon: "📱" }
                        ].map((method) => (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setVerificationMethod(method.value)}
                            className={`flex-1 flex items-center justify-center gap-1 py-2 px-2 text-xs rounded-lg border transition-colors ${
                              verificationMethod === method.value
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-white/10 text-muted-foreground hover:border-white/20'
                            }`}
                          >
                            <span>{method.icon}</span>
                            <span>{method.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* OTP Input */}
                  {showOTPInput && !otpVerified && (
                    <div className="space-y-3 pt-2">
                      <p className="text-sm text-center text-muted-foreground">
                        Enter the 6-digit code sent to<br />
                        <span className="text-white font-medium">+{selectedCountry.dialCode} {phone}</span>
                      </p>
                      <div className="flex justify-center gap-2">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOTPChange(index, e.target.value)}
                            onKeyDown={(e) => handleOTPKeyDown(index, e)}
                            className="w-10 h-12 text-center text-lg font-bold bg-secondary/50 border border-white/10 rounded-lg focus:border-primary focus:outline-none"
                            data-testid={`otp-input-${index}`}
                          />
                        ))}
                      </div>
                      <div className="text-center">
                        {resendTimer > 0 ? (
                          <p className="text-xs text-muted-foreground">Resend in {resendTimer}s</p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            className="text-xs text-primary hover:underline"
                          >
                            Resend code
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Send OTP / Verified Badge */}
                  {!isLogin && !otpSent && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOTP}
                      disabled={sendingOTP || !phone}
                      className="w-full"
                      data-testid="send-otp-btn"
                    >
                      {sendingOTP ? <Loader2 className="animate-spin mr-2" /> : null}
                      Send Verification Code
                    </Button>
                  )}

                  {otpVerified && (
                    <div className="flex items-center justify-center gap-2 py-2 text-green-500">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Phone Verified</span>
                    </div>
                  )}
                </div>
              )}

              {/* Email Input */}
              {authMethod === "email" && (
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary/50 border-white/10"
                  data-testid="auth-email-input"
                  required
                />
              )}

              {/* Password */}
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary/50 border-white/10"
                data-testid="auth-password-input"
                required
              />

              {/* Referral Code (signup only) */}
              {!isLogin && (
                <div className="relative">
                  <Input
                    placeholder="Referral code (optional)"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    className={`bg-secondary/50 border-white/10 pr-10 ${
                      referralValid === true ? "border-green-500" : referralValid === false ? "border-red-500" : ""
                    }`}
                    data-testid="auth-referral-input"
                  />
                  {referralValid === true && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Check className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                  {referralValid === true && (
                    <p className="text-xs text-green-400 mt-1">+{referralBonus} bonus coins!</p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 rounded-full"
                disabled={loading || (authMethod === "phone" && !isLogin && !otpVerified)}
                data-testid="auth-submit-btn"
              >
                {loading ? <Loader2 className="animate-spin" /> : isLogin ? "Sign In" : "Create Account"}
              </Button>

              {/* Terms Agreement (signup only) */}
              {!isLogin && (
                <p className="text-xs text-center text-muted-foreground">
                  By signing up, you agree to our{" "}
                  <button 
                    type="button" 
                    onClick={() => { onClose(); navigate("/terms"); }}
                    className="text-primary hover:underline"
                  >
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button 
                    type="button" 
                    onClick={() => { onClose(); navigate("/privacy"); }}
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </button>
                </p>
              )}
            </form>

            {/* Toggle Login/Signup */}
            <p className="text-center text-sm text-muted-foreground mt-4">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  resetForm();
                }}
                className="text-primary hover:underline"
                data-testid="auth-toggle-btn"
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Success Modal */}
      <LoginSuccessModal
        open={showLoginSuccess}
        onOpenChange={setShowLoginSuccess}
        userName={user?.name || name}
        onConfirm={handleSuccessClose}
      />

      {/* Signup Success Modal */}
      <SignupSuccessModal
        open={showSignupSuccess}
        onOpenChange={setShowSignupSuccess}
        bonusCoins={signupBonusInfo.welcome}
        referralBonus={signupBonusInfo.referral}
        onConfirm={handleSuccessClose}
      />
    </>
  );
};

export default AuthModal;
