import { randomUUID } from 'node:crypto';
import { query } from '../client.js';
import { ScanRecord, ReportShareRecord } from '../types.js';

export class ScanRepository {
  async saveScan(scan: ScanRecord): Promise<void> {
    await query(
      `INSERT INTO scans
       (id, user_id, project_id, requested_url, status, health_score, pages_checked, issue_count, duration_ms, failure_message, started_at, completed_at, audit_result, findings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         project_id = EXCLUDED.project_id,
         requested_url = EXCLUDED.requested_url,
         status = EXCLUDED.status,
         health_score = EXCLUDED.health_score,
         pages_checked = EXCLUDED.pages_checked,
         issue_count = EXCLUDED.issue_count,
         duration_ms = EXCLUDED.duration_ms,
         failure_message = EXCLUDED.failure_message,
         started_at = EXCLUDED.started_at,
         completed_at = EXCLUDED.completed_at,
         audit_result = EXCLUDED.audit_result,
         findings = EXCLUDED.findings`,
      [
        scan.id,
        scan.userId || null,
        scan.projectId || null,
        scan.requestedUrl,
        scan.status,
        scan.healthScore,
        scan.pagesChecked,
        scan.issueCount,
        scan.durationMs,
        scan.failureMessage || null,
        scan.startedAt,
        scan.completedAt,
        scan.auditResult ? JSON.stringify(scan.auditResult) : null,
        JSON.stringify(scan.findings || []),
      ]
    );
  }

  async getScan(id: string): Promise<ScanRecord | null> {
    const res = await query<any>('SELECT * FROM scans WHERE id = $1', [id]);
    const r = res.rows[0];
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      projectId: r.project_id,
      requestedUrl: r.requested_url,
      status: r.status,
      healthScore: r.health_score !== null ? Number(r.health_score) : null,
      pagesChecked: Number(r.pages_checked),
      issueCount: Number(r.issue_count),
      durationMs: r.duration_ms !== null ? Number(r.duration_ms) : null,
      failureMessage: r.failure_message || undefined,
      startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : r.started_at,
      completedAt: r.completed_at ? (r.completed_at instanceof Date ? r.completed_at.toISOString() : r.completed_at) : null,
      auditResult: typeof r.audit_result === 'string' ? JSON.parse(r.audit_result) : r.audit_result,
      findings: typeof r.findings === 'string' ? JSON.parse(r.findings) : (r.findings || []),
    };
  }

  async createReportShare(scanId: string): Promise<ReportShareRecord> {
    const token = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '').slice(0, 8);
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 86400000 * 30).toISOString();
    const createdAt = new Date().toISOString();

    await query(
      `INSERT INTO report_shares (id, scan_id, token, expires_at, revoked_at, created_at)
       VALUES ($1, $2, $3, $4, NULL, $5)`,
      [id, scanId, token, expiresAt, createdAt]
    );

    return {
      id,
      scanId,
      token,
      expiresAt,
      revokedAt: null,
      createdAt,
    };
  }

  async getReportShare(token: string): Promise<ReportShareRecord | null> {
    const res = await query<any>(
      'SELECT * FROM report_shares WHERE token = $1 AND revoked_at IS NULL',
      [token]
    );
    const r = res.rows[0];
    if (!r) return null;

    return {
      id: r.id,
      scanId: r.scan_id,
      token: r.token,
      expiresAt: r.expires_at ? (r.expires_at instanceof Date ? r.expires_at.toISOString() : r.expires_at) : null,
      revokedAt: r.revoked_at ? (r.revoked_at instanceof Date ? r.revoked_at.toISOString() : r.revoked_at) : null,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
    };
  }
}

export const scanRepository = new ScanRepository();

