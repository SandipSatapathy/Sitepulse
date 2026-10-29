import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ClientReport } from './ClientReport';
import { ShieldCheck, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export const SharedReportViewer: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/reports/shared/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('This client audit report link has expired or is invalid.');
        return res.json();
      })
      .then((data) => {
        if (data.scan) {
          const parsed = typeof data.scan.audit_result_json === 'string'
            ? JSON.parse(data.scan.audit_result_json)
            : data.scan.auditResult || data.scan.auditResultJson;
          setScanResult(parsed);
        } else {
          throw new Error('Audit scan record is not available.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c18] text-slate-100 flex flex-col items-center justify-center p-6 ambient-mesh">
        <RefreshCw className="w-8 h-8 text-pulse-cyan animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">Decrypting & loading certified client audit report...</p>
      </div>
    );
  }

  if (error || !scanResult) {
    return (
      <div className="min-h-screen bg-[#080c18] text-slate-100 flex items-center justify-center p-6 ambient-mesh">
        <div className="max-w-md w-full bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">Report Unavailable</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to retrieve the requested audit report.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 clay-btn-primary px-4 py-2 text-xs font-bold mt-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to SitePulse</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c18] text-slate-100 font-sans p-6 lg:p-10 ambient-mesh">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-pulse-cyan" />
            <div>
              <h1 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                SitePulse Certified Audit Report
              </h1>
              <p className="text-[11px] text-slate-400 font-mono">Secure Token: {token}</p>
            </div>
          </div>
          <Link
            to="/"
            className="clay-btn-secondary px-3 py-1.5 text-xs font-mono flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Visit SitePulse Sentinel</span>
          </Link>
        </div>

        <ClientReport
          scanResult={scanResult}
          onShareReport={handleShare}
          copiedToken={copiedToken}
          shareUrl={window.location.href}
          onBackToAudit={() => window.history.back()}
        />
      </div>
    </div>
  );
};

