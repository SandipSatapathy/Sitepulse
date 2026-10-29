import { randomUUID } from 'node:crypto';
import { query } from '../client.js';
import { PLANS_META } from '../types.js';
export class UserRepository {
    async getUserById(id) {
        const res = await query('SELECT * FROM users WHERE id = $1', [id]);
        const row = res.rows[0];
        if (!row)
            return null;
        return this.mapUser(row);
    }
    async getUserByEmail(email) {
        const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
        const row = res.rows[0];
        if (!row)
            return null;
        return this.mapUser(row);
    }
    async createUser(data) {
        const id = randomUUID();
        const now = new Date().toISOString();
        const plan = PLANS_META['free'];
        await query(`INSERT INTO users (id, name, email, password_hash, role, status, plan_id, plan_name, max_sites, uptime_interval_minutes, billing_cycle, created_at)
       VALUES ($1, $2, $3, $4, $5, 'active', 'free', $6, $7, $8, 'monthly', $9)`, [id, data.name, data.email, data.passwordHash, data.role || 'user', plan.name, plan.maxSites, plan.interval, now]);
        await query(`INSERT INTO notification_settings (user_id, email_alerts, alert_email, slack_webhook, discord_webhook, notify_on_outage, notify_on_recovery, notify_on_ssl_expiry, ssl_alert_milestones)
       VALUES ($1, true, $2, '', '', true, true, true, $3)`, [id, data.email, JSON.stringify([30, 14, 7, 1])]);
        return (await this.getUserById(id));
    }
    async updateLastLogin(userId) {
        await query('UPDATE users SET last_login_at = $1 WHERE id = $2', [new Date().toISOString(), userId]);
    }
    async getUserProfile(userId) {
        const user = await this.getUserById(userId);
        if (!user)
            return null;
        const countRes = await query('SELECT COUNT(*) as count FROM projects WHERE user_id = $1', [user.id]);
        const sitesCount = parseInt(countRes.rows[0]?.count || '0', 10);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            planId: user.planId,
            planName: user.planName,
            maxSites: user.maxSites,
            uptimeIntervalMinutes: user.uptimeIntervalMinutes,
            billingCycle: user.billingCycle,
            stripeCustomerId: user.stripeCustomerId,
            currentSitesCount: sitesCount,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
        };
    }
    async updateUserPlan(userId, planId, cycle = 'monthly') {
        const plan = PLANS_META[planId] || PLANS_META.free;
        await query(`UPDATE users
       SET plan_id = $1, plan_name = $2, max_sites = $3, uptime_interval_minutes = $4, billing_cycle = $5
       WHERE id = $6`, [planId, plan.name, plan.maxSites, plan.interval, cycle, userId]);
        await query('UPDATE projects SET uptime_interval_minutes = $1 WHERE user_id = $2', [plan.interval, userId]);
        return (await this.getUserProfile(userId));
    }
    async updateStripeCustomerId(userId, customerId) {
        await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, userId]);
    }
    async getUserByStripeCustomerId(customerId) {
        const res = await query('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]);
        const row = res.rows[0];
        if (!row)
            return null;
        return this.mapUser(row);
    }
    async getAllUsers() {
        const res = await query(`
      SELECT u.*, COUNT(p.id) as projects_count
      FROM users u
      LEFT JOIN projects p ON u.id = p.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
        return res.rows.map((r) => {
            const pCount = parseInt(r.projects_count || '0', 10);
            return {
                id: r.id,
                name: r.name,
                email: r.email,
                role: r.role || 'user',
                status: r.status || 'active',
                planId: r.plan_id,
                planName: r.plan_name,
                maxSites: Number(r.max_sites),
                uptimeIntervalMinutes: Number(r.uptime_interval_minutes),
                billingCycle: r.billing_cycle,
                stripeCustomerId: r.stripe_customer_id,
                currentSitesCount: pCount,
                projectsCount: pCount,
                createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
                lastLoginAt: r.last_login_at ? (r.last_login_at instanceof Date ? r.last_login_at.toISOString() : r.last_login_at) : null,
            };
        });
    }
    async updateUserStatus(userId, status) {
        await query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
        return true;
    }
    async updateUserRole(userId, role) {
        await query('UPDATE users SET role = $1 WHERE id = $2', [role, userId]);
        return true;
    }
    async deleteUser(userId) {
        await query('DELETE FROM users WHERE id = $1', [userId]);
        return true;
    }
    async getPlatformMetrics() {
        const [uRes, auRes, mRes, amRes, cRes, iRes, sRes, pRes] = await Promise.all([
            query('SELECT COUNT(*) as count FROM users'),
            query('SELECT COUNT(*) as count FROM users WHERE status = $1', ['active']),
            query('SELECT COUNT(*) as count FROM projects'),
            query('SELECT COUNT(*) as count FROM projects WHERE status = $1', ['active']),
            query('SELECT COUNT(*) as count FROM uptime_checks'),
            query('SELECT COUNT(*) as count FROM incidents'),
            query('SELECT COUNT(*) as count FROM scans'),
            query('SELECT plan_id, COUNT(*) as count FROM users GROUP BY plan_id'),
        ]);
        const planBreakdown = { free: 0, starter: 0, pro: 0, agency: 0 };
        let estimatedMRR = 0;
        for (const r of pRes.rows) {
            const count = parseInt(r.count, 10);
            planBreakdown[r.plan_id] = count;
            const meta = PLANS_META[r.plan_id];
            if (meta)
                estimatedMRR += meta.priceMonthly * count;
        }
        return {
            totalUsers: parseInt(uRes.rows[0]?.count || '0', 10),
            activeUsers: parseInt(auRes.rows[0]?.count || '0', 10),
            totalMonitors: parseInt(mRes.rows[0]?.count || '0', 10),
            activeMonitors: parseInt(amRes.rows[0]?.count || '0', 10),
            totalChecks: parseInt(cRes.rows[0]?.count || '0', 10),
            totalIncidents: parseInt(iRes.rows[0]?.count || '0', 10),
            totalScans: parseInt(sRes.rows[0]?.count || '0', 10),
            estimatedMRR,
            planBreakdown,
        };
    }
    mapUser(row) {
        return {
            id: row.id,
            name: row.name,
            email: row.email,
            passwordHash: row.password_hash,
            role: row.role || 'user',
            status: row.status || 'active',
            planId: row.plan_id,
            planName: row.plan_name,
            maxSites: Number(row.max_sites),
            uptimeIntervalMinutes: Number(row.uptime_interval_minutes),
            billingCycle: row.billing_cycle,
            stripeCustomerId: row.stripe_customer_id,
            createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
            lastLoginAt: row.last_login_at ? (row.last_login_at instanceof Date ? row.last_login_at.toISOString() : row.last_login_at) : null,
        };
    }
}
export const userRepository = new UserRepository();
