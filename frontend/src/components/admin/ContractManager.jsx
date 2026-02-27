import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  FileText, Plus, Download, Eye, Trash2, Send, Check, X,
  Loader2, Users, Clock, DollarSign, FileCheck, AlertCircle,
  ChevronDown, ChevronRight, Printer, Edit, Copy, Crown
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/config";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400", icon: FileText },
  sent: { label: "Sent", color: "bg-blue-500/20 text-blue-400", icon: Send },
  signed: { label: "Signed", color: "bg-green-500/20 text-green-400", icon: FileCheck },
  active: { label: "Active", color: "bg-emerald-500/20 text-emerald-400", icon: Check },
  terminated: { label: "Terminated", color: "bg-red-500/20 text-red-400", icon: X },
  expired: { label: "Expired", color: "bg-orange-500/20 text-orange-400", icon: Clock }
};

export const ContractManager = ({ token }) => {
  const [contracts, setContracts] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState(null);
  const [platformDefaults, setPlatformDefaults] = useState(null);

  // Form state
  const [form, setForm] = useState({
    // Creator details
    creator_name: "",
    creator_email: "",
    creator_address: "",
    creator_tax_id: "",
    creator_company: "",
    // Platform details (loaded from defaults)
    platform_name: "Dar24 Media Limited",
    platform_email: "partnerships@dar24media.com",
    platform_address: "Dar es Salaam, Tanzania",
    platform_tax_id: "",
    platform_company: "Dar24 Media Limited",
    // Platform provider (technology partner)
    platform_provider_name: "Kona Streaming Services",
    platform_provider_role: "Technology Platform Provider",
    // Revenue terms
    platform_fee: 25,
    creator_share: 60,
    platform_share: 40,
    min_payout: 50000,
    payout_frequency: "monthly",
    currency: "TZS",
    // Contract terms
    duration_months: 12,
    auto_renewal: true,
    exclusivity: false,
    exclusivity_scope: "none",
    content_ownership: "creator",
    termination_notice: 30,
    // Territory & Super Creator
    territory: "",
    territory_exclusive: false,
    is_super_creator: false,
    can_manage_creators: false,
    sub_creator_commission: 10,
    sub_creator_negotiable_terms: false,
    show_sub_creator_distribution: false,
    // Tax terms
    vat_handling: "creator_responsible",
    withholding_percent: 0,
    tax_jurisdiction: "",
    creator_vat_number: "",
    // Additional
    additional_clauses: "",
    notes: ""
  });

  const fetchContracts = useCallback(async () => {
    try {
      const url = filterStatus 
        ? `${API}/contracts/list?status=${filterStatus}`
        : `${API}/contracts/list`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContracts(res.data.contracts || []);
      setStats(res.data.stats || {});
    } catch (e) {
      console.error("Error fetching contracts:", e);
    }
    setLoading(false);
  }, [token, filterStatus]);

  const fetchDefaults = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/contracts/defaults/platform`);
      setPlatformDefaults(res.data);
      // Pre-fill platform info
      setForm(prev => ({
        ...prev,
        platform_name: res.data.name || prev.platform_name,
        platform_email: res.data.email || prev.platform_email,
        platform_address: res.data.address || prev.platform_address,
        platform_company: res.data.company_name || prev.platform_company,
        platform_provider_name: res.data.platform_provider?.name || prev.platform_provider_name,
        platform_provider_role: res.data.platform_provider?.role || prev.platform_provider_role,
        platform_fee: res.data.default_revenue_terms?.platform_fee_percent || prev.platform_fee,
        creator_share: res.data.default_revenue_terms?.creator_share_percent || prev.creator_share,
        platform_share: res.data.default_revenue_terms?.platform_share_percent || prev.platform_share,
        min_payout: res.data.default_revenue_terms?.minimum_payout_threshold || prev.min_payout,
        currency: res.data.default_revenue_terms?.currency || prev.currency
      }));
    } catch (e) {
      console.error("Error fetching defaults:", e);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchContracts();
      fetchDefaults();
    }
  }, [token, fetchContracts, fetchDefaults]);

  const handleCreate = async () => {
    // Validation
    if (!form.creator_name || !form.creator_email) {
      toast.error("Creator name and email are required");
      return;
    }
    if (form.creator_share + form.platform_share !== 100) {
      toast.error("Creator and Platform shares must equal 100%");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        creator: {
          name: form.creator_name,
          email: form.creator_email,
          address: form.creator_address || null,
          tax_id: form.creator_tax_id || null,
          company_name: form.creator_company || null
        },
        platform: {
          name: form.platform_name,
          email: form.platform_email,
          address: form.platform_address || null,
          tax_id: form.platform_tax_id || null,
          company_name: form.platform_company || null
        },
        platform_provider: {
          name: form.platform_provider_name,
          role: form.platform_provider_role
        },
        revenue_terms: {
          platform_fee_percent: form.platform_fee,
          creator_share_percent: form.creator_share,
          platform_share_percent: form.platform_share,
          minimum_payout_threshold: form.min_payout,
          payout_frequency: form.payout_frequency,
          currency: form.currency
        },
        contract_terms: {
          duration_months: form.duration_months,
          auto_renewal: form.auto_renewal,
          exclusivity: form.exclusivity,
          exclusivity_scope: form.exclusivity_scope,
          content_ownership: form.content_ownership,
          termination_notice_days: form.termination_notice,
          territory: form.territory || null,
          territory_exclusive: form.territory_exclusive,
          is_super_creator: form.is_super_creator,
          can_manage_creators: form.can_manage_creators,
          sub_creator_commission_percent: form.sub_creator_commission,
          sub_creator_negotiable_terms: form.sub_creator_negotiable_terms,
          show_sub_creator_distribution: form.show_sub_creator_distribution
        },
        tax_terms: {
          vat_handling: form.vat_handling,
          withholding_tax_percent: form.withholding_percent,
          tax_jurisdiction: form.tax_jurisdiction || null,
          creator_tax_registered: !!form.creator_vat_number,
          creator_vat_number: form.creator_vat_number || null
        },
        additional_clauses: form.additional_clauses ? form.additional_clauses.split('\n').filter(c => c.trim()) : null,
        notes: form.notes || null
      };

      const res = await axios.post(`${API}/contracts/create`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Contract ${res.data.contract.contract_number} created!`);
      setShowCreate(false);
      resetForm();
      fetchContracts();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create contract");
    }
    setCreating(false);
  };

  const resetForm = () => {
    setForm({
      creator_name: "",
      creator_email: "",
      creator_address: "",
      creator_tax_id: "",
      creator_company: "",
      platform_name: platformDefaults?.name || "Dar24 Media Limited",
      platform_email: platformDefaults?.email || "partnerships@dar24media.com",
      platform_address: platformDefaults?.address || "Dar es Salaam, Tanzania",
      platform_tax_id: "",
      platform_company: platformDefaults?.company_name || "Dar24 Media Limited",
      platform_provider_name: platformDefaults?.platform_provider?.name || "Kona Streaming Services",
      platform_provider_role: platformDefaults?.platform_provider?.role || "Technology Platform Provider",
      platform_fee: 25,
      creator_share: 60,
      platform_share: 40,
      min_payout: 50000,
      payout_frequency: "monthly",
      currency: "TZS",
      duration_months: 12,
      auto_renewal: true,
      exclusivity: false,
      exclusivity_scope: "none",
      content_ownership: "creator",
      termination_notice: 30,
      territory: "",
      territory_exclusive: false,
      is_super_creator: false,
      can_manage_creators: false,
      sub_creator_commission: 10,
      sub_creator_negotiable_terms: false,
      show_sub_creator_distribution: false,
      vat_handling: "creator_responsible",
      withholding_percent: 0,
      tax_jurisdiction: "",
      creator_vat_number: "",
      additional_clauses: "",
      notes: ""
    });
  };

  const handlePreview = async (contract) => {
    try {
      const res = await axios.get(`${API}/contracts/${contract.id}/html`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewHtml(res.data);
      setSelectedContract(contract);
      setShowPreview(true);
    } catch (e) {
      toast.error("Failed to load preview");
    }
  };

  const handleExport = async (contract, format) => {
    try {
      if (format === "html") {
        const res = await axios.get(`${API}/contracts/${contract.id}/html`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Create download
        const blob = new Blob([res.data], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${contract.contract_number}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("HTML exported!");
      } else if (format === "print") {
        const res = await axios.get(`${API}/contracts/${contract.id}/html`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const printWindow = window.open('', '_blank');
        printWindow.document.write(res.data);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (e) {
      toast.error(`Failed to export ${format}`);
    }
  };

  const handleStatusUpdate = async (contract, newStatus) => {
    try {
      await axios.patch(`${API}/contracts/${contract.id}/status`, {
        status: newStatus,
        signed_date: newStatus === "signed" ? new Date().toISOString() : null,
        signed_by_creator: newStatus === "signed",
        signed_by_platform: newStatus === "signed"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Status updated to ${newStatus}`);
      fetchContracts();
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (contract) => {
    if (!confirm("Delete this draft contract?")) return;
    try {
      await axios.delete(`${API}/contracts/${contract.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Contract deleted");
      fetchContracts();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="contract-manager">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <Card 
              key={status}
              className={`p-4 cursor-pointer transition-all ${filterStatus === status ? 'ring-2 ring-primary' : 'hover:bg-white/5'}`}
              onClick={() => setFilterStatus(filterStatus === status ? null : status)}
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold">{stats[status] || 0}</p>
                  <p className="text-xs text-muted-foreground">{config.label}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Creator Contracts</h3>
          {filterStatus && (
            <p className="text-sm text-muted-foreground">
              Filtered by: {STATUS_CONFIG[filterStatus]?.label}
              <button 
                onClick={() => setFilterStatus(null)}
                className="ml-2 text-primary hover:underline"
              >
                Clear
              </button>
            </p>
          )}
        </div>
        <Button onClick={() => setShowCreate(true)} data-testid="create-contract-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">No Contracts Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first creator partnership contract
          </p>
          <Button onClick={() => setShowCreate(true)}>Create Contract</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {contracts.map(contract => {
            const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={contract.id} className="p-4" data-testid={`contract-${contract.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{contract.creator?.name}</h4>
                      {contract.contract_terms?.is_super_creator && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Super Creator
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {contract.contract_number}
                      </span>
                    </div>
                    {contract.contract_terms?.territory && (
                      <p className="text-sm text-purple-400 mb-2">
                        Territory: {contract.contract_terms.territory}
                        {contract.contract_terms.territory_exclusive && " (Exclusive)"}
                      </p>
                    )}
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Creator Share</p>
                        <p className="font-medium">{contract.revenue_terms?.creator_share_percent}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Platform Fee</p>
                        <p className="font-medium">{contract.revenue_terms?.platform_fee_percent}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duration</p>
                        <p className="font-medium">{contract.contract_terms?.duration_months} months</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{new Date(contract.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handlePreview(contract)} title="Preview">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleExport(contract, "html")} title="Download HTML">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleExport(contract, "print")} title="Print">
                      <Printer className="w-4 h-4" />
                    </Button>
                    {contract.status === "draft" && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(contract, "sent")} title="Mark as Sent">
                          <Send className="w-4 h-4 text-blue-400" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(contract)} title="Delete">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </>
                    )}
                    {contract.status === "sent" && (
                      <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(contract, "signed")} title="Mark as Signed">
                        <FileCheck className="w-4 h-4 text-green-400" />
                      </Button>
                    )}
                    {contract.status === "signed" && (
                      <Button variant="ghost" size="icon" onClick={() => handleStatusUpdate(contract, "active")} title="Activate">
                        <Check className="w-4 h-4 text-emerald-400" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Contract Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Create Creator Partnership Contract
            </DialogTitle>
            <DialogDescription>
              Fill in the details to generate a comprehensive partnership agreement
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="creator" className="mt-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="creator">Creator</TabsTrigger>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="terms">Terms</TabsTrigger>
              <TabsTrigger value="tax">Tax & Legal</TabsTrigger>
            </TabsList>

            <TabsContent value="creator" className="space-y-4 mt-4">
              <h4 className="font-medium text-sm text-muted-foreground">Creator Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Full Name *</label>
                  <Input
                    value={form.creator_name}
                    onChange={(e) => setForm({...form, creator_name: e.target.value})}
                    placeholder="Creator's legal name"
                  />
                </div>
                <div>
                  <label className="text-sm">Email *</label>
                  <Input
                    type="email"
                    value={form.creator_email}
                    onChange={(e) => setForm({...form, creator_email: e.target.value})}
                    placeholder="creator@email.com"
                  />
                </div>
                <div>
                  <label className="text-sm">Company Name (if applicable)</label>
                  <Input
                    value={form.creator_company}
                    onChange={(e) => setForm({...form, creator_company: e.target.value})}
                    placeholder="Business/Company name"
                  />
                </div>
                <div>
                  <label className="text-sm">Tax ID / VAT Number</label>
                  <Input
                    value={form.creator_tax_id}
                    onChange={(e) => setForm({...form, creator_tax_id: e.target.value})}
                    placeholder="Tax identification number"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm">Address</label>
                  <Input
                    value={form.creator_address}
                    onChange={(e) => setForm({...form, creator_address: e.target.value})}
                    placeholder="Full address"
                  />
                </div>
              </div>

              <h4 className="font-medium text-sm text-muted-foreground mt-6">Company Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Company Name</label>
                  <Input
                    value={form.platform_company}
                    onChange={(e) => setForm({...form, platform_company: e.target.value, platform_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm">Company Email</label>
                  <Input
                    value={form.platform_email}
                    onChange={(e) => setForm({...form, platform_email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-sm">Address</label>
                  <Input
                    value={form.platform_address}
                    onChange={(e) => setForm({...form, platform_address: e.target.value})}
                    placeholder="Dar es Salaam, Tanzania"
                  />
                </div>
                <div>
                  <label className="text-sm">Tax ID</label>
                  <Input
                    value={form.platform_tax_id}
                    onChange={(e) => setForm({...form, platform_tax_id: e.target.value})}
                  />
                </div>
              </div>

              <h4 className="font-medium text-sm text-muted-foreground mt-6">Technology Platform Partner</h4>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm">Platform Provider</label>
                    <Input
                      value={form.platform_provider_name}
                      onChange={(e) => setForm({...form, platform_provider_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm">Role</label>
                    <Input
                      value={form.platform_provider_role}
                      onChange={(e) => setForm({...form, platform_provider_role: e.target.value})}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  The platform provider will be mentioned in the contract as the technology partner
                </p>
              </div>
            </TabsContent>

            <TabsContent value="revenue" className="space-y-4 mt-4">
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-yellow-400" />
                  Revenue Split Calculator
                </h4>
                <p className="text-sm text-muted-foreground">
                  For every $100: Platform Fee ${form.platform_fee} → Net ${100 - form.platform_fee} → 
                  Creator ${((100 - form.platform_fee) * form.creator_share / 100).toFixed(2)} / 
                  Platform ${((100 - form.platform_fee) * form.platform_share / 100).toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Platform Fee %</label>
                  <Input
                    type="number"
                    value={form.platform_fee}
                    onChange={(e) => setForm({...form, platform_fee: parseFloat(e.target.value) || 0})}
                    min={0}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Deducted first from gross</p>
                </div>
                <div>
                  <label className="text-sm">Creator Share % (of net)</label>
                  <Input
                    type="number"
                    value={form.creator_share}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm({...form, creator_share: val, platform_share: 100 - val});
                    }}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="text-sm">Platform Share % (of net)</label>
                  <Input
                    type="number"
                    value={form.platform_share}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setForm({...form, platform_share: val, creator_share: 100 - val});
                    }}
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Minimum Payout</label>
                  <Input
                    type="number"
                    value={form.min_payout}
                    onChange={(e) => setForm({...form, min_payout: parseFloat(e.target.value) || 0})}
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-sm">Payout Frequency</label>
                  <select
                    className="w-full p-2 rounded-lg bg-secondary/50 border border-white/10"
                    value={form.payout_frequency}
                    onChange={(e) => setForm({...form, payout_frequency: e.target.value})}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm">Currency</label>
                  <select
                    className="w-full p-2 rounded-lg bg-secondary/50 border border-white/10"
                    value={form.currency}
                    onChange={(e) => setForm({...form, currency: e.target.value})}
                  >
                    <optgroup label="African Currencies">
                      <option value="TZS">TZS - Tanzanian Shilling</option>
                      <option value="KES">KES - Kenyan Shilling</option>
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="RWF">RWF - Rwandan Franc</option>
                      <option value="NGN">NGN - Nigerian Naira</option>
                      <option value="GHS">GHS - Ghanaian Cedi</option>
                      <option value="ZAR">ZAR - South African Rand</option>
                    </optgroup>
                    <optgroup label="International">
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="terms" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Contract Duration (months)</label>
                  <Input
                    type="number"
                    value={form.duration_months}
                    onChange={(e) => setForm({...form, duration_months: parseInt(e.target.value) || 12})}
                    min={1}
                    max={60}
                  />
                </div>
                <div>
                  <label className="text-sm">Termination Notice (days)</label>
                  <Input
                    type="number"
                    value={form.termination_notice}
                    onChange={(e) => setForm({...form, termination_notice: parseInt(e.target.value) || 30})}
                    min={7}
                    max={90}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.auto_renewal}
                    onChange={(e) => setForm({...form, auto_renewal: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>Auto-renewal at end of term</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.exclusivity}
                    onChange={(e) => setForm({...form, exclusivity: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>Exclusivity clause</span>
                </label>

                {form.exclusivity && (
                  <div className="ml-6">
                    <label className="text-sm">Exclusivity Scope</label>
                    <select
                      className="w-full p-2 rounded-lg bg-secondary/50 border border-white/10"
                      value={form.exclusivity_scope}
                      onChange={(e) => setForm({...form, exclusivity_scope: e.target.value})}
                    >
                      <option value="platform">Full Platform Exclusivity</option>
                      <option value="category">Category Exclusivity</option>
                      <option value="territory">Territory Exclusivity</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Territory & Super Creator Section */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  Territory & Super Creator
                </h4>
                
                <div>
                  <label className="text-sm">Territory / Region</label>
                  <Input
                    value={form.territory}
                    onChange={(e) => setForm({...form, territory: e.target.value})}
                    placeholder="e.g., United Republic of Tanzania"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.territory_exclusive}
                    onChange={(e) => setForm({...form, territory_exclusive: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <span>Exclusive rights to this territory</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_super_creator}
                    onChange={(e) => setForm({
                      ...form, 
                      is_super_creator: e.target.checked,
                      can_manage_creators: e.target.checked,
                      exclusivity: e.target.checked || form.exclusivity,
                      exclusivity_scope: e.target.checked ? "territory" : form.exclusivity_scope
                    })}
                    className="w-4 h-4"
                  />
                  <span className="font-medium text-purple-400">Designate as Super Creator</span>
                </label>

                {form.is_super_creator && (
                  <div className="ml-6 space-y-3 p-3 bg-white/5 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.can_manage_creators}
                        onChange={(e) => setForm({...form, can_manage_creators: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <span>Can recruit & manage other creators</span>
                    </label>
                    
                    {form.can_manage_creators && (
                      <div>
                        <label className="text-sm">Sub-Creator Commission %</label>
                        <Input
                          type="number"
                          value={form.sub_creator_commission}
                          onChange={(e) => setForm({...form, sub_creator_commission: parseFloat(e.target.value) || 10})}
                          min={0}
                          max={50}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {form.sub_creator_negotiable_terms 
                            ? "Minimum % Super Creator earns from sub-creators' net revenue"
                            : "Fixed % Super Creator earns from sub-creators' net revenue"
                          }
                        </p>
                      </div>
                    )}

                    {form.can_manage_creators && (
                      <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.sub_creator_negotiable_terms}
                            onChange={(e) => setForm({...form, sub_creator_negotiable_terms: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <span className="font-medium">Allow negotiable sub-creator terms</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-2 ml-6">
                          {form.sub_creator_negotiable_terms 
                            ? "Super Creator CAN negotiate individual revenue splits with each sub-creator (subject to minimum commission and platform fee)"
                            : "Super Creator must use standard platform terms for all sub-creators"
                          }
                        </p>
                      </div>
                    )}

                    {form.can_manage_creators && (
                      <div className="mt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.show_sub_creator_distribution}
                            onChange={(e) => setForm({...form, show_sub_creator_distribution: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <span>Show sub-creator revenue table in contract</span>
                        </label>
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          Uncheck to hide the detailed sub-creator revenue distribution from the contract
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm">Content Ownership</label>
                <select
                  className="w-full p-2 rounded-lg bg-secondary/50 border border-white/10"
                  value={form.content_ownership}
                  onChange={(e) => setForm({...form, content_ownership: e.target.value})}
                >
                  <option value="creator">Creator Retains Ownership (Recommended)</option>
                  <option value="shared">Shared Ownership</option>
                  <option value="platform">Platform Ownership</option>
                </select>
              </div>
            </TabsContent>

            <TabsContent value="tax" className="space-y-4 mt-4">
              <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-blue-400" />
                  VAT/Tax Handling
                </h4>
                <p className="text-sm text-muted-foreground">
                  Choose how taxes will be handled in this partnership
                </p>
              </div>

              <div>
                <label className="text-sm">VAT/GST Handling</label>
                <select
                  className="w-full p-2 rounded-lg bg-secondary/50 border border-white/10"
                  value={form.vat_handling}
                  onChange={(e) => setForm({...form, vat_handling: e.target.value})}
                >
                  <option value="creator_responsible">Creator Self-Assessment (Recommended)</option>
                  <option value="platform_withholds">Platform Withholds Tax</option>
                  <option value="gross_up">Gross-Up Clause</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.vat_handling === "creator_responsible" && "Creator handles their own VAT/tax obligations"}
                  {form.vat_handling === "platform_withholds" && "Platform deducts and remits tax on creator's behalf"}
                  {form.vat_handling === "gross_up" && "Payments adjusted so creator receives net amount after any withholding"}
                </p>
              </div>

              {form.vat_handling === "platform_withholds" && (
                <div>
                  <label className="text-sm">Withholding Tax %</label>
                  <Input
                    type="number"
                    value={form.withholding_percent}
                    onChange={(e) => setForm({...form, withholding_percent: parseFloat(e.target.value) || 0})}
                    min={0}
                    max={50}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Tax Jurisdiction</label>
                  <Input
                    value={form.tax_jurisdiction}
                    onChange={(e) => setForm({...form, tax_jurisdiction: e.target.value})}
                    placeholder="e.g., United Kingdom, Germany"
                  />
                </div>
                <div>
                  <label className="text-sm">Creator VAT Number (if registered)</label>
                  <Input
                    value={form.creator_vat_number}
                    onChange={(e) => setForm({...form, creator_vat_number: e.target.value})}
                    placeholder="e.g., GB123456789"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm">Additional Clauses (one per line)</label>
                <textarea
                  className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                  rows={3}
                  value={form.additional_clauses}
                  onChange={(e) => setForm({...form, additional_clauses: e.target.value})}
                  placeholder="Enter any additional contract clauses..."
                />
              </div>

              <div>
                <label className="text-sm">Internal Notes (not included in contract)</label>
                <textarea
                  className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  placeholder="Internal notes about this contract..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-6">
            <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Contract"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <div className="sticky top-0 bg-background border-b p-4 flex justify-between items-center">
            <DialogTitle>Contract Preview - {selectedContract?.contract_number}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport(selectedContract, "html")}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport(selectedContract, "print")}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
          <div className="overflow-y-auto p-4 bg-white">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractManager;
