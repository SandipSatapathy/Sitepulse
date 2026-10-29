import http from 'node:http';
import https from 'node:https';
import { resolveSafeTarget, createPinnedLookup, SafeTarget } from './ssrf.js';

export interface SafeFetchResult {
  url: string;
  finalUrl: string;
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB max
const TIMEOUT_MS = 8000; // 8 seconds timeout
const MAX_REDIRECTS = 5;

interface InternalResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  responseTimeMs: number;
}

function executePinnedRequest(target: SafeTarget, method: 'GET' | 'HEAD' = 'GET'): Promise<InternalResponse> {
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
        'User-Agent': 'SitePulse-Bot/1.0 (+https://sitepulse.dev/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      // PINNED LOOKUP - Forces connection to the validated safe IP (defeats DNS rebinding TOCTOU)
      lookup: createPinnedLookup(target.safeIp, target.family),
      servername: target.url.hostname, // Sets SNI for TLS certificate verification
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    req.on('response', (res) => {
      const responseTimeMs = Math.round(performance.now() - startTime);
      const headers: Record<string, string> = {};

      for (const [key, val] of Object.entries(res.headers)) {
        if (typeof val === 'string') {
          headers[key.toLowerCase()] = val;
        } else if (Array.isArray(val)) {
          headers[key.toLowerCase()] = val.join(', ');
        }
      }

      const contentLength = res.headers['content-length'];
      if (contentLength && parseInt(contentLength, 10) > MAX_BYTES) {
        req.destroy();
        return reject(new Error('Response body exceeds maximum permitted size of 2MB.'));
      }

      if (method === 'HEAD') {
        res.resume();
        return resolve({
          statusCode: res.statusCode || 200,
          statusText: res.statusMessage || '',
          headers,
          body: '',
          responseTimeMs,
        });
      }

      let receivedBytes = 0;
      const chunks: Buffer[] = [];

      res.on('data', (chunk: Buffer) => {
        receivedBytes += chunk.length;
        if (receivedBytes > MAX_BYTES) {
          res.destroy();
          req.destroy();
          return reject(new Error('Response body exceeded maximum allowed limit of 2MB.'));
        }
        chunks.push(chunk);
      });

      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({
          statusCode: res.statusCode || 200,
          statusText: res.statusMessage || '',
          headers,
          body,
          responseTimeMs,
        });
      });

      res.on('error', (err) => {
        reject(err);
      });
    });

    req.on('error', (err: any) => {
      if (err.name === 'AbortError' || err.code === 'ABORT_ERR') {
        return reject(
          new Error(`Connection timed out after ${TIMEOUT_MS / 1000}s while contacting ${target.url.href}`)
        );
      }
      reject(err);
    });

    req.end();
  });
}

/**
 * Safely fetches an HTTP/HTTPS URL with strict SSRF pre-flight on every redirect,
 * pinned IP to defeat DNS rebinding (SEC-01), memory byte ceiling, and native timeout.
 */
export async function safeFetch(targetUrl: string, maxRedirects = MAX_REDIRECTS): Promise<SafeFetchResult> {
  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const target = await resolveSafeTarget(currentUrl);
    const response = await executePinnedRequest(target, 'GET');

    // Handle redirect status codes 301, 302, 303, 307, 308
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      const location = response.headers['location'];
      if (!location) {
        throw new Error(`Redirect status ${response.statusCode} received without Location header.`);
      }

      const nextUrl = new URL(location, currentUrl).toString();
      redirectsCount++;
      if (redirectsCount > maxRedirects) {
        throw new Error(`Exceeded maximum allowed redirects (${maxRedirects}).`);
      }
      currentUrl = nextUrl;
      continue;
    }

    return {
      url: targetUrl,
      finalUrl: currentUrl,
      statusCode: response.statusCode,
      statusText: response.statusText,
      headers: response.headers,
      body: response.body,
      responseTimeMs: response.responseTimeMs,
    };
  }

  throw new Error(`Redirect chain exceeded limit.`);
}
