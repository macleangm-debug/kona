import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  RefreshCw, TrendingUp, Globe, DollarSign, 
  Settings, Percent, Save, AlertCircle,
  ArrowUpRight, ArrowDownRight, Loader2,
  Tag, Sparkles, Crown, RotateCcw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API } from "@/config";
import { toast } from "sonner";

const countryNames = {
  KE: "Kenya",
  TZ: "Tanzania", 
  UG: "Uganda",
  RW: "Rwanda",
  GH: "Ghana",
  NG: "Nigeria",
  ZA: "South Africa"
};

const countryFlags = {
  KE: "🇰🇪",
  TZ: "🇹🇿",
  UG: "🇺🇬",
  RW: "🇷🇼",
  GH: "🇬🇭",
  NG: "🇳🇬",
  ZA: "🇿🇦"
};

const pricingStyleIcons = {
  value: Tag,
  premium: Crown,
  exact: Settings
};

const pricingStyleColors = {
  value: "text-green-400 bg-green-500/20",
  premium: "text-yellow-400 bg-yellow-500/20",
  exact: "text-gray-400 bg-gray-500/20"
};

export const ExchangeRateManager = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ratesData, setRatesData] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);
  const [defaultMargin, setDefaultMargin] = useState(3.0);
  const [countryMargins, setCountryMargins] = useState({});
  const [pricingStyles, setPricingStyles] = useState(null);
  const [editingCountry, setEditingCountry] = useState(null);
  const [tempMargin, setTempMargin] = useState("");

  const fetchData = async () => {
    try {
      // Fetch rates
      const ratesRes = await axios.get(`${API}/admin/exchange-rates/rates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRatesData(ratesRes.data);
      setDefaultMargin(ratesRes.data.config.default_margin_percent);
      setCountryMargins(ratesRes.data.config.country_margins || {});

      // Fetch revenue stats
      const revenueRes = await axios.get(`${API}/admin/exchange-rates/revenue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevenueStats(revenueRes.data);

      // Fetch pricing styles
      const stylesRes = await axios.get(`${API}/admin/exchange-rates/pricing-styles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPricingStyles(stylesRes.data);
    } catch (e) {
      console.error("Failed to fetch exchange rate data:", e);
      toast.error("Failed to load exchange rate data");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const refreshRates = async () => {
    setRefreshing(true);
    try {
      await axios.post(`${API}/admin/exchange-rates/rates/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Exchange rates refreshed");
      await fetchData();
    } catch (e) {
      toast.error("Failed to refresh rates");
    }
    setRefreshing(false);
  };

  const saveDefaultMargin = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/admin/exchange-rates/config`, 
        { default_margin_percent: defaultMargin },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`Default margin updated to ${defaultMargin}%`);
      await fetchData();
    } catch (e) {
      toast.error("Failed to update margin");
    }
    setSaving(false);
  };

  const saveCountryMargin = async (countryCode) => {
    const margin = parseFloat(tempMargin);
    if (isNaN(margin) || margin < 0 || margin > 50) {
      toast.error("Margin must be between 0% and 50%");
      return;
    }

    setSaving(true);
    try {
      await axios.put(
        `${API}/admin/exchange-rates/config/country/${countryCode}?margin_percent=${margin}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`Margin for ${countryNames[countryCode]} updated to ${margin}%`);
      setEditingCountry(null);
      setTempMargin("");
      await fetchData();
    } catch (e) {
      toast.error("Failed to update country margin");
    }
    setSaving(false);
  };

  const removeCountryMargin = async (countryCode) => {
    setSaving(true);
    try {
      await axios.delete(
        `${API}/admin/exchange-rates/config/country/${countryCode}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`Custom margin removed for ${countryNames[countryCode]}`);
      await fetchData();
    } catch (e) {
      toast.error("Failed to remove country margin");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Exchange Rate Management
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure dynamic exchange rates and margins for Kona revenue
          </p>
        </div>
        <Button 
          onClick={refreshRates} 
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Rates
        </Button>
      </div>

      {/* Revenue Summary */}
      {revenueStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <DollarSign className="w-4 h-4" />
              Total Margin Revenue
            </div>
            <p className="text-2xl font-bold text-white mt-1">
              ${revenueStats.summary.total_margin_revenue_usd.toFixed(2)}
            </p>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <TrendingUp className="w-4 h-4" />
              Total Volume
            </div>
            <p className="text-2xl font-bold text-white mt-1">
              ${revenueStats.summary.total_volume_usd.toFixed(2)}
            </p>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
            <div className="flex items-center gap-2 text-purple-400 text-sm">
              <ArrowUpRight className="w-4 h-4" />
              Transactions
            </div>
            <p className="text-2xl font-bold text-white mt-1">
              {revenueStats.summary.total_transactions}
            </p>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <Percent className="w-4 h-4" />
              Avg Margin/Txn
            </div>
            <p className="text-2xl font-bold text-white mt-1">
              ${revenueStats.summary.average_margin_per_transaction.toFixed(2)}
            </p>
          </Card>
        </div>
      )}

      {/* Margin Configuration */}
      <Card className="p-4 bg-gray-800/50 border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-purple-400" />
          Margin Configuration
        </h3>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <label className="text-sm text-gray-400 mb-1 block">
              Default Margin (all countries)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={defaultMargin}
                onChange={(e) => setDefaultMargin(parseFloat(e.target.value) || 0)}
                min={0}
                max={50}
                step={0.5}
                className="w-24 bg-gray-900 border-gray-700"
              />
              <span className="text-gray-400">%</span>
              <Button 
                onClick={saveDefaultMargin}
                disabled={saving}
                size="sm"
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-gray-500">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            This margin is Kona's revenue and is NOT shown to creators
          </div>
        </div>
      </Card>

      {/* Exchange Rates Table */}
      <Card className="p-4 bg-gray-800/50 border-white/10">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Live Exchange Rates
          {ratesData?.cache_info?.cached_at && (
            <Badge variant="outline" className="ml-2 text-xs">
              Updated: {new Date(ratesData.cache_info.cached_at).toLocaleString()}
            </Badge>
          )}
        </h3>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Country</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead className="text-right">Market Rate</TableHead>
              <TableHead className="text-right">Margin</TableHead>
              <TableHead className="text-right">$10 Display Price</TableHead>
              <TableHead className="text-right">Margin Profit</TableHead>
              <TableHead className="text-right">Rounding Profit</TableHead>
              <TableHead className="text-right text-green-400">Total Kona Profit</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ratesData?.rates?.map((rate) => (
              <TableRow key={rate.country_code}>
                <TableCell>
                  <span className="mr-2">{countryFlags[rate.country_code]}</span>
                  {countryNames[rate.country_code]}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{rate.currency}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {rate.market_rate.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {editingCountry === rate.country_code ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        type="number"
                        value={tempMargin}
                        onChange={(e) => setTempMargin(e.target.value)}
                        className="w-16 h-7 text-xs bg-gray-900"
                        autoFocus
                      />
                      <span className="text-xs">%</span>
                      <Button 
                        size="sm" 
                        className="h-7 px-2"
                        onClick={() => saveCountryMargin(rate.country_code)}
                      >
                        ✓
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => {
                          setEditingCountry(null);
                          setTempMargin("");
                        }}
                      >
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <span className={countryMargins[rate.country_code] !== undefined ? "text-yellow-400" : ""}>
                      {rate.margin_percent.toFixed(1)}%
                      {countryMargins[rate.country_code] !== undefined && (
                        <Badge className="ml-1 text-[10px] bg-yellow-500/20 text-yellow-400">
                          Custom
                        </Badge>
                      )}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-sm">
                    <span className="text-white font-medium">
                      {rate.example_10_usd.formatted || `${rate.currency} ${rate.example_10_usd.with_margin?.toLocaleString()}`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-blue-400">
                  ${rate.example_10_usd.margin_profit?.toFixed(2) || rate.example_10_usd.kona_profit?.toFixed(2)}
                </TableCell>
                <TableCell className="text-right text-purple-400">
                  ${rate.example_10_usd.rounding_profit?.toFixed(2) || "0.00"}
                </TableCell>
                <TableCell className="text-right font-bold text-green-400">
                  ${rate.example_10_usd.kona_profit?.toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setEditingCountry(rate.country_code);
                        setTempMargin(rate.margin_percent.toString());
                      }}
                    >
                      Edit
                    </Button>
                    {countryMargins[rate.country_code] !== undefined && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-400"
                        onClick={() => removeCountryMargin(rate.country_code)}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Revenue by Country */}
      {revenueStats?.by_country?.length > 0 && (
        <Card className="p-4 bg-gray-800/50 border-white/10">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            Margin Revenue by Country
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {revenueStats.by_country.map((country) => (
              <div 
                key={country.country_code}
                className="p-3 rounded-lg bg-gray-900/50 border border-white/5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>{countryFlags[country.country_code]}</span>
                  <span className="font-medium">{countryNames[country.country_code]}</span>
                </div>
                <p className="text-lg font-bold text-green-400">
                  ${country.margin_usd.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {country.transactions} transactions
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ExchangeRateManager;
