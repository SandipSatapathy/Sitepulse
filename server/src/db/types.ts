import { ScanAuditResult, Finding } from '../scanner/parser.js';
import { UptimeCheckResult } from '../monitor/uptime.js';
import { SslCheckResult } from '../monitor/ssl.js';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'superadmin';
  status: 'active' | 'suspended';
  planId: 'free' | 'starter' | 'pro' | 'agency';
  planName: string;
  maxSites: number;
  uptimeIntervalMinutes: number;
  billingCycle: 'monthly' | 'annual';
  stripeCustomerId?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'superadmin';
  status: 'active' | 'suspended';
  planId: 'free' | 'starter' | 'pro' | 'agency';
  planName: string;
  maxSites: number;
  uptimeIntervalMinutes: number;
  billingCycle: 'monthly' | 'annual';
  stripeCustomerId?: string | null;
  currentSitesCount: number;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  baseUrl: string;
  status: 'active' | 'paused';
  uptimeEnabled: boolean;
  uptimeIntervalMinutes: number;
  consecutiveFailureThreshold: number;
  consecutiveFailures: number;
  lastUptimeState: 'up' | 'down' | 'check_failed';
  lastUptimeCheckAt: string | null;
  lastScanAt: string | null;
  createdAt: string;
}

export interface ScanRecord {
  id: string;
  userId?: string | null;
  projectId: string | null;
  requestedUrl: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  healthScore: number | null;
  pagesChecked: number;
  issueCount: number;
  durationMs: number | null;
  failureMessage?: string;
  startedAt: string;
  completedAt: string | null;
  auditResult?: ScanAuditResult;
  findings: Finding[];
}

export interface ReportShareRecord {
  id: string;
  scanId: string;
  token: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface IncidentRecord {
  id: string;
  userId?: string;
  projectId: string;
  projectName: string;
  type: 'outage' | 'ssl_expiry' | 'ssl_invalid';
  status: 'open' | 'resolved';
  statusCode: number | null;
  cause: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

export interface NotificationSettings {
  userId?: string;
  emailAlerts: boolean;
  alertEmail: string;
  slackWebhook: string;
  discordWebhook: string;
  notifyOnOutage: boolean;
  notifyOnRecovery: boolean;
  notifyOnSslExpiry: boolean;
  sslAlertMilestones: number[];
}

export const PLANS_META: Record<string, { name: string; maxSites: number; interval: number; priceMonthly: number }> = {
  free: { name: 'Free Hobby', maxSites: 1, interval: 30, priceMonthly: 0 },
  starter: { name: 'Starter Pro (3 Sites)', maxSites: 3, interval: 15, priceMonthly: 499 },
  pro: { name: 'Professional (15 Sites)', maxSites: 15, interval: 5, priceMonthly: 1499 },
  agency: { name: 'Agency Scale (50 Sites)', maxSites: 50, interval: 1, priceMonthly: 2499 },
};

