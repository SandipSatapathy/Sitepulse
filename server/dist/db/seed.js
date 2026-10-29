import { fileURLToPath } from 'node:url';
import { pool, testConnection } from './client.js';
import { hashPassword } from '../auth/index.js';
export async function runSeed() {
    console.log('🌱 [Seeder] Connecting to PostgreSQL to seed initial records...');
    const check = await testConnection();
    if (!check.ok) {
        console.error('❌ [Seeder Failed]:', check.message);
        process.exit(1);
    }
    const client = await pool.connect();
    const now = Date.now();
    try {
        await client.query('BEGIN');
        // 1. Seed Master Superadmin Account
        const superadminCheck = await client.query('SELECT id FROM users WHERE email = $1', ['admin@sitepulse.dev']);
        if (superadminCheck.rowCount === 0) {
            await client.query(`INSERT INTO users (id, name, email, password_hash, role, status, plan_id, plan_name, max_sites, uptime_interval_minutes, billing_cycle, created_at)
         VALUES ($1, $2, $3, $4, 'superadmin', 'active', 'agency', 'Agency Scale Tier (50 Sites)', 50, 1, 'annual', $5)`, [
                'admin-master',
                'SitePulse Superadmin',
                'admin@sitepulse.dev',
                hashPassword('Admin123!'),
                new Date(now - 86400000 * 60).toISOString(),
            ]);
            await client.query(`INSERT INTO notification_settings (user_id, email_alerts, alert_email, slack_webhook, discord_webhook, notify_on_outage, notify_on_recovery, notify_on_ssl_expiry, ssl_alert_milestones)
         VALUES ($1, true, $2, '', '', true, true, true, $3)`, ['admin-master', 'admin@sitepulse.dev', JSON.stringify([30, 14, 7, 1])]);
            console.log('  ✓ Seeded Superadmin: admin@sitepulse.dev (Password: Admin123!)');
        }
        else {
            console.log('  ℹ Superadmin already exists.');
        }
        // 2. Seed Default Demo Customer Account
        const demoUserCheck = await client.query('SELECT id FROM users WHERE email = $1', ['alex@mercercreative.io']);
        if (demoUserCheck.rowCount === 0) {
            const defaultUserId = 'user-default';
            await client.query(`INSERT INTO users (id, name, email, password_hash, role, status, plan_id, plan_name, max_sites, uptime_interval_minutes, billing_cycle, created_at)
         VALUES ($1, $2, $3, $4, 'user', 'active', 'starter', 'Starter Pro (3 Sites)', 3, 15, 'monthly', $5)`, [
                defaultUserId,
                'Alex Mercer (Agency Owner)',
                'alex@mercercreative.io',
                hashPassword('Password123!'),
                new Date(now - 86400000 * 30).toISOString(),
            ]);
            await client.query(`INSERT INTO notification_settings (user_id, email_alerts, alert_email, slack_webhook, discord_webhook, notify_on_outage, notify_on_recovery, notify_on_ssl_expiry, ssl_alert_milestones)
         VALUES ($1, true, $2, '', '', true, true, true, $3)`, [defaultUserId, 'alex@mercercreative.io', JSON.stringify([30, 14, 7, 1])]);
            // Seed 2 demo projects for demo account
            const demo1 = 'proj-demo-1';
            const demo2 = 'proj-demo-2';
            await client.query(`INSERT INTO projects (id, user_id, name, base_url, status, uptime_enabled, uptime_interval_minutes, consecutive_failure_threshold, consecutive_failures, last_uptime_state, last_uptime_check_at, last_scan_at, created_at)
         VALUES
         ($1, $2, 'Stripe Payment Gateway (Demo)', 'https://stripe.com', 'active', true, 5, 2, 0, 'up', $3, $4, $5),
         ($6, $2, 'Wikipedia Knowledge Portal', 'https://wikipedia.org', 'active', true, 5, 2, 0, 'up', $3, $7, $8)`, [
                demo1,
                defaultUserId,
                new Date(now).toISOString(),
                new Date(now - 3600000).toISOString(),
                new Date(now - 86400000 * 7).toISOString(),
                demo2,
                new Date(now - 7200000).toISOString(),
                new Date(now - 86400000 * 14).toISOString(),
            ]);
            // Seed 12 hourly check telemetry points per demo monitor
            for (let i = 12; i >= 0; i--) {
                const time = new Date(now - i * 3600000).toISOString();
                await client.query(`INSERT INTO uptime_checks (project_id, checked_at, outcome, http_status, response_time_ms)
           VALUES ($1, $2, 'up', 200, $3), ($4, $2, 'up', 200, $5)`, [demo1, time, 90 + ((i * 7) % 35), demo2, 65 + ((i * 5) % 25)]);
            }
            // Seed SSL certificates
            await client.query(`INSERT INTO ssl_certificates (project_id, checked_at, hostname, is_valid, issuer, subject, valid_from, expires_at, days_until_expiry, is_expired, milestone_alert_due)
         VALUES
         ($1, $2, 'stripe.com', true, 'DigiCert Global Root G2', '*.stripe.com', $3, $4, 18, false, NULL),
         ($5, $2, 'wikipedia.org', true, 'Let''s Encrypt Authority X3', '*.wikipedia.org', $6, $7, 50, false, NULL)`, [
                demo1,
                new Date(now).toISOString(),
                new Date(now - 86400000 * 90).toISOString(),
                new Date(now + 86400000 * 18).toISOString(),
                demo2,
                new Date(now - 86400000 * 40).toISOString(),
                new Date(now + 86400000 * 50).toISOString(),
            ]);
            // Seed historical incident
            await client.query(`INSERT INTO incidents (id, user_id, project_id, project_name, type, status, status_code, cause, started_at, resolved_at, duration_minutes)
         VALUES ($1, $2, $3, 'Stripe Payment Gateway (Demo)', 'outage', 'resolved', 504, 'Gateway Timeout (Origin unreachable)', $4, $5, 7)`, [
                'inc-01',
                defaultUserId,
                demo1,
                new Date(now - 86400000 * 2 - 3600000).toISOString(),
                new Date(now - 86400000 * 2 - 3600000 + 420000).toISOString(),
            ]);
            console.log('  ✓ Seeded Demo Customer: alex@mercercreative.io (Password: Password123!) with 2 demo monitors & telemetry');
        }
        else {
            console.log('  ℹ Demo user already exists.');
        }
        await client.query('COMMIT');
        console.log('✅ [Seeder Success] PostgreSQL database successfully populated.');
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ [Seeder Error]:', err.message);
        process.exit(1);
    }
    finally {
        client.release();
    }
}
// Run if called directly from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    runSeed().then(() => {
        console.log('🏁 Seeder process complete.');
        process.exit(0);
    });
}
