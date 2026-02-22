import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Handshake, Building2, Send, CheckCircle, XCircle, Clock, 
  DollarSign, Users, Target, Eye, Loader2, ChevronRight,
  FileText, Link, Calendar, Star, TrendingUp, MessageSquare,
  Search, Filter, Briefcase, Award
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "yellow", icon: Clock },
  shortlisted: { label: "Shortlisted", color: "blue", icon: Star },
  accepted: { label: "Accepted", color: "green", icon: CheckCircle },
  rejected: { label: "Rejected", color: "red", icon: XCircle },
  completed: { label: "Completed", color: "purple", icon: Award },
  withdrawn: { label: "Withdrawn", color: "gray", icon: XCircle }
};

const SPONSORSHIP_TYPES = {
  product_placement: "Product Placement",
  dedicated_episode: "Dedicated Episode",
  series_sponsor: "Series Sponsor",
  brand_mention: "Brand Mention",
  social_promotion: "Social Promotion"
};

export const SponsorshipMarketplace = ({ token }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("browse");
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [series, setSeries] = useState([]);
  
  const [applyForm, setApplyForm] = useState({
    pitch: "",
    proposed_content: "",
    proposed_timeline: "",
    asking_price_coins: 1000,
    portfolio_links: [],
    series_id: ""
  });
  
  const [filters, setFilters] = useState({
    sponsorship_type: "",
    min_budget: "",
    max_budget: "",
    genre: ""
  });

  const fetchCampaigns = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.sponsorship_type) params.append("sponsorship_type", filters.sponsorship_type);
      if (filters.min_budget) params.append("min_budget", filters.min_budget);
      if (filters.max_budget) params.append("max_budget", filters.max_budget);
      if (filters.genre) params.append("genre", filters.genre);
      
      const res = await axios.get(`${API}/sponsorship/campaigns/browse?${params.toString()}`);
      setCampaigns(res.data.campaigns || []);
    } catch (e) {
      console.error("Error fetching campaigns:", e);
    }
  }, [filters]);

  const fetchMyApplications = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sponsorship/applications/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyApplications(res.data.applications || []);
    } catch (e) {
      console.error("Error fetching applications:", e);
    }
  }, [token]);

  const fetchOutreach = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sponsorship/outreach/received`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOutreach(res.data.outreach || []);
    } catch (e) {
      console.error("Error fetching outreach:", e);
    }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/sponsorship/analytics/creator`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (e) {
      console.error("Error fetching analytics:", e);
    }
  }, [token]);

  const fetchSeries = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/series`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeries(res.data || []);
    } catch (e) {
      console.error("Error fetching series:", e);
    }
  }, [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchCampaigns(),
        fetchMyApplications(),
        fetchOutreach(),
        fetchAnalytics(),
        fetchSeries()
      ]);
      setLoading(false);
    };
    init();
  }, [fetchCampaigns, fetchMyApplications, fetchOutreach, fetchAnalytics, fetchSeries]);

  const handleApply = async () => {
    if (!applyForm.pitch || applyForm.pitch.length < 50) {
      toast.error("Please write a pitch (min 50 characters)");
      return;
    }
    
    try {
      await axios.post(`${API}/sponsorship/applications`, {
        campaign_id: selectedCampaign.id,
        ...applyForm,
        portfolio_links: applyForm.portfolio_links.filter(Boolean)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Application submitted successfully!");
      setShowApplyDialog(false);
      resetApplyForm();
      fetchMyApplications();
      fetchAnalytics();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit application");
    }
  };

  const handleWithdraw = async (applicationId) => {
    if (!confirm("Are you sure you want to withdraw this application?")) return;
    
    try {
      await axios.delete(`${API}/sponsorship/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application withdrawn");
      fetchMyApplications();
      fetchAnalytics();
    } catch (e) {
      toast.error("Failed to withdraw application");
    }
  };

  const handleOutreachResponse = async (outreachId, accept, response) => {
    try {
      await axios.post(`${API}/sponsorship/outreach/${outreachId}/respond?response=${encodeURIComponent(response)}&accept=${accept}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(accept ? "Outreach accepted!" : "Outreach declined");
      fetchOutreach();
    } catch (e) {
      toast.error("Failed to respond to outreach");
    }
  };

  const resetApplyForm = () => {
    setApplyForm({
      pitch: "",
      proposed_content: "",
      proposed_timeline: "",
      asking_price_coins: 1000,
      portfolio_links: [],
      series_id: ""
    });
    setSelectedCampaign(null);
  };

  const openApplyDialog = (campaign) => {
    setSelectedCampaign(campaign);
    setApplyForm({
      ...applyForm,
      asking_price_coins: Math.floor(campaign.budget_coins / campaign.max_creators) || 1000
    });
    setShowApplyDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-${config.color}-500/20 text-${config.color}-400`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Handshake className="w-6 h-6 text-primary" />
            Sponsorship Marketplace
          </h2>
          <p className="text-sm text-muted-foreground">
            Connect with brands and earn from sponsorships
          </p>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <Send className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{analytics.applications?.total || 0}</p>
              <p className="text-xs text-muted-foreground">Applications</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold">{analytics.applications?.accepted || 0}</p>
              <p className="text-xs text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold">{analytics.total_earnings_coins?.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Coins Earned</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold">{analytics.outreach_received || 0}</p>
              <p className="text-xs text-muted-foreground">Brand Outreach</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="browse">
            <Search className="w-4 h-4 mr-2" />
            Browse ({campaigns.length})
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Send className="w-4 h-4 mr-2" />
            My Applications ({myApplications.length})
          </TabsTrigger>
          <TabsTrigger value="outreach">
            <MessageSquare className="w-4 h-4 mr-2" />
            Outreach ({outreach.length})
          </TabsTrigger>
        </TabsList>

        {/* Browse Campaigns */}
        <TabsContent value="browse" className="mt-4 space-y-4">
          {/* Filters */}
          <Card className="bg-card border-white/10">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filters.sponsorship_type}
                  onChange={(e) => setFilters({ ...filters, sponsorship_type: e.target.value })}
                  className="h-9 px-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                >
                  <option value="">All Types</option>
                  {Object.entries(SPONSORSHIP_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Min Budget"
                  value={filters.min_budget}
                  onChange={(e) => setFilters({ ...filters, min_budget: e.target.value })}
                  className="w-28 h-9 bg-secondary/50 border-white/10"
                />
                <Input
                  type="number"
                  placeholder="Max Budget"
                  value={filters.max_budget}
                  onChange={(e) => setFilters({ ...filters, max_budget: e.target.value })}
                  className="w-28 h-9 bg-secondary/50 border-white/10"
                />
                <Button variant="outline" size="sm" onClick={fetchCampaigns}>
                  Apply Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Campaign List */}
          {campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campaigns.map((campaign) => (
                <Card key={campaign.id} className="bg-card border-white/10 overflow-hidden hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{campaign.title}</h3>
                        <p className="text-sm text-muted-foreground">{campaign.brand_name}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {campaign.description}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="w-4 h-4 text-yellow-400" />
                        <span>{campaign.budget_coins?.toLocaleString()} coins</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span>{campaign.current_creators}/{campaign.max_creators} creators</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="w-4 h-4 text-green-400" />
                        <span>{SPONSORSHIP_TYPES[campaign.sponsorship_type] || campaign.sponsorship_type}</span>
                      </div>
                      {campaign.application_deadline && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4 text-red-400" />
                          <span>Due: {new Date(campaign.application_deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    
                    {campaign.preferred_genres?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {campaign.preferred_genres.map((genre, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-white/10 text-xs">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => openApplyDialog(campaign)}
                      disabled={campaign.current_creators >= campaign.max_creators}
                    >
                      {campaign.current_creators >= campaign.max_creators ? (
                        "Campaign Full"
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Apply Now
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Active Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  Check back later for new sponsorship opportunities
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Applications */}
        <TabsContent value="applications" className="mt-4">
          {myApplications.length > 0 ? (
            <div className="space-y-3">
              {myApplications.map((application) => (
                <Card key={application.id} className="bg-card border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{application.campaign_title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Applied: {new Date(application.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={application.status} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Your Ask</p>
                        <p className="font-medium text-yellow-400">
                          {application.asking_price_coins?.toLocaleString()} coins
                        </p>
                      </div>
                      {application.final_price_coins && (
                        <div>
                          <p className="text-muted-foreground">Final Price</p>
                          <p className="font-medium text-green-400">
                            {application.final_price_coins?.toLocaleString()} coins
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {application.brand_feedback && (
                      <div className="p-3 rounded-lg bg-white/5 text-sm mb-3">
                        <p className="text-muted-foreground mb-1">Brand Feedback:</p>
                        <p>{application.brand_feedback}</p>
                      </div>
                    )}
                    
                    {["pending", "shortlisted"].includes(application.status) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => handleWithdraw(application.id)}
                      >
                        Withdraw Application
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Applications Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Browse campaigns and apply to start earning from sponsorships
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Brand Outreach */}
        <TabsContent value="outreach" className="mt-4">
          {outreach.length > 0 ? (
            <div className="space-y-3">
              {outreach.map((item) => (
                <Card key={item.id} className="bg-card border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium">{item.brand_name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.status === "pending" 
                          ? "bg-yellow-500/20 text-yellow-400" 
                          : item.status === "accepted"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    
                    <div className="p-3 rounded-lg bg-white/5 mb-3">
                      <p className="text-sm">{item.message}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-muted-foreground">Proposed Budget</p>
                        <p className="font-medium text-yellow-400">
                          {item.proposed_budget_coins?.toLocaleString()} coins
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Type</p>
                        <p className="font-medium">
                          {SPONSORSHIP_TYPES[item.sponsorship_type] || item.sponsorship_type}
                        </p>
                      </div>
                    </div>
                    
                    {item.deliverables?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground mb-1">Deliverables:</p>
                        <ul className="text-sm list-disc list-inside">
                          {item.deliverables.map((d, i) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {item.status === "pending" && (
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => handleOutreachResponse(item.id, true, "I'm interested! Let's discuss further.")}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleOutreachResponse(item.id, false, "Thank you for reaching out, but I'll have to pass.")}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Decline
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Brand Outreach Yet</h3>
                <p className="text-sm text-muted-foreground">
                  As your content grows, brands will reach out to you directly
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Apply Dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent className="max-w-lg bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="w-5 h-5 text-primary" />
              Apply for Sponsorship
            </DialogTitle>
            <DialogDescription>
              {selectedCampaign?.title} by {selectedCampaign?.brand_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Campaign Summary */}
            <div className="p-3 rounded-lg bg-white/5 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium text-yellow-400">
                    {selectedCampaign?.budget_coins?.toLocaleString()} coins
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {SPONSORSHIP_TYPES[selectedCampaign?.sponsorship_type]}
                  </p>
                </div>
              </div>
            </div>

            {/* Pitch */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Your Pitch (min 50 characters)
              </label>
              <textarea
                value={applyForm.pitch}
                onChange={(e) => setApplyForm({ ...applyForm, pitch: e.target.value })}
                placeholder="Why should this brand work with you? Highlight your strengths..."
                className="w-full h-24 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {applyForm.pitch.length}/50 characters
              </p>
            </div>

            {/* Proposed Content */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Proposed Content/Integration
              </label>
              <textarea
                value={applyForm.proposed_content}
                onChange={(e) => setApplyForm({ ...applyForm, proposed_content: e.target.value })}
                placeholder="How will you integrate this brand into your content?"
                className="w-full h-20 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
              />
            </div>

            {/* Timeline */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Proposed Timeline
              </label>
              <Input
                value={applyForm.proposed_timeline}
                onChange={(e) => setApplyForm({ ...applyForm, proposed_timeline: e.target.value })}
                placeholder="e.g., 2 weeks from approval"
                className="bg-secondary/50 border-white/10"
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Your Asking Price (coins)
              </label>
              <Input
                type="number"
                value={applyForm.asking_price_coins}
                onChange={(e) => setApplyForm({ ...applyForm, asking_price_coins: parseInt(e.target.value) || 0 })}
                min="100"
                className="bg-secondary/50 border-white/10"
              />
            </div>

            {/* Series Selection */}
            {series.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">
                  Link to Series (optional)
                </label>
                <select
                  value={applyForm.series_id}
                  onChange={(e) => setApplyForm({ ...applyForm, series_id: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
                >
                  <option value="">Select a series...</option>
                  {series.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Portfolio Links */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Portfolio Links (one per line)
              </label>
              <textarea
                value={applyForm.portfolio_links.join("\n")}
                onChange={(e) => setApplyForm({ ...applyForm, portfolio_links: e.target.value.split("\n") })}
                placeholder="https://example.com/your-work"
                className="w-full h-20 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowApplyDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleApply}>
                <Send className="w-4 h-4 mr-2" />
                Submit Application
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SponsorshipMarketplace;
