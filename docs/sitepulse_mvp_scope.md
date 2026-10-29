# SitePulse — MVP Scope

**Product:** SitePulse  
**Document:** MVP Scope  
**Version:** 1.0  
**Planning target:** 2–4 weeks for a solo developer  
**Primary users:** Freelancers, SEO consultants, web agencies, small website owners

## 1. Product summary

SitePulse is a lightweight website health monitoring SaaS. A visitor can run a limited free scan without creating an account, then create an account to save websites, schedule recurring scans, receive alerts, and share reports with clients.

**Core promise:** Find common website issues quickly and get notified when monitored sites develop new problems.

## 2. MVP goals

1. Let a user scan a public website and understand detected issues.
2. Convert anonymous users into registered users by allowing scan saving and ongoing monitoring.
3. Provide dependable scheduled scans and email notifications.
4. Enforce usage limits by subscription plan.
5. Ship a secure, maintainable foundation that can be expanded after validation.

## 3. Target users and initial use cases

- Freelance web developers checking sites they maintain.
- SEO consultants preparing basic technical audit reports.
- Small agencies monitoring client websites.
- Small business owners who want simple website-health alerts.

Initial use cases:
- Run a one-time scan of a public website.
- Save a website as a project.
- Review findings and compare a later scan.
- Receive an email when a new issue is detected.
- Share or download a report.

## 4. In scope

### 4.1 Public scanner
- Accept a valid HTTP/HTTPS URL.
- Normalize the URL and validate its syntax.
- Fetch a bounded number of pages from the supplied origin.
- Check page title, meta description, heading presence, image alt attributes, HTTP status, HTTPS availability, and broken internal links.
- Display findings grouped by severity and type.
- Show scan timestamp, pages checked, and limitations.
- Allow an anonymous user to run a limited scan with rate limits.

### 4.2 Authentication and account
- Email/password registration and login.
- Email verification and password reset.
- Account profile and account deletion request.
- Basic workspace ownership model.

### 4.3 Website projects
- Create, view, edit, and delete monitored website projects.
- Validate that project URLs are public websites.
- Show last scan status and next scheduled scan.
- Enforce maximum sites per subscription plan.

### 4.4 Scan history and findings
- Persist scan summary and issue records.
- Show previous scans and issue counts.
- Mark issues as new, recurring, resolved, or unchanged when comparison is possible.
- Provide issue detail with page URL and remediation hint.
- Do not claim to perform a complete SEO audit or guarantee search ranking improvements.

### 4.5 Uptime monitoring
- Monitor the configured homepage or user-selected public URL independently from SEO scans.
- Suggested MVP intervals: every 15 minutes on Starter and every 5 minutes on Pro/Agency, subject to infrastructure capacity and validated plan limits.
- Record timestamp, outcome, HTTP status, and response time for each check.
- Distinguish `up`, `down`, and `check_failed/unknown`; a monitoring-worker error must not be reported as a confirmed website outage.
- Require consecutive failed checks before declaring an outage; default to 2 failures to reduce false positives.
- Send outage and recovery notifications on confirmed state transitions.
- Show recent status history and an uptime percentage for a defined period. State that this is based on SitePulse checks, not a contractual SLA.
- Queue checks asynchronously and enforce per-plan URL, frequency, and concurrency limits.

### 4.6 SSL certificate monitoring
- Check TLS certificates for HTTPS projects daily.
- Record certificate expiry date, issuer, hostname match, and validation result where available.
- Send default expiry alerts 30, 14, 7, and 1 day before expiry.
- Alert on expired or invalid certificates when detectable.
- If certificate metadata cannot be retrieved, record a check failure rather than inventing an expiry date.

### 4.7 Scheduled SEO scans
- Support weekly SEO/website-health scans in the MVP.
- Queue scans rather than running long scans inside web requests.
- Prevent duplicate concurrent scans for the same project.
- Retry transient failures a limited number of times.
- Show failed scans separately from site issues.

### 4.8 Notifications and reports
- Send email when a scan completes and when new high-priority SEO issues are detected, based on user settings.
- Send outage, recovery, and SSL expiry/validation alerts according to user settings.
- Let users configure notification categories.
- Provide a shareable report URL with an unguessable token and optional expiry, or a PDF export if time permits.
- Do not expose private account data in public reports.

### 4.6 Notifications and reports
- Send email when a scan completes and when new high-priority issues are detected, based on user settings.
- Let users disable notifications.
- Provide a shareable report URL with an unguessable token and optional expiry, or a PDF export if time permits.
- Do not expose private account data in public reports.

### 4.7 Plans and limits
Suggested initial plans to validate:
- **Free:** one-time limited scan; no scheduled monitoring.
- **Starter:** 3 sites, weekly scans, basic history.
- **Pro:** 15 sites, longer history, client reports.
- **Agency:** 30 sites, branded reports if included in launch scope.

