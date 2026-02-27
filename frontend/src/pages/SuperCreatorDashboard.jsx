import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Crown, Users, DollarSign, TrendingUp, Plus, UserPlus,
  Mail, Phone, Settings, ChevronRight, Check, X, Clock,
  Edit, Trash2, BarChart3, Calendar, Filter, Download,
  AlertCircle, Search, ArrowLeft, Loader2, Eye, Play,
  Film, Upload, Image
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/config";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  active: { label: "Active", color: "bg-green-500/20 text-green-400", icon: Check },
  inactive: { label: "Inactive", color: "bg-gray-500/20 text-gray-400", icon: X },
  terminated: { label: "Terminated", color: "bg-red-500/20 text-red-400", icon: X }
};

export default function SuperCreatorDashboard() {
  const navigate = useNavigate();
  const [token] = useState(localStorage.getItem("kona_token"));
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [subCreators, setSubCreators] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [earningsPeriod, setEarningsPeriod] = useState("30d");
  
  // UI States
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddCreator, setShowAddCreator] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Content management states
  const [showCreateContent, setShowCreateContent] = useState(false);
  const [contentForm, setContentForm] = useState({
    title: "",
    description: "",
    genre: "Romance",
    thumbnail_url: "",
    creator_id: "", // Empty means self, or sub-creator ID
    creator_name: "My Content"
  });
  const [creatingContent, setCreatingContent] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  
  // Genre options
  const GENRE_OPTIONS = [
    "Romance", "Drama", "Thriller", "Fantasy", "Action", "Comedy", 
    "Horror", "Mystery", "Family", "Documentary", "Historical", "Crime"
  ];
  
  // Form state
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    commission_percent: 10,
    content_types: ["all"],
    notes: "",
    message: ""
  });

  // Check super creator status
  const checkStatus = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/super-creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data);
      if (!res.data.is_super_creator) {
        toast.error("You are not a Super Creator");
        navigate("/creator");
      }
    } catch (e) {
      console.error("Status check failed:", e);
      navigate("/creator");
    }
  }, [token, navigate]);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/super-creator/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(res.data);
    } catch (e) {
      console.error("Dashboard fetch failed:", e);
    }
  }, [token]);

  // Fetch sub-creators
  const fetchSubCreators = useCallback(async () => {
    try {
      const url = filterStatus 
        ? `${API}/super-creator/sub-creators?status=${filterStatus}`
        : `${API}/super-creator/sub-creators`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubCreators(res.data.sub_creators || []);
    } catch (e) {
      console.error("Sub-creators fetch failed:", e);
    }
  }, [token, filterStatus]);

  // Fetch earnings
  const fetchEarnings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/super-creator/earnings?period=${earningsPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEarnings(res.data);
    } catch (e) {
      console.error("Earnings fetch failed:", e);
    }
  }, [token, earningsPeriod]);

  // Fetch series (own content)
  const fetchSeries = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/series`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeriesList(res.data.series || []);
    } catch (e) {
      console.error("Series fetch failed:", e);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/creator/login");
      return;
    }
    checkStatus();
  }, [token, navigate, checkStatus]);

  useEffect(() => {
    if (status?.is_super_creator) {
      Promise.all([fetchDashboard(), fetchSubCreators(), fetchEarnings(), fetchSeries()])
        .finally(() => setLoading(false));
    }
  }, [status, fetchDashboard, fetchSubCreators, fetchEarnings, fetchSeries]);

  useEffect(() => {
    if (status?.is_super_creator) {
      fetchSubCreators();
    }
  }, [filterStatus, status, fetchSubCreators]);

  useEffect(() => {
    if (status?.is_super_creator) {
      fetchEarnings();
    }
  }, [earningsPeriod, status, fetchEarnings]);

  // Add sub-creator
  const handleAddCreator = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    
    try {
      await axios.post(`${API}/super-creator/sub-creators`, {
        name: form.name,
        email: form.email,
        phone: form.phone || null,
        commission_percent: form.commission_percent,
        content_types: form.content_types,
        notes: form.notes || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Sub-creator added successfully!");
      setShowAddCreator(false);
      resetForm();
      fetchSubCreators();
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add sub-creator");
    }
  };

  // Send invitation
  const handleInvite = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and email are required");
      return;
    }
    
    try {
      await axios.post(`${API}/super-creator/invite`, {
        name: form.name,
        email: form.email,
        commission_percent: form.commission_percent,
        message: form.message || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`Invitation sent to ${form.email}!`);
      setShowInvite(false);
      resetForm();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to send invitation");
    }
  };

  // Activate sub-creator
  const handleActivate = async (creatorId) => {
    try {
      await axios.post(`${API}/super-creator/sub-creators/${creatorId}/activate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sub-creator activated!");
      fetchSubCreators();
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to activate");
    }
  };

  // Terminate sub-creator
  const handleTerminate = async (creatorId) => {
    if (!confirm("Are you sure you want to terminate this sub-creator?")) return;
    
    try {
      await axios.delete(`${API}/super-creator/sub-creators/${creatorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sub-creator terminated");
      fetchSubCreators();
      fetchDashboard();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to terminate");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      email: "",
      phone: "",
      commission_percent: status?.sub_creator_commission_percent || 10,
      content_types: ["all"],
      notes: "",
      message: ""
    });
  };

  // Reset content form
  const resetContentForm = () => {
    setContentForm({
      title: "",
      description: "",
      genre: "Romance",
      thumbnail_url: "",
      creator_id: "",
      creator_name: "My Content"
    });
  };

  // Create content (for self or sub-creator)
  const handleCreateContent = async () => {
    if (!contentForm.title || !contentForm.description) {
      toast.error("Title and description are required");
      return;
    }

    setCreatingContent(true);
    try {
      // If creator_id is set, create for sub-creator, otherwise for self
      const payload = {
        title: contentForm.title,
        description: contentForm.description,
        genre: contentForm.genre,
        thumbnail_url: contentForm.thumbnail_url || null
      };

      // If creating for a sub-creator, add attribution
      if (contentForm.creator_id) {
        payload.attributed_to = contentForm.creator_id;
        payload.attributed_name = contentForm.creator_name;
      }

      await axios.post(`${API}/creator/series`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Series "${contentForm.title}" created${contentForm.creator_id ? ` for ${contentForm.creator_name}` : ''}!`);
      setShowCreateContent(false);
      resetContentForm();
      fetchSeries();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create series");
    }
    setCreatingContent(false);
  };

  // Open content creation for specific sub-creator
  const handleCreateForSubCreator = (creator) => {
    setContentForm({
      title: "",
      description: "",
      genre: "Romance",
      thumbnail_url: "",
      creator_id: creator.id,
      creator_name: creator.name
    });
    setShowCreateContent(true);
  };

  // Filter sub-creators by search
  const filteredCreators = subCreators.filter(sc => 
    sc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sc.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format currency
  const formatCurrency = (amount, currency = "TZS") => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-600/30 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/creator")} data-testid="back-to-creator">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-6 h-6 text-purple-400" />
                  <h1 className="text-2xl font-bold">Super Creator Dashboard</h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {status?.territory} {status?.territory_exclusive && "(Exclusive)"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowInvite(true)} data-testid="invite-creator-btn">
                <Mail className="w-4 h-4 mr-2" />
                Invite Creator
              </Button>
              <Button onClick={() => setShowAddCreator(true)} data-testid="add-creator-btn">
                <UserPlus className="w-4 h-4 mr-2" />
                Add Creator
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sub-Creators</p>
                <p className="text-2xl font-bold">{dashboard?.sub_creators?.total || 0}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Creators</p>
                <p className="text-2xl font-bold">{dashboard?.sub_creators?.active || 0}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">30-Day Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.earnings_30d?.total)}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission Earned</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboard?.earnings_30d?.commission)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-background/50 border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="creators" className="data-[state=active]:bg-purple-500/20">
              <Users className="w-4 h-4 mr-2" />
              Sub-Creators
            </TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-500/20">
              <Film className="w-4 h-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-purple-500/20">
              <DollarSign className="w-4 h-4 mr-2" />
              Earnings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Contract Info */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  Contract Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contract Number</span>
                    <span className="font-medium">{status?.contract_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Territory</span>
                    <span className="font-medium">{dashboard?.contract?.territory || "Global"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Exclusive Rights</span>
                    <span className={`font-medium ${dashboard?.contract?.exclusive ? 'text-green-400' : 'text-gray-400'}`}>
                      {dashboard?.contract?.exclusive ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commission Rate</span>
                    <span className="font-medium text-yellow-400">{dashboard?.contract?.commission_rate || 10}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Negotiable Terms</span>
                    <span className={`font-medium ${status?.sub_creator_negotiable_terms ? 'text-green-400' : 'text-gray-400'}`}>
                      {status?.sub_creator_negotiable_terms ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Quick Stats */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  Performance Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Pending Approval</p>
                    <p className="text-xl font-bold text-yellow-400">{dashboard?.sub_creators?.pending || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Inactive</p>
                    <p className="text-xl font-bold text-gray-400">{dashboard?.sub_creators?.inactive || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Transactions (30d)</p>
                    <p className="text-xl font-bold">{dashboard?.earnings_30d?.transactions || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Avg Per Creator</p>
                    <p className="text-xl font-bold">
                      {dashboard?.sub_creators?.active > 0 
                        ? formatCurrency((dashboard?.earnings_30d?.total || 0) / dashboard.sub_creators.active)
                        : formatCurrency(0)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Sub-Creators */}
            <Card className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Recent Sub-Creators
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("creators")}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              <div className="space-y-2">
                {subCreators.slice(0, 5).map(creator => {
                  const statusConfig = STATUS_CONFIG[creator.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div key={creator.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-lg font-bold text-purple-400">
                            {creator.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{creator.name}</p>
                          <p className="text-xs text-muted-foreground">{creator.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusConfig.color} flex items-center gap-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        <span className="text-sm text-yellow-400">{creator.commission_percent}%</span>
                      </div>
                    </div>
                  );
                })}
                {subCreators.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No sub-creators yet</p>
                    <Button variant="link" onClick={() => setShowAddCreator(true)}>
                      Add your first sub-creator
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Sub-Creators Tab */}
          <TabsContent value="creators" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-creators"
                />
              </div>
              <div className="flex gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Button
                    key={key}
                    variant={filterStatus === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterStatus(filterStatus === key ? null : key)}
                    className={filterStatus === key ? config.color : ""}
                  >
                    {config.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Creators List */}
            <div className="space-y-3">
              {filteredCreators.map(creator => {
                const statusConfig = STATUS_CONFIG[creator.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                return (
                  <Card key={creator.id} className="p-4" data-testid={`sub-creator-${creator.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="text-xl font-bold text-purple-400">
                            {creator.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{creator.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color} flex items-center gap-1`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {creator.email}
                            </span>
                            {creator.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {creator.phone}
                              </span>
                            )}
                          </p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-yellow-400">Commission: {creator.commission_percent}%</span>
                            <span className="text-green-400">
                              Earnings: {formatCurrency(creator.earnings?.total || 0)}
                            </span>
                            <span className="text-blue-400">
                              Your Share: {formatCurrency(creator.earnings?.commission || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {creator.status === "pending" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleActivate(creator.id)}
                            title="Activate"
                            data-testid={`activate-${creator.id}`}
                          >
                            <Play className="w-4 h-4 text-green-400" />
                          </Button>
                        )}
                        {creator.status === "active" && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleCreateForSubCreator(creator)}
                            title="Create Content for this Creator"
                            data-testid={`create-content-${creator.id}`}
                          >
                            <Film className="w-4 h-4 text-purple-400" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="View Details">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleTerminate(creator.id)}
                          title="Terminate"
                          data-testid={`terminate-${creator.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {filteredCreators.length === 0 && (
                <Card className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Sub-Creators Found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {searchQuery || filterStatus 
                      ? "Try adjusting your filters"
                      : "Start building your creator network"}
                  </p>
                  <Button onClick={() => setShowAddCreator(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Sub-Creator
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            {/* Header with Create Button */}
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Film className="w-5 h-5 text-purple-400" />
                Content Management
              </h3>
              <Button onClick={() => { resetContentForm(); setShowCreateContent(true); }} data-testid="create-content-btn">
                <Plus className="w-4 h-4 mr-2" />
                Create Series
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => { resetContentForm(); setShowCreateContent(true); }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Create My Content</h4>
                    <p className="text-sm text-muted-foreground">Add a new series to your own profile</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => setActiveTab("creators")}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Create for Sub-Creator</h4>
                    <p className="text-sm text-muted-foreground">Select a sub-creator and add content for them</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* My Series List */}
            <Card className="p-4">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                My Series ({seriesList.length})
              </h4>
              <div className="space-y-3">
                {seriesList.map(series => (
                  <div key={series.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-10 rounded bg-gray-700 overflow-hidden flex-shrink-0">
                        {series.thumbnail_url ? (
                          <img src={series.thumbnail_url} alt={series.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{series.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {series.genre} • {series.total_episodes || 0} episodes
                          {series.attributed_name && (
                            <span className="ml-2 text-blue-400">• For: {series.attributed_name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        series.status === 'published' ? 'bg-green-500/20 text-green-400' :
                        series.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {series.status || 'Draft'}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/series/${series.id}`)}>
                        <Edit className="w-4 h-4 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
                {seriesList.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No series created yet</p>
                    <Button variant="link" onClick={() => { resetContentForm(); setShowCreateContent(true); }}>
                      Create your first series
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-4">
            {/* Period Selector */}
            <div className="flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                Earnings Report
              </h3>
              <div className="flex gap-2">
                {["7d", "30d", "90d", "all"].map(period => (
                  <Button
                    key={period}
                    variant={earningsPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEarningsPeriod(period)}
                  >
                    {period === "all" ? "All Time" : period}
                  </Button>
                ))}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 bg-gradient-to-br from-green-500/10 to-transparent">
                <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-400">
                  {formatCurrency(earnings?.summary?.total_amount)}
                </p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-transparent">
                <p className="text-sm text-muted-foreground mb-1">Your Commission</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {formatCurrency(earnings?.summary?.total_commission)}
                </p>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent">
                <p className="text-sm text-muted-foreground mb-1">Transactions</p>
                <p className="text-3xl font-bold text-blue-400">
                  {earnings?.summary?.total_transactions || 0}
                </p>
              </Card>
            </div>

            {/* Earnings by Creator */}
            <Card className="p-4">
              <h4 className="font-semibold mb-4">Earnings by Sub-Creator</h4>
              <div className="space-y-3">
                {earnings?.by_sub_creator?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.sub_creator_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{item.transaction_count} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-400">{formatCurrency(item.total_amount)}</p>
                      <p className="text-xs text-yellow-400">Commission: {formatCurrency(item.total_commission)}</p>
                    </div>
                  </div>
                ))}
                {(!earnings?.by_sub_creator || earnings.by_sub_creator.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No earnings data for this period</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Sub-Creator Dialog */}
      <Dialog open={showAddCreator} onOpenChange={setShowAddCreator}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Add Sub-Creator
            </DialogTitle>
            <DialogDescription>
              Add a new creator to your network
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Creator name"
                data-testid="add-creator-name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="creator@email.com"
                data-testid="add-creator-email"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone (Optional)</label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
                placeholder="+255 xxx xxx xxx"
                data-testid="add-creator-phone"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Commission Rate (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.commission_percent}
                onChange={(e) => setForm({...form, commission_percent: parseFloat(e.target.value) || 0})}
                disabled={!status?.sub_creator_negotiable_terms}
                data-testid="add-creator-commission"
              />
              {!status?.sub_creator_negotiable_terms && (
                <p className="text-xs text-muted-foreground">
                  Commission rate is fixed at {status?.sub_creator_commission_percent}% per your contract
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({...form, notes: e.target.value})}
                placeholder="Any notes about this creator"
                data-testid="add-creator-notes"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowAddCreator(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleAddCreator} data-testid="confirm-add-creator">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Creator
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Creator Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              Invite Creator
            </DialogTitle>
            <DialogDescription>
              Send an invitation to join your network in {status?.territory}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Creator Name *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                placeholder="Full name"
                data-testid="invite-creator-name"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address *</label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="creator@email.com"
                data-testid="invite-creator-email"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Proposed Commission (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={form.commission_percent}
                onChange={(e) => setForm({...form, commission_percent: parseFloat(e.target.value) || 0})}
                data-testid="invite-creator-commission"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Personal Message (Optional)</label>
              <textarea
                className="w-full px-3 py-2 bg-background border rounded-md text-sm resize-none h-20"
                value={form.message}
                onChange={(e) => setForm({...form, message: e.target.value})}
                placeholder="Write a personal message to include in the invitation..."
                data-testid="invite-creator-message"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleInvite} data-testid="confirm-invite-creator">
              <Mail className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Content Dialog */}
      <Dialog open={showCreateContent} onOpenChange={setShowCreateContent}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Film className="w-5 h-5 text-purple-400" />
              Create New Series
            </DialogTitle>
            <DialogDescription>
              {contentForm.creator_id 
                ? `Creating content for ${contentForm.creator_name}. Revenue will be credited to their account.`
                : "Create a new series for your profile"
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {contentForm.creator_id && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-sm text-blue-400 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Creating for: <strong>{contentForm.creator_name}</strong>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Series Title *</label>
              <Input
                value={contentForm.title}
                onChange={(e) => setContentForm({...contentForm, title: e.target.value})}
                placeholder="Enter series title"
                data-testid="content-title"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <textarea
                className="w-full px-3 py-2 bg-background border rounded-md text-sm resize-none h-20"
                value={contentForm.description}
                onChange={(e) => setContentForm({...contentForm, description: e.target.value})}
                placeholder="Describe your series..."
                data-testid="content-description"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <select
                className="w-full px-3 py-2 bg-background border rounded-md text-sm"
                value={contentForm.genre}
                onChange={(e) => setContentForm({...contentForm, genre: e.target.value})}
                data-testid="content-genre"
              >
                {GENRE_OPTIONS.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail URL (Optional)</label>
              <Input
                value={contentForm.thumbnail_url}
                onChange={(e) => setContentForm({...contentForm, thumbnail_url: e.target.value})}
                placeholder="https://example.com/thumbnail.jpg"
                data-testid="content-thumbnail"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowCreateContent(false)}>
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleCreateContent} 
              disabled={creatingContent}
              data-testid="confirm-create-content"
            >
              {creatingContent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Series
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
