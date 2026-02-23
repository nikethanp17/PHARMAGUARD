import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
    userId: string;
    type: 'access' | 'refresh';
}

// ── Sign ──────────────────────────────────────────────────────────────────────

export function signAccessToken(userId: string): string {
    const options: SignOptions = { expiresIn: env.accessTokenExpiresIn as SignOptions['expiresIn'] };
    return jwt.sign({ userId, type: 'access' } satisfies TokenPayload, env.accessTokenSecret, options);
}

export function signRefreshToken(userId: string): string {
    const options: SignOptions = { expiresIn: env.refreshTokenExpiresIn as SignOptions['expiresIn'] };
    return jwt.sign({ userId, type: 'refresh' } satisfies TokenPayload, env.refreshTokenSecret, options);
}

// ── Verify ────────────────────────────────────────────────────────────────────

export function verifyAccessToken(token: string): TokenPayload {
    const payload = jwt.verify(token, env.accessTokenSecret) as TokenPayload;
    if (payload.type !== 'access') throw new Error('Invalid token type');
    return payload;
}

export function verifyRefreshToken(token: string): TokenPayload {
    const payload = jwt.verify(token, env.refreshTokenSecret) as TokenPayload;
    if (payload.type !== 'refresh') throw new Error('Invalid token type');
    return payload;
}

// ── Cookie Options ─────────────────────────────────────────────────────────────

export const accessCookieOptions = (rememberMe = false) => ({
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000, // 30 days or 15 min
    path: '/',
});

export const refreshCookieOptions = (rememberMe = false) => ({
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
    maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
});

export const clearCookieOptions = () => ({
    httpOnly: true,
    secure: env.isProd,
    sameSite: 'strict' as const,
});
