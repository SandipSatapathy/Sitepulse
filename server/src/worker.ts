import { db } from './db/index.js';
import { probeUptimeWithVerification, evaluateUptimeState } from './monitor/uptime.js';
import { probeSslCertificate } from './monitor/ssl.js';
import { notificationService } from './services/notificationService.js';

const BATCH_SIZE = 5;
const LOOP_INTERVAL_MS = 60 * 1000;

/**
 * SitePulse Autonomous Fleet Monitoring Worker
 * Runs dedicated, concurrent probe batches isolated from the Express web server.
 */
export async function runMonitoringCycle(): Promise<void> {
  const cycleStart = Date.now();
  try {
    const projects = await db.getProjects();
    const activeProjects = projects.filter(
      (p) => p.status === 'active' && p.uptimeEnabled
    );

    if (activeProjects.length === 0) {
      return;
    }

    const now = Date.now();
    const dueProjects = activeProjects.filter((p) => {
      const lastCheck = p.lastUptimeCheckAt ? new Date(p.lastUptimeCheckAt).getTime() : 0;
      const intervalMs = (p.uptimeIntervalMinutes || 15) * 60 * 1000;
      return now - lastCheck >= intervalMs;
    });

    if (dueProjects.length === 0) {
      return;
    }

    console.log(`📡 [Worker] Executing probe batch for ${dueProjects.length} due project(s)...`);

    // Process projects in concurrent batches to prevent loop starvation
    for (let i = 0; i < dueProjects.length; i += BATCH_SIZE) {
      const batch = dueProjects.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (project) => {
          try {
            // Two-point verified uptime probe + SSL handshake
            const [uptimeResult, sslResult] = await Promise.all([
              probeUptimeWithVerification(project.baseUrl),
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

            // Outbound notification triggers
            const settings = await db.getNotificationSettings(project.userId);

            if (stateTransition.triggerOutageAlert) {
              await notificationService.notifyOutage(project, uptimeResult, settings);
              await db.createIncident({
                userId: project.userId,
                projectId: project.id,
                projectName: project.name,
                type: 'outage',
                statusCode: uptimeResult.httpStatus,
                cause: uptimeResult.failureDetail || `HTTP status ${uptimeResult.httpStatus}`,
              });
            }

            if (stateTransition.triggerRecoveryAlert) {
              await notificationService.notifyRecovery(project, uptimeResult, settings);
              await db.resolveOpenIncidents(project.id);
            }

            if (sslResult && sslResult.milestoneAlertDue) {
              await notificationService.notifySslExpiry(project, sslResult, settings);
            }
          } catch (err: any) {
            console.error(`❌ [Worker] Error monitoring project ${project.name} (${project.id}):`, err.message);
          }
        })
      );
    }

    const duration = Date.now() - cycleStart;
    console.log(`✅ [Worker] Probe cycle completed in ${duration}ms.`);
  } catch (err: any) {
    console.error('❌ [Worker] Fatal error during monitoring cycle:', err);
  }
}

export function startWorkerLoop(): void {
  console.log(`🚀 [Worker] SitePulse Dedicated Monitoring Worker started (Loop: ${LOOP_INTERVAL_MS / 1000}s, Batch: ${BATCH_SIZE})`);
  // Run first cycle immediately
  runMonitoringCycle().catch(() => {});
  // Schedule recurring cycle
  setInterval(() => {
    runMonitoringCycle().catch(() => {});
  }, LOOP_INTERVAL_MS);
}

// If executed directly via CLI
if (process.argv[1]?.endsWith('worker.ts') || process.argv[1]?.endsWith('worker.js')) {
  startWorkerLoop();
}

