import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Users, Briefcase, Clock, Star, CheckCircle, XCircle, Eye,
  Filter, Search, ChevronLeft, Loader2, Calendar, MapPin,
  Mail, Phone, ExternalLink, Linkedin, Link as LinkIcon,
  FileText, Award, AlertCircle, UserCheck, ArrowUpRight,
  Settings, Plus, Trash2, Target, Percent, Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/config";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "New", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  reviewed: { label: "Under Review", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Eye },
  shortlisted: { label: "Shortlisted", color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Star },
  interview: { label: "Interview", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30", icon: Calendar },
  hired: { label: "Hired", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle }
};

const PRIORITY_CONFIG = {
  high: { label: "High Priority", color: "bg-orange-500/20 text-orange-400" },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-400" },
  low: { label: "Low", color: "bg-gray-500/20 text-gray-400" }
};

const QUALIFICATION_CONFIG = {
  excellent: { label: "Excellent Match", color: "bg-green-500/20 text-green-400", icon: Sparkles },
  good: { label: "Good Match", color: "bg-blue-500/20 text-blue-400", icon: CheckCircle },
  partial: { label: "Partial Match", color: "bg-yellow-500/20 text-yellow-400", icon: AlertCircle },
  weak: { label: "Weak Match", color: "bg-gray-500/20 text-gray-400", icon: XCircle }
};

