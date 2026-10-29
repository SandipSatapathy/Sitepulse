import { resolveSafeTarget, createPinnedLookup } from './ssrf.js';
import http from 'node:http';
import https from 'node:https';

export type Severity = 'critical' | 'warning' | 'info';
export type Category = 'seo' | 'security' | 'performance' | 'usability';
export type LetterGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Finding {
  ruleCode: string;
  category: Category;
  severity: Severity;
  title: string;
  details: string;
  remediation: string;
  pageUrl: string;
  fingerprint: string;
}

export interface CategoryScore {
  score: number;
  grade: LetterGrade;
  issuesCount: number;
}

export interface OpenGraphMeta {
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
}

export interface SecurityHeadersStatus {
  hsts: boolean;
  xContentTypeOptions: boolean;
  xFrameOptions: boolean;
  contentSecurityPolicy: boolean;
}

export interface MixedContentResource {
  tag: 'script' | 'stylesheet' | 'image' | 'iframe';
  url: string;
}

export interface BrokenLinkItem {
  url: string;
  statusCode: number;
}

export interface ScanAuditResult {
  url: string;
  statusCode: number;
  responseTimeMs: number;
  durationMs: number;
  htmlSizeKb: number;
  healthScore: number;
  overallGrade: LetterGrade;
  categories: {
    seo: CategoryScore;
    security: CategoryScore;
    performance: CategoryScore;
    usability: CategoryScore;
  };
  title: string | null;
  metaDescription: string | null;
  h1List: string[];
  openGraph: OpenGraphMeta;
  securityHeaders: SecurityHeadersStatus;
  mixedContent: MixedContentResource[];
  totalImages: number;
  imagesMissingAlt: number;
  internalLinksCount: number;
  externalLinksCount: number;
  brokenLinks: BrokenLinkItem[];
  findings: Finding[];
}

function generateFingerprint(ruleCode: string, url: string, extra = ''): string {
  return `${ruleCode}:${url}:${extra}`;
}

function calculateGrade(score: number): LetterGrade {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Checks a sample of same-origin internal links for 404/500 errors.
 * Bounded to 5 unique links with a 3-second timeout to avoid long waits.
 * Enforces pinned SSRF validation and manual redirect handling (SEC-01 & SEC-02).
 */
export async function checkSampleBrokenLinks(pageUrl: string, html: string): Promise<BrokenLinkItem[]> {
  const broken: BrokenLinkItem[] = [];
  try {
    const origin = new URL(pageUrl).origin;
    const hrefMatches = html.matchAll(/<a\b[^>]*href=["']([^"'#\s]+)["']/gi);
    const uniqueHrefs = new Set<string>();

    for (const match of hrefMatches) {
      const href = match[1]?.trim();
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) continue;
      try {
        const resolved = new URL(href, pageUrl);
        if (resolved.origin === origin && resolved.href !== pageUrl) {
          uniqueHrefs.add(resolved.href);
        }
      } catch {
        // Skip malformed href
      }
      if (uniqueHrefs.size >= 5) break;
    }

    const checkPromises = Array.from(uniqueHrefs).map(async (linkUrl) => {
      try {
        const target = await resolveSafeTarget(linkUrl);
        const isHttps = target.url.protocol === 'https:';
        const client = isHttps ? https : http;
        const port = target.url.port ? parseInt(target.url.port, 10) : isHttps ? 443 : 80;

        await new Promise<void>((resolve) => {
          const req = client.request({
            protocol: target.url.protocol,
            hostname: target.url.hostname,
            port,
            path: (target.url.pathname || '/') + (target.url.search || ''),
            method: 'HEAD',
            headers: { 'User-Agent': 'SitePulse-Bot/1.0' },
            lookup: createPinnedLookup(target.safeIp, target.family),
            servername: target.url.hostname,
            signal: AbortSignal.timeout(3000),
          });

          req.on('response', (res) => {
            res.resume();
            if (res.statusCode && res.statusCode >= 400) {
              broken.push({ url: linkUrl, statusCode: res.statusCode });
            }
            resolve();
          });

          req.on('error', () => {
            resolve(); // Ignore probe timeout/error on sample
          });

          req.end();
        });
      } catch {
        // Ignore SSRF/DNS resolution errors on sample check
      }
    });

    await Promise.all(checkPromises);
  } catch {
    // origin parsing fallback
  }

  return broken;
}

/**
 * Parses raw HTML, headers, and performance telemetry, evaluating core SEO,
 * security headers, mixed content, and usability rules.
 */
