# SitePulse — Product Requirements Document (PRD)

**Version:** 1.0  
**Status:** Draft for MVP  
**Product owner:** Founder  
**Target release:** 2–4 weeks after development starts

## 1. Executive summary

SitePulse combines lightweight SEO/website-health scanning with recurring uptime and SSL certificate monitoring. A free public scanner is the discovery and activation entry point. Paid plans unlock saved projects, configurable uptime checks, outage/recovery alerts, SSL expiry alerts, scheduled SEO scans, longer history, and client reporting.

## 2. Problem statement

Small website owners and agencies may discover broken links, missing metadata, outages, or expiring TLS certificates only after a visitor or client reports them. SitePulse aims to provide a focused, understandable, affordable workflow for common SEO issues, site availability, and SSL expiry. This product hypothesis must be validated with target users.

This problem hypothesis must be validated with target users before committing to advanced features.

## 3. Goals

- Deliver useful findings from a first scan with minimal friction.
- Monitor public website availability independently of weekly SEO scans.
- Detect SSL certificate expiry/validation issues and notify users in advance.
- Convert a portion of anonymous users into accounts.
- Encourage repeat use through monitoring and alerts.
- Validate willingness to pay for multi-site monitoring and reporting.
- Keep scanning safe, bounded, and inexpensive to operate.

### Non-goals
- Replace full SEO platforms.
- Guarantee search rankings, traffic growth, or uptime.
- Crawl the entire web.
- Execute arbitrary scripts on scanned sites.
- Provide enterprise-grade monitoring in the first release.

## 4. Personas

### Persona A: Freelance developer
Maintains several client websites and wants to catch common issues without manually checking every site.

### Persona B: SEO consultant
Needs a quick baseline report and a repeatable way to demonstrate technical improvements.

### Persona C: Small business owner
Wants a simple explanation of website problems and email alerts without learning a complex SEO suite.

## 5. User journeys

### Journey 1: Anonymous scan
1. Visitor lands on a free checker page.
2. Enters a public URL.
3. Sees scan progress and results.
4. Reviews findings and remediation hints.
5. Is invited to create an account to save the report or enable monitoring.

### Journey 2: Saved monitoring
1. User registers and verifies email.
2. Creates a project with a website URL.
3. Chooses an available uptime interval and alert preferences.
4. SitePulse starts recurring uptime checks and daily SSL certificate checks independently of SEO scans.
5. User sees current status, response-time history, and SSL expiry details.
6. Confirmed outages trigger alerts; recovery triggers a recovery notification.
7. SSL expiry milestones trigger advance alerts.
8. Weekly SEO scans run automatically and notify the user of new issues.

### Journey 3: Agency reporting
1. Agency user opens a project.
2. Selects a completed scan.
3. Generates a shareable report.
4. Shares the report with a client.
5. Revokes or expires the link when no longer needed.

## 6. Functional requirements

### FR-1: URL submission
- The system must accept only valid HTTP/HTTPS URLs.
- It must clearly explain invalid or unsupported input.
- It must reject private/internal destinations and enforce scan limits.

### FR-2: Scan execution
- The system must run scans asynchronously for authenticated monitoring.
- The system must display queued, running, completed, and failed states.
- A scan failure must not be represented as a collection of site defects.

### FR-3: Findings
- Each finding must include rule code, title, severity, affected URL, explanation, and suggested remediation where available.
- Severity definitions must be documented and consistent.
- Findings must be grouped by category and severity.

### FR-4: Accounts and projects
- Users must register, verify email, sign in, and reset passwords.
- Users must create, update, and delete their own projects.
- Users must never access another user's records without explicit sharing.

### FR-5: SEO history and comparison
- Retain SEO scans according to plan limits.
- Show issue counts over time and identify newly appearing/resolved findings where matching is reliable.

### FR-6: Uptime monitoring
- Check configured public URLs at the interval allowed by the user's plan.
- Record timestamp, outcome, HTTP status where available, and response time.
- Distinguish `up`, `down`, and `check_failed/unknown`.
- Require a configurable consecutive-failure threshold before confirming an outage.
- Make outage/recovery transitions idempotent to prevent duplicate alerts.
- Show current state and recent history.
- Uptime percentages must state the measurement window and are not a contractual SLA.

### FR-7: SSL certificate monitoring
- Check certificate metadata daily for HTTPS projects.
- Store expiry date, issuer, hostname match, and validation outcome where available.
- Send default expiry alerts 30, 14, 7, and 1 day before expiry.
- Alert on expired/invalid certificates when detectable.
- If certificate metadata cannot be retrieved, record a check failure rather than inventing an expiry date.

