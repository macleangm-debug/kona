import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, Calculator, TrendingUp, Users, DollarSign, 
  AlertTriangle, CheckCircle, Loader2, PieChart, Target,
  ArrowUpRight, ArrowDownRight, Info
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";

export const InvestmentCalculator = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  
  // Input state
  const [inputs, setInputs] = useState({
    current_users: 1000,
    target_users: 100000,
    monthly_growth_rate: 0.15,
    months_to_project: 24,
    initial_investment: 50000
  });

  useEffect(() => {
    fetchBenchmarks();
  }, []);

  const fetchBenchmarks = async () => {
    try {
      const res = await axios.get(`${API}/investment/benchmarks`);
      setBenchmarks(res.data);
    } catch (e) {
      console.error("Failed to fetch benchmarks:", e);
    }
  };

  const calculateProjections = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/investment/calculate`, inputs);
      setResult(res.data);
    } catch (e) {
      console.error("Failed to calculate:", e);
    }
    setLoading(false);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="investment-calculator">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-4 p-4">
          <button onClick={() => navigate(-1)} className="p-2">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-heading text-xl font-bold flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              Investment Calculator
            </h1>
            <p className="text-xs text-muted-foreground">Financial projections based on user growth</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Input Section */}
        <Card className="p-6 bg-white/5 border-white/10">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Projection Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Current Users */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Current Users</label>
              <Input
                type="number"
                value={inputs.current_users}
                onChange={(e) => setInputs({...inputs, current_users: parseInt(e.target.value) || 0})}
                className="bg-white/5 border-white/10"
              />
            </div>
            
            {/* Target Users */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Target Users</label>
              <Input
                type="number"
                value={inputs.target_users}
                onChange={(e) => setInputs({...inputs, target_users: parseInt(e.target.value) || 0})}
                className="bg-white/5 border-white/10"
              />
            </div>
            
            {/* Initial Investment */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Initial Investment ($)</label>
              <Input
                type="number"
                value={inputs.initial_investment}
                onChange={(e) => setInputs({...inputs, initial_investment: parseInt(e.target.value) || 0})}
                className="bg-white/5 border-white/10"
              />
            </div>
            
            {/* Monthly Growth Rate */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Monthly Growth Rate: {(inputs.monthly_growth_rate * 100).toFixed(0)}%
              </label>
              <Slider
                value={[inputs.monthly_growth_rate * 100]}
                max={50}
                min={5}
                step={1}
                onValueChange={([v]) => setInputs({...inputs, monthly_growth_rate: v / 100})}
                className="mt-2"
              />
            </div>
            
            {/* Projection Period */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">
                Projection Period: {inputs.months_to_project} months
              </label>
              <Slider
                value={[inputs.months_to_project]}
                max={60}
                min={6}
                step={6}
                onValueChange={([v]) => setInputs({...inputs, months_to_project: v})}
                className="mt-2"
              />
            </div>
            
            {/* Calculate Button */}
            <div className="flex items-end">
              <Button 
                onClick={calculateProjections} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Calculator className="w-4 h-4 mr-2" />
                )}
                Calculate Projections
              </Button>
            </div>
          </div>
        </Card>

        {/* Results Section */}
        {result && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/20">
                <p className="text-xs text-muted-foreground">Final Users</p>
                <p className="text-2xl font-bold text-blue-400">{formatNumber(result.summary.final_users)}</p>
                <p className="text-xs text-blue-300 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="w-3 h-3" />
                  {((result.summary.final_users / inputs.current_users - 1) * 100).toFixed(0)}% growth
                </p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/20">
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(result.summary.total_revenue)}</p>
                <p className="text-xs text-green-300 mt-1">{inputs.months_to_project} months</p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/20">
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${result.summary.net_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(result.summary.net_profit)}
                </p>
                <p className="text-xs text-purple-300 mt-1">
                  {result.summary.final_roi.toFixed(1)}% ROI
                </p>
              </Card>
              
              <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/20">
                <p className="text-xs text-muted-foreground">Break-Even</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {result.break_even_month ? `Month ${result.break_even_month}` : 'N/A'}
                </p>
                <p className="text-xs text-yellow-300 mt-1">
                  {result.break_even_month ? `${result.break_even_month} months` : 'Not reached'}
                </p>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Growth Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  User Growth Projection
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.projections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        formatter={(value) => formatNumber(value)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="users" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.3}
                        name="Total Users"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Revenue vs Costs Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  Revenue vs Costs
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.projections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#22c55e" name="Revenue" strokeWidth={2} />
                      <Line type="monotone" dataKey="costs" stroke="#ef4444" name="Costs" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Cumulative Profit Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  Cumulative Profit
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.projections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        formatter={(value) => formatCurrency(value)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulative_profit" 
                        stroke="#a855f7" 
                        fill="#a855f7" 
                        fillOpacity={0.3}
                        name="Cumulative Profit"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* ROI Chart */}
              <Card className="p-6 bg-white/5 border-white/10">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-yellow-400" />
                  ROI Over Time
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.projections}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#666" />
                      <YAxis stroke="#666" unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                        formatter={(value) => `${value.toFixed(1)}%`}
                      />
                      <Line type="monotone" dataKey="roi_percentage" stroke="#eab308" name="ROI %" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Key Metrics */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                Key Unit Economics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">LTV</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(result.key_metrics.lifetime_value)}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">CAC</p>
                  <p className="text-lg font-bold text-red-400">{formatCurrency(result.key_metrics.customer_acquisition_cost)}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">LTV:CAC</p>
                  <p className={`text-lg font-bold ${result.key_metrics.ltv_cac_ratio >= 3 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {result.key_metrics.ltv_cac_ratio}x
                  </p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">Churn</p>
                  <p className="text-lg font-bold text-yellow-400">{result.key_metrics.monthly_churn_rate}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="text-lg font-bold text-blue-400">{result.key_metrics.gross_margin}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">ARPU</p>
                  <p className="text-lg font-bold text-purple-400">{formatCurrency(result.key_metrics.avg_revenue_per_user)}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">Payback</p>
                  <p className="text-lg font-bold text-cyan-400">{result.key_metrics.payback_period_months} mo</p>
                </div>
              </div>
            </Card>

            {/* Risk Factors */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Risk Assessment
              </h3>
              <div className="space-y-3">
                {result.risk_factors.map((risk, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                    <Badge 
                      variant="outline" 
                      className={`
                        ${risk.level === 'HIGH' ? 'border-red-500/50 text-red-400' : ''}
                        ${risk.level === 'MEDIUM' ? 'border-yellow-500/50 text-yellow-400' : ''}
                        ${risk.level === 'LOW' ? 'border-green-500/50 text-green-400' : ''}
                      `}
                    >
                      {risk.level}
                    </Badge>
                    <div>
                      <p className="font-medium">{risk.factor}</p>
                      <p className="text-sm text-muted-foreground">{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recommendations */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Recommendations
              </h3>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Benchmarks Section */}
        {benchmarks && (
          <Card className="p-6 bg-white/5 border-white/10">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-400" />
              Industry Benchmarks & Market Size
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">Streaming Industry Benchmarks</h4>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm">Average ARPU</span>
                    <span className="text-sm font-medium">${benchmarks.streaming_industry.avg_arpu.low} - ${benchmarks.streaming_industry.avg_arpu.high}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm">Monthly Churn</span>
                    <span className="text-sm font-medium">{benchmarks.streaming_industry.avg_churn.low * 100}% - {benchmarks.streaming_industry.avg_churn.high * 100}%</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm">LTV:CAC Benchmark</span>
                    <span className="text-sm font-medium">{benchmarks.streaming_industry.ltv_cac_benchmark.good}x+ (Good)</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 text-sm text-muted-foreground">African Streaming Market</h4>
                <div className="space-y-2">
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm">Market Size (2025)</span>
                    <span className="text-sm font-medium text-green-400">{benchmarks.market_size.african_streaming_market_2025}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm">Growth Rate (CAGR)</span>
                    <span className="text-sm font-medium text-blue-400">{benchmarks.market_size.cagr}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-white/5 rounded">
                    <span className="text-sm">Target Addressable Market</span>
                    <span className="text-sm font-medium text-purple-400">{benchmarks.market_size.target_addressable_market}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default InvestmentCalculator;
