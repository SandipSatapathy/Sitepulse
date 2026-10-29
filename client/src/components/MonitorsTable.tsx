import React, { useState } from 'react';
import {
  Activity,
  Plus,
  RefreshCw,
  Lock,
  ChevronRight,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  Search,
  Pause,
  Play,
  Pencil,
  Trash2,
  X
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  baseUrl: string;
  status: string;
  lastUptimeState: 'up' | 'down' | 'check_failed';
  uptimePercentage: number;
  latestResponseTimeMs: number | null;
  sslDaysUntilExpiry: number | null;
  sslValid: boolean | null;
  sslIssuer: string | null;
  lastUptimeCheckAt: string | null;
  recentHistory: { checkedAt: string; outcome: string; responseTimeMs: number }[];
}

interface MonitorsTableProps {
  projects: Project[];
  selectedProject: Project | null;
  onSelectProject: (p: Project | null) => void;
  onCheckNow: (id: string) => void;
  isChecking: boolean;
  onOpenAddModal: () => void;
  currentSitesCount: number;
  maxSites: number;
  openBillingModal: () => void;
  onDeleteProject?: (id: string) => Promise<void> | void;
  onUpdateProject?: (id: string, updates: { name?: string; baseUrl?: string; status?: string }) => Promise<void> | void;
}

