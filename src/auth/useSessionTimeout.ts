import { useEffect, useRef, useCallback } from 'react';
import { updateLastActivity, getLastActivity } from './authService';

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 30 * 1000;        // check every 30 seconds

interface UseSessionTimeoutOptions {
    isAuthenticated: boolean;
    onTimeout: () => void;
}

export function useSessionTimeout({ isAuthenticated, onTimeout }: UseSessionTimeoutOptions): void {
    const onTimeoutRef = useRef(onTimeout);
    onTimeoutRef.current = onTimeout;

    const resetActivity = useCallback(() => {
        if (isAuthenticated) {
            updateLastActivity();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Track user activity
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

        // Periodic check for inactivity
        const interval = setInterval(() => {
            const lastActivity = getLastActivity();
            if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
                onTimeoutRef.current();
            }
        }, CHECK_INTERVAL_MS);

        return () => {
            events.forEach(e => window.removeEventListener(e, resetActivity));
            clearInterval(interval);
        };
    }, [isAuthenticated, resetActivity]);
}
