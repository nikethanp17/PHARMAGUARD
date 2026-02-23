import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, LoginRequest, RegisterRequest, ForgotPasswordRequest, ResetPasswordRequest } from './types';
import {
    login as apiLogin,
    register as apiRegister,
    forgotPassword as apiForgotPassword,
    resetPassword as apiResetPassword,
    logout as apiLogout,
    persistSession,
    getStoredSession,
    clearStoredSession,
} from './authService';
import { useSessionTimeout } from './useSessionTimeout';

// ── Context Shape ──────────────────────────────────────────────────────────────

interface AuthContextValue {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (req: LoginRequest) => Promise<void>;
    register: (req: RegisterRequest) => Promise<void>;
    logout: () => void;
    forgotPassword: (req: ForgotPasswordRequest) => Promise<void>;
    resetPassword: (req: ResetPasswordRequest) => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

interface AuthProviderProps {
    children: ReactNode;
    onSessionTimeout?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onSessionTimeout }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = user !== null;

    // ── Bootstrap: restore session from localStorage ───────────────────────────
    useEffect(() => {
        const stored = getStoredSession();
        if (stored) {
            setUser(stored.user);
        }
        setIsLoading(false);
    }, []);

    // ── Session timeout ────────────────────────────────────────────────────────
    const handleTimeout = useCallback(() => {
        setUser(null);
        clearStoredSession();
        onSessionTimeout?.();
    }, [onSessionTimeout]);

    useSessionTimeout({ isAuthenticated, onTimeout: handleTimeout });

    // ── Actions ────────────────────────────────────────────────────────────────

    const login = useCallback(async (req: LoginRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiLogin(req);
            persistSession(response);
            setUser(response.user);
        } catch (err: any) {
            setError(err.message || 'Login failed. Please try again.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const register = useCallback(async (req: RegisterRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiRegister(req);
            persistSession(response);
            setUser(response.user);
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        apiLogout();
        setUser(null);
        setError(null);
    }, []);

    const forgotPassword = useCallback(async (req: ForgotPasswordRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            await apiForgotPassword(req);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const resetPassword = useCallback(async (req: ResetPasswordRequest) => {
        setIsLoading(true);
        setError(null);
        try {
            await apiResetPassword(req);
        } catch (err: any) {
            setError(err.message || 'Password reset failed.');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearError = useCallback(() => setError(null), []);

    return (
        <AuthContext.Provider value={{
            user, isAuthenticated, isLoading, error,
            login, register, logout, forgotPassword, resetPassword, clearError,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
