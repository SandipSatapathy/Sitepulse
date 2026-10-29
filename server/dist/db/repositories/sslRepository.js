import { query } from '../client.js';
export class SslRepository {
    async recordSslCertificate(projectId, cert) {
        await query(`INSERT INTO ssl_certificates
       (project_id, checked_at, hostname, is_valid, issuer, subject, valid_from, expires_at, days_until_expiry, is_expired, milestone_alert_due, failure_code, failure_detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (project_id) DO UPDATE SET
         checked_at = EXCLUDED.checked_at,
         hostname = EXCLUDED.hostname,
         is_valid = EXCLUDED.is_valid,
         issuer = EXCLUDED.issuer,
         subject = EXCLUDED.subject,
         valid_from = EXCLUDED.valid_from,
         expires_at = EXCLUDED.expires_at,
         days_until_expiry = EXCLUDED.days_until_expiry,
         is_expired = EXCLUDED.is_expired,
         milestone_alert_due = EXCLUDED.milestone_alert_due,
         failure_code = EXCLUDED.failure_code,
         failure_detail = EXCLUDED.failure_detail`, [
            projectId,
            cert.checkedAt,
            cert.hostname,
            cert.isValid,
            cert.issuer,
            cert.subject,
            cert.validFrom,
            cert.expiresAt,
            cert.daysUntilExpiry,
            cert.isExpired,
            cert.milestoneAlertDue,
            cert.failureCode || null,
            cert.failureDetail || null,
        ]);
    }
    async getSslCertificate(projectId) {
        const res = await query('SELECT * FROM ssl_certificates WHERE project_id = $1', [projectId]);
        const r = res.rows[0];
        if (!r)
            return null;
        return {
            checkedAt: r.checked_at instanceof Date ? r.checked_at.toISOString() : r.checked_at,
            hostname: r.hostname,
            isValid: Boolean(r.is_valid),
            issuer: r.issuer,
            subject: r.subject,
            validFrom: r.valid_from ? (r.valid_from instanceof Date ? r.valid_from.toISOString() : r.valid_from) : undefined,
            expiresAt: r.expires_at ? (r.expires_at instanceof Date ? r.expires_at.toISOString() : r.expires_at) : undefined,
            daysUntilExpiry: r.days_until_expiry !== null ? Number(r.days_until_expiry) : null,
            isExpired: Boolean(r.is_expired),
            milestoneAlertDue: r.milestone_alert_due !== null ? Number(r.milestone_alert_due) : null,
            failureCode: r.failure_code || undefined,
            failureDetail: r.failure_detail || undefined,
        };
    }
}
export const sslRepository = new SslRepository();