const JobApplicationsModule = ({ token }) => {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [stats, setStats] = useState(null);
  
  // View modes: "list", "detail", "filters", "skill-search"
  const [viewMode, setViewMode] = useState("list");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [matchAllSkills, setMatchAllSkills] = useState(false);
  
  // Keyword Filters
  const [keywordFilters, setKeywordFilters] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [filterForm, setFilterForm] = useState({
    name: "",
    position_type: "",
    required_skills: "",
    preferred_skills: "",
    required_keywords: "",
    min_experience: 0,
    is_active: true
  });
  
  // Update form
  const [updateForm, setUpdateForm] = useState({
    status: "",
    admin_notes: "",
    interview_date: ""
  });

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      
      const res = await axios.get(`${API}/careers/admin/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setApplications(res.data.applications || []);
      setStats(res.data.stats || null);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      toast.error("Failed to load applications");
    }
    setLoading(false);
  };

  const fetchKeywordFilters = async () => {
    try {
      const res = await axios.get(`${API}/careers/admin/filters`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setKeywordFilters(res.data.filters || []);
    } catch (err) {
      console.error("Failed to fetch filters:", err);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchKeywordFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, priorityFilter]);

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setUpdateForm({
      status: app.status,
      admin_notes: app.admin_notes || "",
      interview_date: app.interview_date || ""
    });
  };

  const handleUpdateStatus = async () => {
    if (!selectedApp) return;
    setUpdating(true);
    
    try {
      await axios.put(
        `${API}/careers/admin/applications/${selectedApp.id}`,
        updateForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Application status updated to ${updateForm.status}`);
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update application");
    }
    setUpdating(false);
  };

  const handleDeleteApp = async (appId) => {
    if (!window.confirm("Are you sure you want to delete this application?")) return;
    
    try {
      await axios.delete(`${API}/careers/admin/applications/${appId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Application deleted");
      if (selectedApp?.id === appId) setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      toast.error("Failed to delete application");
    }
  };

  // Filter applications by search query
  const filteredApps = applications.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.full_name?.toLowerCase().includes(query) ||
      app.email?.toLowerCase().includes(query) ||
      app.position_interest?.toLowerCase().includes(query) ||
      app.skills?.some(s => s.toLowerCase().includes(query))
    );
  });

  // Detail View
  if (selectedApp) {
    const StatusIcon = STATUS_CONFIG[selectedApp.status]?.icon || Clock;
    
    return (
      <div className="space-y-6" data-testid="application-detail-view">
        {/* Back Button */}
        <button
          onClick={() => setSelectedApp(null)}
          className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
          data-testid="back-to-list-btn"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Applications
        </button>

        {/* Header Card */}
        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold">{selectedApp.full_name}</h2>
                <Badge className={PRIORITY_CONFIG[selectedApp.priority]?.color}>
                  {PRIORITY_CONFIG[selectedApp.priority]?.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">{selectedApp.position_interest}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {selectedApp.country}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-4 h-4" />
                  {selectedApp.experience_years} years experience
                </span>
              </div>
            </div>
            <div className="text-right">
              <Badge className={STATUS_CONFIG[selectedApp.status]?.color}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {STATUS_CONFIG[selectedApp.status]?.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Score: <span className="font-bold text-primary">{selectedApp.auto_score}/100</span>
              </p>
            </div>
          </div>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Details */}
          <div className="space-y-4">
            {/* Contact Info */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Contact Information
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a href={`mailto:${selectedApp.email}`} className="text-blue-400 hover:underline">
                    {selectedApp.email}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{selectedApp.phone}</span>
                </div>
                {selectedApp.linkedin_url && (
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-4 h-4 text-muted-foreground" />
                    <a href={selectedApp.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                      LinkedIn Profile <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {selectedApp.portfolio_url && (
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-4 h-4 text-muted-foreground" />
                    <a href={selectedApp.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                      Portfolio/Website <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </Card>

            {/* Professional Info */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Professional Background
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Role</span>
                  <span>{selectedApp.current_role || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience</span>
                  <span>{selectedApp.experience_years} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available Start</span>
                  <span>{selectedApp.available_start || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Salary Expectation</span>
                  <span>{selectedApp.salary_expectation || "Not specified"}</span>
                </div>
              </div>
            </Card>

            {/* Skills */}
            {selectedApp.skills?.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.skills.map((skill, i) => (
                    <Badge key={i} variant="outline" className="bg-white/5">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Cover Letter */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Cover Letter
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {selectedApp.cover_letter}
              </p>
            </Card>

            {/* Flags */}
            {selectedApp.flags?.length > 0 && (
              <Card className="p-5 bg-yellow-500/5 border-yellow-500/20">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  Auto-detected Flags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApp.flags.map((flag, i) => (
                    <Badge key={i} className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                      {flag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-4">
            {/* Update Status */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Update Status
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Status</label>
                  <select
                    value={updateForm.status}
                    onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                    data-testid="status-select"
                  >
                    <option value="pending">New</option>
                    <option value="reviewed">Under Review</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="hired">Hired</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                
                {updateForm.status === "interview" && (
                  <div>
                    <label className="block text-sm mb-2">Interview Date</label>
                    <Input
                      type="datetime-local"
                      value={updateForm.interview_date}
                      onChange={(e) => setUpdateForm({ ...updateForm, interview_date: e.target.value })}
                      className="bg-white/5 border-white/10"
                      data-testid="interview-date-input"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm mb-2">Admin Notes</label>
                  <Textarea
                    value={updateForm.admin_notes}
                    onChange={(e) => setUpdateForm({ ...updateForm, admin_notes: e.target.value })}
                    placeholder="Internal notes about this candidate..."
                    className="bg-white/5 border-white/10"
                    rows={4}
                    data-testid="admin-notes-input"
                  />
                </div>
                
                <Button 
                  onClick={handleUpdateStatus} 
                  className="w-full bg-primary"
                  disabled={updating}
                  data-testid="update-status-btn"
                >
                  {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update Application
                </Button>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                  onClick={() => setUpdateForm({ ...updateForm, status: "shortlisted" })}
                  data-testid="shortlist-btn"
                >
                  <Star className="w-3 h-3 mr-1" />
                  Shortlist
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                  onClick={() => setUpdateForm({ ...updateForm, status: "interview" })}
                  data-testid="schedule-interview-btn"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  Interview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => setUpdateForm({ ...updateForm, status: "rejected" })}
                  data-testid="reject-btn"
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/30"
                  onClick={() => handleDeleteApp(selectedApp.id)}
                  data-testid="delete-btn"
                >
                  Delete
                </Button>
              </div>
            </Card>

            {/* Meta Info */}
            <Card className="p-5 bg-white/5">
              <div className="text-xs text-muted-foreground space-y-2">
                <div className="flex justify-between">
                  <span>Application ID</span>
                  <span className="font-mono">{selectedApp.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between">
                  <span>Submitted</span>
                  <span>{new Date(selectedApp.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Source</span>
                  <span>{selectedApp.how_heard || "Unknown"}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6" data-testid="job-applications-module">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 bg-gradient-to-br from-gray-500/10 to-gray-600/5 border-gray-500/20">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-gray-400" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">New</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{stats.shortlisted}</p>
                <p className="text-xs text-muted-foreground">Shortlisted</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold">{stats.interview}</p>
                <p className="text-xs text-muted-foreground">Interviews</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
            <div className="flex items-center gap-3">
              <ArrowUpRight className="w-6 h-6 text-orange-400" />
              <div>
                <p className="text-2xl font-bold">{stats.high_priority}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
              data-testid="search-input"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
              data-testid="status-filter"
            >
              <option value="">All Status</option>
              <option value="pending">New</option>
              <option value="reviewed">Under Review</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
              data-testid="priority-filter"
            >
              <option value="">All Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Applications List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No applications found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => {
            const StatusIcon = STATUS_CONFIG[app.status]?.icon || Clock;
            return (
              <Card
                key={app.id}
                className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => handleSelectApp(app)}
                data-testid={`application-card-${app.id}`}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {app.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{app.full_name}</h3>
                      <Badge className={PRIORITY_CONFIG[app.priority]?.color + " text-xs"}>
                        {app.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {app.position_interest} • {app.experience_years}y experience • {app.country}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {app.skills?.slice(0, 3).map((skill, i) => (
                        <span key={i} className="text-xs bg-white/10 px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                      {app.skills?.length > 3 && (
                        <span className="text-xs text-muted-foreground">+{app.skills.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {/* Status & Score */}
                  <div className="text-right flex-shrink-0">
                    <Badge className={STATUS_CONFIG[app.status]?.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {STATUS_CONFIG[app.status]?.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      Score: <span className="font-bold text-primary">{app.auto_score}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default JobApplicationsModule;
