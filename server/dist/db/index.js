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
    pool = pool;
    query = query;
    testConnection = testConnection;
    // Users & Profiles
    getUserById = userRepository.getUserById.bind(userRepository);
    getUserByEmail = userRepository.getUserByEmail.bind(userRepository);
    createUser = userRepository.createUser.bind(userRepository);
    updateLastLogin = userRepository.updateLastLogin.bind(userRepository);
    getUserProfile = userRepository.getUserProfile.bind(userRepository);
    updateUserPlan = userRepository.updateUserPlan.bind(userRepository);
    updateStripeCustomerId = userRepository.updateStripeCustomerId.bind(userRepository);
    getUserByStripeCustomerId = userRepository.getUserByStripeCustomerId.bind(userRepository);
    getAllUsers = userRepository.getAllUsers.bind(userRepository);
    updateUserStatus = userRepository.updateUserStatus.bind(userRepository);
    updateUserRole = userRepository.updateUserRole.bind(userRepository);
    deleteUser = userRepository.deleteUser.bind(userRepository);
    getPlatformMetrics = userRepository.getPlatformMetrics.bind(userRepository);
    // Projects
    getProjects = projectRepository.getProjects.bind(projectRepository);
    getProject = projectRepository.getProject.bind(projectRepository);
    createProject = projectRepository.createProject.bind(projectRepository);
    updateProject = projectRepository.updateProject.bind(projectRepository);
    deleteProject = projectRepository.deleteProject.bind(projectRepository);
    // Uptime Telemetry
    recordUptimeCheck = uptimeRepository.recordUptimeCheck.bind(uptimeRepository);
    getUptimeHistory = uptimeRepository.getUptimeHistory.bind(uptimeRepository);
    // SSL Certificates
    recordSslCertificate = sslRepository.recordSslCertificate.bind(sslRepository);
    getSslCertificate = sslRepository.getSslCertificate.bind(sslRepository);
    // Scans & Reports
    saveScan = scanRepository.saveScan.bind(scanRepository);
    getScan = scanRepository.getScan.bind(scanRepository);
    createReportShare = scanRepository.createReportShare.bind(scanRepository);
    getReportShare = scanRepository.getReportShare.bind(scanRepository);
    // Incidents
    getIncidents = incidentRepository.getIncidents.bind(incidentRepository);
    recordIncident = incidentRepository.recordIncident.bind(incidentRepository);
    createIncident = incidentRepository.createIncident.bind(incidentRepository);
    resolveOpenIncidents = incidentRepository.resolveOpenIncidents.bind(incidentRepository);
    // Notifications
    getNotificationSettings = notificationRepository.getNotificationSettings.bind(notificationRepository);
    updateNotificationSettings = notificationRepository.updateNotificationSettings.bind(notificationRepository);
    // Stripe Events
    hasProcessedStripeEvent = stripeRepository.hasProcessedStripeEvent.bind(stripeRepository);
    markStripeEventProcessed = stripeRepository.markStripeEventProcessed.bind(stripeRepository);
}
export const db = new DatabaseFacade();
