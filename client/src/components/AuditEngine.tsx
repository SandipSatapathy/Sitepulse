import React, { useState } from 'react';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Lock,
  ArrowRight,
  Printer,
  Share2
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

interface AuditEngineProps {
  scanUrl: string;
  setScanUrl: (url: string) => void;
  onRunScan: (e: React.FormEvent) => void;
  isScanning: boolean;
  scanResult: ScanResult | null;
  scanError: string | null;
  onShareReport: () => void;
  copiedToken: boolean;
  onNavigateReport: () => void;
}

export const AuditEngine: React.FC<AuditEngineProps> = ({
  scanUrl,
  setScanUrl,
  onRunScan,
  isScanning,
  scanResult,
  scanError,
  onShareReport,
  copiedToken,
  onNavigateReport,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'seo' | 'security' | 'performance' | 'usability'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const handleCopySnippet = (snippet: string, id: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const filteredFindings = scanResult?.findings.filter((f) => {
    const matchesCategory = categoryFilter === 'all' || f.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter;
    return matchesCategory && matchesSeverity;
  });

  const getGradeColor = (grade: string) => {
    if (grade === 'A+' || grade === 'A') return 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60';
    if (grade === 'B') return 'text-cyan-400 bg-cyan-950/60 border-cyan-800/60';
    if (grade === 'C') return 'text-amber-400 bg-amber-950/60 border-amber-800/60';
    return 'text-rose-400 bg-rose-950/60 border-rose-800/60';
  };

  return (
    <div className="space-y-6">
      {/* Search & Audit Bar */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="max-w-2xl mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-pulse-cyan" />
            <span>Deep Diagnostic Crawler & Audit Engine</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            SSRF-protected multi-check crawler inspecting SEO metadata, security headers, mixed HTTP content, and broken internal hyperlinks.
          </p>
        </div>

        <form onSubmit={onRunScan} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="url"
              required
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0a0f1d] border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isScanning}
            className="px-6 py-2.5 bg-pulse-cyan hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Auditing Engine...</span>
              </>
            ) : (
              <>
                <span>Run Full Audit</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {scanError && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      {/* Results View */}
      {scanResult && (
        <div className="space-y-6">
          {/* Top Score & Action Strip */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div
                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border font-mono font-bold ${getGradeColor(
                  scanResult.overallGrade
                )}`}
              >
                <span className="text-2xl leading-none">{scanResult.overallGrade}</span>
                <span className="text-[10px] opacity-75">Grade</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">Audit Health Score: {scanResult.healthScore} / 100</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    HTTP {scanResult.statusCode}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Target: {scanResult.url} • Latency: {scanResult.responseTimeMs}ms • Size: {scanResult.htmlSizeKb}KB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onShareReport}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Report</span>
                  </>
                )}
              </button>
              <button
                onClick={onNavigateReport}
                className="px-3.5 py-2 rounded-lg bg-pulse-cyan/15 hover:bg-pulse-cyan/25 text-pulse-cyan text-xs font-semibold border border-pulse-cyan/40 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Executive Print View</span>
              </button>
            </div>
          </div>

          {/* 4 Category Score Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SEO */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Technical SEO</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getGradeColor(
                    scanResult.categories.seo.grade
                  )}`}
                >
                  {scanResult.categories.seo.grade}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">{scanResult.categories.seo.score}%</span>
                <span className="text-xs text-slate-400 font-mono">
                  {scanResult.categories.seo.issuesCount} issues
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{ width: `${scanResult.categories.seo.score}%` }}
                />
              </div>
            </div>

            {/* Security */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Security Headers</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getGradeColor(
                    scanResult.categories.security.grade
                  )}`}
                >
                  {scanResult.categories.security.grade}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">{scanResult.categories.security.score}%</span>
                <span className="text-xs text-slate-400 font-mono">
                  {scanResult.categories.security.issuesCount} issues
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full"
                  style={{ width: `${scanResult.categories.security.score}%` }}
                />
              </div>
            </div>

            {/* Performance */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Performance</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getGradeColor(
                    scanResult.categories.performance.grade
                  )}`}
                >
                  {scanResult.categories.performance.grade}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {scanResult.categories.performance.score}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {scanResult.categories.performance.issuesCount} issues
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${scanResult.categories.performance.score}%` }}
                />
              </div>
            </div>

            {/* Usability */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">Accessibility / UX</span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getGradeColor(
                    scanResult.categories.usability.grade
                  )}`}
                >
                  {scanResult.categories.usability.grade}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-white">
                  {scanResult.categories.usability.score}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {scanResult.categories.usability.issuesCount} issues
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full"
                  style={{ width: `${scanResult.categories.usability.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Oh Dear & Better Stack Reverse-Engineered Checks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Security Headers Checklist */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-pulse-cyan" />
                  <h4 className="text-sm font-bold text-white">HTTP Security Headers Checklist</h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">RFC Compliance</span>
              </div>

              <div className="space-y-2">
                {[
                  {
                    name: 'Strict-Transport-Security (HSTS)',
                    pass: scanResult.securityHeaders.hsts,
                    desc: 'Enforces encrypted HTTPS connections.',
                  },
                  {
                    name: 'X-Content-Type-Options (nosniff)',
                    pass: scanResult.securityHeaders.xContentTypeOptions,
                    desc: 'Prevents MIME-sniffing exploits.',
                  },
                  {
                    name: 'X-Frame-Options (DENY / SAMEORIGIN)',
                    pass: scanResult.securityHeaders.xFrameOptions,
                    desc: 'Prevents clickjacking framing attacks.',
                  },
                  {
                    name: 'Content-Security-Policy (CSP)',
                    pass: scanResult.securityHeaders.contentSecurityPolicy,
                    desc: 'Restricts script origins against XSS.',
                  },
                ].map((header, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-medium text-slate-200">{header.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{header.desc}</p>
                    </div>
                    <span
                      className={`font-mono px-2 py-0.5 rounded text-[11px] border shrink-0 flex items-center gap-1 ${
                        header.pass
                          ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800/40'
                          : 'text-rose-400 bg-rose-950/60 border-rose-800/40'
                      }`}
                    >
                      {header.pass ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      <span>{header.pass ? 'Configured' : 'Missing'}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mixed Content & Broken Links Inspector */}
            <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">Mixed Content & Broken Links</h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Crawler Crawler</span>
              </div>

              {/* Mixed Content */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Insecure HTTP Mixed Content ({scanResult.mixedContent.length})
                </span>
                {scanResult.mixedContent.length === 0 ? (
                  <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Zero mixed content found. All assets serve over secure TLS.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {scanResult.mixedContent.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-rose-950/30 border border-rose-900/50 text-xs font-mono text-rose-300 flex items-center justify-between"
                      >
                        <span className="truncate max-w-xs">{item.url}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-900/60 uppercase">
                          {item.tag}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Broken Links */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-semibold text-slate-300">
                  Broken Internal Links ({scanResult.brokenLinks.length})
                </span>
                {scanResult.brokenLinks.length === 0 ? (
                  <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/80 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All internal sampled links returned valid 200/300 status.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {scanResult.brokenLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded bg-rose-950/30 border border-rose-900/50 text-xs font-mono text-rose-300 flex items-center justify-between"
                      >
                        <span className="truncate max-w-xs">{link.url}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-900/80">
                          {link.statusCode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filterable Audit Findings List with Code Remediation */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-white text-sm">Actionable Audit Findings & Code Fixes</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing {filteredFindings?.length || 0} findings
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {['all', 'seo', 'security', 'performance', 'usability'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat as any)}
                      className={`px-2 py-1 rounded capitalize font-mono cursor-pointer transition ${
                        categoryFilter === cat
                          ? 'bg-pulse-cyan text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  {['all', 'critical', 'warning', 'info'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setSeverityFilter(sev as any)}
                      className={`px-2 py-1 rounded capitalize font-mono cursor-pointer transition ${
                        severityFilter === sev
                          ? 'bg-slate-700 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {filteredFindings && filteredFindings.length > 0 ? (
                filteredFindings.map((finding, idx) => {
                  const isCrit = finding.severity === 'critical';
                  const isWarn = finding.severity === 'warning';
                  return (
                    <div key={idx} className="p-5 hover:bg-slate-800/30 transition space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                                isCrit
                                  ? 'text-rose-400 bg-rose-950/60 border-rose-800/50'
                                  : isWarn
                                  ? 'text-amber-400 bg-amber-950/60 border-amber-800/50'
                                  : 'text-cyan-400 bg-cyan-950/60 border-cyan-800/50'
                              }`}
                            >
                              {finding.severity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 uppercase">
                              [{finding.ruleCode}]
                            </span>
                            <h5 className="font-bold text-white text-sm">{finding.title}</h5>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{finding.details}</p>
                        </div>
                      </div>

                      {/* Code Remediation Snippet */}
                      <div className="bg-[#0a0f1d] border border-slate-800 rounded-lg p-3 font-mono text-xs flex items-center justify-between gap-4">
                        <span className="text-pulse-cyan truncate max-w-2xl">{finding.remediation}</span>
                        <button
                          onClick={() => handleCopySnippet(finding.remediation, `find-${idx}`)}
                          className="text-slate-400 hover:text-slate-200 flex items-center gap-1 shrink-0 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                          title="Copy remediation code"
                        >
                          {copiedSnippet === `find-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span className="text-[11px]">Copy Fix</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No issues matching active filter.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
