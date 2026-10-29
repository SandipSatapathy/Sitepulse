import { Router, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { safeFetch } from '../scanner/fetcher.js';
import { auditHtml, checkSampleBrokenLinks } from '../scanner/parser.js';
import { db, ScanRecord } from '../db/index.js';
import { verifyToken } from '../auth/index.js';

export const scanRouter = Router();

// In-memory sliding-window IP rate limiter: max 10 scans per 60s per client IP (SEC-05)
const ipRequestHistory = new Map<string, number[]>();
const MAX_SCANS_PER_WINDOW = 10;
const WINDOW_MS = 60 * 1000;

// Periodic cleanup of stale rate-limit history to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of ipRequestHistory.entries()) {
    const valid = timestamps.filter((t) => now - t < WINDOW_MS);
    if (valid.length === 0) {
      ipRequestHistory.delete(ip);
    } else {
      ipRequestHistory.set(ip, valid);
    }
  }
}, 5 * 60 * 1000).unref();

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const timestamps = (ipRequestHistory.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_SCANS_PER_WINDOW) {
    const oldest = timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }
  timestamps.push(now);
  ipRequestHistory.set(ip, timestamps);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * POST /api/scan
 * Runs a bounded, SSRF-safe public website audit with strict IP rate limiting (SEC-05).
 */
scanRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown';
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds));
    res.status(429).json({
      error: `Rate limit exceeded: Maximum ${MAX_SCANS_PER_WINDOW} scans per minute permitted to prevent network abuse. Please retry in ${rateLimit.retryAfterSeconds} seconds.`,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return;
  }

  const { url, projectId } = req.body;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'A valid URL is required.' });
    return;
  }

  // Pre-normalize URL
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // Check optional auth to link scan to user
  let userId: string | null = null;
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const verified = verifyToken(authHeader.slice(7).trim());
    if (verified) userId = verified.userId;
  }

  const scanId = randomUUID();
  const scanRecord: ScanRecord = {
    id: scanId,
    userId: userId || null,
    projectId: projectId || null,
    requestedUrl: targetUrl,
    status: 'running',
    healthScore: null,
    pagesChecked: 1,
    issueCount: 0,
    durationMs: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    findings: [],
  };

  await db.saveScan(scanRecord);

  try {
    const fetchResult = await safeFetch(targetUrl);
    const brokenLinks = await checkSampleBrokenLinks(fetchResult.finalUrl, fetchResult.body);
    const auditResult = auditHtml(
      fetchResult.body,
      fetchResult.finalUrl,
      fetchResult.statusCode,
      fetchResult.responseTimeMs,
      fetchResult.headers,
      brokenLinks
    );

    scanRecord.status = 'completed';
    scanRecord.healthScore = auditResult.healthScore;
    scanRecord.issueCount = auditResult.findings.length;
    scanRecord.durationMs = auditResult.durationMs;
    scanRecord.completedAt = new Date().toISOString();
    scanRecord.auditResult = auditResult;
    scanRecord.findings = auditResult.findings;

    await db.saveScan(scanRecord);

    if (projectId) {
      await db.updateProject(projectId, { lastScanAt: scanRecord.completedAt });
    }

    res.json({
      scanId: scanRecord.id,
      status: scanRecord.status,
      auditResult,
    });
  } catch (err: any) {
    scanRecord.status = 'failed';
    scanRecord.failureMessage = err.message || 'Scan failed';
    scanRecord.completedAt = new Date().toISOString();
    await db.saveScan(scanRecord);

    res.status(422).json({
      scanId: scanRecord.id,
      status: 'failed',
      error: err.message || 'Scan execution encountered an error.',
    });
  }
});

/**
 * GET /api/scan/:id
 * Retrieve completed scan report.
 */
scanRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const scan = await db.getScan(req.params.id);
  if (!scan) {
    res.status(404).json({ error: 'Scan not found.' });
    return;
  }

  res.json(scan);
});