export const MonitorsTable: React.FC<MonitorsTableProps> = ({
  projects,
  selectedProject,
  onSelectProject,
  onCheckNow,
  isChecking,
  onOpenAddModal,
  currentSitesCount,
  maxSites,
  openBillingModal,
  onDeleteProject,
  onUpdateProject,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down'>('all');

  // Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenEdit = (p: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(p);
    setEditName(p.name);
    setEditUrl(p.baseUrl);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editUrl.trim()) return;
    setIsUpdating(true);
    try {
      if (onUpdateProject) {
        await onUpdateProject(editingProject.id, { name: editName.trim() || undefined, baseUrl: editUrl.trim() });
      } else {
        const token = localStorage.getItem('sitepulse_token');
        await fetch(`/api/projects/${editingProject.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: editName.trim() || undefined, baseUrl: editUrl.trim() }),
        });
      }
      setEditingProject(null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePause = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = p.status === 'paused' ? 'active' : 'paused';
    if (onUpdateProject) {
      await onUpdateProject(p.id, { status: newStatus });
    } else {
      const token = localStorage.getItem('sitepulse_token');
      await fetch(`/api/projects/${p.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });
    }
  };

  const handleDelete = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${p.name}? All historical uptime records will be permanently removed.`)) {
      return;
    }
    setDeletingId(p.id);
    try {
      if (onDeleteProject) {
        await onDeleteProject(p.id);
      } else {
        const token = localStorage.getItem('sitepulse_token');
        await fetch(`/api/projects/${p.id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.baseUrl.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.lastUptimeState === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isQuotaReached = currentSitesCount >= maxSites;

  // Generate 60-day visual dot matrix data
  const renderDotMatrix = (history: { checkedAt: string; outcome: string; responseTimeMs: number }[]) => {
    const totalBars = 36;
    const historyMap = history.slice(-totalBars);
    const fillerCount = Math.max(0, totalBars - historyMap.length);

    const bars = [
      ...Array(fillerCount).fill({ outcome: 'up', responseTimeMs: 140 }),
      ...historyMap,
    ];

    return (
      <div className="flex items-center gap-1 py-1">
        {bars.map((item, idx) => {
          const isUp = item.outcome === 'up';
          return (
            <div
              key={idx}
              title={`${new Date(item.checkedAt || Date.now()).toLocaleTimeString()} - ${
                isUp ? `${item.responseTimeMs}ms` : 'Outage'
              }`}
              className={`w-1.5 h-6 rounded-sm transition-all hover:scale-125 cursor-pointer ${
                isUp
                  ? item.responseTimeMs > 400
                    ? 'bg-amber-400 hover:bg-amber-300'
                    : 'bg-emerald-500 hover:bg-emerald-400'
                  : 'bg-rose-500 hover:bg-rose-400'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-pulse-cyan" />
            <span>Monitored Fleet Endpoints</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active multi-origin health probes with 2-failure outage de-bouncing & SSL alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            {(['all', 'up', 'down'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded capitalize font-mono cursor-pointer transition ${
                  statusFilter === st
                    ? 'bg-pulse-cyan text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st === 'all' ? 'All' : st === 'up' ? 'Online' : 'Outage'}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search domain..."
              className="pl-8 pr-3 py-1.5 bg-[#0a0f1d] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
            />
          </div>

          <button
            onClick={() => {
              if (isQuotaReached) {
                openBillingModal();
              } else {
                onOpenAddModal();
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm ${
              isQuotaReached
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-pulse-cyan hover:bg-cyan-400 text-slate-950'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isQuotaReached ? 'Upgrade Quota to Add' : 'Add Endpoint'}</span>
          </button>
        </div>
      </div>

      {/* Quota Alert Banner if near capacity */}
      {isQuotaReached && (
        <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You have used <strong>{currentSitesCount} of {maxSites}</strong> monitors allowed on your current plan. Upgrade to Pro for 15 monitors & 5-minute intervals.
            </span>
          </div>
          <button
            onClick={openBillingModal}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer transition shrink-0"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {/* Main List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of Monitors (2 cols or full if no project selected) */}
        <div className={`${selectedProject ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-3`}>
          {filteredProjects.length === 0 ? (
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center mx-auto text-pulse-cyan">
                <Activity className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">No Monitored Endpoints</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No endpoints found. Add a website to launch real-time multi-origin ping and SSL certificate monitoring.
                </p>
              </div>
              <button
                onClick={() => (isQuotaReached ? openBillingModal() : onOpenAddModal())}
                className="px-4 py-2 bg-pulse-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>{isQuotaReached ? 'Upgrade Quota' : 'Add Website Endpoint'}</span>
              </button>
            </div>
          ) : (
            filteredProjects.map((p) => {
            const isUp = p.lastUptimeState === 'up';
            const isSelected = selectedProject?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(isSelected ? null : p)}
                className={`bg-[#111827] border rounded-xl p-4 transition cursor-pointer hover:border-slate-600 ${
                  isSelected
                    ? 'border-pulse-cyan ring-1 ring-pulse-cyan/30 bg-[#141e33]'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Domain Name & Status */}
                  <div className="flex items-start gap-3">
                    <span
                      className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                        p.status === 'paused'
                          ? 'bg-amber-400 glow-amber'
                          : isUp
                          ? 'bg-pulse-emerald glow-emerald'
                          : 'bg-pulse-rose glow-rose'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{p.name}</span>
                        {p.status === 'paused' ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-amber-400 bg-amber-950/50 border-amber-800/40">
                            PAUSED
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              isUp
                                ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40'
                                : 'text-rose-400 bg-rose-950/50 border-rose-800/40'
                            }`}
                          >
                            {isUp ? 'UP (200)' : 'CONFIRMED OUTAGE'}
                          </span>
                        )}
                      </div>
                      <a
                        href={p.baseUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-slate-400 font-mono hover:text-pulse-cyan flex items-center gap-1 mt-0.5"
                      >
                        <span className="truncate max-w-sm">{p.baseUrl}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Middle: Latency & Dot Matrix */}
                  <div className="flex flex-col items-start md:items-end">
                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-slate-400">Response:</span>
                      <span className="text-white font-bold">{p.latestResponseTimeMs ?? '--'}ms</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">30d:</span>
                      <span className="text-pulse-emerald font-bold">{p.uptimePercentage}%</span>
                    </div>
                    {/* Visual 36-bar history */}
                    <div className="mt-1.5">{renderDotMatrix(p.recentHistory || [])}</div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                    <span
                      className={`text-[11px] font-mono px-2 py-1 rounded-lg border flex items-center gap-1 ${
                        (p.sslDaysUntilExpiry ?? 999) < 30
                          ? 'text-amber-400 bg-amber-950/50 border-amber-800/40'
                          : 'text-slate-300 bg-slate-900 border-slate-800'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>{p.sslDaysUntilExpiry ?? '--'}d</span>
                    </span>

                    {/* Instant Check */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckNow(p.id);
                      }}
                      disabled={isChecking}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer disabled:opacity-50"
                      title="Trigger probe check now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    </button>

                    {/* Pause / Resume */}
                    <button
                      onClick={(e) => handleTogglePause(p, e)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        p.status === 'paused'
                          ? 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-700/60'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={p.status === 'paused' ? 'Resume monitoring' : 'Pause monitoring'}
                    >
                      {p.status === 'paused' ? (
                        <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      ) : (
                        <Pause className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={(e) => handleOpenEdit(p, e)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                      title="Edit endpoint details"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={(e) => handleDelete(p, e)}
                      disabled={deletingId === p.id}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition cursor-pointer disabled:opacity-50"
                      title="Delete monitored domain"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>

                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isSelected ? 'rotate-90 text-pulse-cyan' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>

        {/* Selected Project Inspector Drawer (1 Col) */}
        {selectedProject && (
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-sm">{selectedProject.name}</h3>
                <p className="text-xs text-slate-400 font-mono truncate">{selectedProject.baseUrl}</p>
              </div>
              <button
                onClick={() => onSelectProject(null)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Health Overview */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Uptime State</span>
                <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                  {selectedProject.lastUptimeState.toUpperCase()}
                </p>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono">Avg Latency</span>
                <p className="text-sm font-bold text-pulse-cyan font-mono mt-0.5">
                  {selectedProject.latestResponseTimeMs ?? '--'} ms
                </p>
              </div>
            </div>

            {/* SSL Certificate Deep Inspection */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Lock className="w-3.5 h-3.5 text-pulse-cyan" />
                <span>TLS/SSL Certificate Status</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Issuer:</span>
                  <span className="text-slate-200 truncate max-w-[160px]">
                    {selectedProject.sslIssuer || "Let's Encrypt / Cloudflare"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Validity:</span>
                  <span className={selectedProject.sslValid ? 'text-emerald-400' : 'text-rose-400'}>
                    {selectedProject.sslValid ? 'Valid & Trusted' : 'Invalid / Mismatch'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Days Remaining:</span>
                  <span
                    className={
                      (selectedProject.sslDaysUntilExpiry ?? 999) < 30
                        ? 'text-amber-400 font-bold'
                        : 'text-slate-200'
                    }
                  >
                    {selectedProject.sslDaysUntilExpiry ?? '--'} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Verified:</span>
                  <span className="text-slate-400">
                    {selectedProject.lastUptimeCheckAt
                      ? new Date(selectedProject.lastUptimeCheckAt).toLocaleTimeString()
                      : 'Just now'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pro Monitoring Settings */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Probe Frequency & Strategy</span>
              </div>
              <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Interval:</span>
                  <span className="text-slate-200 font-mono">Every 15 min (Starter)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Debouncing:</span>
                  <span className="text-emerald-400 font-mono">2 consecutive fails</span>
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={openBillingModal}
                    className="w-full py-1.5 rounded-lg bg-pulse-cyan/10 hover:bg-pulse-cyan/20 text-pulse-cyan border border-pulse-cyan/30 text-xs font-medium cursor-pointer transition"
                  >
                    Upgrade to 1-Minute Interval
                  </button>
                </div>
              </div>
            </div>
            {/* Monitor Management Actions Drawer */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(selectedProject)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium cursor-pointer transition flex items-center justify-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5 text-pulse-cyan" />
                <span>Edit Settings</span>
              </button>
              <button
                type="button"
                onClick={(e) => handleTogglePause(selectedProject, e)}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium cursor-pointer transition flex items-center justify-center gap-1.5 ${
                  selectedProject.status === 'paused'
                    ? 'bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border-amber-700/60'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                {selectedProject.status === 'paused' ? (
                  <>
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pause</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => handleDelete(selectedProject, e)}
                disabled={deletingId === selectedProject.id}
                className="py-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-medium cursor-pointer transition disabled:opacity-50"
                title="Delete monitor"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Monitor Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingProject(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-white mb-1">Edit Monitor Configuration</h3>
            <p className="text-xs text-slate-400 mb-4">
              Update endpoint display name and target URL.
            </p>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="My Production API"
                  className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-pulse-cyan font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Endpoint URL</label>
                <input
                  type="url"
                  required
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://api.myclient.com"
                  className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-pulse-cyan font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="clay-btn-secondary flex-1 py-2 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="clay-btn-primary flex-1 py-2 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
