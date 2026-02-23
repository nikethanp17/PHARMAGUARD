// ─── Auth Service — Real API Client ──────────────────────────────────────────
//
// Calls the Express backend at /api/auth/*.
// Tokens are stored in HTTP-only cookies (set by the server).
// We also store the user object in localStorage for quick access.
//
// Fallback: if the server is unreachable, falls back to the localStorage mock
// so the frontend works standalone in demo mode.

import type {
    User,
    LoginRequest,
    RegisterRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
} from './types';

const API_BASE = 'http://localhost:4000/api/auth';
const FALLBACK_KEYS = {
    USERS: 'pg_users',
    USER: 'pg_user',
    TOKEN_EXPIRY: 'pg_token_expiry',
    RATE_LIMIT: 'pg_rate_limit',
    RESET_TOKENS: 'pg_reset_tokens',
    LAST_ACTIVITY: 'pg_last_activity',
} as const;

// ── API client helper ─────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
    success: boolean;
    message?: string;
    user?: User;
    accessToken?: string;
    [key: string]: T | unknown;
}

async function apiFetch<T = ApiResponse>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        credentials: 'include', // send/receive HTTP-only cookies
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
    });

    const data = await res.json() as T;

    if (!res.ok) {
        const err = data as ApiResponse;
        throw new Error(err.message ?? `Request failed (${res.status})`);
    }

    return data;
}

// ── Server health check ────────────────────────────────────────────────────────

let _serverAvailable: boolean | null = null;

async function isServerAvailable(): Promise<boolean> {
    if (_serverAvailable !== null) return _serverAvailable;
    try {
        const res = await fetch('http://localhost:4000/health', { signal: AbortSignal.timeout(2000) });
        _serverAvailable = res.ok;
    } catch {
        _serverAvailable = false;
    }
    // Re-check after 30s
    setTimeout(() => { _serverAvailable = null; }, 30_000);
    return _serverAvailable;
}

// ── Fallback mock helpers ──────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'pharmaguard_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getStoredUsers(): Record<string, User & { passwordHash: string }> {
    try { return JSON.parse(localStorage.getItem(FALLBACK_KEYS.USERS) || '{}'); } catch { return {}; }
}

function saveUsers(users: Record<string, User & { passwordHash: string }>): void {
    localStorage.setItem(FALLBACK_KEYS.USERS, JSON.stringify(users));
}

