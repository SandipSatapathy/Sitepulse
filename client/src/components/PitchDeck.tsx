import React, { useState } from 'react';
import {
  Presentation,
  ChevronLeft,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

export const PitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      badge: 'PROBLEM & MARKET PAIN',
      title: 'Websites Die Silently While You Sleep',
      subtitle: 'Why traditional agencies and small businesses lose high-paying customers to undetected downtime and expired SSL certificates.',
      stats: [
        { label: 'Avg Outage Cost for SMBs', value: '$427 / min', note: 'Gartner Industry Report' },
        { label: 'Outages Detected by Customers First', value: '73%', note: 'Before dev team notices' },
        { label: 'Google Ranking Drop After 24h Down', value: '-30%', note: 'Search indexing penalty' },
      ],
      points: [
        'Freelancers and boutique agencies find out a client site is down when the angry CEO calls.',
        'TLS/SSL certificates expire without notice, throwing terrifying browser security warnings.',
        'DIY ping scripts fail to check mixed content, broken links, or critical security headers.',
      ],
    },
    {
      badge: 'MARKET POSITIONING',
      title: 'The Enterprise Void Between Free & $500/mo',
      subtitle: 'Datadog is bloated DevOps engineering. UptimeRobot is a shallow 1-URL ping. SitePulse is built for agencies.',
      comparison: [
        {
          tool: 'Datadog / New Relic',
          flaw: '$500+/mo, requires Kubernetes agents, overwhelming complex dashboards for non-devops.',
        },
        {
          tool: 'Generic Uptime Bots',
          flaw: 'Single status ping. No SEO crawl, no mixed content check, no client white-label reports.',
        },
        {
          tool: 'SitePulse SaaS',
          flaw: 'The sweet spot: Real-time Uptime + SSL Warnings + SEOptimer Health Audit in one client-ready dashboard.',
          highlight: true,
        },
      ],
    },
    {
      badge: 'PRODUCT ENGINE',
      title: 'Reverse-Engineered Excellence',
      subtitle: 'Combining the best monitoring features of the industry into a lightweight, high-performance monolith.',
      features: [
        {
          title: 'Better Stack Style Telemetry',
          desc: '90-day latency dot-matrix, consecutive failure de-bouncing (zero false alarms), and incident post-mortems.',
        },
        {
          title: 'Oh Dear Mixed Content & SSL Sentinel',
          desc: 'Automated crawl for insecure HTTP scripts/images on HTTPS pages and 30/14/7/1-day TLS expiration milestones.',
        },
        {
          title: 'SEOptimer Category Letter Grades',
          desc: 'Instant A+ to F scorecard across SEO, Security, Speed, and Accessibility with copyable code remediation.',
        },
      ],
    },
    {
      badge: 'AGENCY MONETIZATION & ROI',
      title: 'How Agencies Turn SitePulse into ₹15,000/mo Retainers',
      subtitle: 'The math of selling white-labeled website care & maintenance packages to business clients.',
      stats: [
        { label: 'Agency Plan Cost', value: '₹2,499 / mo', note: 'Monitors up to 50 client sites' },
        { label: 'Standard Client Retainer', value: '₹3,000 / site', note: 'Billed monthly to client' },
        { label: 'Net Monthly Profit (10 sites)', value: '₹27,501 / mo', note: '91% gross margin' },
      ],
      points: [
        'Send monthly executive PDF health reports with your agency logo.',
        'Catch client website outages before their customers or Google notices.',
        'Offer guaranteed 99.9% uptime SLA backed by automated multi-channel alerting.',
      ],
    },
  ];

  const slide = slides[currentSlide];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Deck Controls */}
      <div className="flex items-center justify-between bg-[#111827] border border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Presentation className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-white text-sm">SitePulse Executive Pitch Deck</span>
          <span className="text-xs font-mono text-slate-400">
            Slide {currentSlide + 1} of {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
            disabled={currentSlide === 0}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
            disabled={currentSlide === slides.length - 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slide Canvas */}
      <div className="bg-gradient-to-br from-[#101726] to-[#0a0f1d] border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl min-h-[460px] flex flex-col justify-between space-y-6">
        {/* Top Badge & Titles */}
        <div className="space-y-3">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold font-mono tracking-wider bg-purple-500/10 border border-purple-500/30 text-purple-400">
            {slide.badge}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {slide.title}
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            {slide.subtitle}
          </p>
        </div>

        {/* Slide Content Dynamic Sections */}
        {slide.stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {slide.stats.map((s, idx) => (
              <div key={idx} className="p-4 bg-[#111827] border border-slate-800 rounded-xl space-y-1">
                <span className="text-[11px] text-slate-400 uppercase font-mono">{s.label}</span>
                <div className="text-2xl font-bold font-mono text-pulse-cyan">{s.value}</div>
                <span className="text-[10px] text-slate-500">{s.note}</span>
              </div>
            ))}
          </div>
        )}

        {slide.points && (
          <div className="space-y-2.5">
            {slide.points.map((pt, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-pulse-emerald shrink-0 mt-0.5" />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        )}

        {slide.comparison && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {slide.comparison.map((comp, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border ${
                  comp.highlight
                    ? 'bg-gradient-to-b from-[#16233b] to-[#111b2e] border-pulse-cyan shadow-lg'
                    : 'bg-[#111827] border-slate-800'
                } space-y-2`}
              >
                <h4 className={`font-bold text-sm ${comp.highlight ? 'text-pulse-cyan' : 'text-white'}`}>
                  {comp.tool}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{comp.flaw}</p>
              </div>
            ))}
          </div>
        )}

        {slide.features && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {slide.features.map((feat, idx) => (
              <div key={idx} className="p-4 bg-[#111827] border border-slate-800 rounded-xl space-y-1.5">
                <h4 className="font-bold text-white text-xs">{feat.title}</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Slide Footer Navigation Pills */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentSlide === idx ? 'w-6 bg-pulse-cyan' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>
          <span className="font-mono text-[11px]">SitePulse Commercial Pitch v1.0</span>
        </div>
      </div>
    </div>
  );
};
