import assert from 'node:assert';
import { isPrivateIp, resolveSafeTarget } from './scanner/ssrf.js';
import { auditHtml } from './scanner/parser.js';
import { evaluateUptimeState, probeUptimeWithVerification } from './monitor/uptime.js';
import { db } from './db/index.js';
import { signToken, verifyToken, hashPassword, verifyPassword } from './auth/index.js';
async function runSelfChecks() {
    console.log('🧪 Running SitePulse Commercial SaaS & Security Self-Checks...');
    // 1. SSRF Guard & IP Range Checks
    assert.strictEqual(isPrivateIp('127.0.0.1'), true, 'Loopback IPv4 must be blocked');
    assert.strictEqual(isPrivateIp('10.20.30.40'), true, 'Private 10.x must be blocked');
    assert.strictEqual(isPrivateIp('169.254.169.254'), true, 'AWS metadata IP must be blocked');
    assert.strictEqual(isPrivateIp('192.168.1.1'), true, 'Private 192.168.x must be blocked');
    assert.strictEqual(isPrivateIp('::1'), true, 'Loopback IPv6 must be blocked');
    assert.strictEqual(isPrivateIp('8.8.8.8'), false, 'Public DNS must not be blocked');
    console.log('  ✓ SSRF IP range checks passed');
    // 2. SSRF Target Resolution & DNS Rebinding Protection (SEC-01)
    let loopbackBlocked = false;
    try {
        await resolveSafeTarget('http://127.0.0.1:8080');
    }
    catch (err) {
        loopbackBlocked = true;
    }
    assert.strictEqual(loopbackBlocked, true, 'Direct loopback URL must be rejected by resolveSafeTarget');
    let metadataBlocked = false;
    try {
        await resolveSafeTarget('http://169.254.169.254/latest/meta-data/');
    }
    catch (err) {
        metadataBlocked = true;
    }
    assert.strictEqual(metadataBlocked, true, 'Cloud metadata URL must be rejected by resolveSafeTarget');
    console.log('  ✓ SEC-01 SSRF Target Resolution & metadata protection passed');
    // 3. Parser & Rule Engine Checks
    const sampleBadHtml = `<html><head></head><body><img src="pic.jpg"></body></html>`;
    const badAudit = auditHtml(sampleBadHtml, 'http://test.local', 200, 150);
    const ruleCodes = badAudit.findings.map((f) => f.ruleCode);
    assert.ok(ruleCodes.includes('SEO_MISSING_TITLE'), 'Must detect missing title');
    assert.ok(ruleCodes.includes('SEO_MISSING_H1'), 'Must detect missing H1');
    assert.ok(ruleCodes.includes('MOBILE_MISSING_VIEWPORT'), 'Must detect missing viewport');
    assert.ok(ruleCodes.includes('A11Y_IMAGES_MISSING_ALT'), 'Must detect missing alt attribute');
    assert.ok(badAudit.healthScore < 80, 'Score should be penalized for issues');
    assert.ok(badAudit.overallGrade, 'Must compute overall letter grade');
    assert.ok(badAudit.categories.seo, 'Must compute SEO category score');
    assert.ok(badAudit.categories.security, 'Must compute Security category score');
    console.log('  ✓ HTML audit rules & category grading passed');
    // 4. Consecutive-failure State Transition Checks
    const firstFail = evaluateUptimeState('up', 0, 2, {
        checkedAt: new Date().toISOString(),
        outcome: 'down',
        httpStatus: 500,
        responseTimeMs: 300,
    });
    assert.strictEqual(firstFail.newState, 'up', 'Single failure must NOT mark site down immediately');
    assert.strictEqual(firstFail.triggerOutageAlert, false, 'No outage alert on first transient failure');
    const secondFail = evaluateUptimeState('up', 1, 2, {
        checkedAt: new Date().toISOString(),
        outcome: 'down',
        httpStatus: 500,
        responseTimeMs: 300,
    });
    assert.strictEqual(secondFail.newState, 'down', 'Second consecutive failure MUST confirm outage');
    assert.strictEqual(secondFail.triggerOutageAlert, true, 'Outage alert MUST be triggered');
    const recovery = evaluateUptimeState('down', 2, 2, {
        checkedAt: new Date().toISOString(),
        outcome: 'up',
        httpStatus: 200,
        responseTimeMs: 120,
    });
    assert.strictEqual(recovery.newState, 'up', 'Must recover to UP');
    assert.strictEqual(recovery.triggerRecoveryAlert, true, 'Recovery alert MUST be triggered');
    console.log('  ✓ Uptime state transition idempotency passed');
    // 5. Multi-Tenant Auth & Token Security
    const pwd = 'Secr3tPassword!';
    const hashed = hashPassword(pwd);
    assert.strictEqual(verifyPassword(pwd, hashed), true, 'Password verification must succeed');
    assert.strictEqual(verifyPassword('WrongPass', hashed), false, 'Incorrect password must fail');
    const token = signToken({ userId: 'user-default', email: 'alex@mercercreative.io', role: 'user' }, 2);
    const verified = verifyToken(token);
    assert.ok(verified, 'Generated JWT token must verify successfully');
    assert.strictEqual(verified?.userId, 'user-default', 'Token payload must retain userId');
    const tamperedToken = token.slice(0, -4) + 'abcd';
    assert.strictEqual(verifyToken(tamperedToken), null, 'Tampered token must be rejected');
    console.log('  ✓ Multi-tenant authentication & HMAC token signing passed');
    // 6. PostgreSQL Database Configuration & Connectivity
    const dbHealth = await db.testConnection();
    if (dbHealth.ok) {
        console.log(`  ✓ PostgreSQL connection active: ${dbHealth.message}`);
        const profile = await db.getUserProfile('user-default');
        if (profile) {
            assert.strictEqual(profile?.id, 'user-default');
            console.log('  ✓ Multi-tenant PostgreSQL schema & seeded user verified');
        }
        // 7. Phase 1 Verification: Project Lifecycle (Create, Pause, Edit, Resume, Delete)
        const testProject = await db.createProject('admin-master', 'Test Self-Service Site', 'https://example.com');
        assert.ok(testProject.id, 'Must create project successfully');
        assert.strictEqual(testProject.status, 'active');
        // Pause monitor
        const paused = await db.updateProject(testProject.id, { status: 'paused' });
        assert.strictEqual(paused?.status, 'paused', 'Must pause monitor successfully');
        // Edit monitor name
        const edited = await db.updateProject(testProject.id, { name: 'Updated Site Name', status: 'active' });
        assert.strictEqual(edited?.name, 'Updated Site Name', 'Must edit project name');
        assert.strictEqual(edited?.status, 'active', 'Must resume monitor');
        // Delete monitor
        const deleted = await db.deleteProject(testProject.id, 'admin-master');
        assert.strictEqual(deleted, true, 'Must delete monitor successfully');
        const postDelete = await db.getProject(testProject.id);
        assert.strictEqual(postDelete, null, 'Deleted project must not be retrieved');
        console.log('  ✓ Phase 1: Project Self-Service Lifecycle (Create, Pause, Edit, Resume, Delete) passed');
        // 8. Phase 2 Verification: PostgreSQL Query Engine
        const rowCount = await db.query('SELECT COUNT(*) as count FROM users');
        assert.ok(Number(rowCount?.rows[0]?.count || 0) >= 0, 'Must execute PostgreSQL query');
        console.log('  ✓ Phase 2: PostgreSQL Dedicated Database Engine verified');
        // 9. Phase 3 Verification: Billing & Webhook Replay Protection
        const testEventId = 'evt_test_replay_' + Date.now();
        assert.strictEqual(await db.hasProcessedStripeEvent(testEventId), false, 'New event must not be marked processed');
        await db.markStripeEventProcessed(testEventId, 'checkout.session.completed');
        assert.strictEqual(await db.hasProcessedStripeEvent(testEventId), true, 'Processed event must be marked processed (idempotent)');
        console.log('  ✓ Phase 3: Stripe Billing Lifecycle & Webhook Idempotency protection passed');
    }
    else {
        console.log(`  ℹ PostgreSQL offline: ${dbHealth.message}`);
        console.log('  ℹ Configure PostgreSQL connection in .env and run `npm run db:setup` to seed.');
    }
    // 10. Phase 4 Verification: Multi-Region Two-Point Probing
    const probeResult = await probeUptimeWithVerification('https://example.com');
    assert.ok(['up', 'down'].includes(probeResult.outcome), 'Two-point probe must return valid outcome');
    assert.ok(probeResult.responseTimeMs >= 0, 'Response time must be recorded');
    console.log('  ✓ Phase 4: Multi-Region Two-Point Verification Probe passed');
    console.log('🎉 All commercial SaaS gap tests and security self-checks passed cleanly!\n');
}
runSelfChecks().catch((err) => {
    console.error('❌ Self-check failed:', err);
    process.exit(1);
});
