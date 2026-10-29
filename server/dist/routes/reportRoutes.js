import { Router } from 'express';
import { db } from '../db/index.js';
export const reportRouter = Router();
/**
 * POST /api/reports/:scanId/share
 * Generates an unguessable shareable report link.
 */
reportRouter.post('/:scanId/share', async (req, res) => {
    const scan = await db.getScan(req.params.scanId);
    if (!scan) {
        res.status(404).json({ error: 'Scan not found.' });
        return;
    }
    const share = await db.createReportShare(scan.id);
    res.json({
        shareUrl: `/report/${share.token}`,
        token: share.token,
        expiresAt: share.expiresAt,
    });
});
/**
 * GET /api/reports/shared/:token
 * Public endpoint to fetch an unguessable shared report.
 */
reportRouter.get('/shared/:token', async (req, res) => {
    const share = await db.getReportShare(req.params.token);
    if (!share) {
        res.status(404).json({ error: 'This report link is invalid or has expired.' });
        return;
    }
    const scan = await db.getScan(share.scanId);
    if (!scan) {
        res.status(404).json({ error: 'Underlying scan record is no longer available.' });
        return;
    }
    res.json({
        scan,
        sharedAt: share.createdAt,
        expiresAt: share.expiresAt,
    });
});
