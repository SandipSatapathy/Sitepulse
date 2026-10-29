import http from 'node:http';
import https from 'node:https';
import { resolveSafeTarget, createPinnedLookup, SafeTarget } from '../scanner/ssrf.js';

export type UptimeOutcome = 'up' | 'down' | 'check_failed';

export interface UptimeCheckResult {
  checkedAt: string;
  outcome: UptimeOutcome;
  httpStatus: number | null;
  responseTimeMs: number;
  failureCode?: string;
  failureDetail?: string;
}

const UPTIME_TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 3;

interface ProbeResponse {
  statusCode: number;
  location?: string;
  responseTimeMs: number;
}

function executeSingleProbe(target: SafeTarget, method: 'HEAD' | 'GET'): Promise<ProbeResponse> {
  const isHttps = target.url.protocol === 'https:';
  const client = isHttps ? https : http;
  const port = target.url.port ? parseInt(target.url.port, 10) : isHttps ? 443 : 80;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const req = client.request({
      protocol: target.url.protocol,
      hostname: target.url.hostname,
      port,
      path: (target.url.pathname || '/') + (target.url.search || ''),
      method,
      headers: {
        'Host': target.url.host,
        'User-Agent': 'SitePulse-Uptime/1.0 (+https://sitepulse.dev/uptime)',
        'Accept': '*/*',
      },
      lookup: createPinnedLookup(target.safeIp, target.family),
      servername: target.url.hostname,
      signal: AbortSignal.timeout(UPTIME_TIMEOUT_MS),
    });

    req.on('response', (res) => {
      const responseTimeMs = Math.round(performance.now() - startTime);
      const location = res.headers['location'];
      res.resume(); // discard body
      resolve({
        statusCode: res.statusCode || 200,
        location: typeof location === 'string' ? location : undefined,
        responseTimeMs,
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Executes a lightweight HTTP check to determine site availability with:
 * - Pinned DNS lookup against SSRF DNS rebinding (SEC-01)
 * - Strict per-hop manual redirect validation against internal SSRF (SEC-02)
 * - Native AbortSignal.timeout()
 */
export async function probeUptime(targetUrl: string): Promise<UptimeCheckResult> {
  const checkedAt = new Date().toISOString();
  let currentUrl = targetUrl;
  let redirectsCount = 0;
  let totalLatencyMs = 0;

  try {
    while (redirectsCount <= MAX_REDIRECTS) {
      const target = await resolveSafeTarget(currentUrl);

      let response: ProbeResponse;
      try {
        response = await executeSingleProbe(target, 'HEAD');
        if (response.statusCode === 405) {
          response = await executeSingleProbe(target, 'GET');
        }
      } catch {
        // Fallback to GET if HEAD failed with method error
        response = await executeSingleProbe(target, 'GET');
      }

      totalLatencyMs += response.responseTimeMs;

      // Handle redirects manually to inspect and re-validate every hop
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.location) {
        redirectsCount++;
        if (redirectsCount > MAX_REDIRECTS) {
          return {
            checkedAt,
            outcome: 'down',
            httpStatus: response.statusCode,
            responseTimeMs: totalLatencyMs,
            failureCode: 'TOO_MANY_REDIRECTS',
            failureDetail: `Exceeded redirect limit of ${MAX_REDIRECTS} hops`,
          };
        }
        currentUrl = new URL(response.location, currentUrl).toString();
        continue;
      }

      const isUp = response.statusCode >= 200 && response.statusCode < 400;
      return {
        checkedAt,
        outcome: isUp ? 'up' : 'down',
        httpStatus: response.statusCode,
        responseTimeMs: totalLatencyMs,
        failureCode: isUp ? undefined : `HTTP_${response.statusCode}`,
        failureDetail: isUp ? undefined : `HTTP status ${response.statusCode} returned`,
      };
    }

    return {
      checkedAt,
      outcome: 'down',
      httpStatus: null,
      responseTimeMs: totalLatencyMs,
      failureCode: 'TOO_MANY_REDIRECTS',
      failureDetail: 'Exceeded maximum permitted redirects',
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError' || err.code === 'ABORT_ERR';
    const isSsrf = err.message?.includes('restricted address') || err.message?.includes('private or restricted');

    return {
      checkedAt,
      outcome: isSsrf ? 'check_failed' : 'down',
      httpStatus: null,
      responseTimeMs: totalLatencyMs,
      failureCode: isSsrf ? 'SSRF_BLOCKED' : isTimeout ? 'TIMEOUT' : 'CONNECTION_REFUSED',
      failureDetail: err.message || 'Network error during uptime check',
    };
  }
}

/**
 * Two-Point Secondary Verification Probe:
 * When an initial probe fails or encounters non-2xx status, executes an immediate
 * secondary verification probe after a 1.5s debounce to filter out transient micro-blips
 * and prevent single-origin false alarms.
 */
export async function probeUptimeWithVerification(targetUrl: string): Promise<UptimeCheckResult> {
  const primaryResult = await probeUptime(targetUrl);

  // If primary check succeeded or was an SSRF security block, return immediately
  if (primaryResult.outcome === 'up' || primaryResult.failureCode === 'SSRF_BLOCKED') {
    return primaryResult;
  }

  console.log(`🔍 [UptimeEngine] Primary probe indicated failure (${primaryResult.failureCode || primaryResult.httpStatus}) for ${targetUrl}. Initiating secondary confirmation probe...`);

  // 1.5s delay to allow momentary routing/TCP fluctuations to clear
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const secondaryResult = await probeUptime(targetUrl);

  if (secondaryResult.outcome === 'up') {
    console.log(`🛡️ [UptimeEngine] Secondary verification probe SUCCEEDED for ${targetUrl}! Transient glitch discarded, false alarm averted.`);
    return {
      ...secondaryResult,
      failureDetail: 'Transient glitch absorbed by secondary verification probe.',
    };
  }

  console.log(`🚨 [UptimeEngine] Secondary probe confirmed outage for ${targetUrl} (${secondaryResult.failureCode || secondaryResult.httpStatus}).`);
  return secondaryResult;
}

/**
 * State Transition Handler for Consecutive Failures
 * Prevents false positives by requiring consecutive failures before confirming an outage.
 */
export function evaluateUptimeState(
  currentState: UptimeOutcome,
  consecutiveFailures: number,
  threshold: number,
  latestCheck: UptimeCheckResult
): {
  newState: UptimeOutcome;
  newConsecutiveFailures: number;
  triggerOutageAlert: boolean;
  triggerRecoveryAlert: boolean;
} {
  if (latestCheck.outcome === 'up') {
    const wasDown = currentState === 'down';
    return {
      newState: 'up',
      newConsecutiveFailures: 0,
      triggerOutageAlert: false,
      triggerRecoveryAlert: wasDown, // Alert if recovered from confirmed outage
    };
  }

  // If check failed due to worker error (DNS / network worker), do not mark as confirmed outage
  if (latestCheck.outcome === 'check_failed') {
    return {
      newState: currentState, // Keep current state
      newConsecutiveFailures: consecutiveFailures,
      triggerOutageAlert: false,
      triggerRecoveryAlert: false,
    };
  }

  // Outcome is 'down'
  const newConsecutive = consecutiveFailures + 1;
  const isConfirmedOutage = newConsecutive >= threshold;
  const shouldAlert = isConfirmedOutage && currentState !== 'down';

  return {
    newState: isConfirmedOutage ? 'down' : currentState,
    newConsecutiveFailures: newConsecutive,
    triggerOutageAlert: shouldAlert,
    triggerRecoveryAlert: false,
  };
}