export function auditHtml(
  html: string,
  pageUrl: string,
  statusCode: number,
  responseTimeMs: number,
  headers: Record<string, string> = {},
  brokenLinks: BrokenLinkItem[] = []
): ScanAuditResult {
  const findings: Finding[] = [];
  const startTime = performance.now();
  const htmlSizeKb = Number((Buffer.byteLength(html, 'utf8') / 1024).toFixed(1));

  // --- Category Scores Tracker ---
  let seoDeductions = 0;
  let secDeductions = 0;
  let perfDeductions = 0;
  let usaDeductions = 0;

  // 1. HTTP Status Check
  if (statusCode >= 400 && statusCode < 500) {
    perfDeductions += 30;
    findings.push({
      ruleCode: 'HTTP_CLIENT_ERROR',
      category: 'performance',
      severity: 'critical',
      title: `Page returned client error HTTP ${statusCode}`,
      details: `The web server responded with status ${statusCode}. Search crawlers and visitors cannot view this page.`,
      remediation: 'Ensure the page exists, permissions are granted, and route redirects are properly configured.',
      pageUrl,
      fingerprint: generateFingerprint('HTTP_CLIENT_ERROR', pageUrl, String(statusCode)),
    });
  } else if (statusCode >= 500) {
    perfDeductions += 40;
    findings.push({
      ruleCode: 'HTTP_SERVER_ERROR',
      category: 'performance',
      severity: 'critical',
      title: `Page returned server error HTTP ${statusCode}`,
      details: 'The server threw an internal error when responding to the request.',
      remediation: 'Check application server error logs, database connections, and upstream services.',
      pageUrl,
      fingerprint: generateFingerprint('HTTP_SERVER_ERROR', pageUrl, String(statusCode)),
    });
  }

  // 2. SEO Title Tag Check
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].trim() : null;

  if (!rawTitle) {
    seoDeductions += 25;
    findings.push({
      ruleCode: 'SEO_MISSING_TITLE',
      category: 'seo',
      severity: 'critical',
      title: 'Missing or empty <title> tag',
      details: 'The document does not specify a <title> element, which is the primary headline shown in search results and browser tabs.',
      remediation: 'Add a descriptive <title> tag between 30 and 60 characters in length inside the <head> block.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_MISSING_TITLE', pageUrl),
    });
  } else if (rawTitle.length < 15) {
    seoDeductions += 10;
    findings.push({
      ruleCode: 'SEO_SHORT_TITLE',
      category: 'seo',
      severity: 'warning',
      title: 'Title tag is too short',
      details: `Title is only ${rawTitle.length} characters ("${rawTitle}"). Search engines favor descriptive titles between 30 and 60 characters.`,
      remediation: 'Expand the title to clearly identify the page topic, value proposition, or brand.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_SHORT_TITLE', pageUrl),
    });
  } else if (rawTitle.length > 70) {
    seoDeductions += 5;
    findings.push({
      ruleCode: 'SEO_LONG_TITLE',
      category: 'seo',
      severity: 'warning',
      title: 'Title tag exceeds recommended length',
      details: `Title is ${rawTitle.length} characters long and may be truncated with an ellipsis on search engine result pages.`,
      remediation: 'Keep the title under 65 characters to avoid truncation in Google search results.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_LONG_TITLE', pageUrl),
    });
  }

  // 3. Meta Description Check
  const metaDescMatch = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta\b[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : null;

  if (!metaDescription) {
    seoDeductions += 15;
    findings.push({
      ruleCode: 'SEO_MISSING_META_DESC',
      category: 'seo',
      severity: 'warning',
      title: 'Missing meta description tag',
      details: 'No <meta name="description"> tag was found. Search engines may generate suboptimal automated snippets.',
      remediation: 'Add a compelling meta description of 120-160 characters summarizing the page contents.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_MISSING_META_DESC', pageUrl),
    });
  } else if (metaDescription.length < 50) {
    seoDeductions += 5;
    findings.push({
      ruleCode: 'SEO_SHORT_META_DESC',
      category: 'seo',
      severity: 'info',
      title: 'Meta description is brief',
      details: `Description is ${metaDescription.length} characters long. A full snippet is typically 120-160 characters.`,
      remediation: 'Provide more context to encourage user click-through from search engines.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_SHORT_META_DESC', pageUrl),
    });
  }

  // 4. Heading Hierarchy (H1)
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
  if (h1Matches.length === 0) {
    seoDeductions += 15;
    findings.push({
      ruleCode: 'SEO_MISSING_H1',
      category: 'seo',
      severity: 'warning',
      title: 'Missing primary <h1> heading',
      details: 'The page has no <h1> element. Screen readers and search engine crawlers rely on <h1> to identify the main topic.',
      remediation: 'Add a single prominent <h1> heading near the top of the page body.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_MISSING_H1', pageUrl),
    });
  } else if (h1Matches.length > 1) {
    seoDeductions += 5;
    findings.push({
      ruleCode: 'SEO_MULTIPLE_H1',
      category: 'seo',
      severity: 'info',
      title: `Multiple <h1> tags detected (${h1Matches.length} found)`,
      details: `Found ${h1Matches.length} <h1> tags. While valid in HTML5, having a single unambiguous <h1> is recommended for clear topic hierarchy.`,
      remediation: 'Structure the page with one top-level <h1> and use <h2> and <h3> for secondary sections.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_MULTIPLE_H1', pageUrl),
    });
  }

  // 5. Canonical URL
  const hasCanonical = /<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(html);
  if (!hasCanonical) {
    seoDeductions += 5;
    findings.push({
      ruleCode: 'SEO_MISSING_CANONICAL',
      category: 'seo',
      severity: 'info',
      title: 'Missing canonical URL link tag',
      details: 'No <link rel="canonical" href="..."> was detected. A canonical tag prevents duplicate content indexing.',
      remediation: 'Add a canonical URL link tag to declare the authoritative URL of this document.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_MISSING_CANONICAL', pageUrl),
    });
  }

  // 6. Social Graph / OpenGraph (SEOptimer feature)
  const ogTitleMatch = html.match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogDescMatch = html.match(/<meta\b[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const ogImgMatch = html.match(/<meta\b[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["'][^>]*>/i);
  const twitterCardMatch = html.match(/<meta\b[^>]*name=["']twitter:card["'][^>]*content=["']([^"']*)["'][^>]*>/i);

  const openGraph: OpenGraphMeta = {
    ogTitle: ogTitleMatch ? ogTitleMatch[1] : null,
    ogDescription: ogDescMatch ? ogDescMatch[1] : null,
    ogImage: ogImgMatch ? ogImgMatch[1] : null,
    twitterCard: twitterCardMatch ? twitterCardMatch[1] : null,
  };

  if (!openGraph.ogTitle || !openGraph.ogImage) {
    seoDeductions += 10;
    findings.push({
      ruleCode: 'SEO_INCOMPLETE_OPENGRAPH',
      category: 'seo',
      severity: 'info',
      title: 'Incomplete Open Graph / Social Sharing Tags',
      details: 'Missing og:title or og:image tags. Links shared on Twitter/X, LinkedIn, and Facebook may lack visual link previews.',
      remediation: 'Add <meta property="og:title"> and <meta property="og:image"> tags to customize link share appearances.',
      pageUrl,
      fingerprint: generateFingerprint('SEO_INCOMPLETE_OPENGRAPH', pageUrl),
    });
  }

  // 7. Security Headers & HTTPS (Oh Dear feature)
  const isHttps = pageUrl.startsWith('https://');
  const hsts = Boolean(headers['strict-transport-security']);
  const xContentTypeOptions = Boolean(headers['x-content-type-options']?.includes('nosniff'));
  const xFrameOptions = Boolean(headers['x-frame-options'] || headers['content-security-policy']?.includes('frame-ancestors'));
  const contentSecurityPolicy = Boolean(headers['content-security-policy']);

  const securityHeaders: SecurityHeadersStatus = {
    hsts,
    xContentTypeOptions,
    xFrameOptions,
    contentSecurityPolicy,
  };

  if (!isHttps) {
    secDeductions += 30;
    findings.push({
      ruleCode: 'SEC_INSECURE_HTTP',
      category: 'security',
      severity: 'critical',
      title: 'Website is served over unencrypted HTTP',
      details: 'Traffic is unencrypted. Browsers display security warnings, and data in transit can be intercepted.',
      remediation: 'Install an SSL/TLS certificate and configure 301 redirects from HTTP to HTTPS.',
      pageUrl,
      fingerprint: generateFingerprint('SEC_INSECURE_HTTP', pageUrl),
    });
  } else if (!hsts) {
    secDeductions += 10;
    findings.push({
      ruleCode: 'SEC_MISSING_HSTS',
      category: 'security',
      severity: 'warning',
      title: 'Missing Strict-Transport-Security (HSTS) header',
      details: 'HSTS instructs browsers to only interact with your site using secure HTTPS connections, preventing SSL stripping attacks.',
      remediation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to web server response headers.',
      pageUrl,
      fingerprint: generateFingerprint('SEC_MISSING_HSTS', pageUrl),
    });
  }

  if (!xContentTypeOptions) {
    secDeductions += 5;
    findings.push({
      ruleCode: 'SEC_MISSING_X_CONTENT_TYPE',
      category: 'security',
      severity: 'info',
      title: 'Missing X-Content-Type-Options header',
      details: 'Without nosniff, browsers may attempt to MIME-sniff response bodies away from the declared content-type.',
      remediation: 'Add "X-Content-Type-Options: nosniff" to your server response headers.',
      pageUrl,
      fingerprint: generateFingerprint('SEC_MISSING_X_CONTENT_TYPE', pageUrl),
    });
  }

  // 8. Mixed Content Detection (Oh Dear feature)
  const mixedContent: MixedContentResource[] = [];
  if (isHttps) {
    const scripts = [...html.matchAll(/<script\b[^>]*src=["'](http:\/\/[^"']+)["']/gi)];
    const links = [...html.matchAll(/<link\b[^>]*href=["'](http:\/\/[^"']+)["']/gi)];
    const images = [...html.matchAll(/<img\b[^>]*src=["'](http:\/\/[^"']+)["']/gi)];
    const iframes = [...html.matchAll(/<iframe\b[^>]*src=["'](http:\/\/[^"']+)["']/gi)];

    scripts.forEach(s => mixedContent.push({ tag: 'script', url: s[1] }));
    links.forEach(l => mixedContent.push({ tag: 'stylesheet', url: l[1] }));
    images.forEach(i => mixedContent.push({ tag: 'image', url: i[1] }));
    iframes.forEach(f => mixedContent.push({ tag: 'iframe', url: f[1] }));

    if (mixedContent.length > 0) {
      secDeductions += 20;
      findings.push({
        ruleCode: 'SEC_MIXED_CONTENT_ASSETS',
        category: 'security',
        severity: 'critical',
        title: `Mixed Content: ${mixedContent.length} insecure HTTP asset(s) loaded on HTTPS page`,
        details: `Detected ${mixedContent.length} asset(s) loaded over unencrypted http://. Modern browsers block active mixed content.`,
        remediation: 'Update all asset URLs (scripts, stylesheets, images) to use https:// or protocol-relative paths.',
        pageUrl,
        fingerprint: generateFingerprint('SEC_MIXED_CONTENT_ASSETS', pageUrl, String(mixedContent.length)),
      });
    }
  }

  // 9. Performance & Footprint
  if (responseTimeMs > 800) {
    perfDeductions += 15;
    findings.push({
      ruleCode: 'PERF_SLOW_RESPONSE',
      category: 'performance',
      severity: 'warning',
      title: `Slow initial response time (${responseTimeMs} ms)`,
      details: `The server took ${responseTimeMs} ms to respond. High latency harms user experience and search ranking signals.`,
      remediation: 'Leverage edge caching (CDN), database index optimization, or server-side page caching.',
      pageUrl,
      fingerprint: generateFingerprint('PERF_SLOW_RESPONSE', pageUrl),
    });
  }

  const isCompressed = Boolean(headers['content-encoding']);
  if (!isCompressed && htmlSizeKb > 50) {
    perfDeductions += 10;
    findings.push({
      ruleCode: 'PERF_UNCOMPRESSED_HTML',
      category: 'performance',
      severity: 'warning',
      title: 'HTML is not compressed with Gzip or Brotli',
      details: `HTML payload is ${htmlSizeKb} KB and was served without gzip/br compression.`,
      remediation: 'Enable Gzip or Brotli compression on your web server or reverse proxy (Nginx/Cloudflare).',
      pageUrl,
      fingerprint: generateFingerprint('PERF_UNCOMPRESSED_HTML', pageUrl),
    });
  }

  // 10. Usability & Accessibility (Viewport & Alt Attributes)
  const hasViewport = /<meta\b[^>]*name=["']viewport["'][^>]*>/i.test(html);
  if (!hasViewport) {
    usaDeductions += 25;
    findings.push({
      ruleCode: 'MOBILE_MISSING_VIEWPORT',
      category: 'usability',
      severity: 'critical',
      title: 'Missing mobile viewport meta tag',
      details: 'No <meta name="viewport" content="width=device-width, initial-scale=1"> was found. Mobile devices render a zoomed desktop view.',
      remediation: 'Include <meta name="viewport" content="width=device-width, initial-scale=1"> inside the <head>.',
      pageUrl,
      fingerprint: generateFingerprint('MOBILE_MISSING_VIEWPORT', pageUrl),
    });
  }

  const imgTags = [...html.matchAll(/<img\b([^>]*)>/gi)];
  let imagesMissingAlt = 0;
  for (const img of imgTags) {
    const attrs = img[1];
    const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(attrs) || /alt\s*=\s*[^\s>]+/i.test(attrs);
    if (!hasAlt) imagesMissingAlt++;
  }

  if (imagesMissingAlt > 0) {
    usaDeductions += Math.min(20, imagesMissingAlt * 4);
    findings.push({
      ruleCode: 'A11Y_IMAGES_MISSING_ALT',
      category: 'usability',
      severity: imagesMissingAlt > 3 ? 'warning' : 'info',
      title: `${imagesMissingAlt} image${imagesMissingAlt > 1 ? 's' : ''} missing alt attributes`,
      details: `${imagesMissingAlt} of ${imgTags.length} image(s) lack alternative text descriptions. Screen readers cannot describe these images.`,
      remediation: 'Add descriptive alt="Description" attributes to all informative images.',
      pageUrl,
      fingerprint: generateFingerprint('A11Y_IMAGES_MISSING_ALT', pageUrl, String(imagesMissingAlt)),
    });
  }

  // 11. Broken Links Findings
  if (brokenLinks.length > 0) {
    usaDeductions += 20;
    findings.push({
      ruleCode: 'LINK_BROKEN_INTERNAL',
      category: 'usability',
      severity: 'critical',
      title: `${brokenLinks.length} broken internal link(s) detected`,
      details: `Discovered dead internal links: ${brokenLinks.map(b => `${b.url} (HTTP ${b.statusCode})`).join(', ')}.`,
      remediation: 'Update or remove the dead links to avoid frustrating users and leaking crawl budget.',
      pageUrl,
      fingerprint: generateFingerprint('LINK_BROKEN_INTERNAL', pageUrl, String(brokenLinks.length)),
    });
  }

  // Link counts
  let internalLinksCount = 0;
  let externalLinksCount = 0;
  try {
    const origin = new URL(pageUrl).origin;
    const aTags = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];
    for (const match of aTags) {
      const href = match[1].trim();
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) continue;
      try {
        const resolved = new URL(href, pageUrl);
        if (resolved.origin === origin) internalLinksCount++;
        else externalLinksCount++;
      } catch {
        // malformed
      }
    }
  } catch {
    // origin fallback
  }

  // Calculate Category Scores & Letter Grades
  const seoScore = Math.max(0, 100 - seoDeductions);
  const secScore = Math.max(0, 100 - secDeductions);
  const perfScore = Math.max(0, 100 - perfDeductions);
  const usaScore = Math.max(0, 100 - usaDeductions);

  const overallHealthScore = Math.round((seoScore * 0.35) + (secScore * 0.25) + (perfScore * 0.20) + (usaScore * 0.20));

  const durationMs = Math.round(performance.now() - startTime);

  return {
    url: pageUrl,
    statusCode,
    responseTimeMs,
    durationMs,
    htmlSizeKb,
    healthScore: overallHealthScore,
    overallGrade: calculateGrade(overallHealthScore),
    categories: {
      seo: {
        score: seoScore,
        grade: calculateGrade(seoScore),
        issuesCount: findings.filter(f => f.category === 'seo').length,
      },
      security: {
        score: secScore,
        grade: calculateGrade(secScore),
        issuesCount: findings.filter(f => f.category === 'security').length,
      },
      performance: {
        score: perfScore,
        grade: calculateGrade(perfScore),
        issuesCount: findings.filter(f => f.category === 'performance').length,
      },
      usability: {
        score: usaScore,
        grade: calculateGrade(usaScore),
        issuesCount: findings.filter(f => f.category === 'usability').length,
      },
    },
    title: rawTitle,
    metaDescription,
    h1List: h1Matches,
    openGraph,
    securityHeaders,
    mixedContent,
    totalImages: imgTags.length,
    imagesMissingAlt,
    internalLinksCount,
    externalLinksCount,
    brokenLinks,
    findings,
  };
}
