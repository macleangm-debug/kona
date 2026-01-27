import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeft, BarChart3, Users, Film, CreditCard, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const AdminPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_admin) {
      navigate("/");
      return;
    }
    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, seriesRes, transRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers }),
        axios.get(`${API}/admin/users`, { headers }),
        axios.get(`${API}/admin/series`, { headers }),
        axios.get(`${API}/admin/transactions`, { headers })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setSeriesList(seriesRes.data);
      setTransactions(transRes.data.transactions);
    } catch (e) {
      toast.error("Failed to load admin data");
      navigate("/");
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "series", label: "Series", icon: Film },
    { id: "transactions", label: "Revenue", icon: CreditCard },
  ];

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading text-xl font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground">Manage your platform</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "bg-primary text-white" 
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === "dashboard" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10">
              <p className="text-xs text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.total_users}</p>
              <p className="text-xs text-green-400">+{stats.recent_signups} this week</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-green-500/20 to-green-600/10">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="text-2xl font-bold">${stats.total_revenue.toFixed(2)}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10">
              <p className="text-xs text-muted-foreground">Total Series</p>
              <p className="text-2xl font-bold">{stats.total_series}</p>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10">
              <p className="text-xs text-muted-foreground">Subscribers</p>
              <p className="text-2xl font-bold">{stats.active_subscriptions}</p>
            </Card>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-3">
          {users.map(u => (
            <Card key={u.id} className="p-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{u.name || u.email}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-yellow-400">{u.coins} coins</p>
                <p className="text-xs text-muted-foreground">{u.subscription || "Free"}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Series Tab */}
      {activeTab === "series" && (
        <div className="space-y-3">
          {seriesList.map(s => (
            <Card key={s.id} className="p-3 flex items-center gap-3">
              <img src={s.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
              <div className="flex-1">
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.genre} • {s.total_episodes} eps</p>
              </div>
              <div className="text-right">
                <p className="text-xs">{s.views.toLocaleString()} views</p>
                <p className="text-xs text-yellow-400">{s.coins_per_episode} coins/ep</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            transactions.map(t => (
              <Card key={t.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-sm font-bold text-green-400">${t.amount}</p>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
