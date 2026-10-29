import { Router, Response } from 'express';
import { db, PLANS_META } from '../db/index.js';
import { requireSuperadmin, AuthenticatedRequest } from '../auth/index.js';

export const adminRouter = Router();

// Apply superadmin authorization guard to ALL routes in this router
adminRouter.use(requireSuperadmin);

/**
 * GET /api/admin/overview
 * Platform-wide telemetry, KPIs, active counts, and revenue.
 */
adminRouter.get('/overview', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const metrics = await db.getPlatformMetrics();
  res.json({
    metrics,
    plans: PLANS_META,
    serverTime: new Date().toISOString(),
  });
});

/**
 * GET /api/admin/users
 * List all registered tenant accounts with quota and domain counts.
 */
adminRouter.get('/users', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  const users = await db.getAllUsers();
  res.json(users);
});

/**
 * PATCH /api/admin/users/:id/plan
 * Superadmin override to modify any user's subscription tier.
 */
adminRouter.patch('/users/:id/plan', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { planId, billingCycle = 'monthly' } = req.body;
  const targetUserId = req.params.id;

  if (!['free', 'starter', 'pro', 'agency'].includes(planId)) {
    res.status(400).json({ error: 'Invalid plan selected.' });
    return;
  }

  const user = await db.getUserById(targetUserId);
  if (!user) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  const updated = await db.updateUserPlan(targetUserId, planId, billingCycle);
  res.json({
    success: true,
    message: `User ${user.email} plan changed to ${updated.planName}.`,
    user: updated,
  });
});

/**
 * PATCH /api/admin/users/:id/status
 * Superadmin action to suspend or activate a user account.
 */
adminRouter.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status } = req.body;
  const targetUserId = req.params.id;

  if (!['active', 'suspended'].includes(status)) {
    res.status(400).json({ error: 'Status must be active or suspended.' });
    return;
  }

  // Prevent superadmin from suspending self
  if (req.user!.id === targetUserId && status === 'suspended') {
    res.status(400).json({ error: 'Cannot suspend your own superadmin account.' });
    return;
  }

  const success = await db.updateUserStatus(targetUserId, status);
  if (!success) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ success: true, message: `User account status set to ${status}.` });
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a tenant and all associated monitoring data.
 */
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const targetUserId = req.params.id;

  if (req.user!.id === targetUserId) {
    res.status(400).json({ error: 'Cannot delete your own superadmin account.' });
    return;
  }

  const success = await db.deleteUser(targetUserId);
  if (!success) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  res.json({ success: true, message: 'User account and associated telemetry permanently deleted.' });
});

