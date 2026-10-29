# SitePulse — Technical Implementation Plan

**Version:** 1.0  
**Target:** Solo developer, 2–4 weeks  
**Suggested stack:** Laravel + MySQL + Redis queue + Blade/React + transactional email

## 1. Architecture

Use a modular monolith for the MVP.

- **Web application:** authentication, public scanner UI, dashboard, projects, billing entitlements.
- **Scan service/module:** URL validation, safe HTTP fetching, HTML parsing, link checks, issue normalization.
- **Queue workers:** scans, scheduled jobs, notifications, report generation.
- **Database:** users, projects, scans, findings, alert preferences, share links, plans/entitlements.
- **Email provider:** verification, alerts, and account emails.
- **Scheduler:** dispatch due scans and prune expired data.
- **Observability:** structured logs, queue-failure monitoring, error alerts.

Avoid microservices at this stage. Keep scanner logic isolated behind a service interface so it can later be scaled independently.

## 2. Suggested data model

### users
- id
- name
- email (unique)
- password_hash
- email_verified_at
- created_at, updated_at

### plans
- id, code, name
- max_sites
- max_pages_per_scan
- scan_frequency
- history_days
- report_features
- active

### subscriptions
- id, user_id, plan_id
- provider
- provider_customer_id
- provider_subscription_id
- status
- current_period_start, current_period_end

### projects
- id, user_id
- name
- base_url
- status
- last_scan_at
- next_scan_at
- alert_enabled
- uptime_enabled
- uptime_interval_minutes
- consecutive_failure_threshold
- last_uptime_state
- last_uptime_check_at
- created_at, updated_at

### uptime_checks
- id, project_id
- checked_at
- outcome: up/down/check_failed
- http_status
- response_time_ms
- failure_code
- sanitized_failure_detail

### ssl_certificates
- id, project_id
- checked_at
- hostname
- issuer
- not_before
- expires_at
- hostname_match
- validation_status
- failure_code

### monitoring_incidents
- id, project_id
- type: outage/ssl_expiry/ssl_invalid
- status: open/resolved
- started_at, resolved_at
- last_notified_at
- created_at, updated_at

### scans
- id, project_id (nullable for anonymous scans)
- requested_url
- status: queued/running/completed/failed
- started_at, completed_at
- pages_checked
- issue_count
- failure_code, failure_message
- duration_ms

### findings
- id, scan_id
- page_url
- rule_code
- severity
- title
- details
- remediation
- fingerprint
- created_at

### report_shares
- id, scan_id
- token_hash
- expires_at
- revoked_at

Use foreign keys and indexes for user/project ownership, scan creation time, scan status, and finding fingerprints. Store share tokens hashed where practical.

## 3. Scanner design

1. Parse and normalize the supplied URL.
2. Accept only HTTP/HTTPS.
3. Resolve DNS and reject unsafe IP ranges.
4. Fetch with strict connect/read timeouts and byte limits.
5. Revalidate redirect destinations before following them.
6. Parse HTML without executing page JavaScript.
7. Extract same-origin links up to configured page/depth limits.
8. Check page-level rules and link status.
9. Normalize findings and calculate stable fingerprints.
10. Persist the scan and findings.
11. Compare with the prior completed scan.
12. Queue configured notifications and report generation.

Recommended initial rules:
- Non-2xx page response.
- Missing/empty title.
- Missing meta description.
- Missing H1.
- Images without alt attributes.
- Internal links returning errors.
- HTTP pages or mixed-content indicators where detectable.
- Fetch timeout or inaccessible page as a scan diagnostic, not necessarily a site defect.

Avoid scoring that implies Google's ranking algorithm. If using an overall score, document the formula and label it as a SitePulse heuristic.

## 4. Uptime and SSL monitoring design

### Uptime check workflow
1. Scheduler finds projects whose next uptime check is due.
2. Enqueue a bounded HTTP(S) check job; never run checks in a dashboard request.
3. Validate the URL and resolve DNS; block loopback, private, link-local, reserved, and metadata IP ranges for IPv4 and IPv6.
4. Revalidate redirects and DNS results; enforce connection/read timeouts and response-size limits.
5. Record timestamp, response code, response time, and outcome.
6. Distinguish `up`, `down`, and `check_failed`. A worker/internal error must not count as confirmed site downtime.
7. Apply a consecutive-failure threshold before changing state to down. Send outage/recovery emails only on idempotent state transitions.
8. Calculate uptime from recorded checks over a stated window; show internal check failures separately rather than treating them as site downtime.

### SSL certificate workflow
1. Run a daily TLS check for each eligible HTTPS project.
2. Validate hostname and retrieve certificate metadata.
3. Record expiry timestamp, issuer, hostname match, and validation result where available.
4. Calculate days to expiry using UTC timestamps.
5. Send one alert per configured milestone (30, 14, 7, 1 days by default), deduplicated by certificate and milestone.
6. Alert on invalid/expired certificates when detectable.
7. If the certificate cannot be retrieved, record a check failure rather than fabricating an expiry date.

