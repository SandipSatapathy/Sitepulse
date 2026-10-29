import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { scanRouter } from './routes/scanRoutes.js';
import { projectRouter } from './routes/projectRoutes.js';
import { reportRouter } from './routes/reportRoutes.js';
import { saasRouter } from './routes/saasRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { paymentRouter } from './routes/paymentRoutes.js';
import { adminRouter } from './routes/adminRoutes.js';
import { testConnection } from './db/index.js';
import { startWorkerLoop } from './worker.js';
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
// Hardened CORS Origin Controls (SEC-06)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:4000',
    ];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not permitted by CORS policy`));
    },
    credentials: true,
}));
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf.toString('utf8');
    },
}));
// Express Rate Limiting (Multi-tier: Global, Auth & Scanner)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 150, // max 150 requests per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP. Please try again after 15 minutes.' },
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // max 20 login/register attempts per 15 minutes
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});
const scanLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    limit: 10, // max 10 scan checks per minute
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Scan rate limit exceeded: Maximum 10 scans per minute permitted.' },
});
// Apply global rate limit to all /api endpoints
app.use('/api', globalLimiter);
// Request logging (minimal)
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});
// Health check
app.get('/api/health', async (_req, res) => {
    const dbHealth = await testConnection();
    res.json({
        status: dbHealth.ok ? 'ok' : 'degraded',
        service: 'SitePulse API & Monitoring Engine',
        database: {
            type: 'PostgreSQL',
            connected: dbHealth.ok,
            name: dbHealth.database || null,
            message: dbHealth.message,
        },
        timestamp: new Date().toISOString(),
    });
});
// Mount Routes with specialized rate limiters
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/scan', scanLimiter, scanRouter);
app.use('/api/stripe', paymentRouter);
app.use('/api/projects', projectRouter);
app.use('/api/reports', reportRouter);
app.use('/api/admin', adminRouter);
app.use('/api', saasRouter);
// Error handler
app.use((err, _req, res, _next) => {
    console.error('[SitePulse Error]:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});
const server = app.listen(PORT, async () => {
    console.log(`⚡ SitePulse server listening on http://localhost:${PORT}`);
    const dbHealth = await testConnection();
    if (dbHealth.ok) {
        console.log(`📦 [Database] ${dbHealth.message}`);
    }
    else {
        console.warn(`⚠️ [Database Warning] ${dbHealth.message}`);
        console.warn('💡 Run `npm run db:setup` once PostgreSQL is created to apply schema & seeds.');
    }
    if (process.env.RUN_INLINE_WORKER !== 'false') {
        startWorkerLoop();
    }
    else {
        console.log('ℹ️ Inline worker disabled. Standalone monitoring worker enabled via `npm run worker`.');
    }
});
// Graceful termination
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server.');
    server.close(() => process.exit(0));
});
