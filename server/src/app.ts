import 'express-async-errors';
import express, { Application, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import {
    applyHelmet,
    applyCors,
    globalRateLimit,
    applyMongoSanitize,
    xssClean,
    errorHandler,
} from './middleware/security';

export function createApp(): Application {
    const app = express();

    // ── Trust proxy (for accurate IPs behind load balancers / Netlify) ──────────
    app.set('trust proxy', 1);

    // ── Security middleware ──────────────────────────────────────────────────────
    applyHelmet(app);
    applyCors(app);

    // ── Body parsing ─────────────────────────────────────────────────────────────
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));
    app.use(cookieParser());

    // ── Sanitization ─────────────────────────────────────────────────────────────
    applyMongoSanitize(app);
    app.use(xssClean);

    // ── Rate limiting ─────────────────────────────────────────────────────────────
    app.use(globalRateLimit);

    // ── Health check ──────────────────────────────────────────────────────────────
    app.get('/health', (_req: Request, res: Response) => {
        res.json({ status: 'ok', service: 'pharmaguard-auth', timestamp: new Date().toISOString() });
    });

    // ── Routes ────────────────────────────────────────────────────────────────────
    app.use('/api/auth', authRouter);

    // ── 404 handler ───────────────────────────────────────────────────────────────
    app.use((_req: Request, res: Response) => {
        res.status(404).json({ success: false, message: 'Endpoint not found.' });
    });

    // ── Global error handler ──────────────────────────────────────────────────────
    app.use(errorHandler);

    return app;
}
