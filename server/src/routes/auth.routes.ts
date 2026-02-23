import { Router } from 'express';
import {
    register,
    login,
    logout,
    refresh,
    getMe,
    verifyEmail,
    forgotPassword,
    resetPassword,
    changePassword,
} from '../controllers/auth.controller';
import { requireAuth, optionalAuth } from '../middleware/auth';
import { authRateLimit, sendEmailRateLimit } from '../middleware/security';

const router = Router();

// ── Public ─────────────────────────────────────────────────────────────────────
router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.post('/refresh', refresh);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', sendEmailRateLimit, forgotPassword);
router.post('/reset-password', resetPassword);

// ── Protected ──────────────────────────────────────────────────────────────────
router.post('/logout', optionalAuth, logout);
router.get('/me', requireAuth, getMe);
router.patch('/change-password', requireAuth, changePassword);

export default router;
