import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/token.service';

// Extend Express Request to carry user info
declare global {
    namespace Express {
        interface Request {
            user?: { userId: string };
        }
    }
}

/**
 * requireAuth middleware
 * Reads JWT from:
 *   1. HTTP-only cookie `access_token`  (preferred)
 *   2. Authorization: Bearer <token>    (fallback for API clients)
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    try {
        let token: string | undefined;

        // 1. Cookie
        if (req.cookies?.access_token) {
            token = req.cookies.access_token as string;
        }

        // 2. Bearer header
        if (!token) {
            const authHeader = req.headers['authorization'];
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.slice(7);
            }
        }

        if (!token) {
            res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
            return;
        }

        const payload = verifyAccessToken(token);
        req.user = { userId: payload.userId };
        next();
    } catch (err: any) {
        const isExpired = err.name === 'TokenExpiredError';
        res.status(401).json({
            success: false,
            message: isExpired ? 'Session expired. Please refresh your token.' : 'Invalid token.',
            code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        });
    }
}

/**
 * optionalAuth middleware
 * Attaches req.user if a valid token is present, but doesn't block if not.
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
        const token = req.cookies?.access_token as string | undefined;
        if (token) {
            const payload = verifyAccessToken(token);
            req.user = { userId: payload.userId };
        }
    } catch {
        // Ignore invalid tokens in optional auth
    }
    next();
}