function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
    user: User;
    token: string;
    expiresAt: number;
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
    const serverUp = await isServerAvailable();

    if (serverUp) {
        const data = await apiFetch<ApiResponse>('/login', {
            method: 'POST',
            body: JSON.stringify(request),
        });
        const user = data.user as User;
        localStorage.setItem(FALLBACK_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(FALLBACK_KEYS.LAST_ACTIVITY, String(Date.now()));
        return { user, token: data.accessToken ?? '', expiresAt: Date.now() + 15 * 60 * 1000 };
    }

    // ── Fallback mock ──────────────────────────────────────────────────────────
    console.warn('[AuthService] Server unavailable — using localStorage mock');
    const { identifier, password, rememberMe } = request;
    const normalized = identifier.toLowerCase().trim();
    const users = getStoredUsers();
    const entry = Object.values(users).find(u =>
        u.email.toLowerCase() === normalized || u.username?.toLowerCase() === normalized
    );
    if (!entry) throw new Error('Invalid credentials.');
    const hash = await hashPassword(password);
    if (entry.passwordHash !== hash) throw new Error('Invalid credentials.');

    const user: User = { ...entry, lastLoginAt: new Date().toISOString() };
    users[user.id] = { ...user, passwordHash: entry.passwordHash };
    saveUsers(users);
    localStorage.setItem(FALLBACK_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(FALLBACK_KEYS.LAST_ACTIVITY, String(Date.now()));
    const expiresInMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    localStorage.setItem(FALLBACK_KEYS.TOKEN_EXPIRY, String(Date.now() + expiresInMs));
    return { user, token: 'local_mock_token', expiresAt: Date.now() + expiresInMs };
}

export async function register(request: RegisterRequest): Promise<AuthResponse> {
    const serverUp = await isServerAvailable();

    if (serverUp) {
        const data = await apiFetch<ApiResponse>('/register', {
            method: 'POST',
            body: JSON.stringify(request),
        });
        const user = data.user as User;
        localStorage.setItem(FALLBACK_KEYS.USER, JSON.stringify(user));
        localStorage.setItem(FALLBACK_KEYS.LAST_ACTIVITY, String(Date.now()));
        return { user, token: data.accessToken ?? '', expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
    }

    // ── Fallback mock ──────────────────────────────────────────────────────────
    const { fullName, email, username, phone, password, confirmPassword, agreedToTerms, hipaaConsent } = request;
    if (!agreedToTerms) throw new Error('You must agree to the Terms & Conditions.');
    if (!hipaaConsent) throw new Error('HIPAA consent is required.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');

    const users = getStoredUsers();
    if (Object.values(users).some(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('An account with this email already exists.');
    }
    if (Object.values(users).some(u => u.username?.toLowerCase() === username.toLowerCase())) {
        throw new Error('This username is already taken.');
    }

    const hash = await hashPassword(password);
    const userId = generateId();
    const user: User = {
        id: userId, fullName, email: email.toLowerCase(), username: username.toLowerCase(),
        phone: phone || undefined, createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(), analysisHistory: [],
    };
    users[userId] = { ...user, passwordHash: hash };
    saveUsers(users);
    localStorage.setItem(FALLBACK_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(FALLBACK_KEYS.LAST_ACTIVITY, String(Date.now()));
    localStorage.setItem(FALLBACK_KEYS.TOKEN_EXPIRY, String(Date.now() + 24 * 60 * 60 * 1000));
    return { user, token: 'local_mock_token', expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
}

export async function forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    const serverUp = await isServerAvailable();
    if (serverUp) {
        await apiFetch('/forgot-password', { method: 'POST', body: JSON.stringify(request) });
        return;
    }
    // Fallback — silent success (anti-enumeration)
    await new Promise(r => setTimeout(r, 1000));
}

export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
    const serverUp = await isServerAvailable();
    if (serverUp) {
        await apiFetch('/reset-password', { method: 'POST', body: JSON.stringify(request) });
        return;
    }
    // Fallback mock
    const resetTokens = JSON.parse(localStorage.getItem(FALLBACK_KEYS.RESET_TOKENS) || '{}');
    const tokenData = resetTokens[request.token];
    if (!tokenData || tokenData.expiresAt < Date.now()) throw new Error('Invalid or expired reset link.');
    if (request.newPassword !== request.confirmPassword) throw new Error('Passwords do not match.');
    const users = getStoredUsers();
    const entry = users[tokenData.userId];
    if (!entry) throw new Error('User not found.');
    entry.passwordHash = await hashPassword(request.newPassword);
    saveUsers(users);
    delete resetTokens[request.token];
    localStorage.setItem(FALLBACK_KEYS.RESET_TOKENS, JSON.stringify(resetTokens));
}

export function logout(): void {
    // Ask server to clear HTTP-only cookies
    fetch(`${API_BASE}/logout`, { method: 'POST', credentials: 'include' }).catch(() => { });
    clearStoredSession();
}

// ── Session persistence (for current user display / fallback) ─────────────────

export function persistSession(authResponse: AuthResponse): void {
    localStorage.setItem(FALLBACK_KEYS.USER, JSON.stringify(authResponse.user));
    localStorage.setItem(FALLBACK_KEYS.TOKEN_EXPIRY, String(authResponse.expiresAt));
    localStorage.setItem(FALLBACK_KEYS.LAST_ACTIVITY, String(Date.now()));
}

export function getStoredSession(): { user: User; token: string } | null {
    try {
        const userJson = localStorage.getItem(FALLBACK_KEYS.USER);
        const expiry = localStorage.getItem(FALLBACK_KEYS.TOKEN_EXPIRY);
        if (!userJson) return null;
        // If there's an expiry (fallback mock) check it
        if (expiry && parseInt(expiry, 10) < Date.now()) {
            clearStoredSession();
            return null;
        }
        return { user: JSON.parse(userJson), token: '' };
    } catch { return null; }
}

export function clearStoredSession(): void {
    localStorage.removeItem(FALLBACK_KEYS.USER);
    localStorage.removeItem(FALLBACK_KEYS.TOKEN_EXPIRY);
    localStorage.removeItem(FALLBACK_KEYS.LAST_ACTIVITY);
}

export function updateLastActivity(): void {
    localStorage.setItem(FALLBACK_KEYS.LAST_ACTIVITY, String(Date.now()));
}

export function getLastActivity(): number {
    return parseInt(localStorage.getItem(FALLBACK_KEYS.LAST_ACTIVITY) || '0', 10);
}

// ── Rate limit check (client-side — server enforces too) ──────────────────────

export function checkRateLimit(identifier: string): { locked: boolean; remainingMs: number; attemptsLeft: number } {
    try {
        const all = JSON.parse(localStorage.getItem('pg_rate_limit') || '{}');
        const state = all[identifier] ?? { attempts: 0, lockedUntil: null };
        if (state.lockedUntil && state.lockedUntil > Date.now()) {
            return { locked: true, remainingMs: state.lockedUntil - Date.now(), attemptsLeft: 0 };
        }
        return { locked: false, remainingMs: 0, attemptsLeft: 5 - state.attempts };
    } catch {
        return { locked: false, remainingMs: 0, attemptsLeft: 5 };
    }
}

// ── Analysis history ──────────────────────────────────────────────────────────

export function addAnalysisToHistory(entry: { patientId: string; drugs: string[]; vcfFileName: string }): void {
    try {
        const userJson = localStorage.getItem(FALLBACK_KEYS.USER);
        if (!userJson) return;
        const user: User = JSON.parse(userJson);
        const newEntry = { id: generateId(), timestamp: new Date().toISOString(), ...entry };
        user.analysisHistory = [newEntry, ...user.analysisHistory].slice(0, 50);
        localStorage.setItem(FALLBACK_KEYS.USER, JSON.stringify(user));
    } catch { /* ignore */ }
}
