import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Send,
  CheckCircle2,
  Shield,
  Zap,
  Save,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface NotificationSettings {
  emailAlerts: boolean;
  alertEmail: string;
  slackWebhook: string;
  discordWebhook: string;
  notifyOnOutage: boolean;
  notifyOnRecovery: boolean;
  notifyOnSslExpiry: boolean;
  sslAlertMilestones: number[];
}

export const AlertSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailAlerts: true,
    alertEmail: 'alex@mercercreative.io',
    slackWebhook: '',
    discordWebhook: '',
    notifyOnOutage: true,
    notifyOnRecovery: true,
    notifyOnSslExpiry: true,
    sslAlertMilestones: [30, 14, 7, 1],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Slack Test state
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email Test state
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Discord Test state
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [discordTestResult, setDiscordTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('sitepulse_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/notifications', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({
          emailAlerts: data.emailAlerts ?? true,
          alertEmail: data.alertEmail || 'alex@mercercreative.io',
          slackWebhook: data.slackWebhook || (data as any).slackWebhookUrl || '',
          discordWebhook: data.discordWebhook || (data as any).discordWebhookUrl || '',
          notifyOnOutage: data.notifyOnOutage ?? true,
          notifyOnRecovery: data.notifyOnRecovery ?? true,
          notifyOnSslExpiry: data.notifyOnSslExpiry ?? true,
          sslAlertMilestones: data.sslAlertMilestones || [30, 14, 7, 1],
        });
      }
    } catch {
      // Keep defaults
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!settings.alertEmail) {
      setEmailTestResult({ success: false, message: 'Please enter a recipient email address first.' });
      setTimeout(() => setEmailTestResult(null), 4000);
      return;
    }

    setTestingEmail(true);
    setEmailTestResult(null);

    try {
      const res = await fetch('/api/settings/notifications/test-email', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: settings.alertEmail }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEmailTestResult({ success: true, message: data.message || 'Test email dispatched successfully!' });
      } else {
        setEmailTestResult({ success: false, message: data.error || 'Failed to dispatch email.' });
      }
    } catch (err: any) {
      setEmailTestResult({ success: false, message: err.message || 'Network error delivering email.' });
    } finally {
      setTestingEmail(false);
      setTimeout(() => setEmailTestResult(null), 6000);
    }
  };

  const handleSendTestSlack = async () => {
    if (!settings.slackWebhook) {
      setSlackTestResult({ success: false, message: 'Please enter a Slack webhook URL first.' });
      setTimeout(() => setSlackTestResult(null), 4000);
      return;
    }

    setTestingSlack(true);
    setSlackTestResult(null);

    try {
      const res = await fetch('/api/settings/notifications/test-slack', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ webhookUrl: settings.slackWebhook }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSlackTestResult({ success: true, message: data.message || 'Slack test ping delivered!' });
      } else {
        setSlackTestResult({ success: false, message: data.error || 'Failed to deliver ping.' });
      }
    } catch (err: any) {
      setSlackTestResult({ success: false, message: err.message || 'Network error delivering webhook.' });
    } finally {
      setTestingSlack(false);
      setTimeout(() => setSlackTestResult(null), 5000);
    }
  };

  const handleSendTestDiscord = async () => {
    if (!settings.discordWebhook) {
      setDiscordTestResult({ success: false, message: 'Please enter a Discord webhook URL first.' });
      setTimeout(() => setDiscordTestResult(null), 4000);
      return;
    }

    setTestingDiscord(true);
    setDiscordTestResult(null);

    try {
      const res = await fetch('/api/settings/notifications/test-discord', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ webhookUrl: settings.discordWebhook }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setDiscordTestResult({ success: true, message: data.message || 'Discord test embed delivered!' });
      } else {
        setDiscordTestResult({ success: false, message: data.error || 'Failed to deliver ping.' });
      }
    } catch (err: any) {
      setDiscordTestResult({ success: false, message: err.message || 'Network error delivering webhook.' });
    } finally {
      setTestingDiscord(false);
      setTimeout(() => setDiscordTestResult(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-pulse-cyan" />
          <span>Incident Alert Channels & Outage Debouncing</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure real outbound delivery destinations for website outages, latency spikes, and SSL expiry warnings.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Notification Channel */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-pulse-cyan" />
                <h3 className="text-sm font-bold text-white">Email Notification Delivery</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={testingEmail}
                  onClick={handleSendTestEmail}
                  className="text-xs text-pulse-cyan hover:underline font-mono cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  {testingEmail && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{testingEmail ? 'Sending...' : 'Send Test Email'}</span>
                </button>
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={(e) => setSettings({ ...settings, emailAlerts: e.target.checked })}
                  className="w-4 h-4 rounded text-pulse-cyan bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Primary Incident Recipient Email
              </label>
              <input
                type="email"
                required
                value={settings.alertEmail}
                onChange={(e) => setSettings({ ...settings, alertEmail: e.target.value })}
                placeholder="ops@yourcompany.com"
                className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Immediate email notifications are triggered as soon as an outage is confirmed.
              </p>
            </div>

            {emailTestResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 font-mono ${
                  emailTestResult.success
                    ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
                }`}
              >
                {emailTestResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                )}
                <span>{emailTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Slack Webhook Channel */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Slack Incoming Webhook</h3>
              </div>
              <button
                type="button"
                disabled={testingSlack}
                onClick={handleSendTestSlack}
                className="text-xs text-pulse-cyan hover:underline font-mono cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {testingSlack && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{testingSlack ? 'Sending...' : 'Send Test Ping'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Slack Incoming Webhook URL
              </label>
              <input
                type="url"
                value={settings.slackWebhook}
                onChange={(e) => setSettings({ ...settings, slackWebhook: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Posts formatted incident cards with response code, duration, and direct post-mortem link.
              </p>
            </div>

            {slackTestResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 font-mono ${
                  slackTestResult.success
                    ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
                }`}
              >
                {slackTestResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                )}
                <span>{slackTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Discord Webhook Channel */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Discord Incident Bot Webhook</h3>
              </div>
              <button
                type="button"
                disabled={testingDiscord}
                onClick={handleSendTestDiscord}
                className="text-xs text-pulse-cyan hover:underline font-mono cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {testingDiscord && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>{testingDiscord ? 'Sending...' : 'Send Test Ping'}</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Discord Webhook URL
              </label>
              <input
                type="url"
                value={settings.discordWebhook}
                onChange={(e) => setSettings({ ...settings, discordWebhook: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full px-3 py-2 bg-[#0a0f1d] border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pulse-cyan font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Embeds alert color-coded embeds (Red for Outage, Green for Recovery) in your Discord team channel.
              </p>
            </div>

            {discordTestResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 font-mono ${
                  discordTestResult.success
                    ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-300'
                    : 'bg-rose-950/70 border border-rose-800/80 text-rose-300'
                }`}
              >
                {discordTestResult.success ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                )}
                <span>{discordTestResult.message}</span>
              </div>
            )}
          </div>

          {/* Outage Sensitivity & Debouncing */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Shield className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Consecutive Failure De-bouncing</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">
                    Failures Required for Outage
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Prevents transient network blips from paging your engineering team.
                  </span>
                </div>
                <span className="font-mono text-sm font-bold text-pulse-cyan px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                  2 Failures
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2 text-xs text-slate-400 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Better Stack & Datadog standard: 2 consecutive failures.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Notification settings saved and synchronized across all probe workers!</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400">Changes take effect immediately on next probe cycle.</div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-pulse-cyan hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Notification Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
