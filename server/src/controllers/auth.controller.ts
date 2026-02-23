import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import User from '../models/User';
import {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    accessCookieOptions,
    refreshCookieOptions,
    clearCookieOptions,
} from '../services/token.service';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

// ── Zod Validation Schemas ─────────────────────────────────────────────────────

const registerSchema = z.object({
    fullName: z.string().min(2).max(100).trim(),
    email: z.string().email().toLowerCase().trim(),
    username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
    phone: z.string().trim().optional(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(72)
        .regex(/[A-Z]/, 'Must contain an uppercase letter')
        .regex(/[a-z]/, 'Must contain a lowercase letter')
        .regex(/[0-9]/, 'Must contain a number')
        .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
    agreedToTerms: z.boolean().refine(v => v === true, 'You must agree to the Terms & Conditions'),
    hipaaConsent: z.boolean().refine(v => v === true, 'HIPAA consent is required'),
}).refine(d => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

const loginSchema = z.object({
    identifier: z.string().min(1).trim(),
    password: z.string().min(1),
    rememberMe: z.boolean().default(false),
});

const forgotPasswordSchema = z.object({
    email: z.string().email().toLowerCase().trim(),
});

const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z
        .string()
        .min(8)
        .max(72)
        .regex(/[A-Z]/)
        .regex(/[a-z]/)
        .regex(/[0-9]/)
        .regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
    confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setAuthCookies(res: Response, userId: string, rememberMe: boolean): { accessToken: string; refreshToken: string } {
    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);
    res.cookie('access_token', accessToken, accessCookieOptions(rememberMe));
    res.cookie('refresh_token', refreshToken, refreshCookieOptions(rememberMe));
    return { accessToken, refreshToken };
}

function clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', clearCookieOptions());
    res.clearCookie('refresh_token', { ...clearCookieOptions(), path: '/api/auth/refresh' });
}

function getUserAgent(req: Request): string {
    return req.headers['user-agent']?.slice(0, 200) ?? 'unknown';
}

// ── POST /api/auth/register ───────────────────────────────────────────────────

export async function register(req: Request, res: Response): Promise<void> {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
    }

    const { fullName, email, username, phone, password } = parsed.data;

    const existing = await User.findOne({ $or: [{ email }, { username: username.toLowerCase() }] });
    if (existing) {
        const field = existing.email === email ? 'email' : 'username';
        res.status(409).json({ success: false, message: `An account with this ${field} already exists.` });
        return;
    }

    const user = new User({ fullName, email, username: username.toLowerCase(), phone, passwordHash: password, role: 'patient' });
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email (non-blocking)
    sendVerificationEmail(email, fullName, verificationToken).catch(err =>
        console.error('Email send failed:', err)
    );

    const { accessToken, refreshToken } = setAuthCookies(res, user.id, false);

    // Store refresh token
    await User.findByIdAndUpdate(user.id, {
        $push: { refreshTokens: { token: refreshToken, userAgent: getUserAgent(req), ip: req.ip } },
        lastLoginAt: new Date(),
    });

    res.status(201).json({
        success: true,
        message: 'Account created! Please check your email to verify your address.',
        user: user.toSafeObject(),
        accessToken, // Also returned for SPA usage (in addition to cookie)
    });
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

export async function login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
    }

    const { identifier, password, rememberMe } = parsed.data;
    const normalizedId = identifier.toLowerCase().trim();

    const user = await User.findOne({
        $or: [{ email: normalizedId }, { username: normalizedId }, { phone: identifier }],
    }).select('+passwordHash +refreshTokens +loginAttempts +lockUntil');

    // Generic message to prevent user enumeration
    const invalidCreds = { success: false, message: 'Invalid credentials. Please check your details and try again.' };

    if (!user) {
        res.status(401).json(invalidCreds);
        return;
    }

    if (user.isLocked()) {
        const remainingMs = (user.lockUntil?.getTime() ?? 0) - Date.now();
        const mins = Math.ceil(remainingMs / 60000);
        res.status(429).json({
            success: false,
            message: `Account temporarily locked after too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`,
            code: 'ACCOUNT_LOCKED',
            lockedUntil: user.lockUntil,
        });
        return;
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
        await user.incrementLoginAttempts();
        res.status(401).json(invalidCreds);
        return;
    }

    // Success
    await user.resetLoginAttempts();

    const { accessToken, refreshToken } = setAuthCookies(res, user.id, rememberMe);

    // Keep refresh token list lean (max 10 devices)
    const updatedTokens = [
        ...(user.refreshTokens ?? []).slice(-9),
        { token: refreshToken, userAgent: getUserAgent(req), ip: req.ip, createdAt: new Date() },
    ];

    await User.findByIdAndUpdate(user.id, {
        $set: { refreshTokens: updatedTokens, lastLoginAt: new Date() },
    });

    res.json({
        success: true,
        message: 'Signed in successfully.',
        user: user.toSafeObject(),
        accessToken,
    });
}

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    clearAuthCookies(res);

    if (refreshToken && req.user) {
        await User.findByIdAndUpdate(req.user.userId, {
            $pull: { refreshTokens: { token: refreshToken } },
        });
    }

    res.json({ success: true, message: 'Signed out successfully.' });
}

