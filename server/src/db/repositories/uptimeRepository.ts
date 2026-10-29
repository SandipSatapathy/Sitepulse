import { query } from '../client.js';
import { UptimeCheckResult } from '../../monitor/uptime.js';

export class UptimeRepository {
  async recordUptimeCheck(projectId: string, check: UptimeCheckResult): Promise<void> {
    await query(
      `INSERT INTO uptime_checks (project_id, checked_at, outcome, http_status, response_time_ms, failure_code, failure_detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        projectId,
        check.checkedAt,
        check.outcome,
        check.httpStatus,
        check.responseTimeMs,
        check.failureCode || null,
        check.failureDetail || null,
      ]
    );

    // Keep only last 100 checks per project to bound storage size
    await query(
      `DELETE FROM uptime_checks
       WHERE id IN (
         SELECT id FROM uptime_checks
         WHERE project_id = $1
         ORDER BY id DESC
         OFFSET 100
       )`,
      [projectId]
    );
  }

  async getUptimeHistory(projectId: string): Promise<UptimeCheckResult[]> {
    const res = await query<any>(
      `SELECT * FROM uptime_checks WHERE project_id = $1 ORDER BY checked_at ASC LIMIT 100`,
      [projectId]
    );

    return res.rows.map((r) => ({
      checkedAt: r.checked_at instanceof Date ? r.checked_at.toISOString() : r.checked_at,
      outcome: r.outcome,
      httpStatus: r.http_status,
      responseTimeMs: Number(r.response_time_ms),
      failureCode: r.failure_code || undefined,
      failureDetail: r.failure_detail || undefined,
    }));
  }
}

export const uptimeRepository = new UptimeRepository();