### Monitoring quotas and cost controls
- Enforce per-plan monitored URL, check interval, and concurrency limits.
- Spread scheduled checks with jitter to avoid synchronized bursts.
- Use idempotency keys per project/check slot.
- Retain detailed history according to plan and aggregate older data if needed.
- Do not market a 5-minute interval as a contractual uptime SLA.

## 5. Implementation phases

### Phase 0 — Setup (0.5–1 day)
- Create repository and environment configuration.
- Set up app, database, queue, scheduler, and email provider.
- Add formatting, tests, CI checks, and error logging.
- Write basic privacy and acceptable-use policy drafts.

### Phase 1 — Public scanner (Days 2–5)
- URL normalization and validation.
- SSRF/IP-range protections.
- Safe HTTP fetcher.
- HTML parser and initial rules.
- Results page and scan status.
- Anonymous rate limiting.
- Unit tests for URL and rule handling.

**Exit condition:** Safe public URLs return useful results; unsafe URLs are blocked.

### Phase 2 — Accounts and projects (Days 6–9)
- Registration, verification, login, password reset.
- Project CRUD and ownership policies.
- Persist scan records and findings.
- Dashboard and scan history.
- Plan quota service.

**Exit condition:** Users can save a site and access only their own data.

### Phase 3 — Background scans (Days 10–13)
- Queue scan execution.
- Add retries and timeouts.
- Prevent duplicate project scans.
- Scheduler for weekly scans.
- Queue dashboard/failure alerts.
- Compare findings between scans.

**Exit condition:** Scheduled scans run without blocking user requests and failures are observable.

### Phase 4 — Alerts and reports (Days 14–17)
- User notification preferences.
- Email templates and delivery tracking.
- Share links with random tokens, expiry, and revocation.
- PDF export if time permits.
- Avoid leaking sensitive account information.

**Exit condition:** Users receive expected alerts and can revoke report links.

### Phase 5 — Billing and launch (Days 18–21)
- Configure plans and entitlements.
- Integrate one payment provider only after eligibility and regional requirements are checked.
- Handle webhook verification, idempotency, cancellation, failed payments, and plan downgrades.
- Publish landing page and free tools.
- Add onboarding and product analytics.
- Run security and regression tests.

**Optional Days 23–28:** Improve UX, tune crawl/check limits, add branded reports, publish targeted educational pages, and resolve pilot-user feedback.

## 5. API/UI route outline

Example routes:
- `POST /api/scans` — create a bounded scan job.
- `GET /api/scans/{id}` — scan status/results with access control.
- `POST /api/projects` — create project.
- `GET /api/projects` — list user's projects.
- `GET /api/projects/{id}` — project details and history.
- `POST /api/projects/{id}/scans` — enqueue SEO scan.
- `GET /api/projects/{id}/uptime` — uptime history and current state.
- `PATCH /api/projects/{id}/monitoring` — update uptime/SSL settings.
- `GET /api/projects/{id}/ssl` — certificate status and expiry.
- `PATCH /api/projects/{id}` — update project settings.
- `DELETE /api/projects/{id}` — delete project.
- `POST /api/reports/{scan}/share` — create share link.
- `DELETE /api/reports/shares/{id}` — revoke link.
- `POST /webhooks/billing/{provider}` — verified billing events.

These are illustrative routes; adapt to Laravel web/API conventions.

## 6. Testing checklist

- URL parsing, Unicode/punycode, IPv4/IPv6, redirect chains.
- Private IP, localhost, DNS rebinding, metadata endpoint, malformed URL.
- Timeout, oversized body, redirect loops, invalid TLS.
- Uptime outage threshold, recovery transitions, and duplicate-alert prevention.
- Monitoring-worker failure must not count as confirmed downtime.
- SSL valid, expiring, expired, hostname-mismatch, and unavailable-certificate cases.
- Certificate milestone deduplication and UTC/date boundaries.
- HTML with missing tags, malformed markup, duplicate links.
- Internal link returning 404/500.
- Queue retry and terminal failure.
- Duplicate scheduled job prevention.
- User A cannot read User B's project, scans, or reports.
- Expired/revoked share token cannot be used.
- Plan limits cannot be bypassed by direct API calls.
- Billing webhook signature validation and duplicate-event idempotency.

## 7. Deployment checklist

- TLS enabled and secure cookies configured.
- Secrets stored in environment/secret manager, never committed.
- Database backups and restore test.
- Queue worker supervised and scheduler configured.
- Logs rotate and sensitive request data is not logged.
- Rate limiting and abuse monitoring enabled.
- Privacy policy, terms, acceptable-use policy, and support email published.
- Health checks and error alerts configured.
- A staging environment exists before production deployment.

## 8. Definition of done

- Acceptance criteria in the MVP Scope document pass.
- No known critical/high severity security issues.
- Scan execution is asynchronous and bounded.
- Server-side quotas and ownership checks are tested.
- A small pilot group has completed real scans and provided feedback.
- Operational costs per scan are measured before increasing free usage.
