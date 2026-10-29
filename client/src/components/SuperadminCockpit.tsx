import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldAlert,
  Globe,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  DollarSign,
  Activity
} from 'lucide-react';

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalMonitors: number;
  activeMonitors: number;
  totalChecks: number;
  totalIncidents: number;
  totalScans: number;
  estimatedMRR: number;
  planBreakdown: Record<string, number>;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'superadmin';
  status: 'active' | 'suspended';
  planId: 'free' | 'starter' | 'pro' | 'agency';
  planName: string;
  maxSites: number;
  projectsCount: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export const SuperadminCockpit: React.FC = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('sitepulse_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [metricsRes, usersRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: getAuthHeaders() }),
        fetch('/api/admin/users', { headers: getAuthHeaders() }),
      ]);

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData.metrics);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData);
      }
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePlan = async (userId: string, planId: string) => {
    setProcessingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan.');

      setActionMessage({ type: 'success', text: data.message });
      await fetchAdminData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingUserId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setProcessingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status.');

      setActionMessage({ type: 'success', text: `User account ${newStatus}.` });
      await fetchAdminData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingUserId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${userEmail}" and all their monitored domains?`)) {
      return;
    }

    setProcessingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user.');

      setActionMessage({ type: 'success', text: data.message });
      await fetchAdminData();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setProcessingUserId(null);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || u.planId === filterPlan;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="space-y-6">
      {/* Superadmin Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/50 text-rose-400 text-xs font-mono font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Superadmin Root Cockpit</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Platform Operations & Multi-Tenant Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tenant governance, live probe telemetries, user quota overrides, and revenue KPIs.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={isLoading}
          className="clay-btn-secondary px-3.5 py-2 text-xs font-mono flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Fleet Telemetry</span>
        </button>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-mono flex items-center gap-2 border shadow ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/80 border-rose-800/80 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Registered Tenants</span>
            <Users className="w-4 h-4 text-pulse-cyan" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.totalUsers ?? users.length}
            </span>
            <span className="text-xs text-emerald-400 font-mono">
              ({metrics?.activeUsers ?? users.length} Active)
            </span>
          </div>
          <p className="text-[11px] text-slate-500">Across Free, Starter, Pro & Agency tiers</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Monitored Domains</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.totalMonitors ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">Domains</span>
          </div>
          <p className="text-[11px] text-slate-500">Continuous 60s background polling</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Health Checks Run</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.totalChecks ?? 0}
            </span>
            <span className="text-xs text-slate-400 font-mono">Probes</span>
          </div>
          <p className="text-[11px] text-slate-500">Automated uptime & SSL cert validations</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Estimated MRR</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-pulse-emerald">
              ₹{(metrics?.estimatedMRR ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">/mo</span>
          </div>
          <p className="text-[11px] text-slate-500">Calculated from active plan subscriptions</p>
        </div>
      </div>

      {/* User Management Section */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {/* Table Filter Controls */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0a0f1d] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0a0f1d] border border-slate-700 rounded-lg text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="all">All Plan Tiers</option>
              <option value="free">Free Hobby</option>
              <option value="starter">Starter Pro</option>
              <option value="pro">Professional</option>
              <option value="agency">Agency Scale</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0f1d] border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Monitors</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-mono">
                    No users match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isProcessing = processingUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'superadmin'
                              ? 'bg-rose-950/80 text-rose-400 border-rose-800/50'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          disabled={isProcessing}
                          value={u.planId}
                          onChange={(e) => handleUpdatePlan(u.id, e.target.value)}
                          className="px-2 py-1 bg-[#0a0f1d] border border-slate-700 rounded text-xs text-white font-mono cursor-pointer focus:outline-none focus:border-pulse-cyan"
                        >
                          <option value="free">Free (1 Site)</option>
                          <option value="starter">Starter (3 Sites)</option>
                          <option value="pro">Pro (15 Sites)</option>
                          <option value="agency">Agency (50 Sites)</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-white font-semibold">{u.projectsCount}</span>
                        <span className="text-slate-500"> / {u.maxSites} sites</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            u.status === 'active'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span className="capitalize">{u.status}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition cursor-pointer border ${
                              u.status === 'active'
                                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                                : 'bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 border-emerald-700'
                            }`}
                          >
                            {u.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            disabled={isProcessing || u.role === 'superadmin'}
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title={u.role === 'superadmin' ? 'Cannot delete root superadmin' : 'Delete user'}
                            className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
