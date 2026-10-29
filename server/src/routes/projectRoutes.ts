import { Router, Response } from 'express';
import { db } from '../db/index.js';
import { probeUptime, evaluateUptimeState } from '../monitor/uptime.js';
import { probeSslCertificate } from '../monitor/ssl.js';
import { resolveSafeTarget } from '../scanner/ssrf.js';
import { requireAuth, AuthenticatedRequest } from '../auth/index.js';

export const projectRouter = Router();

/**
 * GET /api/projects
 * List all monitored projects for authenticated tenant with condensed enrichment (Ponytail optimization).
 */
projectRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const projects = await db.getProjects(userId);

  const enriched = await Promise.all(
    projects.map(async (p) => {
      const [history, ssl] = await Promise.all([db.getUptimeHistory(p.id), db.getSslCertificate(p.id)]);
      const total = history.length;
      const upCount = history.filter((c) => c.outcome === 'up').length;
      const latestCheck = history[history.length - 1];

      return {
        ...p,
        uptimePercentage: total > 0 ? Number(((upCount / total) * 100).toFixed(2)) : 100,
        latestResponseTimeMs: latestCheck?.responseTimeMs ?? null,
        sslDaysUntilExpiry: ssl?.daysUntilExpiry ?? null,
        sslValid: ssl?.isValid ?? null,
        sslIssuer: ssl?.issuer ?? null,
        recentHistory: history.slice(-12),
      };
    })
  );

  res.json(enriched);
});

/**
 * POST /api/projects
 * Add a new public website with strict server-side plan quota enforcement (SEC-03).
 */
projectRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const { name, baseUrl } = req.body;

  if (!baseUrl || typeof baseUrl !== 'string') {
    res.status(400).json({ error: 'A valid website URL is required.' });
    return;
  }

  let normalizedUrl = baseUrl.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    await resolveSafeTarget(normalizedUrl);
  } catch (err: any) {
    res.status(400).json({ error: `Cannot monitor URL: ${err.message}` });
    return;
  }

  // Enforce server-side SaaS plan quota (SEC-03)
  const profile = await db.getUserProfile(userId);
  const maxSites = profile?.maxSites ?? 1;
  const planName = profile?.planName ?? 'Free Hobby';
  const currentProjects = await db.getProjects(userId);
  if (currentProjects.length >= maxSites) {
    res.status(403).json({
      error: `Plan quota exceeded: Your active plan (${planName}) permits a maximum of ${maxSites} monitored websites. Upgrade to Pro or Agency to add more.`,
    });
    return;
  }

  const projectName = name?.trim() || new URL(normalizedUrl).hostname;
  const project = await db.createProject(userId, projectName, normalizedUrl);

  // Proactively run initial uptime check & SSL check in parallel
  const [uptimeResult, sslResult] = await Promise.all([
    probeUptime(normalizedUrl),
    normalizedUrl.startsWith('https://') ? probeSslCertificate(normalizedUrl) : null,
  ]);

  await db.recordUptimeCheck(project.id, uptimeResult);
  if (sslResult) await db.recordSslCertificate(project.id, sslResult);

  await db.updateProject(project.id, {
    lastUptimeState: uptimeResult.outcome,
    lastUptimeCheckAt: uptimeResult.checkedAt,
  });

  res.status(201).json(project);
});

/**
 * GET /api/projects/:id
 * Retrieve detailed project telemetry scoped to authenticated tenant.
 */
projectRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const project = await db.getProject(req.params.id, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const [history, ssl] = await Promise.all([
    db.getUptimeHistory(project.id),
    db.getSslCertificate(project.id),
  ]);

  const total = history.length;
  const upCount = history.filter((c) => c.outcome === 'up').length;
  const avgLatency =
    total > 0 ? Math.round(history.reduce((acc, c) => acc + c.responseTimeMs, 0) / total) : 0;

  res.json({
    project,
    uptimePercentage: total > 0 ? Number(((upCount / total) * 100).toFixed(2)) : 100,
    avgLatencyMs: avgLatency,
    history,
    ssl,
  });
});

