import React from 'react';
import {
  Printer,
  Share2,
  Check,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';

interface Finding {
  ruleCode: string;
  category: 'seo' | 'security' | 'performance' | 'usability';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  details: string;
  remediation: string;
  pageUrl: string;
}

interface CategoryScore {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  issuesCount: number;
}

interface ScanResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  durationMs: number;
  htmlSizeKb: number;
  healthScore: number;
  overallGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    seo: CategoryScore;
    security: CategoryScore;
    performance: CategoryScore;
    usability: CategoryScore;
  };
  title: string | null;
  metaDescription: string | null;
  h1List: string[];
  openGraph: {
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    twitterCard: string | null;
  };
  securityHeaders: {
    hsts: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    contentSecurityPolicy: boolean;
  };
  mixedContent: { tag: string; url: string }[];
  totalImages: number;
  imagesMissingAlt: number;
  internalLinksCount: number;
  externalLinksCount: number;
  brokenLinks: { url: string; statusCode: number }[];
  findings: Finding[];
}

interface ClientReportProps {
  scanResult: ScanResult | null;
  onShareReport: () => void;
  copiedToken: boolean;
  shareUrl: string | null;
  onBackToAudit: () => void;
}

export const ClientReport: React.FC<ClientReportProps> = ({
  scanResult,
  onShareReport,
  copiedToken,
  shareUrl,
  onBackToAudit,
}) => {
  if (!scanResult) {
    return (
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-12 text-center space-y-4">
        <ShieldCheck className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Audit Selected for Reporting</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Please run a health scan first from the Health & Audit engine or Fleet Cockpit to view and export the executive white-label client audit report.
        </p>
        <button
          onClick={onBackToAudit}
          className="px-4 py-2 bg-pulse-cyan text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>Go to Audit Engine</span>
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Action Header (Hidden in Print Mode) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] p-4 rounded-xl border border-slate-800 print:hidden shadow-sm">
        <button
          onClick={onBackToAudit}
          className="text-xs text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Interactive Audit</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onShareReport}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            {copiedToken ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Copy Shareable URL</span>
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 rounded-lg bg-pulse-cyan hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF</span>
          </button>
        </div>
        {shareUrl && (
          <div className="w-full mt-2 pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 truncate flex items-center gap-2">
            <span className="text-pulse-cyan">Share URL:</span>
            <span className="text-slate-300">{shareUrl}</span>
          </div>
        )}
      </div>

      {/* Printable Report Document (Clean High-Contrast Layout) */}
      <div className="bg-[#0f1728] text-slate-100 border border-slate-800 rounded-2xl p-8 sm:p-12 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none space-y-8">
        {/* Agency Executive Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-slate-800 print:border-gray-300">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pulse-cyan print:bg-blue-600" />
              <span className="font-extrabold text-xl tracking-tight text-white print:text-black">
                MERCER DIGITAL AUDIT LABS
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              Confidential Technical SEO & Security Infrastructure Audit
            </p>
          </div>

          <div className="text-left sm:text-right font-mono text-xs text-slate-400 print:text-gray-600 space-y-0.5">
            <p>Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>Audit Ref: SP-AUD-{Date.now().toString(36).toUpperCase()}</p>
            <p>Target: <span className="text-pulse-cyan print:text-blue-600 font-bold">{scanResult.url}</span></p>
          </div>
        </div>

        {/* Executive Scorecard */}
        <div className="bg-[#141f36] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-pulse-cyan/15 print:bg-blue-100 border-2 border-pulse-cyan print:border-blue-600 flex flex-col items-center justify-center font-mono font-extrabold text-pulse-cyan print:text-blue-600">
              <span className="text-3xl leading-none">{scanResult.overallGrade}</span>
              <span className="text-[10px] uppercase mt-1">Grade</span>
            </div>
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 print:text-gray-500 tracking-wider">
                Overall Health Score
              </span>
              <div className="text-4xl font-extrabold font-mono text-white print:text-black">
                {scanResult.healthScore} <span className="text-xl text-slate-400 print:text-gray-500">/ 100</span>
              </div>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
                Evaluated across 4 diagnostic disciplines: SEO, Security, Speed & Accessibility.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-mono w-full md:w-auto">
            <div className="p-3 bg-[#0a0f1d] print:bg-white border border-slate-800 print:border-gray-200 rounded-xl">
              <span className="text-slate-400 print:text-gray-500 block">Response Latency</span>
              <span className="text-base font-bold text-white print:text-black">{scanResult.responseTimeMs} ms</span>
            </div>
            <div className="p-3 bg-[#0a0f1d] print:bg-white border border-slate-800 print:border-gray-200 rounded-xl">
              <span className="text-slate-400 print:text-gray-500 block">Payload Size</span>
              <span className="text-base font-bold text-white print:text-black">{scanResult.htmlSizeKb} KB</span>
            </div>
          </div>
        </div>

        {/* 4 Pillars Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Technical SEO', grade: scanResult.categories.seo.grade, score: scanResult.categories.seo.score, issues: scanResult.categories.seo.issuesCount },
            { label: 'Security Headers', grade: scanResult.categories.security.grade, score: scanResult.categories.security.score, issues: scanResult.categories.security.issuesCount },
            { label: 'Performance', grade: scanResult.categories.performance.grade, score: scanResult.categories.performance.score, issues: scanResult.categories.performance.issuesCount },
            { label: 'Usability / UX', grade: scanResult.categories.usability.grade, score: scanResult.categories.usability.score, issues: scanResult.categories.usability.issuesCount },
          ].map((pillar, idx) => (
            <div
              key={idx}
              className="p-4 bg-[#111827] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-xl text-center space-y-1"
            >
              <span className="text-[11px] font-semibold text-slate-400 print:text-gray-600 uppercase block">
                {pillar.label}
              </span>
              <div className="text-2xl font-bold font-mono text-pulse-cyan print:text-blue-600">
                {pillar.grade}
              </div>
              <span className="text-xs font-mono text-slate-400 print:text-gray-500 block">
                {pillar.score}% ({pillar.issues} issues)
              </span>
            </div>
          ))}
        </div>

        {/* Core Infrastructure Checklist */}
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-white print:text-black tracking-wide uppercase">
            Critical Security & Crawlability Benchmarks
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 bg-[#111827] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-xl flex items-center justify-between">
              <span>HSTS Strict Transport Security</span>
              <span className={scanResult.securityHeaders.hsts ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {scanResult.securityHeaders.hsts ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <div className="p-3 bg-[#111827] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-xl flex items-center justify-between">
              <span>Content Security Policy (CSP)</span>
              <span className={scanResult.securityHeaders.contentSecurityPolicy ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {scanResult.securityHeaders.contentSecurityPolicy ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <div className="p-3 bg-[#111827] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-xl flex items-center justify-between">
              <span>Mixed HTTP Content Over TLS</span>
              <span className={scanResult.mixedContent.length === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {scanResult.mixedContent.length === 0 ? 'CLEAN (0)' : `DEFECT (${scanResult.mixedContent.length})`}
              </span>
            </div>
            <div className="p-3 bg-[#111827] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-xl flex items-center justify-between">
              <span>Internal Broken Links (Sample)</span>
              <span className={scanResult.brokenLinks.length === 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {scanResult.brokenLinks.length === 0 ? 'CLEAN (0)' : `BROKEN (${scanResult.brokenLinks.length})`}
              </span>
            </div>
          </div>
        </div>

        {/* Priority Recommendations */}
        <div className="space-y-4 pt-4 border-t border-slate-800 print:border-gray-300">
          <h4 className="text-sm font-bold text-white print:text-black tracking-wide uppercase">
            Priority Engineering Action Items
          </h4>
          <div className="space-y-3">
            {scanResult.findings.slice(0, 5).map((f, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#111827] print:bg-gray-50 border border-slate-800 print:border-gray-200 rounded-xl space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white print:text-black text-sm">{f.title}</span>
                  <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 print:bg-gray-200 print:text-gray-700">
                    {f.severity}
                  </span>
                </div>
                <p className="text-slate-300 print:text-gray-700">{f.details}</p>
                <div className="font-mono text-[11px] text-pulse-cyan print:text-blue-700 bg-[#0a0f1d] print:bg-white p-2 rounded border border-slate-800 print:border-gray-200">
                  {f.remediation}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Sign-off */}
        <div className="pt-8 border-t border-slate-800 print:border-gray-300 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 print:text-gray-600 font-mono gap-4">
          <div>
            <p>Generated by SitePulse Commercial Engine v1.0</p>
            <p>Mercer Creative Agency • Retainer Health Guarantee</p>
          </div>
          <div className="text-left sm:text-right">
            <p>Status: CERTIFIED TECHNICAL AUDIT</p>
          </div>
        </div>
      </div>
    </div>
  );
};