### FR-8: Notifications
- Users control SEO, outage, recovery, and SSL notification categories.
- Deduplicate alerts by incident state or certificate/milestone.
- Log and retry failed delivery where appropriate.
- Users can disable monitoring or notifications.

### FR-9: Reports
- The system should generate a report for a completed scan.
- Share links must be difficult to guess and revocable.
- Reports must not expose credentials, internal application data, or other users' information.

### FR-10: Plans and billing
- Server-side entitlements must control quotas.
- Entitlements cover monitored-site count, uptime interval, SEO scan frequency, history retention, and report features.
- Billing events must be signature-verified and idempotent.
- Subscription cancellation, expiration, and downgrade behavior must be explicit.
- If payment integration is deferred, the app must support manually assigned pilot plans.

## 7. UX requirements

- The public scanner must be usable without account creation.
- Results must explain findings in plain language.
- Show what was checked and what was not checked.
- Make the primary next action clear: fix an issue, save the site, or enable monitoring.
- Dashboard must show the last SEO scan, issue summary, current uptime state, recent response history, SSL expiry date, and next scheduled SEO scan.
- Uptime and SSL status must be visually distinct from SEO findings.
- Show the check interval and explain that the product does not observe every moment between checks.
- Provide empty states, loading states, error messages, and responsive layouts.
- Avoid implying that a heuristic score is an official search-engine score.

## 8. Business model

Potential paid value:
- Multiple monitored sites.
- Recurring scan schedules.
- Longer history.
- Email alerts.
- Shareable client reports.
- Branded reporting on a higher tier.

Initial price hypotheses:
- Starter: ₹499/month; up to 3 sites, 15-minute uptime checks, daily SSL checks, weekly SEO scans.
- Pro: ₹1,499/month; up to 15 sites, 5-minute uptime checks, daily SSL checks, longer history, client reports.
- Agency: ₹2,499/month; up to 30 sites, 5-minute uptime checks, daily SSL checks, and branded reports if included.
- International tests: approximately $9–$39/month.

These are hypotheses, not verified market rates. Confirm infrastructure capacity and cost before promising these intervals or quotas.

Validate price, limits, and packaging with interviews and paid pilots. Do not assume these prices are market-validated.

## 9. Success metrics

Activation:
- Visitor-to-scan rate.
- Scan completion rate.
- Percentage of users who review findings.
- Scan-to-signup rate.
- Signup-to-project creation rate.

Retention:
- Weekly active projects.
- Repeat SEO scan rate.
- Percentage of monitored sites with recent uptime checks.
- Uptime-check execution success and latency.
- False-positive outage alert rate and time to recovery detection.
- SSL expiry alerts sent before configured milestones.
- Alert open/click rate where appropriate.
- Percentage of users retaining at least one monitored project after 30 days.

Revenue:
- Free-to-paid conversion.
- Monthly recurring revenue.
- Revenue per paying account.
- Churn and cancellation reasons.
- Gross margin after scan, email, hosting, and payment costs.

Safety/reliability:
- Scan failure rate.
- Unsafe URL rejection rate.
- Queue age and duration.
- Alert delivery failure rate.
- Abuse incidents.

## 10. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Crowded SEO tooling market | Focus on simple monitoring and agency reports |
| Search traffic takes time | Combine free tools with communities and direct pilot outreach |
| SSRF and abuse | Strict IP/redirect validation, quotas, timeouts, and acceptable-use policy |
| False outage alerts | Consecutive-failure threshold, distinguish worker failures, deduplicate state transitions |
| SSL check failures | Record diagnostics and never invent expiry dates when certificate metadata is unavailable |
| High crawler/monitoring costs | Bound pages, check frequency, concurrency, response size, and monitored-site quotas |
| False positives | Explain rules and provide affected URLs; make heuristics transparent |
| Low retention | Test alert quality and recurring value with pilot users |
| Billing complexity | Start with one provider and a small number of plans |

## 11. Launch criteria

- MVP Scope acceptance criteria pass.
- No known critical/high security defects.
- At least 5 target users have tested the workflow.
- At least 3 pilot users agree to pay or provide strong, specific evidence of willingness to pay.
- The team can estimate cost per SEO scan and per monitored site and enforce usage caps.
- Uptime checks, outage/recovery transitions, and SSL expiry milestone alerts pass tests.
- Monitoring-worker failures are not reported as confirmed website outages.
- Legal/help pages and support channel are live.

## 12. Open questions

- Which initial niche converts best: freelancers, SEO consultants, or small agencies?
- Should PDF export be included in the first release or after launch?
- What scan quota balances usefulness and cost?
- Is there enough willingness to pay for white-label reports?
- Which billing provider is available for the founder's business and target markets?
