import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { env } from '../config/env';

// ── Helmet ────────────────────────────────────────────────────────────────────

export function applyHelmet(app: Application): void {
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", 'https://fonts.googleapis.com'],
                    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                    imgSrc: ["'self'", 'data:'],
                    connectSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    objectSrc: ["'none'"],
                },
            },
            crossOriginEmbedderPolicy: false,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true,
            },
        })
    );
}

// ── CORS ──────────────────────────────────────────────────────────────────────

export function applyCors(app: Application): void {
    app.use(
        cors({
            origin: [env.clientUrl, 'http://localhost:3000', 'http://localhost:5173'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        })
    );
    app.options('*', cors());
}

// ── Rate Limiting ─────────────────────────────────────────────────────────────

export const globalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
    skip: (req) => req.method === 'OPTIONS',
});

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // 10 login attempts per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Please wait 15 minutes.' },
});

export const sendEmailRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 reset emails per hour
    message: { success: false, message: 'Too many password reset requests. Please wait 1 hour.' },
});

// ── NoSQL Injection Prevention ────────────────────────────────────────────────

export function applyMongoSanitize(app: Application): void {
    app.use(mongoSanitize({ replaceWith: '_' }));
}

// ── XSS Protection (manual - strip dangerous chars) ──────────────────────────
// xss-clean npm package is no longer maintained; use this custom approach instead

export function xssClean(req: Request, _res: Response, next: NextFunction): void {
    const sanitize = (obj: unknown): unknown => {
        if (typeof obj === 'string') {
            return obj
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        if (typeof obj === 'object' && obj !== null) {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(obj)) {
                result[key] = sanitize(val);
            }
            return result;
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query) as typeof req.query;
    next();
}

// ── Error Handler ─────────────────────────────────────────────────────────────

export function errorHandler(
    err: Error & { statusCode?: number; code?: number | string },
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error(`[ERROR] ${err.name}: ${err.message}`);

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = err.message.match(/index: (\w+)_/)?.[1] || 'field';
        res.status(409).json({ success: false, message: `An account with this ${field} already exists.` });
        return;
    }

    // Mongoose validation
    if (err.name === 'ValidationError') {
        res.status(400).json({ success: false, message: err.message });
        return;
    }

    // JWT errors handled in middleware — pass through others
    const status = err.statusCode ?? 500;
    const message = status === 500 && env.isProd ? 'Internal server error.' : err.message;
    res.status(status).json({ success: false, message });
}
