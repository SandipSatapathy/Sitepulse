import { randomUUID } from 'node:crypto';
import { query } from '../client.js';
export class IncidentRepository {
    async getIncidents(userId) {
        const text = userId
            ? 'SELECT * FROM incidents WHERE user_id = $1 ORDER BY started_at DESC'
            : 'SELECT * FROM incidents ORDER BY started_at DESC';
        const params = userId ? [userId] : [];
        const res = await query(text, params);
        return res.rows.map(this.mapIncident);
    }
    async recordIncident(incident) {
        await query(`INSERT INTO incidents (id, user_id, project_id, project_name, type, status, status_code, cause, started_at, resolved_at, duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
            incident.id,
            incident.userId || 'user-default',
            incident.projectId,
            incident.projectName,
            incident.type,
            incident.status,
            incident.statusCode,
            incident.cause,
            incident.startedAt,
            incident.resolvedAt,
            incident.durationMinutes,
        ]);
    }
    async createIncident(data) {
        const incident = {
            id: 'inc-' + randomUUID().slice(0, 8),
            userId: data.userId || 'user-default',
            projectId: data.projectId,
            projectName: data.projectName,
            type: data.type,
            status: 'open',
            statusCode: data.statusCode ?? null,
            cause: data.cause,
            startedAt: new Date().toISOString(),
            resolvedAt: null,
            durationMinutes: null,
        };
        await this.recordIncident(incident);
        return incident;
    }
    async resolveOpenIncidents(projectId) {
        const res = await query(`SELECT * FROM incidents WHERE project_id = $1 AND status = 'open'`, [projectId]);
        const now = new Date();
        for (const inc of res.rows) {
            const started = new Date(inc.started_at).getTime();
            const durationMin = Math.max(1, Math.round((now.getTime() - started) / 60000));
            await query(`UPDATE incidents SET status = 'resolved', resolved_at = $1, duration_minutes = $2 WHERE id = $3`, [now.toISOString(), durationMin, inc.id]);
        }
    }
    mapIncident(r) {
        return {
            id: r.id,
            userId: r.user_id,
            projectId: r.project_id,
            projectName: r.project_name,
            type: r.type,
            status: r.status,
            statusCode: r.status_code,
            cause: r.cause,
            startedAt: r.started_at instanceof Date ? r.started_at.toISOString() : r.started_at,
            resolvedAt: r.resolved_at ? (r.resolved_at instanceof Date ? r.resolved_at.toISOString() : r.resolved_at) : null,
            durationMinutes: r.duration_minutes !== null ? Number(r.duration_minutes) : null,
        };
    }
}
export const incidentRepository = new IncidentRepository();
