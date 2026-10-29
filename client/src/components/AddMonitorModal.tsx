import React, { useState } from 'react';
import { X, Activity, AlertTriangle } from 'lucide-react';

interface AddMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (name: string, url: string) => Promise<void>;
  isAdding: boolean;
  currentSitesCount: number;
  maxSites: number;
  openBillingModal: () => void;
}

export const AddMonitorModal: React.FC<AddMonitorModalProps> = ({
  isOpen,
  onClose,
  onAddProject,
  isAdding,
  currentSitesCount,
  maxSites,
  openBillingModal,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isQuotaReached = currentSitesCount >= maxSites;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isQuotaReached) {
      onClose();
      openBillingModal();
      return;
    }

    if (!url.trim()) return;
    setError(null);

    try {
      await onAddProject(name.trim() || new URL(url).hostname, url.trim());
      setName('');
      setUrl('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add project.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-pulse-cyan" />
            <h3 className="font-bold text-white text-base">Add New Monitored Endpoint</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isQuotaReached ? (
          <div className="space-y-4">
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Subscription Quota Reached</span>
              </div>
              <p className="text-xs text-amber-200 leading-relaxed">
                You have reached your limit of <strong>{maxSites} monitored websites</strong> on the Starter plan. Upgrade to the Pro plan for 15 websites and 5-minute interval checks.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                openBillingModal();
              }}
              className="w-full py-2.5 bg-pulse-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Upgrade Plan to Continue
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Friendly Site Name (Optional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Client Production Store"
                className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Target URL (Required)
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Must be an active public HTTP or HTTPS address.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="px-5 py-2 bg-pulse-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isAdding ? 'Registering...' : 'Start Monitoring'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
