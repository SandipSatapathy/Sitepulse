-- ==============================================================================
-- SitePulse Commercial SaaS Database Schema for PostgreSQL
-- Run this script in pgAdmin, psql, or via `npm run db:migrate`
-- ==============================================================================

-- 1. Users & Tenant Accounts
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'user',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  plan_id VARCHAR(32) NOT NULL DEFAULT 'free',
  plan_name VARCHAR(64) NOT NULL DEFAULT 'Free Hobby',
  max_sites INTEGER NOT NULL DEFAULT 1,
  uptime_interval_minutes INTEGER NOT NULL DEFAULT 30,
  billing_cycle VARCHAR(32) NOT NULL DEFAULT 'monthly',
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- 2. Monitored Projects / Websites
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  uptime_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  uptime_interval_minutes INTEGER NOT NULL DEFAULT 15,
  consecutive_failure_threshold INTEGER NOT NULL DEFAULT 2,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_uptime_state VARCHAR(32) NOT NULL DEFAULT 'up',
  last_uptime_check_at TIMESTAMPTZ,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 3. Uptime Telemetry Checks
CREATE TABLE IF NOT EXISTS uptime_checks (
  id BIGSERIAL PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  outcome VARCHAR(32) NOT NULL,
  http_status INTEGER,
  response_time_ms INTEGER NOT NULL,
  failure_code VARCHAR(64),
  failure_detail TEXT
);
CREATE INDEX IF NOT EXISTS idx_uptime_checks_project_time ON uptime_checks(project_id, checked_at DESC);

-- 4. SSL Certificate Audits
CREATE TABLE IF NOT EXISTS ssl_certificates (
  project_id VARCHAR(64) PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hostname VARCHAR(255) NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT TRUE,
  issuer TEXT,
  subject TEXT,
  valid_from TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER,
  is_expired BOOLEAN NOT NULL DEFAULT FALSE,
  milestone_alert_due INTEGER,
  failure_code VARCHAR(64),
  failure_detail TEXT
);

-- 5. Diagnostic Scans (SEO, Performance & Security)
CREATE TABLE IF NOT EXISTS scans (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  project_id VARCHAR(64) REFERENCES projects(id) ON DELETE SET NULL,
  requested_url TEXT NOT NULL,
  status VARCHAR(32) NOT NULL,
  health_score INTEGER,
  pages_checked INTEGER NOT NULL DEFAULT 1,
  issue_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  failure_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  audit_result JSONB,
  findings JSONB
);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON scans(project_id);

-- 6. Unguessable Public Shared Reports
CREATE TABLE IF NOT EXISTS report_shares (
  id VARCHAR(64) PRIMARY KEY,
  scan_id VARCHAR(64) NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  token VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_report_shares_token ON report_shares(token);

-- 7. Outage & Degradation Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  project_name VARCHAR(255) NOT NULL,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  status_code INTEGER,
  cause TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ,
  duration_minutes INTEGER
);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_project_status ON incidents(project_id, status);

-- 8. Multi-Channel Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  alert_email VARCHAR(255) NOT NULL,
  slack_webhook TEXT NOT NULL DEFAULT '',
  discord_webhook TEXT NOT NULL DEFAULT '',
  notify_on_outage BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_recovery BOOLEAN NOT NULL DEFAULT TRUE,
  notify_on_ssl_expiry BOOLEAN NOT NULL DEFAULT TRUE,
  ssl_alert_milestones JSONB NOT NULL DEFAULT '[30, 14, 7, 1]'::jsonb
);

-- 9. Stripe Replay Protection & Event Idempotency
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
