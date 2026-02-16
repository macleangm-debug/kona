import React, { useState, useEffect } from "react";
import { 
  Ticket, Search, Filter, Clock, CheckCircle, AlertCircle, 
  ChevronDown, ChevronRight, Send, X, Mail, User, Calendar,
  ArrowUpCircle, ArrowDownCircle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const priorityColors = {
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusColors = {
  open: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  closed: "bg-green-500/20 text-green-400",
};

const SupportTicketsModule = () => {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ open: 0, in_progress: 0, closed: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [responseText, setResponseText] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      const status = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_URL}/api/support/admin/tickets${status}`);
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets/stats`);
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleAddResponse = async (ticketId) => {
    if (!responseText.trim()) return;
    setSubmitting(true);
    
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets/${ticketId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_text: responseText })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setSelectedTicket(updated);
        setResponseText("");
        fetchTickets();
      }
    } catch (error) {
      console.error("Failed to add response:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseTicket = async (ticketId) => {
    if (!resolutionText.trim()) return;
    setSubmitting(true);
    
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets/${ticketId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution: resolutionText })
      });
      
      if (res.ok) {
        setSelectedTicket(null);
        setResolutionText("");
        fetchTickets();
        fetchStats();
      }
    } catch (error) {
      console.error("Failed to close ticket:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePriority = async (ticketId, priority) => {
    try {
      const res = await fetch(`${API_URL}/api/support/admin/tickets/${ticketId}/priority`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority })
      });
      
      if (res.ok) {
        fetchTickets();
        if (selectedTicket?.ticket_id === ticketId) {
          const updated = await res.json();
          setSelectedTicket(updated);
        }
      }
    } catch (error) {
      console.error("Failed to update priority:", error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.ticket_id.toLowerCase().includes(query) ||
      ticket.email.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="space-y-6" data-testid="support-tickets-module">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Tickets</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Ticket className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-400">Open</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.open}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-400">In Progress</p>
              <p className="text-2xl font-bold text-blue-400">{stats.in_progress || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-400">Closed</p>
              <p className="text-2xl font-bold text-green-400">{stats.closed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by ticket ID, email, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No tickets found
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket) => (
                <tr 
                  key={ticket.ticket_id} 
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-purple-400">#{ticket.ticket_id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm truncate max-w-[150px]">{ticket.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm truncate max-w-[200px] block">{ticket.subject}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-white/10 px-2 py-1 rounded">{ticket.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-1 rounded border", priorityColors[ticket.priority])}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs px-2 py-1 rounded", statusColors[ticket.status])}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDate(ticket.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a2e] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="font-mono text-purple-400">#{selectedTicket.ticket_id}</span>
                <h2 className="text-lg font-semibold mt-1">{selectedTicket.subject}</h2>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{selectedTicket.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>

              {/* Priority selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Priority:</span>
                <div className="flex gap-1">
                  {["low", "normal", "high", "urgent"].map((p) => (
                    <button
                      key={p}
                      onClick={() => handleUpdatePriority(selectedTicket.ticket_id, p)}
                      className={cn(
                        "text-xs px-2 py-1 rounded border transition-colors",
                        selectedTicket.priority === p ? priorityColors[p] : "border-white/10 text-gray-500 hover:border-white/30"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="bg-white/5 rounded-xl p-4">
                <p className="text-sm text-gray-400 mb-2">Description</p>
                <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              {/* Responses */}
              {selectedTicket.responses?.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">Responses</p>
                  {selectedTicket.responses.map((response) => (
                    <div key={response.id} className="bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-400">{response.responder}</span>
                        <span className="text-xs text-gray-500">{formatDate(response.created_at)}</span>
                      </div>
                      <p className="text-sm">{response.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Resolution */}
              {selectedTicket.status === "closed" && selectedTicket.resolution && (
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Resolution</span>
                  </div>
                  <p className="text-sm">{selectedTicket.resolution}</p>
                </div>
              )}
            </div>

            {/* Actions (only for open tickets) */}
            {selectedTicket.status !== "closed" && (
              <div className="p-4 border-t border-white/10 space-y-4">
                {/* Add response */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Add Response</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your response..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                    <Button 
                      onClick={() => handleAddResponse(selectedTicket.ticket_id)}
                      disabled={!responseText.trim() || submitting}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>

                {/* Close ticket */}
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Close Ticket with Resolution</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter resolution message (sent to user via email)..."
                      value={resolutionText}
                      onChange={(e) => setResolutionText(e.target.value)}
                      className="bg-white/5 border-white/10"
                    />
                    <Button 
                      onClick={() => handleCloseTicket(selectedTicket.ticket_id)}
                      disabled={!resolutionText.trim() || submitting}
                      className="bg-green-600 hover:bg-green-500"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Close & Email
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsModule;
