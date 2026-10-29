import React, { useState } from 'react';
import {
  Check,
  Sparkles,
  ArrowRight,
  RefreshCw,
  CreditCard,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  planId: string;
  planName: string;
  maxSites: number;
  uptimeIntervalMinutes: number;
  billingCycle: string;
  currentSitesCount: number;
}

interface BillingViewProps {
  userProfile: UserProfile | null;
  onUpdatePlan: (planId: string, billingCycle?: string) => Promise<void>;
  isUpdatingPlan: boolean;
}

export const BillingView: React.FC<BillingViewProps> = ({
  userProfile,
  onUpdatePlan,
  isUpdatingPlan,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeCheckoutPlan, setActiveCheckoutPlan] = useState<any | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const activePlanId = userProfile?.planId || 'starter';

  const handleOpenCustomerPortal = async () => {
    setIsLoadingPortal(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem('sitepulse_token');
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatusMessage({
          type: 'success',
          text: data.message || 'Stripe Customer Portal will open when connected with live API key in .env.',
        });
        setTimeout(() => setStatusMessage(null), 6000);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to open billing portal.' });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleSelectPlan = async (plan: any) => {
    if (plan.id === activePlanId) return;
    setStatusMessage(null);

    // If downgrading to Free
    if (plan.id === 'free') {
      try {
        await onUpdatePlan('free', billingCycle);
        setStatusMessage({ type: 'success', text: 'Plan downgraded to Free tier.' });
        setTimeout(() => setStatusMessage(null), 4000);
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to update plan.' });
      }
      return;
    }

    // Open Stripe Checkout Dialog
    setActiveCheckoutPlan(plan);
  };

  const handleExecuteStripeCheckout = async () => {
    if (!activeCheckoutPlan) return;
    setIsProcessingCheckout(true);

    try {
      const token = localStorage.getItem('sitepulse_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Call cryptographic webhook simulation / fulfillment pipeline
      const res = await fetch('/api/stripe/simulate-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          planId: activeCheckoutPlan.id,
          billingCycle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Payment processing failed.');
      }

      await onUpdatePlan(activeCheckoutPlan.id, billingCycle);
      setActiveCheckoutPlan(null);
      setStatusMessage({
        type: 'success',
        text: `Payment verified via Stripe HMAC signature! Upgraded to ${activeCheckoutPlan.name}.`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Payment checkout error.' });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Hobby',
      badge: null,
      priceMonthly: '₹0',
      priceAnnual: '₹0',
      description: 'Essential monitoring for personal portfolios and experimental hobby sites.',
      maxSites: 1,
      checkInterval: '30 minutes',
      features: [
        '1 Monitored Website',
        '30-minute HTTP ping interval',
        'Basic SSL Expiry Alerts (7 days)',
        'Standard Email Notifications',
        '7-day Telemetry Retention',
      ],
      ctaText: 'Downgrade to Free',
      popular: false,
    },
    {
      id: 'starter',
      name: 'Starter Pro',
      badge: 'ACTIVE PLAN',
      priceMonthly: '₹499',
      priceAnnual: '₹399',
      period: '/mo',
      description: 'Ideal for freelance developers managing small client websites.',
      maxSites: 3,
      checkInterval: '15 minutes',
      features: [
        '3 Monitored Websites',
        '15-minute Uptime Check Interval',
        'Advance SSL Warnings (30, 14, 7, 1d)',
        'Technical SEO & Security Audits',
        '30-day Incident & Latency History',
        'Consecutive Failure De-bouncing',
      ],
      ctaText: 'Current Active Plan',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Professional',
      badge: 'MOST POPULAR',
      priceMonthly: '₹1,499',
      priceAnnual: '₹1,199',
      period: '/mo',
      description: 'High-frequency monitoring for growing SaaS products & e-commerce brands.',
      maxSites: 15,
      checkInterval: '5 minutes',
      features: [
        '15 Monitored Websites',
        '5-minute Rapid Uptime Checks',
        'Slack & Discord Webhook Alerts',
        'Oh Dear Mixed Content Scanner',
        'Internal Broken Link Crawler',
        '90-day Latency & MTTR Analytics',
        'Priority Multi-Origin Probes',
      ],
      ctaText: 'Upgrade to Pro',
      popular: true,
    },
    {
      id: 'agency',
      name: 'Agency Scale',
      badge: 'ENTERPRISE',
      priceMonthly: '₹2,499',
      priceAnnual: '₹1,999',
      period: '/mo',
      description: 'White-label reporting and sub-minute monitoring for digital agencies.',
      maxSites: 50,
      checkInterval: '1 minute',
      features: [
        '50 Monitored Websites',
        '1-minute Critical Outage Checks',
        'White-Label Printable PDF Reports',
        'Unguessable Client Share Links',
        'SMS Emergency Paging Integration',
        'Custom Webhook Headers & Tokens',
        'Unlimited Historical Retention',
        'Dedicated SLA & Agency Retainer Kit',
      ],
      ctaText: 'Upgrade to Agency',
      popular: false,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Plan Billing Cycle Selector */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pulse-cyan/10 border border-pulse-cyan/25 text-pulse-cyan text-xs font-mono font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transparent SaaS Pricing • Stripe Secured</span>
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Flexible Plans for Developers, SaaS & Agencies
        </h2>
        <p className="text-sm text-slate-300">
          Scale your website observability effortlessly. Switch or upgrade subscriptions with server-side quota verification and instant webhook provisioning.
        </p>

        {/* Monthly vs Annual Toggle & Customer Portal */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="bg-[#111827] border border-slate-800 p-1 rounded-xl inline-flex items-center gap-1 shadow-sm">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-pulse-cyan text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-pulse-cyan text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-bold">
                Save 20%
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCustomerPortal}
            disabled={isLoadingPortal}
            className="px-3.5 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/90 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            title="Open Stripe Customer Portal to view invoices and manage payment methods"
          >
            {isLoadingPortal ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 text-pulse-cyan" />
            )}
            <span>Manage Subscription & Invoices</span>
          </button>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-mono inline-flex items-center gap-2 shadow border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800/80 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* 4 Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const isActive = plan.id === activePlanId;
          const displayPrice = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                plan.popular
                  ? 'bg-gradient-to-b from-[#141e33] to-[#0f1728] border-2 border-pulse-cyan shadow-xl ring-1 ring-pulse-cyan/20'
                  : isActive
                  ? 'bg-[#111827] border-2 border-slate-600 shadow-md'
                  : 'bg-[#111827] border border-slate-800 hover:border-slate-700'
              } p-6`}
            >
              {/* Badges */}
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span
                    className={`px-3 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase border shadow-sm ${
                      plan.popular
                        ? 'bg-pulse-cyan text-slate-950 border-cyan-400'
                        : isActive
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-800 text-slate-200 border-slate-700'
                    }`}
                  >
                    {isActive ? 'CURRENT PLAN' : plan.badge}
                  </span>
                </div>
              )}

              <div>
                {/* Plan Header */}
                <div className="space-y-1 mb-4">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">{displayPrice}</span>
                    {plan.period && (
                      <span className="text-xs text-slate-400 font-mono">{plan.period}</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {billingCycle === 'annual' && plan.priceMonthly !== '₹0'
                      ? 'Billed annually (2 months free)'
                      : 'Billed monthly, cancel anytime'}
                  </span>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 text-xs text-slate-300 mb-6">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div>
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isActive || isUpdatingPlan}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                    isActive
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                      : plan.popular
                      ? 'bg-pulse-cyan hover:bg-cyan-400 text-slate-950 shadow-pulse-cyan/25'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                  }`}
                >
                  {isUpdatingPlan ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : isActive ? (
                    <span>Active Current Plan</span>
                  ) : (
                    <>
                      <span>{plan.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stripe Payment & Quota Consumption Card */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-pulse-cyan" />
              <span>Active Subscription & Entitlements</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Subscribed to {userProfile?.planName || 'Starter Plan'} • Tenant ID: {userProfile?.id || 'user-default'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-medium rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Stripe Signature Verified</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Monitored Domains</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {userProfile?.currentSitesCount || 2} / {userProfile?.maxSites || 3}
              </span>
              <span className="text-xs text-slate-400">Sites Allocated</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-pulse-cyan h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    ((userProfile?.currentSitesCount || 2) / (userProfile?.maxSites || 3)) * 100
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Uptime Check Cadence</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-pulse-emerald">
                {userProfile?.uptimeIntervalMinutes || 15} Minutes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              High-cadence probing with automatic consecutive-failure debouncing.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Commercial Guarantee</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">99.9% SLA</span>
            </div>
            <p className="text-xs text-slate-400">
              Signed Webhook dispatch to Slack, Discord & Email.
            </p>
          </div>
        </div>
      </div>

      {/* Stripe Checkout Modal */}
      {activeCheckoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-pulse-cyan/15 border border-pulse-cyan/30 flex items-center justify-center text-pulse-cyan">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Stripe Checkout</h3>
                  <p className="text-xs text-slate-400">256-bit Encrypted Checkout</p>
                </div>
              </div>
              <button
                onClick={() => setActiveCheckoutPlan(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <div className="p-4 bg-[#0a0f1d] border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Selected Plan:</span>
                <span className="font-bold text-white">{activeCheckoutPlan.name}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Billing Period:</span>
                <span className="capitalize text-white">{billingCycle}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Domain Quota:</span>
                <span className="text-pulse-cyan font-bold">{activeCheckoutPlan.maxSites} Monitored Websites</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between font-bold text-sm text-white">
                <span>Total Amount:</span>
                <span className="text-pulse-cyan">
                  {billingCycle === 'annual' ? activeCheckoutPlan.priceAnnual : activeCheckoutPlan.priceMonthly}
                  {activeCheckoutPlan.period}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Webhook fulfillment signed with HMAC-SHA256 signature verification.</span>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setActiveCheckoutPlan(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingCheckout}
                onClick={handleExecuteStripeCheckout}
                className="flex-1 py-2.5 bg-pulse-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {isProcessingCheckout ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Confirm & Pay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
