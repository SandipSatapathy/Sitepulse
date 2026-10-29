import { Router } from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireStrictAuth } from '../auth/index.js';
import { notificationService } from '../services/notificationService.js';
export const saasRouter = Router();
/**
 * GET /api/user/profile
 * Returns active tenant details, subscribed plan, and quota consumption.
 */
saasRouter.get('/user/profile', requireAuth, async (req, res) => {
    const profile = await db.getUserProfile(req.user.id);
    res.json(profile);
});
/**
 * POST /api/user/plan
 * Plan modification endpoint with authentication guard (SEC-04).
 */
saasRouter.post('/user/plan', requireStrictAuth, async (req, res) => {
    const { planId, billingCycle = 'monthly' } = req.body;
    const userId = req.user.id;
    if (!['free', 'starter', 'pro', 'agency'].includes(planId)) {
        res.status(400).json({ error: 'Invalid plan selected.' });
        return;
    }
    // Paid tier upgrades must go through Stripe Checkout in production
    if (planId !== 'free' && process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEV_PLAN_SWITCH) {
        res.status(402).json({
            error: 'Direct plan upgrade requires payment checkout. Please initiate a checkout session via /api/stripe/create-checkout-session.',
            actionRequired: 'stripe_checkout',
        });
        return;
    }
    const updated = await db.updateUserPlan(userId, planId, billingCycle);
    res.json({
        success: true,
        message: `Plan updated to ${updated.planName}.`,
        profile: updated,
    });
});
/**
 * GET /api/incidents
 * List all historical and active downtime / SSL outage incidents for tenant.
 */
saasRouter.get('/incidents', requireAuth, async (req, res) => {
    const incidents = await db.getIncidents(req.user.id);
    res.json(incidents);
});
/**
 * GET /api/settings/notifications
 */
saasRouter.get('/settings/notifications', requireAuth, async (req, res) => {
    const settings = await db.getNotificationSettings(req.user.id);
    res.json(settings);
});
/**
 * POST /api/settings/notifications
 */
saasRouter.post('/settings/notifications', requireAuth, async (req, res) => {
    const updated = await db.updateNotificationSettings(req.user.id, req.body);
    res.json({ success: true, settings: updated });
});
/**
 * POST /api/settings/notifications/test-slack
 * Dispatches test ping to configured Slack incoming webhook.
 */
saasRouter.post('/settings/notifications/test-slack', requireAuth, async (req, res) => {
    const { webhookUrl } = req.body;
    const targetUrl = webhookUrl || (await db.getNotificationSettings(req.user.id)).slackWebhook;
    if (!targetUrl) {
        res.status(400).json({ error: 'No Slack webhook URL provided or configured.' });
        return;
    }
    const result = await notificationService.testWebhook(targetUrl, 'slack');
    if (result.success) {
        res.json({ success: true, message: result.message });
    }
    else {
        res.status(422).json({ success: false, error: result.message });
    }
});
/**
 * POST /api/settings/notifications/test-discord
 * Dispatches test ping to configured Discord incident webhook.
 */
saasRouter.post('/settings/notifications/test-discord', requireAuth, async (req, res) => {
    const { webhookUrl } = req.body;
    const targetUrl = webhookUrl || (await db.getNotificationSettings(req.user.id)).discordWebhook;
    if (!targetUrl) {
        res.status(400).json({ error: 'No Discord webhook URL provided or configured.' });
        return;
    }
    const result = await notificationService.testWebhook(targetUrl, 'discord');
    if (result.success) {
        res.json({ success: true, message: result.message });
    }
    else {
        res.status(422).json({ success: false, error: result.message });
    }
});
/**
 * POST /api/settings/notifications/test-email
 * Dispatches test alert email to recipient via Resend / SendGrid / local simulator.
 */
saasRouter.post('/settings/notifications/test-email', requireAuth, async (req, res) => {
    const { email } = req.body;
    const userSettings = await db.getNotificationSettings(req.user.id);
    const targetEmail = email || userSettings.alertEmail || req.user.email;
    if (!targetEmail) {
        res.status(400).json({ error: 'No recipient email address specified.' });
        return;
    }
    const result = await notificationService.testEmail(targetEmail);
    if (result.success) {
        res.json({ success: true, message: result.message });
    }
    else {
        res.status(422).json({ success: false, error: result.message });
    }
});
