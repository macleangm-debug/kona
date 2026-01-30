import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Coins, Plus, Minus, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";
import { CoinBalance } from "@/components";

export const StorePage = () => {
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const location = useLocation();
  
  // Geo & Payment state
  const [geoData, setGeoData] = useState(null);
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [packagesRes, geoRes, countriesRes] = await Promise.all([
          axios.get(`${API}/store/packages`),
          axios.get(`${API}/geo/detect`),
          axios.get(`${API}/geo/countries`)
        ]);
        // API returns {packages: [...]} so extract the packages array
        setPackages(packagesRes.data.packages || packagesRes.data);
        setGeoData(geoRes.data);
        setCountries(countriesRes.data);
        
        // Set detected country as default
        const detectedCountry = countriesRes.data.find(c => c.code === geoRes.data.country_code);
        if (detectedCountry) {
          setSelectedCountry(detectedCountry);
          setSelectedPaymentMethod(detectedCountry.payment_methods[0]);
        } else {
          // Default to international
          const intl = countriesRes.data.find(c => c.code === "INTL");
          setSelectedCountry(intl);
          setSelectedPaymentMethod(intl?.payment_methods[0]);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Check for payment return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sessionId = params.get("session_id");
    const txRef = params.get("tx_ref");
    const provider = params.get("provider") || "stripe";
    
    const paymentRef = sessionId || txRef;
    
    if (paymentRef && token) {
      setCheckingPayment(true);
      const pollStatus = async (attempts = 0) => {
        if (attempts >= 5) {
          setCheckingPayment(false);
          toast.error("Payment verification timed out");
          navigate("/store", { replace: true });
          return;
        }
        
        try {
          const res = await axios.get(`${API}/store/checkout/status/${paymentRef}?provider=${provider}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data.payment_status === "paid") {
            await refreshUser();
            toast.success("Payment successful! Coins added to your account.");
            setCheckingPayment(false);
            navigate("/store", { replace: true });
          } else if (res.data.status === "expired" || res.data.status === "failed") {
            toast.error("Payment failed or expired");
            setCheckingPayment(false);
            navigate("/store", { replace: true });
          } else {
            setTimeout(() => pollStatus(attempts + 1), 2000);
          }
        } catch (e) {
          console.error(e);
          setCheckingPayment(false);
          navigate("/store", { replace: true });
        }
      };
      pollStatus();
    }
  }, [location, token, refreshUser, navigate]);

  const handlePackageSelect = (pkg) => {
    setSelectedPackage(pkg);
    setShowPaymentSheet(true);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !selectedPaymentMethod || !selectedCountry) return;
    
    // Check if mobile money requires phone number
    if (selectedPaymentMethod.type === "mobilemoney" && !phoneNumber) {
      toast.error("Please enter your phone number for mobile money payment");
      return;
    }
    
    try {
      const res = await axios.post(`${API}/store/checkout`, {
        package_id: selectedPackage.id,
        origin_url: window.location.origin,
        payment_method: selectedPaymentMethod.id,
        country_code: selectedCountry.code,
        phone_number: phoneNumber || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowPaymentSheet(false);
      window.location.href = res.data.url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create checkout");
    }
  };

  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setSelectedPaymentMethod(country.payment_methods[0]);
    setShowCountryPicker(false);
  };

  // Calculate local price
  const getLocalPrice = (usdPrice) => {
    if (!selectedCountry) return `$${usdPrice.toFixed(2)}`;
    const currency = selectedCountry.currency || "USD";
    
    if (currency === "USD") return `$${usdPrice.toFixed(2)}`;
    
    // Get exchange rate for selected country
    const exchangeRates = {
      "KE": 130, "TZ": 2500, "UG": 3700, "RW": 1300, "CD": 2800, "BI": 2900, "SS": 130
    };
    const rate = exchangeRates[selectedCountry.code] || 1;
    const localPrice = usdPrice * rate;
    
    return `${currency} ${localPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (checkingPayment) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Verifying payment...</p>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-4" data-testid="store-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Coin Store</h1>
        {user && <CoinBalance coins={user.coins} />}
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500/30 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)]">
            <Coins className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Your Balance</p>
            <p className="font-heading text-3xl font-bold">{user?.coins || 0} <span className="text-lg text-muted-foreground">coins</span></p>
          </div>
        </div>
      </Card>

      {/* Country/Region Selector */}
      <div className="mb-6">
        <p className="text-sm text-muted-foreground mb-2">Your region</p>
        <button
          onClick={() => setShowCountryPicker(true)}
          className="w-full p-3 rounded-xl bg-secondary/50 border border-white/10 flex items-center justify-between hover:bg-secondary/80 transition-all"
          data-testid="country-selector"
        >
          <span className="font-medium">{selectedCountry?.name || "Select country"}</span>
          <span className="text-muted-foreground text-sm">{selectedCountry?.currency || ""}</span>
        </button>
      </div>

      {/* Packages */}
      <h2 className="font-heading text-lg font-semibold mb-4">Buy Coins</h2>
      <div className="grid grid-cols-2 gap-3">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            onClick={() => handlePackageSelect(pkg)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${pkg.popular ? "border-violet-500/50 shadow-[0_0_20px_rgba(124,58,237,0.3)]" : "border-white/10 hover:border-white/20"}`}
            data-testid={`package-${pkg.id}`}
          >
            {pkg.popular && (
              <Badge className="absolute top-2 right-2 bg-violet-500 text-xs">Popular</Badge>
            )}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <p className="font-heading font-bold text-lg">{pkg.coins}</p>
            {pkg.bonus > 0 && (
              <p className="text-xs text-green-400">+{pkg.bonus} bonus</p>
            )}
            <p className="text-muted-foreground text-sm">{getLocalPrice(pkg.price)}</p>
          </div>
        ))}
      </div>

      {/* Country Picker Dialog */}
      <Dialog open={showCountryPicker} onOpenChange={setShowCountryPicker}>
        <DialogContent className="max-w-[340px] bg-card border-white/10" data-testid="country-picker-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Select Your Region</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose your country for local payment methods
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto mt-4">
            {countries.map((country) => (
              <button
                key={country.code}
                onClick={() => handleCountryChange(country)}
                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${selectedCountry?.code === country.code ? "bg-primary/20 border border-primary/50" : "bg-secondary/30 border border-transparent hover:bg-secondary/50"}`}
                data-testid={`country-${country.code}`}
              >
                <span className="font-medium">{country.name}</span>
                <span className="text-sm text-muted-foreground">{country.currency}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      <Dialog open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
        <DialogContent className="bg-card border border-white/10 rounded-2xl max-w-md mx-auto" data-testid="payment-modal">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">Complete Purchase</DialogTitle>
            <DialogDescription className="sr-only">Complete your coin purchase</DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="py-2">
              {/* Package Summary */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedPackage.coins} coins</p>
                    {selectedPackage.bonus > 0 && (
                      <p className="text-xs text-green-400">+{selectedPackage.bonus} bonus</p>
                    )}
                  </div>
                </div>
                <p className="font-heading font-bold text-lg">{getLocalPrice(selectedPackage.price)}</p>
              </div>

              {/* Payment Methods */}
              <p className="text-sm text-muted-foreground mb-2">Payment Method</p>
              <div className="space-y-2 mb-4">
                {selectedCountry?.payment_methods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method)}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${selectedPaymentMethod?.id === method.id ? "bg-primary/20 border border-primary/50" : "bg-secondary/30 border border-transparent hover:bg-secondary/50"}`}
                    data-testid={`payment-method-${method.id}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${method.type === "mobilemoney" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {method.type === "mobilemoney" ? "📱" : "💳"}
                    </div>
                    <span className="font-medium">{method.name}</span>
                  </button>
                ))}
              </div>

              {/* Phone Number for Mobile Money */}
              {selectedPaymentMethod?.type === "mobilemoney" && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Phone Number</p>
                  <Input
                    type="tel"
                    placeholder="+254 700 123 456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="bg-secondary/50 border-white/10"
                    data-testid="phone-input"
                  />
                </div>
              )}

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-full"
                data-testid="confirm-purchase-btn"
              >
                Pay {getLocalPrice(selectedPackage.price)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorePage;
