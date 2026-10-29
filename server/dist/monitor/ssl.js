import tls from 'node:tls';
import { resolveSafeTarget, createPinnedLookup } from '../scanner/ssrf.js';
const SSL_TIMEOUT_MS = 6000;
/**
 * Inspects the TLS certificate of an HTTPS target using native Node.js TLS socket,
 * with pinned DNS lookup to prevent SSRF DNS rebinding (SEC-01).
 */
export async function probeSslCertificate(targetUrl) {
    const checkedAt = new Date().toISOString();
    let target;
    try {
        target = await resolveSafeTarget(targetUrl);
    }
    catch (err) {
        return {
            checkedAt,
            hostname: targetUrl,
            isValid: false,
            issuer: null,
            subject: null,
            validFrom: null,
            expiresAt: null,
            daysUntilExpiry: null,
            isExpired: false,
            milestoneAlertDue: null,
            failureCode: 'SSRF_BLOCKED',
            failureDetail: err.message,
        };
    }
    const hostname = target.url.hostname;
    const port = target.url.port ? parseInt(target.url.port, 10) : 443;
    return new Promise((resolve) => {
        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                socket.destroy();
                resolve({
                    checkedAt,
                    hostname,
                    isValid: false,
                    issuer: null,
                    subject: null,
                    validFrom: null,
                    expiresAt: null,
                    daysUntilExpiry: null,
                    isExpired: false,
                    milestoneAlertDue: null,
                    failureCode: 'TLS_TIMEOUT',
                    failureDetail: `TLS handshake with ${hostname}:${port} timed out after ${SSL_TIMEOUT_MS / 1000}s`,
                });
            }
        }, SSL_TIMEOUT_MS);
        const socket = tls.connect({
            host: hostname,
            port,
            servername: hostname, // SNI extension
            rejectUnauthorized: false, // Inspect certificate even if self-signed or expired
            lookup: createPinnedLookup(target.safeIp, target.family), // Pin IP against SSRF
        }, () => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            try {
                const cert = socket.getPeerCertificate();
                const authorized = socket.authorized;
                const authError = socket.authorizationError;
                socket.end();
                if (!cert || Object.keys(cert).length === 0) {
                    return resolve({
                        checkedAt,
                        hostname,
                        isValid: false,
                        issuer: null,
                        subject: null,
                        validFrom: null,
                        expiresAt: null,
                        daysUntilExpiry: null,
                        isExpired: false,
                        milestoneAlertDue: null,
                        failureCode: 'NO_CERTIFICATE',
                        failureDetail: 'The remote host did not provide a TLS certificate.',
                    });
                }
                const validFrom = cert.valid_from ? new Date(cert.valid_from).toISOString() : null;
                const expiresAt = cert.valid_to ? new Date(cert.valid_to).toISOString() : null;
                const expiryTime = expiresAt ? new Date(expiresAt).getTime() : 0;
                const now = Date.now();
                const daysUntilExpiry = expiresAt ? Math.floor((expiryTime - now) / (1000 * 60 * 60 * 24)) : null;
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
                // Milestone check: 30, 14, 7, 1
                let milestoneAlertDue = null;
                if (daysUntilExpiry !== null) {
                    if (daysUntilExpiry <= 1 && daysUntilExpiry >= 0)
                        milestoneAlertDue = 1;
                    else if (daysUntilExpiry <= 7 && daysUntilExpiry > 1)
                        milestoneAlertDue = 7;
                    else if (daysUntilExpiry <= 14 && daysUntilExpiry > 7)
                        milestoneAlertDue = 14;
                    else if (daysUntilExpiry <= 30 && daysUntilExpiry > 14)
                        milestoneAlertDue = 30;
                }
                // Format issuer name
                const toStr = (val) => (Array.isArray(val) ? val.join(', ') : (val || ''));
                let issuerStr = 'Unknown';
                if (cert.issuer) {
                    const org = toStr(cert.issuer.O);
                    const cn = toStr(cert.issuer.CN);
                    issuerStr = org ? `${org} (${cn})` : (cn || 'Unknown');
                }
                // Format subject
                const subjectStr = toStr(cert.subject?.CN) || hostname;
                resolve({
                    checkedAt,
                    hostname,
                    isValid: authorized && !isExpired,
                    issuer: issuerStr,
                    subject: subjectStr,
                    validFrom,
                    expiresAt,
                    daysUntilExpiry,
                    isExpired,
                    milestoneAlertDue,
                    failureCode: authorized ? undefined : (authError?.message || 'UNAUTHORIZED_CERTIFICATE'),
                });
            }
            catch (err) {
                resolve({
                    checkedAt,
                    hostname,
                    isValid: false,
                    issuer: null,
                    subject: null,
                    validFrom: null,
                    expiresAt: null,
                    daysUntilExpiry: null,
                    isExpired: false,
                    milestoneAlertDue: null,
                    failureCode: 'CERT_PARSE_ERROR',
                    failureDetail: err.message,
                });
            }
        });
        socket.on('error', (err) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            resolve({
                checkedAt,
                hostname,
                isValid: false,
                issuer: null,
                subject: null,
                validFrom: null,
                expiresAt: null,
                daysUntilExpiry: null,
                isExpired: false,
                milestoneAlertDue: null,
                failureCode: 'SOCKET_ERROR',
                failureDetail: err.message || 'TLS connection error',
            });
        });
    });
}
