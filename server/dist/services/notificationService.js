import { resolveSafeTarget, createPinnedLookup } from '../scanner/ssrf.js';
import http from 'node:http';
import https from 'node:https';
async function sendOutboundWebhook(webhookUrl, payload) {
    const target = await resolveSafeTarget(webhookUrl);
    const isHttps = target.url.protocol === 'https:';
    const client = isHttps ? https : http;
    const port = target.url.port ? parseInt(target.url.port, 10) : isHttps ? 443 : 80;
    const jsonBody = JSON.stringify(payload);
    return new Promise((resolve) => {
        const req = client.request({
            protocol: target.url.protocol,
            hostname: target.url.hostname,
            port,
            path: (target.url.pathname || '/') + (target.url.search || ''),
            method: 'POST',
            headers: {
                'Host': target.url.host,
                'User-Agent': 'SitePulse-AlertDispatcher/1.0',
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(jsonBody),
            },
            lookup: createPinnedLookup(target.safeIp, target.family),
            servername: target.url.hostname,
            signal: AbortSignal.timeout(5000),
        });
        req.on('response', (res) => {
            let body = '';
            res.on('data', (c) => (body += c));
            res.on('end', () => {
                resolve({
                    ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
                    status: res.statusCode || 0,
                    text: body,
                });
            });
        });
        req.on('error', (err) => {
            resolve({
                ok: false,
                status: 0,
                text: err.message || 'Network error',
            });
        });
        req.write(jsonBody);
        req.end();
    });
}
export async function sendOutboundEmail(options) {
    const resendApiKey = process.env.RESEND_API_KEY;
    const sendgridApiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.ALERT_FROM_EMAIL || 'SitePulse Sentinel <alerts@sitepulse.dev>';
    if (resendApiKey) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: fromEmail,
                    to: [options.to],
                    subject: options.subject,
                    html: options.html,
                    text: options.text || options.html.replace(/<[^>]+>/g, ''),
                }),
                signal: AbortSignal.timeout(8000),
            });
            const body = await res.text();
            return { ok: res.ok, status: res.status, text: body };
        }
        catch (err) {
            console.error('[NotificationService] Resend email delivery failed:', err.message);
            return { ok: false, status: 0, text: err.message };
        }
    }
    if (sendgridApiKey) {
        try {
            const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sendgridApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    personalizations: [{ to: [{ email: options.to }] }],
                    from: { email: fromEmail.replace(/^.*<([^>]+)>.*$/, '$1') },
                    subject: options.subject,
                    content: [{ type: 'text/html', value: options.html }],
                }),
                signal: AbortSignal.timeout(8000),
            });
            const body = await res.text();
            return { ok: res.ok, status: res.status, text: body };
        }
        catch (err) {
            console.error('[NotificationService] SendGrid email delivery failed:', err.message);
            return { ok: false, status: 0, text: err.message };
        }
    }
    // If no live email provider API key is configured in dev, log cleanly with preview
    console.log(`📧 [NotificationService Simulated Email] To: ${options.to} | Subject: "${options.subject}" (Set RESEND_API_KEY in server/.env for production email delivery)`);
    return { ok: true, status: 200, text: 'Simulated email delivered. Add RESEND_API_KEY in .env for real inbox delivery.' };
}
export class NotificationService {
    /**
     * Dispatches real-time outage alerts to Slack, Discord, and Email.
     */
    async notifyOutage(project, check, settings) {
        if (!settings.notifyOnOutage)
            return;
        console.log(`🚨 [NotificationService] Dispatching OUTAGE alerts for ${project.name} (${project.baseUrl})...`);
        // 1. Slack Webhook Dispatch
        if (settings.slackWebhook && settings.slackWebhook.startsWith('http')) {
            const slackPayload = {
                text: `🚨 [SitePulse Outage] ${project.name} is DOWN (${project.baseUrl})`,
                attachments: [
                    {
                        color: '#ef4444',
                        title: `🚨 OUTAGE CONFIRMED: ${project.name}`,
                        title_link: project.baseUrl,
                        fields: [
                            { title: 'Status Code', value: String(check.httpStatus || 'Failed / Timeout'), short: true },
                            { title: 'Latency', value: `${check.responseTimeMs} ms`, short: true },
                            { title: 'Failure Reason', value: check.failureDetail || 'Unreachable origin', short: false },
                            { title: 'Detected At', value: check.checkedAt, short: true },
                            { title: 'Sensitivity', value: `${project.consecutiveFailureThreshold} consecutive failures`, short: true },
                        ],
                        footer: 'SitePulse Autonomous Fleet Monitor',
                        ts: Math.floor(Date.now() / 1000),
                    },
                ],
            };
            sendOutboundWebhook(settings.slackWebhook, slackPayload).then((res) => {
                if (!res.ok)
                    console.warn(`[NotificationService] Slack alert delivery returned HTTP ${res.status}: ${res.text}`);
                else
                    console.log(`[NotificationService] Slack alert delivered successfully for ${project.name}`);
            }).catch((e) => console.error('[NotificationService] Slack dispatch error:', e));
        }
        // 2. Discord Webhook Dispatch
        if (settings.discordWebhook && settings.discordWebhook.startsWith('http')) {
            const discordPayload = {
                content: `🚨 **SitePulse Outage Alert** — ${project.name}`,
                embeds: [
                    {
                        title: `🚨 Outage Confirmed: ${project.name}`,
                        url: project.baseUrl,
                        color: 15158332, // Red
                        description: `The monitored website has failed availability health-checks.`,
                        fields: [
                            { name: 'HTTP Status', value: String(check.httpStatus || 'Timeout'), inline: true },
                            { name: 'Latency', value: `${check.responseTimeMs} ms`, inline: true },
                            { name: 'Failure Code', value: check.failureCode || 'DOWN', inline: true },
                            { name: 'Root Cause', value: check.failureDetail || 'Origin unreachable', inline: false },
                        ],
                        timestamp: check.checkedAt,
                        footer: { text: 'SitePulse Monitoring Engine' },
                    },
                ],
            };
            sendOutboundWebhook(settings.discordWebhook, discordPayload).then((res) => {
                if (!res.ok)
                    console.warn(`[NotificationService] Discord alert delivery returned HTTP ${res.status}`);
                else
                    console.log(`[NotificationService] Discord alert delivered successfully for ${project.name}`);
            }).catch((e) => console.error('[NotificationService] Discord dispatch error:', e));
        }
        // 3. Real Email Alert Dispatch via Resend / SendGrid
        if (settings.emailAlerts && settings.alertEmail) {
            const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; color: #f8fafc; padding: 28px; border-radius: 12px; border: 1px solid #1e293b;">
          <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
            <span style="font-size: 18px; font-weight: bold; color: #38bdf8;">SitePulse Sentinel</span>
          </div>
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: #ef4444; margin: 0 0 8px 0; font-size: 20px;">🚨 OUTAGE CONFIRMED: ${project.name}</h2>
            <p style="margin: 0; color: #cbd5e1; font-size: 14px;">Origin endpoint <strong>${project.baseUrl}</strong> is unreachable.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">HTTP Status:</td>
              <td style="padding: 8px 0; color: #f8fafc; font-weight: bold;">${check.httpStatus || 'Timeout / Unreachable'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Latency / Error:</td>
              <td style="padding: 8px 0; color: #f8fafc; font-weight: bold;">${check.failureDetail || `${check.responseTimeMs} ms`}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Detected At:</td>
              <td style="padding: 8px 0; color: #f8fafc;">${check.checkedAt}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Confirmation:</td>
              <td style="padding: 8px 0; color: #f8fafc;">${project.consecutiveFailureThreshold} consecutive failed checks</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px;">
            SitePulse Autonomous Monitoring Network. You received this because email outage alerts are active for your workspace.
          </p>
        </div>
      `;
            sendOutboundEmail({
                to: settings.alertEmail,
                subject: `🚨 [SitePulse Outage] ${project.name} is DOWN (${check.httpStatus || 'Failed'})`,
                html: emailHtml,
            }).catch((e) => console.error('[NotificationService] Email dispatch error:', e));
        }
    }
    /**
     * Dispatches recovery confirmation to Slack, Discord, and Email.
     */
    async notifyRecovery(project, check, settings) {
        if (!settings.notifyOnRecovery)
            return;
        console.log(`✅ [NotificationService] Dispatching RECOVERY notices for ${project.name}...`);
        if (settings.slackWebhook && settings.slackWebhook.startsWith('http')) {
            const slackPayload = {
                text: `✅ [SitePulse Recovery] ${project.name} is BACK UP (${project.baseUrl})`,
                attachments: [
                    {
                        color: '#10b981',
                        title: `✅ RECOVERY CONFIRMED: ${project.name}`,
                        title_link: project.baseUrl,
                        fields: [
                            { title: 'Status Code', value: String(check.httpStatus || 200), short: true },
                            { title: 'Response Time', value: `${check.responseTimeMs} ms`, short: true },
                            { title: 'Confirmed At', value: check.checkedAt, short: false },
                        ],
                        footer: 'SitePulse Autonomous Fleet Monitor',
                        ts: Math.floor(Date.now() / 1000),
                    },
                ],
            };
            sendOutboundWebhook(settings.slackWebhook, slackPayload).catch(() => { });
        }
        if (settings.discordWebhook && settings.discordWebhook.startsWith('http')) {
            const discordPayload = {
                content: `✅ **SitePulse Service Restored** — ${project.name}`,
                embeds: [
                    {
                        title: `✅ Service Restored: ${project.name}`,
                        url: project.baseUrl,
                        color: 3066993, // Green
                        description: `The website is responding normally. Availability check returned HTTP ${check.httpStatus}.`,
                        fields: [
                            { name: 'Response Time', value: `${check.responseTimeMs} ms`, inline: true },
                            { name: 'Restored At', value: check.checkedAt, inline: true },
                        ],
                        timestamp: check.checkedAt,
                    },
                ],
            };
            sendOutboundWebhook(settings.discordWebhook, discordPayload).catch(() => { });
        }
        if (settings.emailAlerts && settings.alertEmail) {
            const recoveryHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; color: #f8fafc; padding: 28px; border-radius: 12px; border: 1px solid #1e293b;">
          <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
            <span style="font-size: 18px; font-weight: bold; color: #38bdf8;">SitePulse Sentinel</span>
          </div>
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <h2 style="color: #10b981; margin: 0 0 8px 0; font-size: 20px;">✅ SERVICE RESTORED: ${project.name}</h2>
            <p style="margin: 0; color: #cbd5e1; font-size: 14px;"><strong>${project.baseUrl}</strong> is responding normally.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">HTTP Status:</td>
              <td style="padding: 8px 0; color: #f8fafc; font-weight: bold;">${check.httpStatus || 200} OK</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Response Latency:</td>
              <td style="padding: 8px 0; color: #f8fafc; font-weight: bold;">${check.responseTimeMs} ms</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8;">Restored At:</td>
              <td style="padding: 8px 0; color: #f8fafc;">${check.checkedAt}</td>
            </tr>
          </table>
          <p style="color: #64748b; font-size: 12px; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px;">
            SitePulse Autonomous Monitoring Network.
          </p>
        </div>
      `;
            sendOutboundEmail({
                to: settings.alertEmail,
                subject: `✅ [SitePulse Restored] ${project.name} is BACK UP (HTTP ${check.httpStatus || 200})`,
                html: recoveryHtml,
            }).catch((e) => console.error('[NotificationService] Recovery email error:', e));
        }
    }
    /**
     * Dispatches SSL expiration warnings to Slack and Discord.
     */
    async notifySslExpiry(project, cert, settings) {
        if (!settings.notifyOnSslExpiry || !cert.milestoneAlertDue)
            return;
        console.log(`⚠️ [NotificationService] SSL Milestone (${cert.milestoneAlertDue}d) warning for ${project.name}...`);
        if (settings.slackWebhook && settings.slackWebhook.startsWith('http')) {
            const slackPayload = {
                text: `🔒 [SitePulse SSL Warning] ${project.name} certificate expires in ${cert.daysUntilExpiry} days!`,
                attachments: [
                    {
                        color: '#f59e0b',
                        title: `🔒 SSL Certificate Renewal Warning: ${cert.hostname}`,
                        fields: [
                            { title: 'Issuer', value: cert.issuer || 'Unknown', short: true },
                            { title: 'Days Remaining', value: `${cert.daysUntilExpiry} days`, short: true },
                            { title: 'Expiry Date', value: cert.expiresAt || 'N/A', short: false },
                        ],
                        footer: 'SitePulse SSL Early-Warning Engine',
                    },
                ],
            };
            sendOutboundWebhook(settings.slackWebhook, slackPayload).catch(() => { });
        }
    }
    /**
     * Test webhook sender for AlertSettings page.
     */
    async testWebhook(webhookUrl, type) {
        if (!webhookUrl || !webhookUrl.startsWith('http')) {
            return { success: false, message: 'Invalid URL. Must begin with http:// or https://' };
        }
        const payload = type === 'slack'
            ? {
                text: '🔔 *SitePulse Webhook Test*: Incident notification delivery pipeline operational!',
                attachments: [
                    {
                        color: '#06b6d4',
                        title: 'SitePulse Alert Channel Connected',
                        text: 'Your Slack channel is configured to receive instant notifications on outages, latency spikes, and SSL renewal milestones.',
                    },
                ],
            }
            : {
                content: '🔔 **SitePulse Webhook Test Successful**',
                embeds: [
                    {
                        title: 'SitePulse Webhook Connected',
                        color: 43690, // Cyan
                        description: 'Your Discord channel is configured to receive real-time incident embeds.',
                        timestamp: new Date().toISOString(),
                    },
                ],
            };
        try {
            const res = await sendOutboundWebhook(webhookUrl, payload);
            if (res.ok) {
                return { success: true, message: `Test ping delivered successfully (HTTP ${res.status}).` };
            }
            return { success: false, message: `Webhook endpoint returned HTTP ${res.status}: ${res.text}` };
        }
        catch (err) {
            return { success: false, message: `Failed to deliver test ping: ${err.message}` };
        }
    }
    /**
     * Test email sender for AlertSettings page.
     */
    async testEmail(recipientEmail) {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            return { success: false, message: 'Invalid recipient email address.' };
        }
        const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b1120; color: #f8fafc; padding: 28px; border-radius: 12px; border: 1px solid #1e293b;">
        <div style="border-bottom: 1px solid #1e293b; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-size: 18px; font-weight: bold; color: #38bdf8;">SitePulse Sentinel</span>
        </div>
        <div style="background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h2 style="color: #38bdf8; margin: 0 0 8px 0; font-size: 20px;">🔔 Outbound Alert Pipeline Verified</h2>
          <p style="margin: 0; color: #cbd5e1; font-size: 14px;">This test confirms that your alert destination (<strong>${recipientEmail}</strong>) is ready to receive immediate outage, downtime, and SSL expiry warnings.</p>
        </div>
        <div style="background: #111827; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-family: monospace; font-size: 13px; color: #94a3b8;">
          Timestamp: ${new Date().toISOString()}<br/>
          Status: Operational<br/>
          Engine: SitePulse Alert Dispatcher 1.0
        </div>
        <p style="color: #64748b; font-size: 12px; margin: 0;">
          SitePulse Autonomous Monitoring Network.
        </p>
      </div>
    `;
        try {
            const res = await sendOutboundEmail({
                to: recipientEmail,
                subject: '🔔 [SitePulse] Outbound Email Alert Pipeline Verified',
                html,
            });
            return {
                success: res.ok,
                message: res.ok
                    ? (process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
                        ? 'Test email dispatched via live email provider API!'
                        : 'Test alert processed (Simulated mode: set RESEND_API_KEY in server/.env for live inbox delivery).')
                    : `Email delivery failed: ${res.text}`,
            };
        }
        catch (err) {
            return { success: false, message: `Email delivery error: ${err.message}` };
        }
    }
}
export const notificationService = new NotificationService();
