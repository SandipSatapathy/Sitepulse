import { query } from '../client.js';
export class NotificationRepository {
    async getNotificationSettings(userId) {
        const res = await query('SELECT * FROM notification_settings WHERE user_id = $1', [userId]);
        const r = res.rows[0];
        if (!r) {
            return {
                userId,
                emailAlerts: true,
                alertEmail: 'alerts@domain.com',
                slackWebhook: '',
                discordWebhook: '',
                notifyOnOutage: true,
                notifyOnRecovery: true,
                notifyOnSslExpiry: true,
                sslAlertMilestones: [30, 14, 7, 1],
            };
        }
        return {
            userId: r.user_id,
            emailAlerts: Boolean(r.email_alerts),
            alertEmail: r.alert_email,
            slackWebhook: r.slack_webhook || '',
            discordWebhook: r.discord_webhook || '',
            notifyOnOutage: Boolean(r.notify_on_outage),
            notifyOnRecovery: Boolean(r.notify_on_recovery),
            notifyOnSslExpiry: Boolean(r.notify_on_ssl_expiry),
            sslAlertMilestones: typeof r.ssl_alert_milestones === 'string'
                ? JSON.parse(r.ssl_alert_milestones)
                : (r.ssl_alert_milestones || [30, 14, 7, 1]),
        };
    }
    async updateNotificationSettings(userId, updates) {
        const current = await this.getNotificationSettings(userId);
        const updated = { ...current, ...updates };
        await query(`INSERT INTO notification_settings
       (user_id, email_alerts, alert_email, slack_webhook, discord_webhook, notify_on_outage, notify_on_recovery, notify_on_ssl_expiry, ssl_alert_milestones)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id) DO UPDATE SET
         email_alerts = EXCLUDED.email_alerts,
         alert_email = EXCLUDED.alert_email,
         slack_webhook = EXCLUDED.slack_webhook,
         discord_webhook = EXCLUDED.discord_webhook,
         notify_on_outage = EXCLUDED.notify_on_outage,
         notify_on_recovery = EXCLUDED.notify_on_recovery,
         notify_on_ssl_expiry = EXCLUDED.notify_on_ssl_expiry,
         ssl_alert_milestones = EXCLUDED.ssl_alert_milestones`, [
            userId,
            updated.emailAlerts,
            updated.alertEmail,
            updated.slackWebhook,
            updated.discordWebhook,
            updated.notifyOnOutage,
            updated.notifyOnRecovery,
            updated.notifyOnSslExpiry,
            JSON.stringify(updated.sslAlertMilestones),
        ]);
        return updated;
    }
}
export const notificationRepository = new NotificationRepository();
