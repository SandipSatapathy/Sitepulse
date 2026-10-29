# Design System & Visual Authority

<!-- impeccable:design-schema 1 -->

## Design Direction: Precision Pulse

SitePulse communicates vigilance, diagnostic precision, and trust. It eschews generic dashboard templates in favor of a focused, high-contrast diagnostic cockpit.

### Mode Mapping
- **Public Scanner / Landing Page:** `Persuade` — Instant discovery, zero-friction scan bar, real-time diagnostic progress, high-contrast results preview, seamless transition to project activation.
- **Monitoring Cockpit & Project Detail:** `Operate` — Maximum scanability, instant status awareness, distinct status indicators (Up / Down / Check Failed), latency sparklines, SSL expiry badges.
- **Client Report:** `Read / Persuade` — Crisp, executive-ready diagnostic summary for agency clients, actionable remediation recommendations, export-ready layout.

---

## 1. Palette & Surface Tokens

### Dark Mode (Primary Console)
- **Canvas Ground:** `hsl(222, 47%, 7%)` (`#0a0f1d`)
- **Surface Elevation 1 (Cards, Tables):** `hsl(222, 40%, 11%)` (`#111827`)
- **Surface Elevation 2 (Hover, Modals):** `hsl(222, 35%, 16%)` (`#1b2436`)
- **Border Subtle:** `hsl(222, 25%, 20%)` (`#232f46`)
- **Border Focus / Glow:** `hsl(187, 92%, 45%)` (`#06b6d4`)

### Light Mode (Client Report / Reader)
- **Canvas Ground:** `hsl(210, 40%, 98%)` (`#f8fafc`)
- **Surface Elevation 1:** `hsl(0, 0%, 100%)` (`#ffffff`)
- **Border Subtle:** `hsl(214, 32%, 91%)` (`#e2e8f0`)

### Semantic Indicators (Strict Functional Color)
- **Pulse Active / Online (`up`):** `hsl(158, 85%, 42%)` (`#10b981`)
- **Outage Confirmed (`down`):** `hsl(350, 89%, 60%)` (`#f43f5e`)
- **Degraded / Warning (`warning`):** `hsl(38, 92%, 50%)` (`#f59e0b`)
- **Worker / Check Failure (`unknown`):** `hsl(215, 20%, 55%)` (`#64748b`) — *Never conflated with site outage*
- **Primary Brand Accent:** `hsl(187, 92%, 45%)` (`#06b6d4`) (Cyan Pulse)
- **Secondary Accent:** `hsl(262, 83%, 58%)` (`#8b5cf6`) (Deep Indigo)

---

## 2. Typography

- **Display & Section Headers:** `Plus Jakarta Sans` or modern sans-serif system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`) with tight tracking (`letter-spacing: -0.025em`) and crisp weights (600, 700).
- **Body & Controls:** Clean sans-serif with readable line height (`1.5`).
- **Telemetry & Diagnostics (Response time, IP, Status codes, SSL fingerprints):** `JetBrains Mono` / `SF Mono` / `Consolas` (`font-mono`, tabular numbers).

---

## 3. Component Specifications

### Status Badges
- Pill shape with subtle glowing ping indicator on live status.
- `.badge-up`: Emerald text with `bg-emerald-500/10` and `border-emerald-500/20`.
- `.badge-down`: Rose text with `bg-rose-500/10` and `border-rose-500/20`.
- `.badge-check-failed`: Slate text with `bg-slate-500/10` and `border-slate-500/20`.

### Diagnostic Metric Cards
- Bold metric value (e.g., `99.94%`, `184ms`, `28 days left`).
- Sparkline or dot-matrix timeline of recent checks.
- Explanatory footnote specifying the measurement window (e.g., "Calculated over past 24 hours based on 5-min checks").

### Issue & Remediation Cards
- Severity tag (`Critical`, `Warning`, `Info`).
- Issue title in plain English (e.g., `Missing Meta Description`, `3 Broken Internal Links Detected`).
- Affected URL with copy button.
- Remediation guidance block (`How to fix:`).
