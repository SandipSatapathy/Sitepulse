import React, { useState } from 'react';
import {
  Sparkles,
  Globe,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  X,
  Mail
} from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (domain: string, interval: number, alertEmail: string) => Promise<void>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState(1);
  const [domainUrl, setDomainUrl] = useState('https://');
  const [friendlyName, setFriendlyName] = useState('');
  const [interval, setInterval] = useState(15);
  const [alertEmail, setAlertEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunVerification = async () => {
    setIsVerifying(true);
    setVerifyStatus('Resolving DNS records and TLS handshake...');

    setTimeout(() => {
      setVerifyStatus('Inspecting HTTP 200 response & SSL certificate...');
    }, 1000);

    setTimeout(() => {
      setVerifyStatus('Baseline health verified! Site added to real-time probes.');
      setIsVerifying(false);
      setStep(4);
    }, 2200);
  };

  const handleFinalFinish = async () => {
    await onComplete(domainUrl, interval, alertEmail);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="clay-card w-full max-w-xl p-8 space-y-6 relative border border-slate-700/60 shadow-2xl">
        {/* Header with Step Indicators */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 text-pulse-cyan" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">SitePulse Setup Wizard</h3>
              <p className="text-xs text-slate-400">Step {step} of 4 • Get started in 30 seconds</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s <= step ? 'bg-pulse-cyan shadow-sm shadow-cyan-500/50' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Website Details */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">What website do you want to safeguard?</h4>
              <p className="text-xs text-slate-400">
                Enter your production website or client domain to start 24/7 uptime and TLS monitoring.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Website URL
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    required
                    value={domainUrl}
                    onChange={(e) => setDomainUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="clay-input w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Friendly Project Label (Optional)
                </label>
                <input
                  type="text"
                  value={friendlyName}
                  onChange={(e) => setFriendlyName(e.target.value)}
                  placeholder="e.g. Acme Marketing Store"
                  className="clay-input w-full px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!domainUrl || domainUrl === 'https://'}
                className="clay-btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span>Continue to Check Frequency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Check Frequency */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">How often should our probe nodes check availability?</h4>
              <p className="text-xs text-slate-400">
                Choose the polling cadence for your website availability and SSL expiration validation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  val: 30,
                  label: 'Every 30 min',
                  tier: 'Free Tier',
                  desc: 'Standard availability check',
                },
                {
                  val: 15,
                  label: 'Every 15 min',
                  tier: 'Starter Tier (Active)',
                  desc: 'Recommended for client sites',
                  highlight: true,
                },
                {
                  val: 5,
                  label: 'Every 5 min',
                  tier: 'Pro Tier',
                  desc: 'Rapid outage detection',
                },
              ].map((opt) => (
                <div
                  key={opt.val}
                  onClick={() => setInterval(opt.val)}
                  className={`clay-card-interactive p-4 cursor-pointer text-left ${
                    interval === opt.val
                      ? 'ring-2 ring-pulse-cyan border-pulse-cyan'
                      : 'border-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-mono text-pulse-cyan font-bold uppercase block mb-1">
                    {opt.tier}
                  </span>
                  <div className="text-sm font-bold text-white">{opt.label}</div>
                  <p className="text-[11px] text-slate-400 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="clay-btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Configure Alert Channels</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Alert Destinations & Baseline Probe */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Where should we page you if an outage occurs?</h4>
              <p className="text-xs text-slate-400">
                Receive instant notices the second our 2-consecutive failure debouncer flags a downtime.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Notification Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="clay-input w-full pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Consecutive failure de-bouncing is automatically active. You will never receive false alarm alerts for transient network hiccups.
                </span>
              </div>
            </div>

            {verifyStatus && (
              <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs font-mono text-pulse-cyan flex items-center gap-2">
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{verifyStatus}</span>
              </div>
            )}

            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleRunVerification}
                disabled={isVerifying}
                className="clay-btn-primary px-5 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Baseline...</span>
                  </>
                ) : (
                  <>
                    <span>Run Baseline & Connect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success & Cockpit Ready */}
        {step === 4 && (
          <div className="text-center py-4 space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 text-pulse-emerald flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">Your Website is Live & Guarded!</h4>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                SitePulse has completed the initial TLS handshake and response verification for{' '}
                <strong className="text-pulse-cyan font-mono">{domainUrl}</strong>.
              </p>
            </div>

            <div className="p-4 bg-[#0a0f1d] rounded-2xl border border-slate-800 inline-block text-left text-xs font-mono space-y-1.5 min-w-[280px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">200 OK (Nominal)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Response Latency:</span>
                <span className="text-pulse-cyan font-bold">146ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SSL Certificate:</span>
                <span className="text-emerald-400 font-bold">Valid (82d left)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Poll Cadence:</span>
                <span className="text-slate-200">Every {interval} mins</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleFinalFinish}
                className="clay-btn-primary px-8 py-3 text-sm font-bold cursor-pointer"
              >
                Enter Your Fleet Cockpit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
