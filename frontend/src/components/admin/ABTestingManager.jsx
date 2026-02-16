import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FlaskConical, Play, Square, Trophy, TrendingUp,
  Users, DollarSign, Percent, Plus, Loader2,
  CheckCircle, AlertCircle, BarChart3, ArrowRight,
  Sparkles, Crown, Tag, Settings
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { API } from "@/config";
import { toast } from "sonner";

const pricingStyleLabels = {
  value: { label: "Value (ends in 9)", icon: Tag, color: "text-green-400" },
  premium: { label: "Premium (ends in 0)", icon: Crown, color: "text-yellow-400" },
  exact: { label: "Exact (no rounding)", icon: Settings, color: "text-gray-400" }
};

export const ABTestingManager = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [activeTests, setActiveTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Create test form state
  const [newTest, setNewTest] = useState({
    name: "",
    description: "",
    target_tier: "all",
    traffic_percentage: 100,
    variants: [
      { name: "Control", pricing_style: "value", weight: 50 },
      { name: "Variant B", pricing_style: "premium", weight: 50 }
    ]
  });

  const fetchData = async () => {
    try {
      const [testsRes, activeRes] = await Promise.all([
        axios.get(`${API}/admin/ab-tests/`, { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/admin/ab-tests/active`, { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setTests(testsRes.data.tests || []);
      setActiveTests(activeRes.data.active_tests || []);
    } catch (e) {
      console.error("Failed to fetch A/B tests:", e);
      toast.error("Failed to load A/B tests");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const loadTestResults = async (testId) => {
    try {
      const res = await axios.get(`${API}/admin/ab-tests/${testId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResults(res.data);
      setSelectedTest(testId);
    } catch (e) {
      toast.error("Failed to load test results");
    }
  };

  const createTest = async () => {
    // Validate
    if (!newTest.name || !newTest.description) {
      toast.error("Please fill in name and description");
      return;
    }
    
    const totalWeight = newTest.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      toast.error("Variant weights must sum to 100%");
      return;
    }

    setCreating(true);
    try {
      await axios.post(`${API}/admin/ab-tests/`, newTest, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("A/B test created!");
      setShowCreateModal(false);
      setNewTest({
        name: "",
        description: "",
        target_tier: "all",
        traffic_percentage: 100,
        variants: [
          { name: "Control", pricing_style: "value", weight: 50 },
          { name: "Variant B", pricing_style: "premium", weight: 50 }
        ]
      });
      await fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create test");
    }
    setCreating(false);
  };

  const endTest = async (testId, winner = null) => {
    try {
      await axios.post(`${API}/admin/ab-tests/${testId}/end`, { winner }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(winner ? `Test ended with winner: ${winner}` : "Test ended");
      await fetchData();
      if (selectedTest === testId) {
        await loadTestResults(testId);
      }
    } catch (e) {
      toast.error("Failed to end test");
    }
  };

  const applyWinner = async (testId) => {
    try {
      const res = await axios.post(`${API}/admin/ab-tests/${testId}/apply-winner`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message);
      await fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to apply winner");
    }
  };

  const updateVariant = (index, field, value) => {
    const updated = [...newTest.variants];
    updated[index] = { ...updated[index], [field]: value };
    setNewTest({ ...newTest, variants: updated });
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
            <FlaskConical className="w-5 h-5 text-purple-400" />
            A/B Testing - Pricing Experiments
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Test different pricing styles to optimize conversions
          </p>
        </div>
        
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button className="bg-purple-500 hover:bg-purple-600">
              <Plus className="w-4 h-4 mr-2" />
              New Test
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-gray-900 border-white/10">
            <DialogHeader>
              <DialogTitle>Create A/B Test</DialogTitle>
              <DialogDescription>
                Set up a new pricing experiment
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Test Name</label>
                <Input
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  placeholder="e.g., VIP Premium vs Value Pricing"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  placeholder="What are we testing?"
                  className="bg-gray-800 border-gray-700 mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Target Tier</label>
                  <Select
                    value={newTest.target_tier}
                    onValueChange={(v) => setNewTest({ ...newTest, target_tier: v })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value="basic">Basic Only</SelectItem>
                      <SelectItem value="premium">Premium Only</SelectItem>
                      <SelectItem value="vip">VIP Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Traffic %</label>
                  <Input
                    type="number"
                    value={newTest.traffic_percentage}
                    onChange={(e) => setNewTest({ ...newTest, traffic_percentage: parseInt(e.target.value) || 100 })}
                    min={10}
                    max={100}
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Variants</label>
                <div className="space-y-3">
                  {newTest.variants.map((variant, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-gray-800/50 border border-white/5">
                      <Input
                        value={variant.name}
                        onChange={(e) => updateVariant(idx, "name", e.target.value)}
                        placeholder="Variant name"
                        className="flex-1 bg-gray-900 border-gray-700"
                      />
                      <Select
                        value={variant.pricing_style}
                        onValueChange={(v) => updateVariant(idx, "pricing_style", v)}
                      >
                        <SelectTrigger className="w-40 bg-gray-900 border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="value">
                            <span className="flex items-center gap-2">
                              <Tag className="w-3 h-3 text-green-400" />
                              Value (9)
                            </span>
                          </SelectItem>
                          <SelectItem value="premium">
                            <span className="flex items-center gap-2">
                              <Crown className="w-3 h-3 text-yellow-400" />
                              Premium (0)
                            </span>
                          </SelectItem>
                          <SelectItem value="exact">
                            <span className="flex items-center gap-2">
                              <Settings className="w-3 h-3 text-gray-400" />
                              Exact
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={variant.weight}
                          onChange={(e) => updateVariant(idx, "weight", parseInt(e.target.value) || 0)}
                          className="w-16 bg-gray-900 border-gray-700"
                          min={0}
                          max={100}
                        />
                        <span className="text-xs text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Total: {newTest.variants.reduce((s, v) => s + v.weight, 0)}% (must equal 100%)
                </p>
              </div>
              
              <Button 
                onClick={createTest} 
                disabled={creating}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Start Test
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Tests */}
      {activeTests.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Play className="w-4 h-4 text-green-400" />
            Active Tests
            <Badge className="bg-green-500/20 text-green-400">{activeTests.length}</Badge>
          </h3>
          <div className="space-y-3">
            {activeTests.map((test) => (
              <div 
                key={test.id}
                className="p-3 rounded-lg bg-gray-900/50 border border-white/5 cursor-pointer hover:border-purple-500/50 transition-colors"
                onClick={() => loadTestResults(test.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test.name}</p>
                    <p className="text-xs text-gray-500">{test.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{test.target_tier}</Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); endTest(test.id); }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Square className="w-3 h-3 mr-1" />
                      End
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs">
                  {test.variants.map((v) => (
                    <span key={v.name} className="text-gray-400">
                      {v.name}: {test.metrics?.impressions?.[v.name] || 0} views
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Test Results */}
      {testResults && (
        <Card className="p-4 bg-gray-800/50 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                {testResults.test?.name}
              </h3>
              <p className="text-xs text-gray-500">{testResults.test?.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={testResults.test?.status === "active" ? "default" : "secondary"}>
                {testResults.test?.status}
              </Badge>
              {testResults.test?.winner && (
                <Badge className="bg-yellow-500/20 text-yellow-400">
                  <Trophy className="w-3 h-3 mr-1" />
                  Winner: {testResults.test.winner}
                </Badge>
              )}
            </div>
          </div>

          {/* Variant Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {testResults.variants?.map((variant, idx) => {
              const isWinner = testResults.test?.winner === variant.name;
              const style = pricingStyleLabels[variant.pricing_style];
              const StyleIcon = style?.icon || Tag;
              
              return (
                <div 
                  key={variant.name}
                  className={`p-4 rounded-lg border ${
                    isWinner 
                      ? "bg-yellow-500/10 border-yellow-500/30" 
                      : "bg-gray-900/50 border-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <StyleIcon className={`w-4 h-4 ${style?.color || 'text-gray-400'}`} />
                      <span className="font-medium">{variant.name}</span>
                      {isWinner && <Trophy className="w-4 h-4 text-yellow-400" />}
                    </div>
                    <Badge variant="outline" className={style?.color}>
                      {style?.label}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Impressions</p>
                      <p className="font-bold text-lg">{variant.impressions.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Conversions</p>
                      <p className="font-bold text-lg">{variant.conversions}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Conversion Rate</p>
                      <p className={`font-bold text-lg ${variant.conversion_rate > 0 ? 'text-green-400' : ''}`}>
                        {variant.conversion_rate}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Revenue</p>
                      <p className="font-bold text-lg">${variant.revenue_usd}</p>
                    </div>
                  </div>
                  
                  {/* Conversion rate bar */}
                  <div className="mt-3">
                    <Progress value={variant.conversion_rate * 10} className="h-2" />
                  </div>
                  
                  {testResults.test?.status === "active" && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="mt-3 w-full text-xs"
                      onClick={() => endTest(testResults.test.id, variant.name)}
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      Declare Winner
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Statistical Analysis */}
          {testResults.statistical_analysis && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <h4 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Statistical Analysis
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Z-Score</p>
                  <p className="font-medium">{testResults.statistical_analysis.z_score}</p>
                </div>
                <div>
                  <p className="text-gray-500">Confidence</p>
                  <p className="font-medium text-green-400">
                    {testResults.statistical_analysis.significance}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-300">
                {testResults.statistical_analysis.recommendation}
              </p>
            </div>
          )}

          {/* Apply Winner Button */}
          {testResults.test?.status === "ended" && testResults.test?.winner && (
            <Button 
              onClick={() => applyWinner(testResults.test.id)}
              className="w-full mt-4 bg-green-500 hover:bg-green-600"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Winner as New Default
            </Button>
          )}
        </Card>
      )}

      {/* Past Tests */}
      {tests.filter(t => t.status === "ended").length > 0 && (
        <Card className="p-4 bg-gray-800/50 border-white/10">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            Completed Tests
          </h3>
          <div className="space-y-2">
            {tests.filter(t => t.status === "ended").map((test) => (
              <div 
                key={test.id}
                className="p-3 rounded-lg bg-gray-900/50 border border-white/5 cursor-pointer hover:border-gray-500/50 transition-colors"
                onClick={() => loadTestResults(test.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-300">{test.name}</p>
                    <p className="text-xs text-gray-500">
                      Ended: {new Date(test.ended_at).toLocaleDateString()}
                    </p>
                  </div>
                  {test.winner && (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      <Trophy className="w-3 h-3 mr-1" />
                      {test.winner}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {tests.length === 0 && (
        <Card className="p-8 bg-gray-800/50 border-white/10 text-center">
          <FlaskConical className="w-12 h-12 mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">No A/B Tests Yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first test to optimize pricing conversions
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="bg-purple-500 hover:bg-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Create First Test
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ABTestingManager;
