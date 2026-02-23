import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  Target, Plus, Coins, Users, Loader2, Trash2, Edit, 
  CheckCircle, XCircle, TrendingUp, Calendar, Eye, EyeOff
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/config";
import { toast } from "sonner";

export const TipGoalsManager = ({ token, series = [] }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  
  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_amount: 1000,
    series_id: "",
    show_on_profile: true,
    show_contributors: true
  });

  const fetchGoals = async () => {
    try {
      const res = await axios.get(`${API}/tip-goals/creator/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGoals(res.data.goals || []);
    } catch (e) {
      console.error("Error fetching goals:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchGoals();
  }, [token]);

  const handleCreate = async () => {
    if (!form.title || form.title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (form.target_amount < 100) {
      toast.error("Target must be at least 100 coins");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        target_amount: form.target_amount,
        series_id: form.series_id || null,
        show_on_profile: form.show_on_profile,
        show_contributors: form.show_contributors
      };
      
      await axios.post(`${API}/tip-goals/`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Goal created successfully!");
      setShowCreate(false);
      setForm({
        title: "",
        description: "",
        target_amount: 1000,
        series_id: "",
        show_on_profile: true,
        show_contributors: true
      });
      fetchGoals();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create goal");
    }
    setCreating(false);
  };

  const handleUpdate = async () => {
    if (!editingGoal) return;
    
    setCreating(true);
    try {
      await axios.patch(`${API}/tip-goals/${editingGoal.id}`, {
        title: form.title,
        description: form.description,
        target_amount: form.target_amount,
        show_on_profile: form.show_on_profile,
        show_contributors: form.show_contributors
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Goal updated!");
      setEditingGoal(null);
      fetchGoals();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update goal");
    }
    setCreating(false);
  };

  const handleDelete = async (goalId) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    
    try {
      await axios.delete(`${API}/tip-goals/${goalId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Goal deleted");
      fetchGoals();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete goal");
    }
  };

  const handleStatusChange = async (goalId, newStatus) => {
    try {
      await axios.patch(`${API}/tip-goals/${goalId}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Goal ${newStatus}`);
      fetchGoals();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update goal");
    }
  };

  const openEdit = (goal) => {
    setForm({
      title: goal.title,
      description: goal.description || "",
      target_amount: goal.target_amount,
      series_id: goal.series_id || "",
      show_on_profile: goal.show_on_profile,
      show_contributors: goal.show_contributors
    });
    setEditingGoal(goal);
  };

  // Stats
  const activeGoals = goals.filter(g => g.status === "active").length;
  const completedGoals = goals.filter(g => g.status === "completed").length;
  const totalRaised = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalContributors = goals.reduce((sum, g) => sum + g.contributor_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tip-goals-manager">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeGoals}</p>
              <p className="text-xs text-muted-foreground">Active Goals</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedGoals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Coins className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRaised.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Raised</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalContributors}</p>
              <p className="text-xs text-muted-foreground">Contributors</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Your Goals</h3>
        <Button 
          onClick={() => setShowCreate(true)}
          disabled={activeGoals >= 3}
          data-testid="create-goal-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Goal
        </Button>
      </div>
      {activeGoals >= 3 && (
        <p className="text-sm text-yellow-400">Maximum 3 active goals allowed</p>
      )}

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Goals Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a funding goal to let fans support your projects
          </p>
          <Button onClick={() => setShowCreate(true)}>Create Your First Goal</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map(goal => (
            <Card key={goal.id} className="p-4" data-testid={`goal-${goal.id}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{goal.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      goal.status === "completed" ? "bg-green-500/20 text-green-400" :
                      goal.status === "active" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-gray-500/20 text-gray-400"
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  {goal.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {goal.status === "active" && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEdit(goal)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleStatusChange(goal.id, "cancelled")}
                      >
                        <XCircle className="w-4 h-4 text-red-400" />
                      </Button>
                    </>
                  )}
                  {goal.current_amount === 0 && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(goal.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-yellow-400" />
                    {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()}
                  </span>
                  <span className="text-primary font-medium">{goal.progress_percent?.toFixed(1) || 0}%</span>
                </div>
                <Progress value={goal.progress_percent || 0} className="h-2" />
              </div>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {goal.contributor_count} supporters
                </span>
                <span className="flex items-center gap-1">
                  {goal.show_on_profile ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {goal.show_on_profile ? "Public" : "Private"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(goal.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Top Contributors */}
              {goal.top_contributors?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">Top Contributors</p>
                  <div className="flex flex-wrap gap-2">
                    {goal.top_contributors.slice(0, 5).map((c, i) => (
                      <span key={i} className="text-xs bg-white/5 px-2 py-1 rounded-full">
                        {c.username}: {c.amount} coins
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editingGoal} onOpenChange={(open) => {
        if (!open) {
          setShowCreate(false);
          setEditingGoal(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-yellow-400" />
              {editingGoal ? "Edit Goal" : "Create Funding Goal"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground">Goal Title *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({...form, title: e.target.value})}
                placeholder="e.g., New Camera Equipment"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                placeholder="Tell supporters what you're raising funds for..."
                maxLength={500}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Target Amount (coins) *</label>
              <Input
                type="number"
                value={form.target_amount}
                onChange={(e) => setForm({...form, target_amount: parseInt(e.target.value) || 0})}
                min={100}
                max={1000000}
              />
              <p className="text-xs text-muted-foreground mt-1">Min: 100 | Max: 1,000,000 coins</p>
            </div>

            {!editingGoal && series.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Link to Series (optional)</label>
                <select
                  className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                  value={form.series_id}
                  onChange={(e) => setForm({...form, series_id: e.target.value})}
                >
                  <option value="">No specific series</option>
                  {series.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_on_profile}
                  onChange={(e) => setForm({...form, show_on_profile: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show on my public profile</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.show_contributors}
                  onChange={(e) => setForm({...form, show_contributors: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-sm">Show contributor names publicly</span>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  setShowCreate(false);
                  setEditingGoal(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={editingGoal ? handleUpdate : handleCreate}
                disabled={creating}
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingGoal ? (
                  "Save Changes"
                ) : (
                  "Create Goal"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TipGoalsManager;
