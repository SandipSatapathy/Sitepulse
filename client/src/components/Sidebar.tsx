import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  AlertOctagon,
  CreditCard,
  Bell,
  FileText,
  Presentation,
  Zap,
  Sparkles,
  ExternalLink,
  ChevronRight,
  LogOut,
  ShieldAlert
} from 'lucide-react';

export type TabType =
  | 'cockpit'
  | 'monitors'
  | 'audit'
  | 'incidents'
  | 'billing'
  | 'notifications'
  | 'report'
  | 'pitch'
  | 'superadmin';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role?: 'user' | 'superadmin';
  status?: 'active' | 'suspended';
  planId: string;
  planName: string;
  maxSites: number;
  uptimeIntervalMinutes: number;
  billingCycle: string;
  currentSitesCount: number;
}

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userProfile: UserProfile | null;
  openBillingModal: () => void;
  openIncidentCount: number;
  openAuthModal?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userProfile,
  openBillingModal,
  openIncidentCount,
  openAuthModal,
  onLogout,
}) => {
  const quotaUsed = userProfile?.currentSitesCount ?? 2;
  const quotaMax = userProfile?.maxSites ?? 3;
  const quotaPercentage = Math.min(100, Math.round((quotaUsed / quotaMax) * 100));

  const navItems = [
    {
      id: 'cockpit' as TabType,
      label: 'Fleet Cockpit',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'monitors' as TabType,
      label: 'Live Monitors',
      icon: Activity,
      badge: `${quotaUsed}/${quotaMax}`,
    },
    {
      id: 'audit' as TabType,
      label: 'Health & Audit',
      icon: ShieldCheck,
      badge: 'Pro',
      badgeColor: 'text-pulse-cyan bg-cyan-950/60 border-cyan-800/40',
    },
    {
      id: 'incidents' as TabType,
      label: 'Incident Center',
      icon: AlertOctagon,
      badge: openIncidentCount > 0 ? `${openIncidentCount} open` : '0',
      badgeColor: openIncidentCount > 0 ? 'text-rose-400 bg-rose-950/80 border-rose-800/50 animate-pulse' : 'text-slate-400 bg-slate-900 border-slate-800',
    },
    {
      id: 'billing' as TabType,
      label: 'Plans & Quotas',
      icon: CreditCard,
      badge: userProfile?.planId ? userProfile.planId.toUpperCase() : 'TIER',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/40',
    },
    {
      id: 'notifications' as TabType,
      label: 'Alert Channels',
      icon: Bell,
      badge: null,
    },
    {
      id: 'report' as TabType,
      label: 'Client PDF Report',
      icon: FileText,
      badge: 'Export',
    },
    {
      id: 'pitch' as TabType,
      label: 'Product Pitch Deck',
      icon: Presentation,
      badge: 'ROI',
      badgeColor: 'text-purple-400 bg-purple-950/60 border-purple-800/40',
    },
    ...(userProfile?.role === 'superadmin'
      ? [
          {
            id: 'superadmin' as TabType,
            label: 'Superadmin Root',
            icon: ShieldAlert,
            badge: 'Admin',
            badgeColor: 'text-rose-400 bg-rose-950/80 border-rose-800/50',
          },
        ]
      : []),
  ];

  return (
    <aside className="w-64 bg-[#0d1322] border-r border-slate-800/80 flex flex-col h-screen shrink-0 sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shadow-sm">
            <Activity className="w-5 h-5 text-pulse-cyan" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight">SitePulse</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-pulse-cyan border border-cyan-800/40">
                SaaS
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-pulse-emerald animate-pulse"></span>
              <span className="text-[11px] text-slate-400 font-mono">Engine Operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
          Platform Fleet
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer ${
                isActive
                  ? 'bg-slate-800/90 text-white border border-slate-700/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-pulse-cyan' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    item.badgeColor || 'text-slate-400 bg-slate-900 border-slate-800'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quota Usage Widget */}
      <div className="p-3 mx-3 mb-3 bg-[#111827] rounded-xl border border-slate-800/90 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Plan Quota
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {quotaUsed} / {quotaMax} Sites
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-2.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              quotaPercentage >= 100
                ? 'bg-rose-500'
                : quotaPercentage >= 66
                ? 'bg-amber-400'
                : 'bg-pulse-cyan'
            }`}
            style={{ width: `${quotaPercentage}%` }}
          />
        </div>
        <button
          onClick={openBillingModal}
          className="w-full py-1.5 px-2 rounded-lg text-xs font-medium bg-gradient-to-r from-pulse-cyan/15 to-blue-500/15 hover:from-pulse-cyan/25 hover:to-blue-500/25 text-pulse-cyan border border-pulse-cyan/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Upgrade Tier</span>
          <ChevronRight className="w-3 h-3 opacity-70" />
        </button>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0a0f1d]/60">
        <div className="flex items-center gap-3">
          <button
            onClick={openAuthModal}
            title="Switch user account or sign in"
            className="w-8 h-8 rounded-full bg-cyan-950/80 border border-cyan-800/50 flex items-center justify-center font-bold text-xs text-pulse-cyan hover:border-pulse-cyan transition cursor-pointer shrink-0"
          >
            {userProfile?.name
              ? userProfile.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()
              : 'AM'}
          </button>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={openAuthModal}>
            <p className="text-xs font-semibold text-white truncate hover:text-pulse-cyan transition">
              {userProfile?.name || 'Alex Mercer'}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              {userProfile?.planName || 'Starter Plan (3 Sites)'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={openAuthModal}
              title="Switch Account / Sign In"
              className="text-slate-400 hover:text-pulse-cyan p-1 rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