Plan names, prices, and quotas are configurable and must be validated with customers. Payment integration may be deferred until users demonstrate willingness to pay; plan entitlements should still be implemented independently of the payment provider.

## 5. Out of scope for MVP

- Backlink analysis, keyword rank tracking, keyword research.
- Competitor analysis and full SEO suites.
- Core Web Vitals lab/field analytics beyond simple page-fetch timing.
- JavaScript-rendered crawling as a required capability.
- WordPress plugin, browser extension, mobile applications.
- White-label agency portal beyond basic report branding.
- AI-generated content recommendations.
- Multi-region scanning.
- Enterprise SSO, audit/compliance certifications, complex roles.
- Guaranteed uptime or ranking outcomes.

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| SP-FR-01 | Validate and normalize scan URLs | Must |
| SP-FR-02 | Run a bounded public website scan | Must |
| SP-FR-03 | Display issues with severity and affected URL | Must |
| SP-FR-04 | Provide anonymous scan rate limiting | Must |
| SP-FR-05 | Register, verify email, log in, reset password | Must |
| SP-FR-06 | Create and manage website projects | Must |
| SP-FR-07 | Store scan history and findings | Must |
| SP-FR-08 | Schedule weekly SEO scans using a background queue | Must |
| SP-FR-09 | Run recurring uptime checks at plan-specific intervals | Must |
| SP-FR-10 | Record uptime status, response time, and status history | Must |
| SP-FR-11 | Confirm outages after consecutive failures and send recovery alerts | Must |
| SP-FR-12 | Check TLS certificate validity/expiry and send milestone alerts | Must |
| SP-FR-13 | Send configurable SEO, uptime, recovery, and SSL notifications | Must |
| SP-FR-14 | Enforce site, scan, and check-frequency quotas | Must |
| SP-FR-15 | Generate shareable reports | Should |
| SP-FR-16 | PDF report export | Should |
| SP-FR-17 | Payment-provider integration | Should; only after validation |
| SP-FR-18 | Branded white-label reports | Could |

## 7. Non-functional requirements

- Security: SSRF protections, request timeouts, response-size limits, redirect validation, rate limits, secure password handling, and authorization checks.
- Performance: normal dashboard pages should respond promptly; long scans must execute asynchronously.
- Reliability: SEO scan failures and monitoring-worker failures must be visible and must not be misreported as site defects or confirmed outages. Monitoring status percentages must state the measurement period.
- Privacy: collect only necessary data; provide retention and account-deletion policies.
- Accessibility: keyboard-operable forms, clear labels, readable contrast, responsive layout.
- Observability: application logs, queue failure visibility, and error reporting.
- Data integrity: use transactions for related scan/project writes where appropriate.

## 8. SSRF and crawler safety requirements

This is a launch blocker, not a later enhancement:
- Permit only HTTP and HTTPS.
- Resolve hostnames and block loopback, private, link-local, multicast, reserved, and cloud metadata IP ranges for IPv4 and IPv6.
- Revalidate every redirect target and DNS resolution to reduce DNS-rebinding risk.
- Block localhost and internal hostnames.
- Set connection/read timeouts and strict response-size limits.
- Limit crawl depth, pages per scan, redirects, and total scan duration.
- Do not execute arbitrary downloaded JavaScript in the initial crawler.
- Apply per-IP and per-account quotas.
- Avoid scanning hosts that opt out or where the user lacks authorization; publish an acceptable-use policy.

## 9. Acceptance criteria

The MVP is ready for a controlled launch when:
1. A valid public URL can be scanned and results are displayed.
2. Invalid, private, internal, or unsafe URLs are rejected.
3. A user can register, verify their email, and save a website.
4. A scheduled scan runs from a queue without holding a web request open.
5. Scan history correctly distinguishes scan failure from detected site issues.
6. A new SEO issue can trigger an email notification according to settings.
7. Uptime checks run at the plan's configured interval and store timestamp, result, HTTP status, and response time.
8. The system declares an outage only after the configured consecutive-failure threshold and sends a recovery notification when checks recover.
9. SSL checks store certificate expiry/validation details and send configured expiry milestone alerts.
10. Monitoring-service failures are distinguished from confirmed site outages.
11. Plan limits are enforced on the server, not only in the UI.
12. One account cannot access another account's projects or reports.
13. Queue failures and unexpected errors are logged.
14. The app has a privacy policy, terms, acceptable-use policy, and contact channel.

## 10. Launch metrics

Track:
- Visitor-to-scan conversion.
- Scan completion rate.
- Scan-to-registration conversion.
- Percentage of registered users who add a project.
- Weekly active monitored projects.
- Alert delivery success rate.
- Trial/free-to-paid conversion.
- Cancellation and churn reasons.
- Average scan cost and queue duration.

## 11. Dependencies and assumptions

- One backend framework is selected before implementation.
- Email delivery credentials are available.
- Public websites are the only scan targets.
- Initial launch supports English.
- Subscription prices and quotas are hypotheses to test, not established market rates.
