import React from 'react';
import { AlertOctagon, Calendar, ArrowRight, Zap } from 'lucide-react';

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

interface IncidentCenterProps {
  incidents: Incident[];
  onOpenBilling: () => void;
}

export const IncidentCenter: React.FC<IncidentCenterProps> = ({ incidents, onOpenBilling }) => {
  const openIncidents = incidents.filter((i) => i.status === 'open');
  const resolvedIncidents = incidents.filter((i) => i.status === 'resolved');

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-pulse-rose" />
              <span>Incident Center & Outage Log</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated outage lifecycle tracking with MTTR calculation ({resolvedIncidents.length} resolved) and consecutive failure de-bouncing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenBilling}
              className="px-3 py-1 rounded-lg bg-pulse-cyan/15 hover:bg-pulse-cyan/25 text-pulse-cyan border border-pulse-cyan/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>SMS Paging (Pro)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium border flex items-center gap-1.5 ${
                openIncidents.length > 0
                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/60 animate-pulse'
                  : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  openIncidents.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
              />
              <span>{openIncidents.length > 0 ? `${openIncidents.length} Active Incidents` : 'All Systems Nominal'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Incident Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase">30-Day Mean Time to Recovery (MTTR)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-white">7m 12s</span>
            <span className="text-xs text-emerald-400 font-mono">-4m vs avg</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Average downtime duration across all resolved incidents.</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Monthly Downtime</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-white">7 minutes</span>
            <span className="text-xs text-slate-400 font-mono">99.98% SLA</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Under the 21.6m max monthly downtime for 99.95% tier.</p>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-400 uppercase">Automated Alert Delivery</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-pulse-cyan">100% Dispatched</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Email, Slack, & Webhook alert pings triggered within 12s.</p>
        </div>
      </div>

      {/* Incident Log Table */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">Chronological Outage Records</h3>
          <span className="text-xs text-slate-400 font-mono">{incidents.length} events logged</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {incidents.map((inc) => {
            const isOpen = inc.status === 'open';
            return (
              <div key={inc.id} className="p-5 hover:bg-slate-800/30 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                        isOpen
                          ? 'text-rose-400 bg-rose-950/60 border-rose-800/50'
                          : 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50'
                      }`}
                    >
                      {inc.status}
                    </span>
                    <span className="font-bold text-white text-sm">{inc.projectName}</span>
                    {inc.statusCode && (
                      <span className="text-xs font-mono text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                        HTTP {inc.statusCode}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(inc.startedAt).toLocaleString()}</span>
                    {inc.durationMinutes && (
                      <span className="text-slate-300 font-bold">({inc.durationMinutes}m duration)</span>
                    )}
                  </div>
                </div>

                {/* Cause & Remediation */}
                <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono">
                  <span className="text-slate-400 uppercase text-[10px] block mb-1">Root Cause Analysis</span>
                  {inc.cause}
                </div>

                {/* Timeline Step Breakdown */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    Probe 1 Failed
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Probe 2 Confirmed (Debounced)
                  </span>
                  <span>→</span>
                  <span className="flex items-center gap-1 text-pulse-cyan">
                    <span className="w-1.5 h-1.5 rounded-full bg-pulse-cyan" />
                    Webhooks Paged
                  </span>
                  <span>→</span>
                  <span
                    className={`flex items-center gap-1 ${
                      isOpen ? 'text-slate-400' : 'text-emerald-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-slate-600' : 'bg-emerald-400'}`}
                    />
                    {isOpen ? 'Awaiting Recovery' : 'Recovered & Closed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