/**
 * POST /api/projects/:id/check
 * Trigger an instant uptime & SSL check for the project.
 */
projectRouter.post('/:id/check', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const project = await db.getProject(req.params.id, req.user!.id);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const [uptimeResult, sslResult] = await Promise.all([
    probeUptime(project.baseUrl),
    project.baseUrl.startsWith('https://') ? probeSslCertificate(project.baseUrl) : null,
  ]);

  const stateTransition = evaluateUptimeState(
    project.lastUptimeState,
    project.consecutiveFailures,
    project.consecutiveFailureThreshold,
    uptimeResult
  );

  await db.recordUptimeCheck(project.id, uptimeResult);
  if (sslResult) await db.recordSslCertificate(project.id, sslResult);

  await db.updateProject(project.id, {
    lastUptimeState: stateTransition.newState,
    consecutiveFailures: stateTransition.newConsecutiveFailures,
    lastUptimeCheckAt: uptimeResult.checkedAt,
  });

  res.json({
    outcome: uptimeResult.outcome,
    httpStatus: uptimeResult.httpStatus,
    responseTimeMs: uptimeResult.responseTimeMs,
    ssl: sslResult,
    outageAlertTriggered: stateTransition.triggerOutageAlert,
    recoveryAlertTriggered: stateTransition.triggerRecoveryAlert,
  });
});

/**
 * PATCH /api/projects/:id
 * Update project details (name, baseUrl, status, consecutiveFailureThreshold).
 */
projectRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const project = await db.getProject(req.params.id, userId);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { name, baseUrl, status, consecutiveFailureThreshold } = req.body;
  const updates: Partial<typeof project> = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'Project name cannot be empty.' });
      return;
    }
    updates.name = name.trim();
  }

  if (baseUrl !== undefined) {
    let normalized = String(baseUrl).trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    try {
      await resolveSafeTarget(normalized);
      updates.baseUrl = normalized;
    } catch (err: any) {
      res.status(400).json({ error: `Cannot monitor URL: ${err.message}` });
      return;
    }
  }

  if (status !== undefined) {
    if (status !== 'active' && status !== 'paused') {
      res.status(400).json({ error: 'Status must be active or paused.' });
      return;
    }
    updates.status = status;
    updates.uptimeEnabled = status === 'active';
  }

  if (consecutiveFailureThreshold !== undefined) {
    const thresh = parseInt(String(consecutiveFailureThreshold), 10);
    if (!isNaN(thresh) && thresh >= 1 && thresh <= 10) {
      updates.consecutiveFailureThreshold = thresh;
    }
  }

  const updated = await db.updateProject(project.id, updates);
  res.json({ success: true, project: updated });
});

projectRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const project = await db.getProject(req.params.id, userId);
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  const { name, baseUrl, status, consecutiveFailureThreshold } = req.body;
  const updates: Partial<typeof project> = {};

  if (name !== undefined) updates.name = String(name).trim();
  if (baseUrl !== undefined) {
    let normalized = String(baseUrl).trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    try {
      await resolveSafeTarget(normalized);
      updates.baseUrl = normalized;
    } catch (err: any) {
      res.status(400).json({ error: `Cannot monitor URL: ${err.message}` });
      return;
    }
  }
  if (status !== undefined && (status === 'active' || status === 'paused')) {
    updates.status = status;
    updates.uptimeEnabled = status === 'active';
  }
  if (consecutiveFailureThreshold !== undefined) {
    const thresh = parseInt(String(consecutiveFailureThreshold), 10);
    if (!isNaN(thresh) && thresh >= 1 && thresh <= 10) {
      updates.consecutiveFailureThreshold = thresh;
    }
  }

  const updated = await db.updateProject(project.id, updates);
  res.json({ success: true, project: updated });
});

/**
 * DELETE /api/projects/:id
 * Delete monitored project scoped to tenant.
 */
projectRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const deleted = await db.deleteProject(req.params.id, req.user!.id);
  if (!deleted) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }

  res.json({ success: true, message: 'Project removed.' });
});
