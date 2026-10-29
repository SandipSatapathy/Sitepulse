/**
 * SitePulse PostgreSQL Database Layer
 * Clean, decoupled repository facade with zero SQLite dependencies.
 */
import { pool, query, testConnection } from './client.js';
import { userRepository } from './repositories/userRepository.js';
import { projectRepository } from './repositories/projectRepository.js';
import { uptimeRepository } from './repositories/uptimeRepository.js';
import { sslRepository } from './repositories/sslRepository.js';
import { scanRepository } from './repositories/scanRepository.js';
import { incidentRepository } from './repositories/incidentRepository.js';
import { notificationRepository } from './repositories/notificationRepository.js';
import { stripeRepository } from './repositories/stripeRepository.js';

export * from './types.js';
export * from './client.js';
export * from './config.js';
export { runMigrations } from './migrate.js';
export { runSeed } from './seed.js';

class DatabaseFacade {
  // Direct client pool access
  public pool = pool;
  public query = query;
  public testConnection = testConnection;

  // Users & Profiles
  public getUserById = userRepository.getUserById.bind(userRepository);
  public getUserByEmail = userRepository.getUserByEmail.bind(userRepository);
  public createUser = userRepository.createUser.bind(userRepository);
  public updateLastLogin = userRepository.updateLastLogin.bind(userRepository);
  public getUserProfile = userRepository.getUserProfile.bind(userRepository);
  public updateUserPlan = userRepository.updateUserPlan.bind(userRepository);
  public updateStripeCustomerId = userRepository.updateStripeCustomerId.bind(userRepository);
  public getUserByStripeCustomerId = userRepository.getUserByStripeCustomerId.bind(userRepository);
  public getAllUsers = userRepository.getAllUsers.bind(userRepository);
  public updateUserStatus = userRepository.updateUserStatus.bind(userRepository);
  public updateUserRole = userRepository.updateUserRole.bind(userRepository);
  public deleteUser = userRepository.deleteUser.bind(userRepository);
  public getPlatformMetrics = userRepository.getPlatformMetrics.bind(userRepository);

  // Projects
  public getProjects = projectRepository.getProjects.bind(projectRepository);
  public getProject = projectRepository.getProject.bind(projectRepository);
  public createProject = projectRepository.createProject.bind(projectRepository);
  public updateProject = projectRepository.updateProject.bind(projectRepository);
  public deleteProject = projectRepository.deleteProject.bind(projectRepository);

  // Uptime Telemetry
  public recordUptimeCheck = uptimeRepository.recordUptimeCheck.bind(uptimeRepository);
  public getUptimeHistory = uptimeRepository.getUptimeHistory.bind(uptimeRepository);

  // SSL Certificates
  public recordSslCertificate = sslRepository.recordSslCertificate.bind(sslRepository);
  public getSslCertificate = sslRepository.getSslCertificate.bind(sslRepository);

  // Scans & Reports
  public saveScan = scanRepository.saveScan.bind(scanRepository);
  public getScan = scanRepository.getScan.bind(scanRepository);
  public createReportShare = scanRepository.createReportShare.bind(scanRepository);
  public getReportShare = scanRepository.getReportShare.bind(scanRepository);

  // Incidents
  public getIncidents = incidentRepository.getIncidents.bind(incidentRepository);
  public recordIncident = incidentRepository.recordIncident.bind(incidentRepository);
  public createIncident = incidentRepository.createIncident.bind(incidentRepository);
  public resolveOpenIncidents = incidentRepository.resolveOpenIncidents.bind(incidentRepository);

  // Notifications
  public getNotificationSettings = notificationRepository.getNotificationSettings.bind(notificationRepository);
  public updateNotificationSettings = notificationRepository.updateNotificationSettings.bind(notificationRepository);

  // Stripe Events
  public hasProcessedStripeEvent = stripeRepository.hasProcessedStripeEvent.bind(stripeRepository);
  public markStripeEventProcessed = stripeRepository.markStripeEventProcessed.bind(stripeRepository);
}

export const db = new DatabaseFacade();