// ── POST /api/auth/refresh ────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refresh_token as string | undefined;

    if (!token) {
        res.status(401).json({ success: false, message: 'No refresh token provided.' });
        return;
    }

    let payload;
    try {
        payload = verifyRefreshToken(token);
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
        return;
    }

    const user = await User.findById(payload.userId).select('+refreshTokens');
    if (!user) {
        res.status(401).json({ success: false, message: 'User not found.' });
        return;
    }

    // Token rotation — verify the token is still in the user's list
    const storedIdx = user.refreshTokens.findIndex(t => t.token === token);
    if (storedIdx === -1) {
        // Possible token reuse — clear all tokens (security measure)
        await User.findByIdAndUpdate(user.id, { $set: { refreshTokens: [] } });
        res.status(401).json({ success: false, message: 'Refresh token reuse detected. Please sign in again.', code: 'TOKEN_REUSE' });
        return;
    }

    // Issue new tokens (rotation)
    const { accessToken, refreshToken: newRefreshToken } = setAuthCookies(res, user.id, false);

    // Replace old refresh token with new one
    user.refreshTokens[storedIdx] = {
        token: newRefreshToken,
        createdAt: new Date(),
        userAgent: getUserAgent(req),
        ip: req.ip,
    };
    await user.save();

    res.json({ success: true, accessToken });
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
    const user = await User.findById(req.user!.userId);
    if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
    }
    res.json({ success: true, user: user.toSafeObject() });
}

// ── POST /api/auth/verify-email ───────────────────────────────────────────────

export async function verifyEmail(req: Request, res: Response): Promise<void> {
    const rawToken = (req.body.token ?? req.query.token) as string;
    if (!rawToken) {
        res.status(400).json({ success: false, message: 'Verification token is required.' });
        return;
    }

    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationExpiry: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpiry');

    if (!user) {
        res.status(400).json({ success: false, message: 'Invalid or expired verification link. Please request a new one.' });
        return;
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully! You can now sign in.' });
}

// ── POST /api/auth/forgot-password ───────────────────────────────────────────

export async function forgotPassword(req: Request, res: Response): Promise<void> {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        return;
    }

    // Always return success to prevent email enumeration
    const successResponse = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };

    const user = await User.findOne({ email: parsed.data.email }).select('+passwordResetToken +passwordResetExpiry');
    if (!user) {
        res.json(successResponse);
        return;
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    sendPasswordResetEmail(user.email, user.fullName, resetToken).catch(err =>
        console.error('Reset email failed:', err)
    );

    res.json(successResponse);
}

// ── POST /api/auth/reset-password ────────────────────────────────────────────

export async function resetPassword(req: Request, res: Response): Promise<void> {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
    }

    const hashedToken = crypto.createHash('sha256').update(parsed.data.token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpiry: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpiry +passwordHash');

    if (!user) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset link. Please request a new password reset.' });
        return;
    }

    user.passwordHash = parsed.data.newPassword; // pre-save hook will hash
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;

    // Invalidate all sessions
    (user as any).refreshTokens = [];
    await user.save();

    clearAuthCookies(res);
    res.json({ success: true, message: 'Password reset successfully. Please sign in with your new password.' });
}

// ── PATCH /api/auth/change-password ──────────────────────────────────────────

export async function changePassword(req: Request, res: Response): Promise<void> {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, message: parsed.error.errors[0].message });
        return;
    }

    const user = await User.findById(req.user!.userId).select('+passwordHash');
    if (!user) {
        res.status(404).json({ success: false, message: 'User not found.' });
        return;
    }

    const isValid = await user.comparePassword(parsed.data.currentPassword);
    if (!isValid) {
        res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        return;
    }

    user.passwordHash = parsed.data.newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
}
