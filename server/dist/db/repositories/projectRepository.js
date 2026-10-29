import { randomUUID } from 'node:crypto';
import { query } from '../client.js';
import { userRepository } from './userRepository.js';
export class ProjectRepository {
    async getProjects(userId) {
        const text = userId
            ? 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC'
            : 'SELECT * FROM projects ORDER BY created_at DESC';
        const params = userId ? [userId] : [];
        const res = await query(text, params);
        return res.rows.map(this.mapProject);
    }
    async getProject(id, userId) {
        const text = userId
            ? 'SELECT * FROM projects WHERE id = $1 AND user_id = $2'
            : 'SELECT * FROM projects WHERE id = $1';
        const params = userId ? [id, userId] : [id];
        const res = await query(text, params);
        const row = res.rows[0];
        if (!row)
            return null;
        return this.mapProject(row);
    }
    async createProject(userId, name, baseUrl) {
        const id = randomUUID();
        const user = await userRepository.getUserProfile(userId);
        const interval = user?.uptimeIntervalMinutes || 15;
        const now = new Date().toISOString();
        await query(`INSERT INTO projects (id, user_id, name, base_url, status, uptime_enabled, uptime_interval_minutes, consecutive_failure_threshold, consecutive_failures, last_uptime_state, last_uptime_check_at, last_scan_at, created_at)
       VALUES ($1, $2, $3, $4, 'active', true, $5, 2, 0, 'up', NULL, NULL, $6)`, [id, userId, name, baseUrl, interval, now]);
        return (await this.getProject(id));
    }
    async updateProject(id, updates) {
        const existing = await this.getProject(id);
        if (!existing)
            return null;
        const updated = { ...existing, ...updates };
        await query(`UPDATE projects
       SET name = $1, base_url = $2, status = $3, uptime_enabled = $4, uptime_interval_minutes = $5,
           consecutive_failure_threshold = $6, consecutive_failures = $7, last_uptime_state = $8,
           last_uptime_check_at = $9, last_scan_at = $10
       WHERE id = $11`, [
            updated.name,
            updated.baseUrl,
            updated.status,
            updated.uptimeEnabled,
            updated.uptimeIntervalMinutes,
            updated.consecutiveFailureThreshold,
            updated.consecutiveFailures,
            updated.lastUptimeState,
            updated.lastUptimeCheckAt,
            updated.lastScanAt,
            id,
        ]);
        return updated;
    }
    async deleteProject(id, userId) {
        const check = await this.getProject(id, userId);
        if (!check)
            return false;
        await query('DELETE FROM projects WHERE id = $1', [id]);
        return true;
    }
    mapProject(r) {
        return {
            id: r.id,
            userId: r.user_id,
            name: r.name,
            baseUrl: r.base_url,
            status: r.status,
            uptimeEnabled: Boolean(r.uptime_enabled),
            uptimeIntervalMinutes: Number(r.uptime_interval_minutes),
            consecutiveFailureThreshold: Number(r.consecutive_failure_threshold),
            consecutiveFailures: Number(r.consecutive_failures),
            lastUptimeState: r.last_uptime_state,
            lastUptimeCheckAt: r.last_uptime_check_at ? (r.last_uptime_check_at instanceof Date ? r.last_uptime_check_at.toISOString() : r.last_uptime_check_at) : null,
            lastScanAt: r.last_scan_at ? (r.last_scan_at instanceof Date ? r.last_scan_at.toISOString() : r.last_scan_at) : null,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        };
    }
}
export const projectRepository = new ProjectRepository();
