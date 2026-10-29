import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SitePulse ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/cockpit';
  };

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080c18] text-slate-100 flex items-center justify-center p-6 ambient-mesh">
          <div className="max-w-lg w-full bg-[#111827] border border-rose-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-pulse-cyan" />

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {this.props.fallbackTitle || 'Application Render Interrupted'}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  SitePulse Fault-Isolation Guardian
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              An unexpected runtime error occurred while rendering this component. The rest of your monitoring and background probes remain active.
            </p>

            {this.state.error && (
              <div className="mb-6 bg-[#0a0f1d] border border-slate-800 rounded-lg p-3 text-xs font-mono text-rose-300 break-words">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={this.handleReload}
                className="clay-btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload Application</span>
              </button>
              <button
                onClick={this.handleReset}
                className="clay-btn-secondary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Back to Cockpit</span>
              </button>
            </div>

            {/* Collapsible Tech Stack */}
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer font-mono"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    this.state.showDetails ? 'rotate-180' : ''
                  }`}
                />
                <span>{this.state.showDetails ? 'Hide Diagnostics' : 'View Diagnostics'}</span>
              </button>

              {this.state.showDetails && this.state.errorInfo && (
                <pre className="mt-2.5 p-3 rounded bg-black/60 border border-slate-800 text-[10px] text-slate-400 font-mono overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
