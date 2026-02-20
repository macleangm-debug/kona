import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Image, Plus, Trash2, Play, Pause, Check, X, 
  BarChart3, Loader2, Eye, MousePointer, Trophy, ChevronDown
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const ThumbnailTestingTab = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create test form
  const [createForm, setCreateForm] = useState({
    series_id: "",
    variants: [
      { url: "", name: "Control", weight: 50 },
      { url: "", name: "Variant B", weight: 50 }
    ]
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all tests
      const testsRes = await axios.get(`${API}/thumbnail-testing/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTests(testsRes.data.tests || []);
      
      // Fetch stats
      const statsRes = await axios.get(`${API}/thumbnail-testing/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsRes.data);
      
      // Fetch series for dropdown
      const seriesRes = await axios.get(`${API}/series?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeries(seriesRes.data || []);
      
    } catch (e) {
      console.error("Error fetching thumbnail tests:", e);
    }
    setLoading(false);
  };

  const createTest = async () => {
    if (!createForm.series_id) {
      toast.error("Please select a series");
      return;
    }
    
    const validVariants = createForm.variants.filter(v => v.url.trim());
    if (validVariants.length < 2) {
      toast.error("At least 2 variants with URLs are required");
      return;
    }
    
    // Normalize weights
    const totalWeight = validVariants.reduce((sum, v) => sum + v.weight, 0);
    const normalizedVariants = validVariants.map(v => ({
      ...v,
      weight: Math.round((v.weight / totalWeight) * 100)
    }));
    
    try {
      await axios.post(`${API}/thumbnail-testing/create`, {
        series_id: createForm.series_id,
        variants: normalizedVariants
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Thumbnail A/B test created!");
      setShowCreateModal(false);
      setCreateForm({
        series_id: "",
        variants: [
          { url: "", name: "Control", weight: 50 },
          { url: "", name: "Variant B", weight: 50 }
        ]
      });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create test");
    }
  };

  const endTest = async (testId, winnerIndex = null) => {
    try {
      await axios.post(`${API}/thumbnail-testing/${testId}/end${winnerIndex !== null ? `?winner_index=${winnerIndex}` : ''}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Test ended");
      fetchData();
    } catch (e) {
      toast.error("Failed to end test");
    }
  };

  const applyWinner = async (testId) => {
    try {
      await axios.post(`${API}/thumbnail-testing/${testId}/apply-winner`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Winning thumbnail applied to series!");
      fetchData();
    } catch (e) {
      toast.error("Failed to apply winner");
    }
  };

  const addVariant = () => {
    if (createForm.variants.length >= 4) {
      toast.error("Maximum 4 variants allowed");
      return;
    }
    setCreateForm({
      ...createForm,
      variants: [...createForm.variants, { url: "", name: `Variant ${String.fromCharCode(65 + createForm.variants.length)}`, weight: 25 }]
    });
  };

  const removeVariant = (index) => {
    if (createForm.variants.length <= 2) {
      toast.error("Minimum 2 variants required");
      return;
    }
    setCreateForm({
      ...createForm,
      variants: createForm.variants.filter((_, i) => i !== index)
    });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...createForm.variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setCreateForm({ ...createForm, variants: newVariants });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Image className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tests</p>
              <p className="text-2xl font-bold">{stats?.total_tests || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Play className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{stats?.active_tests || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Check className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ended</p>
              <p className="text-2xl font-bold">{stats?.ended_tests || 0}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Decision Rate</p>
              <p className="text-2xl font-bold">{stats?.decision_rate || 0}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Test Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Thumbnail A/B Tests</h3>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Test
        </Button>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tests.length === 0 ? (
          <Card className="p-8 text-center col-span-2 border-white/10">
            <Image className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No thumbnail tests yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Create a test to optimize your thumbnails.</p>
          </Card>
        ) : (
          tests.map(test => (
            <Card key={test.id} className="p-5 border-white/10">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold">{test.series_title || 'Unknown Series'}</h4>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(test.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={test.status === 'active' ? 'default' : 'secondary'} className={
                  test.status === 'active' ? 'bg-green-500/20 text-green-400' : ''
                }>
                  {test.status}
                </Badge>
              </div>
              
              {/* Variants */}
              <div className="space-y-3 mb-4">
                {test.variants?.map((variant, i) => {
                  const isWinner = test.winner?.index === i;
                  return (
                    <div 
                      key={i} 
                      className={`p-3 rounded-lg border ${
                        isWinner ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img 
                          src={variant.url} 
                          alt={variant.name}
                          className="w-16 h-24 object-cover rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{variant.name}</span>
                            {isWinner && <Trophy className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {variant.impressions?.toLocaleString() || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <MousePointer className="w-3 h-3" />
                              {variant.clicks?.toLocaleString() || 0}
                            </span>
                            <span className="font-medium text-primary">
                              {variant.ctr || 0}% CTR
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">{variant.weight}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                {test.status === 'active' && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => endTest(test.id)}
                    >
                      <Pause className="w-3 h-3 mr-1" />
                      End Test
                    </Button>
                    <select
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          endTest(test.id, parseInt(e.target.value));
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Declare Winner...</option>
                      {test.variants?.map((v, i) => (
                        <option key={i} value={i}>{v.name} ({v.ctr || 0}% CTR)</option>
                      ))}
                    </select>
                  </>
                )}
                {test.status === 'ended' && test.winner && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => applyWinner(test.id)}
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Apply Winner
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border-white/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Create Thumbnail A/B Test</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-white/10 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Series Selection */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Select Series</label>
                <select
                  value={createForm.series_id}
                  onChange={(e) => setCreateForm({...createForm, series_id: e.target.value})}
                  className="w-full p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <option value="">Choose a series...</option>
                  {series.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
              
              {/* Variants */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm text-muted-foreground">Thumbnail Variants</label>
                  <Button variant="ghost" size="sm" onClick={addVariant}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Variant
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {createForm.variants.map((variant, i) => (
                    <div key={i} className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <Input
                          value={variant.name}
                          onChange={(e) => updateVariant(i, 'name', e.target.value)}
                          placeholder="Variant name"
                          className="w-32 bg-white/5 border-white/10"
                        />
                        {createForm.variants.length > 2 && (
                          <button 
                            onClick={() => removeVariant(i)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <Input
                        value={variant.url}
                        onChange={(e) => updateVariant(i, 'url', e.target.value)}
                        placeholder="Thumbnail URL (https://...)"
                        className="mb-3 bg-white/5 border-white/10"
                      />
                      
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">Traffic %:</span>
                        <Input
                          type="number"
                          min={10}
                          max={90}
                          value={variant.weight}
                          onChange={(e) => updateVariant(i, 'weight', parseInt(e.target.value) || 50)}
                          className="w-20 bg-white/5 border-white/10"
                        />
                        {variant.url && (
                          <img 
                            src={variant.url} 
                            alt="Preview"
                            className="w-12 h-18 object-cover rounded ml-auto"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button onClick={createTest} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Start A/B Test
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ThumbnailTestingTab;
