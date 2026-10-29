import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'sitepulse-commercial-saas-hmac-secret-key-2026';

export interface AuthPayload {
  userId: string;
  email: string;
  role: 'user' | 'superadmin';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'superadmin';
  status: 'active' | 'suspended';
  planId: 'free' | 'starter' | 'pro' | 'agency';
  maxSites: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(key, 'hex'));
  } catch {
    return false;
  }
}

export function signToken(payload: AuthPayload, expiresInHours = 72): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInHours * 3600;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) return null;

    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return { userId: decoded.userId, email: decoded.email, role: decoded.role || 'user' };
  } catch {
    return null;
  }
}

/**
 * Strict authentication middleware.
 * Verifies Bearer JWT token, ensures user is active (not suspended), and attaches user to request.
 * Rejects unauthenticated requests with HTTP 401.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'] || (req.headers['x-auth-token'] as string);
  let token = '';

  if (typeof authHeader === 'string') {
    token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in to access your dashboard.' });
    return;
  }

  const verified = verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
    return;
  }

  const user = await db.getUserById(verified.userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Account suspended by administrator. Please contact support.' });
    return;
  }

  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    planId: user.planId,
    maxSites: user.maxSites,
  };

  next();
}

export const requireStrictAuth = requireAuth;

/**
 * Superadmin-only guard.
 * Rejects non-superadmins with HTTP 403 Forbidden.
 */
export async function requireSuperadmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'superadmin') {
      res.status(403).json({ error: 'Access denied: Superadmin privileges required.' });
      return;
    }
    next();
  });
}
