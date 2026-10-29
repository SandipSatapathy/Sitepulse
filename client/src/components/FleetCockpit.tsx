import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  AlertTriangle,
  Clock,
  Shield,
  Zap,
  Lock,
  Search,
  RefreshCw,
  Plus,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { TabType } from './Sidebar';
import { SvgSparkline } from './SvgSparkline';

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

interface Incident {
  id: string;
  projectId: string;
  projectName: string;
  type: string;
  status: string;
  statusCode: number | null;
  cause: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

interface FleetCockpitProps {
  projects: Project[];
  incidents: Incident[];
  onSelectProject: (p: Project) => void;
  onCheckNow: (id: string) => void;
  isChecking: boolean;
  onRunScanUrl: (url: string) => void;
  quickScanUrl: string;
  setQuickScanUrl: (url: string) => void;
  isScanning: boolean;
  onNavigateTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
}

export const FleetCockpit: React.FC<FleetCockpitProps> = ({
  projects,
  incidents,
  onSelectProject,
  onCheckNow,
  isChecking,
  onRunScanUrl,
  quickScanUrl,
  setQuickScanUrl,
  isScanning,
  onNavigateTab,
  onOpenAddModal,
}) => {
  // Live Outage Simulation State
  const [isSimulatingOutage, setIsSimulatingOutage] = useState(false);
  const [simulationPhase, setSimulationPhase] = useState<'nominal' | 'probing' | 'debouncing' | 'down'>('nominal');
  const [toastMessage, setToastMessage] = useState<{ type: 'danger' | 'success'; text: string } | null>(null);

  const totalMonitors = projects.length;
  const activeMonitors = projects.filter((p) => p.lastUptimeState === 'up').length;
  const openIncidents = incidents.filter((i) => i.status === 'open');
  const avgResponseTime = Math.round(
    projects.reduce((acc, p) => acc + (p.latestResponseTimeMs || 0), 0) / (projects.length || 1)
  );

  // Sample telemetry data for SvgSparkline
  const sparklineData = [
    { time: '12:00', value: 165 },
    { time: '12:15', value: 148 },
    { time: '12:30', value: 172 },
    { time: '12:45', value: 140 },
    { time: '13:00', value: 155 },
    { time: '13:15', value: 138 },
    { time: '13:30', value: 144 },
    { time: '13:45', value: 162 },
    { time: '14:00', value: 142 },
  ];

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickScanUrl.trim()) {
      onRunScanUrl(quickScanUrl.trim());
      onNavigateTab('audit');
    }
  };

  const handleStartOutageSimulation = () => {
    setIsSimulatingOutage(true);
    setSimulationPhase('probing');
    setToastMessage({
      type: 'danger',
      text: '⚠️ Probe 1: Stripe Gateway returned HTTP 504. Debouncer awaiting Probe 2 before paging...',
    });

    setTimeout(() => {
      setSimulationPhase('down');
      setToastMessage({
        type: 'danger',
        text: '🚨 CONFIRMED OUTAGE: Stripe Gateway is DOWN (HTTP 504). Webhook dispatched to Slack & Email!',
      });
    }, 2000);
  };

  const handleRestoreService = () => {
    setSimulationPhase('nominal');
    setIsSimulatingOutage(false);
    setToastMessage({
      type: 'success',
      text: '✅ SERVICE RESTORED: Stripe Gateway returned HTTP 200 OK. MTTR logged: 2m 15s.',
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-mono shadow-2xl transition-all animate-bounce ${
            toastMessage.type === 'danger'
              ? 'bg-rose-950/90 text-rose-200 border-2 border-rose-500 shadow-rose-900/40'
              : 'bg-emerald-950/90 text-emerald-200 border-2 border-emerald-500 shadow-emerald-900/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs px-2 py-0.5 rounded bg-black/40 hover:bg-black/60 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner with Claymorphic 3D Texture */}
      <div className="clay-card p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full clay-pill text-xs font-mono font-medium text-pulse-cyan">
              <span className="w-2 h-2 rounded-full bg-pulse-cyan animate-ping" />
              <span>Tactile Fleet Monitoring Cockpit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Real-Time Fleet Health & Uptime Sentinel
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Multi-origin edge availability, daily TLS handshake inspection, and deep SEO crawler audits under one unified diagnostic cockpit.
            </p>

            {/* Outage Simulation Trigger Bar */}
            <div className="pt-1 flex flex-wrap items-center gap-3">
              {!isSimulatingOutage ? (
                <button
                  onClick={handleStartOutageSimulation}
                  className="clay-btn-secondary px-3.5 py-2 text-xs font-mono flex items-center gap-2 cursor-pointer text-amber-300 hover:text-amber-200"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulate Origin 504 Outage (Test Debouncing)</span>
                </button>
              ) : (
                <button
                  onClick={handleRestoreService}
                  className="clay-btn-primary px-4 py-2 text-xs font-mono flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Restore Service (Simulate 200 OK)</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Ad-Hoc Scanner Form */}
          <form
            onSubmit={handleScanSubmit}
            className="flex-1 max-w-md w-full clay-card p-3 space-y-2 border border-slate-700/60"
          >
            <span className="text-[11px] font-mono text-slate-400 block px-1">Instant Health Scanner</span>
            <div className="flex items-center gap-2">
              <div className="pl-2 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="url"
                required
                value={quickScanUrl}
                onChange={(e) => setQuickScanUrl(e.target.value)}
                placeholder="https://client-site.com"
                className="clay-input flex-1 py-2 px-3 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
              />
              <button
                type="submit"
                disabled={isScanning}
                className="clay-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Auditing...</span>
                  </>
                ) : (
                  <>
                    <span>Audit Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Fleet Telemetry Metric Cards (Claymorphic 3D) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Fleet Uptime */}
        <div className="clay-card-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">30-Day Fleet Uptime</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-pulse-emerald">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">99.98%</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">SLA Passed</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Calculated across {totalMonitors} active probes with 2-failure de-bouncing.
          </p>
        </div>

        {/* Metric 2: Average Latency */}
        <div className="clay-card-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Avg Global Latency</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-pulse-cyan">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">{avgResponseTime}ms</span>
            <span className="text-xs font-medium text-pulse-cyan font-mono">-14ms vs yesterday</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Edge latency measured across multi-origin HTTP/2 probes.
          </p>
        </div>

        {/* Metric 3: Active Monitors */}
        <div className="clay-card-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Monitored Endpoints</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-white">
              {simulationPhase === 'down' ? activeMonitors - 1 : activeMonitors} / {totalMonitors}
            </span>
            <span className="text-xs font-medium text-slate-400 font-mono">Allocated</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Automatic background probes running every 15 minutes.
          </p>
        </div>

        {/* Metric 4: Active Outages & Incidents */}
        <div className="clay-card-interactive p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold tracking-wide uppercase">Incidents / Outages</span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                simulationPhase === 'down' || openIncidents.length > 0
                  ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse'
                  : 'bg-emerald-500/15 border border-emerald-500/30 text-pulse-emerald'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-extrabold font-mono ${
                simulationPhase === 'down' || openIncidents.length > 0
                  ? 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {simulationPhase === 'down' ? openIncidents.length + 1 : openIncidents.length}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {simulationPhase === 'down' ? 'Simulation Active' : 'All Clear'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {incidents.length} total historical events with root-cause post-mortems.
          </p>
        </div>
      </div>

      {/* Main Grid: Endpoints Table & Latency Sparklines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monitored Endpoints List */}
        <div className="lg:col-span-2 clay-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-pulse-cyan" />
              <h2 className="font-bold text-white text-sm">Monitored Endpoints Telemetry</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAddModal}
                className="clay-btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Endpoint</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="clay-card p-10 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center mx-auto text-pulse-cyan">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">No Monitored Endpoints</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Your fleet is currently empty. Add your first website or API endpoint to launch 24/7 automated uptime and SSL monitoring.
                  </p>
                </div>
                <button
                  onClick={onOpenAddModal}
                  className="clay-btn-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add First Website</span>
                </button>
              </div>
            ) : (
              projects.map((p) => {
                const isSimulatedDown = simulationPhase === 'down' && p.id === 'proj-demo-1';
                const isSimulatedProbing = simulationPhase === 'probing' && p.id === 'proj-demo-1';
                const isUp = !isSimulatedDown && p.lastUptimeState === 'up';

                return (
                  <div
                    key={p.id}
                    className="clay-card-interactive p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${
                            isSimulatedProbing
                              ? 'bg-amber-400 animate-ping'
                              : isUp
                              ? 'bg-pulse-emerald shadow-lg shadow-emerald-500/40'
                              : 'bg-pulse-rose shadow-lg shadow-rose-500/40'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{p.name}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                              isSimulatedProbing
                                ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                                : isUp
                                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40'
                                : 'text-rose-400 bg-rose-950/40 border-rose-800/40'
                            }`}
                          >
                            {isSimulatedProbing
                              ? 'DEBOUNCING (1/2 FAILS)'
                              : isUp
                              ? '200 OK'
                              : 'DOWN (504)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-mono">
                          <span className="truncate max-w-xs">{p.baseUrl}</span>
                          <span>•</span>
                          <span className="text-pulse-cyan">{p.latestResponseTimeMs ?? '--'}ms</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* SSL Expiry Pill */}
                      <div
                        className={`text-[11px] font-mono px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                          (p.sslDaysUntilExpiry ?? 999) < 30
                            ? 'text-amber-400 bg-amber-950/40 border-amber-800/40'
                            : 'text-slate-300 bg-slate-900 border-slate-800'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        <span>{p.sslDaysUntilExpiry ?? '--'}d SSL</span>
                      </div>

                      {/* Instant Check Now */}
                      <button
                        onClick={() => onCheckNow(p.id)}
                        disabled={isChecking}
                        className="clay-btn-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Trigger probe check now"
                      >
                        <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                        <span>Ping</span>
                      </button>

                      <button
                        onClick={() => {
                          onSelectProject(p);
                          onNavigateTab('monitors');
                        }}
                        className="clay-btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 1 Col: Live SVG Sparkline Chart & Alert Feed */}
        <div className="space-y-6">
          {/* SVG Area Sparkline Card */}
          <div className="clay-card p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Real-Time Edge Latency
              </span>
              <span className="text-[11px] font-mono text-pulse-cyan">Active Probe Node</span>
            </div>

            <div className="pt-2 flex justify-center">
              <SvgSparkline data={sparklineData} height={64} color="#06b6d4" />
            </div>

            <p className="text-[11px] text-slate-400 font-mono text-center">
              Hover scrubber to view exact millisecond response timing.
            </p>
          </div>

          {/* Quick SLA Commitment Card */}
          <div className="clay-card p-5 space-y-2">
            <div className="flex items-center gap-2 text-pulse-cyan">
              <Shield className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Zero False Alarm Guarantee</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our 2-failure debouncer requires two consecutive probe nodes to independently confirm an outage before paging your email or Slack channel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
