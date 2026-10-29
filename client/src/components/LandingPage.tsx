import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Search,
  RefreshCw,
  Sparkles,
  Check
} from 'lucide-react';

interface LandingPageProps {
  onEnterCockpit: () => void;
  onOpenOnboarding: () => void;
  onRunAuditFromLanding: (url: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterCockpit,
  onOpenOnboarding,
  onRunAuditFromLanding,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [isDemoScanning, setIsDemoScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string | null>(null);
  const [demoResult, setDemoResult] = useState<{
    grade: string;
    score: number;
    latency: number;
    sslDays: number;
  } | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handleDemoScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setIsDemoScanning(true);
    setDemoResult(null);
    setScanStep('Resolving multi-origin DNS & edge handshake...');

    setTimeout(() => {
      setScanStep('Checking TLS certificate & HTTP security headers...');
    }, 900);

    setTimeout(() => {
      setScanStep('Crawling internal links for mixed HTTP content & broken anchors...');
    }, 1800);

    setTimeout(() => {
      setScanStep('Generating SEOptimer-grade diagnostic scorecard...');
    }, 2700);

    setTimeout(() => {
      setIsDemoScanning(false);
      setScanStep(null);
      setDemoResult({
        grade: 'A+',
        score: 96,
        latency: 142,
        sslDays: 78,
      });
    }, 3400);
  };

  const pricingTiers = [
    {
      name: 'Free Hobby',
      price: '₹0',
      period: '/mo',
      desc: 'Ideal for personal blogs and developer portfolios.',
      features: [
        '1 Monitored Website',
        '30-minute HTTP ping interval',
        'Basic SSL Expiry Alerts (7 days)',
        'Standard Email Notifications',
      ],
      buttonText: 'Start Free Forever',
      popular: false,
    },
    {
      name: 'Starter Pro',
      price: billingCycle === 'annual' ? '₹399' : '₹499',
      period: '/mo',
      desc: 'For freelancers managing up to 3 client websites.',
      features: [
        '3 Monitored Websites',
        '15-minute Uptime Check Interval',
        'Advance SSL Warnings (30, 14, 7, 1d)',
        'Technical SEO & Security Audits',
        '30-day Incident & Latency History',
        'Consecutive Failure De-bouncing',
      ],
      buttonText: 'Start 14-Day Free Trial',
      popular: false,
    },
    {
      name: 'Professional',
      price: billingCycle === 'annual' ? '₹1,199' : '₹1,499',
      period: '/mo',
      desc: 'For growing SaaS products & high-traffic e-commerce.',
      features: [
        '15 Monitored Websites',
        '5-minute Rapid Uptime Checks',
        'Slack & Discord Webhook Alerts',
        'Oh Dear Mixed Content Scanner',
        'Internal Broken Link Crawler',
        '90-day Latency & MTTR Analytics',
      ],
      buttonText: 'Start 14-Day Free Trial',
      popular: true,
    },
    {
      name: 'Agency Scale',
      price: billingCycle === 'annual' ? '₹1,999' : '₹2,499',
      period: '/mo',
      desc: 'White-label reporting for digital agencies & retainers.',
      features: [
        '50 Monitored Websites',
        '1-minute Sub-Minute Checks',
        'White-Label Printable PDF Reports',
        'Unguessable Client Share Links',
        'SMS Emergency Paging Integration',
        'Unlimited Historical Retention',
      ],
      buttonText: 'Launch Agency Plan',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#080c18] text-slate-100 font-sans ambient-mesh selection:bg-pulse-cyan/30 selection:text-pulse-cyan">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#080c18]/85 border-b border-slate-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Activity className="w-5 h-5 text-pulse-cyan" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-lg tracking-tight">SitePulse</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 text-pulse-cyan border border-cyan-800/40">
                  Sentinel
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#features" className="hover:text-pulse-cyan transition">Features</a>
            <a href="#demo" className="hover:text-pulse-cyan transition">Live Scanner Demo</a>
            <a href="#pricing" className="hover:text-pulse-cyan transition">Plans & Pricing</a>
            <a href="#retainer" className="hover:text-pulse-cyan transition">Agency Retainer</a>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onEnterCockpit}
              className="clay-btn-secondary px-4 py-2 text-xs font-bold cursor-pointer"
            >
              Sign In to Cockpit
            </button>
            <button
              onClick={onOpenOnboarding}
              className="clay-btn-primary px-4 py-2 text-xs font-bold cursor-pointer hidden sm:flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Start Free Trial</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-pill text-xs font-mono font-medium text-pulse-cyan">
          <span className="w-2 h-2 rounded-full bg-pulse-cyan animate-ping" />
          <span>Next-Generation Website Health & Uptime Sentinel</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          Never Lose a Customer to <br />
          <span className="text-pulse-cyan">Silent Downtime or Expired SSL.</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Continuous multi-origin uptime monitoring, daily TLS handshake inspection, and deep technical SEO crawler audits under one unified client-ready cockpit.
        </p>

        {/* Live Interactive Scanner Demo Bar */}
        <div id="demo" className="pt-4 max-w-2xl mx-auto">
          <form
            onSubmit={handleDemoScan}
            className="clay-card p-3 flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="flex-1 w-full relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="url"
                required
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Enter any domain (e.g. https://stripe.com)"
                className="clay-input w-full pl-10 pr-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 font-mono focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isDemoScanning}
              className="clay-btn-primary w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isDemoScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Auditing Domain...</span>
                </>
              ) : (
                <>
                  <span>Run Live Health Scan</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Interactive Scan Progress / Output */}
          {scanStep && (
            <div className="mt-3 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-xs font-mono text-pulse-cyan flex items-center justify-center gap-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{scanStep}</span>
            </div>
          )}

          {demoResult && (
            <div className="mt-4 clay-card p-5 text-left space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex flex-col items-center justify-center font-mono font-bold">
                    <span className="text-xl leading-none">{demoResult.grade}</span>
                    <span className="text-[9px] uppercase">Grade</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Audit Baseline Generated!</h4>
                    <p className="text-xs text-slate-400 font-mono">{scanInput}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRunAuditFromLanding(scanInput);
                    onEnterCockpit();
                  }}
                  className="clay-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>View Full Report</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs font-mono">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Health Score</span>
                  <span className="text-base font-bold text-white">{demoResult.score}/100</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Response Ping</span>
                  <span className="text-base font-bold text-pulse-cyan">{demoResult.latency}ms</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TLS Expiration</span>
                  <span className="text-base font-bold text-emerald-400">{demoResult.sslDays} days left</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature Pillar Cards (Claymorphism 3D) */}
      <section id="features" className="py-16 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs font-mono uppercase text-pulse-cyan font-semibold">Engineered For Reliability</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Everything You Need To Guarantee 99.9% Client Uptime
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Combining the proven telemetry of Better Stack, the deep security of Oh Dear, and the audit clarity of SEOptimer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="clay-card-interactive p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-pulse-cyan">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Multi-Origin Uptime</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              2-consecutive failure de-bouncing eliminates false positives. Never get paged for transient network blips.
            </p>
          </div>

          <div className="clay-card-interactive p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">SSL Expiry Sentinel</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Native TLS handshake inspector pages you at 30, 14, 7, and 1-day milestones before browser security warnings appear.
            </p>
          </div>

          <div className="clay-card-interactive p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-pulse-emerald">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">Mixed Content Crawler</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automatically discovers insecure HTTP scripts, images, and stylesheets served on HTTPS pages with line-by-line tags.
            </p>
          </div>

          <div className="clay-card-interactive p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-white text-base">SEOptimer Audit Grades</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Instant category letter grades (A+ to F) for SEO, Security, Speed, and Usability with copyable code remediation.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 px-6 max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono uppercase text-pulse-cyan font-semibold">Transparent Commercial Tiers</span>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Pick Your Monitoring Plan
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Scale seamlessly from 1 website to 50 client domains with automatic quota enforcement.
          </p>

          <div className="pt-2 flex items-center justify-center">
            <div className="clay-pill p-1 inline-flex items-center gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-pulse-cyan text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'annual'
                    ? 'bg-pulse-cyan text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Annual</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pricingTiers.map((tier, idx) => (
            <div
              key={idx}
              className={`clay-card p-6 flex flex-col justify-between space-y-6 ${
                tier.popular ? 'ring-2 ring-pulse-cyan border-pulse-cyan shadow-cyan-500/20' : ''
              }`}
            >
              <div className="space-y-4">
                {tier.popular && (
                  <span className="text-[10px] font-mono uppercase font-bold px-2.5 py-0.5 rounded-full bg-pulse-cyan text-slate-950 inline-block">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{tier.desc}</p>
                </div>

                <div className="flex items-baseline gap-1 pb-4 border-b border-slate-800">
                  <span className="text-3xl font-extrabold font-mono text-white">{tier.price}</span>
                  <span className="text-xs text-slate-400 font-mono">{tier.period}</span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  {tier.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-pulse-emerald shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onOpenOnboarding}
                className={`w-full py-2.5 text-xs font-bold cursor-pointer ${
                  tier.popular ? 'clay-btn-primary' : 'clay-btn-secondary'
                }`}
              >
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA & Direct Cockpit Access */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center">
        <div className="clay-card p-10 space-y-6">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Ready to Safeguard Your Infrastructure?
          </h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Experience the real-time telemetry cockpit and audit crawler immediately.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterCockpit}
              className="clay-btn-primary px-8 py-3.5 text-sm font-bold flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
            >
              <span>Launch Live SaaS Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenOnboarding}
              className="clay-btn-secondary px-6 py-3.5 text-sm font-bold cursor-pointer w-full sm:w-auto"
            >
              Run Onboarding Setup
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/80 px-6 text-center text-xs text-slate-500 font-mono">
        <p>SitePulse Commercial Fleet Monitoring Platform v2.0 • Claymorphic SaaS Engine</p>
      </footer>
    </div>
  );
};
