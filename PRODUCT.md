# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React (Vite) + Tailwind CSS + Vanilla HTML/CSS on frontend; Node.js + TypeScript (Express) on backend; PostgreSQL database; transactional SMTP for email alerts.

## Users

- **Freelance Web Developers:** Maintain multiple client websites; need proactive alerts for broken links, missing meta tags, outages, and expiring TLS certificates without manually checking every URL daily.
- **SEO Consultants:** Need rapid baseline technical audit reports and a repeatable mechanism to demonstrate measurable fixes to clients.
- **Small Agencies:** Monitor client domains, generate unguessable shareable client audit reports, and avoid embarrassing client-reported outages.
- **Small Business Owners:** Want understandable, jargon-free explanations of site health issues and email notices without enterprise complexity.

## Product Purpose

SitePulse is a lightweight website health, uptime, and SSL monitoring SaaS. A visitor can run a free, bounded SEO and security scan on any public URL without signing up, then seamlessly register to save sites as monitored projects, configure automated 15-minute or 5-minute uptime checks, receive advance SSL expiry alerts (30, 14, 7, 1 day), run weekly SEO scans, and share reports with clients.

Success means:
1. Zero friction for first public scan.
2. High conversion from anonymous scan to registered project.
3. Dependable uptime and SSL monitoring without false positives (consecutive-failure outage threshold).
4. Reliable server-enforced quotas across Free, Starter, Pro, and Agency tiers.

## Positioning

Unlike bloated enterprise SEO suites (Ahrefs, Semrush) or complex devops monitoring tools (Datadog, New Relic), SitePulse provides a unified, lightweight, client-ready pulse check combining technical SEO health, TLS validity, and site availability in one clean dashboard.

## Operating Context

- Target users manage 1 to 30 public web domains.
- Scans run asynchronously in worker pools to prevent blocking web requests.
- Strict SSRF protection and DNS pre-resolution prevent probing private, loopback, or cloud-metadata IPs.
- Worker failures are strictly isolated from confirmed website outages.

## Capabilities and Constraints

- **Public Scanner:** Accepts valid HTTP/HTTPS URLs, normalizes URL, validates syntax, crawls bounded same-origin pages, checks HTTP status, title, meta description, H1, image alt attributes, and broken internal links.
- **Authentication & Projects:** JWT/session authentication, workspace project CRUD, status tracking.
- **Uptime Monitoring:** Configurable check interval (15m on Starter, 5m on Pro/Agency), 2 consecutive failed checks required before confirming an outage, idempotent state transitions.
- **SSL Certificate Monitoring:** Daily TLS handshake inspection, extracting expiry, issuer, and hostname match; alerts at 30, 14, 7, and 1 day milestones.
- **Client Reports:** Unguessable token-based public share links with optional expiration and revocation.
- **Entitlements:** Server-side plan enforcement for monitored site counts, check intervals, and history retention.

## Brand Commitments

- **Name:** SitePulse
- **Tone & Voice:** Clear, vigilant, diagnostic, trustworthy, reassuring, non-alarmist.
- **Visual Identity:** Clean dark/light theme, high-contrast status pills (up/down/degraded), crisp data visualization, zero clutter.

## Evidence on Hand

- `docs/sitepulse_prd.md`: Product Requirements Document v1.0
- `docs/sitepulse_mvp_scope.md`: MVP Scope and Acceptance Criteria v1.0
- `docs/sitepulse_implementation_plan.md`: Technical Implementation Plan v1.0
- `.archify/architecture-sitepulse-20261028-090500/sitepulse-architecture.html`: Showcase-verified architecture specification.

## Product Principles

1. **Clarity Over Jargon:** Explain technical findings in plain English with concrete remediation steps.
2. **Never Cry Wolf:** Distinguish check/worker errors from true site outages using consecutive failure thresholds.
3. **Safety First:** Strict SSRF pre-flight and DNS validation on all target destinations.
4. **Frictionless Discovery:** Immediate value on the homepage scanner before demanding signup.
5. **Enforce at the Boundary:** Plan quotas and security checks are enforced server-side.

## Accessibility & Inclusion

- WCAG 2.1 AA contrast ratios for all status indicators and typography.
- Full keyboard navigation for scanner inputs, modal dialogues, and tabular reports.
- Explicit screen-reader aria labels on uptime sparklines and severity badges.
