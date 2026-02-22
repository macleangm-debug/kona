import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, Phone, Mail, ChevronDown, Eye, EyeOff, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { APP_CONFIG, API } from "@/config";
import { toast } from "sonner";
import axios from "axios";
import { LoginSuccessModal, SignupSuccessModal } from "@/components/AnimatedModals";

// All countries with phone codes (sorted alphabetically)
const COUNTRIES = [
  { code: "AF", name: "Afghanistan", dialCode: "93", flag: "🇦🇫" },
  { code: "AL", name: "Albania", dialCode: "355", flag: "🇦🇱" },
  { code: "DZ", name: "Algeria", dialCode: "213", flag: "🇩🇿" },
  { code: "AD", name: "Andorra", dialCode: "376", flag: "🇦🇩" },
  { code: "AO", name: "Angola", dialCode: "244", flag: "🇦🇴" },
  { code: "AG", name: "Antigua and Barbuda", dialCode: "1268", flag: "🇦🇬" },
  { code: "AR", name: "Argentina", dialCode: "54", flag: "🇦🇷" },
  { code: "AM", name: "Armenia", dialCode: "374", flag: "🇦🇲" },
  { code: "AU", name: "Australia", dialCode: "61", flag: "🇦🇺" },
  { code: "AT", name: "Austria", dialCode: "43", flag: "🇦🇹" },
  { code: "AZ", name: "Azerbaijan", dialCode: "994", flag: "🇦🇿" },
  { code: "BS", name: "Bahamas", dialCode: "1242", flag: "🇧🇸" },
  { code: "BH", name: "Bahrain", dialCode: "973", flag: "🇧🇭" },
  { code: "BD", name: "Bangladesh", dialCode: "880", flag: "🇧🇩" },
  { code: "BB", name: "Barbados", dialCode: "1246", flag: "🇧🇧" },
  { code: "BY", name: "Belarus", dialCode: "375", flag: "🇧🇾" },
  { code: "BE", name: "Belgium", dialCode: "32", flag: "🇧🇪" },
  { code: "BZ", name: "Belize", dialCode: "501", flag: "🇧🇿" },
  { code: "BJ", name: "Benin", dialCode: "229", flag: "🇧🇯" },
  { code: "BT", name: "Bhutan", dialCode: "975", flag: "🇧🇹" },
  { code: "BO", name: "Bolivia", dialCode: "591", flag: "🇧🇴" },
  { code: "BA", name: "Bosnia and Herzegovina", dialCode: "387", flag: "🇧🇦" },
  { code: "BW", name: "Botswana", dialCode: "267", flag: "🇧🇼" },
  { code: "BR", name: "Brazil", dialCode: "55", flag: "🇧🇷" },
  { code: "BN", name: "Brunei", dialCode: "673", flag: "🇧🇳" },
  { code: "BG", name: "Bulgaria", dialCode: "359", flag: "🇧🇬" },
  { code: "BF", name: "Burkina Faso", dialCode: "226", flag: "🇧🇫" },
  { code: "BI", name: "Burundi", dialCode: "257", flag: "🇧🇮" },
  { code: "KH", name: "Cambodia", dialCode: "855", flag: "🇰🇭" },
  { code: "CM", name: "Cameroon", dialCode: "237", flag: "🇨🇲" },
  { code: "CA", name: "Canada", dialCode: "1", flag: "🇨🇦" },
  { code: "CV", name: "Cape Verde", dialCode: "238", flag: "🇨🇻" },
  { code: "CF", name: "Central African Republic", dialCode: "236", flag: "🇨🇫" },
  { code: "TD", name: "Chad", dialCode: "235", flag: "🇹🇩" },
  { code: "CL", name: "Chile", dialCode: "56", flag: "🇨🇱" },
  { code: "CN", name: "China", dialCode: "86", flag: "🇨🇳" },
  { code: "CO", name: "Colombia", dialCode: "57", flag: "🇨🇴" },
  { code: "KM", name: "Comoros", dialCode: "269", flag: "🇰🇲" },
  { code: "CG", name: "Congo", dialCode: "242", flag: "🇨🇬" },
  { code: "CD", name: "Congo (DRC)", dialCode: "243", flag: "🇨🇩" },
  { code: "CR", name: "Costa Rica", dialCode: "506", flag: "🇨🇷" },
  { code: "CI", name: "Côte d'Ivoire", dialCode: "225", flag: "🇨🇮" },
  { code: "HR", name: "Croatia", dialCode: "385", flag: "🇭🇷" },
  { code: "CU", name: "Cuba", dialCode: "53", flag: "🇨🇺" },
  { code: "CY", name: "Cyprus", dialCode: "357", flag: "🇨🇾" },
  { code: "CZ", name: "Czech Republic", dialCode: "420", flag: "🇨🇿" },
  { code: "DK", name: "Denmark", dialCode: "45", flag: "🇩🇰" },
  { code: "DJ", name: "Djibouti", dialCode: "253", flag: "🇩🇯" },
  { code: "DM", name: "Dominica", dialCode: "1767", flag: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", dialCode: "1809", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador", dialCode: "593", flag: "🇪🇨" },
  { code: "EG", name: "Egypt", dialCode: "20", flag: "🇪🇬" },
  { code: "SV", name: "El Salvador", dialCode: "503", flag: "🇸🇻" },
  { code: "GQ", name: "Equatorial Guinea", dialCode: "240", flag: "🇬🇶" },
  { code: "ER", name: "Eritrea", dialCode: "291", flag: "🇪🇷" },
  { code: "EE", name: "Estonia", dialCode: "372", flag: "🇪🇪" },
  { code: "SZ", name: "Eswatini", dialCode: "268", flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia", dialCode: "251", flag: "🇪🇹" },
  { code: "FJ", name: "Fiji", dialCode: "679", flag: "🇫🇯" },
  { code: "FI", name: "Finland", dialCode: "358", flag: "🇫🇮" },
  { code: "FR", name: "France", dialCode: "33", flag: "🇫🇷" },
  { code: "GA", name: "Gabon", dialCode: "241", flag: "🇬🇦" },
  { code: "GM", name: "Gambia", dialCode: "220", flag: "🇬🇲" },
  { code: "GE", name: "Georgia", dialCode: "995", flag: "🇬🇪" },
  { code: "DE", name: "Germany", dialCode: "49", flag: "🇩🇪" },
  { code: "GH", name: "Ghana", dialCode: "233", flag: "🇬🇭" },
  { code: "GR", name: "Greece", dialCode: "30", flag: "🇬🇷" },
  { code: "GD", name: "Grenada", dialCode: "1473", flag: "🇬🇩" },
  { code: "GT", name: "Guatemala", dialCode: "502", flag: "🇬🇹" },
  { code: "GN", name: "Guinea", dialCode: "224", flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau", dialCode: "245", flag: "🇬🇼" },
  { code: "GY", name: "Guyana", dialCode: "592", flag: "🇬🇾" },
  { code: "HT", name: "Haiti", dialCode: "509", flag: "🇭🇹" },
  { code: "HN", name: "Honduras", dialCode: "504", flag: "🇭🇳" },
  { code: "HK", name: "Hong Kong", dialCode: "852", flag: "🇭🇰" },
  { code: "HU", name: "Hungary", dialCode: "36", flag: "🇭🇺" },
  { code: "IS", name: "Iceland", dialCode: "354", flag: "🇮🇸" },
  { code: "IN", name: "India", dialCode: "91", flag: "🇮🇳" },
  { code: "ID", name: "Indonesia", dialCode: "62", flag: "🇮🇩" },
  { code: "IR", name: "Iran", dialCode: "98", flag: "🇮🇷" },
  { code: "IQ", name: "Iraq", dialCode: "964", flag: "🇮🇶" },
  { code: "IE", name: "Ireland", dialCode: "353", flag: "🇮🇪" },
  { code: "IL", name: "Israel", dialCode: "972", flag: "🇮🇱" },
  { code: "IT", name: "Italy", dialCode: "39", flag: "🇮🇹" },
  { code: "JM", name: "Jamaica", dialCode: "1876", flag: "🇯🇲" },
  { code: "JP", name: "Japan", dialCode: "81", flag: "🇯🇵" },
  { code: "JO", name: "Jordan", dialCode: "962", flag: "🇯🇴" },
  { code: "KZ", name: "Kazakhstan", dialCode: "7", flag: "🇰🇿" },
  { code: "KE", name: "Kenya", dialCode: "254", flag: "🇰🇪" },
  { code: "KI", name: "Kiribati", dialCode: "686", flag: "🇰🇮" },
  { code: "KP", name: "North Korea", dialCode: "850", flag: "🇰🇵" },
  { code: "KR", name: "South Korea", dialCode: "82", flag: "🇰🇷" },
  { code: "KW", name: "Kuwait", dialCode: "965", flag: "🇰🇼" },
  { code: "KG", name: "Kyrgyzstan", dialCode: "996", flag: "🇰🇬" },
  { code: "LA", name: "Laos", dialCode: "856", flag: "🇱🇦" },
  { code: "LV", name: "Latvia", dialCode: "371", flag: "🇱🇻" },
  { code: "LB", name: "Lebanon", dialCode: "961", flag: "🇱🇧" },
  { code: "LS", name: "Lesotho", dialCode: "266", flag: "🇱🇸" },
  { code: "LR", name: "Liberia", dialCode: "231", flag: "🇱🇷" },
  { code: "LY", name: "Libya", dialCode: "218", flag: "🇱🇾" },
  { code: "LI", name: "Liechtenstein", dialCode: "423", flag: "🇱🇮" },
  { code: "LT", name: "Lithuania", dialCode: "370", flag: "🇱🇹" },
  { code: "LU", name: "Luxembourg", dialCode: "352", flag: "🇱🇺" },
  { code: "MO", name: "Macau", dialCode: "853", flag: "🇲🇴" },
  { code: "MG", name: "Madagascar", dialCode: "261", flag: "🇲🇬" },
  { code: "MW", name: "Malawi", dialCode: "265", flag: "🇲🇼" },
  { code: "MY", name: "Malaysia", dialCode: "60", flag: "🇲🇾" },
  { code: "MV", name: "Maldives", dialCode: "960", flag: "🇲🇻" },
  { code: "ML", name: "Mali", dialCode: "223", flag: "🇲🇱" },
  { code: "MT", name: "Malta", dialCode: "356", flag: "🇲🇹" },
  { code: "MH", name: "Marshall Islands", dialCode: "692", flag: "🇲🇭" },
  { code: "MR", name: "Mauritania", dialCode: "222", flag: "🇲🇷" },
  { code: "MU", name: "Mauritius", dialCode: "230", flag: "🇲🇺" },
  { code: "MX", name: "Mexico", dialCode: "52", flag: "🇲🇽" },
  { code: "FM", name: "Micronesia", dialCode: "691", flag: "🇫🇲" },
  { code: "MD", name: "Moldova", dialCode: "373", flag: "🇲🇩" },
  { code: "MC", name: "Monaco", dialCode: "377", flag: "🇲🇨" },
  { code: "MN", name: "Mongolia", dialCode: "976", flag: "🇲🇳" },
  { code: "ME", name: "Montenegro", dialCode: "382", flag: "🇲🇪" },
  { code: "MA", name: "Morocco", dialCode: "212", flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique", dialCode: "258", flag: "🇲🇿" },
  { code: "MM", name: "Myanmar", dialCode: "95", flag: "🇲🇲" },
  { code: "NA", name: "Namibia", dialCode: "264", flag: "🇳🇦" },
  { code: "NR", name: "Nauru", dialCode: "674", flag: "🇳🇷" },
  { code: "NP", name: "Nepal", dialCode: "977", flag: "🇳🇵" },
  { code: "NL", name: "Netherlands", dialCode: "31", flag: "🇳🇱" },
  { code: "NZ", name: "New Zealand", dialCode: "64", flag: "🇳🇿" },
  { code: "NI", name: "Nicaragua", dialCode: "505", flag: "🇳🇮" },
  { code: "NE", name: "Niger", dialCode: "227", flag: "🇳🇪" },
  { code: "NG", name: "Nigeria", dialCode: "234", flag: "🇳🇬" },
  { code: "MK", name: "North Macedonia", dialCode: "389", flag: "🇲🇰" },
  { code: "NO", name: "Norway", dialCode: "47", flag: "🇳🇴" },
  { code: "OM", name: "Oman", dialCode: "968", flag: "🇴🇲" },
  { code: "PK", name: "Pakistan", dialCode: "92", flag: "🇵🇰" },
  { code: "PW", name: "Palau", dialCode: "680", flag: "🇵🇼" },
  { code: "PS", name: "Palestine", dialCode: "970", flag: "🇵🇸" },
  { code: "PA", name: "Panama", dialCode: "507", flag: "🇵🇦" },
  { code: "PG", name: "Papua New Guinea", dialCode: "675", flag: "🇵🇬" },
  { code: "PY", name: "Paraguay", dialCode: "595", flag: "🇵🇾" },
  { code: "PE", name: "Peru", dialCode: "51", flag: "🇵🇪" },
  { code: "PH", name: "Philippines", dialCode: "63", flag: "🇵🇭" },
  { code: "PL", name: "Poland", dialCode: "48", flag: "🇵🇱" },
  { code: "PT", name: "Portugal", dialCode: "351", flag: "🇵🇹" },
  { code: "QA", name: "Qatar", dialCode: "974", flag: "🇶🇦" },
  { code: "RO", name: "Romania", dialCode: "40", flag: "🇷🇴" },
  { code: "RU", name: "Russia", dialCode: "7", flag: "🇷🇺" },
  { code: "RW", name: "Rwanda", dialCode: "250", flag: "🇷🇼" },
  { code: "KN", name: "Saint Kitts and Nevis", dialCode: "1869", flag: "🇰🇳" },
  { code: "LC", name: "Saint Lucia", dialCode: "1758", flag: "🇱🇨" },
  { code: "VC", name: "Saint Vincent", dialCode: "1784", flag: "🇻🇨" },
  { code: "WS", name: "Samoa", dialCode: "685", flag: "🇼🇸" },
  { code: "SM", name: "San Marino", dialCode: "378", flag: "🇸🇲" },
  { code: "ST", name: "São Tomé and Príncipe", dialCode: "239", flag: "🇸🇹" },
  { code: "SA", name: "Saudi Arabia", dialCode: "966", flag: "🇸🇦" },
  { code: "SN", name: "Senegal", dialCode: "221", flag: "🇸🇳" },
  { code: "RS", name: "Serbia", dialCode: "381", flag: "🇷🇸" },
  { code: "SC", name: "Seychelles", dialCode: "248", flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone", dialCode: "232", flag: "🇸🇱" },
  { code: "SG", name: "Singapore", dialCode: "65", flag: "🇸🇬" },
  { code: "SK", name: "Slovakia", dialCode: "421", flag: "🇸🇰" },
  { code: "SI", name: "Slovenia", dialCode: "386", flag: "🇸🇮" },
  { code: "SB", name: "Solomon Islands", dialCode: "677", flag: "🇸🇧" },
  { code: "SO", name: "Somalia", dialCode: "252", flag: "🇸🇴" },
  { code: "ZA", name: "South Africa", dialCode: "27", flag: "🇿🇦" },
  { code: "SS", name: "South Sudan", dialCode: "211", flag: "🇸🇸" },
  { code: "ES", name: "Spain", dialCode: "34", flag: "🇪🇸" },
  { code: "LK", name: "Sri Lanka", dialCode: "94", flag: "🇱🇰" },
  { code: "SD", name: "Sudan", dialCode: "249", flag: "🇸🇩" },
  { code: "SR", name: "Suriname", dialCode: "597", flag: "🇸🇷" },
  { code: "SE", name: "Sweden", dialCode: "46", flag: "🇸🇪" },
  { code: "CH", name: "Switzerland", dialCode: "41", flag: "🇨🇭" },
  { code: "SY", name: "Syria", dialCode: "963", flag: "🇸🇾" },
  { code: "TW", name: "Taiwan", dialCode: "886", flag: "🇹🇼" },
  { code: "TJ", name: "Tajikistan", dialCode: "992", flag: "🇹🇯" },
  { code: "TZ", name: "Tanzania", dialCode: "255", flag: "🇹🇿" },
  { code: "TH", name: "Thailand", dialCode: "66", flag: "🇹🇭" },
  { code: "TL", name: "Timor-Leste", dialCode: "670", flag: "🇹🇱" },
  { code: "TG", name: "Togo", dialCode: "228", flag: "🇹🇬" },
  { code: "TO", name: "Tonga", dialCode: "676", flag: "🇹🇴" },
  { code: "TT", name: "Trinidad and Tobago", dialCode: "1868", flag: "🇹🇹" },
  { code: "TN", name: "Tunisia", dialCode: "216", flag: "🇹🇳" },
  { code: "TR", name: "Turkey", dialCode: "90", flag: "🇹🇷" },
  { code: "TM", name: "Turkmenistan", dialCode: "993", flag: "🇹🇲" },
  { code: "TV", name: "Tuvalu", dialCode: "688", flag: "🇹🇻" },
  { code: "UG", name: "Uganda", dialCode: "256", flag: "🇺🇬" },
  { code: "UA", name: "Ukraine", dialCode: "380", flag: "🇺🇦" },
  { code: "AE", name: "United Arab Emirates", dialCode: "971", flag: "🇦🇪" },
  { code: "GB", name: "United Kingdom", dialCode: "44", flag: "🇬🇧" },
  { code: "US", name: "United States", dialCode: "1", flag: "🇺🇸" },
  { code: "UY", name: "Uruguay", dialCode: "598", flag: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", dialCode: "998", flag: "🇺🇿" },
  { code: "VU", name: "Vanuatu", dialCode: "678", flag: "🇻🇺" },
  { code: "VA", name: "Vatican City", dialCode: "379", flag: "🇻🇦" },
  { code: "VE", name: "Venezuela", dialCode: "58", flag: "🇻🇪" },
  { code: "VN", name: "Vietnam", dialCode: "84", flag: "🇻🇳" },
  { code: "YE", name: "Yemen", dialCode: "967", flag: "🇾🇪" },
  { code: "ZM", name: "Zambia", dialCode: "260", flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", dialCode: "263", flag: "🇿🇼" },
];

// Find country by code
const findCountryByCode = (code) => {
  return COUNTRIES.find(c => c.code === code) || COUNTRIES.find(c => c.code === "TZ");
};

export const AuthModal = ({ open, onClose, initialReferralCode = "", forceSignUp = false }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(initialReferralCode || forceSignUp ? false : true);
  const [authMethod, setAuthMethod] = useState("phone"); // "phone" or "email"
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false); // Forgot password inline mode
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  
  // Track if modal is transitioning to prevent race conditions
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [referralCode, setReferralCode] = useState(initialReferralCode);
  
  // Country selection - default to Tanzania, but will try to auto-detect
  const [selectedCountry, setSelectedCountry] = useState(findCountryByCode("TZ"));
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  
  // Auto-detect country on mount
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const res = await axios.get("https://ipapi.co/json/", { timeout: 3000 });
        if (res.data?.country_code) {
          const detected = findCountryByCode(res.data.country_code);
          if (detected) {
            setSelectedCountry(detected);
          }
        }
      } catch (e) {
        // Silently fail - keep default
      }
    };
    detectCountry();
  }, []);
  
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
  
  // Anti-bot protection (invisible to users)
  const [honeypot, setHoneypot] = useState(""); // Should remain empty - bots fill this
  const [formLoadTime] = useState(Date.now()); // Track when form loaded

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

  // Validate referral code with debouncing to prevent lag
  const referralValidationTimer = useRef(null);
  
  useEffect(() => {
    // Clear previous timer
    if (referralValidationTimer.current) {
      clearTimeout(referralValidationTimer.current);
    }
    
    if (!isLogin && referralCode && referralCode.length >= 6) {
      // Debounce validation by 500ms
      referralValidationTimer.current = setTimeout(async () => {
        try {
          const res = await axios.get(`${API}/referral/validate/${referralCode}`);
          setReferralValid(res.data.valid);
          if (res.data.valid) {
            setReferralBonus(res.data.bonus_coins);
          }
        } catch (e) {
          setReferralValid(false);
        }
      }, 500);
    } else if (referralCode.length < 6) {
      setReferralValid(null);
    }
    
    return () => {
      if (referralValidationTimer.current) {
        clearTimeout(referralValidationTimer.current);
      }
    };
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
    
    // Anti-bot checks (invisible to users)
    const timeTaken = Date.now() - formLoadTime;
    
    // Check 1: Honeypot field should be empty (bots fill hidden fields)
    if (honeypot) {
      console.log("Bot detected: honeypot filled");
      // Silently reject - don't alert the bot
      toast.error("Something went wrong. Please try again.");
      return;
    }
    
    // Check 2: Form submitted too fast (< 3 seconds = likely bot)
    if (timeTaken < 3000 && !isLogin) {
      console.log("Bot detected: form submitted too fast", timeTaken);
      toast.error("Please take your time filling the form.");
      return;
    }
    
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
        // Register - include anti-bot metadata
        const registerData = {
          name,
          password,
          referral_code: referralValid ? referralCode : null,
          // Anti-bot metadata (backend will validate)
          bot_check: {
            form_time: timeTaken,
            hp: honeypot ? "filled" : "empty"
          }
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
    // Prevent rapid switching during transition
    if (isTransitioning || authMethod === method) return;
    
    setIsTransitioning(true);
    
    // Use callback form to ensure state updates are atomic
    setAuthMethod(method);
    
    // Reset form fields atomically
    setEmail("");
    setPhone("");
    setPassword("");
    setName("");
    setReferralCode("");
    setOtp(["", "", "", "", "", ""]);
    setOtpSent(false);
    setOtpVerified(false);
    setShowOTPInput(false);
    setReferralValid(null);
    setReferralBonus(0);
    
    // Allow transitions again after state settles
    requestAnimationFrame(() => {
      setIsTransitioning(false);
    });
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
            {/* Forgot Password Mode */}
            {forgotPasswordMode ? (
              <div className="space-y-4">
                <button 
                  type="button"
                  onClick={() => {
                    setForgotPasswordMode(false);
                    setForgotPasswordSent(false);
                  }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white"
                >
                  ← Back to login
                </button>
                
                {!forgotPasswordSent ? (
                  <>
                    <DialogHeader>
                      <DialogTitle className="font-heading text-2xl">
                        Forgot Password?
                      </DialogTitle>
                      <DialogDescription>
                        Enter your email and we'll send you a reset link.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        className="bg-secondary/50 border-white/10"
                      />
                      
                      <Button
                        className="w-full"
                        onClick={async () => {
                          if (!forgotPasswordEmail) {
                            toast.error("Please enter your email");
                            return;
                          }
                          // Basic email validation
                          if (!forgotPasswordEmail.includes("@")) {
                            toast.error("Please enter a valid email address");
                            return;
                          }
                          setForgotPasswordLoading(true);
                          try {
                            await axios.post(`${API}/auth/request-password-reset?email=${encodeURIComponent(forgotPasswordEmail)}`);
                            setForgotPasswordSent(true);
                            toast.success("Reset link sent!");
                          } catch (err) {
                            const errorMsg = err.response?.data?.detail || "Failed to send reset link";
                            toast.error(errorMsg);
                          }
                          setForgotPasswordLoading(false);
                        }}
                        disabled={forgotPasswordLoading}
                      >
                        {forgotPasswordLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="w-4 h-4 mr-2" />
                        )}
                        Send Reset Link
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Check Your Email</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      We sent a password reset link to<br />
                      <span className="text-white">{forgotPasswordEmail}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Link expires in 1 hour. Check spam folder if not found.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setForgotPasswordSent(false);
                        setForgotPasswordEmail("");
                      }}
                    >
                      Try Another Email
                    </Button>
                  </div>
                )}
              </div>
            ) : (
            <>
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
                    <button
                      type="button"
                      onClick={() => setShowCountryPicker(true)}
                      className="flex items-center gap-1 h-10 px-3 rounded-lg bg-secondary/50 border border-white/10 hover:border-white/20 transition-colors"
                      data-testid="country-selector"
                    >
                      <span className="text-lg">{selectedCountry.flag}</span>
                      <span className="text-sm text-muted-foreground">+{selectedCountry.dialCode}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    
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

                  {/* Country Picker Dialog */}
                  <Dialog open={showCountryPicker} onOpenChange={setShowCountryPicker}>
                    <DialogContent className="max-w-md max-h-[80vh] p-0">
                      <DialogHeader className="p-4 pb-2">
                        <DialogTitle>Select Country</DialogTitle>
                        <Input
                          type="text"
                          placeholder="Search country..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="mt-2 bg-secondary/50"
                          autoFocus
                        />
                      </DialogHeader>
                      <div className="overflow-y-auto max-h-[50vh] px-2 pb-4">
                        {COUNTRIES
                          .filter(c => 
                            c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                            c.code.toLowerCase().includes(countrySearch.toLowerCase()) ||
                            c.dialCode.includes(countrySearch)
                          )
                          .map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(country);
                                setShowCountryPicker(false);
                                setCountrySearch("");
                              }}
                              className={`w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-white/5 rounded-lg transition-colors ${
                                selectedCountry.code === country.code ? 'bg-primary/10 border border-primary/30' : ''
                              }`}
                            >
                              <span className="text-xl">{country.flag}</span>
                              <span className="flex-1">{country.name}</span>
                              <span className="text-sm text-muted-foreground">+{country.dialCode}</span>
                              {selectedCountry.code === country.code && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </button>
                          ))}
                      </div>
                    </DialogContent>
                  </Dialog>

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
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary/50 border-white/10 pr-10"
                  data-testid="auth-password-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Forgot Password Link (login only) */}
              {isLogin && !forgotPasswordMode && (
                <div className="text-right -mt-2">
                  <button 
                    type="button"
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setForgotPasswordEmail(email);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

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

              {/* Honeypot field - invisible to users, bots will fill it */}
              <div 
                aria-hidden="true" 
                style={{ 
                  position: 'absolute', 
                  left: '-9999px', 
                  opacity: 0, 
                  height: 0, 
                  overflow: 'hidden',
                  pointerEvents: 'none'
                }}
              >
                <label htmlFor="website_url">Website</label>
                <input
                  type="text"
                  id="website_url"
                  name="website_url"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

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
                  // Prevent rapid toggling during transition
                  if (isTransitioning) return;
                  
                  setIsTransitioning(true);
                  setIsLogin(!isLogin);
                  
                  // Reset form fields atomically
                  setEmail("");
                  setPhone("");
                  setPassword("");
                  setName("");
                  setReferralCode("");
                  setOtp(["", "", "", "", "", ""]);
                  setOtpSent(false);
                  setOtpVerified(false);
                  setShowOTPInput(false);
                  setReferralValid(null);
                  setReferralBonus(0);
                  
                  requestAnimationFrame(() => {
                    setIsTransitioning(false);
                  });
                }}
                className="text-primary hover:underline"
                data-testid="auth-toggle-btn"
                disabled={isTransitioning}
              >
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
            </>
            )}
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
