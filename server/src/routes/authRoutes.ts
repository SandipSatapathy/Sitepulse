import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { hashPassword, verifyPassword, signToken, requireAuth, AuthenticatedRequest } from '../auth/index.js';

export const authRouter = Router();

/**
 * POST /api/auth/register
 * Register a new commercial user tenant with dedicated data boundary.
 */
authRouter.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email address is required.' });
    return;
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    return;
  }

  const existing = await db.getUserByEmail(email.trim());
  if (existing) {
    res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
    return;
  }

  const userName = (name && typeof name === 'string' ? name.trim() : email.split('@')[0]) || 'User';
  const passwordHash = hashPassword(password);

  const user = await db.createUser({
    name: userName,
    email: email.trim().toLowerCase(),
    passwordHash,
    role: 'user',
  });

  await db.updateLastLogin(user.id);
  const token = signToken({ userId: user.id, email: user.email, role: 'user' });
  const profile = await db.getUserProfile(user.id);

  res.status(201).json({
    success: true,
    token,
    user: profile,
  });
});

/**
 * POST /api/auth/login
 * Authenticate with email & password and retrieve session token.
 */
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = await db.getUserByEmail(email.trim());
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status === 'suspended') {
    res.status(403).json({ error: 'Your account has been suspended by an administrator. Please contact support.' });
    return;
  }

  const isMatch = verifyPassword(password, user.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  await db.updateLastLogin(user.id);
  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  const profile = await db.getUserProfile(user.id);

  res.json({
    success: true,
    token,
    user: profile,
  });
});

/**
 * GET /api/auth/me
 * Retrieve profile of authenticated user.
 */
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.user!;
  const profile = await db.getUserProfile(user.id);
  res.json(profile);
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Logged out successfully.' });
});
